import { and, count, desc, eq, sum } from "drizzle-orm";
import { getDb } from "./db";
import {
  approvals,
  artifacts as artifactsTable,
  clientSegments,
  companies as companiesTable,
  deliveryLog,
  investorBriefs,
  rawItems,
  riskAssessments,
  riskEvidence,
  riskSubscores,
  runs as runsTable,
  runSteps,
  signals as signalsTable,
} from "./db/schema";
import type { Company, RunRecord, Signal } from "./types";

export type ArtifactStatus = "pending" | "approved" | "rejected";
export type ArtifactType = "memo" | "crm-draft" | "radar";

export interface ArtifactView {
  id: string;
  type: ArtifactType;
  ticker: string | null;
  runId: string;
  status: ArtifactStatus;
  title: string;
  contentJson: string;
  model: string;
  promptVersion: string;
  createdAt: string;
  approval: {
    decision: string;
    reviewer: string;
    note: string | null;
    decidedAt: string;
  } | null;
}

function toArtifactView(
  row: typeof artifactsTable.$inferSelect,
  approvalRows: (typeof approvals.$inferSelect)[],
): ArtifactView {
  const approval = approvalRows.find((a) => a.artifactId === row.id);
  return {
    id: row.id,
    type: row.type as ArtifactType,
    ticker: row.ticker,
    runId: row.runId,
    status: row.status as ArtifactStatus,
    title: row.title,
    contentJson: row.contentJson,
    model: row.model,
    promptVersion: row.promptVersion,
    createdAt: row.createdAt,
    approval: approval
      ? {
          decision: approval.decision,
          reviewer: approval.reviewer,
          note: approval.note,
          decidedAt: approval.decidedAt,
        }
      : null,
  };
}

export function getArtifacts(filter?: {
  status?: ArtifactStatus;
  type?: ArtifactType;
}): ArtifactView[] {
  const db = getDb();
  let rows = db
    .select()
    .from(artifactsTable)
    .orderBy(desc(artifactsTable.createdAt))
    .all();
  if (filter?.status) rows = rows.filter((r) => r.status === filter.status);
  if (filter?.type) rows = rows.filter((r) => r.type === filter.type);
  const approvalRows = db.select().from(approvals).all();
  return rows.map((row) => toArtifactView(row, approvalRows));
}

export function getArtifact(id: string): ArtifactView | null {
  const db = getDb();
  const row = db
    .select()
    .from(artifactsTable)
    .where(eq(artifactsTable.id, id))
    .get();
  if (!row) return null;
  return toArtifactView(row, db.select().from(approvals).all());
}

export function getPendingArtifactCount(): number {
  return (
    getDb()
      .select({ n: count() })
      .from(artifactsTable)
      .where(eq(artifactsTable.status, "pending"))
      .get()?.n ?? 0
  );
}

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

export type BriefStatus = "draft" | "published" | "rejected";

export interface BriefView {
  id: string;
  segmentId: string;
  segmentName: string;
  period: string;
  status: BriefStatus;
  version: number;
  supersedesId: string | null;
  sectionsJson: string;
  disclosureVersions: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
}

const briefSelection = {
  id: investorBriefs.id,
  segmentId: investorBriefs.segmentId,
  segmentName: clientSegments.name,
  period: investorBriefs.period,
  status: investorBriefs.status,
  version: investorBriefs.version,
  supersedesId: investorBriefs.supersedesId,
  sectionsJson: investorBriefs.sectionsJson,
  disclosureVersions: investorBriefs.disclosureVersions,
  publishedAt: investorBriefs.publishedAt,
  publishedBy: investorBriefs.publishedBy,
  reviewedBy: investorBriefs.reviewedBy,
  reviewNote: investorBriefs.reviewNote,
  createdAt: investorBriefs.createdAt,
};

function toBriefView(
  row: Omit<BriefView, "status"> & { status: string },
): BriefView {
  return { ...row, status: row.status as BriefStatus };
}

export function getSegments() {
  return getDb()
    .select()
    .from(clientSegments)
    .orderBy(clientSegments.id)
    .all();
}

export function getBriefs(): BriefView[] {
  return getDb()
    .select(briefSelection)
    .from(investorBriefs)
    .innerJoin(clientSegments, eq(investorBriefs.segmentId, clientSegments.id))
    .orderBy(desc(investorBriefs.createdAt), desc(investorBriefs.id))
    .all()
    .map(toBriefView);
}

export function getBrief(id: string): BriefView | null {
  const row = getDb()
    .select(briefSelection)
    .from(investorBriefs)
    .innerJoin(clientSegments, eq(investorBriefs.segmentId, clientSegments.id))
    .where(eq(investorBriefs.id, id))
    .get();
  return row ? toBriefView(row) : null;
}

// The client surface reads ONLY through this: published briefs, nothing else.
export function getLatestPublishedBrief(segmentId: string): BriefView | null {
  const row = getDb()
    .select(briefSelection)
    .from(investorBriefs)
    .innerJoin(clientSegments, eq(investorBriefs.segmentId, clientSegments.id))
    .where(
      and(
        eq(investorBriefs.segmentId, segmentId),
        eq(investorBriefs.status, "published"),
      ),
    )
    .orderBy(desc(investorBriefs.publishedAt))
    .limit(1)
    .get();
  return row ? toBriefView(row) : null;
}

export function getDeliveryLog(briefId: string) {
  return getDb()
    .select()
    .from(deliveryLog)
    .where(eq(deliveryLog.briefId, briefId))
    .orderBy(desc(deliveryLog.deliveredAt))
    .all();
}
