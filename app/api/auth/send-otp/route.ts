import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Parent from '@/models/Parent';
import OTPModel from '@/models/OTP';
import { generateOTP, hashOTP } from '@/lib/otp';
import { sendWhatsAppOTP } from '@/lib/callmebot';

export async function POST(req: NextRequest) {
  await connectDB();
  const { phone } = await req.json();

  // Find parent by phone
  const parent = await Parent.findOne({ phone });
  if (!parent) {
    return NextResponse.json(
      { error: 'Phone number not registered. Contact school admin.' },
      { status: 404 }
    );
  }

  // Check if WhatsApp/CallMeBot is activated
  if (!parent.callmebotApiKey || !parent.whatsappActivated) {
    return NextResponse.json(
      { error: 'WhatsApp not activated', setup: true },
      { status: 400 }
    );
  }

  // DEV MODE: fixed OTP for testing
  const isDev = process.env.NODE_ENV === 'development';
  const otp = isDev ? '123456' : generateOTP();
  const hashedOTP = await hashOTP(otp);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Save or update OTP in MongoDB
  await OTPModel.findOneAndUpdate(
    { phone },
    { otp: hashedOTP, attempts: 0, expiresAt, createdAt: new Date() },
    { upsert: true, new: true }
  );

  // In dev, skip WhatsApp and return OTP directly
  if (isDev) {
    return NextResponse.json({
      success: true,
      message: 'DEV MODE: OTP is 123456',
      devOtp: '123456',
    });
  }

  // Send via WhatsApp CallMeBot
  const sent = await sendWhatsAppOTP(phone, parent.callmebotApiKey, otp);
  if (!sent) {
    return NextResponse.json(
      { error: 'Failed to send WhatsApp OTP. Try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'OTP sent to your WhatsApp'
  });
}
