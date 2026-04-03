## Routing

- Use the command index below as the public slash-command routing table.
- If the input is only a Lanhu/Axure URL, dispatch to `case-draft` silently and let that skill produce the first user-visible result.
- If `/playwright-automation` lacks an explicit environment, follow the environment confirmation protocol in the skill before discovery, preflight, or browser work.
- Detailed output contracts, fallback templates, and regression constraints live in `.ai/core/skills/**` and tests; keep this root entry short enough to load in every coding-agent session.
