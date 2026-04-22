# Skill Orchestration with Subagent-Driven Stages Design

> Companion to `2026-05-18-ltqc-md-case-style-design.md`：本设计借用并落地其 MD 格式约束作为 spec reviewer 的检查项。

## 1. Goal & Background

### Goal

把 `superpowers:writing-plans` + `superpowers:subagent-driven-development`（下文简称 SDD）的三件套 —— 任务级可视化跟踪、每任务 fresh subagent context 隔离、spec → quality 二阶段审查 —— 整合进 `case-draft` 与 `playwright-automation` 两个工作流，**同时不放弃**现有「阶段路由 + 厚硬规则」沉淀。

### Background

- 现有 `case-draft` 与 `playwright-automation` 已通过「阶段路由」+ 高密度硬规则解决了多类真实 bug（Lanhu silent-mode、preflight tool_permission_denied、登录态过期模板、Cookie 补充模板等）。这些硬规则是回归护栏，**不可放弃**。
- 但两个工作流缺少：
  - 任务粒度的 TodoWrite 可视化跟踪（长流程用户看不到推进）
  - 每任务 fresh subagent context 隔离（ui-probe / self-run / repair-loop 等阶段会带几千 token 证据进主会话）
  - spec compliance vs code quality 的二阶段 review（现有 case-review / quality-gate 是单次门禁）
- 用例输出格式存在 `SourceRef` 散在 MD 里的问题，已有 `2026-05-18-ltqc-md-case-style-design.md` 约束 MD 格式，但未明确 SourceRef 在 JSON 侧的归属与映射规则。

### Decision

采用「方案 B：阶段编排 + 子任务展开」：
- 保留阶段路由与硬规则作为治理外壳
- 阶段内部展开为 TodoWrite 子任务清单
- 重任务派发 fresh Agent，轻任务在主会话执行
- 每阶段产物落盘后触发 spec → quality 二阶段 review
- 把 MD/JSON SourceRef 分层契约做成 spec reviewer 的可执行检查项

放弃的备选：
- 方案 A（阶段即任务，不拆子任务）：subagent 仍可能乱发挥
- 方案 C（完全照搬 SDD，前置写 plan 文档）：放弃阶段路由治理沉淀，回归风险大

## 2. Architecture

### 三角色

| 角色 | 职责 | 调度 |
|---|---|---|
| 主 Skill | 阶段路由、硬规则把关、TodoWrite 创建/更新、blocker 模板输出、BlockedEnvelope 接收 | 主会话 |
| Worker subagent | 执行单个子任务、写 artifact、汇报 status（DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED） | fresh Agent，cheap/standard 模型按任务复杂度 |
| 二阶段 Reviewer | spec-reviewer：机械结构检查；quality-reviewer：artifact 内容审查 | spec → 主会话，quality → fresh Agent |

### 调度策略（重产物 → Agent；结构清单 → 主会话）

| 任务特征 | 调度 | 例 |
|---|---|---|
| 重 artifact、外部证据多 | Agent | ui-probe、playwright-generate、self-run、repair-loop、historical-context、requirement-atomize、case-draft |
| 纯文本判断、结构 lint | 主会话 + TodoWrite | source-intake、module-identify、env-preflight（含全部 silent-mode 与 blocker 模板）、case-normalize、ui-plan、plan-reconcile、run-triage、coverage-matrix、handoff |

### 边界

| 谁 | 内容 |
|---|---|
| 主 Skill（不变） | 阶段路由 / 硬规则 / silent-mode / Lanhu 阻塞模板 / blocked_by_environment 模板 / 登录态过期模板 / Cookie 补充模板 / no_permission 模板 |
| 主 Skill（新增） | 阶段内 TodoWrite 创建与推进、Worker 派发协议、Reviewer 调度 |
| Worker subagent | 执行子任务、写 artifact、汇报 status；不直接 reply 用户 |
| Spec reviewer | artifact 结构与契约校验：SourceRef 分层、必备字段、blocking pending、caseId 对账、runner 双轨 |
| Quality reviewer | artifact 内容审查：选择器稳定性、断言强度、用例步骤完整、case_title 表意 |

## 3. Three-Layer Artifact Contract

### 分层定义

| 层 | 文件 | SourceRef 归属 |
|---|---|---|
| 人类可读层 | `archive.md`、`archive.draft.md`、`cases.xmind` | 禁止 SourceRef、SR-xxx、`csv::` 前缀、CSV 文件名、CSV 行号 |
| 机器溯源层 | `manifest.json#case_drafting.requirement_atoms[]` | 必须含 SourceRef、evidence_kind、ambiguity_class、confidence |
| 过渡阻塞层 | Lanhu/Axure error-fallback 路径下的 `confirmation-package.md`、`unresolved-summary.md` | 豁免；按现有硬规则保留 URL token 表与 SourceRef ID |

### MD ↔ JSON 双向映射

MD 用例标题保留稳定 ID 供机器解析：

```md
### 14811 【数据资产】数据质量、元数据管理、数据标准适配
##### 【P0】验证「质量报告」中 Doris 3.x 数据源下载功能正常
```

对应 JSON：

```json
{
  "case_drafting": {
    "requirement_atoms": [
      {
        "atom_id": "RA-001",
        "requirement_id": "14811",
        "case_title": "验证「质量报告」中 Doris 3.x 数据源下载功能正常",
        "priority": "P0",
        "evidence_kind": "prd.file",
        "ambiguity_class": "confirmed",
        "confidence": "high",
        "source_refs": ["SR-PRD-001#L42-L58"]
      }
    ]
  }
}
```

Spec reviewer 用 `requirement_id + case_title + priority` 三元组在 MD ↔ JSON 间对账，任一侧缺失即拦下。

### 硬规则更新（case-draft）

```diff
- 证据事实必须引用 SourceRef ID。
+ 证据事实必须在 manifest.json#case_drafting.requirement_atoms 中引用 SourceRef ID。
+ archive.md 中每条 `##### 【P*】<title>` 用例必须对应至少一个 atom，atom 必须含
+ SourceRef、evidence_kind、ambiguity_class、confidence；atom.requirement_id +
+ atom.case_title + atom.priority 三元组必须与 MD 标题双向解析一致。
+ archive.md / archive.draft.md / cases.xmind 正文不得显式包含 SourceRef、SR-xxx、
+ csv:: 前缀、CSV 文件名或 CSV 行号。Lanhu/Axure 阻塞草稿的
+ confirmation-package.md / unresolved-summary.md 在 error-fallback 路径下豁免，
+ 仍按现有硬规则保留 URL token 表与 SourceRef ID。
```

其他硬规则（silent-mode、preflight、Lanhu 阻塞 25 条等）不动。

## 4. Stage-Task Mapping & New/Modified Files

### playwright-automation 阶段调度

| 阶段 | 调度 | 理由 |
|---|---|---|
| case-normalize | 主会话 | 纯文本归一化 |
| env-preflight | 主会话（硬规则全保留） | silent-mode / blocker 模板必须主会话 |
| ui-plan | 主会话 | 计划文档不重 |
| ui-probe | Agent | 真实浏览器、截图、HTML、a11y 树 |
| plan-reconcile | 主会话 | 对账判断 |
| playwright-generate | Agent | 读 probe 证据，context 大 |
| self-run | Agent | Playwright stdout、错误堆栈 |
| run-triage | 主会话 | 仅分类 |
| repair-loop | Agent（每次修复） | 新堆栈进 fresh context |
| quality-gate | 被 reviewer 替代 | 拆入两份 reviewer prompt |
| handoff | 主会话 | 仅汇总 |

### case-draft 阶段调度

| 阶段 | 调度 | 理由 |
|---|---|---|
| source-intake | 主会话（Lanhu 段保留 silent-mode） | 抓取与项目推断混合 |
| module-identify | 主会话 | 项目/模块推断 |
| historical-context | Agent | 读历史用例与源码证据 |
| requirement-atomize | Agent | atom 输出体量大 |
| ambiguity-scan | 主会话 | 决策树 |
| confirmation-package | 主会话 | 模板填充 |
| product-feedback-merge | 主会话 | 合并反馈 |
| coverage-matrix | 主会话 | 矩阵生成 |
| case-draft | Agent | 核心产物 |
| case-review | 被 spec-reviewer 替代 | — |
| output | 被 quality-reviewer 替代 | — |
| automation-handoff | 主会话 | 仅交接 |

### 文件清单

| # | 路径 | 动作 | 内容 | Phase |
|---|---|---|---|---|
| 1 | `.claude/skills/playwright-automation/SKILL.md` | 修改 | 加「执行模式」一节，引用新 reference；现有硬规则不动 | 1 |
| 2 | `.claude/skills/playwright-automation/references/execution-protocol.md` | 新建 | TodoWrite 编排 + 重/轻清单 + Worker 派发 + review loop | 1 |
| 3 | `.claude/skills/playwright-automation/references/worker-prompt.md` | 新建 | Worker subagent 输入/输出契约与 status 编码 | 1 |
| 4 | `.claude/skills/playwright-automation/references/spec-reviewer-prompt.md` | 新建 | 机械检查：UiAutomationIntent 字段齐 / self-run 退出码 / test 结构 / runner 双轨 | 1 |
| 5 | `.claude/skills/playwright-automation/references/quality-reviewer-prompt.md` | 新建 | 内容审查：选择器稳定性、断言强度、修复不掩盖失败 | 1 |
| 6 | `.claude/skills/case-draft/SKILL.md` | 修改 | 加「执行模式」一节；SourceRef 硬规则改为 MD/JSON 分层 | 2 |
| 7 | `.claude/skills/case-draft/references/execution-protocol.md` | 新建 | case-draft 专属阶段子任务清单 + 重/轻分类 | 2 |
| 8 | `.claude/skills/case-draft/references/worker-prompt.md` | 新建 | 与 #3 同结构 | 2 |
| 9 | `.claude/skills/case-draft/references/spec-reviewer-prompt.md` | 新建 | 核心：MD 不含 `SourceRef\|SR-\d\|csv::`、JSON atoms 完整、MD↔JSON caseId 对账、blocking pending=0 | 2 |
| 10 | `.claude/skills/case-draft/references/quality-reviewer-prompt.md` | 新建 | 内容审查：用例步骤完整、case_title 表意、覆盖矩阵 | 2 |
| 11 | `docs/superpowers/specs/2026-05-18-ltqc-md-case-style-design.md` | 修改 | 增补 `requirement_atoms[]` schema + caseId 解析规则 | 2 |
| 12 | `CHANGELOG.md` | 修改 | 记录治理模式升级（Phase 1 / Phase 2 各一条） | 1 & 2 |

`references/quality-gate.md`（playwright-automation 现有文件）保留作为索引，指向 `spec-reviewer-prompt.md` 与 `quality-reviewer-prompt.md`。

### Reference 共享策略

execution-protocol、worker-prompt、reviewer-prompt 在两个 skill 下**各保留一份**，不抽公共。两个工作流阶段词汇与质量检查项差别足够大，公共抽象在 Phase 3 评估后再决定。

## 5. Hard-Rule Coexistence

### 禁止派 Worker 的场景

| 场景 | 触发 | 主 Skill 处置 | 派 Worker？ |
|---|---|---|---|
| silent-mode | `/playwright-automation <title>` 不带环境 | 静默 discovery → env fallback | 否 |
| Lanhu/Axure 阻塞草稿 | URL only 或抓取失败 | 主会话固定路径输出 4 个阻塞产物 | 否（25 条硬规则全主会话） |
| env-preflight 全阶段 | 已确认环境 → 探测 | 主会话执行；登录态过期 / 无权限 / 工具拒绝按模板输出 | 否 |
| 登录态过期 / 工具权限拒绝 | 任一探测命中触发词 | 立即输出固定 blocker | 否 |

Worker 启用条件：
- playwright-automation：用户确认环境且 env-preflight 全部探测完成（无 blocker）
- case-draft：source-intake 与 module-identify 完成且不在 error-fallback 路径

执行模式一节顶部声明：

```
silent-mode / Lanhu 阻塞草稿 / env-preflight 期间禁止 TodoWrite、禁止派 Worker。
仅当进入正常执行路径后才允许进入「任务编排模式」。
```

### BlockedEnvelope 回路

Worker 永远不直接对用户说话。所有阻塞通过 BlockedEnvelope 回传：

```json
{
  "status": "BLOCKED",
  "kind": "session_expired",
  "evidence_paths": ["results/<run-id>/playwright/preflight/probe.json"],
  "context": { "env_profile": "ltqc-local.yaml", "auth.session_path": "..." }
}
```

主 Skill 接收后按 `kind` 查表，1:1 复用现有硬规则模板（`会话已过期。\n\n已确认环境：…\n请提供当前登录态 Cookie 字符串…`）。

### Review Loop 上限

| 阶段类型 | 上限 | 超限处置 |
|---|---|---|
| spec review | ≤3 次重试 | 进入 handoff，报 `failed_quality_gate` |
| quality review | ≤3 次重试 | 同上 |
| repair-loop（playwright 已有） | ≤3 次/spec（不变） | `repair_limit_reached`（不变） |
| locator 内部重试（playwright 已有） | ≤2 次（不变） | 不变 |

repair-loop 与 review loop 独立计数。

### Worker Status 处置

| Status | 主 Skill 动作 |
|---|---|
| DONE | 进入 spec review |
| DONE_WITH_CONCERNS | 记录到 `manifest.json#stage_history`；进入 spec review |
| NEEDS_CONTEXT | 源材料缺 → BlockedEnvelope 主 Skill 问用户；前阶段产物缺 → 补 context 重派 |
| BLOCKED | 查 kind → 找对应硬规则模板输出，不进入 review |

### Reviewer 不得越界硬规则

Reviewer prompt 顶部强制声明：

> 你的检查项不得违反 SKILL.md 中的硬规则。若检查项与硬规则冲突，记为 `out_of_scope` 而非 `issue`。
> 例：建议在 archive.md 增补 SourceRef 与「MD 不得含 SourceRef」硬规则冲突，应记为 `out_of_scope`。

## 6. Validation Plan

### 维度 1：回归不能（Phase 1 上线门禁）

6 条回归用例必须满足契约判定：

| 用例 | 输入 | 契约判定 |
|---|---|---|
| Lanhu URL only | `https://lanhuapp.com/...?pageId=xxx` | (a) 落盘目录名包含 `2026-05-unresolved-lanhu-` + pageId 前 8 字符；(b) `confirmation-package.md` 首行严格等于 `## 原始 URL`；(c) 最终 assistant text 严格为两行模板 |
| silent-mode | `/playwright-automation 合理性` | env fallback 首条 text 第一行严格等于 `请确认执行环境。` |
| preflight tool_permission_denied | 模拟 `mkdir was blocked` | 首条 text 第一行严格等于 `blocked_by_environment: tool_permission_denied` |
| 登录态过期 | session.json mtime > 24h + probe 返回 `/login` | 首条 text 第一行严格等于 `会话已过期。` |
| no_permission | probe 已登录但跳 `/noPermission` | no_permission 直接文本 blocker（首条 text 首字符不得是 `探`/`Probe`/`按规则`/`Wait` 等过渡词） |
| Cookie 补充 | 登录过期模板 | 首行 `会话已过期。`；后续严格包含 `已确认环境：…`、`已检查 auth.session_path：…`、`已检查 repo-root fallback：…` 三行 |

6 条全部通过才可合并；任一条断言失败 → Phase 1 不合并。

### 维度 2：新能力可观察（happy-path）

跑一个已知通的 feature：

```
/playwright-automation 环境:ltqc-local.yaml 内置规则丰富合理性单调
```

通过标准：
- env-preflight 完成后主会话立即创建 11 项 TodoWrite
- 4 个重阶段（ui-probe / playwright-generate / self-run / repair-loop）派发 Agent
- 每个重阶段后 spec-reviewer 与 quality-reviewer 均触发
- TodoWrite 全 ✅ 结束

### 维度 3：Review Loop 真能拦下问题（故意造错）

注入 3 个错误验证 reviewer：

| 注入 | 期望拦截方 |
|---|---|
| Worker 在 playwright spec 用 `page.locator('button').nth(3)` 弱选择器 | quality-reviewer |
| Worker 漏写 `tests/runners/full.spec.ts`（只写 smoke） | spec-reviewer |
| Worker 在 archive.md 写入 `SourceRef: SR-PRD-001`（Phase 2） | spec-reviewer |

通过标准：3 条全部被对应 reviewer 拦下并触发修复闭环。

### 维度 4：Context 节省（Phase 1 不设硬指标，仅观察）

| 链路 | 改造前估算（主 context） | 目标 |
|---|---|---|
| ui-probe | ~8k tokens | ≤2k（仅证据摘要） |
| self-run | ~5k | ≤1k |
| repair-loop 3 次 | ~12k 累积 | ≤3k 累积 |

Phase 1 只观察是否出现「重阶段证据不再进主 context」现象；Phase 2 起设量化目标。

### 不在 Phase 1 验证的内容

- case-draft 的 SourceRef 分层（Phase 2）
- 历史 archive.md 兼容（已天然干净，无需）
- 跨 skill 共享 protocol（方案 B 各一份）
- 性能基准（Phase 3 评估）

## 7. Rollout Sequence

### Phase 1：playwright-automation 全阶段接入

交付物：文件 #1–5、#12（CHANGELOG Phase 1 条目）

步骤：
1. 在 worktree 内新增 4 份 reference（execution-protocol / worker-prompt / spec-reviewer-prompt / quality-reviewer-prompt）
2. 修改 `playwright-automation/SKILL.md` 在「按需加载协议」后插入「执行模式」一节，引用新 4 份 reference；不动现有硬规则
3. 写 6 条回归验证脚本与 3 条故意造错 fixture
4. 跑回归 + happy-path + 故意造错
5. 6 条回归字节级一致 + 3 条故意造错全部被对应 reviewer 拦下 + happy-path 完整跑通 → 合并

### Phase 2：case-draft + SourceRef 三层契约

交付物：文件 #6–11、#12（CHANGELOG Phase 2 条目）

步骤：
1. 新增 case-draft 侧 4 份 reference
2. 修改 `case-draft/SKILL.md`：加执行模式一节；更新 SourceRef 硬规则为 MD/JSON 分层版
3. 修改 `2026-05-18-ltqc-md-case-style-design.md`：增补 `requirement_atoms[]` schema、MD↔JSON caseId 解析规则
4. 写 case-draft 侧回归脚本（含 Lanhu 阻塞、source-intake 多候选、blocking pending 等）+ 故意造错 fixture（含 SourceRef 分层）
5. 跑回归 + happy-path + 故意造错 → 合并

### Phase 3：评估与公共化

不写 spec / plan。Phase 1 + 2 合并后跑约 2 周或 N 个真实任务，评估：
- subagent 调用次数与失败率
- review loop 触发率与拦截分布
- 主 context token 节省曲线
- 真实任务 bug 复现率

评估结论决定：
- 是否抽公共 `_shared/execution-protocol.md`
- 是否推广到 bug-file / conflict-analyze / case-hotfix / diff-scan
- 是否调整 review loop 上限

### Acceptance Criteria

| Phase | 上线门禁 |
|---|---|
| Phase 1 | 6 条回归字节级一致 + 3 条故意造错被 reviewer 拦下 + happy-path 跑通 |
| Phase 2 | Phase 1 基础上：MD 全文 lint 不命中 `/SourceRef\|SR-\d\|csv::/` + manifest.json#requirement_atoms 完整 + caseId 双向对账通过 |
| Phase 3 | 无硬门禁；评估后决定后续动作 |

## 8. Out of Scope

以下内容显式不在本设计范围：

- 修改 engine 端 `engine/src/history-convert.ts`、`xmind-gen.ts`（由 `2026-05-18-ltqc-md-case-style-design.md` 配套实现承担）
- 改造 bug-file / conflict-analyze / case-hotfix / diff-scan 等其它 skill
- 性能基准与 token 节省量化目标
- writing-plans / subagent-driven-development 本身的修改
- TodoWrite 跨 session 持久化

## 9. Related Documents

- `2026-05-18-ltqc-md-case-style-design.md`：MD 格式约束（本 spec 引用其规则作为 Phase 2 spec-reviewer 检查项）
- `superpowers:writing-plans` SKILL.md：本 spec 完成后调用其生成 implementation plan
- `superpowers:subagent-driven-development` SKILL.md：本 spec 借鉴的三件套来源；同时也是 implementation plan 的执行器
