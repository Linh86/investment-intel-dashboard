import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const companies = sqliteTable("companies", {
  ticker: text("ticker").primaryKey(),
  name: text("name").notNull(),
  sector: text("sector").notNull(),
  subSector: text("sub_sector").notNull(),
  country: text("country").notNull(),
  watchReason: text("watch_reason").notNull(),
  baselineRisk: integer("baseline_risk").notNull(),
  addedAt: text("added_at").notNull(),
});

// Public source metadata only: title, snippet, URL, hash. Never full bodies.
export const rawItems = sqliteTable("raw_items", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  snippet: text("snippet").notNull(),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url").notNull(),
  publishedAt: text("published_at").notNull(),
  hash: text("hash").notNull().unique(),
  createdAt: text("created_at").notNull(),
  // Set once the triage step has processed the item (matched or skipped),
  // so each raw item is triaged exactly once.
  triagedAt: text("triaged_at"),
});

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),
  trigger: text("trigger").notNull(), // manual | cron | webhook
  kind: text("kind").notNull(),
  status: text("status").notNull(), // running | completed | failed
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  note: text("note"),
  error: text("error"),
});

export const runSteps = sqliteTable("run_steps", {
  id: text("id").primaryKey(), // `${runId}:${name}`
  runId: text("run_id")
    .notNull()
    .references(() => runs.id),
  name: text("name").notNull(), // collect | triage | ...
  status: text("status").notNull(),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  inputCount: integer("input_count").notNull().default(0),
  outputCount: integer("output_count").notNull().default(0),
  tokensIn: integer("tokens_in").notNull().default(0),
  tokensOut: integer("tokens_out").notNull().default(0),
  costUsd: real("cost_usd").notNull().default(0),
  detail: text("detail"),
});

export const signals = sqliteTable("signals", {
  id: text("id").primaryKey(),
  rawItemId: text("raw_item_id")
    .notNull()
    .references(() => rawItems.id),
  runId: text("run_id").references(() => runs.id),
  ticker: text("ticker")
    .notNull()
    .references(() => companies.ticker),
  type: text("type").notNull(), // news | filing | regulatory | analyst | supply-chain
  urgency: text("urgency").notNull(), // high | medium | low
  relevance: text("relevance").notNull(), // high | medium | low
  confidence: real("confidence").notNull(),
  rationale: text("rationale").notNull(),
  createdAt: text("created_at").notNull(),
});

// One risk assessment per company per scoring run; doubles as score history.
export const riskAssessments = sqliteTable("risk_assessments", {
  id: text("id").primaryKey(),
  ticker: text("ticker")
    .notNull()
    .references(() => companies.ticker),
  runId: text("run_id")
    .notNull()
    .references(() => runs.id),
  rubricVersion: text("rubric_version").notNull(),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  composite: integer("composite").notNull(),
  previous: integer("previous"),
  summary: text("summary").notNull(),
  createdAt: text("created_at").notNull(),
});

export const riskSubscores = sqliteTable("risk_subscores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assessmentId: text("assessment_id")
    .notNull()
    .references(() => riskAssessments.id),
  dimension: text("dimension").notNull(), // market | execution | regulatory | supply-chain | financial
  score: integer("score").notNull(),
  baseline: integer("baseline").notNull(),
  confidence: real("confidence").notNull(),
  rationale: text("rationale").notNull(),
});

// Provenance: which signals moved a subscore, with the quoted source headline.
export const riskEvidence = sqliteTable("risk_evidence", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subscoreId: integer("subscore_id")
    .notNull()
    .references(() => riskSubscores.id),
  signalId: text("signal_id")
    .notNull()
    .references(() => signals.id),
  quote: text("quote").notNull(),
  delta: integer("delta").notNull(),
});

// Reviewable pipeline outputs (IC memos, CRM drafts). Nothing leaves the
// system while status = pending; the review queue decides.
export const artifacts = sqliteTable("artifacts", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // memo | crm-draft | radar
  // Null for artifacts that are not company-specific (weekly radar).
  ticker: text("ticker").references(() => companies.ticker),
  runId: text("run_id")
    .notNull()
    .references(() => runs.id),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  title: text("title").notNull(),
  contentJson: text("content_json").notNull(),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  createdAt: text("created_at").notNull(),
});

export const approvals = sqliteTable("approvals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  artifactId: text("artifact_id")
    .notNull()
    .references(() => artifacts.id),
  decision: text("decision").notNull(), // approved | rejected
  reviewer: text("reviewer").notNull(),
  note: text("note"),
  decidedAt: text("decided_at").notNull(),
});

// Approved statements extracted from reviewed artifacts (M3). Only rows with
// status = approved may ever reach an investor-facing surface (M4).
export const claims = sqliteTable("claims", {
  id: text("id").primaryKey(),
  claimText: text("claim_text").notNull(),
  kind: text("kind").notNull().default("key-change"), // key-change | risk
  status: text("status").notNull().default("proposed"), // proposed | approved | rejected
  artifactRef: text("artifact_ref"),
  approvedBy: text("approved_by"),
  approvedAt: text("approved_at"),
  createdAt: text("created_at").notNull(),
});

export const claimSignals = sqliteTable(
  "claim_signals",
  {
    claimId: text("claim_id")
      .notNull()
      .references(() => claims.id),
    signalId: text("signal_id")
      .notNull()
      .references(() => signals.id),
  },
  (table) => [primaryKey({ columns: [table.claimId, table.signalId] })],
);

// Fictional client groups only — see docs/security-clean-room.md.
export const clientSegments = sqliteTable("client_segments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  jurisdiction: text("jurisdiction").notNull(), // us | eu
  profileNote: text("profile_note").notNull(),
  createdAt: text("created_at").notNull(),
});

export const investorBriefs = sqliteTable("investor_briefs", {
  id: text("id").primaryKey(),
  segmentId: text("segment_id")
    .notNull()
    .references(() => clientSegments.id),
  period: text("period").notNull(),
  status: text("status").notNull().default("draft"), // draft | in_review | approved | published
  version: integer("version").notNull().default(1),
  supersedesId: text("supersedes_id"),
  sectionsJson: text("sections_json").notNull(),
  disclosureVersions: text("disclosure_versions"),
  publishedAt: text("published_at"),
  publishedBy: text("published_by"),
  reviewedBy: text("reviewed_by"),
  reviewNote: text("review_note"),
  createdAt: text("created_at").notNull(),
});

export const deliveryLog = sqliteTable("delivery_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  briefId: text("brief_id")
    .notNull()
    .references(() => investorBriefs.id),
  segmentId: text("segment_id")
    .notNull()
    .references(() => clientSegments.id),
  channel: text("channel").notNull(), // crm-outbox | page
  deliveredAt: text("delivered_at").notNull(),
  deliveredBy: text("delivered_by").notNull(),
});
