// 并行分片 C（t24–t37）：与 full-a/full-b 配合 --workers=3 跨文件并行；分片内仍串行。
// 仅作快速跑批入口，交付以 full.spec.ts 为准。
import "../cases/c0024-starrocks-phone-format-rule.spec";
import "../cases/c0025-starrocks-email-format-rule.spec";
import "../cases/c0026-starrocks-duplicate-count-single-field.spec";
import "../cases/c0027-starrocks-duplicate-count-multi-field.spec";
import "../cases/c0029-starrocks-duplicate-rate-multi-field.spec";
import "../cases/c0030-starrocks-distinct-count-rule.spec";
import "../cases/c0031-starrocks-distinct-ratio-rule.spec";
import "../cases/c0032-starrocks-custom-sql-single-table-delete-error.spec";
import "../cases/c0033-starrocks-custom-sql-cross-table-missing.spec";
import "../cases/c0034-starrocks-table-compare-field-consistency.spec";
import "../cases/c0035-starrocks-table-compare-value-difference.spec";
import "../cases/c0036-starrocks-table-compare-case-insensitive.spec";
import "../cases/c0037-starrocks-table-compare-null-equivalence.spec";
