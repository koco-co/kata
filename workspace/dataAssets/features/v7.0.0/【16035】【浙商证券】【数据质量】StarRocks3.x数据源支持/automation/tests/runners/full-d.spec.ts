// 并行分片 D（缺口用例：多表比对×5 / 列表查询 / 脏数据 / 规则集导入）：与 full-a/b/c 配合 --workers 并行。
// 交付以 full.spec.ts 为准。
import "../cases/c0028-starrocks-duplicate-rate-single-field.spec";
import "../cases/c0038-starrocks-table-compare-anomaly-categories.spec";
import "../cases/c0039-starrocks-rule-config-search-filter.spec";
import "../cases/c0040-starrocks-rule-task-edit-rerun.spec";
import "../cases/c0041-starrocks-rule-task-delete.spec";
import "../cases/c0042-starrocks-task-instance-details.spec";
import "../cases/c0043-starrocks-dirty-data-storage-retention.spec";
