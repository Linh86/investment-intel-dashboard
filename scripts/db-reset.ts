// Resets data/app.db and seeds it from the synthetic fixtures:
// companies + historical signals/runs (so the dashboard starts populated)
// plus untriaged raw items for the morning-brief pipeline to consume.
//
// Rows are wiped in place rather than deleting the database file: a running
// dev/prod server keeps its sqlite connection open, and unlinking the file
// would leave it serving (and writing to) a phantom inode until restart.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DB_PATH, getDb } from "../lib/db";
import {
  approvals,
  artifacts,
  claimSignals,
  claims,
  clientSegments,
  companies,
  deliveryLog,
  investorBriefs,
  rawItems,
  riskAssessments,
  riskEvidence,
  riskSubscores,
  runSteps,
  runs,
  signals,
} from "../lib/db/schema";

interface WatchlistFixture {
  companies: {
    ticker: string;
    name: string;
    sector: string;
    subSector: string;
    country: string;
    watchReason: string;
    baselineRisk: number;
    addedAt: string;
  }[];
}

interface SignalsFixture {
  signals: {
    id: string;
    ticker: string;
    headline: string;
    summary: string;
    type: string;
    urgency: string;
    relevance: string;
    source: { name: string; url: string };
    publishedAt: string;
  }[];
}

interface RunsFixture {
  runs: {
    id: string;
    trigger: string;
    kind: string;
    status: string;
    startedAt: string;
    finishedAt: string;
    note: string;
  }[];
}

interface RawItemsFixture {
  items: {
    id: string;
    title: string;
    snippet: string;
    sourceName: string;
    sourceUrl: string;
    publishedAt: string;
  }[];
}

function readFixture<T>(name: string): T {
  const file = path.join(process.cwd(), "data", "fixtures", name);
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function hashUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

const now = new Date().toISOString();

const db = getDb();

// Children before parents (foreign keys are enforced).
db.transaction((tx) => {
  for (const table of [
    deliveryLog,
    investorBriefs,
    claimSignals,
    claims,
    approvals,
    artifacts,
    riskEvidence,
    riskSubscores,
    riskAssessments,
    runSteps,
    signals,
    runs,
    rawItems,
    clientSegments,
    companies,
  ]) {
    tx.delete(table).run();
  }
});

const watchlist = readFixture<WatchlistFixture>("watchlist.json");
db.insert(companies).values(watchlist.companies).run();

// Fictional client groups only — no real client data anywhere in this repo.
db.insert(clientSegments)
  .values([
    {
      id: "seg-eu-family",
      name: "Meridian Family Office (fictional)",
      jurisdiction: "eu",
      profileNote:
        "Synthetic EU family-office segment for investor-brief demos.",
      createdAt: now,
    },
    {
      id: "seg-us-inst",
      name: "Aldermoor Pension Partners (fictional)",
      jurisdiction: "us",
      profileNote:
        "Synthetic US institutional segment for investor-brief demos.",
      createdAt: now,
    },
  ])
  .run();

const historicalRuns = readFixture<RunsFixture>("runs.json");
db.insert(runs)
  .values(
    historicalRuns.runs.map((run) => ({
      id: run.id,
      trigger: run.trigger,
      kind: run.kind,
      status: run.status,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      note: run.note,
    })),
  )
  .run();

// Historical signals: each gets a raw_items row (provenance) and a signal row
// attributed to the seeded runs — the 3 newest to run-0003, the rest to
// run-0002, matching the run notes in the fixture.
const historical = readFixture<SignalsFixture>("signals.json");
const newestIds = new Set(
  [...historical.signals]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3)
    .map((signal) => signal.id),
);

historical.signals.forEach((signal, index) => {
  const rawId = `raw-${String(index + 1).padStart(4, "0")}`;
  db.insert(rawItems)
    .values({
      id: rawId,
      title: signal.headline,
      snippet: signal.summary,
      sourceName: signal.source.name,
      sourceUrl: signal.source.url,
      publishedAt: signal.publishedAt,
      hash: hashUrl(signal.source.url),
      createdAt: now,
      triagedAt: now,
    })
    .run();
  db.insert(signals)
    .values({
      id: `sig-${String(index + 1).padStart(4, "0")}`,
      rawItemId: rawId,
      runId: newestIds.has(signal.id) ? "run-0003" : "run-0002",
      ticker: signal.ticker,
      type: signal.type,
      urgency: signal.urgency,
      relevance: signal.relevance,
      confidence: 0.85,
      rationale: "Seeded from synthetic fixture.",
      createdAt: now,
    })
    .run();
});

// Untriaged raw items: the morning-brief pipeline turns these into signals.
const pending = readFixture<RawItemsFixture>("raw-items.json");
db.insert(rawItems)
  .values(
    pending.items.map((item) => ({
      id: item.id,
      title: item.title,
      snippet: item.snippet,
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
      publishedAt: item.publishedAt,
      hash: hashUrl(item.sourceUrl),
      createdAt: now,
    })),
  )
  .run();

console.log(
  `Seeded ${watchlist.companies.length} companies, ${historical.signals.length} historical signals, ` +
    `${historicalRuns.runs.length} runs, ${pending.items.length} untriaged raw items, 2 fictional client segments.`,
);
console.log(`Database ready at ${path.relative(process.cwd(), DB_PATH)}`);
