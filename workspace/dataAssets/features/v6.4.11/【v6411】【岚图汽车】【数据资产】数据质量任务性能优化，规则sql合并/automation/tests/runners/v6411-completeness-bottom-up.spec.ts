// spec: cases/archive.md#L5760-L5837
// intent: SR-INTENT-V6411-SQL-MERGE
// runner: v6411 completeness bottom-up E2E（建表→同步→规则包→质量任务→立即执行→证据收集）
// Execution: V6411_DQ_DATASOURCE=doris (default) | sparkthrift
import "../cases/t13-completeness-bottom-up-e2e";
