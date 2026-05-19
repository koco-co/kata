## Routing

- Use the command index below as the public slash-command routing table.
- If the input is only a Lanhu/Axure URL, dispatch to `case-draft` silently and let that skill produce the first user-visible result.
- If the input is only a ZenTao bug URL, bug-view URL, or bug ID from a known issue tracker, dispatch to `case-hotfix`; if the record is not fixed or lacks a fix scope, let that skill produce its pending items instead of falling back to `bug-file`.
- If `/playwright-automation` lacks an explicit environment, follow the environment confirmation protocol in the skill before discovery, preflight, or browser work.
- Detailed output contracts, fallback templates, and regression constraints live in `.ai/core/skills/**` and tests; keep this root entry short enough to load in every coding-agent session.
