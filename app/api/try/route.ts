import { NextResponse } from "next/server";
import { getWatchlist } from "@/lib/data";
import { analyzeHeadline } from "@/lib/llm/analyze";
import { CLAUDE_CLI_MODEL, llmEnabled } from "@/lib/llm/claude";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!llmEnabled()) {
    return NextResponse.json(
      {
        enabled: false,
        hint: "Live analysis is off. Restart the dev server with LLM_PROVIDER=claude-cli to use your Claude Code session.",
      },
      { status: 200 },
    );
  }

  let headline = "";
  let detail = "";
  try {
    const body = await request.json();
    headline = String(body?.headline ?? "").trim();
    detail = String(body?.detail ?? "").trim();
  } catch {
    // fall through to validation below
  }
  if (!headline) {
    return NextResponse.json({ error: "headline is required" }, { status: 400 });
  }

  try {
    const companies = getWatchlist().map(({ company }) => ({
      ticker: company.ticker,
      name: company.name,
    }));
    const analysis = await analyzeHeadline({ headline, detail, companies });
    return NextResponse.json({ enabled: true, model: CLAUDE_CLI_MODEL, analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ enabled: true, error: message }, { status: 502 });
  }
}
