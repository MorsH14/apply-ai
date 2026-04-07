import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { handleAiError } from "@/lib/ai-error";

export async function POST(request: Request) {
  const { resume, improvement, category } = await request.json();

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY is not set" }, { status: 500 });
  }

  if (!resume || !improvement) {
    return NextResponse.json({ error: "Resume and improvement are required" }, { status: 400 });
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a precise resume editor. Your job is to apply one specific improvement to a resume while keeping everything else exactly as-is. Do not rewrite unrelated sections, change the structure, add new content, or alter information you were not asked to touch. Make the minimum targeted edits needed to address the improvement. Never fabricate experience, companies, dates, titles, or metrics.`,
        },
        {
          role: "user",
          content: `Apply this specific improvement to the resume below.

IMPROVEMENT TO APPLY (${category}):
${improvement}

CURRENT RESUME:
${resume.slice(0, 4500)}

INSTRUCTIONS:
- Edit only what is needed to address the improvement above
- Keep all other content, formatting, and structure exactly the same
- Do not add commentary, preamble, or explanations
- Return ONLY the full updated resume text`,
        },
      ],
      max_tokens: 4096,
    });

    const result = completion.choices[0].message.content ?? "";
    return NextResponse.json({ result });
  } catch (err: unknown) {
    return handleAiError(err);
  }
}
