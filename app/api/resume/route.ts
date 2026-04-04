import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql, ensureSchema } from "@/lib/db";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  await ensureSchema();
  const result = await sql`SELECT resume FROM users WHERE id = ${session.user.id}`;
  return NextResponse.json({ resume: result.rows[0]?.resume || "" });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { resume } = await request.json();
  await ensureSchema();
  await sql`UPDATE users SET resume = ${resume} WHERE id = ${session.user.id}`;
  return NextResponse.json({ message: "Resume saved" });
}
