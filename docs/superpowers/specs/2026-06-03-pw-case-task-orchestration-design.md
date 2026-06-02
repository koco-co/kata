# playwright-automation 用例任务编排优化 — 设计文档

- 日期：2026-06-03
- 状态：设计已确认，待写实现计划
- 涉及 skill：`.claude/skills/playwright-automation/`

## 背景

`playwright-automation` 当前的进度可视化是一份**按 phase 组织的 11 项 TodoWrite**：

```
case-normalize → env-preflight → ui-plan → ui-probe → plan-reconcile →
playwright-generate → self-run → run-triage → repair-loop → quality-gate → handoff
```

用户看到的是「流水线阶段」，看不到「哪条用例做到哪了」。生成阶段把多条用例打包进单个 `full.spec.ts` 一起跑，交付口径是「full.spec.ts 全量通过」。这与用户记下的调试纪律（逐条调试、可见进度、避免黑盒 subagent）有落差。

## 目标

把固定的阶段进度，换成一份**动态、按用例、可并行、分模型**的任务清单：

- 第 1 个 task 是「前置条件处理」；
- 之后每条用例一个 task，**task 标题 = 用例标题**；
- 列表不固定：用例跑挂可**动态新增修复 task**；
- 这些 task **支持限并发并行派发**；
- 前置复杂 → 主 agent/opus 亲自做；用例简单 → 派 sonnet 子代理。

## 范围

**只改编排与可视化层，不改 phase 内容。**

- 不动：各 phase「做什么」——env-preflight 探测项、ui-probe 证据规则、generate 真实性红线（禁弱断言/禁 try-catch/禁 test.skip）、triage 分类、修复预算、quality-gate 的 15 项 lint。
- 不动：硬闸门——静默模式 / env-preflight 全程 / 任何 BLOCKED 模板之前，禁止派子代理、禁止建任务列表。
- 改：把「11 phase TodoWrite」重绑成「前置 + N 用例 + 汇总」的动态任务清单，并据此做模型分层、限并发、动态修复派发。

## 现状盘点（实现锚点）

- 进度协议：`references/execution-protocol.md`（91 行）「TodoWrite 进度维护」「阶段调度表」段。
- 生成布局：`smoke.spec.ts` + `full.spec.ts` 落 `tests/runners/`，case 落 `tests/cases/`，共享对象落 `_shared/`。
- 子代理模板：`prompts/agent-worker.md`、`agent-spec-reviewer.md`、`agent-quality-reviewer.md`。
- 脚本注册：skill 脚本以 `import { program as ... }` 注册进 `.claude/scripts/_shared/cli/index.ts`，对外即 `kata <subcommand>`（如 `kata handoff render`）。skill `allowed-tools` 仅 `Bash(kata *)`，故新脚本必须挂成 `kata` 子命令。
- 本 skill **没有** `parse-cases.ts`；用户记忆里那个属更早/别处流程。

## 目标架构

```
env 确认 + env-preflight（无 blocker）
        │
   ┌────▼─────────────────────────────────────┐
   │ Task 0「前置条件处理」 ← opus / 主 agent  │  · 真实页面探测 ui-probe
   │   · 登录态 storageState                   │  · 共享页面对象 / helper / fixture
   │   · 用例任务清单（含读/写分类校正）       │  · 复杂，主 agent 亲自做
   └────┬─────────────────────────────────────┘
        │  限并发派发（默认同时 3 条）
   ┌────▼────┐ ┌─────────┐ ┌─────────┐
   │用例1 task│ │用例2 task│ │用例N task│ ← sonnet 子代理，标题=用例标题
   │生成+自跑 │ │生成+自跑 │ │生成+自跑 │   写数据用例用 run-id 造唯一 fixture
   └────┬────┘ └────┬────┘ └────┬────┘
        │红          │绿          │红
   ┌────▼─────┐                ┌─▼────────┐
   │修复 task │ ← sonnet,      │修复 task │  连 2 次红 → 升级 opus/主 agent
   │(动态新增)│   ≤3 次预算    │(动态新增)│
   └──────────┘                └──────────┘
        │
   ┌────▼──────────────────────────────────┐
   │ 汇总 task：全部 case spec 跑全量绿     │  full.spec.ts 维护成引入清单(barrel)
   │ + 机械 lint + 语义 quality 评审        │  仅 smoke 绿不算完成
   │ + handoff                             │
   └───────────────────────────────────────┘
```

### 任务清单生命周期

env 确认且 env-preflight 无 blocker 后，主 agent：

1. 跑 `kata` 子命令生成用例任务清单（见「脚本契约」），据此一次性建任务列表：`前置条件处理` + `N 条用例` + `汇总 & 质量闸门`。窗口开启前已完成的阶段（env-preflight）按现有约定建后立即标 completed。
2. **前置 task** 标 in_progress，由主 agent / opus 亲自做完。
3. 前置完成 → 按并发上限派发用例 task。
4. 用例 task 红 → 主 agent triage 后**动态 append** 一个 `修复: <标题>` task。
5. 全部用例绿 → `汇总 & 质量闸门` task。

> 任务列表机制：Claude Code 用 TaskCreate/TaskUpdate，客户端只暴露 TodoWrite 时按 TodoWrite 等同语义执行；并行派发用同一条消息里多次 Agent 调用，每个 Agent 用 `model` 指定 sonnet/opus；动态新增即 append 一项。

## 脚本契约：`scripts/build-case-tasks.ts`（新增）

挂成 `kata` 子命令（命名待定，如 `kata pw case-tasks <featureId>`）。读目标 feature 的 `manifest.json#automation.intents[]` 或 `archive.md`，**确定性**输出 JSON：

```jsonc
{
  "feature_id": "...",
  "run_id": "run-N",
  "precondition": { "shared_fixtures": ["..."], "needs_login": true },
  "cases": [
    {
      "id": "P0-1",
      "title": "<用例标题 = task 标题>",
      "source_ref": "SR-...",
      "mutates_data": true,        // 启发式：含 新增/创建/删除/编辑/导入/同步 → 写；查询/查看/校验/对比/展示 → 读
      "serial": false,             // 创建-校验-删除链路 → true（沿用 @serial）
      "fixture_needs": ["..."],
      "excluded": null             // 环境/租户不符·需手工·外部系统 → { reason_category, reason }
    }
  ]
}
```

约束：

- `mutates_data` 与 `serial` 由 archive 步骤关键词启发式判定；**前置 task（opus）真实探测后可覆盖**脚本分类（脚本播种、opus 校正）。
- `excluded` 的用例不进任务清单，照旧记 `handoff.excluded_cases`。
- 纯确定性、无副作用、可单测（固定 manifest/archive → 固定 JSON），满足「改后即测」。

## 模型分层与派发

| 任务 | 执行者 | 模型 | 内容 |
|---|---|---|---|
| 前置条件处理 | 主 agent 亲自 | opus | ui-probe 真实证据 + 共享页面对象/helper/fixture + 登录态 storageState + 读写分类校正 |
| 每条用例 | 子代理 | sonnet | plan-reconcile(该用例) → 生成 `tests/cases/<id>.spec.ts` → self-run → 回报 Status 信封 |
| 修复 | 子代理 → 升级主 agent | sonnet → opus | 见「动态修复与升级」 |

## 并发安全

并行跑同一个活环境，写数据用例必须防撞车：

- **并发上限**：默认同时 **3** 条（可调）。
- **数据隔离**：`mutates_data` 用例用 `run_id`/`case_id` 拼**唯一 fixture 数据**（唯一规则名/资源名），并发不撞名；默认 `afterEach`/`afterAll` **自清理**唯一数据。
- **串行链路**：`serial=true` 的创建-校验-删除用例沿用 `@serial` 标签，`run-tests-notify.ts` two-phase runner 强制 `workers=1` 串行——与限并发互补。

## 动态修复与升级

- 用例 self-run 红 → 主 agent triage（产品/脚本/数据/权限/环境/未知/需决策）→ append `修复: <标题>` task。失败与修复在列表里都可见，不闷在子代理里偷偷重试。
- 修复 task：**sonnet** 子代理，带失败证据 + triage 分类，沿用 **≤3 次/用例** 修复预算（与现有规则一致）。
- **连 2 次仍红 → 自动升级**成 `升级修复: <标题>`，交 **opus / 主 agent** 接管该用例（贴合「复杂才上 opus」）。
- 超预算仍红 → 诚实阻塞/排除，记 `handoff.excluded_cases`（含 `reason_category`），不弱断言凑绿。

## 汇总、评审与交付

- `汇总` task：跑**全部 case spec 全量**确认绿；`full.spec.ts` 维护成**引入清单（barrel）**；仅 smoke 绿不算完成（沿用）。
- **二阶段评审归置**：用例 task 内**不**做完整二阶段评审——每条用例的硬闸门是**诚实 self-run 红/绿**；机械 lint（quality-gate 15 项）+ 语义 quality-reviewer **集中在汇总 task** 对整套跑一次。并行多、成本省，质量门不丢。
- handoff 照旧 `kata handoff render`，`excluded_cases` 与 case-feedback 不变。

## 改动文件清单

- 新增 `.claude/skills/playwright-automation/scripts/build-case-tasks.ts` + 注册进 `.claude/scripts/_shared/cli/index.ts` + 单测（`.claude/scripts/_shared/tests/` 下）。
- 重写 `references/execution-protocol.md` 的「TodoWrite 进度维护」「阶段调度表」段：11 phase todo → 用例任务清单 + 模型分层 + 限并发 + 动态修复。保持 ≤260 行。
- 微调 `SKILL.md`「公开进度」规则两行 + phase 表注解（说明可视化已按用例组织）。保持 ≤300 行。
- `prompts/agent-worker.md` 增加「按用例 scope 工作 + 唯一 fixture 数据 + 自清理」约束；新增 `prompts/agent-precondition.md`（前置 task 模板，opus）。

## 约束与验证

- **lint 红线**：`SKILL.md ≤300 行`（现 74）、`references/*.md ≤260 行`（execution-protocol 现 91）、11 字段 frontmatter 白名单、禁装饰契约标记。
- **运行时子串契约**：改 `execution-protocol.md` 的进度/派发文案可能触及 `check:skills` 的子串校验，改前先抽子串清单当不变量。
- **改后即测**：跑 `bun run check`、`bun run check:skills`、`bun test`（含新脚本单测）；`strategy-templates.test.ts` 等契约测试不得回归。type-check 以「无新增错误」为准（main 本就约 202 预存错误）。
- **工作流**：全程走 detached worktree，验证通过再 `git merge --no-ff <sha>` 回 main。

## 决策记录（本次已确认）

1. 改造深度：编排层重做，phase 内容不动。
2. 隔离/汇总：每用例独立 `tests/cases/<id>.spec.ts`，汇总跑全量绿，`full.spec.ts` = barrel。
3. 并发安全：限并发（默认 3）+ 写数据用例唯一 fixture 数据 + 自清理。
4. 修复策略：sonnet 修，连 2 次红升级 opus，≤3 次预算超限诚实排除。
5. 落地方式：脚本生成确定性任务清单 + 提示词编排（方案 B）。
6. 评审归置：用例只靠 self-run，机械 lint + 语义评审集中在汇总。

## 未决 / 实现期再定

- `kata` 子命令具体命名（`kata pw case-tasks` vs 其他）。
- 并发上限默认值（3）与是否暴露成参数。
- `mutates_data`/`serial` 启发式关键词表的完整枚举。
- 前置 task 与用例子代理之间共享层（页面对象/storageState 路径）的交接契约。
