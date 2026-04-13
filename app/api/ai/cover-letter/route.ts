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
    return NextResponse.json({ error: "GROQ_API_KEY is not set" }, { status: 500 });
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
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are an elite career coach and professional writer. You write cover letters that consistently get callbacks because they feel human, specific, and confident — never generic, never sycophantic.",
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
- Never start with "I am writing to apply", "My name is", or "I have always been passionate about"

PARAGRAPH 2 — PROOF OF IMPACT (3–4 sentences):
- Draw 1–2 specific experiences from the resume that directly answer the job requirements
- Bridge past results to future value for this specific role at ${company}

PARAGRAPH 3 — WHY THIS COMPANY (2–3 sentences):
- Reference something concrete from the job description
- Explain why this role at ${company} is the right next step — be specific, not flattering

PARAGRAPH 4 — CLOSING (2 sentences):
- Confident close, proactive call to action referencing the specific role

After the body:
- Empty line
- Sincerely,
- Empty line
- Candidate's full name

TONE: Professional but human. Banned words: "team player", "passionate", "leverage", "synergy", "results-driven".
Target 280–340 words for the body. Return ONLY the formatted cover letter. No preamble.`,
        },
      ],
      max_tokens: 1500,
    });

    const text = completion.choices[0]?.message?.content ?? "";

    return NextResponse.json({ result: text });
  } catch (err: unknown) {
    return handleAiError(err);
  }
}
