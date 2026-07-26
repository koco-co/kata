<p align="center">
  <img src="./assets/diagrams/kata-project-overview.svg" alt="Kata project structure" width="860" />
</p>

# Kata

## QA workflows for Claude Code and OpenAI Codex

Kata packages requirements analysis, test design, defect investigation, and UI automation as reusable skills. Inputs may include PRDs, designs, bug records, code diffs, existing cases, or test results. Outputs are written to explicit project directories with reviewable run records.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Bun](https://img.shields.io/badge/Bun-required-000000?style=flat-square&logo=bun&logoColor=white)](https://bun.sh/)
[![Version](https://img.shields.io/badge/version-4.0.0--alpha.1-blue.svg?style=flat-square)](./package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

**English** | **[中文](./README.md)**

## 30-second overview

```text
PRD / design / feature notes ───── case ───────────────> cases.yaml + XMind
Existing cases ────────────────── case ────────────────> Edit, sync, and standardize
Project knowledge ─────────────── knowledge ───────────> Query and maintain
Bug / conflict / code diff ────── defect-analyze ──────> Analysis and repair plan
UI cases / scripts / failures ── ui-automation ────────> Scripts, runs, reports
Connectivity failures ─────────── infra-diagnose ──────> Root cause and playbook
```

The repository follows four boundaries:

- `.claude/skills/` contains Claude Code skills; integrations live under `cli/integrations/`.
- `.agents/skills/` is a symlink to `.claude/skills/`, so both runtimes use the same skill source.
- The shared CLI lives under `cli/**` and serves both runtimes.
- Project artifacts live under `workspace/{project}/`. Source repositories are configured locally in ignored `config/repos/sources.yaml` (copy `config/repos/sources.example.yaml` first), cloned into `.repos/` (gitignored), and queried via `kata repos`.

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
| `/test-case` | Cases | Draft from requirement sources, edit existing cases, sync, and standardize. Route hotfix regression to `/defect-analyze`. |
| `/ui-automation` | UI automation | Generate, repair, or verify Playwright UI automation with real runs before delivery. |
| `/defect-analyze` | Defects and changes | Analyze bug material, merge conflicts, or code diffs. |
| `/infra-diagnose` | Infrastructure | Diagnose datasource and server connectivity failures over SSH. |
| `/domain-knowledge` | Knowledge | Query or maintain project rules, terms, and constraints. |
| `/workspace-management` | Workspace | Create, check, or repair project workspace skeletons. |

Routing follows the requested action, not only the input extension: editing an existing case and turning a case into UI automation are different entry points.

## Claude Code and Codex

| Runtime | Skill directory | Approach |
| --- | --- | --- |
| Claude Code | `.claude/skills/` | Canonical skill source. |
| OpenAI Codex | `.agents/skills/` | Symlink to the Claude skill directory. |

Both runtimes use the same skill source; shared capabilities live in `cli/`.

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

# Playwright results must be scoped to feature/runs/<run-id>
kata runs exec <feature-id> --project dataAssets -- kata env run <env> -- bunx playwright test <spec>
```

Running Playwright without an allocated run fails; `.runs/` temporary result directories are forbidden.

`env run` inherits only the small set of variables required to start a child process. Add a required variable explicitly with `--inherit-env NAME1,NAME2`. Command output must never reveal cookies, tokens, or passwords.

Infrastructure access is split across local-only `config/infra/hosts.yaml`, `data_sources.yaml`, and `credentials.yaml`; the repository tracks only the three `*.example.yaml` files. Use the CLI to inspect and write them:

```bash
kata config doctor
kata infra credentials set <name> --username <username>
kata infra trust-host <host> --fingerprint <SHA256-fingerprint>
kata infra inspect <host> --check connectivity --project <project>
```

The current inspect command verifies SSH2 connectivity and writes `analyses/infra-report/<yyyymm>/<slug>.md`; it does not execute arbitrary remote commands or server changes.

Validate bug, conflict, scan, and hotfix reports with `kata defects lint --report <report.md> --exit-code`; generate hotfix Markdown with `kata defects hotfix`, not through `test-case`.

Source repositories are configured locally in ignored `config/repos/sources.yaml` (copy `config/repos/sources.example.yaml` first) and cloned into `.repos/` (gitignored). Query them with `kata repos list|sync-env|show|grep`; update or switch with `kata repos pull|checkout`. Repos marked `writable: false` reject push, commit, and add.

## Repository layout

```text
kata/
├── .claude/                       # Claude Code skills
│   └── skills/
├── .agents/                       # Codex skill symlink
│   └── skills/
├── cli/                           # kata CLI (shared by both runtimes)
├── config/                        # repos/sources.yaml etc.; secrets (env/, infra/) untracked
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

Public command, directory, or artifact changes must update both READMEs and the installation guide.

## License

MIT
