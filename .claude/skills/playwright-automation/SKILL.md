---
name: playwright-automation
description: 用户要求生成、修复、验证或运行 Playwright UI 自动化。
---

# playwright-automation


证据事实必须引用 SourceRef ID。

## 路由摘要

- 统一处理 UI 自动化规划、真实页面探测、Playwright 生成、运行归因和修复闭环。
- 阶段内任务编排：用户确认 env 且 env-preflight 无 blocker 后，按 references/execution-protocol.md 创建 TodoWrite 子任务、按 references/worker-prompt.md 派发 Worker、按 references/spec-reviewer-prompt.md 与 references/quality-reviewer-prompt.md 二阶段审查；silent-mode、env-preflight 全阶段、所有 BLOCKED 模板路径下禁止该协议。

## 输入

- request (required, kind=file_or_text, schema=UiAutomationIntent@1)
- project (optional, kind=workspace_id)
- automation_intent (optional, kind=file, schema=AutomationIntent@1)

## 调用图

- 上游命令: /playwright-automation
- 下游 workflow: playwright-automation@1
- 下游 agents: playwright-automation-worker@1
- 下游 prompts: playwright-automation-prompt@1

## 触发条件

- 用户希望生成、修复、验证或运行 Playwright UI 自动化。
- 用户提供 MD 用例、PRD、Lanhu、脚本或失败结果来推进 UI 自动化。
- 用户要求对 UI 自动化失败做归因并继续修复。

## 不触发条件

- 用户只想手动操作浏览器而不生成或修复测试。
- 用户只需要非 UI 的 QA 用例编写。
- 用户只需要静态代码扫描。

## 输出

- plan
- script
- run
- handoff
- case_corrections

## 允许的工具

- read_file
- write_artifact
- ask_user
- run_command

## 上下文预算

```yaml
core_tokens: 1200
reference_tokens: 8000
evidence_tokens: 12000
overflow_policy:
  order:
    - few_shots
    - informative_references
    - evidence_context
    - normative_references
  preserve:
    - hard_rules
    - failure_policy
    - source_refs
    - self_run_evidence
  on_overflow: summarize_then_drop_lowest_priority
```

## 按需加载协议

- 默认只读取当前 SKILL.md。
- 禁止批量读取 references/**。
- 只有当前阶段命中表格中的阶段与条件时，才读取对应文件。
- 没有命中的 reference 不得读取；few-shot 只可作为格式参考，不得作为领域事实证据。

| 阶段 | 条件 | 文件 | 类型 | 用途 |
| --- | --- | --- | --- | --- |
| case-normalize | `step.id == case-normalize` | references/case-normalize.md | 规范 | 将 MD、Archive、PRD、Lanhu、脚本或失败结果归一化为 UiAutomationIntent。 |
| env-preflight | `step.id == env-preflight` | references/env-preflight.md | 规范 | 校验 base URL、登录态、项目、数据源、权限与浏览器依赖。 |
| ui-plan | `step.id == ui-plan` | references/ui-plan.md | 规范 | 规划覆盖范围、可见断言、fixture、选择器策略和风险。 |
| ui-probe | `step.id == ui-probe` | references/ui-probe.md | 规范 | 通过真实浏览器收集页面、可访问性、截图、网络与 locator 证据。 |
| plan-reconcile | `step.id == plan-reconcile` | references/plan-reconcile.md | 规范 | 对账书面用例与真实 UI，输出继续、调整、提问或阻塞。 |
| playwright-generate | `step.id == playwright-generate` | references/playwright-generate.md | 规范 | 基于对账后的计划和 UI 证据生成或修复 Playwright 脚本。 |
| self-run | `step.id == self-run` | references/self-run.md | 规范 | 运行目标 spec 并记录命令、退出码、输出与报告路径。 |
| run-triage | `step.id == run-triage` | references/run-triage.md | 规范 | 将失败归类为产品、脚本、数据、权限、环境、未知或需用户决策。 |
| repair-loop | `step.id == repair-loop` | references/repair-loop.md | 规范 | 执行有限修复循环并保留每次修复证据。 |
| quality-gate | `step.id == quality-gate` | references/quality-gate.md | 规范 | 检查脚本结构、断言完整性、session 合规、manifest、handoff 双轨等 15 项质量门禁。 |
| handoff | `step.id == handoff` | references/handoff.md | 参考 | 输出通过、阻塞、部分完成或修复耗尽的最终交付报告。 |
| ui-probe, playwright-generate, self-run, repair-loop | `step.id in [ui-probe, playwright-generate, self-run, repair-loop]` | references/execution-protocol.md | 规范 | 阶段内 TodoWrite 编排、Worker 派发、二阶段 Review 协议；只在用户确认 env 且无 blocker 后生效。 |
| ui-probe, playwright-generate, self-run, repair-loop | `step.id in [ui-probe, playwright-generate, self-run, repair-loop]` | references/worker-prompt.md | 规范 | Worker subagent prompt 模板与 status envelope schema。 |
| ui-probe, playwright-generate, self-run, repair-loop | `step.id in [ui-probe, playwright-generate, self-run, repair-loop]` | references/spec-reviewer-prompt.md | 规范 | 阶段产物 spec 合规机械检查清单与输出 schema。 |
| playwright-generate, repair-loop | `step.id in [playwright-generate, repair-loop]` | references/quality-reviewer-prompt.md | 规范 | 脚本内容质量审查（选择器、断言、复用度）。 |
| case-feedback | `step.id == case-feedback` | references/case-feedback.md | 规范 | 生成 case-corrections.md 与 case-corrections-summary.json，覆盖 8 类 category、3 级 confidence、跨轮去重。 |

## 证据策略

- source_refs_required: true
- distinguish_fact_inference_assumption: true
- required_source_refs:
  - ui.automation.intent@1
  - ui.probe.snapshot@1
  - self.run.result@1
- stale_ref_policy: block

## 失败策略

- missing_environment: blocked_by_env
- missing_probe_evidence: return_to_ui_probe
- run_failed: enter_run_triage
- repair_limit_reached: failed
- unknown_failure: failed

## 硬规则

- env-preflight 阶段的权限拒绝（`requires approval`、`was blocked`、`hasn't granted it yet`、`Contains command_substitution`、`Unhandled node type`）、静默模式、环境确认 AskUserQuestion 格式、session mtime 探测、登录态补充模板、no_permission 模板与 tool_permission_denied blocker 严格遵循 references/env-preflight.md；该文件内规则与本节等效，skill.yaml 不逐条重复。
- 名称片段 discovery 分两段执行：先用关键词在 `manifest.json`、`metadata.yaml`、`archive.md`、`prd.md` 中精确搜索定位唯一目标目录；定位后读取该目录的 manifest/metadata 与状态文件。初始 discovery 阶段仅搜索定位，不枚举 `workspace/{project}/features/` 或其他候选目录。
- 用户无显式 env profile 时进入静默 bootstrap：环境确认通过 AskUserQuestion 一次性发起，默认推荐 `ltqc-local.yaml`，确认前保持静默。AskUserQuestion 不可用时输出固定 fallback，第一行为 `请确认执行环境。`。
- 用户已显式提供 env profile 或回复"确认"接受默认时，直接读取对应 profile 执行 env-preflight；从 discovery 到最终 blocker 之前保持静默。
- 环境确认前的 session 状态基于 `auth.session_path` 的 existence check 表述为"文件存在/缺失"；session 有效性的判定在用户确认 profile 后通过真实 Playwright 探测执行。
- blocked_by_case_draft_required 仅当目标目录同时缺少 case-draft 自动化基线（ready AutomationIntent、`archive.md`、`test-point-checklist.md`）且缺少 `prd.md` 或 `inputs/lanhu-snapshots/` 时触发；触发后进入 handoff，不继续读取需求源或后续阶段。
- AutomationIntent 表示可自动化意图，真实 UI 证据来自 env-preflight、ui-probe、plan-reconcile 和 self-run 的实际执行结果。
- 执行管线：env-preflight → ui-probe → plan-reconcile → playwright-generate → self-run；前序阶段通过后才进入下一阶段。无 ui-probe 证据时不生成最终 Playwright 脚本（静态审查除外）；无 self-run 结果时不交付成功结论。
- playwright-generate 以本轮 plan-reconcile 结论 status 为 `aligned` 或 `plan_adjusted` 为前提；status 为 `blocked`/`needs_user_decision`/`blocked_by_ui_probe` 或 ui-probe 预算耗尽时进入 handoff。
- 失败处理：先归类（产品/脚本/数据/权限/环境/未知/耗尽修复），后决定动作；每个 spec 最多 3 次修复，locator 内部重试最多 2 次。失败断言反映真实问题，不用弱断言、try/catch、test.skip 或宽泛条件掩盖。
- 环境通过 `workspace/<project>/_shared/env/*.yaml` profile 表达；新建 profile 前检查现有 profile 是否已匹配 base_url + tenant。不为交付新建 `.env.local`。
- 新生成的 feature 自动化产出：`tests/runners/smoke.spec.ts` + `tests/runners/full.spec.ts`；case 写入 `tests/cases/`；共享页面对象/helper 写入 `_shared/`（非 feature-local）。
- 交付以目标 `full.spec.ts` 全量通过为准；仅 smoke 通过不视为端到端自动化完成。
- Reference 按需加载：仅当 workflow 进入对应 step 时读取对应 reference；scripts/、src/、lib/ 等内部实现文件不在读取范围内。
- 覆盖忠实度：生成的 spec 必须把每条在范围内用例的步骤实现为真实页面动作、把每条 expected_visible_result/assertions 断言为真实业务结果并真跑通；禁止用导航加可见性断言（toBeVisible/toContainText 等）代替用例写明的业务动作与预期结果，禁止把业务流程用例简化为「进入页面验证元素存在」的 surface 契约测试。无法忠实实现并跑通的用例走诚实阻塞/排除并把原因写入 handoff.excluded_cases（含 reason_category），不得用 surface 断言假通过。
