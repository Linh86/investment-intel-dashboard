import type { ReactNode } from "react";
import type { RunStatus, SignalType, Urgency } from "@/lib/types";

export type PillTone =
  | "neutral"
  | "sky"
  | "emerald"
  | "amber"
  | "orange"
  | "red"
  | "violet";

const PILL_TONES: Record<PillTone, string> = {
  neutral: "bg-slate-800/80 text-slate-300 ring-slate-700",
  sky: "bg-sky-500/10 text-sky-300 ring-sky-500/30",
  emerald: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  amber: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  orange: "bg-orange-500/10 text-orange-300 ring-orange-500/30",
  red: "bg-red-500/10 text-red-300 ring-red-500/30",
  violet: "bg-violet-500/10 text-violet-300 ring-violet-500/30",
};

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: PillTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${PILL_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

const SIGNAL_TYPES: Record<SignalType, { label: string; tone: PillTone }> = {
  news: { label: "News", tone: "sky" },
  filing: { label: "Filing", tone: "violet" },
  regulatory: { label: "Regulatory", tone: "orange" },
  analyst: { label: "Analyst", tone: "emerald" },
  "supply-chain": { label: "Supply chain", tone: "amber" },
};

export function SignalTypePill({ type }: { type: SignalType }) {
  const { label, tone } = SIGNAL_TYPES[type];
  return <Pill tone={tone}>{label}</Pill>;
}

const URGENCY_DOTS: Record<Urgency, { label: string; dot: string }> = {
  high: { label: "High urgency", dot: "bg-red-400" },
  medium: { label: "Medium urgency", dot: "bg-amber-400" },
  low: { label: "Low urgency", dot: "bg-slate-500" },
};

export function UrgencyIndicator({ urgency }: { urgency: Urgency }) {
  const { label, dot } = URGENCY_DOTS[urgency];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

const RUN_STATUS_TONES: Record<RunStatus, PillTone> = {
  completed: "emerald",
  running: "sky",
  failed: "red",
};

export function RunStatusPill({ status }: { status: RunStatus }) {
  return (
    <Pill tone={RUN_STATUS_TONES[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Pill>
  );
}

export function riskBand(score: number): {
  label: string;
  tone: PillTone;
  bar: string;
} {
  if (score >= 80) return { label: "Critical", tone: "red", bar: "bg-red-400" };
  if (score >= 60) return { label: "High", tone: "orange", bar: "bg-orange-400" };
  if (score >= 40) return { label: "Moderate", tone: "amber", bar: "bg-amber-400" };
  return { label: "Low", tone: "emerald", bar: "bg-emerald-400" };
}

export function RiskScore({ score }: { score: number }) {
  const band = riskBand(score);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-semibold text-slate-100">
          {score}
        </span>
        <Pill tone={band.tone}>{band.label}</Pill>
      </div>
      <div className="h-1 w-20 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full ${band.bar}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-100">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
        {title}
      </h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400">
        {description}
      </p>
    </header>
  );
}
