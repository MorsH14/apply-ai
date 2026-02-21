import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import Job from "@/models/Job";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Get all jobs for current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  await connectDB();
  const jobs = await Job.find({ userId: session.user.id }).sort({ createdAt: -1 });
  return NextResponse.json(jobs);
}

// Create new job for current user
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  await connectDB();
  const data = await request.json();
  const job = await Job.create({ ...data, userId: session.user.id });
  return NextResponse.json(job);
}

// Delete all jobs for current user
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  await connectDB();
  await Job.deleteMany({ userId: session.user.id });
  return NextResponse.json({ message: "All jobs deleted" });
}
