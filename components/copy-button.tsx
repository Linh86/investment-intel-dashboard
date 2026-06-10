"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-lg bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 ring-1 ring-inset ring-slate-700 transition-colors hover:bg-slate-700/80"
    >
      {copied ? "Copied ✓" : "Copy JSON"}
    </button>
  );
}
