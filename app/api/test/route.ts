import connectDB from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({ status: "Test connected" });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      {
        status: "error",
        message: err.message,
        details: "Failed to connect to the database",
      },
      { status: 500 },
    );
  }
}
