/**
 * Ensures a User exists so Google Sign-In (Admin tab) can match by email.
 *
 * Run from project root:
 *   bun run scripts/add-google-admin.ts
 *
 * Requires MONGODB_URI in .env.local (Bun loads it automatically).
 */

import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User";

const TARGET_EMAIL = "nitinpriyadarshi70@gmail.com";
const DISPLAY_NAME = "Nitin Priyadarshi";
/** Unique placeholder phone for Google-only admins (OTP flow uses phone; Google uses email match). */
const PLACEHOLDER_PHONE = "+977989999971";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI missing in .env.local");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const email = TARGET_EMAIL.trim().toLowerCase();

  const existingByEmail = await User.findOne({
    email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
  });

  if (existingByEmail) {
    existingByEmail.role = "admin";
    existingByEmail.isActive = true;
    if (!existingByEmail.name?.trim()) existingByEmail.name = DISPLAY_NAME;
    await existingByEmail.save();
    console.log(`✅ Updated existing user → admin: ${email}`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const taken = await User.findOne({ phone: PLACEHOLDER_PHONE });
  if (taken) {
    console.error(
      `❌ Phone ${PLACEHOLDER_PHONE} is already used by another user. Change PLACEHOLDER_PHONE in scripts/add-google-admin.ts or free that number in MongoDB.`
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash("google-oauth-placeholder", 12);

  await User.create({
    name: DISPLAY_NAME,
    email,
    phone: PLACEHOLDER_PHONE,
    password: hashedPassword,
    role: "admin",
    isActive: true,
  });

  console.log(`✅ Created admin user for Google Sign-In:`);
  console.log(`   Email: ${email}`);
  console.log(`   Role: admin`);
  console.log(`   Placeholder phone (unique): ${PLACEHOLDER_PHONE}`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
