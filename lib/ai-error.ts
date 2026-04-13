import { NextResponse } from "next/server";

/**
 * Parses an AI API error (Groq or any LLM) and returns a NextResponse with a
 * user-friendly message. Call this from every AI route's outer catch block.
 */
export function handleAiError(err: unknown): NextResponse {
  const status = (err as { status?: number })?.status;
  const message = err instanceof Error ? err.message : String(err);

  console.error("AI route error — status=%s message=%s", status ?? "none", message);

  // 429 — quota / rate limit
  if (status === 429 || message.includes("quota") || message.includes("rate_limit") || message.includes("Rate limit")) {
    const waitMatch = message.match(/try again in ([^.]+)/i);
    const wait = waitMatch ? ` Try again in ${waitMatch[1]}.` : " Please try again later.";
    return NextResponse.json(
      { error: `You've reached the AI usage limit.${wait} If you need more capacity, check your Groq plan.` },
      { status: 429 }
    );
  }

  // 503 / 500 — model overloaded
  if (status === 503 || status === 500) {
    return NextResponse.json(
      { error: "The AI model is temporarily overloaded. Please wait a moment and try again." },
      { status: 503 }
    );
  }

  // 401 — bad API key
  if (status === 401) {
    return NextResponse.json(
      { error: "AI service authentication failed. Please check your GROQ_API_KEY." },
      { status: 500 }
    );
  }

  // 403 — key lacks permission
  if (status === 403) {
    return NextResponse.json(
      { error: "Your API key does not have access to this model. Check your plan at console.groq.com." },
      { status: 500 }
    );
  }

  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
