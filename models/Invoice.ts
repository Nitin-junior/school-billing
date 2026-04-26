import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoice extends Document {
  invoiceNumber: string;
  studentId: mongoose.Types.ObjectId;
  fiscalYear: string;      // "2081/82"
  monthBS: string;         // "Baisakh"
  monthAD: string;         // "2024-04"
  dueDate: Date;
  dueDateBS: string;
  feeHeads: {
    tuition: number; exam: number; library: number;
    sports: number; lab: number; hostel: number;
    uniform: number; stationery: number;
  };
  discount: number;
  lateFine: number;
  totalAmount: number;
  paidAmount: number;
  status: 'pending' | 'paid' | 'partial' | 'overdue';
  createdAt: Date;
}

const InvoiceSchema = new Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  fiscalYear: { type: String, default: '' },
  monthBS: { type: String, required: true },
  monthAD: { type: String, required: true },
  dueDate: { type: Date, required: true },
  dueDateBS: String,
  feeHeads: {
    tuition: { type: Number, default: 0 },
    exam: { type: Number, default: 0 },
    library: { type: Number, default: 0 },
    sports: { type: Number, default: 0 },
    lab: { type: Number, default: 0 },
    hostel: { type: Number, default: 0 },
    uniform: { type: Number, default: 0 },
    stationery: { type: Number, default: 0 },
  },
  discount: { type: Number, default: 0 },
  lateFine: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
