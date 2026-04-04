import { sql, ensureSchema } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await ensureSchema();
    await sql`SELECT 1`;
    return NextResponse.json({ status: "connected" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
