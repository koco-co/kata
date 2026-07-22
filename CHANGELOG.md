# Changelog

## Unreleased

### Security

- `kata env run` now passes a minimal child environment by default; extra variables require `--inherit-env`.
- DataAssets requests now use a fixed timeout and a bounded response body, and `env doctor` warns when a platform URL uses HTTP.

### Fixed

- Removed the filesystem-clock race from the Allure `sinceMtimeMs` test.
- Made `features lint` and `features index` require exactly one of `--project` or `--all`.
- Rejected zero, negative, and non-numeric values for `features clean --keep`.
- Made `features resolve` compute paths without creating directories while preserving the existing library default.
- Stopped `features migrate --apply` from changing the Git index unless `--stage` is supplied.
- Changed the features-index workflow from direct pushes to a read-only generated-file check.
- Added frozen lockfile installs and restored full repository, agent, Codex, and documentation checks in CI.

### Changed

- Added native Codex versions of `case-draft` and `playwright-automation`; Claude skill bodies remain unchanged.
- Reduced the root `AGENTS.md` to stable repository rules and moved configuration and workspace rules closer to their directories.
- Updated both READMEs and the installation guide for nine public skills, external source repositories, and the current environment layout.
- Removed the retired `config.example.json` route and the one-off migration workflow.

## 4.0.0-alpha.1 (2026-06-03)

### Breaking

- Removed the retired generated runtime source and its CLI/test/lint compatibility surface.
- Collapsed the project to a single first-class runtime: `.claude/**` is the only hand-maintained runtime implementation.

### Added

- An OpenAI Codex adapter that exposes the business skills with zero body copies via `.agents/skills/` whole-dir symlinks plus `.codex-plugin/plugin.json`.
- The `using-kata-codex` session bootstrap for Codex tool-name mapping.

### Changed

- Architecture is now a single `.claude/**` runtime: `skills/`, `scripts/_shared/**`, `plugins/`, and `rules/`. Routing is a prompt-level table in `CLAUDE.md`.
- Rewrote `README.md`, `README-EN.md`, and `docs/**` to describe the `.claude/**` runtime plus adapter directories.

### Removed

- Cleaned up retired runtime code; see `docs/audit/2026-06-02-runtime-audit.md` for the earlier audit.

## 3.0.0-alpha.1 (2026-04-29)

- Reorganized feature work under `features/{ym}-{slug}/`.
- Migrated tests from `node:test` to `bun:test`.
- Added audit, lint, path, case, and workspace tooling.

## 2.0.0 (2026-04-01)

- Initial Claude Code Skills integration.
- Added QA workflow, Playwright, XMind, and integration support.
