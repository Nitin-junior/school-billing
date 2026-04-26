import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';

export async function GET() {
  const start = Date.now();
  try {
    await connectDB();
    const state = mongoose.connection.readyState;
    // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    const stateLabel = ['disconnected', 'connected', 'connecting', 'disconnecting'][state] ?? 'unknown';
    const ping = await mongoose.connection.db?.admin().ping();

    return NextResponse.json({
      status: state === 1 ? 'ok' : 'error',
      db: stateLabel,
      ping: ping?.ok === 1 ? 'pong' : 'failed',
      latency: `${Date.now() - start}ms`,
      uri: process.env.MONGODB_URI?.replace(/:([^@]+)@/, ':****@') ?? 'not set',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      status: 'error',
      db: 'disconnected',
      error: message,
      latency: `${Date.now() - start}ms`,
    }, { status: 500 });
  }
}
