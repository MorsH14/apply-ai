# Genova — Apply smarter. Land faster.

> An AI-powered job search command center. Track every application, tailor your resume for each role, and generate cover letters in seconds.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green)](https://mongoosejs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- **Job Tracking** — Add, edit, and delete job applications with status, location, salary, and notes
- **Status Pipeline** — Track each application through: Saved → Applied → Interview → Offer → Rejected
- **Analytics Bar** — Live counts per status at a glance
- **AI Resume Tailoring** — Paste a job description, get a version of your resume tuned for that exact role
- **AI Cover Letter Generator** — Personalised cover letters generated in seconds
- **PDF Export** — Download tailored resumes and cover letters as formatted PDFs
- **Per-Account Resume** — Your master resume is stored securely with your account, not in the browser
- **Multi-User Auth** — Each user has their own account with fully isolated data

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Database | MongoDB + Mongoose ODM |
| Auth | NextAuth.js v4 (JWT strategy) |
| AI | Groq API — Llama 3.3 70B |
| PDF | jsPDF (client-side) |
| Deployment | Vercel |

---

## Project Structure

```
app/
├── layout.tsx                  # Root layout — wraps everything in SessionProvider
├── page.tsx                    # Main dashboard (client component)
├── providers.tsx               # SessionProvider wrapper (must be 'use client')
├── login/
│   └── page.tsx                # Login + Register page (split-screen design)
└── api/
    ├── auth/
    │   ├── [...nextauth]/      # Catches all /api/auth/* requests (NextAuth)
    │   └── register/           # POST — create new user account
    ├── jobs/
    │   ├── route.ts            # GET all jobs, POST new job, DELETE all jobs
    │   └── [id]/route.ts       # PUT update job, DELETE single job
    ├── resume/
    │   └── route.ts            # GET resume, PUT save resume
    └── ai/
        ├── tailor/             # POST — AI resume tailoring via Groq
        └── cover-letter/       # POST — AI cover letter via Groq

lib/
├── db.ts                       # MongoDB connection with pooling singleton
└── auth.ts                     # NextAuth config (authOptions)

models/
├── Job.ts                      # Mongoose schema: job fields + userId
└── User.ts                     # Mongoose schema: credentials + resume field

middleware.ts                   # Edge middleware — protects all routes via JWT
types/next-auth.d.ts            # TypeScript augmentation for session.user.id
```

---

## Architecture Deep Dive

### 1. Database — Connection Pooling

Next.js API routes are serverless functions that spin up and down per request. Without pooling, every request would open a new MongoDB connection and quickly exhaust the connection limit.

```ts
// lib/db.ts
let isConnected = false;

export const connectDB = async () => {
  if (isConnected) return; // reuse existing connection
  await mongoose.connect(uri);
  isConnected = true;
};
```

Mongoose models use `mongoose.models.Job || mongoose.model(...)` to prevent the "model already defined" error caused by Next.js hot-reloading modules in development.

---

### 2. Authentication — NextAuth JWT Strategy

When a user logs in:
1. NextAuth calls `authorize()` in the Credentials provider
2. MongoDB is queried for the username; `bcrypt.compare()` checks the password hash
3. On success, NextAuth creates a **signed JWT** stored in an httpOnly cookie (`next-auth.session-token`)
4. Every subsequent request verifies the cookie cryptographically — no DB hit required

```ts
callbacks: {
  jwt({ token, user }) {
    if (user) token.id = user.id; // embed userId into JWT on first login
    return token;
  },
  session({ session, token }) {
    session.user.id = token.id;   // expose userId to client via useSession()
    return session;
  }
}
```

The `user` object only exists during the initial `authorize()` call. After that, only `token` is available — which is why `userId` must be embedded into the token at login time and read back in every subsequent `session` callback.

**TypeScript augmentation** (`types/next-auth.d.ts`) extends NextAuth's default `Session` type to include `user.id`, avoiding type errors throughout the API routes.

---

### 3. Route Protection — Edge Middleware

`middleware.ts` runs on Next.js **Edge Runtime**, intercepting every request before it reaches any page or API route. It verifies the JWT using `getToken` from `next-auth/jwt` — pure cryptographic verification, no network call.

```
Incoming request
      ↓
middleware.ts
      ↓
Valid JWT?  → Yes → pass through to page / API route
           → No  → redirect to /login
```

Public paths (`/login`, `/api/auth/*`) are explicitly whitelisted so the auth flow itself is never blocked.

---

### 4. Per-User Data Isolation

Every protected API route reads the session server-side:

```ts
const session = await getServerSession(authOptions);
if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

Every job query is scoped to the logged-in user:

```ts
Job.find({ userId: session.user.id })
Job.findOneAndDelete({ _id: id, userId: session.user.id }) // prevents IDOR
```

The `userId` check on mutations is critical. Without it, any authenticated user who guesses a MongoDB `_id` could read or delete another user's data — a vulnerability known as **Insecure Direct Object Reference (IDOR)**.

---

### 5. AI Layer — Groq + Llama 3.3 70B

```
Client
  → POST /api/ai/tailor  { jobDescription, resume, company, position }
  → Groq API  (server-side only — API key never exposed to client)
  → Llama 3.3 70B generates tailored content
  → { result: "..." } returned to client
```

The API key lives exclusively in `process.env.GROQ_API_KEY`. Groq runs Llama 3.3 70B on custom inference hardware — fast responses and a generous free tier with no credit card required.

> Current implementation awaits the full response before returning. A future improvement is streaming via `ReadableStream` so the user sees output as it generates word by word.

---

### 6. PDF Generation — Client-Side jsPDF

```ts
const { jsPDF } = await import('jspdf'); // dynamically imported on button click
```

jsPDF runs entirely in the browser — no server involved. The dynamic import ensures the ~300KB library is only downloaded when the user clicks "Download PDF", not on initial page load.

PDF content is drawn manually: split each line to fit the page width, track the Y cursor position, and call `doc.addPage()` when `y > pageHeight - margin`.

---

### 7. End-to-End Request Lifecycle

**Example: User clicks "Tailor My Resume"**

```
1. Browser         onClick → POST /api/ai/tailor
                             { jobDescription, resume, company, position }

2. middleware.ts   reads httpOnly cookie → verifies JWT → passes through

3. /api/ai/tailor  reads GROQ_API_KEY from env (server-side only)
                   assembles prompt string
                   calls Groq SDK → Llama 3.3 70B
                   returns { result: "tailored resume text..." }

4. Browser         setAiOutput(data) → React re-renders output card

5. "Download PDF"  jsPDF runs in browser → A4 PDF downloaded instantly
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongod`) or a MongoDB Atlas connection string

### Installation

```bash
# 1. Clone and install dependencies
git clone <repo-url>
cd job-apply
npm install

# 2. Set up environment variables
```

Create `.env.local` in the project root:

```env
# MongoDB (local or Atlas)
MONGODB_URI="mongodb://localhost:27017/genova"

# Groq — free at console.groq.com (no credit card)
GROQ_API_KEY="gsk_..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
```

```bash
# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and start tracking.

---

## Deployment (Vercel)

1. Push the repository to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Add environment variables in **Project Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `GROQ_API_KEY` | Your Groq API key |
| `NEXTAUTH_SECRET` | Random secret: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your Vercel URL e.g. `https://genova.vercel.app` |

4. Deploy — Vercel auto-detects Next.js and configures everything.

---

## Key Architectural Decisions

| Decision | Rationale |
|---|---|
| App Router over Pages Router | Colocation of API routes, async server components, better layouts |
| JWT sessions over DB sessions | No DB query per request; works well on serverless/Edge runtime |
| MongoDB over PostgreSQL | Flexible schema for an evolving data model; generous Atlas free tier |
| Groq over OpenAI/Anthropic | Free tier, very fast inference, Llama 3.3 70B excels at writing tasks |
| Client-side PDF (jsPDF) | No server cost, instant generation, no file storage needed |
| `userId` filter on every mutation | Prevents IDOR; users can only read and write their own data |
| Connection pooling singleton | Avoids exhausting MongoDB connections in serverless environments |

---

## Roadmap

- [ ] Streaming AI responses (real-time token-by-token output)
- [ ] Follow-up reminders (configurable days since applied)
- [ ] Response rate analytics per company and industry
- [ ] Interview prep notes per application
- [ ] Browser extension to auto-capture job details from listings

---

**Built with focus. Designed for the job seeker who means business.**
