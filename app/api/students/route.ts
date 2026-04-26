import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import StudentModel from "@/models/Student";
import ParentModel from "@/models/Parent";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const cls = searchParams.get("class");
    const section = searchParams.get("section");
    const search = searchParams.get("search");
    const showInactive = searchParams.get("active") === "false";

    const query: Record<string, unknown> = showInactive ? {} : { status: "active" };
    if (cls) {
      // Accept both "1" and "Class 1" formats since Excel imports may use either
      query.className = { $in: [cls, `Class ${cls}`, cls.replace(/^Class\s+/i, "")] };
    }
    if (section) query.section = section;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
        { admissionNumber: { $regex: search, $options: "i" } },
      ];
    }

    const total = await StudentModel.countDocuments(query);
    const students = await StudentModel.find(query)
      .populate("parentId", "name phone whatsappActivated")
      .sort({ className: 1, section: 1, rollNumber: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({ students, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Get students error:", error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    const { parentData, ...studentData } = body;

    let parent = await ParentModel.findOne({ phone: parentData.phone });
    if (!parent) {
      parent = await ParentModel.create(parentData);
    }

    const studentCount = await StudentModel.countDocuments();
    studentData.studentId = `STU-${String(studentCount + 1).padStart(5, "0")}`;
    studentData.parentId = parent._id;

    const student = await StudentModel.create(studentData);
    await student.populate("parentId", "name phone");

    return NextResponse.json({ student }, { status: 201 });
  } catch (error: unknown) {
    console.error("Create student error:", error);
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "Student ID or admission number already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, ...updates } = body;

    const student = await StudentModel.findByIdAndUpdate(id, updates, { new: true }).populate(
      "parentId",
      "name phone"
    );

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ student });
  } catch (error) {
    console.error("Update student error:", error);
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }
}
