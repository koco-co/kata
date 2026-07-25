<p align="center">
  <img src="./assets/diagrams/kata-project-overview.svg" alt="Kata project structure" width="860" />
</p>

# Kata

### QA workflows for Claude Code and OpenAI Codex

Kata packages requirements analysis, test design, defect investigation, and UI automation as reusable skills. Inputs may include PRDs, designs, bug records, code diffs, existing cases, or test results. Outputs are written to explicit project directories with reviewable run records.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Bun](https://img.shields.io/badge/Bun-required-000000?style=flat-square&logo=bun&logoColor=white)](https://bun.sh/)
[![Version](https://img.shields.io/badge/version-4.0.0--alpha.1-blue.svg?style=flat-square)](./package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

**English** | **[中文](./README.md)**

## 30-second overview

```text
PRD / design / feature notes ───── case ───────────────> cases.yaml + XMind
Existing cases / bug records ──── case ────────────────> Edit, sync, hotfix regression
Project knowledge ─────────────── knowledge ───────────> Query and maintain
Bug / conflict / code diff ────── defect-analyze ──────> Analysis and repair plan
UI cases / scripts / failures ── ui-automation ────────> Scripts, runs, reports
Connectivity failures ─────────── infra-diagnose ──────> Root cause and playbook
```

The repository follows four boundaries:

- `.claude/**` contains Claude Code skills and plugins.
- `.agents/**` contains native Codex skills; both runtimes are maintained independently and share no prompt bodies.
- The shared CLI lives under `cli/**` and serves both runtimes.
- Project artifacts live under `workspace/{project}/`. Source repositories are configured in `config/source-repos.yaml`, cloned into `.repos/` (gitignored), and queried via `kata repos`.

## Quick start

### Prerequisites

| Tool | Requirement | Purpose |
| --- | --- | --- |
| Node.js | `>= 22.0.0` | TypeScript and Bun toolchain |
| Bun | Installed | Dependencies, CLI commands, and tests |
| Git | Installed | Repository and external source management |
| Claude Code or Codex | At least one | Runs the matching skills |

### Install

```bash
bun install --frozen-lockfile
[ -f .env ] || cp .env.example .env
bun run ci
```

Install browsers only when running real browser tests:

```bash
bunx playwright install
```

See [INSTALL.md](./INSTALL.md) for the full setup.

## Current capabilities

| Command | Area | Summary |
| --- | --- | --- |
| `/test-case` | Cases | Draft from requirement sources, edit existing cases, generate hotfix regression cases from bugs. |
| `/ui-automation` | UI automation | Generate, repair, or verify Playwright UI automation with real runs before delivery. |
| `/defect-analyze` | Defects and changes | Analyze bug material, merge conflicts, or code diffs. |
| `/infra-diagnose` | Infrastructure | Diagnose datasource and server connectivity failures over SSH. |
| `/domain-knowledge` | Knowledge | Query or maintain project rules, terms, and constraints. |
| `/workspace` | Workspace | Create, check, or repair project workspace skeletons. |

Routing follows the requested action, not only the input extension: editing a case and turning a case into UI automation are different entry points; see the routing rules in CLAUDE.md.

## Claude Code and Codex

| Runtime | Skill directory | Approach |
| --- | --- | --- |
| Claude Code | `.claude/skills/` | Native Claude skills, maintained independently. |
| OpenAI Codex | `.agents/skills/` | Native Codex skills, maintained independently. |

Both sides express the same business conventions in their native formats without sharing prompt bodies; shared capabilities live in `cli/`. Skills do not pin a model, agent count, or mechanical stage list. They define triggers, inputs, outputs, safety boundaries, and completion states.

## Configuration and security

The root `.env` is the only dotenv file. Each DataAssets platform lives in a local ignored file at `config/env/<env>.yaml`:

```bash
chmod 700 config/env
chmod 600 config/env/*.yaml
chmod 600 .env
```

Common commands:

```bash
kata env list
kata env show <env>
kata env doctor <env>
kata env cookie set <env> --stdin
kata env run <env> -- <command...>
```

`env run` inherits only the small set of variables required to start a child process. Add a required variable explicitly with `--inherit-env NAME1,NAME2`. Command output must never reveal cookies, tokens, or passwords.

Source repositories are configured in `config/source-repos.yaml` (project, local relative path, branch, description, writable) and cloned into `.repos/` (gitignored). Query them with `kata repos list|sync-env|show|grep`; update or switch with `kata repos pull|checkout`. Repos marked `writable: false` reject push, commit, and add.

## Repository layout

```text
kata/
├── .claude/                       # Claude Code skills and plugins
│   ├── skills/
│   ├── plugins/
│   └── packages/
├── .agents/                       # Codex skills
│   └── skills/
├── cli/                           # kata CLI (shared by both runtimes)
├── config/                        # source-repos.yaml etc.; secrets (env/, infra/) untracked
├── docs/                          # Guides, contracts, and design records
└── workspace/                     # Project inputs, cases, automation, and runs
```

Automation runs should keep `manifest.yaml`, `run.json`, a short summary, and trace or screenshot artifacts. Use explicit states such as `draft`, `ready`, `generated-not-run`, `passed`, `failed`, or `blocked`; never report an unexecuted scope as passed.

## Development and verification

```bash
bun install --frozen-lockfile
bun run check
bun run type-check
bun run test
bun run ci
```

See [docs/DOCS-STYLE-GUIDE.md](./docs/DOCS-STYLE-GUIDE.md) for documentation conventions. Public command, directory, or artifact changes must update both READMEs and the installation guide.

## License

MIT
