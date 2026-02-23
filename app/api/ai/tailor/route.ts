import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(request: Request) {
  const { jobDescription, resume, company, position } = await request.json();

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not set in .env.local" },
      { status: 500 }
    );
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a senior resume strategist with 15+ years of experience helping candidates land roles at top companies. You have deep knowledge of ATS (Applicant Tracking Systems) and modern hiring practices in 2025.`,
        },
        {
          role: "user",
          content: `Tailor the resume below for this specific role. Your goal is to maximize ATS score AND impress the human recruiter who reads it after.

TARGET ROLE: ${position} at ${company}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S CURRENT RESUME:
${resume}

REWRITING RULES — follow every one of these:

ATS COMPLIANCE:
- Use plain text only — no tables, no columns, no graphics, no text boxes
- Mirror exact keywords and phrases from the job description (ATS matches literal strings)
- Use standard section headers: PROFESSIONAL SUMMARY, WORK EXPERIENCE, SKILLS, EDUCATION
- Spell out acronyms at least once (e.g. "Search Engine Optimization (SEO)")

PROFESSIONAL SUMMARY (3–4 lines at the top):
- Write a targeted summary that directly speaks to this specific role
- Include the job title, years of experience, and 2–3 of the most critical skills from the JD
- Never write "I" — write in third-person implied (e.g. "Results-driven software engineer with 5 years…")

WORK EXPERIENCE:
- Start every bullet with a strong past-tense action verb (Engineered, Spearheaded, Reduced, Increased, Delivered, Automated, etc.)
- Quantify impact wherever numbers exist in the original (%, $, time saved, team size, scale)
- For each role, lead with the 1–2 bullets most relevant to the target job
- Remove bullets that are irrelevant to this specific role — ruthlessly cut filler
- Do NOT invent achievements — only reframe and reorder real content

SKILLS SECTION:
- List only skills that appear in or are closely related to the job description
- Group into categories if there are many (e.g. Languages: … | Frameworks: … | Tools: …)

OVERALL:
- Keep it honest — never fabricate experience, titles, or dates
- Every line must pass the "so what?" test — if it doesn't show value, cut it
- Return ONLY the tailored resume text. No intro, no commentary, no "Here is your resume:"`,
        },
      ],
      max_tokens: 4096,
    });

    const text = completion.choices[0].message.content ?? "";
    return NextResponse.json({ result: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Groq tailor error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
