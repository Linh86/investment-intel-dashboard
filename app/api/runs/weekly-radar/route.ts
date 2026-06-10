import { NextResponse } from "next/server";
import {
  runWeeklyRadar,
  type RunTrigger,
} from "@/lib/pipeline/weekly-radar";

const TRIGGERS: RunTrigger[] = ["manual", "cron", "webhook"];

export async function POST(request: Request) {
  let trigger: RunTrigger = "webhook";
  try {
    const body = await request.json();
    if (TRIGGERS.includes(body?.trigger)) {
      trigger = body.trigger;
    }
  } catch {
    // No/invalid JSON body: keep the webhook default.
  }

  try {
    const result = runWeeklyRadar(trigger);
    return NextResponse.json(result, {
      status: result.status === "failed" ? 500 : 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 501 });
  }
}
