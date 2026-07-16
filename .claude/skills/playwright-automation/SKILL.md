---
name: playwright-automation
description: 把需求用例目录路径/目录名（features/【v...】）、MD 用例、PRD、Lanhu、Playwright 脚本或运行失败结果，转为或修复为可真实跑通的 UI 自动化。仅发送一个需求功能目录路径或目录名即可直接触发（目录→自动化；用例产物文件→case-edit）。仅手动操作浏览器、仅写非 UI 用例请转至 case-draft；仅做静态扫描请转至 defect-analyze。
argument-hint: "<需求目录路径/目录名 | MD 用例 | 脚本 | 失败结果>"
user-invocable: true
model: sonnet
effort: high
allowed-tools: Bash(kata *)
---

# playwright-automation

将用例目录转为可跑通的 Playwright 脚本，覆盖真实页面探测、生成、运行和修复。

## 路由边界

以下场景不属本 skill 范围，请转至对应 skill：

- 仅手动操作浏览器而不生成/修复测试 → 不触发本 skill
- 仅写非 UI 用例 → case-draft
- 仅做静态代码扫描 → defect-analyze

## 环境确认（先于一切探测）

按以下分支处理，确认环境前保持静默：

- **未给出 env profile**：用 AskUserQuestion 一次性问清环境，默认推荐项 `ltqc-local.yaml` 置顶并附理由。
- **AskUserQuestion 不可用**：输出固定兜底文案（首行为 `请确认执行环境。`）。
- **已给出 profile 或回复「确认」**：直接执行 env-preflight。

## 阶段流程（顺序推进，逐 phase 加载对应文件，前序通过才进下一阶段）

```mermaid
flowchart TD
    CN[§1 case-normalize] --> EP[§2 env-preflight]
    EP -->|blocked 或缺基线| HO[§11 handoff]
    EP --> UP[§3 ui-plan]
    UP --> PB[§4 ui-probe]
    PB --> RC[§5 plan-reconcile]
    RC --> GE[§6 playwright-generate]
    GE --> SR[§7 self-run]
    SR --> RT[§8 run-triage]
    RT -->|通过| QG[§10 quality-gate]
    RT -->|失败| RL[§9 repair-loop]
    RL -->|重试，每 spec ≤3 次| SR
    RL -->|修复耗尽| CF[§12 case-feedback]
    QG --> CF
    CF --> HO[§11 handoff]
```

| Phase                  | 文件                             | 简介                                                              |
| ---------------------- | -------------------------------- | ----------------------------------------------------------------- |
| §1 case-normalize      | phases/§1-case-normalize.md      | MD/Archive/PRD/Lanhu/脚本/失败结果 → UiAutomationIntent           |
| §2 env-preflight       | phases/§2-env-preflight.md       | base URL、登录态、项目、数据源、权限、浏览器依赖校验              |
| §3 ui-plan             | phases/§3-ui-plan.md             | 覆盖范围、可见断言、fixture、选择器策略与风险                     |
| §4 ui-probe            | phases/§4-ui-probe.md            | 真实浏览器收集页面/可访问性/截图/网络/locator 证据                |
| §5 plan-reconcile      | phases/§5-plan-reconcile.md      | 书面用例核对真实 UI：继续/调整/提问/阻塞                          |
| §6 playwright-generate | phases/§6-playwright-generate.md | 据核对后的计划与 UI 证据生成或修复脚本                            |
| §7 self-run            | phases/§7-self-run.md            | 跑目标 spec，记录命令/退出码/输出/报告路径                        |
| §8 run-triage          | phases/§8-run-triage.md          | 失败归类：产品/脚本/数据/权限/环境/未知/需决策                    |
| §9 repair-loop         | phases/§9-repair-loop.md         | 有限修复循环，保留每次修复证据                                    |
| §10 quality-gate       | phases/§10-quality-gate.md       | 脚本结构、断言、session、handoff 等检查项，跑 `kata cases lint` 闸门 |
| §12 case-feedback      | phases/§12-case-feedback.md      | 生成 case-corrections（8 类/3 级/跨轮去重）；高置信已核实项经 case-edit 回写源用例 |
| §11 handoff            | phases/§11-handoff.md            | 在 case-feedback 产物完成后渲染通过/阻塞/部分/修复耗尽的最终交付报告 |

## 何时加载哪个文件

| 文件                              | 何时读                                         | 作用                                           |
| --------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| references/cli-essentials.md      | ui-probe/generate/repair 阶段需要 API 速查时   | 原生 Playwright API：探测/属性/断言/mock/trace/下载；含 @playwright/cli 可选探索边界 |
| references/db-runtime-sql.md      | 用例需运行时建表/删表/改数据或核对期望度量时   | `lib/db` 多数据源(starrocks/doris/hive/sparkthrift)运行时 SQL 工具的使用时机与方式 |
| references/execution-protocol.md  | env 确认且无 blocker 后的重阶段                | per-case 任务编排与公开进度、子代理派发、汇总集中评审 |
| prompts/agent-precondition.md     | 前置条件处理阶段（env-preflight 通过后）         | 前置 opus 子代理模板：ui-probe 探测 + 共享层 + 用例清单校正 |
| prompts/agent-worker.md           | 用例 generate/self-run/repair 派子代理时 | 执行子代理模板与 Status/BlockedEnvelope        |
| prompts/agent-spec-reviewer.md    | 汇总 & 质量闸门阶段                            | spec 合规机械检查                              |
| prompts/agent-quality-reviewer.md | 汇总 & 质量闸门阶段（spec 通过后）             | 脚本质量（选择器、断言、复用度）               |
| `workspace/<project>/_shared/knowledge/_index.md` → `modules/<module>.md` + `sites/<host>/dom-*.md` | ui-probe / generate / 用例清单校正前（必读） | 真实菜单·字段·统计函数文案 + 规则语义事实，校正用例与脚本；存疑用 `kata repos show|grep|list` 查外部源码枚举 |

## 执行流程

- 严格按 env-preflight → ui-probe → plan-reconcile → playwright-generate → self-run 的顺序推进，前序阶段通过才进入下一阶段。
- 按名称片段查找目标目录时，先用关键词在 `metadata.yaml` / `cases/archive.md` / `prd.md` 中精确定位唯一目标目录，再读取其状态文件；禁止枚举 `features/` 下的候选目录。
- `blocked_by_case_draft_required` 只在一种情况下触发：目标目录既缺少 case-draft 的自动化基线（`ready` 状态的 `AutomationIntent`、`cases/archive.md`、`cases/test-point-checklist.md`），又缺少 `prd.md` 或 `inputs/lanhu-snapshots/`。触发后直接进入 handoff，不再读取需求源。

## 进度可见性

- **公开模式**：env 确认且无 blocker 后，按 `references/execution-protocol.md` 编排任务列表：
  - `前置条件处理` 分配 opus 子代理；plan-reconcile / generate / self-run / repair 按用例分配 sonnet 子代理（任务标题 = 用例标题）。
  - 主 agent 负责编排及聚合产物：运行 scaffold、维护 smoke/full runner 的 import、执行 full 汇总与 handoff；不实现单条 case。失败时动态新增修复任务、限并发并行，二阶段评审集中在汇总环节。
- **静默模式**：env-preflight 全阶段、所有 BLOCKED 模板路径下，禁止公开进度——不派执行子代理、不建 TodoWrite。
- env-preflight 的权限拒绝、session 探测、登录态补充，以及 `no_permission` / `tool_permission_denied` 模板，严格遵循 `phases/§2-env-preflight.md`。

## 真实性质控

- 全阶段通用：不得把用户文字、需求文档或截图描述当作真实 UI 事实；不得弱化断言来换取通过；源码只能通过 `kata repos show|grep|list` 查询；认证只通过项目 runtime resolver 读取已解析 profile，真实 cookie 仅存忽略的 `_shared/env/.local/<env>.yaml`。
- ui-probe 证据缺失时不生成最终脚本（静态审查除外）；self-run 结果缺失时不下「通过」结论。
- Playwright 自动化完成的硬条件是：目标 `full.spec.ts` 通过、run 目录产出 Allure 结果、平台产生该用例核心业务流程的记录数据。只读合同脚本只有在用户明确要求只读覆盖时才可作为完成范围；否则必须阻塞或排除，不得声称自动化完成。
- 用户要求 UI 自动化时，创建、编辑、保存、引入规则包、立即执行、删除、状态查询等业务动作必须走页面操作；未经用户针对具体动作授权，不得用后端接口替代 UI。
- 每条用例步骤须实现为真实的页面动作，每条 `expected_visible_result` 须断言为真实的业务结果；禁止用「导航 + 可见性断言」代替业务动作。
- 批量用例在运行前必须逐条核对权威用例源和真实 UI 约束，包括字段长度、规则数量、规则拼接包数量、数据源类型、重复规则限制、抽样、分区、过滤条件、强弱规则；发现 archive/脚本与 CSV/规则分析不一致时，先修正规格再生成或执行脚本。
- 对有 UI 长度上限的字段，先生成页面实际提交值再执行脚本。不得使用接口可写但 UI 无法保存的名称；中文书名号、引号等导致超长时，应归一化为 UI 可提交格式，完整标题只保存在证据映射中。
- 批量生成的规则清单不能默认可信。每条用例执行前必须和原用例逐条比对：监控规则数量、字段+校验函数+校验类型组合不得重复、规则拼接包数量、数据源类型、抽样/分区/过滤/强弱规则设置均须一致；比对未通过不得进入 UI 创建。
- 在共享测试环境重建业务记录前，必须先清理或隔离目标项目中的历史自动化数据，并通过产品 UI 证明旧规则集、旧规则任务不会影响本轮运行；用户明确要求复用旧记录时除外。
- 旧 record map / ruleSetId / monitorId 只能作为历史证据。用户指出 UI 编辑保存失败或记录内容错误后，不得继续把接口创建的旧 ID 映射当作完成依据或重跑来源。
- 批量 UI runner 对选中用例必须有显式、逐条源用例审计过的规则规格；缺失规格时直接失败。通用 JS 批量生成不能替代审计，除非审计测试已证明该用例的 UI 提交名称、数据源、监控规则数量、重复规则指纹、规则拼接包数量、抽样、分区、过滤条件、强弱规则均与源用例一致。
- 对创建、导入、运行、发布、映射、检查等会改变平台状态的用例，必须生成唯一测试记录并通过产品 UI 的路由、DOM 文案、截图、Allure 附件或等价 UI 证据断言记录名称、ID、状态或结果；记录证据必须写入 handoff。
- 用户明确要求底层状态链路时（如从建表、元数据同步、创建规则包、引入规则包、创建/执行质量任务、校验 SQL 和任务状态），不得用只读旧 monitor 合同脚本替代；脚本必须实现每个被点名的状态变化步骤，或用命令输出、UI 证据、产物路径把未实现/受阻步骤说清楚。
- 无法真实实现的用例须阻塞或排除，记入 `handoff.excluded_cases`（含 `reason_category`）。

## 失败处理

- 遇到失败，先判断归类（产品 / 脚本 / 数据 / 权限 / 环境），再决定修复策略。
- 每个 spec 最多 3 次修复尝试，locator 内部重试最多 2 次。
- 失败断言必须反映真实问题，严禁用弱断言、`try-catch`、`test.skip` 或宽泛条件来掩盖。

## 环境与产出

- 环境配置用 `kata env resolve --project <project> --env <env>` 查看来源、`kata env doctor --project <project> --env <env>` 校验；基础 profile 保持可提交，真实 cookie 只写忽略的 `_shared/env/.local/<env>.yaml`，不得新建 `.env.local`。
- 产出布局：`smoke.spec.ts` + `full.spec.ts` 存放于 `automation/tests/runners/`，case 存放于 `automation/tests/cases/`，共享页面对象/helper 存放于 `_shared/`。
- 交付以目标 `full.spec.ts` 全量通过为准，仅 smoke 通过不算完成。
