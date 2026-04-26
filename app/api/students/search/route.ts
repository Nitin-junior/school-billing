import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Student from '@/models/Student';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
    if (q.length < 2) return NextResponse.json({ students: [] });

    const students = await Student.find({
      status: 'active',
      $or: [
        { name:      { $regex: q, $options: 'i' } },
        { studentId: { $regex: q, $options: 'i' } },
        { className: { $regex: q, $options: 'i' } },
        { phone:     { $regex: q, $options: 'i' } },
      ],
    })
      .populate('parentId', 'name phone whatsappActivated callmebotApiKey')
      .select('name studentId className section rollNumber phone hostelResident parentId')
      .limit(10)
      .lean();

    return NextResponse.json({ students });
  } catch (err) {
    console.error('Student search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
