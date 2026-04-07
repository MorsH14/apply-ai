import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { handleAiError } from "@/lib/ai-error";

export async function POST(request: Request) {
  const { resume, improvements } = await request.json();

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY is not set" }, { status: 500 });
  }

  if (!resume || !improvements?.length) {
    return NextResponse.json({ error: "Resume and improvements are required" }, { status: 400 });
  }

  const isSingle = improvements.length === 1;
  const improvementList = improvements
    .map((imp: { category: string; text: string }, i: number) => `${i + 1}. [${imp.category}] ${imp.text}`)
    .join("\n");

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert resume editor. Apply the requested improvements thoroughly and confidently. Each improvement must be fully addressed — not superficially touched. Only edit the sections relevant to each improvement. Never fabricate experience, companies, dates, titles, or metrics. Never add commentary or preamble to your output.`,
        },
        {
          role: "user",
          content: `Apply ${isSingle ? "this improvement" : "all of these improvements"} to the resume below. Each must be fully addressed — make the changes count.

${isSingle ? "IMPROVEMENT TO APPLY:" : "IMPROVEMENTS TO APPLY:"}
${improvementList}

CURRENT RESUME:
${resume.slice(0, 4500)}

RULES:
- Fully address every improvement listed — don't make superficial edits
- Only change sections relevant to each improvement; leave the rest exactly as-is
- Keep the same formatting structure and section order
- Never fabricate names, companies, dates, titles, or metrics
- Return ONLY the complete updated resume text — no commentary`,
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
