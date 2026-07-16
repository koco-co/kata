# Worker Prompt Template (case-draft)

主 Skill 仅在 SKILL.md 工作流允许的 Worker 窗口派发本模板：`historical-context`、`requirement-atomize`、`case-draft`。静默模式允许内部 Worker，但禁止用户可见进度；source-intake/error-fallback 与 BlockedEnvelope 路径禁止继续派发 Worker。

BlockedEnvelope 指下方 `status: "BLOCKED"` 的完整 Status Envelope。

## 必备输入字段

主 Skill 构造 Worker prompt 时必须提供：

- 阶段名，例如 `historical-context`、`requirement-atomize`、`case-draft`
- 子任务描述：一句话说明本次 Worker 的职责范围
- 当前阶段 reference 摘要（不超过 200 字），由主 Skill 从已加载 reference 中抽取
- 已落盘 artifact 列表，含路径、schema 或文件类型、当前状态摘要
- `source_snapshot`、`source_refs`，或等价 evidence snapshot 绝对/相对路径
- 当前 feature 目录绝对路径
- 当前 `requirement_atoms` 摘要；每行包含 `{ id, source_ref, evidence_kind, ambiguity_class, confidence }`
- 修复或起草用例时 `case_id` 与 `requirement_atom_ids` 的映射上下文
- 允许写入的 artifact 路径白名单

## 必备约束

主 Skill 必须把以下约束逐字粘贴到 Worker prompt：

> 你不读 SKILL.md，不读硬规则。
> 你不调用、不创建、不维护 TodoWrite。
> 子任务完成后只返回 JSON Status Envelope，不得追加任何叙述性文字、Markdown 或面向用户的内容。
> 不得直接回复用户；需要用户补充、确认或授权时，返回 BlockedEnvelope 交回主 Skill。
> 遇到阻塞必须返回 BlockedEnvelope，不得自行追问用户。
> 只能写入当前 feature 目录或 prompt 明确分配的 artifact 路径；不得写 source repo、只读证据目录或无关 workspace 文件。
> 只能把 provenance 写入当前 repo contract 允许的结构：metadata requirement atoms、`.process/case-evidence-map.json`（CaseEvidenceMap@1）与 `.process/coverage-matrix.json`。
> 不得把 SourceRef/SR/csv refs 或任何证据定位文本写进 `cases/archive.md`、`cases/archive.draft.md`、`cases/cases.xmind` 的展示文本。
> 不得使用旧映射字段 `requirement_id`；用例追溯必须使用 `case_id` 与 `requirement_atom_ids`。
> Worker 返回必须符合 WorkerStatusEnvelope@1；`blocked.kind` 只能是 `missing_evidence`、`ambiguous_requirement`、`history_only`、`missing_required_fact`。`missing_required_fact` 仅指 `prd_id`/需求名/客户/版本等外部事实缺失；`case_id` 由起草流程生成，不得向用户索要。
> `source_intake_failed` 仅属于主 Skill 的 source-intake/error-fallback，不属于 Worker `blocked.kind`。
> 任务涉及表单类用例，且用户或 source_snapshot 提供了源码、平台 DOM/YAML、环境配置或截图证据时，必须先使用这些证据中的表单字段基线；不得写入基线中不存在的字段、选项、按钮或配置项。缺少或无法读取基线时返回 `BLOCKED`，`blocked.kind="missing_evidence"`。
> 用例步骤里的菜单/左导航名、页面与向导步骤、按钮文案、表单字段与统计函数枚举，必须逐字来自主 Skill 传入的目标环境 DOM 摘要（`sites/<host>/dom-*.md`）或用户截图；**不得用 fewshot、`modules/*.md` 或历史用例的菜单名兜底**（这些是岚图定制名，标品不同）。目标环境 DOM 缺失时返回 `BLOCKED`，`blocked.kind="missing_evidence"`，`context` 注明「目标环境 DOM 缺失」；若仅有他环境 DOM（ltqc/ci63 等）可参考、无目标环境确认，用 `DONE_WITH_CONCERNS`，`concerns` 标注「菜单/字段来自他环境，待目标环境确认」，只产 `archive.draft.md`、不产最终 `archive.md`。
> 不得用文件名 basename、few-shot 或派生名兜底 `suite_name`，不得编造 `prd_id`/`prd_version` 等外部事实；缺失时返回 `BLOCKED`，`blocked.kind="missing_required_fact"`。每条用例必须生成唯一 `case_id`，写入 Archive 隐藏注释并同步 CaseEvidenceMap@1。

## Status Envelope

Worker 必须只返回一个 JSON object。`status` 只能是 `DONE`、`DONE_WITH_CONCERNS`、`NEEDS_CONTEXT`、`BLOCKED`。

DONE 示例：

```json
{
  "schema": "WorkerStatusEnvelope@1",
  "status": "DONE",
  "artifacts_written": [
    "workspace/dataAssets/features/v6.4.11/example/metadata.yaml"
  ],
  "concerns": "",
  "needs_context": "",
  "blocked": null
}
```

`DONE_WITH_CONCERNS` 时 `concerns` 必填，描述主 Skill 仍可继续处理的非阻塞风险：

```json
{
  "schema": "WorkerStatusEnvelope@1",
  "status": "DONE_WITH_CONCERNS",
  "artifacts_written": [
    "workspace/dataAssets/features/v6.4.11/example/cases/archive.draft.md",
    "workspace/dataAssets/features/v6.4.11/example/.process/case-evidence-map.json"
  ],
  "concerns": "历史线索仅用于补充覆盖面，未确认新增行为。",
  "needs_context": "",
  "blocked": null
}
```

`NEEDS_CONTEXT` 时 `needs_context` 必填，只可请求主 Skill 已拥有或能安全读取的上下文；不得直接向用户提问：

```json
{
  "schema": "WorkerStatusEnvelope@1",
  "status": "NEEDS_CONTEXT",
  "artifacts_written": [],
  "concerns": "",
  "needs_context": "需要当前 feature 的 CaseEvidenceMap@1 路径和最新 coverage mapping。",
  "blocked": null
}
```

## BlockedEnvelope

`BLOCKED` 时 `blocked` 必填，并保留同一顶层 Status Envelope 形态。`blocked.kind` 仅允许 `missing_evidence`、`ambiguous_requirement`、`history_only`、`missing_required_fact`。

```json
{
  "schema": "WorkerStatusEnvelope@1",
  "status": "BLOCKED",
  "artifacts_written": [
    "workspace/dataAssets/features/v6.4.11/example/cases/unresolved-summary.md"
  ],
  "concerns": "",
  "needs_context": "",
  "blocked": {
    "kind": "missing_evidence",
    "evidence_paths": [
      "workspace/dataAssets/features/v6.4.11/example/.process/source-snapshot.json"
    ],
    "context": {
      "stage": "requirement-atomize",
      "reason": "缺少可支持 requirement_atoms 的产品或设计源证据"
    }
  }
}
```

`ambiguous_requirement` 适用于需求事实互斥或无法默认；`history_only` 适用于仅有历史线索而无产品确认或设计源证据；`missing_evidence` 适用于 source snapshot、source_refs、artifact 或映射上下文缺失；`missing_required_fact` 适用于必须由用户或 ZenTao 提供的外部事实缺失。

## Reviewer 调用 Worker 修复的特殊形态

修复轮次在原 prompt 基础上追加：

- 上次 Status Envelope
- Reviewer issue list
- 允许修改的 artifact 路径白名单
- 相关 `case_id` 与 `requirement_atom_ids` 核对结果
- 明确指令：「修复这些 issue，不得扩大改动范围」
