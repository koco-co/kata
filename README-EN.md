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
PRD / design / feature notes ───── case-draft ───────────> Archive MD + XMind
Existing cases ─────────────────── case-edit ────────────> Edit, sync, convert
Project knowledge ──────────────── knowledge-curate ─────> Query and maintain
Bug / conflict / code diff ─────── defect-analyze ───────> Analysis and repair plan
UI cases / scripts / failures ──── playwright-automation > Scripts, runs, reports
SQL merge work ─────────────────── sql-merge-validate ───> Merged output and checks
```

The repository follows four boundaries:

- `.claude/**` contains Claude Code skills, rules, and runtime entry points.
- `.agents/**` contains Codex skills. `case-draft` and `playwright-automation` are native Codex skills; the remaining skills keep transitional adapters until migrated.
- Shared CLI, schemas, validators, and runtime code currently live under `.claude/scripts/_shared/**`. The runtimes share code, not prompt bodies.
- Project artifacts live under `workspace/{project}/`. Source repositories are read-only external directories declared in `.env`; no project-local source cache is created.

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
kata workspace verify
bun run ci
```

Install browsers only when running real browser tests:

```bash
bunx playwright install
```

See [INSTALL.md](./INSTALL.md) for the full setup.

## Current capabilities

| Command | Area | Skill | Summary |
| --- | --- | --- | --- |
| `/workspace-manage` | Workspace | `workspace-manage@1` | Show entry points and manage project workspaces. |
| `/case-draft` | Case generation | `case-draft@1` | Draft test cases from requirements, PRDs, designs, or feature notes. |
| `/case-edit` | Case maintenance | `case-edit@1` | Edit, sync, convert, or normalize existing cases. |
| `/knowledge-curate` | Knowledge | `knowledge-curate@1` | Query or maintain project rules, terms, and constraints. |
| `/defect-analyze` | Defects and changes | `defect-analyze@1` | Analyze bug material, merge conflicts, or code diffs. |
| `/case-hotfix` | Regression cases | `case-hotfix@1` | Generate Hotfix regression cases from bugs or fix records. |
| `/playwright-automation` | UI automation | `playwright-automation@1` | Review, generate, run, or repair Playwright automation. |
| `/infra-diagnose` | Infrastructure | `infra-diagnose@1` | Diagnose datasource and server connectivity failures. |
| `/sql-merge-validate` | SQL validation | `sql-merge-validate@1` | Merge SQL changes and validate structure, dependencies, and output. |

Routing follows the requested action, not only the input extension. Use `case-edit` when the goal is to change cases. Use `playwright-automation` when existing cases should become UI automation.

## Claude Code and Codex

| Runtime | Skill directory | Current approach |
| --- | --- | --- |
| Claude Code | `.claude/skills/` | Native Claude skills, maintained independently. |
| OpenAI Codex | `.agents/skills/` | Native skills for the core workflows, transitional adapters elsewhere. |

A Codex session starts with `.agents/skills/using-kata-codex/SKILL.md`. Native Codex skills do not pin a model, agent count, or mechanical stage list. They define triggers, inputs, outputs, safety boundaries, and completion states.

See [docs/CODEX-SKILLS.md](./docs/CODEX-SKILLS.md) for migration details.

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

External source repositories are declared with:

```dotenv
KATA_SOURCE_REPO_ROOT=/absolute/path/to/repos
KATA_SOURCE_REPOS=https://example/repo-a.git,https://example/repo-b.git
```

Use `kata repos show|grep|list` for read-only source queries.

## Repository layout

```text
kata/
├── .claude/                       # Claude Code skills and rules
│   ├── skills/
│   ├── scripts/_shared/           # CLI, schemas, validators, tests
│   └── plugins/
├── .agents/                       # Codex skills
│   └── skills/
├── .codex-plugin/                 # Codex plugin metadata
├── config/                        # Local templates; secrets stay untracked
├── docs/                          # Guides, contracts, and design records
└── workspace/                     # Project inputs, cases, automation, and runs
```

Automation runs should keep `manifest.yaml`, `run.json`, a short summary, and trace or screenshot artifacts. Use explicit states such as `draft`, `ready`, `generated-not-run`, `passed`, `failed`, or `blocked`; never report an unexecuted scope as passed.

## Development and verification

```bash
bun install --frozen-lockfile
bun run check
bun run lint:agents
bun run lint:skills:codex
bun run type-check
bun run test
bun run ci
```

See [docs/contracts/CLI-CONTRACT.md](./docs/contracts/CLI-CONTRACT.md) for CLI behavior and [docs/DOCS-STYLE-GUIDE.md](./docs/DOCS-STYLE-GUIDE.md) for documentation conventions. Public command, directory, or artifact changes must update both READMEs, the installation guide, and the changelog.

## License

MIT
