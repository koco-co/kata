# 执行协议：阶段内的任务调度

适用范围：用户已确认 env profile，且 env-preflight 全部探测无 blocker 之后的所有阶段。

## 禁止派执行子代理的场景（硬性闸门）

- 静默模式（`/playwright-automation <title>` 不带环境）
- env-preflight 全阶段（含 tool_permission_denied、session expired、no_permission 路径）
- 任何输出 BLOCKED 模板之前

禁止派执行子代理期间，一律禁止 TodoWrite，禁止派发 Agent。

## 阶段调度表

| 阶段                | 调度                                  |
| ------------------- | ------------------------------------- |
| case-normalize      | 主会话                                |
| env-preflight       | 主会话                                |
| ui-plan             | 主会话                                |
| ui-probe            | Agent                                 |
| plan-reconcile      | 主会话                                |
| playwright-generate | Agent                                 |
| self-run            | Agent                                 |
| run-triage          | 主会话                                |
| repair-loop         | Agent（每次修复都新开一个全新 subagent）  |
| quality-gate        | spec-reviewer + quality-reviewer 替代 |
| handoff             | 主会话                                |

## TodoWrite 进度维护

进入可派执行子代理的窗口后：

1. 主 Skill 一次性创建 11 项 TodoWrite，对应上表的阶段
2. 在窗口开启前就已完成的阶段，创建后立即标 `completed`；后续阶段开始时把对应 todo 标 `in_progress`，完成后标 `completed`
3. 执行子代理不读 SKILL.md，也不维护 TodoWrite

## 执行子代理派发协议

运行时安全：只有 `prompts/agent-worker.md`、`prompts/agent-spec-reviewer.md`、`prompts/agent-quality-reviewer.md` 三个模板都存在时，才允许派发执行子代理并启用二阶段评审；任一模板缺失，就不得派执行子代理，也不得进入模板驱动的评审。

按 `prompts/agent-worker.md` 模板构造 prompt。
重阶段使用 Agent tool，subagent_type=general-purpose；model 按任务复杂度选择：

- ui-probe / self-run → standard
- playwright-generate / repair-loop → strong

## 二阶段评审协议

每个重阶段产物落盘后：

1. spec-reviewer（主会话执行，按 `prompts/agent-spec-reviewer.md`）
2. spec 通过 → quality-reviewer（Agent，按 `prompts/agent-quality-reviewer.md`）
3. 任一 reviewer 不通过 → 执行子代理修复 → 重新评审

## 评审循环上限

- spec 评审 ≤ 3 次重试；超限进入 handoff，报 `failed_quality_gate`
- quality 评审 ≤ 3 次重试；超限同上
- repair-loop 仍为 ≤ 3 次/spec（沿用现有规则，与评审循环独立计数）
- locator 内部重试 ≤ 2 次（不变）

## 执行子代理 Status 处置

| Status             | 主 Skill 动作                                           |
| ------------------ | ------------------------------------------------------- |
| DONE               | 进入 spec 评审                                          |
| DONE_WITH_CONCERNS | 记录到 manifest.json#stage_history；进入 spec 评审      |
| NEEDS_CONTEXT      | 主 Skill 补足 context 后重新派发                        |
| BLOCKED            | 查 `blocked.kind` → 输出对应的规则模板，不进入评审      |

BlockedEnvelope JSON schema：

必填字段：`status`、`artifacts_written`、`concerns`、`needs_context`、`blocked`。`blocked.kind` 使用枚举形式的阻塞类型，示例包括 `session_expired`、`tool_permission_denied`、`no_permission`。

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
