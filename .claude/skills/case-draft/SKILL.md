---
name: case-draft
description: 依需求文档/PRD/设计稿/Lanhu/Axure/功能描述生成、扩写或复核 QA 测试用例，产出 archive.md + cases.xmind。给出需求源时用。
when_to_use: 给出 lanhuapp.com 链接（含 axure/产品设计 URL）、Markdown PRD、截图、fixture 或功能描述要产用例时用；只发一条 Lanhu/Axure 链接零文字也直接触发。只在 Archive/XMind/CSV 间转换 → case-edit；基于用例做自动化 → playwright-automation。
argument-hint: "<Lanhu/Axure URL | Markdown PRD 路径 | 截图 | 功能描述>"
user-invocable: true
model: sonnet
effort: high
allowed-tools: Bash(kata *)
---

# case-draft

依需求源生成 QA 用例：证据驱动——凡事实必有 SourceRef 支撑，缺证据则阻塞而非编造。

## 路由边界

- 触发：基于需求/PRD/设计稿/原型链接/截图/功能描述生成、扩写或复核用例。
- 改走：纯 Archive/XMind/CSV 格式转换 → case-edit；基于已有用例做自动化 → playwright-automation。
- Lanhu/Axure URL-only 输入：从第一条消息起全程静默跑 source-intake，禁止任何技能宣告/处理计划/进度叙述；唯一可见输出是最终阻塞两行模板，或解除阻塞后的最终交付。

## 工作流

非静默路径用 TodoWrite 建可见阶段进度，逐阶段推进：

1. **module-identify**：先自行推断 workspace 项目（仅在无候选或多候选无法消歧时问用户）；首步执行 `kata features resolve --project <project> --module <module> [--lanhu-page <pageId>] --json`，取返回的 featureDir 作为所有产物唯一写入根，featureId 写 metadata.yaml#id。禁止自行拼接 feature 目录路径（版本号/slug 由引擎处理）。
2. **historical-context / requirement-atomize / case-draft**：这三阶段按 `prompts/agent-worker.md` 派发 Worker 做重活；Worker 以 Status/BlockedEnvelope 回传，遇阻不直接问用户。
3. **case-review → output**：spec review（主会话，`prompts/agent-spec-reviewer.md`）通过后派 quality review（fresh subagent，`prompts/agent-quality-reviewer.md`）；blocking pending 清零后才生成 archive.md / cases.xmind。

## 何时加载哪个文件

| 文件                               | 何时读                    | 作用                                              |
| ---------------------------------- | ------------------------- | ------------------------------------------------- |
| prompts/agent-worker.md            | 派发 case-draft Worker 时 | Worker 输入字段、写入范围、Status/BlockedEnvelope |
| prompts/agent-spec-reviewer.md     | case-review 阶段          | spec 合规、SourceRef 分层、case_id 对账机械检查   |
| prompts/agent-quality-reviewer.md  | output 前内容质量审查     | 步骤完整性、标题、覆盖与一致性                    |
| rules/naming-convention.md         | 新建 feature 目录时       | 目录命名格式与客户缩写                            |
| fewshots/case-format-sample.md     | 需要用例节点格式参照时    | 格式样例（含 DQ），不作事实来源                   |
| .claude/prompt/\_shared/case-qa.md | 交付前自审                | 字段一致性、标题、前置条件、表单逐字匹配          |

## 硬规则（不变量）

- 所有产物写入 `kata features resolve` 返回的 featureDir；自行拼接 feature 路径视为未完成。
- 每个 requirement atom 带 evidence_kind、ambiguity_class、confidence 与 ≥1 个 source_ref；事实通过 manifest.json#case_drafting.requirement_atoms 的 SourceRef ID 引用（轻量行 `{id, source_ref}`，完整路径保留 source_refs / case_id / requirement_atom_ids）。
- 证据分层：archive.md / archive.draft.md / cases.xmind 正文只留人类可读用例内容；SourceRef 标识（SR-、csv::、SourceRef 串）只存结构化数据层。
- 用例↔证据用 case_id 与 requirement_atom_ids 对账，不用单一字段组合做唯一键。
- blocking pending 非零时只出草稿与确认类产物（confirmation-package.md / archive.draft.md / unresolved-summary.md，error-fallback 下豁免并保留 URL token 表与 SourceRef ID）；清零后才生成 archive.md 与 cases.xmind。
- history_inferred 仅作参考证据，新增行为以产品反馈为准；manifest.json#automation.intents[] 中 ready 的 AutomationIntent 移交 playwright-automation。
- 表单类用例：用户给出或要求参考源码、平台 DOM/YAML、环境配置、截图控件时，这些证据必须进入必读集；生成前先建「表单字段基线」，不写基线外的字段/选项/按钮。证据不可读时用 AskUserQuestion 一次性批量索要缺口（推荐项置顶并附理由），不得凭历史/few-shot/模板补齐后产出最终 archive.md/cases.xmind。

## 产物

交付层仅 archive.md、cases.xmind、metadata.yaml、manifest.json 四件落 feature 根；source-snapshot.json、coverage-matrix.json 等过程/证据产物落 .process/。清单与字段细则以 `.claude/prompt/_shared/output-artifacts.md` 与 `.claude/prompt/_shared/case-qa.md` 为准。
