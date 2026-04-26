import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "@/models/Student";
import Parent from "@/models/Parent";

interface ImportRow {
  name: string;
  className: string;
  section: string;
  rollNumber: number;
  gender?: string;
  admissionNumber?: string;
  admissionDate?: string;
  dateOfBirth?: string;
  address?: string;
  hostelResident?: boolean;
  parentName: string;
  parentPhone: string;
  parentAddress?: string;
}

function generateStudentId(className: string, section: string, rollNumber: number): string {
  const year = new Date().getFullYear();
  const cls = className.replace(/\s+/g, "").toUpperCase().slice(0, 3);
  const sec = section.toUpperCase().slice(0, 1);
  const roll = String(rollNumber).padStart(3, "0");
  return `${year}-${cls}${sec}-${roll}`;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { rows }: { rows: ImportRow[] } = await req.json();

    if (!rows?.length) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    const results = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      if (!row.name || !row.className || !row.section || !row.parentPhone) {
        results.errors.push(`Row ${rowNum}: Missing required fields (name, class, section, parent phone)`);
        results.skipped++;
        continue;
      }

      try {
        // Upsert parent by phone
        const parent = await Parent.findOneAndUpdate(
          { phone: row.parentPhone },
          {
            $setOnInsert: { whatsappActivated: false },
            $set: {
              name: row.parentName || "Unknown",
              phone: row.parentPhone,
              address: row.parentAddress || "",
            },
          },
          { upsert: true, new: true }
        );

        const rollNum = row.rollNumber || i + 1;
        const studentId = generateStudentId(row.className, row.section, rollNum);

        // Determine lookup key: prefer admissionNumber, fall back to studentId
        const lookupKey = row.admissionNumber
          ? { admissionNumber: row.admissionNumber }
          : { studentId };

        const studentData = {
          studentId,
          name: row.name,
          className: row.className,
          section: row.section,
          rollNumber: rollNum,
          gender: row.gender || "male",
          ...(row.dateOfBirth ? { dateOfBirth: new Date(row.dateOfBirth) } : {}),
          admissionDate: row.admissionDate ? new Date(row.admissionDate) : new Date(),
          admissionNumber: row.admissionNumber || studentId,
          address: row.address || "",
          hostelResident: row.hostelResident ?? false,
          parentId: parent._id,
          status: "active",
        };

        const result = await Student.findOneAndUpdate(
          lookupKey,
          { $set: studentData },
          { upsert: true, new: true, rawResult: true }
        );

        // rawResult gives us upsertedId — if set it was a new insert
        if ((result as unknown as { lastErrorObject?: { updatedExisting?: boolean } }).lastErrorObject?.updatedExisting) {
          results.updated++;
        } else {
          results.created++;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        results.errors.push(`Row ${rowNum}: ${msg}`);
        results.skipped++;
      }
    }

    return NextResponse.json(results);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
