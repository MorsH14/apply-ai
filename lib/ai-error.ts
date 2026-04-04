import { NextResponse } from "next/server";

/**
 * Parses a Groq (or any LLM) API error and returns a NextResponse with a
 * user-friendly message. Call this from every AI route's outer catch block.
 */
export function handleAiError(err: unknown): NextResponse {
  const status = (err as { status?: number })?.status;
  const message = err instanceof Error ? err.message : String(err);

  // Groq 429 — daily / per-minute token limit
  if (status === 429 || message.includes("rate_limit_exceeded") || message.includes("Rate limit")) {
    // Try to extract "try again in Xm" from the message
    const waitMatch = message.match(/try again in ([^.]+)/i);
    const wait = waitMatch ? ` Try again in ${waitMatch[1]}.` : " Please try again later.";
    return NextResponse.json(
      { error: `You've reached the daily AI usage limit.${wait} If you need more capacity, upgrade your Groq plan at console.groq.com/settings/billing.` },
      { status: 429 }
    );
  }

  // Groq 503 / 500 — model overloaded
  if (status === 503 || status === 500) {
    return NextResponse.json(
      { error: "The AI model is temporarily overloaded. Please wait a moment and try again." },
      { status: 503 }
    );
  }

  // Groq 401 — bad API key
  if (status === 401) {
    return NextResponse.json(
      { error: "AI service authentication failed. Please check your GROQ_API_KEY." },
      { status: 500 }
    );
  }

  // Generic fallback
  console.error("AI route error:", message);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
