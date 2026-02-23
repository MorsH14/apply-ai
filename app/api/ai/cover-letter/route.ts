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

STRUCTURE — follow this exactly:

PARAGRAPH 1 — THE HOOK (2–3 sentences):
- Open with a specific, compelling statement about why this role and this company
- Lead with your strongest relevant achievement or value proposition — not your name, not "I am writing to apply"
- Make the hiring manager feel you understand exactly what they need

PARAGRAPH 2 — PROOF OF IMPACT (3–4 sentences):
- Pick the 1–2 most relevant experiences from the resume that directly match the job description
- Be specific: include real numbers, outcomes, or scope from the resume (e.g. "reduced deployment time by 40%")
- Connect your past results to the future results you'll deliver for them

PARAGRAPH 3 — WHY THIS COMPANY (2–3 sentences):
- Show you've read the job description carefully — reference something specific about the role or team
- Explain why this specific company/role is the right next step for you
- Avoid generic lines like "I am passionate about your mission" — be concrete

PARAGRAPH 4 — CLOSING (2 sentences):
- Confident, not desperate — express clear interest in next steps
- End with a proactive statement (e.g. "I'd welcome the chance to discuss how I can contribute to [specific team/goal]")

TONE AND STYLE RULES:
- Professional but human — write like a smart, confident person, not a robot
- No clichés: do not use "team player", "go-getter", "passionate", "leverage", "synergy"
- No throat-clearing openers: never start with "I am writing to apply", "My name is", or "I have always been interested in"
- Every sentence must earn its place — if it doesn't add value, cut it
- Target 250–350 words total

Return ONLY the cover letter body text. No subject line, no "Dear Hiring Manager" header, no commentary.`,
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
