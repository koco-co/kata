// 并行分片 A（t01–t11）：与 full-b/full-c 配合 --workers=3 跨文件并行；分片内仍串行。
// 仅作快速跑批入口，交付以 full.spec.ts 为准。
import "../cases/t01-starrocks-datasource-rule-wizard";
import "../cases/t02-platform-datasource-authorization";
import "../cases/t03-dq-module-contract";
import "../cases/t04-rule-row-count";
import "../cases/t05-rule-null-count";
import "../cases/t06-rule-sum";
import "../cases/t07-rule-null-rate";
import "../cases/t08-rule-blank-count";
import "../cases/t09-rule-repeat-count";
import "../cases/t10-rule-blank-rate";
import "../cases/t11-rule-avg";
