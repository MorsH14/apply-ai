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
          content: `You are an expert career coach and professional writer who crafts cover letters that consistently get callbacks. You write with confidence, specificity, and zero filler. You understand what hiring managers in 2025 actually want to read.`,
        },
        {
          role: "user",
          content: `Write a high-impact, personalized cover letter for this application.

ROLE: ${position} at ${company}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S RESUME:
${resume}

OUTPUT FORMAT — follow this exact structure, every line as shown:

Line 1: Candidate's full name (extracted from resume — do not fabricate)
Line 2: Contact line: email | phone | City, Country (include only what exists in the resume)
Line 3: Empty line
Line 4: Today's date in this format: February 26, 2026
Line 5: Empty line
Line 6: Hiring Manager
Line 7: ${company}
Line 8: Empty line
Line 9: Dear Hiring Manager,
Line 10: Empty line

Then write the body using this paragraph structure:

PARAGRAPH 1 — THE HOOK (2–3 sentences):
- Lead with the candidate's strongest achievement or specific value proposition relevant to this role
- Make the hiring manager immediately feel this person understands what they need
- Never start with "I am writing to apply", "My name is", or "I have always been interested in"

PARAGRAPH 2 — PROOF OF IMPACT (3–4 sentences):
- Cite 1–2 specific experiences from the resume that directly match the job description
- Include real numbers, outcomes, or scope already in the resume (e.g. "reduced deployment time by 40%")
- Bridge past results to future value for this specific company

PARAGRAPH 3 — WHY THIS COMPANY (2–3 sentences):
- Reference something concrete and specific from the job description
- Explain why this role is the clear next step — be specific, not generic
- No lines like "I am passionate about your mission" — say what specifically draws you here

PARAGRAPH 4 — CLOSING (2 sentences):
- Confident close, not desperate
- End with a proactive call to action referencing the role or team

Then after the body add:
- Empty line
- Sincerely,
- Empty line
- Candidate's full name

TONE AND STYLE:
- Professional but human — confident, direct, never sycophantic
- No clichés: banned words — "team player", "go-getter", "passionate", "leverage", "synergy", "results-driven"
- Every sentence must earn its place
- Target 280–350 words for the body only

Return ONLY the formatted cover letter as described. No commentary, no "Here is your cover letter:", no extra text.`,
        },
      ],
      max_tokens: 1500,
    });

    const text = completion.choices[0].message.content ?? "";
    return NextResponse.json({ result: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Groq cover letter error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
