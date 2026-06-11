// Informational eval harness for the triage step: scores the deterministic
// DEMO_MODE classifier against the human-labeled cases in
// evals/triage-cases.json. Labels encode what a correct triage SHOULD say, so
// misses are real gaps in the rule heuristics — and the same cases can later
// score an LLM-backed triage behind the same zod schema, which is the upgrade
// path this harness exists to measure. Always exits 0.
import fs from "node:fs";
import path from "node:path";
import {
  classifyRawItem,
  TRIAGE_MODEL,
  TRIAGE_PROMPT_VERSION,
  type Classification,
} from "../lib/pipeline/triage";

interface EvalExpectation {
  ticker: string | null;
  type: string | null;
  urgency: string | null;
}

interface EvalCase {
  id: string;
  title: string;
  snippet: string;
  expected: EvalExpectation;
}

interface EvalFixture {
  note: string;
  cases: EvalCase[];
}

interface WatchlistFixture {
  companies: { ticker: string }[];
}

function readJson<T>(relative: string): T {
  const file = path.join(process.cwd(), relative);
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

interface CaseResult {
  id: string;
  expected: EvalExpectation;
  actual: Classification | null;
  tickerOk: boolean;
  // null = not scored (no signal expected for this case).
  typeOk: boolean | null;
  urgencyOk: boolean | null;
  exactOk: boolean;
}

const watchlist = readJson<WatchlistFixture>("data/fixtures/watchlist.json");
const tickers = watchlist.companies.map((company) => company.ticker);
const { cases } = readJson<EvalFixture>("evals/triage-cases.json");

const results: CaseResult[] = cases.map((evalCase) => {
  const actual = classifyRawItem(
    { title: evalCase.title, snippet: evalCase.snippet },
    tickers,
  );
  const expected = evalCase.expected;
  const tickerOk = (actual?.ticker ?? null) === expected.ticker;
  const shouldExist = expected.ticker !== null;
  const typeOk = shouldExist ? (actual?.type ?? null) === expected.type : null;
  const urgencyOk = shouldExist
    ? (actual?.urgency ?? null) === expected.urgency
    : null;
  // A null-expected case is exact iff triage returned null (tickerOk covers it).
  const exactOk = tickerOk && typeOk !== false && urgencyOk !== false;
  return { id: evalCase.id, expected, actual, tickerOk, typeOk, urgencyOk, exactOk };
});

function cell(
  expected: string | null,
  actual: string | null,
  ok: boolean | null,
): string {
  const mark = ok === null ? "·" : ok ? "✓" : "✗";
  return `${expected ?? "—"}→${actual ?? "—"} ${mark}`;
}

function pct(hits: number, total: number): string {
  return `${hits}/${total} (${((100 * hits) / total).toFixed(1)}%)`;
}

const WIDTHS = { id: 9, ticker: 13, type: 29, urgency: 17 };

console.log(`Triage eval — ${TRIAGE_MODEL}, ${TRIAGE_PROMPT_VERSION}`);
console.log(
  `${cases.length} labeled cases (evals/triage-cases.json) | watchlist: ${tickers.join(", ")}`,
);
console.log(
  "Labels are human judgment of the correct triage; · = field not scored (no signal expected).",
);
console.log();
console.log(
  "case".padEnd(WIDTHS.id) +
    "ticker".padEnd(WIDTHS.ticker) +
    "type".padEnd(WIDTHS.type) +
    "urgency".padEnd(WIDTHS.urgency) +
    "exact",
);
const tableWidth =
  WIDTHS.id + WIDTHS.ticker + WIDTHS.type + WIDTHS.urgency + "exact".length;
console.log("-".repeat(tableWidth));
for (const result of results) {
  console.log(
    result.id.padEnd(WIDTHS.id) +
      cell(result.expected.ticker, result.actual?.ticker ?? null, result.tickerOk).padEnd(WIDTHS.ticker) +
      cell(result.expected.type, result.actual?.type ?? null, result.typeOk).padEnd(WIDTHS.type) +
      cell(result.expected.urgency, result.actual?.urgency ?? null, result.urgencyOk).padEnd(WIDTHS.urgency) +
      (result.exactOk ? "✓" : "✗"),
  );
}

const signalCases = results.filter((result) => result.expected.ticker !== null);
const tickerHits = results.filter((result) => result.tickerOk).length;
const typeHits = signalCases.filter((result) => result.typeOk === true).length;
const urgencyHits = signalCases.filter(
  (result) => result.urgencyOk === true,
).length;
const exactHits = results.filter((result) => result.exactOk).length;

console.log();
console.log("Accuracy");
console.log(
  `  ticker   ${pct(tickerHits, results.length)}  — over all cases; expected-null is correct only when triage returns null`,
);
console.log(
  `  type     ${pct(typeHits, signalCases.length)}  — over cases where a signal should exist`,
);
console.log(
  `  urgency  ${pct(urgencyHits, signalCases.length)}  — over cases where a signal should exist`,
);
console.log(`  exact    ${pct(exactHits, results.length)}  — every field correct`);

const misses = results.filter((result) => !result.exactOk);
console.log();
console.log(`Misses (${misses.length})`);
for (const miss of misses) {
  const wrong: string[] = [];
  if (!miss.tickerOk) {
    wrong.push(
      `ticker expected ${miss.expected.ticker ?? "null"}, got ${miss.actual?.ticker ?? "null"}`,
    );
  }
  if (miss.typeOk === false) {
    wrong.push(`type expected ${miss.expected.type}, got ${miss.actual?.type ?? "null"}`);
  }
  if (miss.urgencyOk === false) {
    wrong.push(
      `urgency expected ${miss.expected.urgency}, got ${miss.actual?.urgency ?? "null"}`,
    );
  }
  const diagnosis = miss.actual
    ? miss.actual.rationale
    : "No watchlist alias matched the title or snippet.";
  console.log(`  ${miss.id}  ${wrong.join("; ")} — ${diagnosis}`);
}

console.log();
console.log(
  "Informational harness (always exits 0). To evaluate an LLM triage, point the same cases at an implementation behind the same schema and compare these numbers.",
);
