# Quality Gates (15 checks)

| # | Name | Source | Notes |
|---|---|---|---|
| 1 | no_weak_assertions | .claude/scripts/_shared/lint/weak-assertion.ts | preserved |
| 2 | no_env_local | .claude/scripts/_shared/lint/... | preserved |
| 3 | runner_is_aggregator | .claude/scripts/_shared/lint/... | preserved |
| 4 | cases_in_cases_dir | .claude/scripts/_shared/lint/... | preserved |
| 5 | session_compliant | .claude/scripts/_shared/lint/... | preserved |
| 6 | env_profile_compliance | .claude/scripts/_shared/lint/... | preserved |
| 7 | cases_lint | .claude/scripts/_shared/lint/source-ref-registry.ts | upgraded to registry |
| 8 | no_dangling_helpers | .claude/scripts/_shared/lint/... | preserved |
| 9 | spec_structure_valid | .claude/scripts/_shared/lint/... | preserved |
| 10 | metadata_present_and_valid | .claude/scripts/_shared/cli/features-lint.ts | new |
| 11 | manifest_present_and_valid | .claude/scripts/_shared/cli/features-lint.ts | new |
| 12 | case_traceability_header | .claude/scripts/_shared/lint/case-traceability-header.ts | new |
| 13 | no_feature_local_helpers | .claude/scripts/_shared/lint/no-feature-local-helpers.ts | new |
| 14 | no_debug_in_cases | .claude/scripts/_shared/lint/no-debug-in-cases.ts | new |
| 15 | handoff_double_track | .claude/scripts/_shared/lint/handoff-double-track.ts | new |

All 15 checks run via `kata cases lint --exit-code --severity fail-only --scope workspace` in CI and at the end of every `playwright-automation` workflow. Any fail-severity violation marks the run as `quality_gate_failed`; warn-severity findings are reported but do not block the handoff.
