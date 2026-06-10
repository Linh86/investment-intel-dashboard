import { count, desc, eq, sum } from "drizzle-orm";
import { getDb } from "./db";
import {
  companies as companiesTable,
  rawItems,
  runs as runsTable,
  runSteps,
  signals as signalsTable,
} from "./db/schema";
import type { Company, RunRecord, Signal } from "./types";

export function getCompanies(): Company[] {
  return getDb().select().from(companiesTable).all() as Company[];
}

export function getSignals(): Signal[] {
  const rows = getDb()
    .select({
      id: signalsTable.id,
      ticker: signalsTable.ticker,
      type: signalsTable.type,
      urgency: signalsTable.urgency,
      relevance: signalsTable.relevance,
      headline: rawItems.title,
      summary: rawItems.snippet,
      sourceName: rawItems.sourceName,
      sourceUrl: rawItems.sourceUrl,
      publishedAt: rawItems.publishedAt,
    })
    .from(signalsTable)
    .innerJoin(rawItems, eq(signalsTable.rawItemId, rawItems.id))
    .orderBy(desc(rawItems.publishedAt))
    .all();

  return rows.map((row) => ({
    id: row.id,
    ticker: row.ticker,
    headline: row.headline,
    summary: row.summary,
    type: row.type,
    urgency: row.urgency,
    relevance: row.relevance,
    source: { name: row.sourceName, url: row.sourceUrl },
    publishedAt: row.publishedAt,
  })) as Signal[];
}

export function getRuns(): RunRecord[] {
  const db = getDb();
  const runRows = db
    .select()
    .from(runsTable)
    .orderBy(desc(runsTable.startedAt))
    .all();
  const signalCounts = new Map(
    db
      .select({ runId: signalsTable.runId, n: count() })
      .from(signalsTable)
      .groupBy(signalsTable.runId)
      .all()
      .map((row) => [row.runId, row.n]),
  );
  const stepCosts = new Map(
    db
      .select({ runId: runSteps.runId, cost: sum(runSteps.costUsd) })
      .from(runSteps)
      .groupBy(runSteps.runId)
      .all()
      .map((row) => [row.runId, Number(row.cost ?? 0)]),
  );

  return runRows.map((run) => ({
    id: run.id,
    trigger: run.trigger,
    status: run.status as RunRecord["status"],
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    signalsIngested: signalCounts.get(run.id) ?? 0,
    costUsd: stepCosts.get(run.id) ?? 0,
    note: run.note ?? run.error ?? "",
  }));
}

export function signalsForCompany(signals: Signal[], ticker: string): Signal[] {
  return signals.filter((signal) => signal.ticker === ticker);
}

export function latestSignalFor(
  signals: Signal[],
  ticker: string,
): Signal | undefined {
  return signalsForCompany(signals, ticker)[0];
}
