import "./generated";
// spec: cases/archive.md (按 V6411_UI_REBUILD_CASES 选择 Doris §01–§36 或 SparkThrift §37–§72)
// intent: SR-INTENT-V6411-SQL-MERGE
// runner: formal UI workflow for audit, rebuilding/verifying environment quality rule sets and tasks, inventory, and result verification.
// Business actions must be driven by browser UI:
// create rule set -> create rule task -> import rule package -> save -> immediate run -> result query.
// Do not delete existing records from this runner; result-only checks should use v6411-ui-result-recheck.spec.ts.
// Do not replace the above steps with backend API calls.
