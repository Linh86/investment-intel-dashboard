import fs from "node:fs";
import path from "node:path";
import { and, count, eq } from "drizzle-orm";
import { getDb } from "../db";
import { artifacts, runs, runSteps } from "../db/schema";
import {
  draftRadar,
  RADAR_MODEL,
  RADAR_PROMPT_VERSION,
  type AiNewsItem,
} from "../drafting/radar";

export type RunTrigger = "manual" | "cron" | "webhook";

export interface WeeklyRadarResult {
  runId: string;
  status: "completed" | "failed";
  itemsCollected: number;
  drafted: 0 | 1;
  note: string;
}

interface AiNewsFixture {
  items: AiNewsItem[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function nextId(prefix: string, existing: number): string {
  return `${prefix}-${String(existing + 1).padStart(4, "0")}`;
}

function readAiNewsFixture(): AiNewsItem[] {
  const file = path.join(process.cwd(), "data", "fixtures", "ai-news.json");
  return (JSON.parse(fs.readFileSync(file, "utf8")) as AiNewsFixture).items;
}

export function runWeeklyRadar(trigger: RunTrigger): WeeklyRadarResult {
  if (process.env.DEMO_MODE === "false") {
    throw new Error(
      "Live LLM mode is not implemented yet. Leave DEMO_MODE unset or set DEMO_MODE=true.",
    );
  }

  const db = getDb();
  const runCount = db.select({ n: count() }).from(runs).get()?.n ?? 0;
  const runId = nextId("run", runCount);

  db.insert(runs)
    .values({
      id: runId,
      trigger,
      kind: "weekly-radar",
      status: "running",
      startedAt: nowIso(),
    })
    .run();

  try {
    // Step 1: collect the external AI-news fixture feed.
    const collectStarted = nowIso();
    const items = readAiNewsFixture();

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
        inputCount: items.length,
        outputCount: items.length,
        detail: `Read ${items.length} AI-news items from the synthetic fixture feed.`,
      })
      .run();

    // Step 2: curate one radar draft, unless one is already awaiting review.
    const curateStarted = nowIso();
    const pendingRadar = db
      .select({ id: artifacts.id })
      .from(artifacts)
      .where(and(eq(artifacts.type, "radar"), eq(artifacts.status, "pending")))
      .get();

    let drafted: 0 | 1 = 0;
    let note: string;
    if (pendingRadar) {
      note = "A radar draft is already awaiting review.";
    } else {
      const content = draftRadar(items, new Date());
      const artifactCount =
        db.select({ n: count() }).from(artifacts).get()?.n ?? 0;
      db.insert(artifacts)
        .values({
          id: nextId("art", artifactCount),
          type: "radar",
          ticker: null,
          runId,
          status: "pending",
          title: `AI Radar — ${content.period}`,
          contentJson: JSON.stringify(content),
          model: RADAR_MODEL,
          promptVersion: RADAR_PROMPT_VERSION,
          createdAt: nowIso(),
        })
        .run();
      drafted = 1;
      note = `Curated ${items.length} AI-news items into a radar draft for review.`;
    }

    db.insert(runSteps)
      .values({
        id: `${runId}:curate`,
        runId,
        name: "curate",
        status: "completed",
        startedAt: curateStarted,
        finishedAt: nowIso(),
        model: RADAR_MODEL,
        promptVersion: RADAR_PROMPT_VERSION,
        inputCount: items.length,
        outputCount: drafted,
        costUsd: 0,
        detail: pendingRadar
          ? `Skipped drafting: ${pendingRadar.id} is already awaiting review.`
          : "Categorized items by keyword and drafted one radar artifact.",
      })
      .run();

    db.update(runs)
      .set({ status: "completed", finishedAt: nowIso(), note })
      .where(eq(runs.id, runId))
      .run();

    return {
      runId,
      status: "completed",
      itemsCollected: items.length,
      drafted,
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
      itemsCollected: 0,
      drafted: 0,
      note: message,
    };
  }
}
