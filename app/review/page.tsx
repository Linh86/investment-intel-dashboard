import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Pill } from "@/components/ui";
import type { PillTone } from "@/components/ui";
import { getArtifacts } from "@/lib/data";
import type { ArtifactType, ArtifactView } from "@/lib/data";
import { crmDraftContentSchema } from "@/lib/drafting/crm";
import { memoContentSchema } from "@/lib/drafting/memo";
import { radarContentSchema } from "@/lib/drafting/radar";
import { formatDateTime } from "@/lib/format";
import { reviewAction } from "./actions";

export const metadata: Metadata = { title: "Review Queue" };
export const dynamic = "force-dynamic";

const TYPE_PILLS: Record<ArtifactType, { label: string; tone: PillTone }> = {
  memo: { label: "IC memo", tone: "violet" },
  "crm-draft": { label: "CRM draft", tone: "sky" },
  radar: { label: "Radar", tone: "emerald" },
};

function MemoPreview({ artifact }: { artifact: ArtifactView }) {
  const memo = memoContentSchema.parse(JSON.parse(artifact.contentJson));
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-slate-300">{memo.thesis}</p>
      <ul className="flex flex-col gap-1.5">
        {memo.keyChanges.map((change) => (
          <li
            key={change.text}
            className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-slate-400"
          >
            <span>— {change.text}</span>
            {change.signalIds.map((signalId) => (
              <span
                key={signalId}
                className="font-mono text-xs text-sky-400/80"
              >
                [{signalId}]
              </span>
            ))}
          </li>
        ))}
      </ul>
      <Link
        href={`/memos/${artifact.id}`}
        className="text-xs text-sky-400 transition-colors hover:text-sky-300"
      >
        Full memo →
      </Link>
    </div>
  );
}

function CrmPreview({ artifact }: { artifact: ArtifactView }) {
  const draft = crmDraftContentSchema.parse(JSON.parse(artifact.contentJson));
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={draft.task.priority === "high" ? "red" : "amber"}>
          {draft.task.priority} priority
        </Pill>
        <span className="text-xs text-slate-500">
          {draft.segmentName} · {draft.jurisdiction.toUpperCase()} · due{" "}
          {draft.task.dueDate} · linked memo{" "}
          <span className="font-mono">{draft.linkedMemoId}</span>
        </span>
      </div>
      <p className="font-medium text-slate-200">{draft.task.subject}</p>
      <p className="leading-relaxed text-slate-400">{draft.task.body}</p>
      <p className="text-xs text-slate-500">
        Email draft: “{draft.emailDraft.subject}”
      </p>
    </div>
  );
}

function RadarPreview({ artifact }: { artifact: ArtifactView }) {
  const radar = radarContentSchema.parse(JSON.parse(artifact.contentJson));
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-xs text-slate-500">{radar.period}</p>
      <ul className="flex flex-col gap-1.5">
        {radar.sections.map((section) => (
          <li key={section.category} className="text-slate-400">
            <span className="font-medium text-slate-300">{section.label}</span>{" "}
            · {section.items.length}{" "}
            {section.items.length === 1 ? "item" : "items"} — first: “
            {section.items[0].title}”
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500">Appears on /radar after approval.</p>
    </div>
  );
}

export default function ReviewQueuePage() {
  const pending = getArtifacts({ status: "pending" });
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Review Queue"
        description="The human approval gate. Approving a memo extracts its cited statements into approved claims — the only content eligible for investor-facing surfaces. Rejected artifacts never leave the system."
      />

      {pending.length === 0 ? (
        <section className="rounded-xl border border-dashed border-slate-700 bg-slate-900/20 p-5 text-sm text-slate-400">
          The queue is clear. Run the morning brief from the watchlist — a
          composite move of 10+ points drafts an IC memo and a CRM follow-up
          for review.
        </section>
      ) : (
        <ol className="flex flex-col gap-4">
          {pending.map((artifact) => (
            <li
              key={artifact.id}
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={TYPE_PILLS[artifact.type].tone}>
                  {TYPE_PILLS[artifact.type].label}
                </Pill>
                <span className="font-mono text-xs text-slate-500">
                  {artifact.id}
                </span>
                {artifact.ticker ? (
                  <Link
                    href={`/companies/${artifact.ticker}`}
                    className="font-mono text-xs text-slate-400 transition-colors hover:text-slate-200"
                  >
                    {artifact.ticker}
                  </Link>
                ) : null}
                <span className="ml-auto text-xs text-slate-600">
                  {formatDateTime(artifact.createdAt)} · {artifact.runId} ·{" "}
                  {artifact.model} · {artifact.promptVersion}
                </span>
              </div>
              <h2 className="mt-3 text-sm font-semibold text-slate-100">
                {artifact.title}
              </h2>
              <div className="mt-3 border-l-2 border-slate-800 pl-4">
                {artifact.type === "memo" ? (
                  <MemoPreview artifact={artifact} />
                ) : artifact.type === "radar" ? (
                  <RadarPreview artifact={artifact} />
                ) : (
                  <CrmPreview artifact={artifact} />
                )}
              </div>
              <form
                action={reviewAction}
                className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800/70 pt-4"
              >
                <input type="hidden" name="artifactId" value={artifact.id} />
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
                  placeholder="Optional note"
                  aria-label="Review note"
                  className="w-52 rounded-lg border border-slate-700 bg-slate-950/60 px-2.5 py-1.5 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-slate-500"
                />
                <div className="ml-auto flex gap-2">
                  <button
                    type="submit"
                    name="decision"
                    value="approved"
                    className="rounded-lg bg-emerald-500/15 px-3.5 py-1.5 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30 transition-colors hover:bg-emerald-500/25"
                  >
                    Approve
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="rejected"
                    className="rounded-lg bg-red-500/15 px-3.5 py-1.5 text-xs font-medium text-red-300 ring-1 ring-inset ring-red-500/30 transition-colors hover:bg-red-500/25"
                  >
                    Reject
                  </button>
                </div>
              </form>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
