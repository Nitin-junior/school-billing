import mongoose, { Schema, Document } from "mongoose";

export interface INotificationLog extends Document {
  studentId: mongoose.Types.ObjectId;
  parentPhone: string;
  type: "payment-reminder" | "payment-receipt" | "due-alert" | "invoice-generated" | "custom";
  channel: "whatsapp" | "sms";
  message: string;
  status: "sent" | "failed" | "pending";
  errorMessage?: string;
  invoiceId?: mongoose.Types.ObjectId;
  paymentId?: mongoose.Types.ObjectId;
  sentAt?: Date;
  createdAt: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    parentPhone: { type: String, required: true },
    type: {
      type: String,
      enum: ["payment-reminder", "payment-receipt", "due-alert", "invoice-generated", "custom"],
      required: true,
    },
    channel: { type: String, enum: ["whatsapp", "sms"], default: "whatsapp" },
    message: { type: String, required: true },
    status: { type: String, enum: ["sent", "failed", "pending"], default: "pending" },
    errorMessage: { type: String },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.NotificationLog ||
  mongoose.model<INotificationLog>("NotificationLog", NotificationLogSchema);
