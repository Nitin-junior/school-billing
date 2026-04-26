import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import FeeStructureModel from "@/models/FeeStructure";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const className  = searchParams.get("class") ?? searchParams.get("className");
    const fiscalYear = searchParams.get("fiscalYear") ?? searchParams.get("academicYear");

    const query: Record<string, unknown> = {};
    if (className)  query.className  = className;
    if (fiscalYear) query.fiscalYear = fiscalYear;

    const feeStructures = await FeeStructureModel.find(query)
      .sort({ className: 1 })
      .lean();
    return NextResponse.json({ feeStructures });
  } catch (error) {
    console.error("Get fees error:", error);
    return NextResponse.json({ error: "Failed to fetch fee structures" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { className, fiscalYear, ...rest } = body;

    if (!className || !fiscalYear) {
      return NextResponse.json({ error: "className and fiscalYear are required" }, { status: 400 });
    }

    // Upsert by className + fiscalYear
    const feeStructure = await FeeStructureModel.findOneAndUpdate(
      { className, fiscalYear },
      { $set: { className, fiscalYear, ...rest, updatedAt: new Date() } },
      { upsert: true, new: true }
    );
    return NextResponse.json({ feeStructure }, { status: 201 });
  } catch (error) {
    console.error("Create fee error:", error);
    return NextResponse.json({ error: "Failed to create fee structure" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    // Accept both _id and id
    const id = body._id ?? body.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const { _id, id: _bodyId, ...updates } = body;
    const feeStructure = await FeeStructureModel.findByIdAndUpdate(
      id,
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true }
    );
    if (!feeStructure) {
      return NextResponse.json({ error: "Fee structure not found" }, { status: 404 });
    }
    return NextResponse.json({ feeStructure });
  } catch (error) {
    console.error("Update fee error:", error);
    return NextResponse.json({ error: "Failed to update fee structure" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await FeeStructureModel.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete fee error:", error);
    return NextResponse.json({ error: "Failed to delete fee structure" }, { status: 500 });
  }
}
