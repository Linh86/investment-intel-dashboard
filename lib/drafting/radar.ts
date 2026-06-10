import { z } from "zod";
import { formatDate } from "../format";

// Deterministic DEMO_MODE radar curator: keyword routing over fixture
// titles/snippets, no LLM.
export const RADAR_MODEL = "demo-rules (DEMO_MODE)";
export const RADAR_PROMPT_VERSION = "radar-rules.v0";

const RADAR_CATEGORIES = [
  "ai-infrastructure",
  "energy",
  "semiconductors",
  "automation-tooling",
  "demos-worth-showing",
] as const;

export const radarContentSchema = z.object({
  period: z.string(),
  sections: z.array(
    z.object({
      category: z.enum(RADAR_CATEGORIES),
      label: z.string(),
      items: z
        .array(
          z.object({
            title: z.string(),
            takeaway: z.string(),
            sourceName: z.string(),
            sourceUrl: z.string(),
            publishedAt: z.string(),
          }),
        )
        .min(1),
    }),
  ),
});

export type RadarContent = z.infer<typeof radarContentSchema>;
export type RadarCategory = (typeof RADAR_CATEGORIES)[number];

export interface AiNewsItem {
  id: string;
  title: string;
  snippet: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
}

// Listed in display order; matching runs in reverse so tooling/demo wording
// wins over the infrastructure and energy terms it co-occurs with (and energy
// items that mention data centers stay in energy).
const SECTION_DEFS: {
  category: RadarCategory;
  label: string;
  keywords: string[];
}[] = [
  {
    category: "ai-infrastructure",
    label: "AI Infrastructure",
    keywords: ["data-center", "data center", "cooling", "hyperscaler"],
  },
  {
    category: "energy",
    label: "Energy",
    keywords: ["grid", "nuclear", "power"],
  },
  {
    category: "semiconductors",
    label: "Semiconductors",
    keywords: ["packaging", "hbm", "silicon", "wafer"],
  },
  {
    category: "automation-tooling",
    label: "Automation & Tooling",
    keywords: ["framework", "workflow", "orchestration", "eval"],
  },
  {
    category: "demos-worth-showing",
    label: "Demos Worth Showing",
    keywords: ["demo", "cli", "worth a look"],
  },
];

function categorize(item: AiNewsItem): RadarCategory | null {
  const text = `${item.title} ${item.snippet}`.toLowerCase();
  for (const def of [...SECTION_DEFS].reverse()) {
    if (def.keywords.some((keyword) => text.includes(keyword))) {
      return def.category;
    }
  }
  return null;
}

function takeaway(snippet: string): string {
  const sentence = snippet.replace(/\s+/g, " ").trim().split(". ")[0];
  return sentence.endsWith(".") ? sentence : `${sentence}.`;
}

function mondayOf(now: Date): Date {
  const day = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day;
}

export function draftRadar(items: AiNewsItem[], now: Date): RadarContent {
  const byCategory = new Map<RadarCategory, AiNewsItem[]>();
  for (const item of items) {
    const category = categorize(item);
    if (!category) continue;
    const list = byCategory.get(category) ?? [];
    list.push(item);
    byCategory.set(category, list);
  }

  return radarContentSchema.parse({
    period: `Week of ${formatDate(mondayOf(now).toISOString())}`,
    sections: SECTION_DEFS.filter((def) => byCategory.has(def.category)).map(
      (def) => ({
        category: def.category,
        label: def.label,
        items: (byCategory.get(def.category) ?? [])
          .slice()
          .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
          .map((item) => ({
            title: item.title,
            takeaway: takeaway(item.snippet),
            sourceName: item.sourceName,
            sourceUrl: item.sourceUrl,
            publishedAt: item.publishedAt,
          })),
      }),
    ),
  });
}
