---
name: playwright-automation
description: 生成、修复、验证并真实运行 Playwright UI 自动化——规划→真实页面探测→生成→运行归因→修复闭环，交付前必跑通。
when_to_use: 给出 MD 用例/PRD/Lanhu/脚本/失败结果要推进或修复 UI 自动化时用。只手动操作浏览器、只写非 UI 用例、只做静态扫描的不在此。
argument-hint: "<需求目录路径/目录名 | MD 用例 | 脚本 | 失败结果>"
user-invocable: true
model: sonnet
effort: high
allowed-tools: Bash(kata *)
---

# playwright-automation

统一处理 UI 自动化的规划、真实页面探测、Playwright 生成、运行归因与修复闭环；无真实证据不出最终脚本，无 self-run 不下成功结论。

## 路由边界

- 触发：生成/修复/验证/运行 Playwright UI 自动化；给出 MD 用例、PRD、Lanhu、脚本或失败结果推进或归因。
- 改走：只手动操作浏览器而不生成/修复测试 → 不触发；只写非 UI 用例 → case-draft；只做静态代码扫描 → defect-analyze。

## 环境确认（先于一切探测）

用户无显式 env profile 时进入静默 bootstrap：用 AskUserQuestion 一次性发起环境确认，默认推荐 `ltqc-local.yaml` 置顶并附理由，确认前保持静默。AskUserQuestion 不可用时输出固定 fallback（首行 `请确认执行环境。`）。已显式给 profile 或回复「确认」即直接执行 env-preflight。

## 阶段管线（顺序推进，逐 phase 加载对应文件，前序通过才进下一阶段）

case-normalize → env-preflight → ui-plan → ui-probe → plan-reconcile → playwright-generate → self-run → run-triage → repair-loop → quality-gate → handoff（可选 case-feedback）。

| Phase                  | 文件                             | 简介                                                              |
| ---------------------- | -------------------------------- | ----------------------------------------------------------------- |
| §1 case-normalize      | phases/§1-case-normalize.md      | MD/Archive/PRD/Lanhu/脚本/失败结果 → UiAutomationIntent           |
| §2 env-preflight       | phases/§2-env-preflight.md       | base URL、登录态、项目、数据源、权限、浏览器依赖校验              |
| §3 ui-plan             | phases/§3-ui-plan.md             | 覆盖范围、可见断言、fixture、选择器策略与风险                     |
| §4 ui-probe            | phases/§4-ui-probe.md            | 真实浏览器收集页面/可访问性/截图/网络/locator 证据                |
| §5 plan-reconcile      | phases/§5-plan-reconcile.md      | 书面用例对账真实 UI：继续/调整/提问/阻塞                          |
| §6 playwright-generate | phases/§6-playwright-generate.md | 据对账计划与 UI 证据生成或修复脚本                                |
| §7 self-run            | phases/§7-self-run.md            | 跑目标 spec，记录命令/退出码/输出/报告路径                        |
| §8 run-triage          | phases/§8-run-triage.md          | 失败归类：产品/脚本/数据/权限/环境/未知/需决策                    |
| §9 repair-loop         | phases/§9-repair-loop.md         | 有限修复循环，保留每次修复证据                                    |
| §10 quality-gate       | phases/§10-quality-gate.md       | 脚本结构、断言、session、handoff 等 15 项门禁                     |
| §11 handoff            | phases/§11-handoff.md            | 通过/阻塞/部分/修复耗尽的最终交付报告                             |
| §12 case-feedback      | phases/§12-case-feedback.md      | 生成 case-corrections（8 类 category、3 级 confidence、跨轮去重） |

## 何时加载哪个文件

| 文件                              | 何时读                                         | 作用                                           |
| --------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| references/cli-essentials.md      | ui-probe/generate/repair 阶段需要 API 速查时   | 原生 Playwright API：探测/属性/断言/mock/trace/下载；含 @playwright/cli 可选探索边界 |
| references/execution-protocol.md  | env 确认且无 blocker 后的重阶段                | TodoWrite 可见编排、Worker 派发、二阶段 review |
| prompts/agent-worker.md           | ui-probe/generate/self-run/repair 派 Worker 时 | Worker 模板与 Status/BlockedEnvelope           |
| prompts/agent-spec-reviewer.md    | 重阶段产物落盘后                               | spec 合规机械检查                              |
| prompts/agent-quality-reviewer.md | generate/repair 后                             | 脚本质量（选择器、断言、复用度）               |

## 硬规则（不变量）

- 执行管线 env-preflight → ui-probe → plan-reconcile → playwright-generate → self-run，前序通过才进下一阶段；无 ui-probe 证据不生成最终脚本（静态审查除外），无 self-run 结果不下成功结论。
- 可见编排：env 确认且无 blocker 后，按 `references/execution-protocol.md` 建 TodoWrite 可见进度、派 Worker、二阶段 review；silent-mode、env-preflight 全阶段、所有 BLOCKED 模板路径下禁止该编排（不派 Worker、不建 TodoWrite）。
- env-preflight 的权限拒绝、静默模式、session 探测、登录态补充、no_permission 与 tool_permission_denied 模板严格遵循 `phases/§2-env-preflight.md`（与本节等效，不重复）。
- 名称片段 discovery 先用关键词在 manifest.json/metadata.yaml/archive.md/prd.md 精确定位唯一目标目录，再读其状态文件；不枚举 features/ 候选目录。
- blocked_by_case_draft_required 仅当目标目录同时缺 case-draft 自动化基线（ready AutomationIntent、archive.md、test-point-checklist.md）且缺 prd.md 或 inputs/lanhu-snapshots/ 时触发 → 进 handoff，不再读需求源。
- 失败处理先归类后动作；每个 spec ≤ 3 次修复，locator 内部重试 ≤ 2 次。失败断言反映真实问题，不用弱断言/try-catch/test.skip/宽泛条件掩盖。
- 环境用 `workspace/<project>/_shared/env/*.yaml` profile；新建前先查是否已有匹配 base_url+tenant，不为交付新建 `.env.local`。
- 产出布局：smoke.spec.ts + full.spec.ts 落 tests/runners/，case 落 tests/cases/，共享页面对象/helper 落 `_shared/`；交付以目标 full.spec.ts 全量通过为准，仅 smoke 通过不算完成。
- 覆盖忠实度：把每条在范围用例的步骤实现为真实页面动作、把 expected_visible_result 断言为真实业务结果并真跑通；禁止用「导航+可见性断言」代替业务动作与预期，禁止把业务流程简化为 surface 契约测试。无法忠实实现的用例走诚实阻塞/排除并写 handoff.excluded_cases（含 reason_category），不假通过。
