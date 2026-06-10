import type { Metadata } from "next";
import {
  PageHeader,
  Pill,
  SignalTypePill,
  UrgencyIndicator,
} from "@/components/ui";
import { getSignals } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Signal Feed" };
export const dynamic = "force-dynamic";

export default function SignalFeedPage() {
  const signals = getSignals();
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Signal Feed"
        description={`${signals.length} synthetic public-source signals across the watchlist, newest first. Classified by the deterministic DEMO_MODE triage — LLM triage over live sources arrives in a later milestone.`}
      />

      <ol className="flex flex-col gap-3">
        {signals.map((signal) => (
          <li
            key={signal.id}
            className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-colors hover:border-slate-700"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Pill>
                <span className="font-mono">{signal.ticker}</span>
              </Pill>
              <SignalTypePill type={signal.type} />
              <UrgencyIndicator urgency={signal.urgency} />
              <span className="ml-auto text-xs text-slate-500">
                {formatDate(signal.publishedAt)}
              </span>
            </div>
            <h2 className="mt-2.5 text-sm font-medium text-slate-100">
              <a
                href={signal.source.url}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-sky-300"
              >
                {signal.headline} <span className="text-slate-600">↗</span>
              </a>
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
              {signal.summary}
            </p>
            <div className="mt-2.5 text-xs text-slate-600">
              {signal.source.name} · relevance: {signal.relevance} ·{" "}
              <span className="font-mono">{signal.id}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
