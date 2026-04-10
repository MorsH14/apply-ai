import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { handleAiError } from "@/lib/ai-error";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { resume, improvements, jobDescription, company, position } = await request.json();

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
  }

  if (!resume || !improvements?.length) {
    return NextResponse.json({ error: "Resume and improvements are required" }, { status: 400 });
  }

  const isSingle = improvements.length === 1;
  const improvementList = improvements
    .map((imp: { category: string; text: string }, i: number) => `${i + 1}. [${imp.category}] ${imp.text}`)
    .join("\n");

  const hasJobContext = Boolean(company || position || jobDescription?.trim());
  const jobContext = hasJobContext
    ? `\nTARGET ROLE: ${position ?? ""}${company ? ` at ${company}` : ""}${jobDescription ? `\nJOB DESCRIPTION (use for keyword alignment):\n${jobDescription.slice(0, 2000)}` : ""}\n`
    : "";

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `You are an expert resume editor. Apply the requested improvements thoroughly and confidently. Each improvement must be fully addressed — not superficially touched. Only edit the sections relevant to each improvement. When a target role is provided, align edits with that role's keywords and requirements. Never fabricate experience, companies, dates, titles, or metrics. Never add commentary or preamble to your output.`,
    });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: `Apply ${isSingle ? "this improvement" : "all of these improvements"} to the resume below. Each must be fully addressed — make the changes count.
${jobContext}
${isSingle ? "IMPROVEMENT TO APPLY:" : "IMPROVEMENTS TO APPLY:"}
${improvementList}

CURRENT RESUME:
${resume.slice(0, 4500)}

RULES:
- Fully address every improvement listed — don't make superficial edits
- Only change sections relevant to each improvement; leave the rest exactly as-is
- Keep the same formatting structure and section order
- Mirror exact keyword phrases from the job description where relevant
- Never fabricate names, companies, dates, titles, or metrics
- Return ONLY the complete updated resume text — no commentary` }],
        },
      ],
      generationConfig: { maxOutputTokens: 4096 },
    });

    const result2 = result.response.text();
    return NextResponse.json({ result: result2 });
  } catch (err: unknown) {
    return handleAiError(err);
  }
}
