<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/Kata-4.0_AI_Core-2563EB?style=for-the-badge">
  <img alt="Kata 4.0 AI Core" src="https://img.shields.io/badge/Kata-4.0_AI_Core-2563EB?style=for-the-badge">
</picture>

# Kata

### AI Core driven QA workflows and coding-agent runtimes

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

Kata is not a single script. It is a contract-driven AI Core workflow system:

```text
PRD / Lanhu / design source ── /case-draft ───────> Archive MD + XMind
Existing case artifacts ────── /case-edit ──> Normalize, sync, convert
Project business knowledge ─── /knowledge-curate ──> Query, update, maintain
Failure / bug / conflict ───── /bug-file and peers ────> Reports, hotfix cases, conflict notes
UI cases / test results ────── /playwright-automation ─> UI plans, Playwright scripts, triage
Code diff ──────────────────── /diff-scan ───────> Reproducible defect reports
```

Core principles:

- `.ai/core/**` is the source of truth for skills, commands, workflows, agents, prompts, schemas, and runtime guards.
- `.agents/**` and `.claude/**` are generated projections for the kata Codex runtime and Claude Code runtime.
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

The table below is generated from `.ai/core/commands/*.command.yaml`; it is the README source of truth for user-invocable commands.

<!-- ai-core:start command-index -->
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
<!-- ai-core:hash 2d3aee943263895aa5fea9eb96576a355222df28576de1a3579e3660ce4da0ab -->
<!-- ai-core:end command-index -->

Common entry points:

- New projects, menus, and workspace checks: `/workspace-manage`
- Generate cases from PRDs or design sources: `/case-draft`
- Sync or convert existing case artifacts: `/case-edit`
- Maintain business knowledge: `/knowledge-curate`
- UI automation: use `/playwright-automation` for planning, generation, execution, and triage

## Architecture

See the detailed [Kata 4.0 project architecture design](./docs/architecture/kata-project-architecture.md); the AI Core subsystem is documented in [AI Core architecture design](./docs/architecture/ai-core-architecture.md).

![Kata project architecture](./assets/diagrams/kata-project-overview.svg)

Kata 4.0 uses `.ai/core` as the contract control plane, `engine` as the execution and verification layer, `.agents` / `.claude` as runtime projections, and `workspace/{project}` as the artifact area:

```text
.ai/core contracts
  ├─ skills / commands / workflows
  ├─ agents / prompts / schemas / guards
  ├─ runtime manifests / projection inventory
  └─ evals / docs generated blocks
        │
        ├──> .agents/**  kata Codex runtime projection
        └──> .claude/**  Claude Code runtime projection
```

<!-- ai-core:start runtime-support -->
| Runtime / Boundary | Current responsibility |
| --- | --- |
| `.ai/core/**` | AI Core contract source for skills, commands, workflows, agents, prompts, schemas, guards, and runtime manifests. |
| `.agents/**` | kata Codex runtime projection generated from `.ai/core`; do not edit generated content by hand. |
| `.claude/**` | Claude Code runtime projection generated from `.ai/core`; do not edit generated content by hand. |
| `workspace/{project}/**` | Project artifact area for PRD derivatives, Archive MD, XMind, reports, Playwright outputs, and project knowledge. |
| `workspace/{project}/.kata/repos/**` | Read-only source evidence area; kata workflows must not push, commit, or write business files there. |
<!-- ai-core:hash 97fcb86f90d99c917e6960b9421c1983666d8733ba1da2a09b3e728093daccdd -->
<!-- ai-core:end runtime-support -->

At runtime, agents read `.ai/core` contracts and runtime projections, then read/write project artifacts through `workspace/{project}/`. Write boundaries, SourceRefs, secret refs, projection locks, parser boundary audits, and golden evals are checked by AI Core gates.

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
├── .ai/core/        # AI Core contract source
├── .agents/         # kata Codex runtime projection
├── .claude/         # Claude Code runtime projection
├── engine/          # CLI, AI Core checks, workflow support, and tests
├── plugins/         # lanhu / zentao / notify
├── tools/           # standalone toolkits
├── templates/       # project skeletons and output templates
└── workspace/       # user project artifacts; source copies live in .kata/repos/{project}/
```

## Development and verification

Common commands:

```bash
# AI Core focused tests
bun run test:ai-core

# AI Core lint/gates/docs/parser/projection chain
bun run lint:ai-core

# Full engine test suite
bun --no-env-file test --cwd engine

# Regenerate AI Core managed README/CHANGELOG blocks
bun --no-env-file engine/bin/kata ai-core docs render

# Check managed block drift
bun --no-env-file engine/bin/kata ai-core docs check
```

When changing runtime behavior, edit `.ai/core/**` first, then run projection/docs/gate commands to regenerate and verify projections. Do not hand-edit generated content under `.agents/**` or `.claude/**`.

## License

MIT
