---
title: step fixture 不返回 callback 值
type: pitfall
tags: []
confidence: high
source: ""
updated: 2026-04-27
---

# step fixture 不返回 callback 值

## 症状
`TypeError: Cannot read properties of undefined (reading 'locator')`

## 复现条件
```ts
const ruleForm = await step('...', async () => {
  const form = await addKeyRangeRule(...);
  return form;  // ← 这个 return 没用
});
// ruleForm = undefined
```

## 根因
fixtures/step-screenshot.ts 的 stepFn 类型 `Promise<void>`，内部 `await body()` 丢弃返回值。

## 修复 diff
```diff
- const ruleForm = await step('步骤3: ...', async () => {
-   const form = await addKeyRangeRule(...);
-   return form;
- });
+ let ruleForm!: import("@playwright/test").Locator;
+ await step('步骤3: ...', async () => {
+   ruleForm = await addKeyRangeRule(...);
+ });
```

## 关联硬规则
ui-autotest-pitfalls.md#B1, B2
