# Execution Protocol — Stage-Internal Task Orchestration

适用范围：用户已确认 env profile 且 env-preflight 全部探测无 blocker 后的全部阶段。

## 禁止派 Worker 的场景（hard gate）

- silent-mode（`/playwright-automation <title>` 不带环境）
- env-preflight 全阶段（含 tool_permission_denied、session expired、no_permission 路径）
- 任何输出 BLOCKED 模板前

禁止派 Worker 期间一律禁止 TodoWrite、禁止 Agent dispatch。

## 阶段调度表

| 阶段 | 调度 |
| --- | --- |
| case-normalize | 主会话 |
| env-preflight | 主会话 |
| ui-plan | 主会话 |
| ui-probe | Agent |
| plan-reconcile | 主会话 |
| playwright-generate | Agent |
| self-run | Agent |
| run-triage | 主会话 |
| repair-loop | Agent（每次修复一个 fresh subagent）|
| quality-gate | spec-reviewer + quality-reviewer 替代 |
| handoff | 主会话 |

## TodoWrite 编排

进入 Worker 编排可用窗口后：
1. 主 Skill 一次性创建 11 项 TodoWrite，对应上表阶段
2. 已在窗口开启前完成的阶段，创建后立即标 `completed`；后续阶段开始时把对应 todo 标 `in_progress`，完成后标 `completed`
3. Worker 不读 SKILL.md，不维护 TodoWrite

## Worker 派发协议

运行时安全：仅当 `prompts/agent-worker.md`、`prompts/agent-spec-reviewer.md`、`prompts/agent-quality-reviewer.md` 均存在时，才允许启用 Worker 编排与二阶段 Review；任一模板缺失时不得派 Worker，不得进入模板驱动 review。

按 `prompts/agent-worker.md` 模板构造 prompt。
重阶段使用 Agent tool，subagent_type=general-purpose；model 按任务复杂度选择：
- ui-probe / self-run → standard
- playwright-generate / repair-loop → strong

## 二阶段 Review 协议

每个重阶段产物落盘后：
1. spec-reviewer（主会话执行，按 `prompts/agent-spec-reviewer.md`）
2. spec 通过 → quality-reviewer（Agent，按 `prompts/agent-quality-reviewer.md`）
3. 任一 reviewer 不通过 → Worker 修复 → re-review

## Review Loop 上限

- spec review ≤ 3 次重试；超限进入 handoff，报 `failed_quality_gate`
- quality review ≤ 3 次重试；超限同上
- repair-loop 仍为 ≤ 3 次/spec（沿用现有硬规则，与 review loop 独立计数）
- locator 内部重试 ≤ 2 次（不变）

## Worker Status 处置

| Status | 主 Skill 动作 |
| --- | --- |
| DONE | 进入 spec review |
| DONE_WITH_CONCERNS | 记录到 manifest.json#stage_history；进入 spec review |
| NEEDS_CONTEXT | 主 Skill 补 context 重派 |
| BLOCKED | 查 `blocked.kind` → 找对应硬规则模板输出，不进入 review |

BlockedEnvelope JSON schema：

必填字段：`status`、`artifacts_written`、`concerns`、`needs_context`、`blocked`。`blocked.kind` 使用枚举式阻塞类型，示例包括 `session_expired`、`tool_permission_denied`、`no_permission`。

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
