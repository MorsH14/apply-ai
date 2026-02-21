import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import Job from "@/models/Job";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Update a single job (must belong to current user)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  await connectDB();
  const { id } = await params;
  const data = await request.json();
  const job = await Job.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    data,
    { new: true }
  );
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json(job);
}

// Delete a single job (must belong to current user)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  await connectDB();
  const { id } = await params;
  const job = await Job.findOneAndDelete({ _id: id, userId: session.user.id });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json({ message: "Job deleted" });
}
