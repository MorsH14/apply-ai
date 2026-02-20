import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Job from "@/models/Job";

// Get all jobs
export async function GET() {
  await connectDB();
  const jobs = await Job.find().sort({ createdAt: -1 });
  return NextResponse.json(jobs);
}

// Create new job
export async function POST(request: Request) {
  await connectDB();
  const data = await request.json();
  const job = await Job.create(data);
  return NextResponse.json(job);
}

export async function DELETE() {
  await connectDB();
  await Job.deleteMany({});
  return NextResponse.json({ message: "All jobs deleted" });
}

export async function PUT(request: Request) {
  await connectDB();
  const data = await request.json();
  const { id, ...updateData } = data;
  const job = await Job.findByIdAndUpdate(id, updateData, { new: true });
  return NextResponse.json(job);
}
