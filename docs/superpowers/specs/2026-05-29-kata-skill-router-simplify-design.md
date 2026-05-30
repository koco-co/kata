# kata 架构精简重构 · Design Spec（Skill + Router + Scripts）

| 项 | 内容 |
|---|---|
| 起草日期 | 2026-05-29 |
| 作者 | koco + Claude（brainstorming） |
| 状态 | **部分实现**——§6 删除 / §6.2 合并 / §7 薄 lint / §13 入口同步已落地；§4 / §8「phases 骨架」结构决策**已被后续 bundle-migration 取代**。详见下方〔实现现状回填〕 |
| 取代 | `docs/superpowers/specs/2026-05-28-kata-arch-overhaul-design.md`（Event-sourced Runtime 版,过度设计,作废） |
| 范围 | Claude Code runtime（Phase 1）；`.agents/` Codex runtime 保持 Phase-2 占位 |

> ## 〔实现现状回填 · 2026-05-30〕
>
> 本 spec **部分实现**。其「负空间」（删除 / 合并 / 薄 lint / 入口同步）已落地并于 2026-05-30 复验通过；但 §4「统一 phases 骨架」与 §8「defect-analyze phases 结构」这一**正向结构处方已被后续 bundle-migration initiative 取代**，不再按本文原样落地。阅读本文请以下表「文档 → 现状」映射为准，勿据 §4 / §8 推断当前 skill 目录结构。
>
> | 本文章节 | 状态 | 现状 |
> |---|---|---|
> | §1–§3 定位与架构原则 | ✅ 采纳 | 「LLM 驱动 engine、engine 不驱动 LLM」「文件系统即状态」等原则保留 |
> | §6.1 删除映射 | ✅ 已实现 | `apps/`（含 mcp/catalog）、`.claude/contracts/`、`skill-manifest.yaml`、manifest-loader / workflow-schema / workflow-check / projection-targets、api.ts 的 `SkillManifest` re-export 均不存在 |
> | §6.2 skill 11→8 合并 | ✅ 已实现 | 8 skill；defect-analyze 三模式（bug/conflict/diff）合并完成 |
> | §7 薄 lint | ✅ 已实现（口径演进） | `kata skills sync-check` 三关（runtime-sync / detach / structure）。**行数上限已演进**：SKILL.md ≤100、phases ≤260、references ≤260、rules ≤120、fewshots ≤200——与本文 §4 / §7 标值（phase ≤150 / reference ≤200 / rule ≤80 / fewshot ≤100）不同，以 lint 实现为准 |
> | §13 入口文档同步 | ✅ 已实现 | `CLAUDE.md` / `AGENTS.md` 命令索引 = 同一组 8 skill |
> | **§4 统一 phases 骨架 · §8 defect-analyze phases** | ⚠️ **已被取代** | bundle-migration 改为「自包含 skill bundle」（`SKILL.md` + `scripts/` + 按需 `references/` `prompts/`）。8 skill 中**仅 playwright-automation 保留 `phases/`**；defect-analyze 为 `SKILL.md` + `scripts/`，无 §8 所绘 §1–§4 phase 文件 |
> | **§4.1 frontmatter `context: fork` + `agent`** | ⚠️ **已背离** | case-draft / playwright-automation 去除整 skill fork，改主上下文可见执行 + TodoWrite 进度（2026-05-30 提示词优化，用户确认） |
> | §5 engine 保留 · §6.3 保留不动 | ✅ 仍有效 | engine/ 与 templates/ **按本文设计保留**；二者的物理消解属**另一独立 bundle-migration initiative**（其最后一步 engine 物理删除尚未执行），不在本 spec 范围——故二者当前仍存在是符合本文设计的 |
>
> **§13 验收复验（2026-05-30，命令均实跑）：**
> - `bun run check:skills` → exit 0（runtime-sync / detach / structure 三关全过）。
> - `bun test` → 1358 pass / 1 skip / 0 fail（1359 tests / 160 files）。
> - defect-analyze **conflict 模式实跑** → 产出 `conflict-resolution-plan.md`，含 `side_a` / `side_b` / `resolution_plan`（满足 §13 conflict 验收行）。
> - case-draft **生成链实跑** → `kata features resolve`（确定性 featureDir）+ `kata xmind-gen`（合法 `cases.xmind`，zip+content.json，用例标题保真）+ `kata archive-gen convert`（`archive.md`，frontmatter/case_count 字段对账一致）+ `kata archive-gen validate`（`issues: []`）。
> - **未做（诚实声明）**：依赖 Lanhu/ZenTao 实时源、需登录态的「真·迁移前后等价对比」未做；defect-analyze 的 bug/diff → `defect-report.md` 分支未单独实跑（其 `scan-report.ts` 由单测覆盖）。

## 1 Executive Summary

把 kata 收敛为它的**天然形态**:一套寄生在 cc / codex / cursor 宿主 agent 上的 **QA Skill 工具集**,由 **Skill + Router** 驱动,确定性脏活交给**提前写好的 engine 脚本**。

- **Router**:`CLAUDE.md` 命令索引 + 各 `SKILL.md` frontmatter（`description` / `when_to_use`）触发与转发。纯 prompt,零运行时。
- **Skill**:`SKILL.md` 作路由入口,`phases/§N-<step>.md` 承载编排步骤、**按需加载**;`rules/` `references/` `fewshots/` 按阶段加载。
- **Script**:engine 现有 `kata <command>` 原样保留,phase md 在对应步骤调用,做版本 resolve、产物生成、校验等确定性工作。

**彻底放弃**前一版 spec 引入的 Event-sourced Runtime / Phase Dispatcher / Blackboard 状态机 / per-phase model enforcement / workflow.yaml 契约层 —— 这些把 kata 误当成"自研 agent runtime"来设计,而 engine 在宿主模型里永远只能是被调用的叶子工具,无法反向驱动宿主 LLM。

简历落点:**a skill-driven, router-dispatched QA workflow toolkit for Claude Code / Codex / Cursor, backed by deterministic CLI scripts** —— 诚实反映寄生宿主、克制不过度工程。

## 2 定位修正（为什么前一版偏移）

| 维度 | 前一版（错） | 本版（对） |
|---|---|---|
| 控制流 | engine Phase Dispatcher 显式 spawn subagent、enforce model | 宿主 LLM 推理驱动,engine 被 Bash 调用 |
| 编排载体 | `workflow.yaml` 契约 + engine 执行器 | `phases/§N-*.md` 给 LLM 读的步骤,按需加载 |
| 状态 | `blackboard.json` + validator 状态机 | workspace 产物文件本身即状态 |
| 审计 | append-only JSONL event journal「脊柱」 | 不引入;需要时用现有 telemetry 记账即可 |
| 路由 | skill-manifest + 多层 lint enforcement | CLAUDE.md 表 + frontmatter + 一层薄 lint |

核心原则:**LLM 驱动 engine,engine 不驱动 LLM。** 唯一能"自动"介入宿主回路的合法点是 hook(cc 原生回调,engine 仅帮写 `settings.json`)。

## 3 目标架构

```
┌─────────────────────────────────────────────────────────┐
│  Router: CLAUDE.md 命令索引 + SKILL.md frontmatter        │  ← 触发/转发,纯 prompt
└───────────────┬─────────────────────────────────────────┘
                │ 命中 skill
                ▼
┌─────────────────────────────────────────────────────────┐
│  Skill (LLM 推理主体)                                     │
│  SKILL.md（入口 / 路由摘要 / 硬规则 / phase 索引 / 加载表）│
│     │ 按需加载                                            │
│     ▼                                                     │
│  phases/§N-<step>.md（编排步骤）                          │
│  rules/ · references/ · fewshots/（按阶段加载）           │
└───────────────┬─────────────────────────────────────────┘
                │ 在对应步骤调用
                ▼
┌─────────────────────────────────────────────────────────┐
│  Script: engine `kata <command>`（确定性脏活,原样保留）  │
│  features resolve / xmind 生成 / cases-validate / ...     │
└───────────────┬─────────────────────────────────────────┘
                │ 读写
                ▼
       workspace/<project>/features/<feature>/（产物 = 状态）
```

| 层 | 载体 | 运行时成本 |
|---|---|---|
| Router | `CLAUDE.md` 命令索引表 + 各 `SKILL.md` frontmatter | 0,纯 prompt |
| Skill | `SKILL.md` + `phases/§N-*.md` + `rules/` `references/` `fewshots/` | 0,纯 prompt |
| Script | engine `kata <command>` + `lib/` `schemas/` `xmind-gen/` `source-ref/` | 被调才跑,叶子进程 |

**状态传递**:phase N 读 phase N-1 写下的 `archive.md` / `metadata.yaml` / `manifest.json`,文件系统即 blackboard,不另造状态文件。

## 4 Skill 结构

每个 skill 一个目录,统一形态:

```
.claude/skills/<skill-id>/
├── SKILL.md                      # 路由入口,≤ 100 行
├── phases/
│   ├── §1-<step>.md              # 编排步骤,按需加载,≤ 150 行/文件
│   └── §N-<step>.md
├── rules/<topic>.md              # 可校验硬规则,≤ 80 行
├── references/<role>.md          # reviewer / worker 协议,≤ 200 行
└── fewshots/<scenario>.md        # 格式样例,≤ 100 行
```

### 4.1 SKILL.md 模板（路由入口）

```markdown
---
name: <skill-id>
description: <主路由文本,Claude 触发用>
when_to_use: <触发提示>
user-invocable: true
model: sonnet
effort: high
context: fork
agent: general-purpose
paths: [...]
---

# <skill-id>

<一行 LLM-facing 简介>

## 触发条件 / 不触发条件
- <bullet>

## 硬规则
- <mechanic 可校验项>

## Phase 索引（按序推进,逐 phase 加载）
| Phase | 文件 | 触发的脚本 | 简介 |
|---|---|---|---|
| §1 <step> | phases/§1-<step>.md | `kata features resolve` | <简介> |

## 按需加载协议
| 阶段 | 条件 | 文件 | 类型 | 用途 |
|---|---|---|---|---|

## 产物
| Kind | Path | 自检 |
|---|---|---|
```

`SKILL.md` 不内嵌步骤细节(在 phase 文件),不再指向任何 `workflow.yaml`。"触发的脚本"列让"脚本由 skill 触发"一眼可读。

### 4.2 phase 文件模板（`phases/§N-<step>.md`）

```markdown
# §N <Phase Name>

## Goal
<本 phase 要达到的状态>

## Inputs（读取的产物 / 上一步输出）
- <file / field>

## Steps
1. <动作 + 调用的 `kata` 脚本 + 依赖 + 验证>
2. <step>

## Outputs（写入的产物）
- <file>（必填 / 可选）

## Hard rules
- <可校验项>

## Failure modes & recovery
- <failure>:<recovery / 阻塞模板>
```

编排逻辑全部是 LLM 读的自然语言步骤;脚本调用以 `kata <command>` 内联在 Steps 中。

### 4.3 命名约定

| 项 | 规则 | 示例 |
|---|---|---|
| skill id | kebab-case;== 目录名 == `SKILL.md` frontmatter `name` == CLAUDE.md 命令索引条目 | case-draft / defect-analyze |
| phase 文件 | `§N-<step>.md`(有序);无序流程用 `<topic>.md` | §1-source-intake.md |
| rule / reference / fewshot | `<topic>.md` / `<role>.md` / `<scenario>.md` | naming-convention.md |

## 5 脚本层（engine,原样保留）

- engine 现有 25 个 `kata <command>` + `lib/` `schemas/` `xmind-gen/` `source-ref/` 等共享模块**不搬、不重组**。它已是 runtime 中立的单一入口,cc / codex / cursor 都只 shell 调它——正是"脚本提前写好、被 skill 触发"想要的形态。
- "skill → 触发哪些脚本"的可读性,由各 `SKILL.md` 的 Phase 索引表"触发的脚本"列 + phase 文件 Steps 内联体现,**不另建映射文件**。
- 脏活归脚本(确定性、可测试),推理归 LLM。脚本失败 → phase 文件 Failure modes 指定阻塞/降级。

## 6 删除与迁移映射

### 6.1 删除（运行时野心 / 已失效消费者）

| 删除项 | 原因 |
|---|---|
| `.claude/contracts/workflows/*.yaml`（8 份,含 P1 新建的 defect-analyze.yaml） | 契约层取消,编排迁入 `phases/§N-*.md` |
| `.claude/contracts/schemas/blackboard-slots.json` | 无 blackboard 状态机 |
| `.claude/contracts/blackboard/state-model.md`（及 `blackboard/` 目录） | 同上 |
| `.claude/contracts/skill-manifest.yaml` | 消费者(MCP catalog、workflow 校验)全部移除后退化为摆设 |
| `apps/mcp/`（server / tools / dispatch + tests） | 删 MCP 只读查询面;`package.json` 的 `"mcp"` 脚本一并删 |
| `apps/core/catalog/`（compat-shim / skills / index） | 唯一消费者是 `apps/mcp/tools.ts`,MCP 删后成孤儿 |
| `engine/src/skills/manifest-loader.ts` + `validateManifestAgainstWorkflows` | manifest 删除 |
| `engine/src/skills/workflow-schema.ts` / `workflow-check.ts` 及关联 workflow 解析校验 | 无 workflow.yaml |
| `engine/src/runtime/projection-targets.ts`（及空 `runtime/` 目录） | 无投影 |
| `engine/src/api.ts` 中 `SkillManifest*` re-export | 类型随 manifest 删除 |

> 注:event-writer / event-validator / phase-dispatcher / blackboard.ts / projector 等前一版 P2 规划**从未实现**,无需删除,只在作废的 spec 里整章移除。

### 6.2 合并:skill 11 → 8

| 操作 | 详情 |
|---|---|
| `bug-file` + `conflict-analyze` + `diff-scan` → `defect-analyze` | 三 skill 目录合并为一,bug / conflict / diff 三 mode;见 §8 |
| `case-qa` 三合一 → `_shared/case-qa.md` | P1 已完成 |
| `playwright-cli` 删除 | P1 已完成 |

最终 8 skill:`case-draft` / `case-edit` / `case-hotfix` / `defect-analyze` / `infra-diagnose` / `knowledge-curate` / `workspace-manage` / `playwright-automation`。

### 6.3 保留不动

P1 全部纯清理;engine 25 个 `kata` 命令;plugin manifest(lanhu / zentao / notify);hook installer;`.agents/` Phase-2 占位;现有 telemetry(不扩张、不删除)。

## 7 薄 Lint（`bun run check:skills`）

`kata skills sync-check` 重写为**直接读文件**的结构校验,不依赖 manifest / workflow:

1. **命名一致**:skill 目录名 == `SKILL.md` frontmatter `name` == CLAUDE.md 命令索引条目(三处对齐)。
2. **Phase 完整**:`SKILL.md` Phase 索引表列出的每个 `phases/§N-*.md` 实际存在。
3. **frontmatter 白名单**:字段 ∈ Claude allowlist(`name` / `description` / `when_to_use` / `user-invocable` / `model` / `effort` / `context` / `agent` / `paths` / `argument-hint` / `allowed-tools` / `disable-model-invocation`)。
4. **长度上限**:SKILL.md ≤ 100、phase ≤ 150、reference ≤ 200、rule ≤ 80、fewshot ≤ 100 行。

保留现有 **runtime sync 检查**(Claude `.claude/` ↔ Codex `.agents/` 一致性)与 **runtime detach 检查**;删除 **skill manifest check** / **manifest ↔ workflow consistency** / **workflow check**。

> 备选(若用户要"清零"):删除全部 skill lint,路由只靠 CLAUDE.md + frontmatter。本 spec 默认采用上述薄 lint。

## 8 defect-analyze 合并设计

三输入 mode 分诊到一个 skill:

```
.claude/skills/defect-analyze/
├── SKILL.md
├── phases/
│   ├── §1-intake.md     # mode 分诊:bug / conflict / diff
│   ├── §2-classify.md   # 严重度 / 分类 / 影响范围
│   ├── §3-analyze.md    # 根因 + SourceRef;mode 分支
│   └── §4-emit.md       # 报告输出
├── references/{spec-reviewer,quality-reviewer,analyzer}.md
├── rules/{mode-dispatch,defect-classify,defect-format}.md
└── fewshots/{bug-mode,conflict-mode,diff-mode}.md
```

mode 分支(写在 `§3-analyze.md` / `§4-emit.md`,不引入 by-mode schema 机制):

- `bug` / `diff`:根因 + evidence_refs + impacted_areas → 产物 `defect-report.md`
- `conflict`:**先陈述双方意图**(side_a / side_b)再给 resolution_plan,沿用原 conflict-analyze 硬规则 → 产物 `conflict-resolution-plan.md`

路由:bug 现象 / diff / 失败证据 → defect-analyze;ZenTao bug URL/ID → 仍走 case-hotfix(保持现有 routing-guard)。

## 9 双 Runtime 策略

不变:`.agents/` 保持 Phase-2 占位(`.agents/README.md` 描述占位状态)。本版让双 runtime 复用更简单:

- **runtime 中立**:engine `kata` 脚本(两 runtime 都 shell 调,无需镜像)。
- **runtime-specific**:`SKILL.md` 入口。
- **可 symlink 共享**:`phases/` `rules/` `references/` `fewshots/`(纯 md,Codex 侧 `.agents/skills/<id>/` symlink 复用 `.claude/skills/<id>/` 对应子目录)。

取消了前一版的 runtime-neutral 契约层(event/blackboard/workflow schema),双 runtime 同步面更小:只剩 `SKILL.md` 一份 runtime-specific 入口 + 共享 md 子目录。

## 10 迁移 Commit 序列(草案,细节由 plan 阶段确认)

| # | Commit | 内容 |
|---|---|---|
| 1 | `refactor: ✨ drop mcp + catalog + manifest` | 删 `apps/mcp/`、`apps/core/catalog/`、`skill-manifest.yaml`、manifest-loader 及 api re-export、`package.json` mcp 脚本 |
| 2 | `refactor: ✨ retire workflow.yaml contract layer` | 删 8 个 workflow.yaml + blackboard-slots.json + state-model.md + workflow-schema/check + runtime/projection-targets |
| 3 | `feat: 🧩 thin skill structure lint` | 重写 `kata skills sync-check` 为文件级薄 lint(§7);更新相关测试 |
| 4 | `refactor: ✨ migrate case-draft to phases md` | case-draft 编排从 workflow.yaml 迁入 `phases/§N-*.md`;SKILL.md 改 Phase 索引;实跑验证 |
| 5 | `refactor: ✨ migrate remaining skills to phases md` | 其余 skill 逐个迁移(每 skill 一 sub-commit) |
| 6 | `refactor: ✨ merge defect-analyze` | 合并 bug-file + conflict-analyze + diff-scan(§8) |
| 7 | `docs: 📝 update entry docs` | CLAUDE.md / AGENTS.md / routing-guard 命令索引同步到 8 skill + 新结构 |

每步遵循项目 worktree-first 流程,改后即跑相关测试,merge 前 `bun test` 最终确认。

## 11 测试

- **薄 lint**:为 §7 四项校验写单测(命名漂移、缺 phase 文件、非法 frontmatter 字段、超长 → 各一个失败用例 + 通过用例)。
- **回归**:删除 workflow/manifest/MCP 后,`bun test` 全绿;移除或改写依赖这些模块的旧测试(`apps/mcp/*.test.ts`、manifest/workflow check 测试)。
- **skill 行为等价**:case-draft / defect-analyze 迁移后实跑一次,人工核对产物(archive / xmind / report)与迁移前一致。
- **case-draft hard_rules 基线**:若改动 hard rules,同步更新现有 hardrules-regression 基线(COUNT + SHA)。

## 12 风险

1. **phase 文件迁移漏步**:workflow.yaml 里的 failure_modes / 人工确认节点必须完整搬进 phase md,否则丢行为。迁移时逐 step 对照,case-draft 先行验证。
2. **薄 lint 覆盖不足**:文件级校验比 schema 弱;可能漏掉语义错误。接受——换取大幅简化,语义正确性靠实跑验证。
3. **删 manifest 影响外部**:确认无外部 MCP client 依赖 `kata_list_skills`(删 MCP 即默认放弃该接口)。
4. **defect-analyze 合并行为等价**:三 skill 原硬规则(尤其 conflict 的 dual-intent)必须在合并后保留;先 1:1 迁规则再调 phase。
5. **未提交的工作树删除**:本次发现主工作树有未提交的 P2/P3 plans、reviews 及 lt-dq specs 删除;与本 spec 无关,需用户单独决定提交或还原。

## 13 验收标准

| 标准 | 测量 |
|---|---|
| skill 数 8 | `ls .claude/skills/` |
| 无 workflow.yaml / manifest / blackboard | 对应文件不存在;`grep -r workflow.yaml .claude/skills` 空 |
| MCP / catalog 删净 | `apps/mcp/` `apps/core/catalog/` 不存在;`bun run` 无 mcp 脚本 |
| phase md 编排可用 | case-draft 实跑产出 archive/xmind/metadata,与迁移前等价 |
| 薄 lint 工作 | `bun run check:skills` exit 0;故意制造命名漂移 / 缺 phase 文件 → 报错 |
| defect-analyze | bug/diff 产 `defect-report.md`;conflict 产 `conflict-resolution-plan.md` 且含 side_a/side_b |
| 全量测试 | `bun test` 全绿 |
| 入口文档同步 | CLAUDE.md / AGENTS.md / routing-guard 命令索引 = 8 skill |

## 14 Out of Scope

- event journal / 审计可回放系统(明确不做;需要时单独立项)
- per-phase model 自动切换(若将来要,仅作 phase md 内"建议 LLM spawn subagent"的 prompt 指引,无 enforcement)
- plugin SDK v2 / capability 强制(保持现状)
- Codex runtime 实际适配(保持 Phase-2 占位)
- engine 命令重组 / 重命名(本次只删不重组)
- lt-dq 岚图整改、其它独立 initiative
