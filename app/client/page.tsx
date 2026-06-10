import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Pill } from "@/components/ui";
import { getLatestPublishedBrief, getSegments } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Client View" };
export const dynamic = "force-dynamic";

export default function ClientViewPage() {
  const segments = getSegments();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Client Transparency"
        description="What each client segment sees: only human-approved, source-backed, disclosure-labeled briefs."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {segments.map((segment) => {
          const latest = getLatestPublishedBrief(segment.id);
          return (
            <div
              key={segment.id}
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-100">
                  {segment.name}
                </h2>
                <Pill tone={segment.jurisdiction === "eu" ? "violet" : "sky"}>
                  {segment.jurisdiction.toUpperCase()}
                </Pill>
              </div>
              {latest ? (
                <div className="mt-3 text-sm text-slate-400">
                  <p>
                    {latest.period} · published{" "}
                    {latest.publishedAt ? formatDate(latest.publishedAt) : "—"}
                  </p>
                  <Link
                    href={`/client/${segment.id}`}
                    className="mt-2 inline-block text-xs text-sky-400 transition-colors hover:text-sky-300"
                  >
                    View brief →
                  </Link>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  No published brief yet.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
