import { count, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../db";
import {
  companies,
  rawItems,
  riskAssessments,
  riskEvidence,
  riskSubscores,
  runs,
  runSteps,
  signals,
} from "../db/schema";
import { RUBRIC, type Dimension } from "../scoring/rubric";
import {
  assessCompany,
  RISK_MODEL,
  RISK_PROMPT_VERSION,
  type ScoringSignal,
} from "../scoring/score";
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
  assessmentsCreated: number;
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
    const createdSignals: ScoringSignal[] = [];
    const tickersTouched = new Map<string, ScoringSignal[]>();

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
      const signalId = nextId("sig", signalCount);
      db.insert(signals)
        .values({
          id: signalId,
          rawItemId: item.id,
          runId,
          ...classification,
          createdAt: nowIso(),
        })
        .run();
      signalCount += 1;
      created += 1;
      const scoringSignal: ScoringSignal = {
        id: signalId,
        type: classification.type,
        urgency: classification.urgency,
        relevance: classification.relevance,
        confidence: classification.confidence,
        headline: item.title,
        snippet: item.snippet,
      };
      createdSignals.push(scoringSignal);
      const list = tickersTouched.get(classification.ticker) ?? [];
      list.push(scoringSignal);
      tickersTouched.set(classification.ticker, list);
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

    // Step 3: rescore companies that received new signals.
    const scoreStarted = nowIso();
    let assessmentCount =
      db.select({ n: count() }).from(riskAssessments).get()?.n ?? 0;
    let assessmentsCreated = 0;

    for (const [ticker, tickerSignals] of tickersTouched) {
      const company = db
        .select()
        .from(companies)
        .where(eq(companies.ticker, ticker))
        .get();
      if (!company) continue;

      const previous = db
        .select()
        .from(riskAssessments)
        .where(eq(riskAssessments.ticker, ticker))
        .orderBy(desc(riskAssessments.createdAt))
        .limit(1)
        .get();
      const previousSubscores: Partial<Record<Dimension, number>> = {};
      if (previous) {
        for (const row of db
          .select()
          .from(riskSubscores)
          .where(eq(riskSubscores.assessmentId, previous.id))
          .all()) {
          previousSubscores[row.dimension as Dimension] = row.score;
        }
      }

      const result = assessCompany({
        baseline: company.baselineRisk,
        previousComposite: previous?.composite ?? null,
        previousSubscores: previous ? previousSubscores : null,
        signals: tickerSignals,
      });

      const assessmentId = nextId("ra", assessmentCount);
      db.insert(riskAssessments)
        .values({
          id: assessmentId,
          ticker,
          runId,
          rubricVersion: RUBRIC.version,
          model: RISK_MODEL,
          promptVersion: RISK_PROMPT_VERSION,
          composite: result.composite,
          previous: result.previous,
          summary: result.summary,
          createdAt: nowIso(),
        })
        .run();
      assessmentCount += 1;
      assessmentsCreated += 1;

      for (const subscore of result.subscores) {
        const inserted = db
          .insert(riskSubscores)
          .values({
            assessmentId,
            dimension: subscore.dimension,
            score: subscore.score,
            baseline: subscore.baseline,
            confidence: subscore.confidence,
            rationale: subscore.rationale,
          })
          .run();
        if (subscore.evidence.length > 0) {
          db.insert(riskEvidence)
            .values(
              subscore.evidence.map((item) => ({
                subscoreId: Number(inserted.lastInsertRowid),
                signalId: item.signalId,
                quote: item.quote,
                delta: item.delta,
              })),
            )
            .run();
        }
      }
    }

    db.insert(runSteps)
      .values({
        id: `${runId}:score`,
        runId,
        name: "score",
        status: "completed",
        startedAt: scoreStarted,
        finishedAt: nowIso(),
        model: RISK_MODEL,
        promptVersion: RISK_PROMPT_VERSION,
        inputCount: createdSignals.length,
        outputCount: assessmentsCreated,
        costUsd: 0,
        detail:
          assessmentsCreated > 0
            ? `Rescored ${assessmentsCreated} companies with rubric ${RUBRIC.version}.`
            : "No companies to rescore.",
      })
      .run();

    const note =
      pending.length === 0
        ? "No new raw items to triage."
        : `Triaged ${pending.length} raw items into ${created} signals` +
          (skipped > 0 ? ` (${skipped} skipped: no watchlist match)` : "") +
          (assessmentsCreated > 0
            ? `. Updated ${assessmentsCreated} risk scores.`
            : ".");

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
      assessmentsCreated,
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
      assessmentsCreated: 0,
      note: message,
    };
  }
}
