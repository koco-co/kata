<p align="center">
  <strong>Turn requirements, test cases, automation, and evidence into one reviewable QA workflow.</strong>
</p>

<p align="center">
  <a href="./README.md">中文</a> ·
  <a href="./INSTALL.md">Installation</a> ·
  <a href="./config/README.md">Configuration</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D22-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js 22 or newer" />
  <img src="https://img.shields.io/badge/Bun-required-000000?style=flat-square&logo=bun&logoColor=white" alt="Bun required" />
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="MIT License" />
</p>

# Kata

Kata is a QA workspace for Claude Code and OpenAI Codex. It turns requirements analysis, test cases, defect triage, Playwright automation, infrastructure diagnosis, and project knowledge into reusable Skills and CLI workflows. Every artifact has a defined home and a reviewable execution trail.

## The short version

```text
Requirements / design ──> decompose ────────> cases and knowledge
Existing cases / bugs ──> normalize and triage -> actionable findings
Cases / failures ───────> Playwright ───────> runs, screenshots, reports
Servers / data sources ─> controlled checks ──> redacted conclusions
```

The goal is not more generated prose. It is traceability from input to command to evidence:

- `.claude/skills/` is the single source of truth for Skill content; `.agents/skills/` is the Codex-side symlink.
- The shared CLI lives under `cli/`; both runtimes reuse the same implementation.
- Project inputs, cases, automation, and run artifacts live under `workspace/{project}/`.
- Platform cookies, plugin credentials, infrastructure credentials, and data-source details stay in ignored local files and never enter Git.

## Capability map

| Entry point | Use it for | Main artifacts |
| --- | --- | --- |
| `/test-case` | Draft, edit, sync, and normalize cases from requirements | YAML / XMind / traceable SourceRefs |
| `/ui-automation` | Turn feature cases into real Playwright automation | specs, run folders, Allure, screenshots |
| `/defect-analyze` | Analyze stacks, HTTP failures, conflicts, or diffs | root cause, impact, repair guidance |
| `/infra-diagnose` | Check SSH2 connectivity for servers and data sources | redacted Markdown reports |
| `/domain-knowledge` | Query or maintain product rules and terminology | reusable domain knowledge |
| `/workspace-management` | Create, repair, and inspect Kata workspaces | standardized workspace structure |

## Quick start

### Prerequisites

- Node.js `>= 22.0.0`
- Bun
- Git
- Claude Code or OpenAI Codex

### Install

```bash
bun install --frozen-lockfile
bun link   # link the kata command into Bun's global bin directory
bun run ci
```

Install Playwright browsers only when you need real browser runs:

```bash
bunx playwright install
```

### Create local configuration

Kata no longer auto-loads a root `.env`. Configuration is split by purpose; examples contain fields and placeholders only:

```bash
# Platform URL and cookie
kata env add ci63 --url https://platform.example
printf '%s' "$COOKIE" | kata env cookie set ci63 --stdin
kata env doctor ci63 --offline

# Plugin configuration: copy templates and fill them locally
cp config/examples/integrations/lanhu.example.yaml config/private/integrations/lanhu.yaml
cp config/examples/integrations/zentao.example.yaml config/private/integrations/zentao.yaml
cp config/examples/integrations/notify.example.yaml config/private/integrations/notify.yaml

# Infrastructure configuration: fill only on this machine
cp config/examples/infrastructure/hosts.example.yaml config/private/infrastructure/hosts.yaml
cp config/examples/infrastructure/data_sources.example.yaml config/private/infrastructure/data_sources.yaml
cp config/examples/infrastructure/credentials.example.yaml config/private/infrastructure/credentials.yaml
kata config doctor
```

## Interactive TUI

You can open an interactive terminal UI to browse projects, versions, and features, then run `Lint/Build` on a feature:

```bash
kata                              # enter TUI on a TTY
kata tui                          # explicit TUI entry
kata --no-interactive <command>   # scripts, CI, or model calls keep plain CLI output
kata cases build 16212 --project dataAssets
```

`kata cases build <requirementId>` opens the matching feature build page on a TTY. Entry contract and approved scope are documented in [docs/kata-tui-architecture.md](docs/kata-tui-architecture.md).

## Configuration boundaries

| Directory | Contents | Tracked |
| --- | --- | --- |
| `config/policies/` | artifact routing, lint, SQL dialect and XMind mapping contracts | tracked |
| `config/private/` | private environments, integrations, infrastructure and repository config | whole directory gitignored |
| `config/examples/` | redacted templates mirroring `config/private/` | tracked |
| `config/automation/` | Playwright runtime behavior settings | tracked |

`config/private/environments/<env>.yaml` is the shared source for Playwright and DTStack platform access: the URL lives in `url` and the cookie in `auth.cookie`. There is no separate DTStack session file or legacy persistent variable path. Explicit one-off or CI overrides may still be passed as environment variables.

Restrict local permissions:

```bash
chmod 700 config/private/environments config/private/integrations config/private/infrastructure
chmod 600 config/private/environments/*.yaml config/private/integrations/*.yaml config/private/infrastructure/*.yaml
```

Infrastructure diagnosis uses type-specific default profiles: `server-default` for servers and `data-source-default` for data sources. An explicit `credential_ref` wins. Defaults belong only in the local `config/private/infrastructure/credentials.yaml`; failures return a redacted actionable error, never cross-try credential types, and never run arbitrary remote commands.

## Case file flow

Historical cases belong only in `cases/imports/`; the sole editable intermediate is `cases/<case-set>.yaml`; and CSV, XLSX, Markdown, and XMind derivatives are written only by `kata cases build` to `cases/exports/`. Metadata records exact file names, not generic formats:

```yaml
meta:
  imports:
    - data-quality.csv
  exports:
    - data-quality.xmind
    - data-quality.md
```

Both `imports` and `exports` are relative to their respective directories. A build keeps only YAML-declared derivatives; omitting `exports` defaults to an XMind file named after the YAML source.
`kata cases lint --project <project>` verifies that every declared historical input exists in `cases/imports/`.

## Real automation runs

Playwright must be bound to an explicit run; do not leave `.runs/` directories in the repository:

```bash
kata runs exec <feature-path> --project dataAssets -- \
  kata env run ci63 -- bunx playwright test <spec>
```

Before delivery:

```bash
kata automation lint <feature-dir> --exit-code
kata automation lint --all-features --project dataAssets --exit-code
kata automation lint --shared --project dataAssets --exit-code
kata runs verify --project dataAssets --feature <feature-dir>
```

UI automation is only marked passed after the real script executes, assertions pass, Allure results are written, and the system under test creates the expected business record.

## Project layout

```text
kata/
├── .claude/skills/       # single source of truth for Skills
├── .agents/skills/       # Codex-side symlink
├── .codex-plugin/        # Codex plugin manifest
├── cli/                  # kata CLI and integrations
├── config/               # examples and local configuration boundaries
├── runtime/              # reusable database, Playwright, and runner support
├── tests/                # CLI, integration, and Skill tests
└── workspace/            # inputs, cases, runs, and reports
```

Skill artifacts are written to the matching feature directory. The run directory `runs/<run-id>/` carries the CLI-written `status.json` and `allure-results/`, plus screenshots, logs, and `handoff.md` from the delivery flow; never report an unexecuted scope as passed.

## Development and validation

```bash
bun install --frozen-lockfile
bun run check
bun run type-check
bun test --timeout 30000 ./tests ./cli/lib
bun run test:automation-lint
bun run ci
```

When public commands, directories, or artifacts change, update [README.md](./README.md) and [INSTALL.md](./INSTALL.md) together.

## License

MIT
