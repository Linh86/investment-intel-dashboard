import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { NavLink } from "@/components/nav-link";
import { Pill } from "@/components/ui";

export const metadata: Metadata = {
  title: {
    default: "Investment Intel Dashboard",
    template: "%s · Investment Intel",
  },
  description:
    "Clean-room demo of an AI operations layer for repeatable investment research.",
};

const ROADMAP = [
  { label: "Investor Brief", milestone: "M4" },
  { label: "AI Radar", milestone: "M4" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-950 font-sans text-slate-100">
        <div className="flex min-h-screen">
          <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900/40 px-4 py-6">
            <Link href="/" className="px-2">
              <div className="text-sm font-semibold tracking-wide">
                Investment Intel
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                AI ops for repeatable research
              </div>
            </Link>
            <nav className="mt-8 flex flex-col gap-1">
              <NavLink href="/" label="Watchlist" />
              <NavLink href="/signals" label="Signal Feed" />
              <NavLink href="/review" label="Review Queue" />
              <NavLink href="/outbox" label="CRM Outbox" />
              <NavLink href="/runs" label="Run History" />
            </nav>
            <div className="mt-8 px-2 text-[11px] font-medium uppercase tracking-wider text-slate-600">
              Roadmap
            </div>
            <div className="mt-2 flex flex-col gap-1">
              {ROADMAP.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-slate-600"
                >
                  <span>{item.label}</span>
                  <span className="rounded bg-slate-800/60 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                    {item.milestone}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-auto px-2 text-xs leading-relaxed text-slate-600">
              Clean-room demo with synthetic fixtures. Not investment advice.
            </div>
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between gap-4 border-b border-slate-800 px-8 py-3">
              <div className="text-sm text-slate-400">
                AI infrastructure · Energy · Semiconductors
              </div>
              <Pill tone="sky">Demo mode · fixtures only</Pill>
            </header>
            <main className="flex-1 px-8 py-8">
              <div className="mx-auto w-full max-w-5xl">{children}</div>
            </main>
            <footer className="border-t border-slate-800 px-8 py-3 text-xs text-slate-600">
              All signals, runs, and scores are synthetic fixtures. No live data
              sources or model calls are connected yet.
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
