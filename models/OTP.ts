import mongoose, { Schema, Document } from 'mongoose';

export interface IOTP extends Document {
  phone: string;
  otp: string;        // hashed with bcrypt
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const OTPSchema = new Schema({
  phone: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto-delete expired OTPs

export default mongoose.models.OTP || mongoose.model('OTP', OTPSchema);
