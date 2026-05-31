# Changelog

## Unreleased

### Breaking

- Removed the retired generated runtime source and its CLI/test/lint compatibility surface.
- Claude Code maintains `.claude/**` as the single runtime implementation.

### Added

- Added Router contracts under runtime `contracts/routes/*.yaml`.
- Added runtime `contracts/skill-graph.yaml` as the skill graph.
- Added workflow contracts for case-draft, case-edit, case-hotfix, and playwright-automation.
- Added Blackboard schema and state model under runtime `contracts/**`.
- Added `bun run check:skills` coverage for runtime sync, runtime detach, route, skill graph, and workflow checks.

### Changed

- Project architecture now follows `SKILL + Router + Graph + Workflow + Blackboard`.
- `CLAUDE.md` is the hand-maintained public entrypoint for the Claude Code runtime.

## 3.0.0-alpha.1 (2026-04-29)

### v3 Architecture Redesign

- **Engine lift**: `.claude/scripts/` -> `engine/` as npm workspace package.
- **Workspace reorg**: `prds/archive/xmind/` -> `features/{ym}-{slug}/` aggregation.
- **Testing**: migrated from `node:test` to `bun:test`.
- **CLI tools**: bucket-audit, fix-truthy codemod, skills audit, paths audit, cases lint.
- **Runtime audit**: Claude Code runtime design and audit commands.
- **Hooks**: Claude Code hooks for bash/edit lifecycle checks.
- **Skills**: Product skills on a SKILL/workflow/rules/references contract.
- **Docs**: README and CLAUDE.md updated for v3 workspace layout.

## 2.0.0 (2026-04-01)

- Initial release with Claude Code Skills integration.
- QA workflow engine with test-case-gen, ui-autotest, case-format skills.
- Plugin system for Lanhu, Zentao, and notifications.
