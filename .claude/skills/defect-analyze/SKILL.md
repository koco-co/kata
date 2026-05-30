---
name: defect-analyze
description: 用户提供 bug 证据、合并冲突标记或代码 diff 并要求分析缺陷或给出解决方案。
when_to_use: 用户提供可复现 bug 证据、合并冲突标记或代码 diff，要求结构化缺陷分析、冲突解决方案或 diff 缺陷扫描时使用。
user-invocable: true
model: sonnet
effort: medium
paths:
  - "**/*.diff"
  - "**/*.patch"
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---

# defect-analyze


证据事实必须引用 SourceRef ID。

## 路由摘要

- 三模式缺陷分诊：bug 证据 / 合并冲突 / diff 扫描——凡无证据者，一律不入文。

## 模式分诊

- `bug`：用户给出异常堆栈、控制台错误、HTTP 失败或其他可复现 bug 证据 → 产 `defect-report.md`。
- `conflict`：用户给出带合并冲突标记的文本 → 产 `conflict-resolution-plan.md`。
- `diff`：用户给出仓库 diff / 分支对 / 变更文件集要求静态扫描 → fork 一个 general-purpose 子代理执行扫描，产 `defect-report.md`。

## 触发条件

- 用户给出可复现的失败证据（异常堆栈、控制台错误、HTTP 失败）并要求结构化 bug 报告。
- 用户给出带合并冲突标记的文本并要求剖析冲突成因或给出可靠解决路径。
- 用户要求对代码 diff、分支对或变更文件做静态扫描以查找可复现缺陷。

## 不触发条件

- 用户只给出 ZenTao bug URL、bug-view URL、bug ID 或其他已登记 issue 记录；优先路由到 case-hotfix。
- 用户要求依据 PRD 需求生成新的 QA 用例（case-draft）。
- 用户要求一般性代码讲解，且未指明 diff 目标。

## 按需加载协议

- 默认只读取当前 SKILL.md。
- 禁止批量读取 references/**。
- 只有当前阶段命中表格中的阶段与条件时，才读取对应文件。
- 没有命中的 reference 不得读取；few-shot 只可作为格式参考，不得作为领域事实证据。

无外部参考；仅使用当前 SKILL.md 与任务证据。

## 硬规则

- bug 模式：实际行为、预期行为、复现步骤、影响范围——四者须分项陈述，不得合并。
- conflict 模式：给出解决方案之前，先陈述冲突双方各自的意图与依据（side_a / side_b）。
- diff 模式：仅报告能依据所给 diff 与周边代码复现的 bug。
- 缺乏证据时，不得凭空虚构日志、负责人、模块或根因。
- workspace/{project}/.kata/repos/** 为只读源仓库；如需修改，必须先获得用户明确确认，并在源仓库工作区内操作。

## 产物

- bug / diff 模式 → `defect-report.md`（根因 + evidence_refs + impacted_areas）。
- conflict 模式 → `conflict-resolution-plan.md`（含 side_a / side_b 与 resolution_plan）。
