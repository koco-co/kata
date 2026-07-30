// 并行分片 B（t12–t23）：与 full-a/full-c 配合 --workers=3 跨文件并行；分片内仍串行。
// 仅作快速跑批入口，交付以 full.spec.ts 为准。
import "../cases/c0012-starrocks-empty-string-rate-multi-field.spec";
import "../cases/c0013-starrocks-sum-rule.spec";
import "../cases/c0014-starrocks-average-rule.spec";
import "../cases/c0015-starrocks-negative-ratio-rule.spec";
import "../cases/c0017-starrocks-positive-ratio-rule.spec";
import "../cases/c0018-starrocks-numeric-range-rule.spec";
import "../cases/c0019-starrocks-numeric-enum-range-rule.spec";
import "../cases/c0020-starrocks-numeric-enum-count-rule.spec";
import "../cases/c0021-starrocks-string-max-length-rule.spec";
import "../cases/c0022-starrocks-string-min-length-rule.spec";
import "../cases/c0023-starrocks-id-card-format-rule.spec";
