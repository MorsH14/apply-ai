import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(request: Request) {
  const { jobDescription, resume, company, position, atsAnalysis } = await request.json();

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY is not set" }, { status: 500 });
  }

  if (!jobDescription || !resume) {
    return NextResponse.json({ error: "Job description and resume are required" }, { status: 400 });
  }

  // Summarise the ATS issues for the prompt
  const issuesSummary = atsAnalysis
    ? `
CURRENT ATS SCORE: ${atsAnalysis.score}/100 (${atsAnalysis.grade})
CRITICAL MISSING KEYWORDS: ${(atsAnalysis.critical_missing ?? []).join(", ") || "none identified"}
TOP FIX NEEDED: ${atsAnalysis.top_fix ?? "none"}
SECTION ISSUES:
${Object.entries(atsAnalysis.sections ?? {})
  .filter(([, v]) => (v as { issue?: string }).issue)
  .map(([k, v]) => `- ${k}: ${(v as { issue: string }).issue}`)
  .join("\n") || "none"}
`.trim()
    : "";

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an elite resume strategist and ATS optimisation expert. Your task is to rewrite a candidate's resume to score 95%+ against a specific job description while keeping every claim true, specific, and human-sounding. You never fabricate experience, companies, titles, dates, or metrics. You only reframe and strengthen what already exists. A score below 95% is unacceptable — push keyword density, tighten every bullet, and mirror the JD language precisely.`,
        },
        {
          role: "user",
          content: `Rewrite this resume to score 95%+ on ATS for the role below. This is a high-bar optimisation — every section must be maximally aligned with the job description. Fix every identified issue and integrate all critical missing keywords naturally.

TARGET ROLE: ${position} at ${company}

JOB DESCRIPTION:
${jobDescription.slice(0, 3500)}

CANDIDATE'S CURRENT RESUME:
${resume.slice(0, 3500)}

${issuesSummary}

OPTIMISATION INSTRUCTIONS:
1. KEYWORDS: Integrate EVERY critical missing keyword AND every important secondary keyword from the JD into bullets or skills. Use exact phrasing from the JD (ATS does literal string matching). Aim for 95%+ keyword coverage.
2. SUMMARY: Rewrite the opening summary to mirror the exact job title and top 4–5 requirements from the JD. Open with seniority + top skill + biggest relevant achievement. Include 2–3 high-value keywords in the first sentence.
3. EXPERIENCE: Rewrite every bullet — strong action verb + quantified or descriptive outcome + technology/scale. Align each role's language closely with the JD. No vague bullets allowed.
4. SKILLS: List every relevant skill from the JD that the candidate has, grouped by category. Include tools, frameworks, methodologies, and soft skills mentioned in the JD.
5. FORMAT: Use clean ATS-parseable section headers. No tables, no columns, no graphics.
6. TARGET: Every section must individually score 95%+. Keyword section must hit 35/35.

OUTPUT FORMAT — follow this exact structure:

Line 1: Candidate's full name
Line 2: email | phone | City, Country | LinkedIn (only what exists in the resume)
Line 3: Empty line

Then these sections in this exact order:

PROFESSIONAL SUMMARY
(3–4 sentences targeting this exact role)

WORK EXPERIENCE
Company Name | Job Title | Month Year – Month Year
• Strong bullet starting with action verb, quantified impact
• Strong bullet starting with action verb, quantified impact

SKILLS
Category: skill, skill, skill
Category: skill, skill, skill

EDUCATION
Institution | Degree, Field | Year

(include CERTIFICATIONS, PROJECTS, LANGUAGES only if present in the original resume)

STRICT RULES:
- Never fabricate names, companies, dates, titles, or metrics
- Only reframe and strengthen real content
- Every bullet must include an action verb and a measurable or descriptive outcome
- Mirror exact keyword phrases from the JD for ATS literal matching
- No tables, columns, or graphics
- Return ONLY the formatted resume — zero commentary, no preamble`,
        },
      ],
      max_tokens: 4096,
    });

    const text = completion.choices[0].message.content ?? "";
    return NextResponse.json({ result: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("ATS boost error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
