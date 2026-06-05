# 落标检查合并参考（std 模式）

数据来源：`质量规则合并细节技术方案.md` §5.6 + spec §6.4。

## 1. 落标校验项白名单

| 校验项 | 可合并 | 说明 |
| --- | --- | --- |
| 数据长度（CharLength） | **是** | `sum(case when length(${col}) ${logic} ${threshold} ...) as cnt_#{col}_#{checkItem}` |
| 数据精度（Precision） | **是** | `sum(case when (LENGTH(CAST...) - 1 - LENGTH(SUBSTR...) > ${threshold1} ${logic} ...) then 1 else 0 end)` |
| 允许空值（NullValue） | **是** | `sum(case when ((${col} is null) ${carModelFilter}) then 1 else 0 end)` |
| 取值范围（ValueRange） | **是** | `sum(case when ((${rangeFilter}) ${initValueFilter} ${carModelFilter}) then 1 else 0 end)` |
| 是否重复（Duplicate） | **否** | 依赖 GROUP BY，不可合并 |

## 2. 多车型 OR 分支（carModelCondition）

落标检查无独立的 filter 字段；通过 `carModelCondition` 区分不同车型。多车型时同一校验项
生成多个 OR 分支：

```sql
sum(case when
    ({condition} {carModelFilter1})
    OR
    ({condition} {carModelFilter2})
then 1 else 0 end) as cnt_{columnName}_{checkItem}
```

其中 `carModelFilter` 形如 `AND car_model = 1`（单车型）或 `AND car_model IN (1,2)`。

### 示例（数据长度，两车型）

```sql
sum(case when
    ((length(id) > 4) AND car_model = 1)
    OR
    ((length(id) < 5) AND car_model = 2)
then 1 else 0 end) as cnt_id_1
```

## 3. check_columns JSON 结构

`metadata_standard_table_check_package.check_columns` 存储每个字段的校验项配置，
格式示例：

```json
[
  {
    "columnName": "id",
    "columnDataType": "BIGINT",
    "checkItems": [
      {
        "checkItemType": 1,
        "checkItemName": "数据长度",
        "threshold": 4,
        "logic": ">"
      },
      {
        "checkItemType": 3,
        "checkItemName": "允许空值",
        "allowNull": false
      }
    ]
  }
]
```

期望分组从 `checkItems` 的 `checkItemType` 推导（类型在白名单内 → 可合并）。

## 4. 合并 SQL 存储

落标合并 SQL 存在 `metadata_standard_table_check_package.sql_text`，**不走 packagesql 接口**。

```sql
SELECT
    {tenantId} AS tenant_id,
    {bidtableId} AS bidtable_id,
    {packageId} AS package_id,
    '{columnName}' AS verify_column_name,
    CAST(check_item AS INT) AS check_item,
    '#{jobId}' AS job_key,
    val
FROM (
    SELECT
        SUM(CASE WHEN {condition1} THEN 1 ELSE 0 END) AS val1,
        SUM(CASE WHEN {condition2} THEN 1 ELSE 0 END) AS val2,
        ...
    FROM {schema}.{table}
) t
LATERAL VIEW STACK(N,
    '1', val1,
    '2', val2,
    ...
) stack_t AS check_item, val;
```

关键点：
- 落标 SQL 用 `LATERAL VIEW STACK(N, ...)` 展开每个校验项（而 dq 用 merge_ids CROSS JOIN agg）
- 无 `merge_group_key` 字段（落标没有这个 DB 字段）；期望分组从 `check_columns` 校验项白名单推导
- `dirty_schema_name` 存本次落标脏数据写入的 schema

## 5. 脏数据存储（落标）

落标脏数据通过 LATERAL VIEW explode 展开：

```sql
DROP TABLE IF EXISTS `{dirtySchema}`.`dq_standard_dirty_share_{date}`;
CREATE TABLE `{dirtySchema}`.`dq_standard_dirty_share_{date}` STORED AS PARQUET AS
SELECT *
FROM (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY rule_tag ORDER BY rand()) AS rn
    FROM (
        SELECT *, rule_tag
        FROM {schema}.{table}
        LATERAL VIEW explode(
            split(
                concat(
                    if({condition1}, '{checkItemType1},', ''),
                    if({condition2}, '{checkItemType2},', '')
                ), ','
            )
        ) tmp AS rule_tag
        WHERE rule_tag != ''
    ) exploded_data
) t
WHERE rn <= 100;
```

## 6. 七维校验矩阵（std 模式适配）

std 模式与 dq 模式镜像同七维，差异点：

| 维度 | dq 模式 | std 模式 |
| --- | --- | --- |
| ① 可合并 | function_id ∈ DOC_WHITELIST | checkItemType ∈ 落标白名单（数据长度/精度/空值/取值范围） |
| ⑤ filter | filter JSON 标准化比较 | 无独立 filter；多车型通过 carModelFilter OR 分支区分 |
| ⑦ 分组依据 | merge_group_key（DB字段） | 无 merge_group_key；从 check_columns 推导期望分组 |

## 7. 当前环境限制

落标表 `metadata_standard_table_check_package` 当前环境为空（功能已部署未跑数）。

- std 路径当前只能过结构 / schema 校验
- 需在有真实落标任务运行过的环境补端到端验证
- 明确告知用户：std 模式当前为「部分验证」状态
