import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/db";
import User from "@/models/User";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  await connectDB();
  const existing = await User.findOne({ username: username.toLowerCase() });
  if (existing) {
    return NextResponse.json({ error: "Username already taken" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  await User.create({ username: username.toLowerCase(), password: hashed });

  return NextResponse.json({ message: "Account created successfully" });
}
