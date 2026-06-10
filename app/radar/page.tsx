import type { Metadata } from "next";
import Link from "next/link";
import { RunRadarButton } from "@/components/run-radar-button";
import { PageHeader } from "@/components/ui";
import { getArtifacts } from "@/lib/data";
import { radarContentSchema } from "@/lib/drafting/radar";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "AI Radar" };
export const dynamic = "force-dynamic";

export default function RadarPage() {
  const approved = getArtifacts({ type: "radar", status: "approved" })[0];
  const pending = getArtifacts({ type: "radar", status: "pending" })[0];
  const radar = approved
    ? radarContentSchema.parse(JSON.parse(approved.contentJson))
    : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="AI Radar"
          description="Monday scouting brief across AI infrastructure, energy, semiconductors, and tooling — drafted by the weekly scout from synthetic fixtures, published only after human approval."
        />
        <RunRadarButton />
      </div>

      {pending ? (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
          A radar draft is awaiting review —{" "}
          <Link
            href="/review"
            className="underline underline-offset-2 transition-colors hover:text-amber-200"
          >
            decide it in the review queue
          </Link>
          .
        </section>
      ) : null}

      {radar ? (
        <section className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              {radar.period}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {approved.approval
                ? `Approved by ${approved.approval.reviewer} · ${formatDateTime(approved.approval.decidedAt)} · `
                : ""}
              {approved.model} · {approved.promptVersion}
            </p>
          </div>
          {radar.sections.map((section) => (
            <section key={section.category} className="flex flex-col gap-3">
              <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {section.label}
              </h3>
              <ol className="flex flex-col gap-3">
                {section.items.map((item) => (
                  <li
                    key={item.sourceUrl}
                    className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
                  >
                    <h4 className="text-sm font-medium text-slate-100">
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="transition-colors hover:text-sky-300"
                      >
                        {item.title} <span className="text-slate-600">↗</span>
                      </a>
                    </h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                      {item.takeaway}
                    </p>
                    <div className="mt-2 text-xs text-slate-600">
                      {item.sourceName} · {formatDate(item.publishedAt)}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </section>
      ) : null}

      {!approved && !pending ? (
        <section className="rounded-xl border border-dashed border-slate-700 bg-slate-900/20 p-5 text-sm text-slate-400">
          No radar yet. Click “Generate weekly radar” — the scout drafts this
          week’s brief from the synthetic AI-news fixture, and it appears here
          once approved in the review queue.
        </section>
      ) : null}
    </div>
  );
}
