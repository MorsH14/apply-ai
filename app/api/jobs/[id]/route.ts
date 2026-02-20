import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Job from "@/models/Job";

// Update a single job
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  await connectDB();
  const data = await request.json();
  const job = await Job.findByIdAndUpdate(params.id, data, { new: true });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json(job);
}

// Delete a single job
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  await connectDB();
  const job = await Job.findByIdAndDelete(params.id);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json({ message: "Job deleted" });
}
