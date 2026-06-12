"use client";

import { useState } from "react";
import { PageHeader, Pill, SignalTypePill, UrgencyIndicator } from "@/components/ui";
import type { SignalType, Urgency, Relevance } from "@/lib/types";

interface Analysis {
  ticker: string | null;
  onWatchlist: boolean;
  type: SignalType | null;
  urgency: Urgency | null;
  relevance: Relevance | null;
  confidence: number;
  rationale: string;
  riskDirection: "up" | "down" | "flat";
  riskRationale: string;
  analystNote: string;
}

interface ApiResult {
  enabled: boolean;
  model?: string;
  analysis?: Analysis;
  error?: string;
  hint?: string;
}

const EXAMPLES = [
  "Constellation Energy signs a 20-year nuclear power deal to supply a new AI data-center campus",
  "New draft rules would tighten export licensing for the most advanced AI accelerators",
  "Local bakery chain reports a strong quarter on higher pastry demand",
];

const RISK_ARROW = {
  up: { label: "Risk ↑", className: "text-red-400" },
  down: { label: "Risk ↓", className: "text-emerald-400" },
  flat: { label: "Risk →", className: "text-slate-400" },
} as const;

export default function TryPage() {
  const [headline, setHeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);

  async function analyze(text: string) {
    const value = text.trim();
    if (!value || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/try", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline: value }),
      });
      setResult(await response.json());
    } catch {
      setResult({ enabled: true, error: "Request failed." });
    } finally {
      setLoading(false);
    }
  }

  const analysis = result?.analysis;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Try it"
        description="Paste any headline — your own, a real one, anything. Claude classifies it and assesses the risk impact live, the same way the morning-brief agents do, but on your input instead of fixtures."
      />

      <div className="flex flex-col gap-3">
        <textarea
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          rows={3}
          placeholder="Paste a headline…"
          className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-slate-500"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => analyze(headline)}
            disabled={loading || !headline.trim()}
            className="rounded-lg bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-300 ring-1 ring-inset ring-sky-500/30 transition-colors hover:bg-sky-500/25 disabled:cursor-default disabled:opacity-50"
          >
            {loading ? "Asking Claude…" : "Analyze with Claude"}
          </button>
          <span className="text-xs text-slate-600">or try:</span>
          {EXAMPLES.map((example, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                setHeadline(example);
                analyze(example);
              }}
              disabled={loading}
              className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200 disabled:opacity-50"
            >
              {["nuclear deal", "export rules", "off-topic"][index]}
            </button>
          ))}
        </div>
      </div>

      {result && result.enabled === false ? (
        <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-5 text-sm text-amber-200/90">
          <p className="font-medium">Live analysis is off.</p>
          <p className="mt-1 text-amber-200/70">
            Restart the dev server with the live provider to use your Claude
            Code session — no API key needed:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950/60 px-3 py-2 font-mono text-xs text-slate-300">
            LLM_PROVIDER=claude-cli npm run dev
          </pre>
        </div>
      ) : null}

      {result?.error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-300">
          {result.error}
        </div>
      ) : null}

      {analysis ? (
        <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex flex-wrap items-center gap-2">
            {analysis.ticker ? (
              <Pill tone={analysis.onWatchlist ? "sky" : "neutral"}>
                <span className="font-mono">{analysis.ticker}</span>
                {analysis.onWatchlist ? "" : " · not on watchlist"}
              </Pill>
            ) : (
              <Pill tone="neutral">No watchlist match</Pill>
            )}
            {analysis.type ? <SignalTypePill type={analysis.type} /> : null}
            {analysis.urgency ? (
              <UrgencyIndicator urgency={analysis.urgency} />
            ) : null}
            <span
              className={`font-mono text-sm font-semibold ${RISK_ARROW[analysis.riskDirection].className}`}
            >
              {RISK_ARROW[analysis.riskDirection].label}
            </span>
            <span className="ml-auto text-xs text-slate-600">
              {result?.model} · confidence {analysis.confidence.toFixed(2)}
            </span>
          </div>

          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Classification
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">
              {analysis.rationale}
            </p>
          </div>

          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Risk impact
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">
              {analysis.riskRationale}
            </p>
          </div>

          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Analyst note
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">
              {analysis.analystNote}
            </p>
          </div>

          <p className="border-t border-slate-800/70 pt-3 text-xs text-slate-600">
            Generated live by your Claude Code session — no API key, no fixtures.
            Informational demo, not investment advice.
          </p>
        </div>
      ) : null}
    </div>
  );
}
