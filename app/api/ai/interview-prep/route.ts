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

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are an elite interview coach who has prepped candidates for Google, Meta, McKinsey, and top startups. You give brutally honest, resume-specific coaching — never generic advice. You know exactly what interviewers at different company types actually ask and why.",
        },
        {
          role: "user",
          content: `Prepare this candidate for their interview at ${company} for the ${position} role.

JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}

CANDIDATE RESUME:
${resume.slice(0, 3000)}

Generate exactly 8 interview questions that are highly likely to be asked for this specific role at a company like ${company}. Cover:
- 3 behavioral questions (past experience, conflict, teamwork)
- 3 technical/domain questions (specific to the role's requirements)
- 2 situational questions (hypotheticals relevant to the role)

For each question, write coaching guidance (3–4 sentences) that:
- References a SPECIFIC detail from this candidate's resume (actual company name, project, skill, or metric)
- Tells them exactly what to say and what to avoid
- Gives the strategic angle: what the interviewer is really testing for

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question": "The interview question exactly as a hiring manager would ask it",
      "type": "behavioral" | "technical" | "situational",
      "guidance": "3-4 sentence coaching note tied to this candidate's specific resume"
    }
  ]
}`,
        },
      ],
      max_tokens: 2500,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content ?? "{}";

    let data: { questions?: unknown[] };
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("Interview prep JSON parse error — raw:", raw.slice(0, 200));
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 500 }
      );
    }

    if (!Array.isArray(data.questions) || data.questions.length === 0) {
      return NextResponse.json(
        { error: "No questions were generated. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    return handleAiError(err);
  }
}
