import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import InvoiceModel from "@/models/Invoice";
import PaymentModel from "@/models/Payment";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const type       = searchParams.get("type") || "summary";
    const fiscalYear = searchParams.get("fiscalYear") ?? searchParams.get("academicYear");
    const monthBS    = searchParams.get("monthBS") ?? searchParams.get("month");
    const cls        = searchParams.get("class") ?? searchParams.get("className");

    /* ── summary ─────────────────────────────────────────── */
    if (type === "summary") {
      const query: Record<string, unknown> = {};
      if (fiscalYear) query.fiscalYear = fiscalYear;
      if (monthBS)    query.monthBS    = monthBS;

      const [totalInvoiced, totalCollected, statusCounts] = await Promise.all([
        InvoiceModel.aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
        InvoiceModel.aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: "$paidAmount" } } }]),
        InvoiceModel.aggregate([{ $match: query }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      ]);

      const invoiced  = totalInvoiced[0]?.total  || 0;
      const collected = totalCollected[0]?.total || 0;

      return NextResponse.json({
        totalInvoiced:  invoiced,
        totalCollected: collected,
        totalDue:       Math.max(0, invoiced - collected),
        statusCounts: statusCounts.reduce(
          (acc: Record<string, number>, curr: { _id: string; count: number }) => {
            acc[curr._id] = curr.count; return acc;
          }, {}
        ),
      });
    }

    /* ── monthly-collection ──────────────────────────────── */
    if (type === "monthly-collection") {
      const year = new Date().getFullYear();
      const data = await PaymentModel.aggregate([
        { $match: { paymentDate: { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31) } } },
        { $group: { _id: { $month: "$paymentDate" }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { "_id": 1 } },
      ]);
      const months = Array.from({ length: 12 }, (_, i) => {
        const found = data.find((d: { _id: number }) => d._id === i + 1);
        return {
          month: new Date(year, i, 1).toLocaleString("default", { month: "short" }),
          total: found?.total || 0,
          count: found?.count || 0,
        };
      });
      return NextResponse.json({ months });
    }

    /* ── class-wise ──────────────────────────────────────── */
    if (type === "class-wise") {
      const matchQuery: Record<string, unknown> = {};
      if (fiscalYear) matchQuery.fiscalYear = fiscalYear;
      if (monthBS)    matchQuery.monthBS    = monthBS;

      const data = await InvoiceModel.aggregate([
        { $match: matchQuery },
        { $lookup: { from: "students", localField: "studentId", foreignField: "_id", as: "student" } },
        { $unwind: "$student" },
        ...(cls ? [{ $match: { "student.className": cls } }] : []),
        {
          $group: {
            _id: "$student.className",
            totalInvoiced:  { $sum: "$totalAmount" },
            totalCollected: { $sum: "$paidAmount" },
            studentCount:   { $addToSet: "$studentId" },
          },
        },
        {
          $project: {
            className:      "$_id",
            totalInvoiced:  1,
            totalCollected: 1,
            totalDue:       { $subtract: ["$totalInvoiced", "$totalCollected"] },
            studentCount:   { $size: "$studentCount" },
          },
        },
        { $sort: { className: 1 } },
      ]);
      return NextResponse.json({ data });
    }

    /* ── due-list ────────────────────────────────────────── */
    if (type === "due-list") {
      const query: Record<string, unknown> = { status: { $in: ["pending", "partial", "overdue"] } };
      if (fiscalYear) query.fiscalYear = fiscalYear;
      if (monthBS)    query.monthBS    = monthBS;

      const invoices = await InvoiceModel.find(query)
        .populate({
          path: "studentId",
          select: "name studentId className section rollNumber",
          populate: { path: "parentId", select: "name phone whatsappActivated callmebotApiKey" },
        })
        // Sort by outstanding amount (totalAmount - paidAmount) descending
        .sort({ totalAmount: -1 })
        .limit(200)
        .lean();

      // Attach computed dueAmount
      const enriched = invoices.map((inv) => ({
        ...inv,
        dueAmount: Math.max(0, inv.totalAmount + inv.lateFine - inv.paidAmount),
      }));

      return NextResponse.json({ invoices: enriched });
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
