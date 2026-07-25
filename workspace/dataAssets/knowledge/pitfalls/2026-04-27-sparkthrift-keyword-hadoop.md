---
title: SparkThrift datasource keyword 漏 hadoop
type: pitfall
tags: []
status: verified
source: ""
updated: 2026-04-27
---

# SparkThrift datasource keyword 漏 hadoop

## 症状
`Error: No SparkThrift2.x datasource available for current quality project.`

## 复现条件
- data-15693.ts 中 `SPARKTHRIFT_DATASOURCE_KEYWORD = "spark|thrift"`
- LTQC 环境的 SparkThrift 集群在 monitor/list 返回的 dataSourceName 是 `pw_test_HADOOP`
- regex 不命中 → ensureMonitorDatasource 找不到任何匹配项 → throw

## 根因
"SparkThrift" 是引擎名，但环境集群命名时常用业务名（如 HADOOP）。keyword 应包含 hadoop 作为备选。

## 修复 diff
```diff
- export const SPARKTHRIFT_DATASOURCE_KEYWORD = "spark|thrift";
+ export const SPARKTHRIFT_DATASOURCE_KEYWORD = "spark|thrift|hadoop";
```

## 关联硬规则
ui-autotest-pitfalls.md#C2
