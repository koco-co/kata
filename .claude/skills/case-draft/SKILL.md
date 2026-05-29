---
name: case-draft
description: 用户提供 PRD、设计稿、Lanhu、Axure 或功能描述并要求生成 QA 用例。
when_to_use: 用户提供需求文档、设计源或功能描述并要求生成 QA 测试用例时使用。
user-invocable: true
model: sonnet
effort: high
context: fork
agent: general-purpose
paths:
  - "**/*.md"
  - "**/*.json"
  - "**/*.png"
---

# case-draft


证据事实必须引用 SourceRef ID。

## 路由摘要

- 流程编排、步骤集合、blackboard 输入输出、失败模式与人工确认节点以本 SKILL.md 的「## 按需加载协议」表及其引用的 prompts/references 为准（skill 自包含，无外部 workflow 规范源）。
- 首步执行 `bun engine/bin/kata features resolve --project <project> --module <module> --lanhu-page <pageId> --json`，从返回的 JSON 取 featureDir 作为所有产物的唯一写入根。featureId 写入 metadata.yaml#id。禁止自行拼接 workspace/{project}/features/{YYYY-MM-xxx} 路径。
- 阶段内任务编排细节（worker-prompt / spec-reviewer-prompt / quality-reviewer-prompt）见下方"## 按需加载协议"表对应阶段行；Lanhu/Axure 阻塞与 error-fallback 路径下禁用。

## 触发条件

- 用户希望基于需求、PRD、设计稿或原型链接生成、扩写或复核测试用例。
- 用户提供 Lanhu、Axure、Markdown PRD、截图、fixture 或功能描述作为需求源。

## 不触发条件

- 用户只是要做 Archive MD、XMind 或 CSV 之间的格式转换。
- 用户要基于已有用例生成或修复 Playwright 自动化脚本。

## 按需加载协议

- 默认只读取当前 SKILL.md。
- 禁止批量读取 prompts/\*\*、fewshots/\*\*。
- 只有当前阶段命中表格中的阶段与条件时，才读取对应文件。
- 没有命中的 reference 不得读取；few-shot 只可作为格式参考，不得作为领域事实证据。

| 阶段 | 条件 | 文件 | 类型 | 用途 |
| --- | --- | --- | --- | --- |
| case-draft, case-review | `step.id in [case-draft, case-review]` | prompts/agent-spec-reviewer.md | 规范 | 机械复核 spec 合规、SourceRef 分层、`case_id` 对账与 blocking pending。 |
| case-draft, output | `step.id in [case-draft, output]` | prompts/agent-quality-reviewer.md | 规范 | 审查用例内容质量，包括步骤完整性、标题可读性、覆盖质量与表述一致性。 |
| historical-context, requirement-atomize, case-draft | `step.id in [historical-context, requirement-atomize, case-draft]` | prompts/agent-worker.md | 规范 | 在允许的阶段内派发 case-draft Worker 时，限定输入字段、写入范围、状态 envelope 与证据分层规则。 |
| case-draft, output | `step.id in [case-draft, output]` | fewshots/case-format-sample.md | few-shot | 用例级节点格式参照（含 DQ 子集），仅用于格式参考，不作需求事实来源。 |
| case-draft, output | `step.id in [case-draft, output]` | fewshots/case-format-sample.xmind.md | few-shot | XMind 用例 topic 与 md 用例的映射对照（ASCII 树状示意，非真 .xmind）。 |
| module-identify | `step.id == module-identify and feature_dir_is_new` | rules/naming-convention.md | 规则 | 新建 feature 目录时的命名格式与客户缩写列表。 |
| case-review, output | `step.id in [case-review, output]` | .claude/prompt/_shared/case-qa.md | 规则 | 交付前 Archive/XMind 自检维度：字段一致性、标题格式、前置条件可执行性、表单字段逐字匹配。 |

## 硬规则

- Lanhu/Axure URL 输入：从第一条 assistant 消息起即全程静默执行 source-intake，禁止任何技能宣告（如「使用 case-draft 处理这个需求源…」）、处理计划、阶段/进度叙述、抓取或落盘说明；唯一允许的面向用户文本是最终阻塞两行模板，或解除阻塞后的最终交付。
- Lanhu/Axure URL 的 source-intake、token 搜索顺序、抓取降级、阻塞草稿产物格式、fallback 回复模板与权限拒绝行为以当前 workflow 和本 SKILL.md 硬规则为准。
- 项目未指定时先自行推断 workspace 项目；仅在无候选或多候选无法消歧时询问用户。
- 所有产物必须写入 `kata features resolve` 返回的 featureDir，禁止模型自行拼接 feature 目录路径。违者视为未完成。
- 历史上下文：history_inferred 作为参考证据使用，新增行为的确认以产品反馈为准。
- 每个 requirement atom 携带 evidence_kind、ambiguity_class、confidence 和至少一个 source_ref。
- 证据事实通过 manifest.json#case_drafting.requirement_atoms 中的 SourceRef ID 引用；轻量路径用 { id, source_ref }，完整路径按各自的 schema 保留 source_refs、case_id 与 requirement_atom_ids。
- archive.md、archive.draft.md、cases.xmind 正文只保留人类可读用例内容；SourceRef 标识（SR-<ID>、csv::、SourceRef 字符串、CSV 证据定位文本）仅存在于结构化数据层。
- 用例与证据映射通过 case_id 与 requirement_atom_ids 对账；单一字段组合（如 atom_id/case_title/priority）不作为机器唯一键。
- Lanhu/Axure 阻塞草稿的 confirmation-package.md / unresolved-summary.md 在 error-fallback 路径下豁免，保留 URL token 表与 SourceRef ID。
- archive.md 与 cases.xmind 在 blocking pending 清零后生成；blocking pending 非零时只输出草稿与确认类产物（confirmation-package.md、archive.draft.md、unresolved-summary.md）。
- manifest.json#automation.intents[] 中 automation_status=ready 的 AutomationIntent@1 移交 playwright-automation@1；deferred 与 blocked 只留在 manifest 与报告中。
- Subagent 遇阻塞时通过 BlockedEnvelope 回传主 agent，不直接向用户提问。
- slug 兜底由 `kata features resolve` 引擎处理（hexFallbackSlug），模型无需也不应自行实现。
- 交付层仅 archive.md、cases.xmind、metadata.yaml、manifest.json 四件落 feature 根；source-snapshot.json、coverage-matrix.json 及过程/证据产物一律落 .process/。产物清单以 .claude/prompt/_shared/output-artifacts.md 与 .claude/prompt/_shared/case-qa.md 为准。
- 用例级节点格式与内容质量条款以 .claude/prompt/_shared/case-qa.md 和 fewshots/case-format-sample.md 为准；证据底线：Lanhu 设计内容或相关源码读取失败时，用 ask_user 一次性批量索要缺口，不得凭历史/推断产出最终 archive.md/cases.xmind。
- 用户明确给出或要求参考源码、平台 DOM/YAML、环境配置、截图中的表单控件时，这些证据必须进入 source-confirm / historical-context / case-draft 的必读证据；生成表单类用例前必须先建立“表单字段基线”，不得在步骤中写入源码、DOM/YAML 或截图不存在的字段、选项、按钮或配置项。证据不可读时必须阻塞，不得用历史用例、few-shot 或模板补齐。
