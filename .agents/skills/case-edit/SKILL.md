---
name: case-edit
description: 用户提供既有 Archive、XMind 或 CSV 用例产物并要求编辑、同步或转换。
---

# case-edit


证据事实必须引用 SourceRef ID。

## 路由摘要

- 编辑或同步用例产物——语义不变是底线。

## 触发条件

- 用户希望对已有测试用例做修改、编辑、同步、标准化、归档或格式转换。
- 用户给出 XMind、CSV 或既有 Archive MD 用例产物的路径。

## 不触发条件

- 用户希望依 PRD 或需求源产出新的测试用例。
- 用户希望基于已有用例创建或运行 Playwright 自动化。

## 按需加载协议

- 默认只读取当前 SKILL.md。
- 禁止批量读取 references/**。
- 只有当前阶段命中表格中的阶段与条件时，才读取对应文件。
- 没有命中的 reference 不得读取；few-shot 只可作为格式参考，不得作为领域事实证据。

| 阶段 | 条件 | 文件 | 类型 | 用途 |
| --- | --- | --- | --- | --- |
| plan_edit, preview_diff, output | `step.id in [plan_edit, preview_diff, output] and outputs.ids contains archive` | references/archive-xmind-sync.md | 规范 | 规划编辑、预览差异或导出用例时，保持 Archive 与 XMind 之间的一致性。 |
| apply-corrections | `step.id == apply-corrections` | references/apply-corrections.md | 规范 | 加载 case-corrections.md + sidecar，进行 dry-run summary 三选一，按 status=approved 回写 archive.md，调用 archive-xmind-sync 同步 xmind，写 apply-log。 |
| plan_edit, output | `step.id in [plan_edit, output]` | references/fewshots/case-format-sample.md | few-shot | 用例级节点格式参照（含 DQ 子集），仅用于格式参考，不作需求事实来源。 |
| plan_edit, output | `step.id in [plan_edit, output]` | references/fewshots/case-format-sample.xmind.md | few-shot | XMind 用例 topic 与 md 用例的映射对照（ASCII 树状示意，非真 .xmind）。 |
| output | `step.id == output` | rules/case-qa.md | 规则 | 交付前 Archive/XMind 自检维度：字段一致性、标题格式、前置条件可执行性、表单字段逐字匹配。 |

## 硬规则

- 编辑或同步用例时，原有语义须完整保留。
- 缺失的前置条件、步骤或预期结果，不得凭空补造。
- 涉及平台表单字段、菜单路径、规则类型、参数枚举或执行链路的编辑，必须先读取可用的上线需求用例、平台 DOM、源码或项目知识作为证据；无法取得证据时标记为待确认，不得凭经验补字段。
- 表单字段、按钮、Tab、下拉选项和枚举值必须逐字匹配证据中的实际文案；不得将「sql」归一成「SQL」、不得把「字段」写成「字段级」、不得用动作泛称替代按钮全称。
- 交付前必须自审 Archive Markdown 与 XMind 的数量、优先级、标题、前置条件、步骤和预期一致性，不得依赖用户人工发现格式或业务规则问题。
- 用户明确指定用例标题或历史标题包含业务括号（如「验证【规则名】...」）时，必须原样保留业务括号内容，不得按通用标题规则移除。
- 用例级节点格式与可读性以 .agents/contracts/output-artifacts.md 的当前产物矩阵和字段一致性要求为底线；DQ 规则任务管理类用例必须保持 Archive 与 XMind 的标题、步骤、预期结果一致，不得因格式转换丢失业务语义。
