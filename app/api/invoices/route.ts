import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Student from '@/models/Student';
import FeeStructure from '@/models/FeeStructure';
import { formatBSDateShort } from '@/lib/nepali-date';
import { getCurrentBSYear } from '@/lib/nepali-date';

/* ── helpers ────────────────────────────────────────────── */
async function nextInvoiceSeq(fiscalYear: string): Promise<string> {
  const count = await Invoice.countDocuments({ fiscalYear });
  return `${fiscalYear}-INV-${String(count + 1).padStart(5, '0')}`;
}

function sumFeeHeads(feeHeads: Record<string, number>): number {
  return Object.values(feeHeads).reduce((s, v) => s + (Number(v) || 0), 0);
}

/* ── GET ────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const sp         = req.nextUrl.searchParams;
    const studentId  = sp.get('studentId');
    const className  = sp.get('class') ?? sp.get('className');
    const monthBS    = sp.get('monthBS');
    const status     = sp.get('status');
    const fiscalYear = sp.get('fiscalYear');
    const page       = Math.max(1, parseInt(sp.get('page') ?? '1'));
    const limit      = Math.min(100, parseInt(sp.get('limit') ?? '20'));

    // Auto-mark overdue first
    await Invoice.updateMany(
      { dueDate: { $lt: new Date() }, status: { $in: ['pending', 'partial'] } },
      { $set: { status: 'overdue' } }
    );

    const query: Record<string, unknown> = {};
    if (studentId)  query.studentId  = studentId;
    if (monthBS)    query.monthBS    = monthBS;
    if (status) {
      // Accept comma-separated: "pending,partial,overdue"
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      query.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }
    if (fiscalYear) query.fiscalYear = fiscalYear;

    // Filter by className requires joining through Student
    let studentIds: string[] | undefined;
    if (className) {
      const classNameFilter = { $in: [className, `Class ${className}`, className.replace(/^Class\s+/i, "")] };
      const classStudents = await Student.find({ className: classNameFilter, status: 'active' }).select('_id').lean();
      studentIds = classStudents.map((s) => String(s._id));
      query.studentId = { $in: studentIds };
    }

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate({ path: 'studentId', select: 'name studentId className section rollNumber' })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({ invoices, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('GET /api/invoices error:', err);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

/* ── POST ───────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    /* ── MULTI-STUDENT: array of studentIds ── */
    if (Array.isArray(body.studentIds) && body.studentIds.length) {
      return handleByStudentIds(body);
    }

    /* ── BULK: className + monthBS ── */
    if (body.className && body.monthBS && !body.studentId) {
      return handleBulk(body);
    }

    /* ── SINGLE ── */
    return handleSingle(body);
  } catch (err) {
    console.error('POST /api/invoices error:', err);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}

/* ── by studentIds array ───────────────────────────────── */
async function handleByStudentIds(body: {
  studentIds: string[];
  monthBS: string;
  monthAD?: string;
  dueDate: string;
  fiscalYear?: string;
  notes?: string;
}) {
  const { studentIds, monthBS, dueDate } = body;

  if (!monthBS || !dueDate) {
    return NextResponse.json({ error: 'monthBS and dueDate are required' }, { status: 400 });
  }

  const fiscalYear = body.fiscalYear ?? `${getCurrentBSYear()}/${String(getCurrentBSYear() + 1).slice(-2)}`;
  const dueDateObj = new Date(dueDate);
  const dueDateBS  = formatBSDateShort(dueDateObj);
  const adMonth    = body.monthAD ?? new Date().toISOString().slice(0, 7);

  let created = 0, skipped = 0;
  const errors: string[] = [];

  for (const sid of studentIds) {
    try {
      const student = await Student.findById(sid).lean() as (Record<string, unknown> & { _id: unknown; className?: string; name?: string }) | null;
      if (!student) { errors.push(`Student ${sid} not found`); skipped++; continue; }

      // Skip if invoice for this month already exists
      const exists = await Invoice.exists({ studentId: student._id, monthBS });
      if (exists) { skipped++; continue; }

      // Resolve feeHeads — flexible className matching
      const className = student.className as string | undefined;
      let feeHeads: Record<string, number> = {};
      let fsFound = false;
      if (className) {
        const classNameFilter = {
          $in: [className, `Class ${className}`, className.replace(/^Class\s+/i, '')],
        };
        const fs = await FeeStructure.findOne({ className: classNameFilter, fiscalYear }).lean() as Record<string, unknown> | null;
        if (fs) {
          fsFound = true;
          feeHeads = {
            tuition:    Number(fs.tuition)    || 0,
            exam:       Number(fs.exam)       || 0,
            library:    Number(fs.library)    || 0,
            sports:     Number(fs.sports)     || 0,
            lab:        Number(fs.lab)        || 0,
            hostel:     Number(fs.hostel)     || 0,
            uniform:    Number(fs.uniform)    || 0,
            stationery: Number(fs.stationery) || 0,
          };
        }
      }

      // Skip (don't create a Rs 0 invoice) if fee structure is missing
      if (!fsFound) {
        errors.push(`No fee structure for class "${className}" in ${fiscalYear} — ${student.name ?? sid} skipped`);
        skipped++;
        continue;
      }

      const totalAmount   = sumFeeHeads(feeHeads);
      const invoiceNumber = await nextInvoiceSeq(fiscalYear);

      await Invoice.create({
        invoiceNumber,
        studentId: student._id,
        fiscalYear,
        monthBS,
        monthAD: adMonth,
        dueDate: dueDateObj,
        dueDateBS,
        feeHeads,
        discount: 0,
        lateFine: 0,
        totalAmount,
        paidAmount: 0,
        status: 'pending',
      });
      created++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Student ${sid}: ${msg}`);
      skipped++;
    }
  }

  return NextResponse.json({ created, skipped, errors, count: created }, { status: 201 });
}

/* ── single invoice creation ───────────────────────────── */
async function handleSingle(body: {
  studentId: string;
  monthBS: string;
  monthAD?: string;
  dueDate: string;
  feeHeads: Record<string, number>;
  discount?: number;
  fiscalYear?: string;
}) {
  const { studentId, monthBS, monthAD, dueDate, feeHeads, discount = 0 } = body;

  if (!studentId || !monthBS || !dueDate || !feeHeads) {
    return NextResponse.json({ error: 'studentId, monthBS, dueDate, feeHeads are required' }, { status: 400 });
  }

  // Duplicate guard
  const existing = await Invoice.findOne({ studentId, monthBS });
  if (existing) {
    return NextResponse.json({ error: `Invoice for ${monthBS} already exists for this student` }, { status: 409 });
  }

  const student = await Student.findById(studentId).lean();
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

  const fiscalYear = body.fiscalYear ?? `${getCurrentBSYear()}/${String(getCurrentBSYear() + 1).slice(-2)}`;
  const invoiceNumber = await nextInvoiceSeq(fiscalYear);
  const dueDateObj   = new Date(dueDate);
  const dueDateBS    = formatBSDateShort(dueDateObj);
  const totalAmount  = Math.max(0, sumFeeHeads(feeHeads) - discount);
  const adMonth      = monthAD ?? new Date().toISOString().slice(0, 7);

  const invoice = await Invoice.create({
    invoiceNumber,
    studentId,
    fiscalYear,
    monthBS,
    monthAD: adMonth,
    dueDate: dueDateObj,
    dueDateBS,
    feeHeads,
    discount,
    lateFine: 0,
    totalAmount,
    paidAmount: 0,
    status: 'pending',
  });

  return NextResponse.json({ invoice }, { status: 201 });
}

/* ── DELETE ─────────────────────────────────────────────── */
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const sp = req.nextUrl.searchParams;
    const id = sp.get('id');
    const voidZero = sp.get('voidZero'); // ?voidZero=1 deletes all Rs-0 invoices

    if (voidZero) {
      // Delete all unpaid invoices with totalAmount = 0
      const result = await Invoice.deleteMany({ totalAmount: 0, paidAmount: 0 });
      return NextResponse.json({ deleted: result.deletedCount });
    }

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const inv = await Invoice.findById(id);
    if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    if (inv.paidAmount > 0) return NextResponse.json({ error: 'Cannot delete a partially/fully paid invoice' }, { status: 400 });
    await Invoice.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/invoices error:', err);
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
  }
}

/* ── bulk invoice creation ─────────────────────────────── */
async function handleBulk(body: {
  className: string;
  monthBS: string;
  monthAD?: string;
  dueDate: string;
  feeHeads?: Record<string, number>;
  fiscalYear?: string;
}) {
  const { className, monthBS, monthAD, dueDate } = body;

  if (!className || !monthBS || !dueDate) {
    return NextResponse.json({ error: 'className, monthBS and dueDate are required' }, { status: 400 });
  }

  const fiscalYear = body.fiscalYear ?? `${getCurrentBSYear()}/${String(getCurrentBSYear() + 1).slice(-2)}`;

  // Resolve fee heads from FeeStructure if not provided
  let feeHeads = body.feeHeads;
  if (!feeHeads) {
    const fs = await FeeStructure.findOne({ className, fiscalYear }).lean();
    if (!fs) {
      return NextResponse.json(
        { error: `No fee structure found for ${className} in ${fiscalYear}` },
        { status: 400 }
      );
    }
    feeHeads = {
      tuition:    (fs as Record<string, unknown>).tuition    as number ?? 0,
      exam:       (fs as Record<string, unknown>).exam       as number ?? 0,
      library:    (fs as Record<string, unknown>).library    as number ?? 0,
      sports:     (fs as Record<string, unknown>).sports     as number ?? 0,
      lab:        (fs as Record<string, unknown>).lab        as number ?? 0,
      hostel:     (fs as Record<string, unknown>).hostel     as number ?? 0,
      uniform:    (fs as Record<string, unknown>).uniform    as number ?? 0,
      stationery: (fs as Record<string, unknown>).stationery as number ?? 0,
    };
  }

  const classNameFilter = { $in: [className, `Class ${className}`, className.replace(/^Class\s+/i, "")] };
  const students = await Student.find({ className: classNameFilter, status: 'active' }).lean();
  if (!students.length) {
    return NextResponse.json({ error: `No active students in class ${className}` }, { status: 404 });
  }

  const dueDateObj = new Date(dueDate);
  const dueDateBS  = formatBSDateShort(dueDateObj);
  const adMonth    = monthAD ?? new Date().toISOString().slice(0, 7);
  const totalAmount = sumFeeHeads(feeHeads);

  let created = 0;
  let skipped = 0;

  const ops = await Promise.allSettled(
    students.map(async (student) => {
      const exists = await Invoice.exists({ studentId: student._id, monthBS });
      if (exists) { skipped++; return; }

      const invoiceNumber = await nextInvoiceSeq(fiscalYear);
      await Invoice.create({
        invoiceNumber,
        studentId: student._id,
        fiscalYear,
        monthBS,
        monthAD: adMonth,
        dueDate: dueDateObj,
        dueDateBS,
        feeHeads,
        discount: 0,
        lateFine: 0,
        totalAmount,
        paidAmount: 0,
        status: 'pending',
      });
      created++;
    })
  );

  const errors = ops.filter((r) => r.status === 'rejected').length;

  return NextResponse.json({ created, skipped, errors }, { status: 201 });
}
