import watchlistFixture from "@/data/fixtures/watchlist.json";
import signalsFixture from "@/data/fixtures/signals.json";
import runsFixture from "@/data/fixtures/runs.json";
import type { Company, RunRecord, Signal } from "@/lib/types";

export const watchlistAsOf: string = watchlistFixture.asOf;
export const companies = watchlistFixture.companies as Company[];

export const signals = (signalsFixture.signals as Signal[])
  .slice()
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export const runs = (runsFixture.runs as RunRecord[])
  .slice()
  .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

export function signalsForCompany(ticker: string): Signal[] {
  return signals.filter((signal) => signal.ticker === ticker);
}

export function latestSignalFor(ticker: string): Signal | undefined {
  return signalsForCompany(ticker)[0];
}
