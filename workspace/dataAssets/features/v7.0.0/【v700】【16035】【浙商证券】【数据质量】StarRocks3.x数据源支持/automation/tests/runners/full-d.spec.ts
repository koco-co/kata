// 并行分片 D（缺口用例：多表比对×5 / 列表查询 / 脏数据 / 规则集导入）：与 full-a/b/c 配合 --workers 并行。
// 交付以 full.spec.ts 为准。
import "../cases/t28-rule-multi-consistency";
import "../cases/t38-rule-multi-pct-diff";
import "../cases/t39-rule-multi-case-insensitive";
import "../cases/t40-rule-multi-null-equiv";
import "../cases/t41-rule-multi-category";
import "../cases/t42-rule-list-query";
import "../cases/t43-dirty-data-manage";
