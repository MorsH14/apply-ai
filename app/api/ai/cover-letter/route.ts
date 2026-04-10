import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleAiError } from "@/lib/ai-error";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobDescription, resume, company, position } = await request.json();

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY is not set in .env.local" }, { status: 500 });
  }

  if (!jobDescription || !resume) {
    return NextResponse.json({ error: "Job description and resume are required" }, { status: 400 });
  }

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an elite career coach and professional writer with 20+ years placing candidates at top-tier companies. You write cover letters that consistently get callbacks because they feel human, specific, and confident — never generic, never sycophantic. You write with the economy of a journalist and the persuasion of a copywriter.",
        },
        {
          role: "user",
          content: `Write a high-impact, personalised cover letter for this application. Today's date is ${today}.

ROLE: ${position} at ${company}

JOB DESCRIPTION:
${jobDescription.slice(0, 4000)}

CANDIDATE'S RESUME:
${resume.slice(0, 4000)}

OUTPUT FORMAT — follow this exact structure:

Line 1: Candidate's full name (extracted from resume — do not fabricate)
Line 2: Contact line: email | phone | City, Country (include only what exists in the resume)
Line 3: Empty line
Line 4: ${today}
Line 5: Empty line
Line 6: Hiring Manager
Line 7: ${company}
Line 8: Empty line
Line 9: Dear Hiring Manager,
Line 10: Empty line

Then write the body using this paragraph structure:

PARAGRAPH 1 — THE HOOK (2–3 sentences):
- Open with the candidate's single strongest, most relevant achievement to this role
- Make the hiring manager immediately feel this person solves a problem they have
- Never start with "I am writing to apply", "My name is", or "I have always been passionate about"
- If the candidate lacks a direct achievement, lead with a compelling positioning statement

PARAGRAPH 2 — PROOF OF IMPACT (3–4 sentences):
- Draw 1–2 specific experiences from the resume that directly answer the job requirements
- Use real numbers, outcomes, or scope already in the resume — if they don't exist, describe real scope instead
- Bridge past results to future value for this specific role at ${company}

PARAGRAPH 3 — WHY THIS COMPANY (2–3 sentences):
- Reference something concrete from the job description that genuinely excites the candidate
- Explain why this role at ${company} is the right next step — be specific, not flattering
- Avoid "I am passionate about your mission" — say what specifically draws them here

PARAGRAPH 4 — CLOSING (2 sentences):
- Confident close, never desperate or grovelling
- Proactive call to action referencing the specific role

After the body:
- Empty line
- Sincerely,
- Empty line
- Candidate's full name

TONE AND STYLE:
- Professional but human — confident, direct, never sycophantic
- Banned words: "team player", "go-getter", "passionate", "leverage", "synergy", "results-driven", "hard worker", "detail-oriented"
- Every sentence must earn its place — cut anything that doesn't add information
- Target 280–340 words for the body only
- Sound like a real person wrote this, not a template

Return ONLY the formatted cover letter. Zero commentary, no "Here is your cover letter:", no preamble.`,
        },
      ],
      model: "llama-3.3-70b-versatile",
      max_tokens: 1500,
    });

    const text = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ result: text });
  } catch (err: unknown) {
    return handleAiError(err);
  }
}
