# AI Core Phase 4a Inventory

Date: 2026-05-28

Phase 4a keeps `.ai/core/**` in the worktree as a read-only historical source, but removes it from current runtime ownership. Phase 4b will delete it after at least one PR cycle.

## `.ai/core/**` Snapshot

`find .ai/core -type f | wc -l` reports 288 files.

| Area | Files | Phase 4a disposition |
| --- | ---: | --- |
| `schemas/` | 81 | Runtime-used schemas copied to `docs/skills/contracts/schemas/**`; the rest remain historical until Phase 4b. |
| `rules/` | 8 | Copied to `docs/skills/contracts/rules/**`; project entry points link `docs/skills/contracts/project-workflow-rules.md`. |
| `skills/` | 52 | Superseded by `.agents/skills/**` and `.claude/skills/**`. |
| `commands/` | 10 | Superseded by `AGENTS.md` / `CLAUDE.md` command indexes. |
| `workflows/` | 10 | Superseded incrementally by `docs/skills/contracts/workflows/**`; Phase 3A only covers `case-draft`. |
| `agents/` | 12 | Historical until Phase 4b; no Phase 4a runtime dependency. |
| `prompts/` | 10 | Historical until Phase 4b; no Phase 4a runtime dependency. |
| `runtimes/` | 16 | Projection inventory and lock are deprecated; only available through `kata ai-core --allow-deprecated ...`. |
| `plugins/` | 10 | Runtime plugin metadata copied to `docs/skills/contracts/plugins/**`; `.ai/core/plugins/**` remains historical until Phase 4b. |
| Other support dirs | 79 | Evals, docs blocks, imports, runners, guards, exceptions, source refs, and external skill records remain historical compatibility data. |

## Migrated Schemas

The following schemas are loaded by non-`ai-core` engine code or tests and were copied to `docs/skills/contracts/schemas/**`:

- `CaseCorrections.v1.schema.json`
- `CoverageMatrix.v1.schema.json`
- `FeatureManifest.v2.schema.json`
- `FeatureMetadata.v1.schema.json`
- `FeatureSourceSnapshot.v1.schema.json`
- `PlaywrightAutomationHandoff.v2.schema.json`
- `SourceRefRegistry.v1.schema.json`
- `SourceSnapshot.v1.schema.json`
- `source-ref-registry.yaml`

`blackboard-state.json` was already created under `docs/skills/contracts/schemas/**` during Phase 3A.

## Migrated Rules

The Phase 4a rule copies live under `docs/skills/contracts/rules/**`:

- `case-qa.md`
- `comments.md`
- `git-workflow.md`
- `naming-convention.md`
- `repo-readonly.md`
- `routing-guard.md`
- `testing.md`
- `workspace-boundary.md`

Rules that need to be visible from root runtime entry points are also summarized in `docs/skills/contracts/project-workflow-rules.md`.

## Migrated Plugin Metadata

The plugin runtime metadata used by `config`, `plugin-loader`, and `case-draft` was copied from `.ai/core/plugins/**` to `docs/skills/contracts/plugins/**`:

- `fixture-design-source/plugin.yaml` and fixtures
- `lanhu/plugin.json`, `lanhu/plugin.yaml`, `lanhu/runtime.json`
- `notify/plugin.json`, `notify/runtime.json`
- `zentao/plugin.json`, `zentao/runtime.json`

Non-`ai-core` plugin loaders now read `docs/skills/contracts/plugins/**` and only compare against `plugins/**` as legacy implementation metadata.

## Deprecated CLI Surface

`kata ai-core` now defaults to a deprecation no-op. The old commands remain temporarily available only with `kata ai-core --allow-deprecated ...`, so Phase 4a can keep compatibility tests while normal scripts stop running projection render/check/lock.

`scripts/run-ai-core-lint.ts` no longer calls projection commands; it delegates to `kata skills sync-check --exit-code`.

## Phase 4b Gate

Do not delete `.ai/**`, `engine/src/ai-core/**`, or `engine/tests/ai-core/**` in Phase 4a. Phase 4b requires a later PR cycle after this deprecation state has landed.
