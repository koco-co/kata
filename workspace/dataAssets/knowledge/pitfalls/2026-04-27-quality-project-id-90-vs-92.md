---
title: QUALITY_PROJECT_ID 硬编码 90 但实际 92
type: pitfall
tags: []
status: verified
source: ""
updated: 2026-04-27
---

# QUALITY_PROJECT_ID 硬编码 90 但实际 92

## 症状
`Error: No SparkThrift2.x datasource available for current quality project.`
或 createProject 时 `无此用户`。

## 复现条件
- key-range-utils.ts 写死 `projectId: QUALITY_PROJECT_ID` (=90)
- LTQC 环境实际 quality project ID = 92
- 用 90 调 dmetadata API → 返回空数据源列表

## 根因
QUALITY_PROJECT_ID=90 是 dataAssets 项目的"默认值"，但每个环境的实际项目 ID 不同。test-data.ts 已有 `resolveEffectiveQualityProjectId(page)` 动态解析（缓存命中后 0 开销），其他 helper 应统一改用。

## 修复 diff
```diff
- projectId: QUALITY_PROJECT_ID,
+ const projectId = await resolveEffectiveQualityProjectId(page);
+ ...
+ projectId,
```

## 关联硬规则
ui-autotest-pitfalls.md#C1
