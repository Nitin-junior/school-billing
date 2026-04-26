import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Invoice from '@/models/Invoice';
import Student from '@/models/Student';
import FeeStructure from '@/models/FeeStructure';
import NotificationLog from '@/models/NotificationLog';
import { formatBSDateShort } from '@/lib/nepali-date';
import { sendWhatsAppMessage, paymentConfirmMessage } from '@/lib/callmebot';
import { numberToWords } from '@/lib/pdf';

/* ── helpers ────────────────────────────────────────────── */
async function nextReceiptSeq(fiscalYear: string): Promise<string> {
  const count = await Payment.countDocuments({ receiptNumber: new RegExp(`^${fiscalYear}`) });
  return `${fiscalYear}-RCP-${String(count + 1).padStart(5, '0')}`;
}

/* ── GET ────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const sp       = req.nextUrl.searchParams;
    const page     = Math.max(1, parseInt(sp.get('page') ?? '1'));
    const limit    = Math.min(100, parseInt(sp.get('limit') ?? '20'));
    const studentId = sp.get('studentId');
    const invoiceId = sp.get('invoiceId');

    const query: Record<string, unknown> = {};
    if (studentId) query.studentId = studentId;
    if (invoiceId) query.invoiceId = invoiceId;

    const total    = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate({ path: 'studentId', select: 'name studentId className section' })
      .populate({ path: 'invoiceId', select: 'invoiceNumber totalAmount monthBS' })
      .sort({ paymentDateAD: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({ payments, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('GET /api/payments error:', err);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

/* ── POST ───────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const {
      invoiceId,
      amount,
      paymentMode = 'cash',
      transactionId,
      receivedBy = 'system',
      remarks,
    } = await req.json();

    /* 1. Find invoice */
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    if (invoice.status === 'paid') return NextResponse.json({ error: 'Invoice already fully paid' }, { status: 400 });

    const outstanding = invoice.totalAmount + invoice.lateFine - invoice.paidAmount;
    if (amount <= 0 || amount > outstanding) {
      return NextResponse.json(
        { error: `Amount must be between 1 and ₨ ${outstanding.toLocaleString('en-IN')}` },
        { status: 400 }
      );
    }

    /* 2. Late fine calculation */
    let lateFine = invoice.lateFine ?? 0;
    const now = new Date();
    if (now > invoice.dueDate && lateFine === 0) {
      const days = Math.floor((now.getTime() - invoice.dueDate.getTime()) / 86400000);
      if (days > 0) {
        // Fetch lateFinePerDay from FeeStructure via student's class
        const student = await Student.findById(invoice.studentId).lean() as
          { className?: string } | null;
        if (student?.className) {
          const fs = await FeeStructure.findOne({
            className: student.className,
            fiscalYear: invoice.fiscalYear,
          }).lean() as { lateFinePerDay?: number } | null;
          if (fs?.lateFinePerDay) {
            lateFine = days * fs.lateFinePerDay;
          }
        }
      }
    }

    /* 3. Generate receipt number */
    const fiscalYear    = invoice.fiscalYear ?? '2081/82';
    const receiptNumber = await nextReceiptSeq(fiscalYear);
    const bsDate        = formatBSDateShort(now);

    /* 4. Create Payment */
    const payment = await Payment.create({
      receiptNumber,
      invoiceId,
      studentId: invoice.studentId,
      amount,
      paymentMode,
      transactionId,
      receivedBy,
      remarks,
      paymentDateBS: bsDate,
      paymentDateAD: now,
    });

    /* 5. Update invoice */
    const newPaid   = invoice.paidAmount + amount;
    const newStatus = newPaid >= invoice.totalAmount + lateFine ? 'paid'
                    : newPaid > 0 ? 'partial'
                    : 'pending';

    await Invoice.findByIdAndUpdate(invoiceId, {
      paidAmount: newPaid,
      lateFine,
      status: newStatus,
    });

    /* 6. WhatsApp confirmation */
    let whatsappSent = false;
    try {
      const fullStudent = await Student.findById(invoice.studentId)
        .populate('parentId', 'whatsappActivated callmebotApiKey phone name')
        .lean() as unknown as {
          name: string;
          className: string;
          studentId: string;
          rollNumber: number;
          section: string;
          parentId: {
            name: string; phone: string;
            whatsappActivated: boolean; callmebotApiKey?: string;
          } | null;
        } | null;

      const parent = fullStudent?.parentId ?? null;

      if (parent?.whatsappActivated && parent?.callmebotApiKey) {
        const message = paymentConfirmMessage(
          fullStudent?.name ?? '',
          amount,
          receiptNumber,
          bsDate
        );
        whatsappSent = await sendWhatsAppMessage(parent.phone, parent.callmebotApiKey, message);

        await NotificationLog.create({
          studentId: invoice.studentId,
          parentPhone: parent.phone,
          type: 'payment-receipt',
          channel: 'whatsapp',
          message,
          status: whatsappSent ? 'sent' : 'failed',
          invoiceId,
          paymentId: payment._id,
          sentAt: whatsappSent ? now : undefined,
        });
      }
    } catch (notifErr) {
      console.error('Notification error (non-fatal):', notifErr);
    }

    /* 7. Fetch complete student data for receipt */
    const studentForReceipt = await Student.findById(invoice.studentId)
      .populate('parentId', 'name phone')
      .lean() as unknown as {
        name: string; studentId: string; className: string;
        section: string; rollNumber: number;
        parentId: { name: string; phone: string } | null;
      } | null;

    /* Receipt payload for PDF generation */
    const receipt = {
      invoiceId:       String(invoiceId),
      receiptNumber,
      invoiceNumber:   invoice.invoiceNumber,
      paymentDate:     bsDate,
      paymentMode,
      amount,
      amountInWords:   numberToWords(amount),
      lateFine,
      monthBS:         invoice.monthBS,
      feeHeads:        invoice.feeHeads,
      totalAmount:     invoice.totalAmount,
      paidAmount:      newPaid,
      balance:         Math.max(0, invoice.totalAmount + lateFine - newPaid),
      status:          newStatus,
      student: {
        name:       studentForReceipt?.name ?? '',
        studentId:  studentForReceipt?.studentId ?? '',
        className:  studentForReceipt?.className ?? '',
        section:    studentForReceipt?.section ?? '',
        rollNumber: studentForReceipt?.rollNumber ?? 0,
        parentName: studentForReceipt?.parentId?.name ?? '',
        parentPhone: studentForReceipt?.parentId?.phone ?? '',
      },
      whatsappSent,
      remarks,
      receivedBy,
    };

    return NextResponse.json({ payment, receipt }, { status: 201 });
  } catch (err) {
    console.error('POST /api/payments error:', err);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
