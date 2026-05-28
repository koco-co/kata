# Skill 契约强制化设计（装饰字段清理）

- **日期**：2026-05-27
- **作者**：koco-co
- **状态**：待审
- **类型**：重构 + 引擎契约调整
- **相关**：`docs/superpowers/specs/2026-05-23-cross-model-stable-artifacts-design.md`

## 1. 背景

`.claude/skills/*/SKILL.md` 渲染输出的多个区块（`## 上下文预算` / `## 允许的工具` / `## 输出` / `## 证据策略` / `## 失败策略` / `inputs.*.schema`）读起来像机器约束，实际只是 prompt 文本：

- 引擎仅做 parse + validate（结构性校验）+ render（原样输出），不在运行时强制
- Claude Code 也不读这些区块的 YAML 含义（仅 frontmatter 中的 `name` / `description` 等少数字段有真实运行时行为）
- AI 既无法自数 token（`context_budget` 无法自律），也没有任何外部机制拦截违规

这造成三个问题：

1. **作者错觉**："我们有约束"——实际只是写了一段被原样渲染的 YAML
2. **AI 认知负担**：每次加载 SKILL.md 都吃这些无效 token，且无法区分硬约束与软声明
3. **读者迷雾**：新人不易判断哪些字段真生效、哪些是设计意图占位

## 2. 目标

让每条出现在 SKILL.md 里的"约束"满足下列三者之一：

- **真强制**：引擎或 Claude Code 拦截违规（如 frontmatter `name`、`disable-model-invocation`）
- **真有效**：写成 AI 能读懂并执行的祈使句硬规则
- **删除**：无法满足上述任一条件的字段从契约移除

**装饰性契约从 0 容忍开始**。

## 3. 范围

### IN

- 10 个 product-skill 的源契约：`.ai/core/skills/{bug-file, case-draft, case-edit, case-hotfix, conflict-analyze, diff-scan, infra-diagnose, knowledge-curate, playwright-automation, workspace-manage}/skill.yaml`
- 对应投影 `.claude/skills/*/SKILL.md`（含 codex runtime 投影）
- 引擎模块：`engine/src/ai-core/{product-skill-contract/, skill-renderer.ts, validate.ts, specs.ts}`
- 引擎测试：`engine/tests/ai-core/{product-skill-contract,validate,skill-renderer}.test.ts`
- 试点 skill：**case-hotfix**

### OUT

- `.ai/core/workflows/` / `agents/` / `prompts/` / `plugins/` 的契约（同样可能含装饰字段，列入后续工作）
- **`case-draft`**：跟 `cross-model-stable-artifacts` initiative 强耦合，本 spec 不动，避免双 spec 互撞
- Plugin manifest 与 hooks 系统层
- 新增 runtime 校验框架（沿用已规划的 `kata cases verify` 作为后续 verify gate）

## 4. 字段处理矩阵

### 4.1 删除（4 类字段）

| 字段 | 原位置 | 删除理由 |
|---|---|---|
| `context_budget` 整段（含 `overflow_policy`） | `skill.yaml` 顶层 + SKILL.md `## 上下文预算` | AI 无法自数 token；`overflow_policy` 无监控代码 |
| `allowed_tools` body 渲染段 | SKILL.md `## 允许的工具` | Claude Code 也不拦截；信息以 hard_rule 形式表达更准确。**skill.yaml 字段保留**，为未来同步预批准到 frontmatter 留口 |
| `inputs.*.schema` 字段（如 `PrdSource@1`） | `skill.yaml` + SKILL.md 输入表 | 引擎只把它原样拼到字符串 `schema=<value>`，无任何 schema lookup 或运行时校验；保留 name/required/kind 已足够给 AI 读 |
| `evidence.distinguish_fact_inference_assumption` | `skill.yaml` + SKILL.md `## 证据策略` | 纯 boolean 装饰；语义已包含在 SourceRef hard_rule 中 |

### 4.2 改写为硬规则（3 类字段）

每条按「祈使句 + 主体 + 边界条件」格式重写，追加到 `body.always_load.hard_rules` **且同步追加到 `body.codex_override.hard_rules`**（保持双 runtime 一致）。

| 原字段 | 改写后硬规则模板 |
|---|---|
| `outputs: [<list>]` | `产物必须包含 <outputs 列表>（缺一视为未完成）；其余文件一律落到 <skill 特定临时目录>，不得污染交付目录` |
| `evidence.required_source_refs: [<refs>]` + `stale_ref_policy: block` | `source_refs.json 必须至少包含一条 <ref 类型> 的 SourceRef；命中 stale ref（链接失效/记录被删/id 不匹配）必须阻塞输出，不得用历史值或推断值补齐` |
| `failure_policy.<keys>` | `<key 翻译为祈使句>；不得 <反向行为>` |

改写后 SKILL.md 的 `## 输出` / `## 证据策略` / `## 失败策略` 三节由 renderer 跳过。

### 4.3 Frontmatter 提升（本 spec 不引入）

经 brainstorming 确认，试点期**不引入** `paths` / `disable-model-invocation` / `model` / `effort` 等真强制 frontmatter 字段——避免与"删字段+改硬规则"的 AI 行为变量混杂。这部分留作后续 spec。

### 4.4 保留不动

`name`、`description`、`mustTriggerWhen`、`mustNotTriggerWhen`、`always_load.routing_summary`、`always_load.hard_rules`、`references`（按需加载表）、`commandAliases`、`codexOverrides`、`inputs.{name,required,kind}`。

## 5. 引擎改动（Phase 0 必须先行）

| 文件 | 改动 |
|---|---|
| `engine/src/ai-core/product-skill-contract/scope.ts` | `seenRequired` 集合移除 `context_budget` |
| `engine/src/ai-core/specs.ts` | 同步移除 schema 中 `context_budget` 的必填声明 |
| `engine/src/ai-core/validate.ts` | 同步移除 `context_budget` 必填错误码 |
| `engine/src/ai-core/skill-renderer.ts` | 移除 5 段渲染：`## 上下文预算` / `## 允许的工具` / `## 输出` / `## 证据策略` / `## 失败策略`；`renderInputs` 函数移除 `schema` 段渲染 |
| `engine/src/ai-core/product-skill-contract/projection-fields.ts` | 字段保留 parse（向后兼容，不报"未知字段"） |
| `engine/tests/ai-core/{product-skill-contract,validate,skill-renderer}.test.ts` | 调整断言：renderer 不再产出 5 段；`context_budget` 可选 |

**向后兼容性**：Phase 0 合入后，9 个尚未复刻的 skill 仍保留旧 yaml 字段——parser 仍会读，只是 renderer 不会输出到 SKILL.md。所有 SKILL.md 投影都能正常渲染，不会卡 preflight。

**关键副作用**：Phase 0 一旦合入，**全部 10 个 SKILL.md 投影立刻减负**（5 段自动消失）。后续 Phase 1-3 的工作只是"补齐 hard_rules 把删掉段的语义找回来"。

## 6. 阶段计划（5 phase，单 PR）

```
Phase 0  →  Phase 1  →  Phase 2  →  Phase 3  →  Phase 4
引擎兼容    case-hotfix   真实跑验证    9 skill 复刻   全量回归
```

每 phase 一个或多个 git commit，全部在同一 worktree、同一 PR 内推进。

### Phase 0：引擎兼容改动

按 §5 表执行。验证：

- `bun test engine/tests/ai-core/`（全绿）
- `bun engine/bin/kata ai-core projection render`（10 个 SKILL.md 都正常生成）
- `bun engine/bin/kata ai-core projection lock render`（lock hash 更新）
- 人工 diff：10 个 SKILL.md 投影各自减少了什么、是否还残留旧硬规则可消除

### Phase 1：case-hotfix 试点

**skill.yaml 改动**（`.ai/core/skills/case-hotfix/skill.yaml`）：

```diff
-context_budget:
-  core_tokens: 900
-  reference_tokens: 5000
-  evidence_tokens: 8000
-  overflow_policy: ...

 evidence:
   source_refs_required: true
-  distinguish_fact_inference_assumption: false
   required_source_refs:
     - bug.record@1
   stale_ref_policy: block

 failure_policy:
   missing_bug_context: ask_one_clarifying_question
   ambiguous_fix_scope: produce_pending_items
```

**真删 yaml 字段**：`context_budget` 整段、`evidence.distinguish_fact_inference_assumption`。

**yaml 字段保留、仅渲染跳过**：`outputs`、`allowed_tools`、`evidence.{source_refs_required, required_source_refs, stale_ref_policy}`、`failure_policy` —— 这些保留是为了未来 `kata cases verify` 消费；当前由 renderer 统一跳过（Phase 0 引擎改动已实现）。AI 行为靠下面追加的 hard_rules 强制。

**追加 hard_rules**（同步追加到 `always_load.hard_rules` 与 `codex_override.hard_rules`）：

```yaml
- 产物必须包含 archive.md（可执行 hotfix 用例）；其余文件一律落到 hotfix 目录内的 .temp/，不得污染 hotfix 根目录或仓库 workspace/.temp。
- source_refs.json 必须至少包含一条 bug.record@1 类型的 SourceRef；命中 stale ref（链接 404、记录被删、bug_id 不匹配）必须阻塞输出，不得用历史值或推断值补齐。
- bug 上下文缺失时只允许问一次澄清问题（不得连环追问）；修复范围不明时全部写入 pending_items，不得擅自外延为相邻回归覆盖。
```

**净变化**：删除 5 段标题渲染；追加 3 条 hard_rules；SKILL.md 总字数减少约 35%。

### Phase 2：真实跑验证

- 找一条真实 ZenTao bug，在 worktree 内触发 `/case-hotfix`
- 对照清单核查：
  - 产物结构（archive.md 在 hotfix 根、其它在 `.temp/`）
  - SourceRef 引用（`source_refs.json` 含 `bug.record@1`）
  - 单条用例约束（archive 只 1 条用例）
  - `.temp/` 隔离（无污染）
  - stale ref 阻塞（如可模拟）
  - 澄清节制（≤1 轮）
- 若发现回归 → 在 hard_rule 补强或微调；不通过不进 Phase 3，PR 不开

### Phase 3：9 skill 复刻

按风险升序：

| 顺序 | Skill | 体量/风险 | 验证方式 |
|---|---|---|---|
| 1 | `workspace-manage` | 极小、菜单类 | dry-run |
| 2 | `knowledge-curate` | 小、QA 类 | dry-run + 一次真实查询 |
| 3 | `infra-diagnose` | 中、网络/SSH | dry-run |
| 4 | `conflict-analyze` | 中、纯文本 | 真实跑一次冲突分析 |
| 5 | `diff-scan` | 中、git diff 输入 | 真实跑一次 |
| 6 | `bug-file` | 中高、产物面广 | 真实跑一次 |
| 7 | `case-edit` | 中高 | 真实跑一次 |
| 8 | `playwright-automation` | 高、环境复杂 | dry-run（环境约束） |
| **延后** | `case-draft` | 跟 `cross-model-stable-artifacts` initiative 耦合 | 不在本 spec 范围 |

**per-skill 复刻清单**（机械 + 人工）：

```yaml
# 机械（删）
- context_budget 整段
- evidence.distinguish_fact_inference_assumption（如有）
- inputs.*.schema 字段（如有）

# 人工（3 条 hard_rules，同步到 codex_override）
1. 产物必须包含 <outputs 列表>；<edge condition>
2. source_refs 必须 <required_source_refs 翻译>；stale ref <stale_ref_policy 翻译>
3. <failure_policy 各 key 翻译为祈使句>
```

每个 skill 一个 commit + 一次 dry-run 或真实跑验证。

### Phase 4：全量回归

- `bun test`（所有测试绿）
- `bun run check`（biome 绿）
- `bun engine/bin/kata ai-core projection render` + `lock render`
- preflight gate 通过
- 人工 review 9 个 SKILL.md 的最终投影
- 单 PR 推送

## 7. 风险与回滚

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| 删字段后 AI 行为偏离（如不再要求 SourceRef） | 中 | 高 | Phase 1+2 真实跑验证；hard_rules 三条强制重述；codex_override 同步 |
| renderer 改动遗漏断言导致投影变化未被测试感知 | 中 | 中 | renderer.test.ts 显式断言"不应出现 `## 上下文预算` 等 5 段标题" |
| 真实跑发现 AI 仍依赖被删字段的语义 | 低 | 中 | 立即在 hard_rule 补强；最坏情况 revert 单 skill |
| `codex_override` 与 `always_load` 硬规则不同步 | 中 | 中 | 复刻清单强制每条新 hard_rule 同步到两处；Phase 4 人工 review 核查 |
| case-draft 边界被误踩 | 低 | 高 | 本 spec 明确不动 case-draft；CI/preflight 不触发 case-draft 改动 |

**回滚策略**：

- Phase 0：纯 git revert engine commit；所有 SKILL.md 重新渲染回原样
- Phase 1：单文件 revert（仅 case-hotfix skill.yaml）；其他 9 skill 不受影响
- Phase 3：每个 skill 独立 commit，单文件 revert
- Phase 4：单 PR 整体 revert

**红线**：任何 phase 测试不绿、preflight 不过、真实跑出现产物缺失 → 停止、修复或 revert，不进入下一 phase。

## 8. 成功标准

1. case-hotfix 投影的 SKILL.md 不再包含 `## 上下文预算` / `## 允许的工具` / `## 输出` / `## 证据策略` / `## 失败策略` 段
2. case-hotfix 追加的 3 条 hard_rules 同时存在于 `always_load` 与 `codex_override`
3. 真实跑一次 ZenTao bug → hotfix 流程，AI 行为相比改动前**无回归**（产物结构、SourceRef 引用、单条用例约束、`.temp/` 隔离、澄清节制均一致）
4. 9 个剩余 skill（不含 case-draft）按相同模板复刻，全测试绿，preflight + projection lock render 通过
5. 引擎层 `context_budget` 从必填降为可选；renderer 删 5 段渲染；测试同步更新且全绿
6. 单 PR 合入 main，无 revert

## 9. 未来工作（不在本 spec 范围）

- **frontmatter 增强 spec**：将 `paths` / `disable-model-invocation` / `model` / `effort` / `hooks` 等真强制 frontmatter 字段引入 product-skill；按 skill 价值排优先级
- **case-draft 复刻**：在 `cross-model-stable-artifacts` initiative 完成或单独 spec 时一并处理
- **工作流/Agent/Prompt 契约审计**：对 `.ai/core/workflows/` 等其它契约类目重复本次"装饰字段清理"流程
- **`kata cases verify` 接管**：把 `evidence.required_source_refs` / `evidence.stale_ref_policy` / `outputs` 等仍以 yaml 字段保留的项，纳入 verify gate 真实校验
