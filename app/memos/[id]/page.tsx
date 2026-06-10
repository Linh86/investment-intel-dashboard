import Link from "next/link";
import { notFound } from "next/navigation";
import { Pill } from "@/components/ui";
import { getArtifact } from "@/lib/data";
import { memoContentSchema } from "@/lib/drafting/memo";
import type { CitedStatement } from "@/lib/drafting/memo";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: `Memo ${id}` };
}

const STATUS_TONES = {
  pending: "amber",
  approved: "emerald",
  rejected: "red",
} as const;

function CitedList({
  heading,
  items,
  ticker,
}: {
  heading: string;
  items: CitedStatement[];
  ticker: string;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
        {heading}
      </h2>
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.text}
            className="rounded-lg border border-slate-800/70 bg-slate-900/30 px-3.5 py-2.5 text-sm leading-relaxed text-slate-300"
          >
            {item.text}{" "}
            {item.signalIds.map((signalId) => (
              <Link
                key={signalId}
                href={`/companies/${ticker}`}
                className="font-mono text-xs text-sky-400/80 transition-colors hover:text-sky-300"
                title="View provenance"
              >
                [{signalId}]
              </Link>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function MemoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const artifact = getArtifact(id);
  if (!artifact || artifact.type !== "memo") notFound();
  const memo = memoContentSchema.parse(JSON.parse(artifact.contentJson));

  return (
    <div className="flex flex-col gap-7">
      <div>
        <Link
          href="/review"
          className="text-xs text-slate-500 transition-colors hover:text-slate-300"
        >
          ← Review Queue
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">
            {artifact.title}
          </h1>
          <Pill tone={STATUS_TONES[artifact.status]}>
            {artifact.status.charAt(0).toUpperCase() + artifact.status.slice(1)}
          </Pill>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="font-mono">{artifact.id}</span>
          <span>·</span>
          <Link
            href={`/companies/${artifact.ticker}`}
            className="font-mono transition-colors hover:text-slate-300"
          >
            {artifact.ticker}
          </Link>
          <span>·</span>
          <span>
            run <span className="font-mono">{artifact.runId}</span>
          </span>
          <span>·</span>
          <span>{formatDateTime(artifact.createdAt)}</span>
          <span>·</span>
          <span>
            {artifact.model} · <span className="font-mono">{artifact.promptVersion}</span>
          </span>
        </div>
        {artifact.approval ? (
          <p className="mt-2 text-xs text-slate-400">
            {artifact.approval.decision === "approved"
              ? "Approved"
              : "Rejected"}{" "}
            by {artifact.approval.reviewer} ·{" "}
            {formatDateTime(artifact.approval.decidedAt)}
            {artifact.approval.note ? ` · “${artifact.approval.note}”` : ""}
          </p>
        ) : null}
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Thesis
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-200">
          {memo.thesis}
        </p>
      </section>

      <CitedList
        heading="Key changes"
        items={memo.keyChanges}
        ticker={artifact.ticker}
      />

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Scenarios
        </h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {(
            [
              ["Bull", memo.scenarios.bull, "emerald"],
              ["Base", memo.scenarios.base, "sky"],
              ["Bear", memo.scenarios.bear, "red"],
            ] as const
          ).map(([label, text, tone]) => (
            <div
              key={label}
              className="rounded-xl border border-slate-800 bg-slate-900/30 p-4"
            >
              <Pill tone={tone}>{label}</Pill>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <CitedList
        heading="Catalysts"
        items={memo.catalysts}
        ticker={artifact.ticker}
      />
      <CitedList heading="Risks" items={memo.risks} ticker={artifact.ticker} />

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Questions for IC
        </h2>
        <ul className="mt-2 list-inside list-disc text-sm leading-relaxed text-slate-300">
          {memo.icQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          What would change our mind
        </h2>
        <ul className="mt-2 list-inside list-disc text-sm leading-relaxed text-slate-300">
          {memo.whatWouldChangeOurMind.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
