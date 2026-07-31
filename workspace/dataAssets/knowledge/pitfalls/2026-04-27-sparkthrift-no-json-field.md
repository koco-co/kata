---
title: SparkThrift2.x 不支持 JSON 字段类型
type: pitfall
tags: []
status: observed
source: 历史知识条目；原始证据未登记，2026-07-31 已降级为 observed
updated: 2026-07-31
---

# SparkThrift2.x 不支持 JSON 字段类型

## 症状
- 不直接报错，但前置 SQL 用 `info JSON` 在 SparkThrift 集群上 `CREATE TABLE` 失败
- 或 INSERT 时类型不匹配

## 复现条件
- archive MD 写 `info JSON` 但前置数据源是 SparkThrift2.x
- 实际 SparkThrift 引擎只接受 `STRING` 存储 JSON 字符串

## 根因
SparkThrift = Spark SQL via HiveServer2，与 Hive 一样使用 `STRING` + JSON 解析函数（如 `get_json_object`），无原生 JSON 类型；Doris 才有原生 JSON 类型。

## 修复 diff
SparkThrift 用：
```sql
CREATE TABLE pw_test.test_xxx (
  id INT,
  info STRING
) STORED AS PARQUET;
INSERT INTO TABLE pw_test.test_xxx
SELECT 1, '{"key1":"张三"}';
```

Doris 用：
```sql
CREATE TABLE test_xxx (
  id INT,
  info JSON
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES("replication_num"="1");
INSERT INTO test_xxx VALUES (1, '{"key1":"张三"}');
```

## 关联硬规则
ui-autotest-pitfalls.md#C3, C4
