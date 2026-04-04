import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql, ensureSchema } from "@/lib/db";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Map a SQL row to the shape the frontend expects (preserving _id for compatibility)
function mapJob(row: Record<string, unknown>) {
  return {
    _id: row.id,
    userId: row.user_id,
    company: row.company,
    position: row.position,
    status: row.status,
    location: row.location || "",
    salary: row.salary || "",
    jobDescription: row.job_description || "",
    notes: row.notes || "",
    createdAt: row.created_at,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  await ensureSchema();
  const result = await sql`
    SELECT * FROM jobs WHERE user_id = ${session.user.id} ORDER BY created_at DESC
  `;
  return NextResponse.json(result.rows.map(mapJob));
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  await ensureSchema();
  const {
    company, position,
    status = "saved", location = "", salary = "", jobDescription = "", notes = "",
  } = await request.json();

  const result = await sql`
    INSERT INTO jobs (user_id, company, position, status, location, salary, job_description, notes)
    VALUES (${session.user.id}, ${company}, ${position}, ${status}, ${location}, ${salary}, ${jobDescription}, ${notes})
    RETURNING *
  `;
  return NextResponse.json(mapJob(result.rows[0]));
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  await ensureSchema();
  await sql`DELETE FROM jobs WHERE user_id = ${session.user.id}`;
  return NextResponse.json({ message: "All jobs deleted" });
}
