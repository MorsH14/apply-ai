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

    const prompt = `You are an expert resume writer and career coach. Tailor the following resume for this specific job opportunity.

Job: ${position} at ${company}

Job Description:
${jobDescription}

Current Resume:
${resume}

Instructions:
- Keep the same factual content (don't invent experience)
- Reorder and emphasize skills/experiences that match the job requirements
- Incorporate relevant keywords from the job description naturally
- Keep it ATS-friendly and concise
- Return ONLY the tailored resume text, no commentary or preamble`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return NextResponse.json({ result: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Gemini tailor error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
