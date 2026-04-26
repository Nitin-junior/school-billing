import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import FeeStructure from '@/models/FeeStructure';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { fromYear, toYear } = await req.json();

    if (!fromYear || !toYear) {
      return NextResponse.json({ error: 'fromYear and toYear required' }, { status: 400 });
    }

    const source = await FeeStructure.find({ fiscalYear: fromYear }).lean();
    if (!source.length) {
      return NextResponse.json({ error: `No fee structures found for ${fromYear}` }, { status: 404 });
    }

    // Remove existing entries for toYear to avoid duplicates
    await FeeStructure.deleteMany({ fiscalYear: toYear });

    const duplicated = await FeeStructure.insertMany(
      source.map(({ _id, __v, updatedAt, ...rest }) => ({
        ...rest,
        fiscalYear: toYear,
        updatedAt: new Date(),
      }))
    );

    return NextResponse.json({ success: true, count: duplicated.length });
  } catch (err) {
    console.error('Duplicate fee structure error:', err);
    return NextResponse.json({ error: 'Failed to duplicate' }, { status: 500 });
  }
}
