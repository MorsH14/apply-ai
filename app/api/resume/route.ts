import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Get the current user's resume
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  await connectDB();
  const user = await User.findById(session.user.id).select("resume");
  return NextResponse.json({ resume: user?.resume || "" });
}

// Save the current user's resume
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { resume } = await request.json();
  await connectDB();
  await User.findByIdAndUpdate(session.user.id, { resume });
  return NextResponse.json({ message: "Resume saved" });
}
