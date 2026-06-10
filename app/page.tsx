import type { Metadata } from "next";
import Link from "next/link";
import { RunBriefButton } from "@/components/run-brief-button";
import { PageHeader, Pill, RiskScore, StatCard } from "@/components/ui";
import type { PillTone } from "@/components/ui";
import {
  getPendingArtifactCount,
  getRuns,
  getSignals,
  getWatchlist,
  latestSignalFor,
  signalsForCompany,
} from "@/lib/data";
import { formatDate } from "@/lib/format";
import type { Sector } from "@/lib/types";

export const metadata: Metadata = { title: "Watchlist" };
export const dynamic = "force-dynamic";

const SECTOR_TONES: Record<Sector, PillTone> = {
  Semiconductors: "sky",
  "AI Infrastructure": "violet",
  Energy: "emerald",
};

export default function WatchlistPage() {
  const watchlist = getWatchlist();
  const signals = getSignals();
  const runs = getRuns();
  const lastRun = runs[0];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Watchlist"
          description="Sector coverage across AI infrastructure, energy, and semiconductors. Synthetic demo data — the morning brief triages new raw items into signals."
        />
        <RunBriefButton />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Companies tracked"
          value={watchlist.length}
          hint="3 sectors"
        />
        <StatCard
          label="Signals in feed"
          value={signals.length}
          hint="synthetic fixtures"
        />
        <StatCard
          label="Pending approvals"
          value={getPendingArtifactCount()}
          hint="in the review queue"
        />
        <StatCard
          label="Last run"
          value={lastRun ? formatDate(lastRun.startedAt) : "—"}
          hint={
            lastRun
              ? `${lastRun.id} · ${lastRun.trigger}`
              : "seed with npm run db:reset"
          }
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Sector</th>
              <th className="px-4 py-3 font-medium">Risk</th>
              <th className="px-4 py-3 font-medium">Signals</th>
              <th className="px-4 py-3 font-medium">Latest signal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {watchlist.map(({ company, risk }) => {
              const latest = latestSignalFor(signals, company.ticker);
              return (
                <tr
                  key={company.ticker}
                  className="align-top transition-colors hover:bg-slate-800/30"
                >
                  <td className="px-4 py-3.5">
                    <div className="font-mono text-sm font-semibold">
                      {company.ticker}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {company.name}
                    </div>
                    <div className="mt-1 max-w-60 text-xs leading-relaxed text-slate-600">
                      {company.watchReason}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <Pill tone={SECTOR_TONES[company.sector]}>
                      {company.sector}
                    </Pill>
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/companies/${company.ticker}`}
                      className="inline-block transition-opacity hover:opacity-75"
                      title="View risk provenance"
                    >
                      <RiskScore score={risk.current} delta={risk.delta} />
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-sm">
                      {signalsForCompany(signals, company.ticker).length}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {latest ? (
                      <>
                        <div className="line-clamp-2 max-w-72 text-slate-300">
                          {latest.headline}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatDate(latest.publishedAt)} ·{" "}
                          {latest.source.name}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-600">No signals yet</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-slate-500">
        Scores combine five rubric-weighted subscores (risk-rubric.v1) from the
        deterministic demo scorer; unassessed companies show their seeded
        baseline. Click a score for full provenance — evidence, sources, model,
        and prompt version.
      </p>
    </div>
  );
}
