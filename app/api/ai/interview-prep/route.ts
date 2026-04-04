import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(request: Request) {
  const { jobDescription, resume, company, position } = await request.json();

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY is not set" }, { status: 500 });
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are an expert interview coach with 20+ years of experience preparing candidates for top companies. You know exactly what questions hiring managers ask and how strong candidates answer them. You give concrete, resume-specific coaching — never generic advice.",
        },
        {
          role: "user",
          content: `Generate interview preparation material for this specific candidate and role.

ROLE: ${position} at ${company}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE RESUME:
${resume}

Generate exactly 8 interview questions that are highly likely to be asked for this role. Cover a mix of behavioral, technical, and situational questions based on the job requirements.

For each question, write a concise coaching note (2-3 sentences) that references a SPECIFIC detail from this candidate's resume to anchor their answer. Be concrete — mention actual companies, projects, or skills from the resume. Never give generic advice.

Return ONLY a JSON object in this exact format:
{
  "questions": [
    {
      "question": "The interview question exactly as a hiring manager would ask it",
      "type": "behavioral" | "technical" | "situational",
      "guidance": "2-3 sentence coaching note referencing the candidate's specific background"
    }
  ]
}`,
        },
      ],
      max_tokens: 2048,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Interview prep error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
