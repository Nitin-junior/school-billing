import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Student from '@/models/Student';
import NotificationLog from '@/models/NotificationLog';
import { sendWhatsAppMessage, dueReminderMessage } from '@/lib/callmebot';

type PopulatedParent = {
  phone: string;
  whatsappActivated: boolean;
  callmebotApiKey?: string;
};
type PopulatedStudent = {
  _id: string;
  name: string;
  className: string;
  parentId: PopulatedParent | null;
};

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const {
      type = 'due_reminder',
      targetGroup,  // { className?, status? }
      invoiceIds,   // direct invoice IDs
      message: customMsg,
    } = await req.json();

    const results = { sent: 0, failed: 0, noWhatsApp: 0 };

    type InvoiceDoc = {
      _id: unknown; totalAmount: number; paidAmount: number; lateFine?: number;
      monthBS: string; dueDateBS?: string; dueDate?: { toISOString?: () => string };
      studentId: PopulatedStudent | null;
    };
    let invoices: InvoiceDoc[] = [];

    if (invoiceIds?.length) {
      invoices = (await Invoice.find({ _id: { $in: invoiceIds } })
        .populate({
          path: 'studentId',
          select: 'name className parentId',
          populate: { path: 'parentId', select: 'name phone whatsappActivated callmebotApiKey' },
        })
        .lean()) as unknown as InvoiceDoc[];
    } else {
      const query: Record<string, unknown> = {
        status: { $in: ['pending', 'partial', 'overdue'] },
      };
      if (targetGroup?.className) {
        const classStudents = await Student.find({ className: targetGroup.className, status: 'active' })
          .select('_id').lean();
        query.studentId = { $in: classStudents.map((s) => s._id) };
      }
      if (targetGroup?.status) query.status = targetGroup.status;

      invoices = (await Invoice.find(query)
        .populate({
          path: 'studentId',
          select: 'name className parentId',
          populate: { path: 'parentId', select: 'name phone whatsappActivated callmebotApiKey' },
        })
        .lean()) as unknown as InvoiceDoc[];
    }

    for (const invoice of invoices) {
      const student = invoice.studentId as unknown as PopulatedStudent | null;
      const parent  = student?.parentId ?? null;

      if (!parent?.whatsappActivated || !parent?.callmebotApiKey) {
        results.noWhatsApp++;
        continue;
      }

      const dueAmount = invoice.totalAmount + (invoice.lateFine ?? 0) - invoice.paidAmount;
      const message   = customMsg ?? dueReminderMessage(
        student?.name ?? 'Student',
        dueAmount,
        invoice.monthBS,
        invoice.dueDateBS ?? invoice.dueDate?.toISOString?.()?.slice(0, 10) ?? ''
      );

      const sent = await sendWhatsAppMessage(parent.phone, parent.callmebotApiKey, message);

      await NotificationLog.create({
        studentId:   student?._id,
        parentPhone: parent.phone,
        type,
        channel:    'whatsapp',
        message,
        status:     sent ? 'sent' : 'failed',
        invoiceId:  invoice._id,
        sentAt:     sent ? new Date() : undefined,
      });

      if (sent) results.sent++;
      else results.failed++;
    }

    return NextResponse.json({ ...results, total: invoices.length });
  } catch (err) {
    console.error('Bulk notification error:', err);
    return NextResponse.json({ error: 'Failed to send bulk notifications' }, { status: 500 });
  }
}
