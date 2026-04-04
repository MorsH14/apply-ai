import { sql } from "@vercel/postgres";

let schemaInitialized = false;

export async function ensureSchema(): Promise<void> {
  if (schemaInitialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username  TEXT UNIQUE NOT NULL,
      password  TEXT NOT NULL,
      resume    TEXT NOT NULL DEFAULT ''
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS jobs (
      id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id          TEXT        NOT NULL,
      company          TEXT        NOT NULL,
      position         TEXT        NOT NULL,
      status           TEXT        NOT NULL DEFAULT 'saved',
      location         TEXT        NOT NULL DEFAULT '',
      salary           TEXT        NOT NULL DEFAULT '',
      job_description  TEXT        NOT NULL DEFAULT '',
      notes            TEXT        NOT NULL DEFAULT '',
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS jobs_user_id_idx ON jobs (user_id)`;

  schemaInitialized = true;
}

export { sql };
