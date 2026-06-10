import type { BriefClaimItem, BriefContent } from "@/lib/briefing/schema";
import { formatDate, formatDateTime } from "@/lib/format";

// Renders investor-brief content for two audiences: the internal workspace
// (internal = true, with claim ids and compliance metadata) and the client
// page (internal = false, approval labels + public sources + disclosures only).
function ClaimList({
  heading,
  items,
  internal,
}: {
  heading: string;
  items: BriefClaimItem[];
  internal: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
        {heading}
      </h2>
      <ul className="mt-2 flex flex-col gap-2">
        {/* Index keys: the list is a frozen snapshot, and claimId keys would
            leak internal ids into the client page's RSC payload. */}
        {items.map((item, itemIndex) => (
          <li
            key={itemIndex}
            className="rounded-lg border border-slate-800/70 bg-slate-900/30 px-3.5 py-2.5"
          >
            <p className="text-sm leading-relaxed text-slate-300">
              {item.text}{" "}
              {item.sources.map((source, index) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  title={source.name}
                  className="font-mono text-xs text-sky-400/80 transition-colors hover:text-sky-300"
                >
                  [{index + 1}]
                </a>
              ))}
            </p>
            <p className="mt-1.5 text-xs text-slate-500">
              ✦ AI-assisted draft · approved by {item.approvedBy} ·{" "}
              {formatDate(item.approvedAt)}
              {internal ? (
                <>
                  {" "}
                  · <span className="font-mono">{item.claimId}</span>
                </>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BriefSections({
  content,
  internal,
}: {
  content: BriefContent;
  internal: boolean;
}) {
  return (
    <div className="flex flex-col gap-7">
      <section>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Portfolio exposure
          </h2>
          <span className="text-xs text-slate-500">
            as of {formatDate(content.exposure.asOf)} · Synthetic portfolio —
            fictional
          </span>
        </div>
        <div className="mt-2 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Theme</th>
                <th className="px-4 py-2.5 font-medium">Weight</th>
                <th className="px-4 py-2.5 font-medium">Tickers</th>
                <th className="px-4 py-2.5 font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {content.exposure.themes.map((theme) => (
                <tr key={theme.key}>
                  <td className="px-4 py-2.5 text-slate-200">{theme.label}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-300">
                    {theme.weightPct}%
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-400">
                    {theme.tickers.join(", ")}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {theme.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {content.themes.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Themes
          </h2>
          <div className="mt-2 flex flex-col gap-3">
            {content.themes.map((theme) => (
              <div
                key={theme.label}
                className="rounded-xl border border-slate-800 bg-slate-900/30 p-4"
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h3 className="text-sm font-medium text-slate-200">
                    {theme.label}
                  </h3>
                  <span className="font-mono text-xs text-slate-500">
                    {theme.tickers.join(", ")}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  {theme.thesis}
                </p>
                <p className="mt-1.5 text-xs text-slate-500">Analyst-authored</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <ClaimList
        heading="What changed"
        items={content.whatChanged}
        internal={internal}
      />
      <ClaimList
        heading="Risks we are monitoring"
        items={content.risksMonitored}
        internal={internal}
      />

      {internal ? (
        <p className="text-xs text-emerald-300">
          Compliance checks passed · {content.compliance.rulesChecked} rules ·{" "}
          {formatDateTime(content.compliance.checkedAt)}
        </p>
      ) : null}

      <section>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Disclosures
          </h2>
          {internal ? (
            <span className="font-mono text-xs text-slate-600">
              {content.disclosures.version}
            </span>
          ) : null}
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {content.disclosures.blocks.map((block) => (
            <p key={block.key} className="text-xs leading-relaxed text-slate-500">
              {block.text}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
