import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  const { jobDescription, resume, company, position } = await request.json();

  if (!process.env.GOOGLE_AI_API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_AI_API_KEY is not set in .env.local" },
      { status: 500 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel(
      { model: "gemini-1.5-flash" },
      { apiVersion: "v1" }
    );

    const prompt = `Write a compelling, personalized cover letter for this job application.

Job: ${position} at ${company}

Job Description:
${jobDescription}

My Background (from resume):
${resume}

Instructions:
- Professional but personable tone
- 3-4 short paragraphs
- Connect my specific experience to their specific needs
- Show genuine enthusiasm for the role and company
- Strong opening hook — do NOT start with "I am writing to apply..."
- End with a confident call to action
- Return ONLY the cover letter, no subject line or commentary`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return NextResponse.json({ result: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Gemini cover letter error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
