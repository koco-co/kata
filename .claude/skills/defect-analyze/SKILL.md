---
name: defect-analyze
description: 三模式缺陷分诊——bug 证据→根因报告、合并冲突→解决方案、代码 diff→静态缺陷扫描。给出可复现证据并要结构化分析时用。
when_to_use: 给出异常堆栈/控制台错误/HTTP 失败、带冲突标记的文本、或仓库 diff/分支对要扫描时用。已登记的 ZenTao bug URL/ID → 改走 case-hotfix。
argument-hint: "<异常堆栈 | 冲突文本 | diff/分支对>"
user-invocable: true
model: sonnet
effort: medium
---

# defect-analyze

按输入类型分诊到三种模式，凡无证据者一律不入文。

## 模式分诊

- `bug`：异常堆栈、控制台错误、HTTP 失败等可复现 bug 证据 → 产 `defect-report.md`。
- `conflict`：带合并冲突标记的文本 → 产 `conflict-resolution-plan.md`。
- `diff`：仓库 diff / 分支对 / 变更文件集要求静态扫描 → fork 一个 general-purpose 子代理执行扫描，产 `defect-report.md`。

## 路由边界

- 触发：给出可复现失败证据、带冲突标记的文本、或要扫描的 diff/分支对。
- 改走：ZenTao bug URL/bug-view/bug ID → case-hotfix；依 PRD 产新用例 → case-draft；泛泛代码讲解且无 diff 目标 → 由 AI 直接答。

## 硬规则（不变量）

- bug 模式：实际行为、预期行为、复现步骤、影响范围四者分项陈述，不合并——合并会让修复方分不清现象与根因。
- conflict 模式：给解决方案前先陈述冲突双方各自意图与依据（side_a / side_b），避免单边裁决。
- diff 模式：只报告能依据所给 diff 与周边代码复现的 bug。
- 缺乏证据时不虚构日志、负责人、模块或根因；事实性结论回指 `evidence_refs`。
- `workspace/{project}/.kata/repos/**` 为只读源仓库；如需修改须先获用户确认并在源仓库工作区内操作。

## 产物

- bug / diff 模式 → `defect-report.md`（根因 + evidence_refs + impacted_areas）。
- conflict 模式 → `conflict-resolution-plan.md`（含 side_a / side_b 与 resolution_plan）。
