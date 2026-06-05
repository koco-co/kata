# 规则函数字典

数据来源：`assets_dq_function` 2026-06-05 快照 + `质量规则合并细节技术方案.md` §7 规则表。

## 字段说明

| 字段 | 含义 |
| --- | --- |
| function_id | DB 主键，对应 `assets_dq_monitor_rule.function_id` |
| 中文名 | 规则显示名（来自技术方案 §7） |
| 英文名 (name_en) | DB `assets_dq_function.name_en` |
| type | 规则类型分类（见下方类型表） |
| have_dirty | 是否生成脏数据（0=不生成，1=生成） |
| 可合并 | 是否在文档白名单 `{1,3,4,5,6,11,12,13,14,15,16,17,20,21,25,30,49}` |
| 占比(is_pct) | val = 命中/总数；expansion = "命中/总数" 字符串 |
| 模板SQL要点 | 来自技术方案 §7 模板SQL列 |

## type 类型表

| type | 类别 |
| --- | --- |
| 1 | 单字段 / 简单聚合 |
| 2 | 数值类 |
| 3 | 字符串 / 格式类 |
| 4 | 分组类（GROUP BY，**不可合并**） |
| 6 | 异常值类（**不可合并**） |
| 7 | 多表一致性（**不可合并**） |
| 8 | 时间差类（**不可合并**） |
| 9 | 合理性 / 趋势类（**不可合并**） |

## 完整规则表

### 单字段 / 简单聚合类（type=1）

| function_id | 中文名 | 英文名 | type | have_dirty | 可合并 | 占比 | 模板SQL要点 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 表行数 | line_count | 1 | **0** | **是** | 否 | `select count(1) as val from ${table} where 1=1 ${filter}` |
| 3 | 空值数 | null_count | 1 | 1 | **是** | 否 | `select count(1) as val from ${table} where ${col} is null ${filter}` |
| 4 | 空值率 | null_percent | 1 | 1 | **是** | **是** | `select COALESCE(sum(case when ${col} is null then 1 else 0 end) / count(1), 0) as val from ${table}` |
| 5 | 空串数 | empty_count | 1 | 1 | **是** | 否 | `select sum(case when length(${col})=0 then 1 else 0 end) as val from ${table}` |
| 6 | 空串率 | empty_percent | 1 | 1 | **是** | **是** | `select sum(case when length(${col})=0 then 1 else 0 end) / count(1) as val from ${table}` |
| 39 | 字段取值校验 | single_table_value_range | 1 | 1 | 否 | 否 | `SELECT CONCAT_WS(',', ${fieldConcat}) as expansion, val FROM (SELECT COUNT(*) AS val, ...)` |
| 40 | 多表数据行数对比 | multi_table_rows | 1 | 1 | 否 | 否 | `SELECT CONCAT_WS('$', COLLECT_LIST(expansion)) AS expansion, 0 AS val` |
| 41 | 多表数据内容对比 | multi_table_content | 1 | 1 | 否 | 否 | `SELECT CONCAT_WS('$', COLLECT_LIST(expansion)) AS expansion, 0 AS val` |
| 46 | key范围校验 | json_format_key | 1 | 1 | 否 | 否 | `SELECT count(1) FROM ${table} where json_key_validator${unique}(...)=false` |

### 数值类（type=2）

| function_id | 中文名 | 英文名 | type | have_dirty | 可合并 | 占比 | 模板SQL要点 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 13 | 负值比 | minus_percent | 2 | 1 | **是** | **是** | `select sum(case when ${col} < 0 then 1 else 0 end) / count(1) as val from ${table}` |
| 14 | 零值比 | zero_percent | 2 | 1 | **是** | **是** | `select sum(case when ${col} = 0 then 1 else 0 end) / count(1) as val from ${table}` |
| 15 | 正值比 | plus_percent | 2 | 1 | **是** | **是** | `select sum(case when ${col} > 0 then 1 else 0 end) / count(1) as val from ${table}` |
| 20 | 求平均 | avg | 2 | **0** | **是** | 否 | `select avg(${col}) as val from ${table} where 1=1 ${filter}` |
| 21 | 求和 | sum | 2 | **0** | **是** | 否 | `select sum(${col}) as val from ${table} where 1=1 ${filter}` |

### 字符串 / 格式类（type=3）

| function_id | 中文名 | 英文名 | type | have_dirty | 可合并 | 占比 | 模板SQL要点 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 11 | 数值-枚举范围 | enum_count | 3 | 1 | **是** | 否 | `select count(1) as val from ${table} where ${col} ${enum} ${filter}` |
| 12 | 数值-枚举个数 | distinct_count | 3 | **0** | **是** | 否 | `select count(1) as val from (select ${col} from ${table} group by ${col}) temp` |
| 16 | 字符串-最大长度 | max_len | 3 | 1 | **是** | 否 | `SELECT max(length(${col})) as val from ${table}` |
| 17 | 字符串-最小长度 | min_len | 3 | 1 | **是** | 否 | `SELECT min(length(${col})) as val from ${table}` |
| 22 | 格式-身份证号 | personalId | 3 | 1 | 否 | 否 | 正则模板，不可合并 |
| 23 | 格式-手机号 | phoneNumber | 3 | 1 | 否 | 否 | 正则模板，不可合并 |
| 24 | 格式-邮箱 | email | 3 | 1 | 否 | 否 | 正则模板，不可合并 |
| 25 | 数值-取值范围 | value_range | 3 | 1 | **是** | 否 | `SELECT count(1) AS val FROM ${table} WHERE ${range} ${filter}` |
| 26 | 字符串长度 | length_str | 3 | 1 | **[分歧]** | 否 | `select CONCAT(MIN(charLen),'/',MAX(charLen)) as expansion, SUM(IF(charLen ${logic} ${expectation}, 1, 0)) as val from (select length(${col}) as charLen ...)` |
| 27 | 数据精度 | data_precision | 3 | 1 | 否 | 否 | 精度检查，不可合并 |
| 28 | 空值数（字符串） | null_count | 3 | 1 | 否 | 否 | 与 fn3 同名异 ID，不在白名单 |
| 29 | 重复数（字符串） | repeat_count | 3 | 1 | 否 | 否 | 分组类，不可合并 |
| 30 | 枚举值 | enum_value | 3 | 1 | **是** | 否 | `select count(1) as val from ${table} where ${col} ${enum} ${filter}` |
| 31 | 格式-日期格式-date | date | 3 | 1 | 否 | 否 | 正则模板，不可合并 |
| 32 | 格式-日期格式-datetime | date_time | 3 | 1 | 否 | 否 | 正则模板，不可合并 |
| 33 | 格式校验-自定义正则 | custom_format_regex | 3 | 1 | 否 | 否 | 正则模板，不可合并 |
| 49 | 取值范围&枚举范围 | value_enum_range | 3 | 1 | **是** | **是** | `SELECT count(1) AS val FROM ${table} WHERE ${range_enum} ${filter}`（占比：命中/总数） |
| 51 | 格式-json格式校验 | verify_json_value | 3 | 1 | 否 | 否 | 正则模板，不可合并 |

### 分组类（type=4）—— 不可合并

| function_id | 中文名 | 英文名 | type | have_dirty | 可合并 | 占比 | 模板SQL要点 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 7 | 重复数 | repeat_count | 4 | 1 | 否 | 否 | GROUP BY + HAVING count>1，不可合并 |
| 8 | 重复率 | repeat_percent | 4 | 1 | 否 | 否 | GROUP BY，不可合并 |
| 9 | 非重复个数 | unique_count | 4 | 1 | 否 | 否 | GROUP BY + HAVING count=1，不可合并 |
| 10 | 非重复占比 | unique_percent | 4 | 1 | 否 | 否 | GROUP BY，不可合并 |
| 34 | 多表唯一性判断 | multi_table_column_single | 4 | 1 | 否 | 否 | 多表 JOIN，不可合并 |

### 异常值类（type=6）—— 不可合并

| function_id | 中文名 | 英文名 | type | have_dirty | 可合并 | 占比 | 模板SQL要点 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 35 | 异常值检测 | OutlierDetection | 6 | 1 | 否 | 否 | 依赖统计边界值，不可合并 |
| 36 | IQR离群点数量 | IQRNumberOFOutliers | 6 | 1 | 否 | 否 | IQR，不可合并 |
| 37 | IQR离群点占比 | IQROutlierRatio | 6 | 1 | 否 | 否 | IQR，不可合并 |
| 38 | Z-score置信区间 | Z-scoreConfidenceInterval | 6 | 1 | 否 | 否 | Z-score，不可合并 |

### 多表一致性类（type=7）—— 不可合并

| function_id | 中文名 | 英文名 | type | have_dirty | 可合并 | 占比 |
| --- | --- | --- | --- | --- | --- | --- |
| 45 | 多表数据一致性比对 | multi_table_uniformity | 7 | 1 | 否 | 否 |

### 时间差类（type=8）—— 不可合并

| function_id | 中文名 | 英文名 | type | have_dirty | 可合并 | 占比 |
| --- | --- | --- | --- | --- | --- | --- |
| 42 | 周期性校验（单字段时间差校验） | Single_field_time_difference | 8 | 1 | 否 | 否 |
| 44 | 及时性校验（多字段时间差校验） | time_multi_field_difference | 8 | 1 | 否 | 否 |

### 合理性 / 趋势类（type=9）—— 不可合并

| function_id | 中文名 | 英文名 | type | have_dirty | 可合并 | 占比 |
| --- | --- | --- | --- | --- | --- | --- |
| 43 | 数据变化趋势 | reasonable_data_change_trend | 9 | 1 | 否 | 否 |
| 47 | 字段值计算对比 | Field_value_calculation_comparison | 9 | 1 | 否 | 否 |
| 50 | 多表字段值对比 | reasonable_multi_table_column_value | 9 | 1 | 否 | 否 |

## 关键注意事项

### have_dirty=0 的函数（4个）

fn1(表行数) / fn12(枚举个数) / fn20(求平均) / fn21(求和)：

- 合并时进 `SUM(CASE WHEN)` 块计算 val
- **不得**出现在脏数据 `explode(array(...))` 里
- **不得**有对应的 `dq_monitor_#{jobId}_<ruleId>` 脏数据表

实测验证：fn12/rule 13035 在 monitor 4471 包 4622 中确认未进脏数据。

### 占比规则（is_pct=1，共6个）

fn4/fn6/fn13/fn14/fn15/fn49：

- `val` = `CAST(hit_cnt AS DOUBLE) / total_cnt`（total=0 时为 0）
- `expansion` = `CONCAT(hit_cnt, '/', total_cnt)`
- 合并 SQL 中对应 `merge_idx` 的 expansion 分支应输出占比字符串，而非固定 `'0'`

### fn26 白名单分歧

fn26(length_str) 实测在 monitor 4471 中 `merge_group_key` 非空（被合并），但不在技术方案
§5.2.1 的文档白名单 `{1,3,4,5,6,11,12,13,14,15,16,17,20,21,25,30,49}` 中。

- common.py 中 `DOC_WHITELIST` 不含 fn26（遵循文档）
- 校验时若发现 fn26 的 `merge_group_key` 非空，作为 **finding** 抛出，不静默通过
- 需用户/开发确认：「文档漏列」还是「实现误合」
