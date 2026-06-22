---
name: case-draft
description: 依 Lanhu/Axure 链接(lanhuapp.com，含 axure/产品设计 URL)、Markdown PRD、设计稿、截图、fixture 或功能描述等需求源，生成、扩写或复核 QA 测试用例，产出 archive.md + cases.xmind。仅发送一条 Lanhu/Axure 链接即可直接触发，无需附带文字说明。仅做 Archive/XMind/CSV 格式转换请转至 case-edit；基于已有用例做自动化请转至 playwright-automation；单条 bug 记录（bug ID / ZenTao bug URL bug-view-NNN）请转至 case-hotfix。
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

## 静默模式（Lanhu/Axure URL-only）

Lanhu/Axure URL-only 输入：从第一条消息起全程静默执行 source-intake。期间不得：

- 宣布自己在用哪个技能；
- 给出处理计划；
- 播报执行进度。

唯一可见输出是以下之一：

1. **阻塞说明**（两行）：首行写阻塞原因或缺口，次行写需用户补充的内容；正式记录落 `cases/unresolved-summary.md`。
2. **最终交付**：阻塞解除后直接给出产出文件。

## 工作流

```mermaid
flowchart TD
    SRC["需求源：Lanhu/Axure URL、PRD、截图、描述"] --> Q0{"仅 Lanhu/Axure URL?"}
    Q0 -->|是| SILENT["静默执行：不播报，仅阻塞两行或最终交付"]
    Q0 -->|否| VIS["TodoWrite 建可见阶段进度"]
    SILENT --> MI["module-identify：features resolve → featureDir"]
    VIS --> MI
    MI --> W["Worker 三阶段：historical-context → requirement-atomize → case-draft"]
    W -->|缺证据 BlockedEnvelope| BK["阻塞：写 unresolved-summary.md，不直接问用户"]
    W --> GATE["闸门：kata cases lint + validate，修完再审"]
    GATE --> SR{"spec review 主会话"}
    SR -->|不过| W
    SR -->|过| QR{"quality review fresh 子代理"}
    QR -->|不过| W
    QR -->|过| BP{"blocking pending 清零?"}
    BP -->|否| DRAFT["只出 draft / confirmation / unresolved 产物"]
    BP -->|是| AR["cases/archive.md"]
    AR --> XM["kata xmind-gen → cases/cases.xmind"]
```

非静默路径用 TodoWrite 建可见阶段进度，逐阶段推进：

1. **module-identify**：先自行推断 workspace 项目（仅在无候选或多候选无法消歧时问用户）；首步执行 `kata features resolve --project <project> --module <module> --feature-version <vX.Y.Z> [--lanhu-page <pageId>] --json`，取返回的 featureDir；featureId 写入 metadata.yaml#id。**漏传 `--feature-version` 会落 `features/_standing/`（长期主流程/冒烟区）；版本类需求必须显式传，版本号由 CLI 按 `VERSION_DIR_RE`（v6.4.11 式）归一化、模型不得自拼，未知时先 `AskUserQuestion` 确认再 resolve。**
2. **historical-context / requirement-atomize / case-draft**：这三阶段派 Worker 执行繁重处理（加载哪个文件见下方表）；Worker 以 Status/BlockedEnvelope 回传结果，遇到阻塞不直接询问用户。
3. **case-review → output**：spec review（主会话）通过后派 quality review（fresh subagent）；blocking pending 清零后生成 cases/archive.md，再运行 `kata xmind-gen --input cases/archive.md --output cases/cases.xmind` 产出 XMind。

## 何时加载哪个文件

| 文件                              | 何时读                    | 作用                                              |
| --------------------------------- | ------------------------- | ------------------------------------------------- |
| prompts/agent-worker.md           | 派发 case-draft Worker 时 | Worker 输入字段、写入范围、Status/BlockedEnvelope |
| prompts/agent-spec-reviewer.md    | case-review 阶段          | spec 合规、SourceRef 分层、case_id 核对机械检查   |
| prompts/agent-quality-reviewer.md | output 前内容质量审查     | 步骤完整性、标题、覆盖与一致性                    |
| rules/naming-convention.md        | 新建 feature 目录时       | 目录命名格式与客户缩写                            |
| references/source-refs.md         | 需要核对 source_ref 锚点语法或 SR 前缀时 | source_ref 的 scheme#anchor 规范、SR- 注册前缀、证据分层 |
| .claude/prompt/_shared/case-format-sample.md | 需要用例节点格式参照时 | 格式样例（含 DQ 子集），不作事实来源 |
| .claude/prompt/_shared/case-qa.md | 交付前自审（共享引用）    | 字段一致性、标题、前置条件、表单逐字匹配          |

## 产物与引用规范

- 所有产物写入 `kata features resolve` 返回的 `featureDir`。
- 每个 requirement atom 必须包含 `evidence_kind`、`ambiguity_class`、`confidence`，以及至少一个 `source_ref`。
- 事实引用走 `metadata.yaml#case_drafting.requirement_atoms` 的 SourceRef ID：轻量行写 `{id, source_ref}`，完整信息保留在 `source_refs` / `case_id` / `requirement_atom_ids`。
- 证据分层（SourceRef 标识不进交付正文、只存结构化数据层）的权威细则见 `references/source-refs.md` 的「证据分层」。
- 用例与证据的对照关系用 `case_id` 与 `requirement_atom_ids` 核对，不得用单一字段组合充当唯一键——单字段组合容易撞键，无法把证据精确对应到用例。
- `history_inferred` 仅作为参考证据，新增行为一律以产品反馈为准。

### 落盘位置（产物 → 目录）

| 产物                                                                                | 落盘目录          |
| ----------------------------------------------------------------------------------- | ----------------- |
| `archive.md`、`cases.xmind`、`confirmation-package.md`、`unresolved-summary.md` 等用例产物 | `cases/` 子目录   |
| `metadata.yaml`                                                                      | feature 根目录    |
| `source-snapshot.json`、`coverage-matrix.json` 等过程与证据产物                       | `.process/` 子目录 |

清单与字段细则见 `.claude/prompt/_shared/output-artifacts.md` 与 `.claude/prompt/_shared/case-qa.md`（共享引用）。

## 事实字段：严禁编造，缺失即阻塞

`suite_name`（需求名）、`case_id`/`prd_id`（ZenTao 需求 id）、`prd_version`（lanhu-prd 迭代版本，与目录版本一致）、`product_line`（产品线名）、目标版本目录（`--feature-version`）是需向用户/ZenTao 确认的**外部事实**，不是可自由填的格式字段——它们会渲染进 xmind 可见节点或决定归类。任一字段无 SourceRef/用户明示时，主会话必须用 `AskUserQuestion` 一次性批量索要（推荐项置顶并附理由），严禁编造编号、自创需求名、拿 basename/迭代号/目录版本等默认值兜底后产出 `cases/archive.md` / `cases/cases.xmind`。字段→xmind 渲染映射见 `.claude/prompt/_shared/case-format-sample.xmind.md`。

## 交付约束

- `blocking pending` 未清零时，只允许产出草稿与确认类产物（`cases/confirmation-package.md` / `cases/archive.draft.md` / `cases/unresolved-summary.md`；`error-fallback` 下豁免并保留 URL token 表与 SourceRef ID）。清零后才生成 `cases/archive.md`，再由 `kata xmind-gen` 产出 `cases/cases.xmind`。
- 产物落盘后、交付前，按 lint→validate→verify 顺序跑三条 exit-code 门，全部为零再进入 review——把机械可查的字段/结构错误挡在人工审查之前，避免 reviewer 把精力浪费在命令本可发现的问题上：
  1. `kata cases lint --scope <featureDir> --exit-code`
  2. `kata cases validate <featureId> --project <project>`
  3. `kata cases verify --project <project> --feature <featureId> --exit-code`（默认 `--required-kinds lanhu.fixture,knowledge.entry,repo.line`，flag 以 `kata cases verify --help` 为准）

  verify 是三层硬校验门（L1 结构 / L2 输入消费 / L3 内容质量）；L1/L2/L3 全量触发只在 feature metadata `case_drafting.status=completed` 时发生，`blocked`/`in-progress` 路径跳过，不会误报。
- `metadata.yaml#automation.intents[]` 中状态为 `ready` 的 `AutomationIntent`，移交给 `playwright-automation`。
- 生成 `cases/archive.md` 后、产 `cases.xmind` 前，必须回读核对：实际用例数须等于 frontmatter `case_count`（该一致性由 `kata cases lint` 的 `archive-case-count-mismatch` 硬校验，FAIL 即阻塞）；产 xmind 后回读根节点版本段、各二级节点标题与 `(#N)` label，与 module-identify 阶段确认的需求名/需求 id/版本基线逐字比对，任一不符先修正再交付。

## 表单用例规则

- 用户提供源码、平台 DOM/YAML、环境配置或截图作为表单证据时，这些证据必须进入必读集。
- 生成表单用例前必须先建立「表单字段基线」，不得写入基线之外的字段、选项或按钮。QA 需按实际文案逐字核对——写入基线外的字段、选项会让用例与真实表单脱节，执行时对不上，等于失真。
- 表单证据不可读时，或「事实字段」小节列出的外部事实字段缺证据时，用 `AskUserQuestion` 一次性批量索要缺口（推荐项置顶并附理由）；不得凭历史记录、few-shot 或模板补齐后产出最终 `cases/archive.md` / `cases/cases.xmind`。
