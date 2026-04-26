/**
 * Seed script to create the initial admin user
 * Run with: npx ts-node scripts/seed.ts
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/school-billing";

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  password: String,
  role: { type: String, default: "admin" },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const existing = await User.findOne({ phone: "+9779800000001" });
  if (existing) {
    console.log("Admin user already exists");
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash("admin123", 12);
  await User.create({
    name: "System Admin",
    email: "admin@school.edu.np",
    phone: "+9779800000001",
    password: hashedPassword,
    role: "admin",
    isActive: true,
  });

  console.log("✅ Admin user created:");
  console.log("  Phone: +9779800000001");
  console.log("  Role: admin");
  console.log("  Login: OTP via phone (dev mode shows OTP in console)");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
