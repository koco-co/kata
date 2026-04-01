# Workspace Layout v2

This file is the authoritative AI Core reference for v2 workspace paths.

## Project Root

`workspace/{project}/` contains only:

- `.kata/` for project-local runtime state.
- `_shared/` for env profiles, fixtures, helpers, knowledge, rules, archived historical inputs, and shared page objects.
- `features/` for feature workspaces.
- `project.json`.
- `tsconfig.json`.

## Feature Root

Each feature directory is named `YYYY-MM-english-slug` and contains `metadata.yaml` and `manifest.json`.

Feature automation writes cases under `tests/cases/`, runners under `tests/runners/`, and run artifacts under `results/<run-id>/`.

New feature-local helper directories are forbidden. Shared page objects live under `_shared/pages/<feature-slug>/<page-domain>-page.ts` and shared helpers live under `_shared/helpers/`.

> **Note (follow-up):** the long-term target per the v2 spec is flat `_shared/pages/<page-domain>-page.ts` grouped by page domain across features. The current `<feature-slug>/` sub-bucket is a migration-time pragmatic step that preserves provenance; consolidating same-domain page objects is tracked as a follow-up and is intentionally not attempted automatically.

## Handoff And Results

Automation handoff is a double-track result:

- `results/<run-id>/handoff.json` validates as `PlaywrightAutomationHandoff@2`.
- `results/<run-id>/handoff.md` is generated from the JSON handoff.

`manifest.json#automation` points at the current automation state and relevant run ids.

## Source Repositories

Source repositories are read-only evidence under `.kata/repos/{project}/**`.

Kata workflows must not push, commit, or mutate source repositories.
