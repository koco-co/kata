# playwright-automation Workflow

> 唯一规范源：docs/skills/contracts/workflows/playwright-automation.yaml
>
> 本文档由人工维护以辅助 review；步骤集合必须与 yaml 严格一致，由 `engine/src/skills/workflow-check.ts` 校验。

## 摘要

playwright-automation 处理 UI 自动化规划、真实页面探测、Playwright 生成、运行归因、修复闭环、质量门禁和 handoff。成功结论只能来自真实命令、退出码和报告路径。

## Steps

- case-normalize
- env-preflight
- ui-plan
- ui-probe
- plan-reconcile
- playwright-generate
- self-run
- run-triage
- repair-loop
- quality-gate
- case-feedback
- handoff

## 人工确认节点

- `case-normalize` — `ASK_FOR_AUTOMATION_INTENT`：无法从输入归一化出 UI 自动化意图时要求补充。
- `env-preflight` — `CONFIRM_ENV_PROFILE`：缺少显式环境 profile 时要求确认。
- `ui-plan` — `ASK_FOR_AUTOMATION_SCOPE`：自动化范围不明确时要求确认。
- `plan-reconcile` — `ASK_FOR_UI_PLAN_DECISION`：书面计划与真实 UI 不一致时要求用户决策。
- `run-triage` — `ASK_FOR_FAILURE_DECISION`：失败归因需要产品、环境或数据决策时要求确认。

## 关键失败模式

- `case-normalize` — `AUTOMATION_INTENT_MISSING`：输入无法归一化为 UiAutomationIntent。
- `env-preflight` — `ENV_PROFILE_MISSING`、`TOOL_PERMISSION_DENIED`、`LOGIN_SESSION_MISSING`：环境配置、工具权限或登录态不足。
- `ui-plan` — `AUTOMATION_SCOPE_AMBIGUOUS`：覆盖范围、断言或目标页面不明确。
- `ui-probe` — `UI_PROBE_BLOCKED`、`MISSING_PROBE_EVIDENCE`：真实浏览器探测被阻塞或证据不足。
- `plan-reconcile` — `PLAN_UI_MISMATCH`：书面用例与真实 UI 不一致。
- `playwright-generate` — `SCRIPT_GENERATION_BLOCKED`：缺少生成脚本所需的 probe 或计划证据。
- `self-run` — `SELF_RUN_FAILED`：目标 Playwright 命令未通过。
- `run-triage` — `UNKNOWN_FAILURE`、`PRODUCT_FAILURE`、`ENV_FAILURE`：失败归因为未知、产品、环境或数据问题。
- `repair-loop` — `REPAIR_LIMIT_REACHED`：修复次数耗尽。
- `quality-gate` — `QUALITY_GATE_FAILED`：脚本结构、断言、session、manifest 或 handoff 门禁失败。
- `case-feedback` — `CASE_FEEDBACK_UNWRITABLE`：无法写入 case-corrections 反馈。
- `handoff` — `HANDOFF_INCOMPLETE`：最终交付缺少状态、证据或未验证范围。
