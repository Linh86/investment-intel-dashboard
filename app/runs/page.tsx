import type { Metadata } from "next";
import { PageHeader, Pill, RunStatusPill } from "@/components/ui";
import { getRuns } from "@/lib/data";
import { formatDateTime, formatDuration, formatUsd } from "@/lib/format";

export const metadata: Metadata = { title: "Run History" };
export const dynamic = "force-dynamic";

const AUDIT_FIELDS = [
  "Model and prompt version per pipeline step (recorded since M1)",
  "Source IDs and URLs behind every claim (M3)",
  "Token usage and per-run cost in live LLM mode (M2+)",
  "Approval decision, reviewer, and timestamp for outbound artifacts (M3)",
];

export default function RunHistoryPage() {
  const runs = getRuns();
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Run History"
        description="Every pipeline run, stored with its steps, counts, and cost. Trigger one from the watchlist page or POST /api/runs/morning-brief — DEMO_MODE triage runs offline with no API keys."
      />

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Run</th>
              <th className="px-4 py-3 font-medium">Trigger</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Started</th>
              <th className="px-4 py-3 font-medium">Duration</th>
              <th className="px-4 py-3 font-medium">Signals</th>
              <th className="px-4 py-3 font-medium">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {runs.map((run) => (
              <tr
                key={run.id}
                className="align-top transition-colors hover:bg-slate-800/30"
              >
                <td className="px-4 py-3.5">
                  <div className="font-mono text-sm font-semibold">
                    {run.id}
                  </div>
                  <div className="mt-1 max-w-72 text-xs leading-relaxed text-slate-500">
                    {run.note}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <Pill>
                    <span className="font-mono">{run.trigger}</span>
                  </Pill>
                </td>
                <td className="px-4 py-3.5">
                  <RunStatusPill status={run.status} />
                </td>
                <td className="px-4 py-3.5 text-slate-300">
                  {formatDateTime(run.startedAt)}
                </td>
                <td className="px-4 py-3.5 font-mono text-slate-300">
                  {formatDuration(run.startedAt, run.finishedAt)}
                </td>
                <td className="px-4 py-3.5 font-mono text-slate-300">
                  {run.signalsIngested}
                </td>
                <td className="px-4 py-3.5 font-mono text-slate-300">
                  {formatUsd(run.costUsd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-dashed border-slate-700 bg-slate-900/20 p-5">
        <h2 className="text-sm font-semibold text-slate-200">
          What the audit trail records
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Each run appends auditable records as the pipeline grows:
        </p>
        <ul className="mt-3 grid gap-x-6 gap-y-2 text-sm text-slate-400 sm:grid-cols-2">
          {AUDIT_FIELDS.map((field) => (
            <li key={field} className="flex gap-2">
              <span className="text-slate-600">—</span>
              {field}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
