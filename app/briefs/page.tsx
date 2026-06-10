import type { Metadata } from "next";
import Link from "next/link";
import { GenerateBriefButton } from "@/components/generate-brief-button";
import { PageHeader, Pill } from "@/components/ui";
import type { PillTone } from "@/components/ui";
import { getBriefs, getSegments } from "@/lib/data";
import type { BriefStatus } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Investor Briefs" };
export const dynamic = "force-dynamic";

const STATUS_TONES: Record<BriefStatus, PillTone> = {
  draft: "amber",
  published: "emerald",
  rejected: "red",
};

export default function BriefsPage() {
  const segments = getSegments();
  const briefs = getBriefs();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Investor Briefs"
        description="Internal workspace for client briefs. Assembled exclusively from human-approved claims; published briefs are what clients see at /client."
      />

      <div className="flex flex-wrap items-start gap-3">
        {segments.map((segment) => (
          <GenerateBriefButton
            key={segment.id}
            segmentId={segment.id}
            segmentName={segment.name}
          />
        ))}
      </div>

      {briefs.length === 0 ? (
        <section className="rounded-xl border border-dashed border-slate-700 bg-slate-900/20 p-5 text-sm text-slate-400">
          No briefs yet. Approve an IC memo in the review queue, then draft a
          brief per client segment — drafts stay internal until published.
        </section>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Brief</th>
                <th className="px-4 py-2.5 font-medium">Segment</th>
                <th className="px-4 py-2.5 font-medium">Period</th>
                <th className="px-4 py-2.5 font-medium">Version</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Created</th>
                <th className="px-4 py-2.5 font-medium">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {briefs.map((brief) => (
                <tr key={brief.id}>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/briefs/${brief.id}`}
                      className="font-mono text-slate-300 transition-colors hover:text-slate-100"
                    >
                      {brief.id}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-300">
                    {brief.segmentName}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{brief.period}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-400">
                    v{brief.version}
                  </td>
                  <td className="px-4 py-2.5">
                    <Pill tone={STATUS_TONES[brief.status]}>
                      {brief.status.charAt(0).toUpperCase() +
                        brief.status.slice(1)}
                    </Pill>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {formatDateTime(brief.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {brief.publishedAt
                      ? `${brief.publishedBy} · ${formatDateTime(brief.publishedAt)}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
