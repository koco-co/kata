# LTQC Plan Drift Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the 2026-05-18 LTQC plan drift by removing presentation-layer provenance leaks, restoring manifest/schema validity, and preventing the same drift from passing lint again.

**Architecture:** Keep the current canonical online artifact name `岚图已上线需求主流程用例`. Preserve the 2026-05-18 plans as historical inputs, add this repair record, strengthen lint guardrails, clean the LTQC artifacts, and move temporary staging/report outputs out of git tracking.

**Tech Stack:** Bun + TypeScript for kata lint tests, Python helper scripts for LTQC local validation, Markdown and XMind zip/content.json artifact cleanup.

---

## Non-Conformance Inventory

- `SourceRef` / `case.archive@1` provenance text leaked into final presentation artifacts:
  - `workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.md`
  - `workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.xmind`
  - `workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.md`
  - `workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.xmind`
- `engine/src/lint/case-md-sourceref-leak.ts` only scanned fixed names (`archive.md`, `archive.draft.md`, `cases.xmind`) and missed manifest-declared Chinese artifact names.
- `manifest.json` added `case_drafting.case_count` and `case_drafting.updated_at`, which are not valid `FeatureManifest@2` properties.
- Current canonical artifact name is `岚图已上线需求主流程用例`, but older scripts and frontmatter still referenced `岚图已上线需求一级用例`.
- `tmp/staging/*`, `tmp/edit-report.md`, and `tmp/probe-report.md` were tracked even though the polish plan marked them as non-git artifacts.
- `tmp/validate-staging.py` was planned but missing.
- Test-environment verification remains blocked by missing/invalid session state and HTTP 502; this repair does not claim environment validation completed.

## Repair Decisions

- Keep `岚图已上线需求主流程用例.md/.xmind` as the canonical online artifact.
- Do not restore `岚图已上线需求一级用例.md/.xmind`.
- Remove temporary staging/report outputs from git tracking while keeping local files available.
- Keep external test-environment blocker evidence as a local-only report; do not modify product cases based on an unavailable environment.

## Implementation Tasks

- Add failing lint tests for manifest-declared presentation files and bare `case.archive@1:L...` locators.
- Extend SourceRef leak lint to scan manifest-declared archive/xmind targets and detect `case.archive@1` locators.
- Remove provenance text from LTQC Markdown and regenerate normalized XMind files.
- Restore manifest schema validity and align helper scripts/frontmatter with the `主流程` canonical name.
- Add `.gitignore` entries and remove tracked staging/report outputs from the index.
- Add `tmp/validate-staging.py` to check final A/B files and optional local staging files for case counts, placeholders, and provenance leaks.

## Verification

- `cd engine && bun test tests/cli/cases-lint.test.ts`
- `cd engine && bun test tests/ai-core/case-draft-orchestration.test.ts tests/history-convert.test.ts`
- `engine/bin/kata features lint 2099-01-lt-dq-smoke --project dataAssets --exit-code`
- `rg -n 'SourceRef|case\.archive@1|csv::|\bSR-' workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.md workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求主流程用例.md`
- Inspect both XMind `content.json` payloads for the same provenance patterns.
- `git ls-files workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/staging workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/edit-report.md workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/probe-report.md | wc -l`
- `python3 workspace/dataAssets/features/2099-01-lt-dq-smoke/tmp/validate-staging.py --feature workspace/dataAssets/features/2099-01-lt-dq-smoke`
