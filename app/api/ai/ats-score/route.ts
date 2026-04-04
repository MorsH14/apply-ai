import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(request: Request) {
  const { jobDescription, resume } = await request.json();

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY is not set" }, { status: 500 });
  }

  if (!jobDescription || !resume) {
    return NextResponse.json({ error: "Job description and resume are required" }, { status: 400 });
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a senior ATS (Applicant Tracking System) analyst and resume expert with deep knowledge of how modern hiring platforms like Workday, Greenhouse, Lever, and Ashby parse and score resumes. You give precise, honest, actionable assessments. You never inflate scores — a real score of 65% should show as 65%, not 80%.`,
        },
        {
          role: "user",
          content: `Analyse this resume against the job description and return a detailed ATS compatibility report.

JOB DESCRIPTION:
${jobDescription.slice(0, 3500)}

CANDIDATE RESUME:
${resume.slice(0, 3500)}

Score the resume across 4 sections (total 100 points):

1. KEYWORDS (35 pts): What % of critical technical skills, tools, and domain terms from the JD appear in the resume? Award 35 × (matched/total_critical_keywords).

2. EXPERIENCE (30 pts): Do bullets use strong action verbs? Are achievements quantified? Do job titles and responsibilities directly match the role level and function? Deduct for vague bullets, missing metrics, or misaligned seniority.

3. SUMMARY (20 pts): Does the professional summary (or opening) target this specific role? Does it use the job title and mirror key language from the JD? Deduct if absent or generic.

4. FORMAT (15 pts): Is the resume ATS-parseable? Correct section headers (all-caps or standard)? No tables, columns, or graphics that break parsing? Clean structure?

Return ONLY a valid JSON object in exactly this structure:
{
  "score": <integer 0-100, sum of all sections>,
  "grade": <"A" if >=90, "B" if >=75, "C" if >=60, "D" if >=45, "F" if <45>,
  "verdict": "<2 sentences: what's strong and what's costing the most points>",
  "ready_to_apply": <true if score >= 72>,
  "sections": {
    "keywords": {
      "score": <integer 0-35>,
      "issue": "<specific missing keyword cluster or pattern, or null if strong>",
      "fix": "<specific instruction to fix, or null>"
    },
    "experience": {
      "score": <integer 0-30>,
      "issue": "<specific bullet weakness or misalignment, or null>",
      "fix": "<specific instruction, or null>"
    },
    "summary": {
      "score": <integer 0-20>,
      "issue": "<what's wrong with the summary, or null>",
      "fix": "<specific rewrite instruction, or null>"
    },
    "format": {
      "score": <integer 0-15>,
      "issue": "<formatting issue, or null>",
      "fix": "<specific instruction, or null>"
    }
  },
  "critical_missing": [<up to 8 strings: the most important keywords from the JD not found in the resume>],
  "matched": [<up to 12 strings: important keywords from the JD that ARE in the resume>],
  "top_fix": "<the single most impactful one-sentence action the candidate can take right now to increase their score>"
}`,
        },
      ],
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content ?? "{}";

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("ATS score JSON parse error:", raw.slice(0, 200));
      return NextResponse.json({ error: "Failed to parse AI response. Please try again." }, { status: 500 });
    }

    // Validate required fields are present
    if (typeof data.score !== "number" || !data.sections) {
      return NextResponse.json({ error: "Incomplete analysis returned. Please try again." }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("ATS score error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
