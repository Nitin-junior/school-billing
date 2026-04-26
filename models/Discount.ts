import mongoose, { Schema, Document } from "mongoose";

export interface IDiscount extends Document {
  studentId: mongoose.Types.ObjectId;
  type: "percentage" | "fixed";
  value: number;
  reason: string;
  category: "merit" | "sibling" | "staff" | "financial" | "scholarship" | "other";
  applicableComponents: string[];
  validFrom: Date;
  validUntil?: Date;
  isActive: boolean;
  approvedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DiscountSchema = new Schema<IDiscount>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    type: { type: String, enum: ["percentage", "fixed"], required: true },
    value: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true },
    category: {
      type: String,
      enum: ["merit", "sibling", "staff", "financial", "scholarship", "other"],
      required: true,
    },
    applicableComponents: [{ type: String }],
    validFrom: { type: Date, required: true },
    validUntil: { type: Date },
    isActive: { type: Boolean, default: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Discount ||
  mongoose.model<IDiscount>("Discount", DiscountSchema);
