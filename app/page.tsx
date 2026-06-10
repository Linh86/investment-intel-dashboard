import type { Metadata } from "next";
import { PageHeader, Pill, RiskScore, StatCard } from "@/components/ui";
import type { PillTone } from "@/components/ui";
import {
  companies,
  latestSignalFor,
  runs,
  signals,
  signalsForCompany,
  watchlistAsOf,
} from "@/lib/data";
import { formatDate } from "@/lib/format";
import type { Sector } from "@/lib/types";

export const metadata: Metadata = { title: "Watchlist" };

const SECTOR_TONES: Record<Sector, PillTone> = {
  Semiconductors: "sky",
  "AI Infrastructure": "violet",
  Energy: "emerald",
};

export default function WatchlistPage() {
  const lastRun = runs[0];
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Watchlist"
        description={`Sector coverage across AI infrastructure, energy, and semiconductors. Fixture data as of ${formatDate(watchlistAsOf)}.`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Companies tracked"
          value={companies.length}
          hint="3 sectors"
        />
        <StatCard
          label="Signals in feed"
          value={signals.length}
          hint="synthetic fixtures"
        />
        <StatCard
          label="Pending approvals"
          value={0}
          hint="review gate lands in M3"
        />
        <StatCard
          label="Last run"
          value={formatDate(lastRun.startedAt)}
          hint={`${lastRun.id} · ${lastRun.trigger}`}
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Sector</th>
              <th className="px-4 py-3 font-medium">Baseline risk</th>
              <th className="px-4 py-3 font-medium">Signals</th>
              <th className="px-4 py-3 font-medium">Latest signal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {companies.map((company) => {
              const latest = latestSignalFor(company.ticker);
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
                    <RiskScore score={company.baselineRisk} />
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-sm">
                      {signalsForCompany(company.ticker).length}
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
        Baseline risk is a seeded rubric placeholder. Live rubric scoring with
        per-claim provenance lands in M2.
      </p>
    </div>
  );
}
