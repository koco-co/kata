---
name: diff-scan
description: 用户要求扫描 diff、分支或变更文件中的可复现缺陷。
when_to_use: 用户要求扫描 diff、分支或变更文件中的可复现缺陷时使用。
user-invocable: true
model: sonnet
effort: high
context: fork
agent: general-purpose
paths:
  - "**/*.diff"
  - "**/*.patch"
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---

# diff-scan


证据事实必须引用 SourceRef ID。

## 路由摘要

- 扫描代码 diff，定位可复现缺陷；源仓库一律不改。

## 触发条件

- 用户要求对代码做静态扫描、diff 扫描，或在代码变更中查找 bug。
- 用户给出仓库 diff、分支对或变更文件集供检查。

## 不触发条件

- 用户要求一般性的代码讲解，且未指明 diff 目标。
- 用户要求依据 PRD 需求生成 QA 用例。

## 按需加载协议

- 默认只读取当前 SKILL.md。
- 禁止批量读取 references/**。
- 只有当前阶段命中表格中的阶段与条件时，才读取对应文件。
- 没有命中的 reference 不得读取；few-shot 只可作为格式参考，不得作为领域事实证据。

无外部参考；仅使用当前 SKILL.md 与任务证据。

## 硬规则

- 仅报告能依据所给 diff 与周边代码复现的 bug。
- workspace/{project}/.kata/repos/** 为只读源仓库；如需修改源仓库，必须先获得用户明确确认，并在源仓库工作区内操作。
