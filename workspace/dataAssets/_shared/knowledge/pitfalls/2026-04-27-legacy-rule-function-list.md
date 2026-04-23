---
title: .rule__function-list__item legacy DOM
type: pitfall
tags: []
confidence: high
source: ""
updated: 2026-04-27
---

# .rule__function-list__item legacy DOM

## 症状
`Test timeout of 60000ms exceeded. waiting for locator('.rule__function-list__item').first().locator('.ant-select').first() to be visible`

## 复现条件
- 新版 UI 用 inline `.ant-form-item` 渲染统计函数 select，不再是独立的 `.rule__function-list__item` 容器
- key-range-utils.ts addKeyRangeRule / configureKeyRangeRule / selectJsonKeys 都按 legacy 容器找元素

## 根因
suite-helpers.ts 的 getFunctionSelect 已写双路径回退（legacy + inline），但 key-range-utils.ts 没同步。

## 修复 diff
见 ui-autotest-pitfalls.md A1 双路径选择器示例。

## 关联硬规则
ui-autotest-pitfalls.md#A1, A3, A5
