import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Parent from '@/models/Parent';
import { sendWhatsAppMessage } from '@/lib/callmebot';

export async function POST(req: NextRequest) {
  await connectDB();
  const { phone, apiKey } = await req.json();

  if (!phone || !apiKey) {
    return NextResponse.json({ error: 'Phone and API key are required' }, { status: 400 });
  }

  // Test the API key by sending a verification message
  const testMsg = '✅ WhatsApp activated successfully for ShulkaPro School Billing!';
  const sent = await sendWhatsAppMessage(phone, apiKey, testMsg);

  if (!sent) {
    return NextResponse.json(
      { error: 'Invalid API key or WhatsApp not connected. Please follow the setup steps again.' },
      { status: 400 }
    );
  }

  // Save the API key and mark as activated
  const parent = await Parent.findOneAndUpdate(
    { phone },
    { callmebotApiKey: apiKey, whatsappActivated: true },
    { new: true }
  );

  if (!parent) {
    return NextResponse.json({ error: 'Phone not registered' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: 'WhatsApp activated!' });
}
