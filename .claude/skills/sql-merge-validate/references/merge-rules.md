# 合并规则参考

数据来源：`质量规则合并细节技术方案.md` §5.2–§5.3 + 实测 monitor 4471 证据（2026-06-05）。

## 1. 合并键定义（dq 模式）

合并键 = **同源表 + 同标准化 filter + 同强弱(rule_strength) + function_id ∈ 可合并白名单**

**与字段(column_name)无关**；组内规则数 ≥ 2 才合并，单条退回不合并组（进 unable 列表）。

### 证据

monitor 4471 包 4622 合并组 `eUvlyF1G` 的 5 条规则字段各不同（id,age / name / money /
string_num），均为弱规则、同 filter `id<=100`，被合进同一 `SUM(CASE WHEN)` 块。

技术方案 §5.2.1 原文写「columnNameStr、filter 相同时分为一组」，与实现不符；**以实现
行为和用例预期为准**（字段不入合并键）。

### filter 标准化

filter 存 DB 为 JSON 结构（`{"conditionType":...}`），比较前需标准化（JSON 解析→规范化
→再比），不能直接裸字符串比较。标准化口径必须与后端 MergeKey 构造逻辑一致。

## 2. 可合并白名单

### 文档白名单（技术方案 §5.2.1，含 fn26 实测补列）

```
{1, 3, 4, 5, 6, 11, 12, 13, 14, 15, 16, 17, 20, 21, 25, 26, 30, 49}
```

- 单字段类：null_count(3)、null_percent(4)、empty_count(5)、empty_percent(6)、
  enum_count(11)、value_range(25)、enum_value(30)、value_enum_range(49)
- 字符串长度类：max_len(16)、min_len(17)、length_str(26)
- 简单聚合类：line_count(1)、avg(20)、sum(21)
- 其他：distinct_count(12)

### fn26 已确认可合并

**fn26(length_str/字符串长度)** 经 monitor 4471 实测 + 用户确认为可合并函数：其
`merge_group_key` 非空（被实际合并），属同族字符串长度类（与 max_len(16)、min_len(17)
同质），技术方案 §5.2.1 原文漏列，现已补入白名单。`DOC_WHITELIST` 同步含 26，校验脚本
不再对 fn26 抛 whitelist_divergence finding。

### 不可合并类（恒不进白名单）

| 类别 | function_id | 原因 |
| --- | --- | --- |
| 分组类 (type=4) | 7,8,9,10,34 | 依赖 GROUP BY，不能合进单次扫表 |
| 异常值类 (type=6) | 35,36,37,38 | 依赖统计边界值 |
| 多表一致性 (type=7) | 45 | 多表 JOIN |
| 时间差类 (type=8) | 42,44 | 依赖窗口函数 LAG/LEAD |
| 合理性趋势 (type=9) | 43,47,50 | 依赖窗口函数或多表 |
| 正则模板 | 22,23,24,31,32,33 | 正则模板，不属于范围内 |
| 多表 | 40,41 | 多表对比 |
| 其他 | 27,28,29,39,46,51 | 不在白名单 |

## 3. 分包算法（buildPackageSerialNumberRelationRulesV1）

来源：技术方案 §5.2.2 + Java 代码实现。

### 特殊包数处理

| packageCount | 行为 |
| --- | --- |
| 1 | 所有规则进同一包（但包内仍按强弱合并 SUM 块） |
| 2 | 强规则全进包1，弱规则全进包2 |
| = totalRuleCount | 一规则一包，逐条分配 |

### 通用情况（3 ≤ packageCount < totalRuleCount）

1. 分别对强规则列表和弱规则列表做 `classifyMonitorRulesForMerge`，各自得到
   `waitingMergeList`（可合并组，每组 ≥ 2）和 `unableMargeList`（不可合并）。
2. 按强/弱规则条数比例分配包槽位（各至少 1 个包槽）：
   - 强规则槽数 = round(packageCount × strengthCount / totalCount)，夹在 [1, packageCount-1]
   - 弱规则槽数 = packageCount - 强规则槽数
3. 分包优先级：**waiting 优先，unable 补充**；每次选当前规则数最少的槽填入（均衡）。
4. 强规则和弱规则的包槽位索引不重叠（强弱不得混包）。

### classifyMonitorRulesForMerge 逻辑

输入 `List<MonitorRule>`，输出 `waitingMargeList` + `unableMargeList`：

1. 同 `mergeKey`（同源表 + 同 filter + function ∈ 白名单）的规则归为一组。
2. 组内只有 1 条规则 → 移出 waiting，进 unable。
3. 不在白名单的规则直接进 unable。

## 4. 合并 SQL 范式（dq 模式）

### 4.1 val 计算块（SUM CASE WHEN + LATERAL VIEW STACK）

```sql
INSERT INTO `schema`.`dtstack_dq_monitor_temp_data` PARTITION (job_id = '#{jobId}')
SELECT
    1 AS tenant_id,
    {monitorId} AS monitor_id,
    CASE merge_ids.merge_idx
        WHEN 1 THEN {ruleId1}
        WHEN 2 THEN {ruleId2}
        ...
    END AS rule_id,
    0 AS record_id,
    '#{jobId}' AS job_key,
    CASE merge_ids.merge_idx
        WHEN 1 THEN '0'                              -- have_dirty=1 非占比 → '0'
        WHEN 2 THEN CONCAT(hit_cnt_rule_{id2}, '/', total_cnt)  -- 占比 → CONCAT(hit,'/',total)
        ...
    END AS expansion,
    CASE merge_ids.merge_idx
        WHEN 1 THEN agg.hit_cnt_rule_{id1}           -- 非占比 → 直接 hit
        WHEN 2 THEN CASE WHEN agg.total_cnt = 0      -- 占比 → CAST(hit AS DOUBLE)/total
                         THEN 0
                         ELSE CAST(agg.hit_cnt_rule_{id2} AS DOUBLE) / agg.total_cnt
                    END
        ...
    END AS val
FROM (
    SELECT 1 AS merge_idx UNION ALL SELECT 2 AS merge_idx ...
) merge_ids
CROSS JOIN (
    SELECT
        COUNT(1) AS total_cnt,
        SUM(CASE WHEN {cond1} THEN 1 ELSE 0 END) AS hit_cnt_rule_{id1},
        SUM(CASE WHEN {cond2} THEN 1 ELSE 0 END) AS hit_cnt_rule_{id2},
        ...
    FROM `schema`.`table`
    WHERE {filter}
) agg
```

关键点：
- `merge_ids` 子查询：N 个 UNION ALL（N = 组内规则数）
- `agg` 子查询：源表只扫 **一次**，所有 SUM(CASE WHEN) 并行
- `have_dirty=0` 的函数（fn1/12/20/21）：expansion 固定 `'0'`，val 正常输出，**无脏数据段**
- 占比函数（fn4/6/13/14/15/49）：expansion = `CONCAT(hit,'/',total)`，val = `CAST(hit AS DOUBLE)/total`（total=0→0）

### 4.2 脏数据范式（have_dirty=1 的合并组）

```sql
DROP TABLE IF EXISTS `schema`.`dq_monitor_#{jobId}_{mergeGroupKey}`;
CREATE TABLE `schema`.`dq_monitor_#{jobId}_{mergeGroupKey}` ... STORED AS PARQUET AS
SELECT *
FROM (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY rule_tag ORDER BY rand()) AS rn
    FROM (
        SELECT *, rule_tag
        FROM `schema`.`source_table`
        WHERE {filter}
        LATERAL VIEW explode(
            filter(
                array(
                    if({cond1}, '{ruleId1}', NULL),
                    if({cond2}, '{ruleId2}', NULL),
                    ...
                    -- have_dirty=0 的 function 不出现在此 array 中
                ),
                x -> x IS NOT NULL
            )
        ) tmp AS rule_tag
        WHERE rule_tag IS NOT NULL
    ) exploded_data
) t
WHERE rn <= 10000;
```

关键点：
- 脏表名：`dq_monitor_#{jobId}_{mergeGroupKey}`（有合并组key）或 `dq_monitor_#{jobId}_{ruleId}`（单条不可合并）
- `have_dirty=0` 的函数（fn1/12/20/21）的 rule_id **不得**出现在 `array(if(...))` 中
- `filter(array(...), x -> x IS NOT NULL)` 过滤掉 NULL（Spark/Hive 写法）

### 4.3 抽样范式（开启抽样时）

抽样替换源表扫描为：建临时抽样表 → 灌数（含分区谓词 + ROW_NUMBER） → 合并 SQL FROM 抽样表 → 尾部 DROP。

```sql
-- 建抽样表
DROP TABLE IF EXISTS `schema`.`_temp_sample_table_#{jobId}`;
CREATE TABLE `schema`.`_temp_sample_table_#{jobId}` ... AS
SELECT *
FROM (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY {partitionCols} ORDER BY rand()) AS rn
    FROM `schema`.`source_table`
    WHERE {partition_predicate}  -- 分区谓词在此
) t
WHERE rn <= {sampleSize};

-- 合并 val 块的 FROM 指向抽样表
...FROM `schema`.`_temp_sample_table_#{jobId}` WHERE {filter}...

-- 脏数据查询也 FROM 抽样表
...FROM `schema`.`_temp_sample_table_#{jobId}` WHERE {filter}...

-- 尾部清理（SQL 末尾）
DROP TABLE IF EXISTS `schema`.`_temp_sample_table_#{jobId}`;
```

关键点：
- 抽样表名固定：`_temp_sample_table_#{jobId}`
- 分区谓词（如 `dt='xxx'`）在抽样表填充阶段出现，不重复出现在后续 FROM 中
- 尾部 DROP 必须存在（清理临时表）

## 5. 占比 expansion 格式

占比规则（fn4/6/13/14/15/49）的 expansion：

```sql
CONCAT(hit_cnt_rule_{id}, '/', total_cnt)
```

非占比规则的 expansion：固定字符串 `'0'`（expansion 列常量）。

特殊情况（fn36 IQR 等）有自定义 expansion，但这些函数不在可合并白名单内，不参与合并验证。
