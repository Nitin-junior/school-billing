import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import StudentModel from '@/models/Student';
import InvoiceModel from '@/models/Invoice';
import PaymentModel from '@/models/Payment';

/**
 * Public endpoint — no auth required.
 * GET /api/public/bills?sid=<studentId>
 * Returns student profile + their invoices + payment history.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const sid = req.nextUrl.searchParams.get('sid')?.trim();

    if (!sid) {
      return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
    }

    // Find student by studentId field (e.g. STU-00001 or 2026-CL1A-001)
    const student = await StudentModel.findOne({
      studentId: { $regex: `^${sid}$`, $options: 'i' },
    })
      .populate('parentId', 'name phone')
      .lean() as Record<string, unknown> | null;

    if (!student) {
      return NextResponse.json({ error: 'Student not found. Check your Student ID.' }, { status: 404 });
    }

    // Auto-mark overdue
    await InvoiceModel.updateMany(
      { studentId: student._id, dueDate: { $lt: new Date() }, status: { $in: ['pending', 'partial'] } },
      { $set: { status: 'overdue' } }
    );

    // Fetch last 12 invoices
    const invoices = await InvoiceModel.find({ studentId: student._id })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    // Fetch all payments for this student
    const payments = await PaymentModel.find({ studentId: student._id })
      .sort({ paymentDateAD: -1 })
      .limit(20)
      .lean();

    // Compute summary
    const totalBilled   = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalPaid     = invoices.reduce((s, i) => s + i.paidAmount, 0);
    const totalDue      = Math.max(0, totalBilled - totalPaid);
    const pendingCount  = invoices.filter(i => i.status !== 'paid').length;

    // Strip sensitive parent info — only expose name & whether WA is active
    const parent = student.parentId as Record<string, unknown> | null;
    const safeParent = parent ? { name: parent.name } : null;

    return NextResponse.json({
      student: {
        _id:          String(student._id),
        studentId:    student.studentId,
        name:         student.name,
        className:    student.className,
        section:      student.section,
        rollNumber:   student.rollNumber,
        hostelResident: student.hostelResident,
        status:       student.status,
        parent:       safeParent,
      },
      invoices: invoices.map(inv => ({
        _id:           String(inv._id),
        invoiceNumber: inv.invoiceNumber,
        fiscalYear:    inv.fiscalYear,
        monthBS:       inv.monthBS,
        dueDate:       inv.dueDate,
        dueDateBS:     inv.dueDateBS,
        feeHeads:      inv.feeHeads,
        totalAmount:   inv.totalAmount,
        paidAmount:    inv.paidAmount,
        lateFine:      inv.lateFine,
        discount:      inv.discount,
        dueAmount:     Math.max(0, inv.totalAmount + (inv.lateFine ?? 0) - inv.paidAmount),
        status:        inv.status,
        createdAt:     inv.createdAt,
      })),
      payments: payments.map(p => ({
        receiptNumber: p.receiptNumber,
        amount:        p.amount,
        paymentMode:   p.paymentMode,
        paymentDateBS: p.paymentDateBS,
      })),
      summary: { totalBilled, totalPaid, totalDue, pendingCount },
    });
  } catch (err) {
    console.error('Public bills API error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
