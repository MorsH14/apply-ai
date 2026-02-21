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
          content: `Write a compelling, personalized cover letter for this job application.

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
- Return ONLY the cover letter, no subject line or commentary`,
        },
      ],
      max_tokens: 1024,
    });

    const text = completion.choices[0].message.content ?? "";
    return NextResponse.json({ result: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Groq cover letter error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
