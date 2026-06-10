import { NextResponse } from "next/server";
import { generateBrief } from "@/lib/briefing/generate";

export async function POST(request: Request) {
  let segmentId: string | null = null;
  try {
    const body = await request.json();
    if (typeof body?.segmentId === "string" && body.segmentId.length > 0) {
      segmentId = body.segmentId;
    }
  } catch {
    // No/invalid JSON body: handled by the missing-segmentId check below.
  }
  if (!segmentId) {
    return NextResponse.json(
      { error: "segmentId is required" },
      { status: 400 },
    );
  }

  try {
    const result = generateBrief({ segmentId, now: new Date() });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message },
      { status: message.startsWith("Live LLM mode") ? 501 : 409 },
    );
  }
}
