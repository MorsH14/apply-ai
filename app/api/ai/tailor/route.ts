import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(request: Request) {
  const { jobDescription, resume, company, position } = await request.json();

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not set in .env.local" },
      { status: 500 }
    );
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: `You are an expert resume writer and career coach. Tailor the following resume for this specific job opportunity.

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
- Return ONLY the tailored resume text, no commentary or preamble`,
        },
      ],
      max_tokens: 2048,
    });

    const text = completion.choices[0].message.content ?? "";
    return NextResponse.json({ result: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Groq tailor error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
