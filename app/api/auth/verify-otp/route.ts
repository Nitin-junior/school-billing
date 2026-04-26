import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Parent from '@/models/Parent';
import OTPModel from '@/models/OTP';
import { verifyOTP } from '@/lib/otp';
import { SignJWT } from 'jose';

export async function POST(req: NextRequest) {
  await connectDB();
  const { phone, otp, role } = await req.json();

  const record = await OTPModel.findOne({ phone });

  if (!record) {
    return NextResponse.json({ error: 'OTP not found or expired' }, { status: 400 });
  }
  if (record.attempts >= 3) {
    return NextResponse.json({ error: 'Too many wrong attempts. Request new OTP.' }, { status: 429 });
  }
  if (new Date() > record.expiresAt) {
    await OTPModel.deleteOne({ phone });
    return NextResponse.json({ error: 'OTP has expired. Request new OTP.' }, { status: 400 });
  }

  const isValid = await verifyOTP(otp, record.otp);
  if (!isValid) {
    await OTPModel.findOneAndUpdate({ phone }, { $inc: { attempts: 1 } });
    return NextResponse.json(
      { error: `Wrong OTP. ${2 - record.attempts} attempts left.` },
      { status: 400 }
    );
  }

  // OTP valid — delete it
  await OTPModel.deleteOne({ phone });

  // Find parent info
  const parent = await Parent.findOne({ phone });

  // Create JWT session
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const token = await new SignJWT({
    phone,
    role,
    parentId: parent?._id?.toString(),
    name: parent?.name
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);

  const response = NextResponse.json({ success: true, role, name: parent?.name });
  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 604800, // 7 days
    path: '/'
  });
  return response;
}
