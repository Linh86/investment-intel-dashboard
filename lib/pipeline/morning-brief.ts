import { count, eq, isNull } from "drizzle-orm";
import { getDb } from "../db";
import { companies, rawItems, runs, runSteps, signals } from "../db/schema";
import {
  classifyRawItem,
  TRIAGE_MODEL,
  TRIAGE_PROMPT_VERSION,
} from "./triage";

export type RunTrigger = "manual" | "cron" | "webhook";

export interface MorningBriefResult {
  runId: string;
  status: "completed" | "failed";
  itemsPending: number;
  signalsCreated: number;
  skipped: number;
  note: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function nextId(prefix: string, existing: number): string {
  return `${prefix}-${String(existing + 1).padStart(4, "0")}`;
}

export function runMorningBrief(trigger: RunTrigger): MorningBriefResult {
  if (process.env.DEMO_MODE === "false") {
    throw new Error(
      "Live LLM mode is not implemented yet (arrives with M2). Leave DEMO_MODE unset or set DEMO_MODE=true.",
    );
  }

  const db = getDb();
  const runCount = db.select({ n: count() }).from(runs).get()?.n ?? 0;
  const runId = nextId("run", runCount);

  db.insert(runs)
    .values({
      id: runId,
      trigger,
      kind: "morning-brief",
      status: "running",
      startedAt: nowIso(),
    })
    .run();

  try {
    // Step 1: collect raw items that no signal references yet.
    const collectStarted = nowIso();
    const pending = db
      .select({
        id: rawItems.id,
        title: rawItems.title,
        snippet: rawItems.snippet,
      })
      .from(rawItems)
      .where(isNull(rawItems.triagedAt))
      .all();

    db.insert(runSteps)
      .values({
        id: `${runId}:collect`,
        runId,
        name: "collect",
        status: "completed",
        startedAt: collectStarted,
        finishedAt: nowIso(),
        model: "none",
        promptVersion: "n/a",
        inputCount: pending.length,
        outputCount: pending.length,
        detail: `Found ${pending.length} untriaged raw items.`,
      })
      .run();

    // Step 2: triage each pending item into a structured signal.
    const triageStarted = nowIso();
    const tickers = db
      .select({ ticker: companies.ticker })
      .from(companies)
      .all()
      .map((row) => row.ticker);
    let signalCount = db.select({ n: count() }).from(signals).get()?.n ?? 0;
    let created = 0;
    let skipped = 0;

    for (const item of pending) {
      const classification = classifyRawItem(item, tickers);
      db.update(rawItems)
        .set({ triagedAt: nowIso() })
        .where(eq(rawItems.id, item.id))
        .run();
      if (!classification) {
        skipped += 1;
        continue;
      }
      db.insert(signals)
        .values({
          id: nextId("sig", signalCount),
          rawItemId: item.id,
          runId,
          ...classification,
          createdAt: nowIso(),
        })
        .run();
      signalCount += 1;
      created += 1;
    }

    db.insert(runSteps)
      .values({
        id: `${runId}:triage`,
        runId,
        name: "triage",
        status: "completed",
        startedAt: triageStarted,
        finishedAt: nowIso(),
        model: TRIAGE_MODEL,
        promptVersion: TRIAGE_PROMPT_VERSION,
        inputCount: pending.length,
        outputCount: created,
        costUsd: 0,
        detail:
          skipped > 0
            ? `Skipped ${skipped} item(s) with no watchlist match.`
            : "All items matched the watchlist.",
      })
      .run();

    const note =
      pending.length === 0
        ? "No new raw items to triage."
        : `Triaged ${pending.length} raw items into ${created} signals` +
          (skipped > 0 ? ` (${skipped} skipped: no watchlist match).` : ".");

    db.update(runs)
      .set({ status: "completed", finishedAt: nowIso(), note })
      .where(eq(runs.id, runId))
      .run();

    return {
      runId,
      status: "completed",
      itemsPending: pending.length,
      signalsCreated: created,
      skipped,
      note,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    db.update(runs)
      .set({ status: "failed", finishedAt: nowIso(), error: message })
      .where(eq(runs.id, runId))
      .run();
    return {
      runId,
      status: "failed",
      itemsPending: 0,
      signalsCreated: 0,
      skipped: 0,
      note: message,
    };
  }
}
