import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await request.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY is not set" }, { status: 500 });
  }

  // Fetch via Jina Reader — renders JS-heavy ATS pages (Ashby, Zoho, Workday, Greenhouse, etc.)
  let text: string;
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        "X-Return-Format": "markdown",
        "X-Timeout": "15",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Could not read that job listing (HTTP ${res.status}). Check the URL and try again.` },
        { status: 400 }
      );
    }

    text = (await res.text()).slice(0, 10000);
  } catch (fetchErr: unknown) {
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    console.error("Jina fetch error:", msg);
    return NextResponse.json(
      { error: "Could not reach the job listing. Check your internet connection and try again." },
      { status: 502 }
    );
  }

  if (text.trim().length < 200) {
    return NextResponse.json(
      { error: "The page didn't return enough content. Make sure the URL is a specific job listing page, not a search results page." },
      { status: 422 }
    );
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a data extraction assistant. Extract structured job listing information from webpage content. Return ONLY valid JSON with no commentary.",
        },
        {
          role: "user",
          content: `Extract job listing details from the content below. Return a JSON object with exactly these fields:
{
  "company": "company name or empty string",
  "position": "job title or empty string",
  "location": "location (city, remote, hybrid, etc.) or empty string",
  "salary": "salary or compensation range or empty string",
  "jobDescription": "full job description — all responsibilities, requirements, and qualifications"
}

If a field is not present, return an empty string. Never fabricate data.

PAGE CONTENT:
${text}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2048,
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    const data = JSON.parse(raw);

    if (!data.jobDescription || data.jobDescription.trim().length < 50) {
      return NextResponse.json(
        { error: "Couldn't find a job description on that page. Make sure the URL points to a specific job listing." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      company: data.company ?? "",
      position: data.position ?? "",
      location: data.location ?? "",
      salary: data.salary ?? "",
      jobDescription: data.jobDescription ?? "",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Groq extraction error:", msg);
    return NextResponse.json({ error: "Failed to extract job details. Try again." }, { status: 500 });
  }
}
