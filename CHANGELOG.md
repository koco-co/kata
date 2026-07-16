# Changelog

## 4.0.0-alpha.1 (2026-06-03)

### Breaking

- Removed the retired generated runtime source and its CLI/test/lint compatibility surface.
- Collapsed the project to a single first-class runtime: `.claude/**` is the only hand-maintained runtime implementation.

### Added

- An OpenAI Codex adapter that exposes the business skills with zero body copies via `.agents/skills/` whole-dir symlinks plus `.codex-plugin/plugin.json`.
- The `using-kata-codex` session bootstrap for Codex tool-name mapping.

### Changed

- Architecture is now a single `.claude/**` runtime: `skills/` (8 business skills triggered by `SKILL.md` frontmatter), `scripts/_shared/**` (the kata CLI, lib, schemas, and lint), `plugins/` (lanhu / zentao / notify), and `rules/`. Routing is a prompt-level table in `CLAUDE.md`.
- Rewrote `README.md`, `README-EN.md`, and `docs/**` to describe the `.claude/**` single runtime plus adapter directories.

### Removed

- Cleaned up ~14k lines of dead runtime code; see `docs/audit/2026-06-02-runtime-audit.md` for the full audit and batch breakdown.

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
