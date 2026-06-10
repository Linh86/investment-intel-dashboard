import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefSections } from "@/components/brief-sections";
import { Pill } from "@/components/ui";
import type { PillTone } from "@/components/ui";
import { briefContentSchema } from "@/lib/briefing/schema";
import { getBrief, getDeliveryLog } from "@/lib/data";
import type { BriefStatus } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { publishAction, rejectAction } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: `Brief ${id}` };
}

const STATUS_TONES: Record<BriefStatus, PillTone> = {
  draft: "amber",
  published: "emerald",
  rejected: "red",
};

export default async function BriefDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brief = getBrief(id);
  if (!brief) notFound();
  const content = briefContentSchema.parse(JSON.parse(brief.sectionsJson));
  const deliveries =
    brief.status === "published" ? getDeliveryLog(brief.id) : [];

  return (
    <div className="flex flex-col gap-7">
      <div>
        <Link
          href="/briefs"
          className="text-xs text-slate-500 transition-colors hover:text-slate-300"
        >
          ← Investor Briefs
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">
            {brief.id} — {brief.segmentName}
          </h1>
          <Pill tone={STATUS_TONES[brief.status]}>
            {brief.status.charAt(0).toUpperCase() + brief.status.slice(1)}
          </Pill>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>{brief.period}</span>
          <span>·</span>
          <span className="font-mono">v{brief.version}</span>
          <span>·</span>
          <span>
            {content.generated.model} ·{" "}
            <span className="font-mono">{content.generated.promptVersion}</span>
          </span>
          <span>·</span>
          <span>
            disclosures{" "}
            <span className="font-mono">{brief.disclosureVersions}</span>
          </span>
          <span>·</span>
          <span>{formatDateTime(brief.createdAt)}</span>
        </div>
        {brief.supersedesId ? (
          <p className="mt-2 text-xs text-slate-400">
            Supersedes{" "}
            <Link
              href={`/briefs/${brief.supersedesId}`}
              className="font-mono transition-colors hover:text-slate-200"
            >
              {brief.supersedesId}
            </Link>
          </p>
        ) : null}
      </div>

      <BriefSections content={content} internal={true} />

      {brief.status === "draft" ? (
        <form
          action={publishAction}
          className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
        >
          <input type="hidden" name="briefId" value={brief.id} />
          <input
            type="text"
            name="reviewer"
            defaultValue="Demo Analyst"
            aria-label="Reviewer"
            className="w-36 rounded-lg border border-slate-700 bg-slate-950/60 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-slate-500"
          />
          <input
            type="text"
            name="note"
            placeholder="Rejection note (optional)"
            aria-label="Review note"
            className="w-52 rounded-lg border border-slate-700 bg-slate-950/60 px-2.5 py-1.5 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-slate-500"
          />
          <div className="ml-auto flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-emerald-500/15 px-3.5 py-1.5 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30 transition-colors hover:bg-emerald-500/25"
            >
              Publish
            </button>
            <button
              type="submit"
              formAction={rejectAction}
              className="rounded-lg bg-red-500/15 px-3.5 py-1.5 text-xs font-medium text-red-300 ring-1 ring-inset ring-red-500/30 transition-colors hover:bg-red-500/25"
            >
              Reject
            </button>
          </div>
        </form>
      ) : null}

      {brief.status === "published" ? (
        <>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            Published by {brief.publishedBy} ·{" "}
            {brief.publishedAt ? formatDateTime(brief.publishedAt) : "—"} ·{" "}
            <Link
              href={`/client/${brief.segmentId}`}
              className="font-medium underline decoration-emerald-500/40 underline-offset-2 transition-colors hover:text-emerald-200"
            >
              View client page →
            </Link>
          </div>
          {deliveries.length > 0 ? (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Delivery log
              </h2>
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Channel</th>
                      <th className="px-4 py-2.5 font-medium">Delivered by</th>
                      <th className="px-4 py-2.5 font-medium">Delivered at</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {deliveries.map((delivery) => (
                      <tr key={delivery.id}>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-300">
                          {delivery.channel}
                        </td>
                        <td className="px-4 py-2.5 text-slate-300">
                          {delivery.deliveredBy}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">
                          {formatDateTime(delivery.deliveredAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {brief.status === "rejected" ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Rejected by {brief.reviewedBy}
          {brief.reviewNote ? ` · “${brief.reviewNote}”` : ""}
        </div>
      ) : null}
    </div>
  );
}
