---
title: /字段/ 误命中"字段级"
type: pitfall
tags: []
confidence: high
source: ""
updated: 2026-04-27
---

# /字段/ 误命中"字段级"

## 症状
`Error: Ant Select option not found: info. Visible options: 字段级, 单表, 多表数据行数对比, 多表数据内容对比`

## 复现条件
- ruleForm 同时存在「规则类型 = 字段级」和「字段 = info」两个 form-item
- 用 `filter({ hasText: /字段/ })` 命中第一个出现的 — 命中"字段级"行
- 后续 selectAntOption 在错误的 select 上选 info → 失败

## 根因
正则 `/字段/` 是子串匹配，"字段级"含"字段"二字。

## 修复 diff
```diff
- ruleForm.locator(".ant-form-item").filter({ hasText: /字段/ }).first()
+ ruleForm.locator(".ant-form-item").filter({ hasText: /^字段/ }).first()
```

## 关联硬规则
ui-autotest-pitfalls.md#A2
