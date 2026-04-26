import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Invoice from '@/models/Invoice';
import Student from '@/models/Student';
import { BS_MONTHS_EN } from '@/lib/nepali-date';

export async function GET() {
  try {
    await connectDB();

    // Monthly collection — group by monthBS
    const monthlyRaw = await Payment.aggregate([
      {
        $group: {
          _id: { $substr: ['$paymentDateBS', 0, 7] }, // "YYYY-MM"
          collected: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]);

    // Map to BS month names using monthBS on invoices
    const monthlyByMonth = await Invoice.aggregate([
      { $match: { status: { $in: ['paid', 'partial'] } } },
      {
        $group: {
          _id: '$monthBS',
          collected: { $sum: '$paidAmount' },
          invoiced: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]);

    // Summary stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [collectedThisMonth, pendingDues, totalStudents] = await Promise.all([
      Payment.aggregate([
        { $match: { paymentDateAD: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Invoice.aggregate([
        { $match: { status: { $in: ['pending', 'partial', 'overdue'] } } },
        {
          $group: {
            _id: null,
            totalDue: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } },
            count: { $sum: 1 },
          },
        },
      ]),
      Student.countDocuments({ status: 'active' }),
    ]);

    // Total invoiced vs collected for collection rate
    const totals = await Invoice.aggregate([
      { $group: { _id: null, invoiced: { $sum: '$totalAmount' }, collected: { $sum: '$paidAmount' } } },
    ]);

    // Top 5 due students
    const topDue = await Invoice.find({ status: { $in: ['pending', 'partial', 'overdue'] } })
      .sort({ totalAmount: -1 })
      .limit(5)
      .populate({ path: 'studentId', select: 'name className section' })
      .lean();

    const topDueStudents = topDue.map((inv) => {
      const s = inv.studentId as unknown as { _id: string; name: string; className: string; section: string } | null;
      const dueAmount = Math.max(0, inv.totalAmount + (inv.lateFine ?? 0) - inv.paidAmount);
      const daysOverdue = inv.dueDate
        ? Math.max(0, Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / 86400000))
        : 0;
      return {
        invoiceId: String(inv._id),
        studentDbId: String(s?._id ?? ''),
        studentName: s?.name ?? 'Unknown',
        className: s?.className ?? '',
        section: s?.section ?? '',
        dueAmount,
        daysOverdue,
        monthBS: inv.monthBS,
      };
    });

    return NextResponse.json({
      monthly: monthlyByMonth,
      summary: {
        collectedThisMonth: collectedThisMonth[0]?.total ?? 0,
        pendingDues: pendingDues[0]?.totalDue ?? 0,
        overdueCount: pendingDues[0]?.count ?? 0,
        totalStudents,
        collectionRate: totals[0]
          ? Math.round((totals[0].collected / Math.max(totals[0].invoiced, 1)) * 100)
          : 0,
      },
      topDueStudents,
    });
  } catch (err) {
    console.error('Monthly report error:', err);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
