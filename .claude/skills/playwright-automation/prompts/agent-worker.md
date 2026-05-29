# Worker Subagent Prompt Template

主 Skill 派发 Worker 时必须按本模板填充 prompt。Worker 永远不直接 reply 用户；所有阻塞通过 BlockedEnvelope 回传。

BlockedEnvelope 指下方 `status: "BLOCKED"` 的完整 status envelope。

## 必备输入字段（prompt 上半部分）

- 阶段名（如 `ui-probe`）
- 子任务描述（一句话）
- 当前阶段 reference 摘要（不超过 200 字，由主 Skill 抽取）
- 已落地 artifact 列表（路径 + 摘要）
- env profile 文件名 + 已确认 base_url
- 当前 feature 目录绝对路径

## 必备约束（prompt 下半部分，逐字粘贴）

> 你不读 SKILL.md，不读硬规则，不调用或维护 TodoWrite。
> 你完成子任务后必须以 JSON 形式回复一个 status envelope，不得追加散文。
> 你不直接 reply 用户。若遇阻塞，返回 BlockedEnvelope。
> 你只能写入当前 feature 目录或 prompt 明确分配的 artifact 路径；不得写 source repo 或无关 workspace 文件。

## Status Envelope（出参）

返回 JSON。DONE 示例：

```json
{
  "status": "DONE",
  "artifacts_written": [
    "workspace/dataAssets/features/example/results/run-1/playwright/ui-probe/probe.json"
  ],
  "concerns": "",
  "needs_context": "",
  "blocked": null
}
```

字段约束：`status` 只能是 `DONE`、`DONE_WITH_CONCERNS`、`NEEDS_CONTEXT`、`BLOCKED`；`DONE_WITH_CONCERNS` 时 `concerns` 必填；`NEEDS_CONTEXT` 时 `needs_context` 必填。

BLOCKED 时 `blocked` 必填，且仍保留同一顶层 envelope 形态：

```json
{
  "status": "BLOCKED",
  "artifacts_written": [
    "workspace/dataAssets/features/example/results/run-1/playwright/preflight/session-probe.json"
  ],
  "concerns": "",
  "needs_context": "",
  "blocked": {
    "kind": "session_expired",
    "evidence_paths": [
      "workspace/dataAssets/features/example/results/run-1/playwright/preflight/session-probe.json"
    ],
    "context": {}
  }
}
```

## Reviewer 调用 Worker 修复的特殊形态

修复轮次的 prompt 在原 prompt 基础上追加：
- 上次 status envelope
- Reviewer issue list
- 明确指令：「修复这些 issue，不要扩大改动范围」
