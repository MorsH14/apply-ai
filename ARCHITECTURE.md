# How Genova Works — Developer Summary

This document explains the entire Genova codebase in plain prose. Read this before touching any file.

---

## The Big Picture

Genova is a Next.js 16 App Router application. Every page and API route lives under the `app/` directory. There is no `pages/` directory. The app runs on Vercel (serverless) with MongoDB Atlas as the database and Groq as the AI provider.

The three things the app does:
1. Let users track job applications (CRUD)
2. Let the AI tailor their resume and generate cover letters for each job
3. Let users download those outputs as PDFs

Everything requires authentication. There is no public content beyond the login page.

---

## Entry Point and Layout

`app/layout.tsx` is the root layout. It sets the page metadata (title, description) and wraps all children in `<Providers>`. That's it.

`app/providers.tsx` exists solely because `SessionProvider` (from `next-auth/react`) requires `'use client'`, but `layout.tsx` is a server component. So `Providers` is the client boundary — it wraps children in `SessionProvider` and nothing else.

`app/page.tsx` is the main dashboard. It's a client component (`'use client'`). Everything the user interacts with — the job list, the edit form, the AI panel, the resume panel, the analytics bar — lives here.

`app/login/page.tsx` is the auth page. It handles both login and register in a single component, toggling between the two modes with local state. It calls `signIn()` from `next-auth/react` for login and hits `/api/auth/register` for registration.

---

## Authentication Flow

When a user hits any route, `middleware.ts` runs first. It runs on the Edge Runtime, meaning it executes before any API route or page handler. It calls `getToken()` from `next-auth/jwt` to verify the JWT cookie cryptographically — no database query involved.

- If the JWT is valid: the request passes through to the actual handler.
- If the JWT is missing or invalid: redirect to `/login`.
- Special case: `/login` and `/api/auth/*` are whitelisted so the auth flow itself is never blocked.

**Registration** (`POST /api/auth/register`): validates that the username is not taken and the password is at least 6 characters, hashes the password with `bcryptjs`, and saves the new User document to MongoDB.

**Login** (`POST /api/auth/signin` — handled by NextAuth internally): NextAuth's Credentials provider calls `authorize()`, which queries MongoDB for the username and runs `bcrypt.compare()` on the password. If valid, it returns the user object. NextAuth then creates a signed JWT stored in an httpOnly cookie.

**JWT callbacks** in `lib/auth.ts`:
- On first login, the `jwt` callback embeds `user.id` into the token.
- On every request, the `session` callback reads `token.id` and puts it on `session.user.id`.

This is why `session.user.id` is always available in API routes via `getServerSession(authOptions)`. The TypeScript augmentation in `types/next-auth.d.ts` makes the compiler aware that `session.user.id` exists — without it, TypeScript would complain that `id` is not on the default `User` type.

---

## Database Layer

`lib/db.ts` exports a `connectDB()` function. It maintains a module-level `isConnected` flag. On first call, it connects to MongoDB. On subsequent calls, it returns immediately. This is the connection pooling strategy — necessary because Next.js API routes are serverless functions that spin up on demand. Without this, every request would open a new connection and exhaust MongoDB's connection limit.

`models/Job.ts` defines the Job schema: `company`, `position`, `status`, `location`, `salary`, `jobDescription`, `notes`, and critically `userId`. The `userId` field links every job to the user who created it.

`models/User.ts` defines the User schema: `username` (unique, lowercase, trimmed), `password` (bcrypt hash), and `resume` (the user's master resume text, default empty string).

Mongoose models are registered with the `mongoose.models.ModelName || mongoose.model(...)` pattern to avoid "model already defined" errors from Next.js hot module replacement in development.

---

## API Routes

All protected routes follow the same pattern:
1. Call `getServerSession(authOptions)` to get the current user.
2. If no session or no `session.user.id`, return 401.
3. Connect to the database.
4. Scope every query to the current user's ID.

**`/api/jobs` (GET, POST, DELETE)**
- GET: returns all jobs where `userId === session.user.id`
- POST: creates a new job with `userId` set to the current user
- DELETE: deletes all jobs for the current user

**`/api/jobs/[id]` (PUT, DELETE)**
- PUT: updates a single job using `findOneAndUpdate({ _id: id, userId })` — the `userId` check prevents one user from editing another user's job (IDOR protection)
- DELETE: same pattern with `findOneAndDelete`

Next.js 16 changed `params` to be a Promise. The route handler signature is `async function PUT(request, { params }: { params: Promise<{ id: string }> })` and you must `await params` before accessing `params.id`.

**`/api/resume` (GET, PUT)**
- GET: returns the `resume` field from the User document
- PUT: updates the `resume` field on the User document

**`/api/auth/register` (POST)**
- Creates a new user. Not protected by middleware (it's a public endpoint for new users).

**`/api/ai/tailor` (POST)**
- Receives `{ jobDescription, resume, company, position }` from the client
- Builds a prompt instructing Llama 3.3 70B to tailor the resume to the job description
- Calls the Groq SDK server-side (API key never leaves the server)
- Returns `{ result: tailoredResumeText }`

**`/api/ai/cover-letter` (POST)**
- Same pattern, different prompt — generates a cover letter instead

---

## AI Layer

The Groq SDK is used server-side only. The `GROQ_API_KEY` environment variable is never sent to the client. The API routes build a prompt string and call `groq.chat.completions.create()` with model `llama-3.3-70b-versatile`. The full response is awaited before returning — there is no streaming in the current implementation.

Groq runs Llama 3.3 70B on their own inference hardware. The free tier is generous and requires no credit card. The model is particularly good at writing tasks, which makes it well-suited for resume tailoring and cover letter generation.

---

## Client-Side PDF Generation

`jsPDF` is dynamically imported on button click:

```ts
const { jsPDF } = await import('jspdf');
```

This ensures the ~300KB library is not included in the initial page bundle. jsPDF runs entirely in the browser — no server involved. The code manually draws text on the canvas: splits each line to fit within the page width, tracks the Y cursor position, and calls `doc.addPage()` when the cursor would overflow the page margin.

---

## Data Flow — End to End

**Loading the dashboard:**
1. Browser hits `/`. Middleware checks JWT → valid → page loads.
2. `app/page.tsx` mounts. `useSession()` provides `session.user.id`.
3. Component fetches `/api/jobs` (GET) — returns this user's jobs.
4. Component fetches `/api/resume` (GET) — returns this user's saved resume text.
5. Jobs and resume render in the UI.

**Editing a job:**
1. User clicks Edit on a job card. Inline edit form appears with current values.
2. User changes fields, clicks Save.
3. `fetch('/api/jobs/${job._id}', { method: 'PUT', body: JSON.stringify(changes) })`.
4. API route updates the document in MongoDB (scoped to `userId`).
5. Client updates local state to reflect the change.

**Tailoring a resume:**
1. User selects a job, clicks "Tailor My Resume" in the AI panel.
2. `fetch('/api/ai/tailor', { method: 'POST', body: JSON.stringify({ jobDescription, resume, company, position }) })`.
3. Middleware checks JWT → valid → API route runs.
4. Server calls Groq → Llama 3.3 70B generates tailored text.
5. `{ result: "..." }` returned to client.
6. Client renders the result in the AI output panel.
7. User clicks "Download PDF" → jsPDF generates and downloads the file in-browser.

---

## File Responsibilities at a Glance

| File | What it does |
|---|---|
| `middleware.ts` | Guards all routes. Checks JWT on every request. |
| `app/layout.tsx` | Root layout. Wraps in Providers. Sets metadata. |
| `app/providers.tsx` | Client boundary for SessionProvider. |
| `app/page.tsx` | Entire dashboard UI and logic. |
| `app/login/page.tsx` | Login + register page. |
| `lib/auth.ts` | NextAuth config. Credentials provider, JWT callbacks. |
| `lib/db.ts` | MongoDB connection singleton. |
| `models/Job.ts` | Job schema. |
| `models/User.ts` | User schema (includes resume field). |
| `app/api/jobs/route.ts` | List, create, bulk-delete jobs. |
| `app/api/jobs/[id]/route.ts` | Update or delete a single job. |
| `app/api/resume/route.ts` | Read or save user's master resume. |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth handler (login, session, signout). |
| `app/api/auth/register/route.ts` | Create new user account. |
| `app/api/ai/tailor/route.ts` | AI resume tailoring via Groq. |
| `app/api/ai/cover-letter/route.ts` | AI cover letter generation via Groq. |
| `types/next-auth.d.ts` | TypeScript augmentation — adds `id` to session user type. |

---

## Key Things to Know Before Changing Anything

- **Never remove the `userId` filter from job queries.** Without it, any authenticated user can read or mutate another user's data (IDOR).
- **`params` in Next.js 16 is a Promise.** Always `await params` before accessing route parameters.
- **The Groq API key must stay server-side.** Never import `groq` in a client component or pass the key to the frontend.
- **`connectDB()` must be called before every Mongoose operation.** It's idempotent (safe to call multiple times) but skipping it will throw if the connection hasn't been established yet.
- **NextAuth module augmentation in `types/next-auth.d.ts` is load-bearing.** Deleting it breaks TypeScript throughout the API routes.
- **`app/providers.tsx` must stay `'use client'`.** `SessionProvider` uses React context, which requires a client component boundary.
