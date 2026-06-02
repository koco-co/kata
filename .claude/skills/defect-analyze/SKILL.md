---
name: defect-analyze
description: 拿到异常堆栈/控制台报错/HTTP 失败、带合并冲突标记的文本，或代码 diff/分支对，做根因分诊、冲突解决或静态缺陷扫描。已登记的 ZenTao bug URL/ID 改用 case-hotfix。
argument-hint: "<异常堆栈 | 冲突文本 | diff/分支对>"
user-invocable: true
model: sonnet
effort: medium
---

# defect-analyze

按输入类型分流到三种模式；没有证据的内容，一律不写进报告。

## 路由边界

触发场景由 description 覆盖；这里只说明改走目标：

- ZenTao bug URL、bug-view 链接或 bug ID → 改走 case-hotfix。
- 要依 PRD 产出新用例 → 改走 case-draft。
- 只是泛泛讲解代码、没有 diff 目标 → 由 AI 直接回答，不进本 skill。

## 三种模式（工作流）

- `bug`：拿到异常堆栈、控制台报错、HTTP 失败等可复现的 bug 证据，先组装 BugReport JSON，再用 `kata defect-report render-bug`（默认 full variant，可切 simple/zentao）产出 `report.html`。
- `conflict`：拿到带合并冲突标记的文本，先组装 ConflictReport JSON，再用 `kata defect-report render-conflict` 产出 `report.html`。
- `diff`：要对仓库 diff、分支对或变更文件集做静态扫描时，新开一个 general-purpose 子代理来执行扫描，再经 `kata scan-report` 产出 `report.html`。

## 必须遵守的规则

- bug 模式：实际行为、预期行为、复现步骤、影响范围这四项要分开陈述，不合并。合并会让修复的人分不清现象和根因。
- conflict 模式：给出解决方案之前，先把冲突双方各自的意图和依据写清楚（side_a / side_b），不要单边裁决。直接选边，会丢掉另一方的合理诉求。
- diff 模式：只报告能依据所给 diff 与周边代码复现出来的 bug。超出 diff 的内容无法验证，不要去猜。
- 缺乏证据时，不要编造日志、负责人、模块或根因；凡是结论，都要能指回 `evidence_refs`。
- `workspace/{project}/.kata/repos/**` 是只读源仓库；如需修改，要先获得用户确认，并在源仓库的工作区内操作。

## 产物

- bug 模式 → `report.html`（bug-report 模版，默认 full variant；根因、evidence_refs、impacted_areas 都编入 JSON）。
- diff 模式 → `report.html`（scan-report 模版，含根因、evidence_refs、impacted_areas）。
- conflict 模式 → `report.html`（conflict-report 模版，含 side_a / side_b 与 resolution_plan）。
