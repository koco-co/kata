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
# DataAssets platform URL and cookie
kata env add ci63 --url https://platform.example
printf '%s' "$COOKIE" | kata env cookie set ci63 --stdin
kata env doctor ci63 --offline

# Plugin configuration: copy templates and fill them locally
cp config/plugin/lanhu.example.yaml config/plugin/lanhu.yaml
cp config/plugin/zentao.example.yaml config/plugin/zentao.yaml
cp config/plugin/notify.example.yaml config/plugin/notify.yaml

# Infrastructure configuration: fill only on this machine
cp config/infra/hosts.example.yaml config/infra/hosts.yaml
cp config/infra/data_sources.example.yaml config/infra/data_sources.yaml
cp config/infra/credentials.example.yaml config/infra/credentials.yaml
kata config doctor
```

If an older checkout still has a root `.env`, preview and then apply the plugin-only migration:

```bash
kata config plugins-migrate --source /path/to/old.env --root /path/to/kata
kata config plugins-migrate --source /path/to/old.env --root /path/to/kata --apply
```

The migration handles plugin fields only. Database URLs, old DTStack session paths, and unknown fields are not written into plugin YAML files.

## Configuration boundaries

| Directory | Contents | Tracked |
| --- | --- | --- |
| `config/env/` | DataAssets URLs, `auth.cookie`, and environment metadata | only `*.example.yaml` is tracked; real config stays local |
| `config/plugin/` | Lanhu, ZenTao, DingTalk / Feishu / WeCom / SMTP | only `*.example.yaml` is tracked; real config stays local |
| `config/infra/` | hosts, data sources, credential profiles, SSH fingerprints | only `*.example.yaml` is tracked; real config stays local |
| `config/repos/` | external source repository declarations | only `sources.example.yaml` is tracked; `sources.yaml` stays local |

`config/env/<env>.yaml` is the shared source for Playwright and DTStack platform access: the URL lives in `url` and the cookie in `auth.cookie`. There is no separate DTStack session file or legacy persistent variable path. Explicit one-off or CI overrides may still be passed as environment variables.

Restrict local permissions:

```bash
chmod 700 config/env config/plugin config/infra
chmod 600 config/env/*.yaml config/plugin/*.yaml config/infra/*.yaml
```

Infrastructure diagnosis uses type-specific default profiles: `server-default` for servers and `data-source-default` for data sources. An explicit `credential_ref` wins. Defaults belong only in the local `config/infra/credentials.yaml`; failures return a redacted actionable error, never cross-try credential types, and never run arbitrary remote commands.

## Real automation runs

Playwright must be bound to an explicit run; do not leave `.runs/` directories in the repository:

```bash
kata runs exec <feature-id> --project dataAssets -- \
  kata env run ci63 -- bunx playwright test <spec>
```

Before delivery:

```bash
kata automation lint <feature-dir> --exit-code
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
├── lib/                  # shared libraries (db connection strings, Playwright support)
├── tests/                # CLI, integration, and Skill tests
└── workspace/            # inputs, cases, runs, and reports
```

Skill artifacts are written to the matching feature directory. The run directory `runs/<run-id>/` carries the CLI-written `status.json` and `allure-results/`, plus screenshots, logs, and `handoff.md` from the delivery flow; never report an unexecuted scope as passed.

## Development and validation

```bash
bun install --frozen-lockfile
bun run check
bun run type-check
bun test
bun run ci
```

When public commands, directories, or artifacts change, update [README.md](./README.md) and [INSTALL.md](./INSTALL.md) together.

## License

MIT
