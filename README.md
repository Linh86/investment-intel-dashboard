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
npm run dev
```

Open http://localhost:3000. The current slice runs entirely from synthetic fixtures in `data/fixtures/` — no API keys, database, or network access required.

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

M0 complete: Next.js + TypeScript dashboard shell with a seeded watchlist, fixture-backed signal feed, and placeholder run history. Everything renders from synthetic fixtures; no model calls or live data sources are wired up yet.

Current layout:

- `app/` — dashboard pages: watchlist, signal feed, run history
- `components/` — shared UI primitives
- `lib/` — types and fixture-backed data access
- `data/fixtures/` — synthetic watchlist, signals, and run records

Next milestone is M1 (fixture ingestion and triage agent). The full plan is in [docs/mvp-plan.md](docs/mvp-plan.md).

