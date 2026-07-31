---
title: 必须先选「规则类型 = 字段级」才显示统计函数
type: pitfall
tags: []
status: observed
source: 历史知识条目；原始证据未登记，2026-07-31 已降级为 observed
updated: 2026-07-31
---

# 必须先选「规则类型 = 字段级」才显示统计函数

## 症状
`Error: waiting for function select to render. Timeout 10000ms exceeded`

## 复现条件
- 新增"完整性校验"规则后，addKeyRangeRule 直接找统计函数 select
- 但新版 UI 默认不显示统计函数，要先选「规则类型」

## 根因
旧版 UI 默认显示统计函数行；新版 UI 拆成两步表单（规则类型 → 统计函数），添加规则后默认隐藏统计函数。

## 修复 diff
```diff
+ // 新版 UI：必须先选「规则类型 = 字段级」才会渲染出「统计函数」下拉
+ const ruleTypeSelect = ruleForm.locator(".ant-form-item")
+   .filter({ hasText: /规则类型/ }).first().locator(".ant-select").first();
+ if (await ruleTypeSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
+   await selectAntOption(page, ruleTypeSelect, /字段级|字段/);
+   await page.waitForTimeout(300);
+ }
  // 然后再找统计函数 ...
```

## 关联硬规则
ui-autotest-pitfalls.md#A4, E1, E2
