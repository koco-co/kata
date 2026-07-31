---
title: preconditions adapter — 旧调用形态映射
type: pitfall
tags: []
status: observed
source: 历史知识条目；原始证据未登记，2026-07-31 已降级为 observed
updated: 2026-07-31
---

# preconditions adapter — 旧调用形态映射

## 症状
`Error: no tables provided (use 'tables' or 'tablesFromFile')`
来自 `tools/dtstack-cli/src/sdk/precond-setup.ts:49`

## 复现条件
- helpers/preconditions.ts 把 `precondSetup` 直接 re-export 为 `setupPreconditions`
- 调用方仍用旧形态 `setupPreconditions(page, { datasourceType, projectName, tables, syncTimeout })`
- precondSetup 只接受 `(opts)` 单参；page 被当作 opts，`opts.tables = undefined`

## 根因
SDK 重构时统一了入参形态：`(opts)` 代替 `(page, opts)`、`datasource` 代替 `datasourceType`、`project` 代替 `projectName`。但 helpers 改成纯 re-export 时漏了 caller 适配。3 个 202604 suite 全部踩。

## 修复 diff
见 `workspace/dataAssets/helpers/preconditions.ts` 当前内容（adapter 已就位）：
- `setupPreconditions(page, opts)` 内部调 `createClientFromPage(page)` + `precondSetup({ client, project, datasource, tables, ... })`

## 关联硬规则
ui-autotest-pitfalls.md#D1, D2
