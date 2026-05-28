---
name: playwright-automation
description: 用户要求生成、修复、验证或运行 Playwright UI 自动化。
---

# playwright-automation


证据事实必须引用 SourceRef ID。

## 路由摘要

- 处理 UI 自动化的规划、真实页面探测、Playwright 生成、运行归因与修复闭环。

## 触发条件

- 用户希望生成、修复、验证或运行 Playwright UI 自动化。
- 用户提供 MD 用例、PRD、Lanhu、脚本或失败结果来推进 UI 自动化。
- 用户要求对 UI 自动化失败做归因并继续修复。

## 不触发条件

- 用户只想手动操作浏览器而不生成或修复测试。
- 用户只需要非 UI 的 QA 用例编写。
- 用户只需要静态代码扫描。

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

## 硬规则

- env-preflight 权限拒绝、静默模式、环境确认与 blocker 模板严格遵循 references/env-preflight.md。
- 名称片段 discovery 分两段：先关键词搜索定位唯一目标目录，再读取该目录内容。初始阶段仅搜索定位，不枚举目录。
- 执行管线：env-preflight → ui-probe → 生成脚本 → self-run；前序阶段通过后才进入下一阶段，各阶段证据为下一阶段输入。
- playwright-generate 以本轮 plan-reconcile 结论 status 为 `aligned` 或 `plan_adjusted` 为前提。
- 失败先归类再决定动作；每个 spec 最多 3 次修复，locator 最多 2 次重试。
- 环境通过 `workspace/<project>/_shared/env/*.yaml` profile 表达；不为交付新建 `.env.local`。
- 交付以目标 `full.spec.ts` 全量通过为准；仅 smoke 通过不视为完成。
- 失败断言反映真实问题；AutomationIntent 表示可自动化意图，不替代真实 UI 证据。
- 覆盖忠实度：spec 忠实实现用例步骤与预期并跑通；禁止用可见性断言代替业务动作/预期结果，禁止简化为 surface 契约测试；无法忠实跑通的用例走诚实排除并记入 handoff.excluded_cases，不得 surface 假通过。
