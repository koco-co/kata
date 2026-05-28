---
name: bug-file
description: 用户提供可复现 bug 证据并要求整理缺陷报告。
when_to_use: 用户提供可复现 bug 证据并要求整理缺陷报告时使用。
user-invocable: true
model: sonnet
effort: medium
---

# bug-file


证据事实必须引用 SourceRef ID。

## 路由摘要

- 把失败证据收束为结构化 bug 报告——凡无证据者，一律不入文。

## 触发条件

- 用户给出异常堆栈、控制台错误、HTTP 失败或其他可复现的 bug 证据。
- 用户要求依据观察到的现象，撰写或结构化 bug 报告。

## 不触发条件

- 用户提供的内容是需做冲突分析的合并冲突标记。
- 用户希望基于既有 bug 记录产出 hotfix 回归用例。
- 用户只给出 ZenTao bug URL、bug-view URL、bug ID 或其他已登记 issue 记录；这类输入优先路由到 case-hotfix，由 case-hotfix 决定是否能生成回归用例或输出 pending_items。

## 按需加载协议

- 默认只读取当前 SKILL.md。
- 禁止批量读取 references/**。
- 只有当前阶段命中表格中的阶段与条件时，才读取对应文件。
- 没有命中的 reference 不得读取；few-shot 只可作为格式参考，不得作为领域事实证据。

无外部参考；仅使用当前 SKILL.md 与任务证据。

## 硬规则

- 实际行为、预期行为、复现步骤、影响范围——四者须分项陈述，不得合并。
- 缺乏证据时，不得凭空虚构日志、负责人、模块或根因。
