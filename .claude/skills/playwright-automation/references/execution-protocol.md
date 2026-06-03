# 执行协议：阶段内的任务调度

适用范围：用户已确认 env profile，且 env-preflight 全部探测无 blocker 之后的所有阶段。

## 禁止派执行子代理的场景（硬性闸门）

- 静默模式（`/playwright-automation <title>` 不带环境）
- env-preflight 全阶段（含 tool_permission_denied、session expired、no_permission 路径）
- 任何输出 BLOCKED 模板之前

禁止派执行子代理期间，一律禁止 TodoWrite，禁止派发 Agent。

## 阶段调度表

| 阶段                | 调度                                                      |
| ------------------- | --------------------------------------------------------- |
| case-normalize      | 主会话                                                    |
| env-preflight       | 主会话（派子代理的硬闸门，不可下放子代理）                |
| ui-plan             | 主会话                                                    |
| ui-probe            | Agent（并入「前置条件处理」opus 子代理：探测+共享层+用例清单校正） |
| plan-reconcile      | 用例 sonnet 子代理内（每条用例自核对）                    |
| playwright-generate | Agent（每条用例一个任务，标题=用例标题，sonnet，限并发）  |
| self-run            | Agent（并入对应用例 sonnet 子代理）                       |
| run-triage          | 主会话（编排：判类 + 动态新增修复任务）                   |
| repair-loop         | Agent（红则动态新增修复任务，sonnet；连 2 次红升级 opus） |
| quality-gate        | spec-reviewer + quality-reviewer（集中在汇总跑一次）      |
| handoff             | 主会话                                                    |

## 进度维护（主 agent 纯编排）

进入可派执行子代理的窗口后（env-preflight 已在主会话通过、无 blocker），主 agent 只做编排，不直接执行探测/脚本/修复：

1. 跑 `kata case-tasks build --feature <featureDir>` 拿用例任务清单 JSON（id/标题/读写分类/串行/排除）。
2. 一次性创建任务列表：`前置条件处理` + 每条用例一项（标题=用例标题）+ `汇总 & 质量闸门`。env-preflight 已完成，创建后即标 `completed`。
3. `前置条件处理` 标 `in_progress`，派 **opus 子代理**（ui-probe 真实证据 + 共享页面对象/helper/fixture + 登录态 storageState + 校正读写分类）；完成标 `completed`。
4. 按并发上限（默认同时 3 条）派 **sonnet 子代理** 跑用例任务（plan-reconcile + generate + self-run）；写数据用例用 run-id/case-id 造唯一 fixture 数据、跑完自清理；`serial=true` 的用例带 `@serial`，由 two-phase runner 串行。
5. 某用例红 → run-triage 判类后**动态新增** `修复: <标题>` 任务（sonnet，≤3 次/用例）；连 2 次红 → 升级为 `升级修复: <标题>`，改派 opus 子代理接管。
6. 全部用例绿 → `汇总 & 质量闸门`：跑全量 case spec、机械 lint（15 项）、语义 quality-reviewer，再 handoff。
7. 执行子代理不读 SKILL.md，也不维护任务列表。

## 执行子代理派发协议

运行时安全：只有 `prompts/agent-worker.md`、`prompts/agent-spec-reviewer.md`、`prompts/agent-quality-reviewer.md` 三个模板都存在时，才允许派发执行子代理并启用二阶段评审；任一模板缺失，就不得派执行子代理，也不得进入模板驱动的评审。

前置条件处理按 `prompts/agent-precondition.md`、用例与修复任务按 `prompts/agent-worker.md` 模板构造 prompt。
执行子代理使用 Agent tool，subagent_type=general-purpose；model 按调度表分层：

- 前置条件处理（ui-probe + 共享层 + 用例清单校正）→ opus
- 用例任务（plan-reconcile + playwright-generate + self-run）→ sonnet
- repair 修复任务 → sonnet；同一用例连 2 次红 → 升级 opus

## 二阶段评审协议

`汇总 & 质量闸门` 任务里（全部用例绿之后）集中跑一次二阶段评审，覆盖全量用例产物：

1. spec-reviewer（主会话执行，按 `prompts/agent-spec-reviewer.md`）
2. spec 通过 → quality-reviewer（Agent，按 `prompts/agent-quality-reviewer.md`）
3. 任一 reviewer 不通过 → 执行子代理修复 → 重新评审

## 评审循环上限

- spec 评审 ≤ 3 次重试；超限进入 handoff，报 `failed_quality_gate`
- quality 评审 ≤ 3 次重试；超限同上
- repair-loop 仍为 ≤ 3 次/用例（与评审循环独立计数）
- locator 内部重试 ≤ 2 次（不变）

## 执行子代理 Status 处置

| Status             | 主 Skill 动作                                           |
| ------------------ | ------------------------------------------------------- |
| DONE               | 标记对应任务 completed，继续编排（评审集中在汇总）      |
| DONE_WITH_CONCERNS | 记录到 manifest.json#stage_history；标记 completed，继续 |
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
