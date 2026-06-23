// spec: cases/archive.md
// intent: SR-INTENT-V6411-SQL-MERGE
// SourceRefs: SR-ARCHIVE-V6411-SQL-MERGE-L22, SR-ARCHIVE-V6411-SQL-MERGE-L5296
// 交付套件只含已验证通过的 read-only contract 用例（t01 规则集合并配置、t03 已生成报告）。
// 环境受阻、暂排除的用例见 runs/<run>/handoff.md 的 Excluded Cases：
//   - cases/t02-sql-merge-monitor-record-detail.ts：依赖校验实例数据，当前环境 monitorRecord 列表为空
//     （immediatelyExecuted 执行链路 nginx 5min 504、实例不落库），待实例数据恢复后重新纳入。
//   - cases/t04-sql-merge-e2e-run.ts：UI「立即执行」同步接口 5min 504、跑不出有效实例，待环境恢复后纳入。
import "../cases/t01-sql-merge-ruleset-task-contract";
import "../cases/t03-sql-merge-quality-report-contract";
