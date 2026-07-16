<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/Kata-4.0_Runtime-2563EB?style=for-the-badge">
  <img alt="Kata 4.0 Runtime" src="https://img.shields.io/badge/Kata-4.0_Runtime-2563EB?style=for-the-badge">
</picture>

# Kata

### Auditable QA workflows built on Claude Code Skills

Kata turns QA work into auditable product skills: it can derive test cases, reports, Playwright scripts, and project knowledge from PRDs, design sources, bugs, code diffs, UI cases, and test results.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Bun](https://img.shields.io/badge/Bun-required-000000?style=flat-square&logo=bun&logoColor=white)](https://bun.sh/)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Skills-7C3AED?style=flat-square)](https://claude.com/claude-code)
[![Version](https://img.shields.io/badge/version-4.0.0--alpha.1-blue.svg?style=flat-square)](./package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

**English** | **[中文](./README.md)**

</div>

---

## 30-second overview

Kata is not a single script. It is an auditable QA workflow orchestration system:

```text
PRD / Lanhu / design source ── /case-draft ───────> Archive MD + XMind
Existing case artifacts ────── /case-edit ──> Normalize, sync, convert
Project business knowledge ─── /knowledge-curate ──> Query, update, maintain
Failure / bug / conflict / diff ── /defect-analyze ──> Defect reports, conflict resolutions
UI cases / test results ────── /playwright-automation ─> UI plans, Playwright scripts, triage
```

Core principles:

- `.claude/**` is the first-class runtime directory for the kata Claude Code runtime.
- The runtime code chassis lives at `.claude/scripts/_shared/**` (lib / schemas / plugin-runtime / cli / lint) with shared prompts at `.claude/prompt/_shared/**`.
- Project artifacts are written under `workspace/{project}/`; source evidence lives under `workspace/{project}/.kata/repos/**` and is read-only.
- Browser automation is driven by the `playwright-automation` skill; a native Playwright API cheat sheet lives at `.claude/skills/playwright-automation/references/cli-essentials.md`.

## Quick start

### Prerequisites

| Tool | Requirement | Purpose |
| --- | --- | --- |
| Node.js | `>= 22.0.0` | Runs the TypeScript/Bun toolchain |
| Bun | Installed | Installs dependencies and runs tests/CLI commands |
| Git | Installed | Manages this repo and project source evidence |
| Claude Code | Recommended | Uses the `.claude/**` runtime skills |

### Install

Start with [INSTALL.md](./INSTALL.md) when setting up a new machine. Manual setup:

```bash
bun install
[ -f .env ] || cp .env.example .env
kata workspace verify
bun test
```

Install browsers only when you need real browser automation or Playwright execution:

```bash
bunx playwright install
```

Then open Claude Code and run:

```text
/workspace-manage
```

## Current capabilities

The table below is the current public capability surface. Runtime entrypoints are `CLAUDE.md` and `.claude/**`.

| Command | Area | Skill | Summary |
| --- | --- | --- | --- |
| `/workspace-manage` | Workspace | `workspace-manage@1` | Show the feature menu and manage kata project workspaces. |
| `/case-draft` | Case generation | `case-draft@1` | Generate QA test cases from requirements, PRDs, or design sources. |
| `/case-edit` | Case maintenance | `case-edit@1` | Edit, sync, convert, or normalize existing QA case artifacts. |
| `/knowledge-curate` | Knowledge | `knowledge-curate@1` | Query or update project business knowledge and rules. |
| `/defect-analyze` | Defects and changes | `defect-analyze@1` | Triage bug evidence, merge conflicts, and code diffs in one skill. |
| `/case-hotfix` | Defects and changes | `case-hotfix@1` | Generate hotfix regression cases from bugs or fix records. |
| `/playwright-automation` | UI automation | `playwright-automation@1` | Plan, generate, run, triage, and repair Playwright UI automation before handoff. |
| `/infra-diagnose` | Infra diagnosis | `infra-diagnose@1` | SSH into servers to diagnose and fix datasource/server connectivity failures. |

### Usage examples

Run these commands directly in Claude Code:

```bash
# 1. Workspace — show the feature menu and manage project workspaces
/workspace-manage

# 2. Case generation — generate test cases from PRDs, Lanhu URLs, or Axure links
/case-draft

# 3. Case editing — sync, convert, or normalize Archive MD / XMind / CSV artifacts
/case-edit

# 4. Knowledge management — query or update project business rules and terms
/knowledge-curate

# 5. UI automation — generate, run, triage, and repair Playwright tests
/playwright-automation

# 6. Defect analysis — triage bug evidence, merge conflicts, and code diffs
/defect-analyze

# 7. Hotfix regression cases — generate regression tests from bugs or fix records
/case-hotfix

# 8. Infra diagnosis — SSH into servers to diagnose connectivity failures
/infra-diagnose
```

## Architecture

![Kata project architecture](./assets/diagrams/kata-project-overview.svg)

Kata uses `.claude/**` as the first-class runtime: 8 business skills as the single source, a prompt-level routing table (see `CLAUDE.md`) dispatching inputs to the right skill, `.claude/scripts/_shared/**` (lib / schemas / lint / cli) as the execution and verification layer, `.claude/plugins/` for lanhu/zentao/notify, and `workspace/{project}` for artifacts:

```text
.claude/    Claude Code runtime skills and contracts
.claude/scripts/_shared/**    CLI, validators, tests, and workflow support
```

| Runtime / Boundary | Current responsibility |
| --- | --- |
| `.claude/**` | Claude Code runtime skills and references, maintained as the first-class runtime. |
| `.claude/scripts/_shared/**` | Runtime code chassis (lib / schemas / plugin-runtime / cli / lint) plus shared prompts at `.claude/prompt/_shared/**`. |
| `workspace/{project}/**` | Project artifact area for PRD derivatives, Archive MD, XMind, reports, Playwright outputs, and project knowledge. |
| `workspace/{project}/.kata/repos/**` | Read-only source evidence area; kata workflows must not push, commit, or write business files there. |

At runtime, agents read their runtime skill plus the shared chassis `.claude/scripts/_shared/**`, then read/write project artifacts through `workspace/{project}/`. Write boundaries, SourceRefs, schemas, and sync checks are enforced by `.claude/scripts/_shared/**` validators and runtime checks.

## Agent runtime support

kata's 8 business skills live once under `.claude/skills/` and are exposed to other agent runtimes through adapter directories — zero body copies, translated at runtime via tool mapping:

| Runtime | Adapter dir | Discovery | Status |
| --- | --- | --- | --- |
| Claude Code | `.claude/skills/` | native | ✅ first-class |
| OpenAI Codex | `.agents/skills/` + `.codex-plugin/plugin.json` | official `.agents/skills` scan, whole-dir symlinks | ✅ officially supported |

Codex's tool-name mapping and session bootstrap live in `using-kata-codex`.

## Plugins

Built-in plugins live under `.claude/plugins/` and attach to product skills through hooks.

| Plugin | Hook | Required configuration |
| --- | --- | --- |
| `lanhu` | `case-draft:init` | `KATA_LANHU_COOKIE` |
| `zentao` | `case-hotfix:init` | `KATA_ZENTAO_BASE_URL`, `KATA_ZENTAO_ACCOUNT`, `KATA_ZENTAO_PASSWORD` |
| `notify` | `*:output` | At least one channel: `KATA_DINGTALK_WEBHOOK_URL`, `KATA_FEISHU_WEBHOOK_URL`, `KATA_WECOM_WEBHOOK_URL`, `KATA_SMTP_HOST` |

The root `.env` is the only dotenv file: an explicit process environment wins, then `.env` fills missing keys. `.env.envs`, root `.env.local`, and project `.env.local` are not loaded. Each DataAssets platform is stored in one ignored local `config/env/<env>.yaml`, including `auth.cookie`; the directory must be `0700` and files `0600`. Profiles keep stable project and datasource names only. `kata env run <env> -- <command...>` resolves IDs/typeIds by exact online matches before each run. Linked Git worktrees automatically reuse the main worktree's single store through Git common-dir, so Cookies are not copied. Use `kata env list`, `kata env show <env>`, `kata env doctor <env>`, and `kata env cookie set <env> --stdin`; command output is always secret-free. Migrate the former tracked profiles once with `kata env migrate-dataassets --apply`.

## Repository layout

```text
kata/
├── .claude/                       # Claude Code runtime
│   ├── skills/                    # 8 business skills (single source)
│   ├── scripts/_shared/           # CLI, lib, schemas, lint, tests
│   ├── plugins/                   # lanhu / zentao / notify
│   ├── rules/                     # project workflow rules
│   └── hooks/                     # write / command guards
├── .agents/                       # Codex skill adapter directory
├── .codex-plugin/                 # Codex plugin manifest (plugin.json)
├── docs/                          # architecture, audit, skill, and troubleshooting docs
└── workspace/                     # user project artifacts; no source cache or auth-session runtime tree
```

## Development and verification

Common commands:

```bash
# Full test suite
bun --no-env-file test

# Check runtime skill sync, detach, and structure contracts (.claude <-> .agents)
bun run check:skills
```

Schemas and sync exceptions live under `.claude/scripts/_shared/schemas/**` and the Codex adapter directory; Codex reuses skill bodies from `.claude/skills/` through symlinks, with zero copies.

## License

MIT
