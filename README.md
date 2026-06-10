# Investment Intel Dashboard

Clean-room, open-source interview demo for an AI Automation / AI Agent Builder role in an investment firm focused on AI infrastructure, energy, and semiconductors.

This project demonstrates an AI operations layer for repeatable investment research. It watches a sector watchlist, turns public signals into structured findings, updates risk scores with source provenance, drafts investment committee memos, prepares CRM follow-ups behind a human approval gate, and produces a weekly AI radar brief.

The demo is intentionally not an alpha-generation tool. It is designed to show process automation, governance, analyst leverage, and client-service preparation.

## Problem

Investment teams often repeat the same research workflow manually:

- Check what changed across a company watchlist.
- Decide which news items matter.
- Update risk views.
- Draft internal memos.
- Prepare client follow-ups.
- Track sources and assumptions.
- Share weekly AI and market-relevant technology updates.

Typing into Claude or ChatGPT can help with one step, but it does not create a repeatable, auditable process.

## Solution

Investment Intel Dashboard turns that workflow into a small multi-agent system:

- Source Collector: fetches or loads public news and filings.
- Triage Agent: classifies signals by relevance, sector, and urgency.
- Risk Analyst: applies a versioned rubric and produces 0-100 risk scores.
- Memo Writer: drafts an IC-ready investment memo with citations.
- CRM Drafter: prepares follow-up tasks and email drafts for review.
- Weekly Scout: produces a Monday AI radar brief for the team.
- Verifier: marks facts, inferences, confidence, and required human checks.

All outbound artifacts go through a human review queue.

## Why This Beats A Chat Prompt

Chat answers questions. This runs a process.

| Capability | Manual chat equivalent | Business value |
| --- | --- | --- |
| Scheduled watchlist runs | Remember to ask every day | Nothing slips through |
| Schema-validated outputs | Re-read prose manually | Scores can be sorted, trended, and alerted |
| Source provenance | Trust the transcript | Every claim can be audited later |
| Versioned prompts and rubric | Drift between prompts | Consistency across analysts and time |
| Approval gate | Copy-paste risk | Nothing reaches CRM or clients unreviewed |
| CRM-shaped output | Manual formatting | Work lands where the team already works |

## Clean-Room Statement

This repository is independent from any proprietary project. It contains newly written code, dummy portfolio data, fictional clients, and public-source integrations only.

No proprietary code, private data, internal prompts, internal documents, customer data, secrets, or screenshots are included.

The project is a demo and is not investment advice.

## Planned MVP

The first vertical slice:

1. Show a watchlist dashboard for companies such as NVIDIA, TSMC, ASML, Vertiv, and Constellation Energy.
2. Run a morning brief from cached public fixtures.
3. Classify 20-30 signals with structured JSON.
4. Update company risk scores using a transparent rubric.
5. Generate one investment memo with citations.
6. Generate one CRM follow-up draft.
7. Approve or reject artifacts in a review queue.
8. Show audit trail with source URLs, prompt version, model, token cost, and approval status.

## Tech Direction

- TypeScript first.
- Next.js dashboard.
- SQLite for local persistence.
- Drizzle ORM.
- Anthropic and OpenAI behind a small provider interface.
- Zod validation for structured outputs.
- Fixture-backed demo mode so the interview demo does not depend on live network access.
- Webhook endpoint for n8n, Make, Zapier, GitHub Actions, or cron.

## Run Locally

Requires Node.js 20 or newer.

```bash
npm install
npm run db:reset
npm run dev
```

Open http://localhost:3000 and click "Run morning brief" to triage the seeded raw items into signals (or `curl -X POST localhost:3000/api/runs/morning-brief`). Everything runs offline from synthetic fixtures and a local SQLite file — no API keys or network access required. `npm run db:reset` restores the pristine demo state at any time.

## Demo Script

1. Open the dashboard and show the sector watchlist.
2. Click "Run morning brief".
3. Watch agents classify signals and update one risk score.
4. Open the generated investment memo.
5. Click a claim and show provenance.
6. Approve a CRM follow-up and show it in the outbox.
7. Open the weekly AI radar page.
8. Show the audit log and per-run cost.

Close with the business value: analyst time saved, more consistent research, stronger governance, and a practical path to CRM/reporting automation.

## Repository Status

M0–M4 complete: Next.js + TypeScript dashboard backed by SQLite (Drizzle). One morning-brief run triages raw public-source items into Zod-validated signals, rescores affected companies against a versioned rubric (`risk-rubric.v1`) with evidence-backed subscores, and — when a composite moves 10+ points — drafts an IC memo and a CRM follow-up into a human review queue. Approving a memo extracts its cited statements into approved claims; approving a CRM draft lands it in the outbox as HubSpot-shaped JSON with a full governance block. A weekly scout drafts a Monday AI radar behind the same gate.

On top of that sits the investor transparency layer: briefs for fictional client segments are assembled **exclusively from approved claims** plus a synthetic portfolio fixture, pass a deterministic compliance lint (forbidden-phrase blocklist, required jurisdiction-aware disclosures, risk/opportunity balance, per-claim provenance), and publish to a read-only client page with AI-assistance labels and numbered public sources — no model, prompt, or internal identifiers anywhere on the client surface. Publishing re-checks every claim's approval (tamper-evident) and writes a delivery log. Rejected artifacts never leave the system. Every agent is deterministic and rule-based in DEMO_MODE (the default), so the demo needs no API keys; LLM implementations slot in behind the same schemas.

Current layout:

- `app/` — dashboard pages (watchlist, signals, review queue, outbox, memos, radar, briefs, client view, run history, company provenance) and run/brief API routes
- `components/` — shared UI primitives
- `lib/db/` — Drizzle schema and SQLite client
- `lib/pipeline/` — morning-brief and weekly-radar pipelines, DEMO_MODE triage
- `lib/scoring/` — risk rubric loader and deterministic scorer
- `lib/drafting/` — memo, CRM, and radar drafters (structured citations)
- `lib/review.ts` — approval gate with claim extraction
- `lib/briefing/` — investor-brief generator, compliance lint, publish gate
- `data/fixtures/` — synthetic watchlist, signals, runs, raw items, AI news, portfolio
- `data/rubric/` — versioned risk-rubric weights
- `data/disclosures/` — versioned placeholder disclosure blocks (US/EU)
- `scripts/` — database reset/seed
- `drizzle/` — generated SQL migrations

Next milestone is M5 (README as application centerpiece, demo reset polish, GitHub Actions cron + n8n export, eval script, short recording). The full plan is in [docs/mvp-plan.md](docs/mvp-plan.md).

