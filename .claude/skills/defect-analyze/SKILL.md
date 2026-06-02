---
name: defect-analyze
description: 拿到异常堆栈/控制台报错/HTTP 失败、带合并冲突标记的文本，或代码 diff/分支对，做根因分诊、冲突解决或静态缺陷扫描。已登记的 ZenTao bug URL/ID 改用 case-hotfix。
argument-hint: "<异常堆栈 | 冲突文本 | diff/分支对>"
user-invocable: true
model: sonnet
effort: medium
---

# defect-analyze

按输入类型分诊到三种模式，凡无证据者一律不入文。

## 路由边界

description 已覆盖触发场景；此处只说明改走目标：

- ZenTao bug URL/bug-view/bug ID → case-hotfix。
- 依 PRD 产新用例 → case-draft。
- 泛泛代码讲解且无 diff 目标 → 由 AI 直接答，不入本 skill。

## 模式分诊（工作流）

- `bug`：异常堆栈、控制台错误、HTTP 失败等可复现 bug 证据 → 组装 BugReport JSON → `kata defect-report render-bug`（默认 full variant，可切 simple/zentao）产 `report.html`。
- `conflict`：带合并冲突标记的文本 → 组装 ConflictReport JSON → `kata defect-report render-conflict` 产 `report.html`。
- `diff`：仓库 diff / 分支对 / 变更文件集要求静态扫描 → fork 一个 general-purpose 子代理执行扫描，经 `kata scan-report` 产 `report.html`。

## 硬规则（不变量）

- bug 模式：实际行为、预期行为、复现步骤、影响范围四者分项陈述，不合并——合并会让修复方分不清现象与根因。
- conflict 模式：给解决方案前先陈述冲突双方各自意图与依据（side_a / side_b），避免单边裁决——直接选边会丢掉一方的合理诉求。
- diff 模式：只报告能依据所给 diff 与周边代码复现的 bug——超出 diff 的猜测无法验证。
- 缺乏证据时不虚构日志、负责人、模块或根因；事实性结论回指 `evidence_refs`。
- `workspace/{project}/.kata/repos/**` 为只读源仓库；如需修改须先获用户确认并在源仓库工作区内操作。

## 产物

- bug 模式 → `report.html`（bug-report 模版，默认 full variant；根因 + evidence_refs + impacted_areas 编入 JSON）。
- diff 模式 → `report.html`（scan-report 模版，根因 + evidence_refs + impacted_areas）。
- conflict 模式 → `report.html`（conflict-report 模版，含 side_a / side_b 与 resolution_plan）。
