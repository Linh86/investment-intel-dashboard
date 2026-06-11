# Integrations

Working automation surfaces for the pipeline. They all drive the same entry
points the dashboard UI uses — the POST endpoints under `/api/runs/*` and the
library functions behind them. Because DEMO_MODE (the default) is
deterministic and fully offline, every one of these runs with **no API keys
and no secrets**. All data is synthetic; this is a demo, not investment
advice.

## What's here

| File | What it does |
| --- | --- |
| [`../.github/workflows/ci.yml`](../.github/workflows/ci.yml) | CI on every push/PR to `main`: lint, build, seed the SQLite db from fixtures, run the morning-brief pipeline end to end and assert its exact deterministic outputs (9 signals, 5 risk assessments), then run the eval suite. |
| [`../.github/workflows/morning-brief.yml`](../.github/workflows/morning-brief.yml) | Scheduled automation: a weekday 07:00 UTC cron (plus manual `workflow_dispatch`) that seeds the db, runs the morning brief with trigger `cron`, fails unless the run completes, and writes the run id, note, and signal/assessment/artifact counts to the job summary. |
| [`n8n-weekly-radar.json`](n8n-weekly-radar.json) | Importable n8n workflow: Monday 07:00 schedule → `POST /api/runs/weekly-radar` → if the run drafted a radar (`drafted` = 1), notify a Slack channel that a draft is awaiting human review. The review gate stays in the app — n8n only triggers and notifies. |

## GitHub Actions: the whole pipeline in CI, zero keys

Both workflows execute the real pipeline (collect → triage → rubric scoring →
memo/CRM drafting) on a plain GitHub-hosted runner. Nothing is mocked at the
workflow level — `npm run db:reset` seeds the synthetic fixtures and the same
`runMorningBrief()` the dashboard button calls does the rest. No repository
secrets are configured or needed.

## Importing the n8n workflow

1. In n8n: **Workflows → ⋯ → Import from File** and pick
   `n8n-weekly-radar.json` (standard nodes only, no credentials objects).
2. Replace the base URL `http://localhost:3000` in the **Run weekly radar**
   node with wherever the dashboard is reachable from your n8n instance
   (locally: `npm run dev`).
3. Replace the placeholder Slack incoming-webhook URL
   `https://hooks.slack.com/services/REPLACE/ME` in the **Notify Slack
   reviewers** node with a real one.
4. Activate the workflow. Every Monday at 07:00 it kicks off the radar run;
   when a draft lands in the review queue, Slack gets the run id and note.

## Make, Zapier, anything with an HTTP module

No connector code is required: schedule a `POST` to the same endpoints with a
JSON body of `{"trigger": "webhook"}` —

- `POST /api/runs/morning-brief`
- `POST /api/runs/weekly-radar`

Both return JSON (`runId`, `status`, `note`, counts) you can route into
notifications, exactly as the n8n export does.
