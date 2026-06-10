import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BriefSections } from "@/components/brief-sections";
import { briefContentSchema } from "@/lib/briefing/schema";
import { getLatestPublishedBrief, getSegments } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Client Brief" };
export const dynamic = "force-dynamic";

// The client surface: the latest PUBLISHED brief for this segment and nothing
// else — no internal ids, no model/prompt metadata, no links to internal pages.
export default async function ClientBriefPage({
  params,
}: {
  params: Promise<{ segment: string }>;
}) {
  const { segment } = await params;
  if (!getSegments().some((s) => s.id === segment)) notFound();
  const brief = getLatestPublishedBrief(segment);

  if (!brief) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/20 p-5 text-sm text-slate-400">
        No published brief is available for this segment yet.
      </div>
    );
  }

  const content = briefContentSchema.parse(JSON.parse(brief.sectionsJson));

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          {brief.segmentName}
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          {brief.period} · Published{" "}
          {brief.publishedAt ? formatDate(brief.publishedAt) : "—"} · v
          {brief.version}
        </p>
      </header>

      <BriefSections content={content} internal={false} />
    </div>
  );
}
