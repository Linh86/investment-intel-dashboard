import type { Metadata } from "next";
import { PageHeader, Pill, RunStatusPill } from "@/components/ui";
import { runs } from "@/lib/data";
import { formatDateTime, formatDuration, formatUsd } from "@/lib/format";

export const metadata: Metadata = { title: "Run History" };

const AUDIT_FIELDS = [
  "Model and prompt version used for every agent step",
  "Source IDs and URLs behind every claim",
  "Token usage and per-run cost",
  "Approval decision, reviewer, and timestamp for outbound artifacts",
];

export default function RunHistoryPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Run History"
        description="Placeholder audit records from fixture mode. The real pipeline lands in M1; this page becomes the audit trail for every scheduled, manual, or webhook-triggered run."
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
          What the audit trail will record
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          From M1 onward, every run appends an auditable record per artifact:
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
