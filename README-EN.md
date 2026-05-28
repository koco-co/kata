<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/Kata-4.0_Runtime-2563EB?style=for-the-badge">
  <img alt="Kata 4.0 Runtime" src="https://img.shields.io/badge/Kata-4.0_Runtime-2563EB?style=for-the-badge">
</picture>

# Kata

### SKILL + Router + Graph + Workflow + Blackboard driven QA runtimes

Kata turns QA work into auditable product skills: it can derive test cases, reports, Playwright scripts, and project knowledge from PRDs, design sources, bugs, code diffs, UI cases, and test results.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Bun](https://img.shields.io/badge/Bun-required-000000?style=flat-square&logo=bun&logoColor=white)](https://bun.sh/)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Skills-7C3AED?style=flat-square)](https://claude.com/claude-code)
[![Codex](https://img.shields.io/badge/Codex-runtime-111827?style=flat-square)](./AGENTS.md)
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
Failure / bug / conflict ───── /bug-file and peers ────> Reports, hotfix cases, conflict notes
UI cases / test results ────── /playwright-automation ─> UI plans, Playwright scripts, triage
Code diff ──────────────────── /diff-scan ───────> Reproducible defect reports
```

Core principles:

- `.agents/**` and `.claude/**` are first-class runtime directories for the kata Codex runtime and Claude Code runtime.
- Runtime contracts live under `.agents/contracts/**` and `.claude/contracts/**`; shared agent documents use symlinks to keep a single file source.
- Project artifacts are written under `workspace/{project}/`; source evidence lives under `.kata/repos/{project}/**` and is read-only.
- `playwright-cli` keeps its vendor skill name for real browser automation; kata-owned product skills do not reuse old aggregate names.

## Quick start

### Prerequisites

| Tool | Requirement | Purpose |
| --- | --- | --- |
| Node.js | `>= 22.0.0` | Runs the TypeScript/Bun toolchain |
| Bun | Installed | Installs dependencies and runs tests/CLI commands |
| Git | Installed | Manages this repo and project source evidence |
| Claude Code or Codex | Recommended | Uses the `.claude/**` / `.agents/**` runtime skills |

### Install

Start with [INSTALL.md](./INSTALL.md) when setting up a new machine. Manual setup:

```bash
bun install
[ -f .env ] || cp .env.example .env
kata config
bun test --cwd engine
```

Install browsers only when you need real browser automation or Playwright execution:

```bash
bunx playwright install
```

Then open Claude Code or Codex and run:

```text
/workspace-manage
```

## Current capabilities

The table below is the current public capability surface. Runtime entrypoints are `AGENTS.md`, `CLAUDE.md`, `.agents/**`, and `.claude/**`.

| Command | Area | Skill | Summary |
| --- | --- | --- | --- |
| `/workspace-manage` | Workspace | `workspace-manage@1` | Show the feature menu and manage kata project workspaces. |
| `/case-draft` | Case generation | `case-draft@1` | Generate QA test cases from requirements, PRDs, or design sources. |
| `/case-edit` | Case maintenance | `case-edit@1` | Edit, sync, convert, or normalize existing QA case artifacts. |
| `/knowledge-curate` | Knowledge | `knowledge-curate@1` | Query or update project business knowledge and rules. |
| `/bug-file` | Defects and changes | `bug-file@1` | Turn observed failures into evidence-backed bug reports. |
| `/conflict-analyze` | Defects and changes | `conflict-analyze@1` | Analyze merge conflicts and produce resolution notes. |
| `/case-hotfix` | Defects and changes | `case-hotfix@1` | Generate hotfix regression cases from bugs or fix records. |
| `/playwright-automation` | UI automation | `playwright-automation@1` | Plan, generate, run, triage, and repair Playwright UI automation before handoff. |
| `/diff-scan` | Code scanning | `diff-scan@1` | Scan code diffs for reproducible defects. |
| `/infra-diagnose` | Infra diagnosis | `infra-diagnose@1` | SSH into servers to diagnose and fix datasource/server connectivity failures. |

### Usage examples

Run these commands directly in the Claude Code or Codex runtime:

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

# 6. Bug report — turn observed failures into evidence-backed bug reports
/bug-file

# 7. Conflict analysis — analyze merge conflicts and produce resolution notes
/conflict-analyze

# 8. Hotfix regression cases — generate regression tests from bugs or fix records
/case-hotfix

# 9. Code scanning — scan code diffs for reproducible defects
/diff-scan

# 10. Infra diagnosis — SSH into servers to diagnose connectivity failures
/infra-diagnose
```

## Architecture

![Kata project architecture](./assets/diagrams/kata-project-overview.svg)

Kata uses `.agents/**` and `.claude/**` as first-class runtime implementations, runtime-local contracts for schemas, routes, the skill graph, workflows, and the blackboard, `engine` as the execution and verification layer, and `workspace/{project}` as the artifact area:

```text
.agents/    kata Codex runtime skills and contracts
.claude/    Claude Code runtime skills and contracts
engine/**    CLI, validators, tests, and workflow support
```

| Runtime / Boundary | Current responsibility |
| --- | --- |
| `.agents/**` | kata Codex runtime skills and references, maintained as a first-class runtime. |
| `.claude/**` | Claude Code runtime skills and references, maintained as a first-class runtime. |
| `.agents/contracts/**` / `.claude/contracts/**` | Runtime contracts; shared content should use symlinks to keep a single file source. |
| `workspace/{project}/**` | Project artifact area for PRD derivatives, Archive MD, XMind, reports, Playwright outputs, and project knowledge. |
| `workspace/{project}/.kata/repos/**` | Read-only source evidence area; kata workflows must not push, commit, or write business files there. |

At runtime, agents read their runtime skill plus same-side `contracts/**`, then read/write project artifacts through `workspace/{project}/`. Write boundaries, SourceRefs, schemas, and sync checks are enforced by engine validators and runtime checks.

## Plugins

Built-in plugins live under `plugins/` and attach to product skills through hooks.

| Plugin | Hook | Required configuration |
| --- | --- | --- |
| `lanhu` | `case-draft:init` | `KATA_LANHU_COOKIE` |
| `zentao` | `case-hotfix:init` | `KATA_ZENTAO_BASE_URL`, `KATA_ZENTAO_ACCOUNT`, `KATA_ZENTAO_PASSWORD` |
| `notify` | `*:output` | At least one channel: `KATA_DINGTALK_WEBHOOK_URL`, `KATA_FEISHU_WEBHOOK_URL`, `KATA_WECOM_WEBHOOK_URL`, `KATA_SMTP_HOST` |

Put credentials in `.env`. `.env.example` lists the supported `KATA_*` variables.

## Repository layout

```text
kata/
├── .agents/         # kata Codex runtime skills
├── .claude/         # Claude Code runtime skills
├── docs/            # Architecture, ADR, audit, skill, and troubleshooting docs
├── engine/          # CLI, runtime checks, workflow support, and tests
├── plugins/         # lanhu / zentao / notify
├── tools/           # standalone toolkits
├── templates/       # project skeletons and output templates
└── workspace/       # user project artifacts; source copies live in .kata/repos/{project}/
```

## Development and verification

Common commands:

```bash
# Full engine test suite
bun --no-env-file test --cwd engine

# Check runtime skill sync, detach, route, graph, and workflow contracts
bun run check:skills
```

Schemas, workflows, the skill graph, the blackboard, and sync exceptions live under runtime `contracts/**`; shared content is reused through symlinks.

## License

MIT
