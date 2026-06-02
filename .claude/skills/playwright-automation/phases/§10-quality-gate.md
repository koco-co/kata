# 质量检查项（15 项检查）

| # | 名称 | 来源 | 备注 |
|---|---|---|---|
| 1 | no_weak_assertions | .claude/scripts/_shared/lint/weak-assertion.ts | 沿用 |
| 2 | no_env_local | .claude/scripts/_shared/lint/... | 沿用 |
| 3 | runner_is_aggregator | .claude/scripts/_shared/lint/... | 沿用 |
| 4 | cases_in_cases_dir | .claude/scripts/_shared/lint/... | 沿用 |
| 5 | session_compliant | .claude/scripts/_shared/lint/... | 沿用 |
| 6 | env_profile_compliance | .claude/scripts/_shared/lint/... | 沿用 |
| 7 | cases_lint | .claude/scripts/_shared/lint/source-ref-registry.ts | 升级为 registry |
| 8 | no_dangling_helpers | .claude/scripts/_shared/lint/... | 沿用 |
| 9 | spec_structure_valid | .claude/scripts/_shared/lint/... | 沿用 |
| 10 | metadata_present_and_valid | .claude/scripts/_shared/cli/features-lint.ts | 新增 |
| 11 | manifest_present_and_valid | .claude/scripts/_shared/cli/features-lint.ts | 新增 |
| 12 | case_traceability_header | .claude/scripts/_shared/lint/case-traceability-header.ts | 新增 |
| 13 | no_feature_local_helpers | .claude/scripts/_shared/lint/no-feature-local-helpers.ts | 新增 |
| 14 | no_debug_in_cases | .claude/scripts/_shared/lint/no-debug-in-cases.ts | 新增 |
| 15 | handoff_double_track | .claude/scripts/_shared/lint/handoff-double-track.ts | 新增 |

全部 15 项检查在 CI 与每次 `playwright-automation` 工作流结束时通过 `kata cases lint --exit-code --severity fail-only --scope workspace` 运行。任一 fail 级违规将本次运行标记为 `quality_gate_failed`；warn 级发现会上报但不阻塞 handoff。
