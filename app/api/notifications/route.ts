import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import Student from "@/models/Student";
import NotificationLog from "@/models/NotificationLog";
import Parent from "@/models/Parent";
import {
  sendWhatsAppMessage,
  dueReminderMessage,
  paymentConfirmMessage,
} from "@/lib/callmebot";
import { formatADDate } from "@/lib/nepali-date";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "30");

    const total = await NotificationLog.countDocuments();
    const logs = await NotificationLog.find()
      .populate({ path: "studentId", select: "name className" })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { type, studentIds, customMessage } = body;

    const results = { sent: 0, failed: 0, skipped: 0 };

    if (type === "payment-reminder" || type === "due-alert") {
      const statusFilter =
        type === "due-alert" ? "overdue" : { $in: ["pending", "partial"] };

      const query: Record<string, unknown> = { status: statusFilter };
      if (studentIds?.length) query.studentId = { $in: studentIds };

      const invoices = await Invoice.find(query)
        .populate({
          path: "studentId",
          select: "name className parentId",
          populate: { path: "parentId", select: "name whatsappActivated callmebotApiKey phone" },
        })
        .lean();

      for (const invoice of invoices) {
        const student = invoice.studentId as unknown as {
          _id: string;
          name: string;
          className: string;
          parentId: {
            whatsappActivated: boolean;
            callmebotApiKey?: string;
            phone: string;
          };
        };

        if (!student?.parentId?.whatsappActivated || !student?.parentId?.callmebotApiKey) {
          results.skipped++;
          continue;
        }

        const dueAmount = Math.max(0, invoice.totalAmount + (invoice.lateFine ?? 0) - invoice.paidAmount);
        const message = dueReminderMessage(
          student.name,
          dueAmount,
          invoice.monthBS,
          invoice.dueDateBS ?? String(invoice.dueDate)
        );

        const sent = await sendWhatsAppMessage(
          student.parentId.phone,
          student.parentId.callmebotApiKey,
          message
        );

        await NotificationLog.create({
          studentId: student._id,
          parentPhone: student.parentId.phone,
          type,
          channel: "whatsapp",
          message,
          status: sent ? "sent" : "failed",
          invoiceId: invoice._id,
          sentAt: sent ? new Date() : undefined,
        });

        if (sent) results.sent++;
        else results.failed++;
      }
    } else if (type === "payment-confirm") {
      const { invoiceId, amountPaid, receiptNumber } = body;
      const invoice = await Invoice.findById(invoiceId)
        .populate({
          path: "studentId",
          select: "name className parentId",
          populate: { path: "parentId", select: "name whatsappActivated callmebotApiKey phone" },
        })
        .lean();

      if (invoice) {
        const student = invoice.studentId as unknown as {
          _id: string; name: string; className: string;
          parentId: { whatsappActivated: boolean; callmebotApiKey?: string; phone: string };
        };
        if (student?.parentId?.whatsappActivated && student?.parentId?.callmebotApiKey) {
          const message = paymentConfirmMessage(
            student.name,
            amountPaid ?? invoice.paidAmount,
            invoice.invoiceNumber,
            receiptNumber ?? ""
          );
          const sent = await sendWhatsAppMessage(
            student.parentId.phone,
            student.parentId.callmebotApiKey,
            message
          );
          await NotificationLog.create({
            studentId: student._id,
            parentPhone: student.parentId.phone,
            type: "payment-confirm",
            channel: "whatsapp",
            message,
            status: sent ? "sent" : "failed",
            invoiceId: invoice._id,
            sentAt: sent ? new Date() : undefined,
          });
          if (sent) results.sent++;
          else results.failed++;
        } else {
          results.skipped++;
        }
      }
    } else if (type === "custom" && customMessage) {
      const studentQuery: Record<string, unknown> = { status: "active" };
      if (studentIds?.length) studentQuery._id = { $in: studentIds };

      const students = await Student.find(studentQuery)
        .populate("parentId", "whatsappActivated callmebotApiKey phone")
        .lean();

      for (const student of students) {
        const parent = student.parentId as unknown as {
          whatsappActivated: boolean;
          callmebotApiKey?: string;
          phone: string;
        };

        if (!parent?.whatsappActivated || !parent?.callmebotApiKey) {
          results.skipped++;
          continue;
        }

        const sent = await sendWhatsAppMessage(
          parent.phone,
          parent.callmebotApiKey,
          customMessage
        );

        await NotificationLog.create({
          studentId: student._id,
          parentPhone: parent.phone,
          type: "custom",
          channel: "whatsapp",
          message: customMessage,
          status: sent ? "sent" : "failed",
          sentAt: sent ? new Date() : undefined,
        });

        if (sent) results.sent++;
        else results.failed++;
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Send notifications error:", error);
    return NextResponse.json({ error: "Failed to send notifications" }, { status: 500 });
  }
}
