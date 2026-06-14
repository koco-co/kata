---
name: case-draft
description: 依 Lanhu/Axure 链接(lanhuapp.com，含 axure/产品设计 URL)、Markdown PRD、设计稿、截图、fixture 或功能描述等需求源，生成、扩写或复核 QA 测试用例，产出 archive.md + cases.xmind。仅发送一条 Lanhu/Axure 链接即可直接触发，无需附带文字说明。仅做 Archive/XMind/CSV 格式转换请转至 case-edit；基于已有用例做自动化请转至 playwright-automation。
argument-hint: "<Lanhu/Axure URL | Markdown PRD 路径 | 截图 | 功能描述>"
user-invocable: true
model: sonnet
effort: high
allowed-tools: Bash(kata *)
---

# case-draft

依需求源生成 QA 用例。每条事实必须有 SourceRef 支撑；缺证据即阻塞，不得编造。

## 路由边界

以下场景不属本 skill 范围，请转至对应 skill：

- 纯 Archive/XMind/CSV 格式转换 → case-edit
- 基于已有用例做自动化 → playwright-automation
- Lanhu/Axure URL-only 输入：从第一条消息起全程静默执行 source-intake，禁止任何技能宣告、处理计划、进度叙述；唯一可见输出是最终阻塞两行模板，或解除阻塞后的最终交付。

## 工作流

非静默路径用 TodoWrite 建可见阶段进度，逐阶段推进：

1. **module-identify**：先自行推断 workspace 项目（仅在无候选或多候选无法消歧时问用户）；首步执行 `kata features resolve --project <project> --module <module> [--lanhu-page <pageId>] --json`，取返回的 featureDir；featureId 写入 metadata.yaml#id。
2. **historical-context / requirement-atomize / case-draft**：这三阶段按 `prompts/agent-worker.md` 分配 Worker 执行重度任务；Worker 以 Status/BlockedEnvelope 回传结果，遇到阻塞不直接询问用户。
3. **case-review → output**：spec review（主会话，`prompts/agent-spec-reviewer.md`）通过后派 quality review（fresh subagent，`prompts/agent-quality-reviewer.md`）；blocking pending 清零后生成 cases/archive.md，再运行 `kata xmind-gen --input cases/archive.md --output cases/cases.xmind` 产出 XMind。

## 何时加载哪个文件

| 文件                              | 何时读                    | 作用                                              |
| --------------------------------- | ------------------------- | ------------------------------------------------- |
| prompts/agent-worker.md           | 派发 case-draft Worker 时 | Worker 输入字段、写入范围、Status/BlockedEnvelope |
| prompts/agent-spec-reviewer.md    | case-review 阶段          | spec 合规、SourceRef 分层、case_id 核对机械检查   |
| prompts/agent-quality-reviewer.md | output 前内容质量审查     | 步骤完整性、标题、覆盖与一致性                    |
| rules/naming-convention.md        | 新建 feature 目录时       | 目录命名格式与客户缩写                            |
| .claude/prompt/_shared/case-format-sample.md | 需要用例节点格式参照时 | 格式样例（含 DQ），不作事实来源 |
| .claude/prompt/_shared/case-qa.md | 交付前自审（共享引用）    | 字段一致性、标题、前置条件、表单逐字匹配          |

## 产物与引用规范

- 所有产物写入 `kata features resolve` 返回的 `featureDir`。
- 每个 requirement atom 必须包含 `evidence_kind`、`ambiguity_class`、`confidence`，以及至少一个 `source_ref`。
- 事实引用走 `metadata.yaml#case_drafting.requirement_atoms` 的 SourceRef ID：轻量行写 `{id, source_ref}`，完整信息保留在 `source_refs` / `case_id` / `requirement_atom_ids`。
- 证据分层：`cases/archive.md` / `cases/archive.draft.md` / `cases/cases.xmind` 正文只保留人类可读用例内容；SourceRef 标识（`SR-`、`csv::`、SourceRef 字符串）只存储在结构化数据层，不得出现在展示文本中。
- 用例与证据的对照关系用 `case_id` 与 `requirement_atom_ids` 核对，不得用单一字段组合充当唯一键——单字段组合容易撞键，无法精确对齐证据。
- `history_inferred` 仅作为参考证据，新增行为一律以产品反馈为准。

## 交付约束

- `blocking pending` 未清零时，只允许产出草稿与确认类产物（`cases/confirmation-package.md` / `cases/archive.draft.md` / `cases/unresolved-summary.md`；`error-fallback` 下豁免并保留 URL token 表与 SourceRef ID）。清零后才生成 `cases/archive.md`，再由 `kata xmind-gen` 产出 `cases/cases.xmind`。
- 产物落盘后、交付前，运行 `kata cases lint --scope <featureDir> --exit-code` 和 `kata cases validate --project <project> --feature-id <featureId>`，修复所有 violation 后再进入 review。
- `metadata.yaml#automation.intents[]` 中状态为 `ready` 的 `AutomationIntent`，移交给 `playwright-automation`。

## 表单用例规则

- 用户提供源码、平台 DOM/YAML、环境配置或截图作为表单证据时，这些证据必须进入必读集。
- 生成表单用例前必须先建立「表单字段基线」，不得写入基线之外的字段、选项或按钮。QA 需按实际文案逐字核对，多写即失真。
- 表单证据不可读时，用 `AskUserQuestion` 一次性批量索要缺口（推荐项置顶并附理由）；不得凭历史记录、few-shot 或模板补齐后产出最终 `cases/archive.md` / `cases/cases.xmind`。

## 产物

最终交付：archive.md、cases.xmind、confirmation-package.md、unresolved-summary.md 等用例产物存放于 `cases/` 子目录；metadata.yaml 存放于 feature 根目录；source-snapshot.json、coverage-matrix.json 等过程与证据产物存放于 `.process/` 子目录。清单与字段细则见 `.claude/prompt/_shared/output-artifacts.md` 与 `.claude/prompt/_shared/case-qa.md`（共享引用）。
