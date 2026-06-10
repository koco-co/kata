# Worker Prompt Template (case-draft)

主 Skill 只在 SKILL.md 工作流允许的 Worker 窗口派发本模板：`historical-context`、`requirement-atomize`、`case-draft`。Lanhu/Axure URL-only silent-mode、source-intake/error-fallback、任何 BlockedEnvelope 路径均禁止派发 Worker、TodoWrite 或 Agent。

BlockedEnvelope 指下方 `status: "BLOCKED"` 的完整 Status Envelope。

## 必备输入字段

主 Skill 构造 Worker prompt 时必须提供：

- 阶段名，例如 `historical-context`、`requirement-atomize`、`case-draft`
- 子任务描述，一句话说明本次 Worker 只负责什么
- 当前阶段 reference 摘要，不超过 200 字，由主 Skill 从已加载 reference 抽取
- 已落地 artifact 列表，包含路径、schema 或文件类型、当前状态摘要
- `source_snapshot`、`source_refs`，或等价 evidence snapshot 绝对/相对路径
- 当前 feature 目录绝对路径
- 当前 `requirement_atoms` 摘要；FeatureManifest@2 轻量行使用 `{ id, source_ref }`
- 修复或起草用例时的 `case_id` 与 `requirement_atom_ids` 映射上下文
- 允许写入的 artifact 路径白名单

## 必备约束

主 Skill 必须把以下约束逐字粘贴到 Worker prompt：

> 你不读 SKILL.md，不读硬规则。
> 你不调用、不创建、不维护 TodoWrite。
> 你完成子任务后只返回 JSON Status Envelope，不得追加任何叙述性文字、Markdown 或面向用户的内容。
> 你不直接回复用户；需要用户补充、确认或授权时，返回 BlockedEnvelope 交回主 Skill。
> 你遇到阻塞必须返回 BlockedEnvelope，不得自行追问用户。
> 你只能写入当前 feature 目录或 prompt 明确分配的 artifact 路径；不得写 source repo、只读证据目录或无关 workspace 文件。
> 你只能把 provenance 写入当前 repo contract 允许的 JSON/evidence 结构：FeatureManifest@2 的 `case_drafting.requirement_atoms[].source_ref` 轻量行、RequirementAtom@1 的 `source_refs[]`、CaseEvidenceMap@1、coverage mapping。
> 你不得把 SourceRef/SR/csv refs 或任何证据定位文本写进 `archive.md`、`archive.draft.md`、`cases.xmind` 的展示文本。
> 你不得使用旧映射字段 `requirement_id`；用例追溯必须使用 `case_id` 与 `requirement_atom_ids`。
> Worker 的 `blocked.kind` 只能是 `missing_evidence`、`ambiguous_requirement`、`history_only`。
> `source_intake_failed` 仅属于主 Skill 的 source-intake/error-fallback，不属于 Worker `blocked.kind`。
> 当任务涉及表单类用例，且用户或 source_snapshot 提供了源码、平台 DOM/YAML、环境配置或截图证据时，你必须先使用这些证据中的表单字段基线；不得写入基线中不存在的字段、选项、按钮或配置项。缺少或无法读取基线时返回 `BLOCKED`，`blocked.kind="missing_evidence"`。

## Status Envelope

Worker 必须只返回一个 JSON object。`status` 只能是 `DONE`、`DONE_WITH_CONCERNS`、`NEEDS_CONTEXT`、`BLOCKED`。

DONE 示例：

```json
{
  "status": "DONE",
  "artifacts_written": [
    "workspace/dataAssets/features/example/manifest.json"
  ],
  "concerns": "",
  "needs_context": "",
  "blocked": null
}
```

`DONE_WITH_CONCERNS` 时 `concerns` 必填，说明仍可由主 Skill 继续处理的非阻塞风险：

```json
{
  "status": "DONE_WITH_CONCERNS",
  "artifacts_written": [
    "workspace/dataAssets/features/example/archive.draft.md",
    "workspace/dataAssets/features/example/case-evidence-map.json"
  ],
  "concerns": "历史线索仅用于补充覆盖面，未确认新增行为。",
  "needs_context": "",
  "blocked": null
}
```

`NEEDS_CONTEXT` 时 `needs_context` 必填，只能请求主 Skill 已拥有或可安全读取的上下文；不得直接问用户：

```json
{
  "status": "NEEDS_CONTEXT",
  "artifacts_written": [],
  "concerns": "",
  "needs_context": "需要当前 feature 的 CaseEvidenceMap@1 路径和最新 coverage mapping。",
  "blocked": null
}
```

## BlockedEnvelope

`BLOCKED` 时 `blocked` 必填，并保留同一顶层 Status Envelope 形态。`blocked.kind` 仅允许 `missing_evidence`、`ambiguous_requirement`、`history_only`。

```json
{
  "status": "BLOCKED",
  "artifacts_written": [
    "workspace/dataAssets/features/example/unresolved-summary.md"
  ],
  "concerns": "",
  "needs_context": "",
  "blocked": {
    "kind": "missing_evidence",
    "evidence_paths": [
      "workspace/dataAssets/features/example/.process/source-snapshot.json"
    ],
    "context": {
      "stage": "requirement-atomize",
      "reason": "缺少可支持 requirement_atoms 的产品或设计源证据"
    }
  }
}
```

`ambiguous_requirement` 用于需求事实互斥或无法默认；`history_only` 用于只有历史线索而无产品确认或设计源证据；`missing_evidence` 用于 source snapshot、source_refs、artifact 或映射上下文缺失。

## Reviewer 调用 Worker 修复的特殊形态

修复轮次的 prompt 在原 prompt 基础上追加：

- 上次 Status Envelope
- Reviewer issue list
- 允许修改的 artifact 路径白名单
- 相关 `case_id` 与 `requirement_atom_ids` 核对结果
- 明确指令：「修复这些 issue，不要扩大改动范围」
