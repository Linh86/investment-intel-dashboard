import { count, desc, eq, sum } from "drizzle-orm";
import { getDb } from "./db";
import {
  companies as companiesTable,
  rawItems,
  riskAssessments,
  riskEvidence,
  riskSubscores,
  runs as runsTable,
  runSteps,
  signals as signalsTable,
} from "./db/schema";
import type { Company, RunRecord, Signal } from "./types";

export interface CompanyRisk {
  /** Latest assessed composite, falling back to the seeded baseline. */
  current: number;
  delta: number | null;
  assessed: boolean;
}

export interface CompanyWithRisk {
  company: Company;
  risk: CompanyRisk;
}

export function getWatchlist(): CompanyWithRisk[] {
  const db = getDb();
  const companyRows = db.select().from(companiesTable).all() as Company[];
  const assessments = db
    .select()
    .from(riskAssessments)
    .orderBy(desc(riskAssessments.createdAt))
    .all();
  const latestByTicker = new Map<string, (typeof assessments)[number]>();
  for (const assessment of assessments) {
    if (!latestByTicker.has(assessment.ticker)) {
      latestByTicker.set(assessment.ticker, assessment);
    }
  }
  return companyRows.map((company) => {
    const latest = latestByTicker.get(company.ticker);
    return {
      company,
      risk: latest
        ? {
            current: latest.composite,
            delta:
              latest.composite - (latest.previous ?? company.baselineRisk),
            assessed: true,
          }
        : { current: company.baselineRisk, delta: null, assessed: false },
    };
  });
}

export interface EvidenceView {
  signalId: string;
  quote: string;
  delta: number;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
}

export interface SubscoreView {
  dimension: string;
  baseline: number;
  score: number;
  confidence: number;
  rationale: string;
  evidence: EvidenceView[];
}

export interface AssessmentView {
  id: string;
  runId: string;
  rubricVersion: string;
  model: string;
  promptVersion: string;
  composite: number;
  previous: number | null;
  summary: string;
  createdAt: string;
}

export interface CompanyDetail {
  company: Company;
  latest: (AssessmentView & { subscores: SubscoreView[] }) | null;
  history: AssessmentView[];
  signals: Signal[];
}

export function getCompanyDetail(ticker: string): CompanyDetail | null {
  const db = getDb();
  const company = db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.ticker, ticker))
    .get() as Company | undefined;
  if (!company) return null;

  const history = db
    .select()
    .from(riskAssessments)
    .where(eq(riskAssessments.ticker, ticker))
    .orderBy(desc(riskAssessments.createdAt))
    .all();

  let latest: CompanyDetail["latest"] = null;
  if (history.length > 0) {
    const head = history[0];
    const subscoreRows = db
      .select()
      .from(riskSubscores)
      .where(eq(riskSubscores.assessmentId, head.id))
      .all();
    const evidenceRows = db
      .select({
        subscoreId: riskEvidence.subscoreId,
        signalId: riskEvidence.signalId,
        quote: riskEvidence.quote,
        delta: riskEvidence.delta,
        sourceName: rawItems.sourceName,
        sourceUrl: rawItems.sourceUrl,
        publishedAt: rawItems.publishedAt,
      })
      .from(riskEvidence)
      .innerJoin(riskSubscores, eq(riskEvidence.subscoreId, riskSubscores.id))
      .innerJoin(signalsTable, eq(riskEvidence.signalId, signalsTable.id))
      .innerJoin(rawItems, eq(signalsTable.rawItemId, rawItems.id))
      .where(eq(riskSubscores.assessmentId, head.id))
      .all();

    latest = {
      ...head,
      subscores: subscoreRows.map((subscore) => ({
        dimension: subscore.dimension,
        baseline: subscore.baseline,
        score: subscore.score,
        confidence: subscore.confidence,
        rationale: subscore.rationale,
        evidence: evidenceRows
          .filter((row) => row.subscoreId === subscore.id)
          .map((row) => ({
            signalId: row.signalId,
            quote: row.quote,
            delta: row.delta,
            sourceName: row.sourceName,
            sourceUrl: row.sourceUrl,
            publishedAt: row.publishedAt,
          })),
      })),
    };
  }

  return {
    company,
    latest,
    history,
    signals: getSignals().filter((signal) => signal.ticker === ticker),
  };
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
