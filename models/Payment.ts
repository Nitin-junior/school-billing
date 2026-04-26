import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  receiptNumber: string;   // "2081-RCP-03241"
  invoiceId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  amount: number;
  paymentMode: 'cash' | 'cheque' | 'esewa' | 'khalti' | 'connectips' | 'bank';
  transactionId?: string;
  receivedBy: string;
  remarks?: string;
  paymentDateBS: string;
  paymentDateAD: Date;
  createdAt: Date;
}

const PaymentSchema = new Schema({
  receiptNumber: { type: String, required: true, unique: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  amount: { type: Number, required: true },
  paymentMode: { type: String, required: true },
  transactionId: String,
  receivedBy: { type: String, required: true },
  remarks: String,
  paymentDateBS: { type: String, required: true },
  paymentDateAD: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
