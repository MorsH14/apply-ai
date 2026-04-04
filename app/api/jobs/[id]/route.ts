import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql, ensureSchema } from "@/lib/db";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const {
    company, position, status,
    location = "", salary = "", jobDescription = "", notes = "",
  } = await request.json();

  await ensureSchema();
  const result = await sql`
    UPDATE jobs
    SET company          = ${company},
        position         = ${position},
        status           = ${status},
        location         = ${location},
        salary           = ${salary},
        job_description  = ${jobDescription},
        notes            = ${notes}
    WHERE id = ${id} AND user_id = ${session.user.id}
    RETURNING *
  `;
  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json(mapJob(result.rows[0]));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  await ensureSchema();
  const result = await sql`
    DELETE FROM jobs WHERE id = ${id} AND user_id = ${session.user.id} RETURNING id
  `;
  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json({ message: "Job deleted" });
}
