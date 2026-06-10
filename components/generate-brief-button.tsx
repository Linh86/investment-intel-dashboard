"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface GenerateSummary {
  ok: boolean;
  note: string;
}

export function GenerateBriefButton({
  segmentId,
  segmentName,
}: {
  segmentId: string;
  segmentName: string;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<GenerateSummary | null>(null);

  async function generate() {
    setRunning(true);
    setResult(null);
    try {
      const response = await fetch("/api/briefs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segmentId }),
      });
      const data = await response.json();
      setResult(
        response.ok
          ? { ok: true, note: `${data.briefId} drafted` }
          : { ok: false, note: data.error ?? "Generation failed." },
      );
      router.refresh();
    } catch {
      setResult({ ok: false, note: "Request failed." });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={generate}
        disabled={running}
        className="rounded-lg bg-sky-500/15 px-3.5 py-2 text-sm font-medium text-sky-300 ring-1 ring-inset ring-sky-500/30 transition-colors hover:bg-sky-500/25 disabled:cursor-default disabled:opacity-60"
      >
        {running ? "Drafting…" : `Draft brief — ${segmentName}`}
      </button>
      {result ? (
        <span
          className={`max-w-72 text-right text-xs ${result.ok ? "text-slate-500" : "text-red-400"}`}
        >
          {result.note}
        </span>
      ) : null}
    </div>
  );
}
