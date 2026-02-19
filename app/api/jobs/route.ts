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
