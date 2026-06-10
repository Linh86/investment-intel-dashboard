# Security And Clean-Room Posture

## Clean-Room Rules

- No proprietary code.
- No private company data.
- No internal prompts from other projects.
- No customer information.
- No secrets.
- No screenshots of private systems.
- No copied architecture documents from private repositories.

## Data Policy

Allowed:

- Public company names.
- Public URLs.
- Public filing metadata.
- RSS metadata and short snippets.
- Fictional portfolio and client records.
- Synthetic fixtures created for the demo.

Not allowed:

- Full copyrighted article bodies.
- Private CRM exports.
- Non-public investment memos.
- Any API key committed to git.

## Runtime Safety

- All API keys live in `.env.local`.
- `.env*` files are ignored except examples.
- Outbound artifacts require human approval.
- The product is labeled "demo, not investment advice".
- LLM outputs are validated before persistence.
- Audit records store model, prompt version, source IDs, and approval status.

## Interview Framing

The demo should be described as a clean-room prototype inspired by general agent workflow principles, not as a fork or extraction of any private system.

