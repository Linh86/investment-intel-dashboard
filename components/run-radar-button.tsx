"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface RunSummary {
  runId: string;
  status: "completed" | "failed";
  note: string;
}

export function RunRadarButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunSummary | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const response = await fetch("/api/runs/weekly-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "manual" }),
      });
      const data = await response.json();
      setResult(
        response.ok
          ? data
          : { runId: "—", status: "failed", note: data.error ?? "Run failed." },
      );
      router.refresh();
    } catch {
      setResult({ runId: "—", status: "failed", note: "Request failed." });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="rounded-lg bg-sky-500/15 px-3.5 py-2 text-sm font-medium text-sky-300 ring-1 ring-inset ring-sky-500/30 transition-colors hover:bg-sky-500/25 disabled:cursor-default disabled:opacity-60"
      >
        {running ? "Generating…" : "Generate weekly radar"}
      </button>
      {result ? (
        <span
          className={`max-w-64 text-right text-xs ${result.status === "failed" ? "text-red-400" : "text-slate-500"}`}
        >
          {result.status === "completed" ? `${result.runId} · ` : ""}
          {result.note}
        </span>
      ) : null}
    </div>
  );
}
