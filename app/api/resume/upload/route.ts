import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const fileName = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  let text = "";

  try {
    if (fileName.endsWith(".pdf")) {
      // Dynamically import to avoid edge runtime issues
      // pdf-parse exports differently depending on module resolution
      const pdfMod = await import("pdf-parse");
      const pdfParse = (pdfMod as unknown as { default: (buf: Buffer) => Promise<{ text: string }> }).default ?? pdfMod;
      const result = await (pdfParse as (buf: Buffer) => Promise<{ text: string }>)(buffer);
      text = result.text;
    } else if (fileName.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (fileName.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF, DOCX, or TXT file." },
        { status: 400 }
      );
    }

    // Clean up extracted text: remove excessive blank lines
    text = text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!text) {
      return NextResponse.json(
        { error: "Could not extract text from this file. Try copying and pasting your resume instead." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (err) {
    console.error("Resume parse error:", err);
    return NextResponse.json(
      { error: "Failed to parse the file. Try a different format or paste your resume as text." },
      { status: 500 }
    );
  }
}
