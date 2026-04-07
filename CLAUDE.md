# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server (Next.js)
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

## Required Environment Variables

```
POSTGRES_URL         # Neon PostgreSQL connection string (required by @vercel/postgres)
NEXTAUTH_SECRET      # NextAuth JWT secret
GROQ_API_KEY         # Groq API key for LLM calls
```

## Architecture

This is a **Next.js 16 App Router** application — all routes live under `app/`.

### Data Flow

- **Auth**: NextAuth with `CredentialsProvider` (`lib/auth.ts`). Passwords hashed with bcrypt. JWT strategy — `session.user.id` is populated from the JWT token in the `session` callback.
- **Database**: Neon PostgreSQL via `@vercel/postgres` (`lib/db.ts`). Schema is lazily initialized via `ensureSchema()` (called at the top of every API route). Two tables: `users` and `jobs`.
- **users table**: `id` (UUID PK), `username` (TEXT UNIQUE), `password` (TEXT hashed), `resume` (TEXT).
- **jobs table**: `id` (UUID PK), `user_id` (TEXT, indexed), `company`, `position`, `status`, `location`, `salary`, `job_description`, `notes`, `created_at`.

### API Routes

| Route | Purpose |
|---|---|
| `app/api/auth/[...nextauth]` | NextAuth handler |
| `app/api/auth/register` | User registration |
| `app/api/jobs` | GET/POST/DELETE all jobs for current user |
| `app/api/jobs/[id]` | PATCH/DELETE a single job |
| `app/api/resume` | GET/PUT the user's resume text |
| `app/api/resume/upload` | POST — parse PDF/DOCX/TXT and return extracted text |
| `app/api/ai/tailor` | POST — tailor resume via Groq LLM |
| `app/api/ai/cover-letter` | POST — generate cover letter via Groq LLM |

### AI Integration

Both AI routes (`/api/ai/tailor`, `/api/ai/cover-letter`) call Groq with `llama-3.3-70b-versatile`. They receive `{ jobDescription, resume, company, position }` and return `{ result: string }` — plain text following a strict format the prompts enforce. The prompts are tightly formatted (see the route files) — the output text is parsed downstream by the PDF engine, so the format matters.

### PDF Generation (`lib/pdf-templates.ts`)

Client-side only (dynamically imported via `next/dynamic`). Three templates: `classic`, `executive`, `fresh`. Entry point is `downloadDocument(opts: DownloadOptions)` which lazy-loads `jsPDF`.

The PDF engine parses plain text output from the AI by line type:
- All-caps lines → section headers
- Lines with ` | ` separators → entry lines (job title rows)
- Lines starting with `•`, `-`, `*` → bullets
- Lines matching `Label: value` → skill lines
- First two non-empty lines → name + contact (document header)

All three templates implement the same `TemplateStyles` interface and share `renderResumeBody` / `renderCoverBody` renderers.

### Frontend (`app/page.tsx`)

Single-page dashboard (`'use client'`). All state is local React state — no global state library. The `TemplatePickerModal` component (`components/TemplatePickerModal.tsx`) is dynamically imported with `ssr: false` since it uses jsPDF.

Resume upload (`/api/resume/upload`) accepts PDF, DOCX, or TXT and returns extracted plain text, which is then saved to the user record via `/api/resume` PUT.

## Path Aliases

`@/` maps to the project root (configured in `tsconfig.json`).
