import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql, ensureSchema } from "@/lib/db";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  await ensureSchema();

  const existing = await sql`SELECT id FROM users WHERE username = ${username.toLowerCase()}`;
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "Username already taken" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  await sql`INSERT INTO users (username, password) VALUES (${username.toLowerCase()}, ${hashed})`;

  return NextResponse.json({ message: "Account created successfully" });
}
