import { and, count, desc, eq } from "drizzle-orm";
import disclosuresJson from "@/data/disclosures/disclosures.v1.json";
import portfolioJson from "@/data/fixtures/portfolio.json";
import { getDb } from "../db";
import {
  claims,
  claimSignals,
  clientSegments,
  companies,
  investorBriefs,
  rawItems,
  signals,
} from "../db/schema";
import { BRIEF_LINT_RULES_COUNT, lintBriefContent } from "./lint";
import {
  briefContentSchema,
  type BriefClaimItem,
  type BriefContent,
} from "./schema";

// Deterministic DEMO_MODE brief assembler. Client-facing statements come
// EXCLUSIVELY from human-approved claims (claims.status = 'approved'); the
// generator cannot invent prose — compliance by construction.
export const BRIEF_MODEL = "demo-rules (DEMO_MODE)";
export const BRIEF_PROMPT_VERSION = "brief-rules.v0";

export interface GenerateBriefResult {
  briefId: string;
  segmentId: string;
  version: number;
  period: string;
}

const periodFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function nextId(prefix: string, existing: number): string {
  return `${prefix}-${String(existing + 1).padStart(4, "0")}`;
}

export function generateBrief(input: {
  segmentId: string;
  now: Date;
}): GenerateBriefResult {
  if (process.env.DEMO_MODE === "false") {
    throw new Error(
      "Live LLM mode is not implemented yet. Leave DEMO_MODE unset or set DEMO_MODE=true.",
    );
  }

  const db = getDb();
  const segment = db
    .select()
    .from(clientSegments)
    .where(eq(clientSegments.id, input.segmentId))
    .get();
  if (!segment) {
    throw new Error(`Unknown segment: ${input.segmentId}`);
  }

  // Approved claims only, each carrying its sources via
  // claim_signals → signals → raw_items.
  const claimRows = db
    .select({
      claimId: claims.id,
      claimText: claims.claimText,
      kind: claims.kind,
      approvedBy: claims.approvedBy,
      approvedAt: claims.approvedAt,
      sourceName: rawItems.sourceName,
      sourceUrl: rawItems.sourceUrl,
    })
    .from(claims)
    .innerJoin(claimSignals, eq(claimSignals.claimId, claims.id))
    .innerJoin(signals, eq(claimSignals.signalId, signals.id))
    .innerJoin(rawItems, eq(signals.rawItemId, rawItems.id))
    .where(eq(claims.status, "approved"))
    .orderBy(claims.id)
    .all();

  const byClaim = new Map<string, BriefClaimItem & { kind: string }>();
  for (const row of claimRows) {
    const existing = byClaim.get(row.claimId);
    if (existing) {
      if (!existing.sources.some((source) => source.url === row.sourceUrl)) {
        existing.sources.push({ name: row.sourceName, url: row.sourceUrl });
      }
      continue;
    }
    byClaim.set(row.claimId, {
      claimId: row.claimId,
      text: row.claimText,
      kind: row.kind,
      approvedBy: row.approvedBy ?? "unknown",
      approvedAt: row.approvedAt ?? "unknown",
      sources: [{ name: row.sourceName, url: row.sourceUrl }],
    });
  }
  if (byClaim.size === 0) {
    throw new Error(
      "No approved claims yet — approve an IC memo in the review queue first.",
    );
  }

  const whatChanged: BriefClaimItem[] = [];
  const risksMonitored: BriefClaimItem[] = [];
  for (const { kind, ...item } of byClaim.values()) {
    (kind === "risk" ? risksMonitored : whatChanged).push(item);
  }

  const watchReasonByTicker = new Map(
    db
      .select({ ticker: companies.ticker, watchReason: companies.watchReason })
      .from(companies)
      .all()
      .map((row) => [row.ticker, row.watchReason]),
  );
  const themes = portfolioJson.themes.map((theme) => ({
    label: theme.label,
    tickers: theme.tickers,
    thesis: theme.tickers
      .map((ticker) => watchReasonByTicker.get(ticker))
      .filter((reason): reason is string => Boolean(reason))
      .join(" "),
    authorship: "analyst-authored" as const,
  }));

  const disclosureTexts: Record<string, string> = disclosuresJson.blocks;
  const blocks: { key: string; text: string }[] = [];
  for (const key of [
    "informational",
    "ai-assistance",
    "demo-synthetic",
    segment.jurisdiction,
  ]) {
    const text = disclosureTexts[key];
    if (text) blocks.push({ key, text });
  }

  const generatedAt = input.now.toISOString();
  const content: BriefContent = {
    segment: {
      id: segment.id,
      name: segment.name,
      jurisdiction: segment.jurisdiction,
    },
    period: periodFormat.format(input.now),
    generated: {
      model: BRIEF_MODEL,
      promptVersion: BRIEF_PROMPT_VERSION,
      generatedAt,
    },
    exposure: {
      asOf: portfolioJson.asOf,
      themes: portfolioJson.themes.map((theme) => ({
        key: theme.key,
        label: theme.label,
        weightPct: theme.weightPct,
        tickers: theme.tickers,
        note: theme.note,
      })),
    },
    themes,
    whatChanged,
    risksMonitored,
    disclosures: { version: disclosuresJson.version, blocks },
    compliance: {
      passed: true,
      rulesChecked: BRIEF_LINT_RULES_COUNT,
      checkedAt: generatedAt,
    },
  };

  const lint = lintBriefContent(content);
  if (!lint.ok) {
    throw new Error(
      `Generated brief failed compliance lint (generator bug): ${lint.violations
        .map((violation) => `${violation.rule}: ${violation.detail}`)
        .join(" ")}`,
    );
  }
  const parsed = briefContentSchema.parse(content);

  const briefCount =
    db.select({ n: count() }).from(investorBriefs).get()?.n ?? 0;
  const briefId = nextId("brf", briefCount);
  const segmentBriefCount =
    db
      .select({ n: count() })
      .from(investorBriefs)
      .where(eq(investorBriefs.segmentId, segment.id))
      .get()?.n ?? 0;
  const latestPublished = db
    .select({ id: investorBriefs.id })
    .from(investorBriefs)
    .where(
      and(
        eq(investorBriefs.segmentId, segment.id),
        eq(investorBriefs.status, "published"),
      ),
    )
    .orderBy(desc(investorBriefs.publishedAt))
    .limit(1)
    .get();

  db.insert(investorBriefs)
    .values({
      id: briefId,
      segmentId: segment.id,
      period: parsed.period,
      status: "draft",
      version: segmentBriefCount + 1,
      supersedesId: latestPublished?.id ?? null,
      sectionsJson: JSON.stringify(parsed),
      disclosureVersions: disclosuresJson.version,
      createdAt: generatedAt,
    })
    .run();

  return {
    briefId,
    segmentId: segment.id,
    version: segmentBriefCount + 1,
    period: parsed.period,
  };
}
