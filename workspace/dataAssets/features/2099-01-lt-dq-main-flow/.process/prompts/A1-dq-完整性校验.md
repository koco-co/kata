先读规格包: workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/spec-pack.md，严格遵守。

# 任务: 重建「数据质量 - 完整性校验」用例片段

## 真值源（必须实际打开阅读，禁止凭记忆）

- **后端规则函数枚举**: `workspace/dataAssets/.kata/repos/customltem/dt-center-assets/common/src/main/java/com/dtstack/assets/common/enums/FunctionType.java`
  - 完整性(COMPLETENESS=1)相关：LINE_COUNT(1), COL_COUNT(2), NULL_COUNT(3), NULL_PERCENT(4), EMPTY_COUNT(5), EMPTY_PERCENT(6), SINGLE_TABLE_FILED_VALUE_RANGE(39), MULTI_TABLE_ROWS(40), MULTI_TABLE_CONTENT(41)
- **前端 RULE_TYPE + STATISTICS_FUNC**: `workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src/consts/index.ts`（搜索 COMPLETENESS、相关 STATISTICS_FUNC）
- **已有用例（语义复用源）**: `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md`（搜索"完整性"）
- **DOM**: `workspace/dataAssets/_shared/env/ltqc-local.yaml`

## 必做

1. 从源码**推导完整性大规则下的全部小规则清单**（字段级：空值数、空值率、空串数、空串率；表级：表行数、字段数；多表：多表行数比对、多表数据内容比对；取值范围 SINGLE_TABLE_FILED_VALUE_RANGE 等），逐条列出。**以源码 FunctionType.java 为准，不得遗漏**。
2. 每条小规则 ≥2 条用例，至少覆盖：校验通过 + 校验不通过（明细/报告展示）两个方向。
3. 按业务流（规则库→规则集→规则任务→校验结果→质量报告）串联步骤。
4. 每条用例给可执行 SQL 前置（SparkThrift2.x 方言：`CREATE TABLE ... USING SPARKTHRIFT ... AS SELECT ...` 或 `INSERT INTO ...`）。

## 章节结构（严格）

```
## 数据质量
### 完整性校验
#### <小规则1名称（如：字段级-空值数）>
##### 【P0】<自然中文动宾句>
> 前置条件
- 已登录数据资产平台
- 已准备测试数据（含 SQL 代码块）
```sql
DROP TABLE IF EXISTS test_db.dq_completeness_null;
CREATE TABLE IF NOT EXISTS test_db.dq_completeness_null USING SPARKTHRIFT2X ...;
INSERT INTO test_db.dq_completeness_null VALUES ...;
```
> 操作步骤
1. ...
> 预期结果
1. ...
#### <小规则2名称>
...
```

## 输出文件（只写这一个）

`workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/fragments/dq-完整性校验.md`

末尾追加自检注释行：`<!-- self-check: 层级✓ 标题✓ 括号✓ SQL✓ 空断言✓ -->`

完成后用一句话报告：推导出几条小规则、共几条用例。
