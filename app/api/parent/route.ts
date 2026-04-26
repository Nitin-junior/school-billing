import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import ParentModel from "@/models/Parent";
import Student from "@/models/Student";
import Invoice from "@/models/Invoice";
import Payment from "@/models/Payment";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId");

    if (!parentId) {
      return NextResponse.json({ error: "parentId required" }, { status: 400 });
    }

    const students = await Student.find({ parentId, status: "active" })
      .select("name className section studentId")
      .lean();

    const studentIds = students.map((s) => s._id);

    const invoices = await Invoice.find({ studentId: { $in: studentIds } })
      .select("invoiceNumber monthBS monthAD totalAmount paidAmount status dueDate dueDateBS issuedDate feeHeads discount lateFine")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const payments = await Payment.find({ studentId: { $in: studentIds } })
      .select("receiptNumber amount paymentMode paymentDateBS paymentDateAD")
      .sort({ paymentDateAD: -1 })
      .limit(20)
      .lean();

    const summary = {
      totalDue: invoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0),
      totalPaid: invoices.reduce((s, i) => s + i.paidAmount, 0),
      pendingCount: invoices.filter((i) => i.status === "pending" || i.status === "overdue").length,
    };

    return NextResponse.json({ students, invoices, payments, summary });
  } catch (error) {
    console.error("Get parent data error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
