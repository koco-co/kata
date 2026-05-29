---
name: defect-analyze
description: 用户提供 bug 证据、合并冲突标记或代码 diff 并要求分析缺陷或给出解决方案。
---

# defect-analyze


证据事实必须引用 SourceRef ID。

## 路由摘要

- 三模式缺陷分诊：bug 证据 / 合并冲突 / diff 扫描——凡无证据者，一律不入文。

## 模式分诊

- `bug`：可复现 bug 证据 → 产 `defect-report.md`。
- `conflict`：合并冲突标记 → 产 `conflict-resolution-plan.md`（含 side_a / side_b）。
- `diff`：代码 diff / 分支对 / 变更文件静态扫描 → 产 `defect-report.md`。

## 硬规则

- bug 模式：实际行为、预期行为、复现步骤、影响范围——四者须分项陈述。
- conflict 模式：先陈述双方意图（side_a / side_b）再给解决方案。
- diff 模式：仅报告能依据所给 diff 复现的 bug。
- 缺乏证据时不得虚构；workspace/{project}/.kata/repos/** 为只读源仓库。
