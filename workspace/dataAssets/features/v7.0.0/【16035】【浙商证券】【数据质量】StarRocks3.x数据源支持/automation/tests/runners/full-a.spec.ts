// 并行分片 A（t01–t11）：与 full-b/full-c 配合 --workers=3 跨文件并行；分片内仍串行。
// 仅作快速跑批入口，交付以 full.spec.ts 为准。
import "../cases/c0001-starrocks-import-authorize-and-select.spec";
import "../cases/c0002-starrocks-overview-task-statistics.spec";
import "../cases/c0003-starrocks-batch-rule-package-run.spec";
import "../cases/c0004-starrocks-table-row-count-rule.spec";
import "../cases/c0005-starrocks-null-count-single-field.spec";
import "../cases/c0006-starrocks-null-count-multi-field.spec";
import "../cases/c0007-starrocks-null-rate-single-field.spec";
import "../cases/c0008-starrocks-null-rate-multi-field.spec";
import "../cases/c0009-starrocks-empty-string-count-single-field.spec";
import "../cases/c0010-starrocks-empty-string-count-multi-field.spec";
import "../cases/c0011-starrocks-empty-string-rate-single-field.spec";
