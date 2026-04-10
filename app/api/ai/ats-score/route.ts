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

  const { jobDescription, resume } = await request.json();

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY is not set" }, { status: 500 });
  }

  if (!resume) {
    return NextResponse.json({ error: "Resume is required" }, { status: 400 });
  }

  const hasJD = Boolean(jobDescription?.trim());

  const prompt = hasJD
    ? `Analyse this resume against the job description and return a detailed ATS compatibility report.

JOB DESCRIPTION:
${jobDescription.slice(0, 3500)}

CANDIDATE RESUME:
${resume.slice(0, 3500)}

Score the resume across 4 sections (total 100 points):
1. KEYWORDS (35 pts): % of critical skills/tools/terms from JD present in resume
2. EXPERIENCE (30 pts): Strong action verbs, quantified achievements, role alignment
3. SUMMARY (20 pts): Targets this specific role, mirrors JD language
4. FORMAT (15 pts): ATS-parseable, no tables/graphics, clean structure

Return ONLY valid JSON:
{
  "score": <integer 0-100>,
  "grade": <"A" if >=90, "B" if >=75, "C" if >=60, "D" if >=45, "F" if <45>,
  "verdict": "<2 sentences: what's strong and what's costing the most points>",
  "ready_to_apply": <true if score >= 72>,
  "mode": "targeted",
  "sections": {
    "keywords":   { "score": <0-35>, "max": 35, "issue": "<specific gap or null>", "fix": "<instruction or null>" },
    "experience": { "score": <0-30>, "max": 30, "issue": "<or null>", "fix": "<or null>" },
    "summary":    { "score": <0-20>, "max": 20, "issue": "<or null>", "fix": "<or null>" },
    "format":     { "score": <0-15>, "max": 15, "issue": "<or null>", "fix": "<or null>" }
  },
  "critical_missing": [<up to 8 JD terms missing from resume>],
  "matched": [<up to 12 JD terms found in resume>],
  "improvements": [
    { "category": "<Keywords|Experience|Summary|Format>", "text": "<specific actionable fix>", "priority": "<high|medium|low>" }
  ],
  "strengths": [<up to 4 specific things the resume does well>],
  "top_fix": "<single most impactful one-sentence action>"
}`
    : `You are a professional resume coach. Analyse this resume for overall quality and return detailed, actionable feedback.

CANDIDATE RESUME:
${resume.slice(0, 4000)}

Score across 5 dimensions (total 100 points):
1. IMPACT (35 pts): Achievements quantified with metrics? Strong action verbs? Clear evidence of value delivered?
2. BREVITY (20 pts): Concise? No filler words or redundant phrases? Tight bullets?
3. STYLE (20 pts): Professional, consistent language? Correct tense? No first-person pronouns?
4. SECTIONS (15 pts): All key sections present (Summary, Experience, Education, Skills)? Clear formatting?
5. FORMAT (10 pts): ATS-parseable? Standard headers? No tables/columns/graphics?

Return ONLY valid JSON:
{
  "score": <integer 0-100>,
  "grade": <"A" if >=90, "B" if >=75, "C" if >=60, "D" if >=45, "F" if <45>,
  "verdict": "<2 sentences: biggest strength and biggest weakness>",
  "ready_to_apply": <true if score >= 72>,
  "mode": "general",
  "sections": {
    "impact":   { "score": <0-35>, "max": 35, "issue": "<specific weakness or null>", "fix": "<specific instruction or null>" },
    "brevity":  { "score": <0-20>, "max": 20, "issue": "<or null>", "fix": "<or null>" },
    "style":    { "score": <0-20>, "max": 20, "issue": "<or null>", "fix": "<or null>" },
    "sections": { "score": <0-15>, "max": 15, "issue": "<or null>", "fix": "<or null>" },
    "format":   { "score": <0-10>, "max": 10, "issue": "<or null>", "fix": "<or null>" }
  },
  "critical_missing": [],
  "matched": [],
  "improvements": [
    { "category": "<Impact|Brevity|Style|Sections|Format>", "text": "<specific actionable improvement referencing actual resume content>", "priority": "<high|medium|low>" }
  ],
  "strengths": [<up to 4 specific things the resume does well — be specific, not generic>],
  "top_fix": "<single most impactful one-sentence action to increase score>"
}

Be direct and specific. Reference actual content from the resume when identifying issues. Never inflate scores.`;

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a senior resume coach and ATS expert. You give precise, honest, actionable assessments. Never inflate scores — a 65% resume scores 65%, not 80%.",
        },
        { role: "user", content: prompt },
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      max_tokens: 1800,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("ATS score JSON parse error:", raw.slice(0, 200));
      return NextResponse.json({ error: "Failed to parse AI response. Please try again." }, { status: 500 });
    }

    if (typeof data.score !== "number" || !data.sections) {
      return NextResponse.json({ error: "Incomplete analysis returned. Please try again." }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    return handleAiError(err);
  }
}
