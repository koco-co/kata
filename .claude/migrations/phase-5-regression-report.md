# Phase 5 Regression Report

Date: 2026-05-28

## Scope

This report covers the Phase 5 closeout after moving kata to `SKILL + Router + Graph + Workflow + Blackboard`.

Current runtime surfaces checked:

- `.agents/**`
- `.claude/**`
- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `README-EN.md`
- `CHANGELOG.md`
- `docs/architecture/**`
- `docs/adr/**`
- `docs/ci-cd.md`
- `docs/skills/contracts/**`
- `docs/skills/blackboard/**`
- `docs/skills/workflows/**`
- `engine/**`
- `apps/**`
- `plugins/**`
- `scripts/**`
- `assets/diagrams/**`

Historical records intentionally excluded from the retired-architecture grep:

- `docs/superpowers/**`
- `docs/skills/migrations/**`
- `docs/audits/**`
- `progress.json`

These paths may still mention retired implementation history, but they are not runtime source, implementation guidance, or current architecture documentation.

## Retired Surface Deletion

Verified absent with `test ! -e`:

- `.ai`
- `engine/src/ai-core`
- `engine/tests/ai-core`
- `scripts/run-ai-core-lint.ts`
- `docs/architecture/ai-core-architecture.md`

## Retired Architecture Drift Scan

Command:

```bash
rg -n "AI Core|ai-core|AiCore|aiCore|AI_CORE|KATA_AI_CORE|kata ai-core|lint:ai-core|test:ai-core|\.ai/|\.ai/core|projection|投影|保留待删除|deprecated compatibility|historical compatibility" . -g '!docs/superpowers/**' -g '!docs/skills/migrations/**' -g '!docs/audits/**' -g '!progress.json' -g '!bun.lock' -g '!node_modules/**' -g '!workspace/**' -g '!.git/**'
```

Result: exit 1, no matches.

## Runtime Skill Drift Scan

The review found two current-surface drifts after the initial closeout:

- Runtime `SKILL.md` files still carried retired decorative contract sections such as `上下文预算`, token budgets, `输出`, `输入`, `允许的工具`, `证据策略`, and `失败策略`.
- Runtime `SKILL.md` files still carried legacy `调用图` text with `*-worker@1` and `*-prompt@1` names instead of using the Router / Graph / Workflow contracts.

Fix:

- Removed those sections from `.claude/skills/*/SKILL.md` and `.agents/skills/*/SKILL.md`.
- Added `DECORATIVE_CONTRACT_SECTION` enforcement to `engine/src/skills/runtime-sync.ts`.
- Expanded Claude native frontmatter to `when_to_use`, `model`, `effort`, `paths`, `context`, and `agent` where applicable.
- Kept Codex `SKILL.md` frontmatter within Codex-supported fields and kept Codex runtime metadata in `agents/openai.yaml`.

Runtime drift command:

```bash
rg -n "^## 输出$|^## 输入$|^## 允许的工具$|^## 上下文预算$|^## 调用图$|^## 证据策略$|^## 失败策略$|core_tokens:|reference_tokens:|evidence_tokens:|overflow_policy:|source_refs_required:|stale_ref_policy:|下游 agents:|下游 prompts:|-worker@1|-prompt@1" .claude/skills/*/SKILL.md .agents/skills/*/SKILL.md
```

Result: exit 1, no matches.

Frontmatter field scan result:

- Codex runtime `SKILL.md`: `name`, `description`; `allowed-tools` only remains on `playwright-cli`.
- Claude runtime `SKILL.md`: `name`, `description`, `when_to_use`, `model`, `effort`, plus `paths` / `context` / `agent` on applicable skills; `allowed-tools` remains on `playwright-cli`.

Dual-runtime prompt sync reminder scan:

- The explicit reminder appears only in `AGENTS.md` and `CLAUDE.md`.
- README / README-EN only describe contract locations and do not carry the sync reminder.

## Verification Matrix

| Command | Exit | Result |
| --- | ---: | --- |
| `bun run check:skills` | 0 | runtime skill sync, runtime detach, route check, skill graph check, workflow check passed |
| `bun test engine/tests/skills/frontmatter-check.test.ts engine/tests/skills/sync-check.test.ts` | 0 | 24 pass, 0 fail, 38 expect calls, 2 files |
| `bun test engine/tests/skills/ engine/tests/cli/skills-sync-check.test.ts` | 0 | 63 pass, 0 fail, 117 expect calls, 13 files |
| `bun test --cwd engine` | 0 | 1372 pass, 1 skip, 0 fail, 3247 expect calls, 1373 tests, 165 files |
| `bun run test:apps` | 0 | 104 pass, 0 fail, 263 expect calls, 12 files |
| `bun run type-check` | 0 | `tsc --noEmit` passed |
| `bun run check` | 0 | Biome passed with 156 existing warnings and 6 infos |
| `git diff --check` | 0 | no whitespace errors |

## Notes

- `bun run check` warnings are existing style debt; no Biome errors remain after this phase.
- The root `type-check` command now includes Bun types so root-level Bun tests type-check.
- `apps/core` now reads runtime-native `.agents/skills/*/SKILL.md`, route contracts, and skill graph entries instead of retired skill YAML.
- `runtime-sync` now fails if retired decorative runtime sections or legacy worker/prompt call graph markers reappear in runtime `SKILL.md`.
