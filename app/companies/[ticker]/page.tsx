import Link from "next/link";
import { notFound } from "next/navigation";
import { Pill, RiskScore, riskBand } from "@/components/ui";
import type { PillTone } from "@/components/ui";
import { getCompanyDetail } from "@/lib/data";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Sector } from "@/lib/types";

export const dynamic = "force-dynamic";

const SECTOR_TONES: Record<Sector, PillTone> = {
  Semiconductors: "sky",
  "AI Infrastructure": "violet",
  Energy: "emerald",
};

const DIMENSION_LABELS: Record<string, string> = {
  market: "Market",
  execution: "Execution",
  regulatory: "Regulatory / Geopolitical",
  "supply-chain": "Supply chain",
  financial: "Financial",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  return { title: `${ticker.toUpperCase()} · Risk` };
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const detail = getCompanyDetail(ticker.toUpperCase());
  if (!detail) notFound();
  const { company, latest, history, signals } = detail;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/"
          className="text-xs text-slate-500 transition-colors hover:text-slate-300"
        >
          ← Watchlist
        </Link>
        <div className="mt-3 flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-2xl font-semibold tracking-tight">
                {company.ticker}
              </h1>
              <Pill tone={SECTOR_TONES[company.sector]}>{company.sector}</Pill>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {company.name} · {company.subSector} · {company.country}
            </p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
              {company.watchReason}
            </p>
          </div>
          <RiskScore
            score={latest?.composite ?? company.baselineRisk}
            delta={
              latest
                ? latest.composite - (latest.previous ?? company.baselineRisk)
                : null
            }
          />
        </div>
      </div>

      {latest ? (
        <>
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-300">
                {latest.id}
              </span>
              <span>·</span>
              <span>
                run <span className="font-mono">{latest.runId}</span>
              </span>
              <span>·</span>
              <span>{formatDateTime(latest.createdAt)}</span>
              <span>·</span>
              <span>
                rubric <span className="font-mono">{latest.rubricVersion}</span>
              </span>
              <span>·</span>
              <span>
                model <span className="font-mono">{latest.model}</span>
              </span>
              <span>·</span>
              <span>
                prompt <span className="font-mono">{latest.promptVersion}</span>
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {latest.summary}
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Subscores & evidence
            </h2>
            {latest.subscores.map((subscore) => {
              const band = riskBand(subscore.score);
              return (
                <div
                  key={subscore.dimension}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="min-w-44 text-sm font-medium text-slate-200">
                      {DIMENSION_LABELS[subscore.dimension] ??
                        subscore.dimension}
                    </span>
                    <div className="h-1 w-28 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full ${band.bar}`}
                        style={{ width: `${subscore.score}%` }}
                      />
                    </div>
                    <span className="font-mono text-sm font-semibold">
                      {subscore.baseline !== subscore.score ? (
                        <>
                          <span className="text-slate-500">
                            {subscore.baseline} →{" "}
                          </span>
                          {subscore.score}
                        </>
                      ) : (
                        subscore.score
                      )}
                    </span>
                    <span className="ml-auto text-xs text-slate-500">
                      confidence {subscore.confidence.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {subscore.rationale}
                  </p>
                  {subscore.evidence.length > 0 ? (
                    <ul className="mt-3 flex flex-col gap-2">
                      {subscore.evidence.map((evidence) => (
                        <li
                          key={evidence.signalId}
                          className="rounded-lg border border-slate-800/70 bg-slate-950/40 px-3 py-2"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Pill
                              tone={
                                evidence.delta > 0
                                  ? "red"
                                  : evidence.delta < 0
                                    ? "emerald"
                                    : "neutral"
                              }
                            >
                              <span className="font-mono">
                                {evidence.delta > 0 ? "+" : ""}
                                {evidence.delta}
                              </span>
                            </Pill>
                            <span className="font-mono text-slate-400">
                              {evidence.signalId}
                            </span>
                            <span className="ml-auto text-slate-600">
                              {formatDate(evidence.publishedAt)}
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm text-slate-300">
                            “{evidence.quote}”
                          </p>
                          <a
                            href={evidence.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block text-xs text-sky-400/80 transition-colors hover:text-sky-300"
                          >
                            {evidence.sourceName} ↗
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Score history
            </h2>
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">When</th>
                    <th className="px-4 py-2.5 font-medium">Assessment</th>
                    <th className="px-4 py-2.5 font-medium">Run</th>
                    <th className="px-4 py-2.5 font-medium">Composite</th>
                    <th className="px-4 py-2.5 font-medium">Δ</th>
                    <th className="px-4 py-2.5 font-medium">Rubric</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {history.map((assessment) => {
                    const change =
                      assessment.composite -
                      (assessment.previous ?? company.baselineRisk);
                    return (
                      <tr key={assessment.id}>
                        <td className="px-4 py-2.5 text-slate-300">
                          {formatDateTime(assessment.createdAt)}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-400">
                          {assessment.id}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-400">
                          {assessment.runId}
                        </td>
                        <td className="px-4 py-2.5 font-mono font-semibold">
                          {assessment.composite}
                        </td>
                        <td
                          className={`px-4 py-2.5 font-mono ${change > 0 ? "text-red-400" : change < 0 ? "text-emerald-400" : "text-slate-500"}`}
                        >
                          {change > 0 ? "+" : ""}
                          {change}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                          {assessment.rubricVersion}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-xl border border-dashed border-slate-700 bg-slate-900/20 p-5 text-sm text-slate-400">
          No risk assessment yet — this company shows its seeded baseline of{" "}
          {company.baselineRisk}. Run the morning brief from the watchlist to
          score it against rubric-weighted evidence.
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Recent signals
        </h2>
        {signals.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {signals.slice(0, 6).map((signal) => (
              <li
                key={signal.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-slate-800/70 bg-slate-900/30 px-3 py-2 text-sm"
              >
                <span className="font-mono text-xs text-slate-500">
                  {signal.id}
                </span>
                <span className="text-slate-300">{signal.headline}</span>
                <span className="ml-auto text-xs text-slate-600">
                  {formatDate(signal.publishedAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No signals yet.</p>
        )}
      </section>
    </div>
  );
}
