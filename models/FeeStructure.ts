import mongoose, { Schema, Document } from 'mongoose';

export interface IFeeStructure extends Document {
  className: string;
  tuition: number;
  exam: number;
  library: number;
  sports: number;
  lab: number;
  hostel: number;
  uniform: number;
  stationery: number;
  cycle: 'monthly' | 'quarterly' | 'annual';
  fiscalYear: string;    // "2081/82"
  lateFinePerDay: number;
  updatedAt: Date;
}

const FeeStructureSchema = new Schema({
  className: { type: String, required: true },
  tuition: { type: Number, default: 0 },
  exam: { type: Number, default: 0 },
  library: { type: Number, default: 0 },
  sports: { type: Number, default: 0 },
  lab: { type: Number, default: 0 },
  hostel: { type: Number, default: 0 },
  uniform: { type: Number, default: 0 },
  stationery: { type: Number, default: 0 },
  cycle: { type: String, default: 'monthly' },
  fiscalYear: { type: String, required: true },
  lateFinePerDay: { type: Number, default: 50 },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.FeeStructure || mongoose.model('FeeStructure', FeeStructureSchema);
