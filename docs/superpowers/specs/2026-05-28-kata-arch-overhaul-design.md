# kata 架构大重构 · Design Spec

| 项 | 内容 |
|---|---|
| 起草日期 | 2026-05-28 |
| 作者 | koco + Claude Opus 4.7 + Codex（gpt-5.x@xhigh）二审 |
| 状态 | Design 已通过 brainstorming，待 codex 总审 + 用户复核 |
| 范围 | Claude Code runtime（Phase 1）；Codex runtime 适配（Phase 5） |
| 后续 | spec 通过后转 `superpowers:writing-plans` |

## 1 Executive Summary

把 kata 从「11 个独立 Claude skill + CLI helper engine」升级为 **Event-sourced QA Agent Runtime**：

- skill 仍是 LLM 推理主体（保 Claude-native 触发机制）
- workflow YAML 升级为 **phase contract**（不是执行器，不接管 LLM dispatch）
- **append-only JSONL event journal** 是 backbone 脊柱
- **blackboard 升级为 validator-enforced 状态**（每个 phase 只能写 contract 声明的 output slot）
- plugin / MCP / notify / audit 全部从 events 投影
- 双 runtime 通过同一份 runtime-neutral 契约（event schema / blackboard schema / phase contract / plugin manifest / validator schema）

简历落点：**runtime-portable event-sourced QA agent system with contract-gated skill workflows and auditable test artifact generation**。

## 2 现状盘点（重构起点）

| 维度 | 现状 | 痛点 |
|---|---|---|
| Skill 体量 | 11 个，SKILL.md 948 行 + references 41 文件 ~4504 行 | playwright-cli/playwright-automation 重叠 ~2700 行；case-qa 在 3 skill 各持一份 |
| Contracts | `.claude/contracts/` 27 份 yaml/json（skill-graph、4 workflows、11 routes、9 schemas、1 空 sync-exceptions、blackboard state-model） | engine 几乎不读，是设计期文档化石；自身声明「不强制校验」 |
| Engine | `engine/src` 54 文件 + `engine/lib` 42 文件 ≈ 14K 行 TS | 只做 CLI dispatch + 进度记账 + plugin loader，**无 workflow 执行器** |
| Apps | console（死代码）、core（在用 catalog）、mcp（read-only 雏形） | console 可删；mcp 是 future MCP server 起点 |
| Plugins | lanhu / zentao / notify 各有 plugin.json command manifest | 无完整 SDK，capability 声明粗 |
| Hooks | 5 个 hardcoded TS | `.claude/settings.local.json` 未注册，是死代码 |
| Frontmatter | 11 字段 allowlist 实际只用 8 | argument-hint / phase 索引 / event 声明等扩展字段缺失 |
| Telemetry | `engine/src/telemetry/runtime-telemetry.ts` 已有 `validateTelemetryEvent` + 字段白名单 + event_kind 枚举 | 只 6 个粗粒度 event_kind，无 JSONL append / 单调 seq / atomic write / fail-closed |
| 临时通知 | 固定 markdown 模板 | 无事件流，不可回放/订阅/审计 |
| 路由 | 全靠 SKILL.md description | 无统一拦截/审计/转发 |
| 双 runtime | `.claude/` 与 `.agents/` 平行树，contracts/skills 镜像 | 维护成本翻倍 |
| Workspace 命名 | dataAssets 用 `【v647】…`，xyzh 用 `2026-04-…` | 两套并行 |
| 测试组织 | `engine/tests/` 按 concern | 难定位 skill 行为回归 |

## 3 架构：E = Event-sourced Blackboard Skill Backbone

```
┌────────────────────────────────────────────────────────────────────┐
│                       Claude / Codex skill                         │ ← LLM 推理主体
│  (.claude/skills/<id>/ or .agents/skills/<id>/, symlink-shared)    │
└──────────┬─────────────────────────────────────────┬───────────────┘
           │ emit events                              │ read contracts
           ▼                                          ▼
┌──────────────────────┐                ┌────────────────────────────┐
│   Event Writer       │ ─── append ──▶ │  Event Journal (JSONL)     │
│   (atomic / seq /    │                │  per-feature/per-session   │
│    staged tx)        │                │  + events.index.jsonl      │
└──────────┬───────────┘                └────────────┬───────────────┘
           │                                          │
           ▼                                          ▼
┌──────────────────────┐  validates  ┌─────────────────────────────────┐
│  Blackboard          │ ◀──────────  │  Phase Contract & Schemas      │
│  Validator           │              │  .claude/contracts/workflows/  │
│  + Snapshot          │              │  .claude/contracts/schemas/    │
└──────────┬───────────┘              └─────────────────────────────────┘
           │
           ▼
┌──────────────────────┐  spawn  ┌──────────────────────────┐
│  Phase Dispatcher    │ ──────▶ │  Claude Agent /          │
│  (reads workflow,    │         │  Codex subagent          │
│   spawns subagent    │  ◀───── │  with per-phase          │
│   per dispatch)      │  events │  model & effort          │
└──────────────────────┘         └──────────────────────────┘
           │ project
           ▼
┌──────────────────────┐  ┌──────────────┐  ┌──────────────────┐
│  Notify markdown     │  │  CLI: events │  │  MCP: read-only  │
│  (.kata/notify/      │  │  tail/replay │  │  catalog +       │
│   <run_id>.md)       │  │  /stats      │  │  query_events    │
└──────────────────────┘  └──────────────┘  └──────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│           Plugins (input adapter / event subscriber / MCP)          │
│  capability_required + manifest, sandbox-enforced                  │
└────────────────────────────────────────────────────────────────────┘
```

### 3.1 核心组件

| 组件 | 角色 | 物理位置 |
|---|---|---|
| Claude Skill | 用户语义入口，LLM 推理主体 | `.claude/skills/<id>/` |
| Skill Manifest | skill 元信息 + 数据流声明 + facet 索引 | `.claude/contracts/skill-manifest.yaml` |
| Phase Contract | 每 skill 的 phase 列表 + I/O contract + validator schema 引用 + dispatch/model/effort | `.claude/contracts/workflows/<skill>.yaml` |
| Validator Schema | event / blackboard / artifact 的 JSON schema | `.claude/contracts/schemas/*.json` |
| Plugin Manifest | plugin 能力 + facets | `plugins/<id>/plugin.json` |
| Hook 内置 | engine lifecycle 守卫 | `engine/src/hooks/*.ts` + `engine/src/hooks/installer.ts` 写 settings.json |
| Event Journal | append-only JSONL，runtime 真理之源 | `workspace/<project>/features/<feature>/events/<run_id>.jsonl` |
| Feature Event Index | 跨 session 的 feature 级摘要 | `workspace/<project>/features/<feature>/events.index.jsonl` |
| Blackboard Snapshot | 最新 blackboard 状态 | `workspace/<project>/features/<feature>/blackboard.json` |
| Notify Projection | last-event projection → 临时通知 | `workspace/<project>/.kata/notify/<run_id>.md` |
| **Phase Dispatcher** | 读 workflow.yaml 当前 step；若 `dispatch: subagent` 则 spawn Claude Agent / Codex subagent 并传 model/effort/subagent_type；若 `dispatch: inline` 则不做事，让 orchestrator 跑（解决 F3：per-phase model 的执行主体） | `engine/src/runtime/phase-dispatcher.ts` |
| MCP Catalog Server | read-only 外部入口 | `apps/mcp/` |
| CLI | engine 命令 + 新 `kata events` | `engine/bin/kata` + `engine/src/cli/` |
| Engine | CLI dispatcher + plugin runner + event writer + validator + projector | `engine/` |

### 3.2 关键设计决策（已经过 codex 二审）

| 决策点 | 决策 | 理由 |
|---|---|---|
| Backbone | **E** Event-sourced Blackboard Skill Backbone | 比纯 SKILL / 声明式 workflow / Graph DAG 更贴 kata 实际形态 + 简历亮点；地基（telemetry / workflow / blackboard state-model / plugin manifest）已倒一半 |
| Cleanup 力度 | **A′**：激进清理 + 保 skill-graph 升级 Manifest | skill-graph.yaml 的 produces/consumes 是 E 数据流索引种子；frontmatter policy 不允许 outputs/dependencies 字段，无法反推 |
| Skill 内部组织 | **β-lite**：phases/§N-<step-id>.md + SKILL.md 短入口 + 加载索引 | LLM 自由走 prompt，phase 是事件 tag；现状已经在向此收敛 |
| Plugin/Hook/MCP | **III 约束版**：plugin manifest 含 facets，hook 独立 engine 内置，MCP read-only | 进程内 hook + 子进程 command + read-only MCP 是三种安全域，不能塞同一 schema |
| Observability | **α′ refined**：per-feature/per-session JSONL + feature index + blackboard.json + last-event notify projection + 14 event kinds + fail-closed + 单调 seq + atomic append | 解决回放/审计/订阅/证据；不引 SQLite/dashboard 避免过度工程 |

## 4 Cross-runtime Strategy（Phase 2 预留）

**原则**：契约层 runtime-neutral，入口层 runtime-specific。

| 层次 | runtime-neutral | 物理位置 |
|---|---|---|
| Event schema | ✅ | `.claude/contracts/schemas/event.json` |
| Blackboard schema | ✅ | `.claude/contracts/schemas/blackboard.json` |
| Phase contract | ✅ | `.claude/contracts/workflows/<skill>.yaml` |
| Plugin manifest | ✅ | `plugins/<id>/plugin.json` |
| Hook 声明 | ✅ | `.claude/contracts/hooks.yaml` |
| Validator engine | ✅ | `engine/src/runtime/event-validator.ts` |
| Skill SKILL.md | ❌ runtime-specific | `.claude/skills/<id>/SKILL.md` vs `.agents/skills/<id>/SKILL.md` |
| Skill 其它子目录 | ⚠️ shared via symlink | Codex 通过 symlink 复用 `.claude/skills/<id>/{phases,reviewers,workers,rules,fewshots}` |

### 4.1 Phase 2 `.agents/skills/<id>/` 目录形态

```
.agents/skills/case-draft/
├── SKILL.md                              # Phase 2 重写（runtime-specific 入口）
├── phases       -> ../../../.claude/skills/case-draft/phases
├── reviewers    -> ../../../.claude/skills/case-draft/reviewers
├── workers      -> ../../../.claude/skills/case-draft/workers
├── rules        -> ../../../.claude/skills/case-draft/rules
└── fewshots     -> ../../../.claude/skills/case-draft/fewshots
```

Phase 2 工作量约 = 每 skill 1 个 SKILL.md（80–150 行）。其它子目录零拷贝。

## 5 目标顶层目录树

```
kata/
├── CLAUDE.md                                # 入口（更新：E backbone 摘要）
├── AGENTS.md                                # 保留（更新：Phase 2 状态声明）
├── INSTALL.md / README*.md / CHANGELOG.md
├── package.json / bun.lock / tsconfig*.json / biome.json
├── playwright.config.ts / playwright.selftest.config.ts
│   # 删：progress.json
│
├── .claude/                                 # Phase 1 runtime
│   ├── settings.local.json                  # 用户权限 only
│   ├── settings.json                        # engine idempotent 写：hooks 注册
│   ├── skills/                              # 11 → 8 个（删 playwright-cli；bug-file + conflict-analyze + diff-scan 合并为 defect-analyze）
│   │   ├── _shared/
│   │   │   ├── case-qa.md                   # 原三份合一
│   │   │   └── source-ref-rules.md
│   │   ├── case-draft/                      # β-lite, 5 phases
│   │   ├── case-edit/                       # β-lite, 3 phases
│   │   ├── case-hotfix/                     # β-lite, 4 phases
│   │   ├── defect-analyze/                  # 新合，4 phases（bug + conflict + diff modes）
│   │   ├── infra-diagnose/                  # β-lite, 4 phases
│   │   ├── knowledge-curate/                # β-lite, 3 phases
│   │   ├── playwright-automation/           # β-lite, 7 phases + 吸收 playwright-cli refs
│   │   └── workspace-manage/                # β-lite, 2 phases
│   ├── contracts/
│   │   ├── skill-manifest.yaml              # 升级自 skill-graph.yaml（含 facets 索引）
│   │   ├── workflows/<skill>.yaml           # phase contracts
│   │   ├── schemas/
│   │   │   ├── event.json
│   │   │   ├── blackboard.json
│   │   │   ├── artifact-*.json
│   │   │   ├── handoff-*.json
│   │   │   └── source-ref-registry.yaml
│   │   ├── hooks.yaml                       # 新：engine hook 声明
│   │   └── blackboard/
│   │       └── state-model.md               # 重写：删「不强制校验」声明
│   │   # 删：runtime-sync-exceptions.yaml, skill-graph.yaml, routes/*.yaml
│   └── rules/                               # 项目级硬规则
│
├── .agents/                                 # Phase 2 runtime 占位
│   ├── README.md                            # 声明 Phase 2 适配状态
│   └── skills/<id>/                         # Phase 2 重写 SKILL.md + 子目录 symlink
│   # 删：.agents/contracts/, .agents/rules/（runtime-neutral 内容统一指向 .claude/）
│
├── engine/
│   ├── bin/kata
│   ├── src/
│   │   ├── cli/
│   │   │   ├── events.ts                    # 新：tail / replay / stats / validate / project
│   │   │   ├── hooks.ts                     # 新：install / status / uninstall
│   │   │   └── ...                          # 现有 ~40 命令保留
│   │   ├── runtime/                         # 新建：E backbone 核心
│   │   │   ├── event-writer.ts              # JSONL atomic append + 单调 seq + fail-closed
│   │   │   ├── event-validator.ts           # 升级 telemetry validator → 14 event_kinds
│   │   │   ├── blackboard.ts                # validator-enforced 状态
│   │   │   ├── projector.ts                 # last-event → notify markdown（debounced + atomic）
│   │   │   └── session.ts                   # run_id 生成、session 生命周期
│   │   ├── plugins/
│   │   │   ├── plugin-manifest.ts           # 加载 + facet 解析（升级）
│   │   │   ├── plugin-runner.ts             # command spawn / ts-module invoke
│   │   │   ├── event-subscriber.ts          # 新：plugin 订阅 dispatch
│   │   │   └── sandbox/
│   │   ├── skills/
│   │   │   ├── manifest-loader.ts           # 新：skill-manifest.yaml 加载
│   │   │   ├── workflow-loader.ts           # phase contract 加载（schema 扩展）
│   │   │   └── validator.ts                 # 合并现有 workflow-check + skill-graph-check + route-check
│   │   ├── hooks/                           # 5 个 hook 实现迁入
│   │   │   ├── installer.ts                 # 新：idempotent settings.json 写入
│   │   │   ├── pre-bash-guard.ts
│   │   │   ├── pre-edit-guard.ts
│   │   │   ├── post-edit-format.ts
│   │   │   ├── post-edit-md-link.ts
│   │   │   └── post-edit-debug-naming.ts
│   │   └── ...                              # 业务命令保留
│   ├── lib/                                 # paths/config/logger 等
│   ├── hooks/                               # 迁入 src/hooks/ 后清理
│   ├── tests/                               # 按 skill + concern 双层组织
│   └── templates/
│
├── apps/
│   ├── core/                                # catalog 基础库（解耦 .agents 直读）
│   └── mcp/                                 # MCP read-only catalog server（升级：扫描 plugin mcp_exports）
│   # 删：apps/console/
│
├── plugins/                                 # plugin manifest 升级到新 schema
│   ├── lanhu/
│   ├── zentao/
│   └── notify/
│
├── workspace/<project>/
│   ├── features/<feature>/
│   │   ├── events/<run_id>.jsonl            # per-session event log（主存储）
│   │   ├── events.index.jsonl               # feature 级摘要
│   │   ├── blackboard.json                  # 当前 blackboard 状态
│   │   ├── archive.md / cases.xmind / metadata.yaml / manifest.json
│   │   └── ...
│   ├── _shared/
│   └── .kata/
│       ├── notify/<run_id>.md               # last-event projection
│       ├── repos/ / auth/ / temp/ / infra/  # 不变
│
├── docs/superpowers/specs/
├── scripts/lint/
├── tools/dtstack-sdk/
├── templates/
└── config/
```

## 6 SKILL 设计

### 6.1 SKILL.md frontmatter（runtime-specific 字段表）

Claude 与 Codex 的 frontmatter allowlist 不同，需分层管理（codex 总审 F4）：

| 字段 | Claude allowlist | Codex allowlist | 说明 |
|---|---|---|---|
| `name` | ✅ 必填 | ✅ 必填 | kebab-case 唯一 id |
| `description` | ✅ 必填 | ✅ 必填 | 主路由文本，≤ 200 字 |
| `allowed-tools` | ✅ | ✅ | 工具白名单 |
| `when_to_use` | ✅ | ✅ | 触发提示（与 description 互补） |
| `disable-model-invocation` | ✅ | ✅ | 禁用 implicit model invocation |
| `argument-hint` | ✅（新加 allowlist） | ❌ | kata help 渲染；Claude Code 不直接消费 |
| `user-invocable` | ✅ | ❌ | slash-command 暴露开关 |
| `model` | ✅ | ❌（走 agents/openai.yaml） | inline phase & orchestrator session 默认 |
| `effort` | ✅ | ❌（走 agents/openai.yaml） | 默认 effort |
| `paths` | ✅ | ❌ | 工作路径白名单 |
| `context` | ✅ | ❌ | fork \| inherit |
| `agent` | ✅ | ❌ | 默认 subagent 类型（仅 fork 上下文使用） |

**Claude SKILL.md 示例（case-draft）**：

```yaml
---
name: case-draft                                    # 唯一 id
description: >
  用户提供 PRD、设计稿、Lanhu、Axure 或功能描述并要求生成 QA 测试用例时使用。
argument-hint: <lanhu-url | axure-url | prd-path>   # 新增 allowlist
user-invocable: true
model: sonnet                                       # inline phase & orchestrator 默认
effort: high
paths:
  - .claude/skills/case-draft/**
  - .claude/skills/_shared/**
  - .claude/contracts/workflows/case-draft.yaml
  - .claude/contracts/schemas/event.json
  - workspace/**
context: fork
agent: general-purpose                              # 默认 subagent 类型
---
```

**Codex SKILL.md 示例（Phase 5 重写后）**：

```yaml
---
name: case-draft
description: >
  用户提供 PRD、设计稿、Lanhu、Axure 或功能描述并要求生成 QA 测试用例时使用。
allowed-tools: [Bash, Read, Edit, Write, Grep, Glob]
---

# Codex SKILL.md body 内容（runtime-specific）
# phases/reviewers/workers/rules/fewshots 子目录通过 symlink 共享 .claude/skills/<id>/
```

**Codex runtime 配置（`agents/openai.yaml`）**：

```yaml
# .agents/skills/case-draft/agents/openai.yaml
model: gpt-5-codex
effort: high
implicit_invocation_policy: enabled
sandbox_capabilities:
  - workspace_write
  - network_outbound: [https://lanhuapp.com/**]
```

**字段不进 frontmatter**：
- `event_kinds_emitted` / `artifact_kinds_produced` → 下沉到 `workflow.yaml` top-level `metadata`
- `phase_contract` → 删除；engine 按约定 `workflows/<skill-id>.yaml` 自动 resolve

**新 lint**：
- `argument-hint` 加入 Claude `frontmatter-policy` allowlist（Codex allowlist 不动）
- SKILL.md 文件名 stem `SKILL.md`、目录名 `<id>`、frontmatter `name`、`workflows/<id>.yaml` 文件名、`workflow.yaml` 的 `name` 字段——五者必须严格一致

### 6.2 SKILL.md body 模板

```markdown
# <skill-id>

<一行 LLM-facing 简介。frontmatter description 给 Claude 路由用；这里给 LLM 自己阅读用。>

## When to trigger
- <bullet>
- <bullet>

## Must not trigger when
- <bullet>
- <bullet>

## Hard rules
- <规则 1（mechanic 可校验）>
- <规则 2>

## Phase index
按 `.claude/contracts/workflows/<skill-id>.yaml` 推进，逐 phase 加载下方文件：

| Phase | 文件 | 简介 |
|---|---|---|
| §1 <step-id> | phases/§1-<step-id>.md | <简介> |
| ... | ... | ... |

## Loaded by phase
| Phase | Reviewers | Workers | Rules | Fewshots |
|---|---|---|---|---|
| §N | ... | ... | ... | ... |

## Output artifacts
| Kind | Path pattern | Schema |
|---|---|---|
| archive | `workspace/<project>/features/<feature>/archive.md` | `.claude/contracts/schemas/artifact-archive.json` |
```

**SKILL.md 长度 ≤ 100 行**。不放 phase 详细内容、不放 reviewer/worker 协议——那些在各自文件。

### 6.3 phase 文件模板（`phases/§N-<step-id>.md`）

```markdown
# §N <Phase Name>

## Goal
<1 句话，本 phase 要达到什么状态>

## Inputs (blackboard reads)
- <slot 1>
- <slot 2>

## Outputs (blackboard writes)
- <slot 1>（必填 / 可选）
- <slot 2>

## Steps
1. <step：动作 + 依赖 + 验证>
2. <step>

## Hard rules
- <可校验项 1>

## Failure modes & recovery
- <failure>：emit `validator_failed` 然后 <recovery>
- <failure>：emit `blocked` 然后 <recovery>

## Events emitted
- `phase_entered`（自动）
- `decision_made` × N
- `artifact_written` × M
- `phase_exited`（自动）
```

**phase 文件长度 ≤ 150 行**。

### 6.4 reviewer / worker / rule / fewshot 规范

| 类型 | 模板要点 | 长度上限 |
|---|---|---|
| `reviewers/<role>.md` | Role + Inputs + Lint checklist + Output JSON schema + Emit events | 200 行 |
| `workers/<role>.md` | Envelope protocol（in/out JSON）+ Hard rules + Failure semantics | 200 行 |
| `rules/<topic>.md` | 全是 mechanic / declarative 可校验项；不放步骤；不放示例 | 80 行 |
| `fewshots/<scenario>.md` | 完整 input + expected output 对照；不替代 rules | 100 行 |
| `_shared/<topic>.md` | 跨 skill 共享；通过 `.claude/skills/_shared/<topic>.md` 绝对路径引用；改动需严格向后兼容 | 不限 |

**fewshot 不能替代长篇 declarative 规则**（codex 已确认 case-qa / spec-reviewer / worker 三类都是协议而非格式样例）。

### 6.5 命名约定汇总

| 项 | 规则 | 示例 |
|---|---|---|
| skill id | kebab-case | case-draft / defect-analyze |
| phase file | workflow-orchestrated 用 `§N-<step-id>.md`；无序 skill 用 `<topic>.md` | §1-source-intake.md / probe.md |
| reviewer / worker | `<role>.md` | spec-reviewer.md / case-worker.md |
| rule | `<topic>.md` | case-qa.md / naming-convention.md |
| fewshot | `<scenario>.md` | greenfield-prd.md / archive-format-sample.md |
| event_kind | snake_case | phase_entered / artifact_written |
| blackboard slot | snake_case | feature_id / archive_path |
| commit emoji | 严格按 `.claude/rules/project-workflow-rules.md` 表 | `refactor: ✨ ...` |

### 6.6 长度上限（hard，触发 `check:skills` 失败）

| 文件 | 上限 | 当前 max |
|---|---|---|
| SKILL.md | 100 行 | playwright-automation 81 ✅；playwright-cli 392 → 删 |
| phases/§N.md | 150 行 | 现 playwright-automation refs 最大 199 → 拆 |
| reviewer / worker | 200 行 | spec-reviewer-prompt 172 ✅ |
| rule | 80 行 | hotfix-archive-format 216 → 拆 / 压缩 |
| fewshot | 100 行 | n/a |

### 6.7 8 个 skill 最终列表

| Skill | Phases | Reviewers | Workers | Rules | Fewshots | 工作量 |
|---|---|---|---|---|---|---|
| **defect-analyze** 新合 | §1-intake / §2-classify / §3-analyze / §4-emit | spec | analyzer | mode-dispatch / defect-classify / defect-format | bug-mode / conflict-mode / diff-mode | M |
| **case-draft** | §1-source-intake / §2-atomize / §3-draft / §4-review / §5-output | spec / quality | case-worker | case-qa(_shared) / naming-convention | greenfield-prd / archive-format | L |
| **case-edit** | §1-parse / §2-diff / §3-apply | spec | edit-worker | case-qa(_shared) | archive-sync | M |
| **case-hotfix** | §1-bug-parse / §2-scope / §3-draft / §4-output | spec | hotfix-worker | case-qa(_shared) / hotfix-format | bug-to-hotfix | M |
| **infra-diagnose** | §1-probe / §2-diagnose / §3-remediate / §4-kb-write | spec | ssh-worker | ssh-protocol / knowledge-format | diag-playbook | S |
| **knowledge-curate** | §1-parse / §2-categorize / §3-write | spec | kb-worker | knowledge-rules | kb-entry-sample | S |
| **workspace-manage** | §1-inspect / §2-render | — | — | project-layout | menu-sample | S |
| **playwright-automation** | §1-preflight / §2-probe / §3-generate / §4-run / §5-repair / §6-quality / §7-handoff | spec / quality | playwright-worker | case-feedback / env-preflight | self-run-sample | L |

总工作量：2L + 3M + 3S。

### 6.8 workflow.yaml schema 终稿

```yaml
name: case-draft                              # 必须 == 文件名 stem == skill 目录名
version: 1.0.0
default_dispatch: inline                      # inline | subagent
default_model: sonnet                         # sonnet | opus | haiku
default_effort: high                          # low | medium | high

metadata:
  event_kinds_emitted: [phase_entered, phase_exited, decision_made, artifact_written, validator_failed, blocked, handoff_emitted]
  artifact_kinds_produced: [archive, xmind, metadata, manifest]

steps:
  - id: source-intake
    dispatch: inline
    blackboard_inputs: [user_input]
    blackboard_outputs: [source_refs]
    failure_modes: [missing_source, unauthorized]

  - id: case-draft
    dispatch: subagent
    model: sonnet
    effort: high
    # subagent_type 未声明，使用 SKILL.md agent 默认（general-purpose）
    workers: [case-worker]
    blackboard_inputs: [atoms]
    blackboard_outputs: [draft_archive]
    failure_modes: [worker_timeout, schema_mismatch]

  - id: spec-review
    dispatch: subagent
    model: haiku                              # 机械 lint 省成本
    effort: low
    reviewers: [spec-reviewer]
    blackboard_inputs: [draft_archive]
    blackboard_outputs: [spec_verdict, spec_violations]
    validators: [archive-schema]
    failure_modes: [verdict_invalid]

  - id: quality-review
    dispatch: subagent
    model: sonnet
    effort: medium
    reviewers: [quality-reviewer]
    blackboard_inputs: [draft_archive, spec_verdict]
    blackboard_outputs: [quality_verdict, quality_violations]
    failure_modes: [coverage_gap]

  - id: output
    dispatch: inline
    blackboard_inputs: [draft_archive, spec_verdict, quality_verdict]
    blackboard_outputs: [archive_path, xmind_path, manifest_path]
    validators: [archive-format, xmind-mapping, manifest-required]
    failure_modes: [io_error, validator_failed]
```

### 6.9 per-phase model 语义（执行主体明文化，解决 F3）

| Dispatch | 执行主体 | model/effort 生效路径 |
|---|---|---|
| `dispatch: inline` | Orchestrator（Claude session 本体） | 用 SKILL.md frontmatter `model` / `effort`；step 上的 `model/effort` warn 而非 fail（schema 一致但无 enforcement） |
| `dispatch: subagent` | **Phase Dispatcher** spawn Claude Agent / Codex subagent | 用 step `model/effort`，缺省 fallback `default_model/default_effort`，再 fallback SKILL.md `model/effort`；Phase Dispatcher 通过 Agent 工具 `model` 参数传值 |

**关键约束**：`dispatch: subagent` 必须由 engine 提供的 Phase Dispatcher（`engine/src/runtime/phase-dispatcher.ts`）显式 spawn，**不依赖 LLM 自己用 Agent 工具发起**——否则 model/effort 字段就是装饰品。Phase Dispatcher 是 E backbone 的实际执行轴心：

```
Orchestrator (Claude session, SKILL.md model)
   │
   │ phase = case-draft, dispatch = subagent, model = sonnet, effort = high
   ▼
Phase Dispatcher (engine/src/runtime/phase-dispatcher.ts)
   │ spawn via Agent tool with model=sonnet, effort=high
   ▼
Subagent (general-purpose, sonnet/high)
   │ emit events through event-writer
   ▼
Event Journal + Blackboard projection
```

### 6.10 playwright-automation per-phase model

| Phase | dispatch | model | effort |
|---|---|---|---|
| §1 preflight | inline | (skill default sonnet) | (default high) |
| §2 probe | inline | (default) | (default) |
| §3 generate | subagent | sonnet | high |
| §4 run | inline | (default) | (default) |
| §5 repair | subagent | sonnet | high |（opus 留作 opt-in 升级，在 README 记，连续失败 → 用户手动升）|
| §6 quality | subagent | haiku | low |
| §7 handoff | inline | (default) | (default) |

### 6.11 其它 6 个 skill 默认 model

| Skill | default_model | 重点 phase 覆写 |
|---|---|---|
| defect-analyze | sonnet | §3 spec-review: haiku；§4 quality: sonnet |
| case-edit | sonnet | spec-review: haiku |
| case-hotfix | sonnet | spec-review: haiku |
| infra-diagnose | sonnet | （单流程无 review） |
| knowledge-curate | haiku | （I/O 为主） |
| workspace-manage | haiku | （catalog 操作） |

### 6.12 defect-analyze 详细设计（新合 skill 样例）

**SKILL.md**（≤ 80 行）：

```markdown
---
name: defect-analyze
description: >
  用户提供 bug 现象、merge conflict、代码 diff 或失败证据时，分析缺陷并生成结构化报告。
argument-hint: <bug-evidence | conflict-block | diff-path>
user-invocable: true
model: sonnet
effort: high
paths:
  - .claude/skills/defect-analyze/**
  - .claude/skills/_shared/**
  - .claude/contracts/workflows/defect-analyze.yaml
  - .claude/contracts/schemas/event.json
  - .claude/contracts/schemas/artifact-defect-report.json
  - workspace/**
context: fork
agent: general-purpose
---

# defect-analyze

接收失败证据 / merge conflict / code diff 三种输入，分诊到对应 mode，分析后生成结构化缺陷报告。

## When to trigger
- 用户给出可复现 bug 现象（stack trace / 错误日志 / screenshot）
- 用户粘贴 merge conflict 标记
- 用户要求扫描一段 code diff 的潜在缺陷

## Must not trigger when
- 用户只提供 ZenTao bug URL / bug ID → 路由 `case-hotfix`
- 用户要求自动修复 bug（本 skill 只分析不修）
- 用户要求 SSH 排查 connectivity → 路由 `infra-diagnose`

## Hard rules
- 必须先 mode-dispatch（§1-intake），不可在 §3-analyze 之前跳过分诊
- 所有报告字段必须有 SourceRef 引用证据
- 输出严格匹配 `artifact-defect-report.json` schema
- 单次只产一份 defect-report，多缺陷需拆多次调用

## Phase index
| Phase | 文件 |
|---|---|
| §1 intake | phases/§1-intake.md |
| §2 classify | phases/§2-classify.md |
| §3 analyze | phases/§3-analyze.md |
| §4 emit | phases/§4-emit.md |

## Loaded by phase
| Phase | Reviewers | Workers | Rules | Fewshots |
|---|---|---|---|---|
| §1 | — | — | rules/mode-dispatch.md | — |
| §2 | — | — | rules/defect-classify.md | — |
| §3 | reviewers/spec-reviewer.md | workers/analyzer.md | rules/defect-format.md, _shared/source-ref-rules.md | fewshots/bug-mode.md, fewshots/conflict-mode.md, fewshots/diff-mode.md |
| §4 | reviewers/quality-reviewer.md | — | rules/defect-format.md | — |

## Output artifacts
| Kind | Path | Schema |
|---|---|---|
| defect-report | `workspace/<project>/features/<feature>/defect-report.md` | `.claude/contracts/schemas/artifact-defect-report.json` |
```

**目录骨架**：

```
.claude/skills/defect-analyze/
├── SKILL.md                                  # ≤ 80 行
├── phases/
│   ├── §1-intake.md                          # mode 分诊
│   ├── §2-classify.md                        # 严重度/分类/影响范围
│   ├── §3-analyze.md                         # 根因 + SourceRef anchor
│   └── §4-emit.md                            # 报告输出 + handoff
├── reviewers/
│   ├── spec-reviewer.md
│   └── quality-reviewer.md
├── workers/
│   └── analyzer.md                           # mode-specific analyzer envelope
├── rules/
│   ├── mode-dispatch.md
│   ├── defect-classify.md
│   └── defect-format.md
└── fewshots/
    ├── bug-mode.md
    ├── conflict-mode.md
    └── diff-mode.md
```

**workflow.yaml**（mode-specific schema，解决 I3：保 conflict-analyze 的 dual-intent + resolution-plan）：

```yaml
name: defect-analyze
version: 1.0.0
default_dispatch: inline
default_model: sonnet
default_effort: high

metadata:
  event_kinds_emitted: [phase_entered, phase_exited, decision_made, artifact_written, validator_failed, blocked, handoff_emitted]
  artifact_kinds_produced: [defect-report, conflict-resolution-plan]   # mode-specific 输出

steps:
  - id: intake
    dispatch: inline
    blackboard_inputs: [user_input]
    blackboard_outputs: [mode]                # mode ∈ {bug, conflict, diff}
    failure_modes: [ambiguous_input]

  - id: classify
    dispatch: inline
    blackboard_inputs: [mode, user_input]
    blackboard_outputs: [severity, category, scope]
    validators: [classify-schema]

  - id: analyze
    dispatch: subagent
    model: sonnet
    effort: high
    workers: [analyzer]
    blackboard_inputs: [mode, severity, category, scope, user_input]
    # mode-specific outputs
    blackboard_outputs_by_mode:
      bug:      [root_cause, evidence_refs, impacted_areas]
      diff:     [root_cause, evidence_refs, impacted_areas]
      conflict: [side_a_intent, side_b_intent, resolution_plan, evidence_refs]   # 保 dual-intent
    validators_by_mode:
      bug:      [analysis-schema, source-ref-coverage]
      diff:     [analysis-schema, source-ref-coverage]
      conflict: [conflict-analysis-schema, dual-intent-coverage, source-ref-coverage]
    reviewers: [spec-reviewer]

  - id: emit
    dispatch: inline
    blackboard_inputs_by_mode:
      bug:      [mode, root_cause, evidence_refs, impacted_areas, severity, category, scope]
      diff:     [mode, root_cause, evidence_refs, impacted_areas, severity, category, scope]
      conflict: [mode, side_a_intent, side_b_intent, resolution_plan, evidence_refs, severity, category, scope]
    blackboard_outputs_by_mode:
      bug:      [defect_report_path]
      diff:     [defect_report_path]
      conflict: [conflict_resolution_plan_path]
    validators_by_mode:
      bug:      [artifact-defect-report]
      diff:     [artifact-defect-report]
      conflict: [artifact-conflict-resolution-plan]
    reviewers: [quality-reviewer]
```

`phases/§3-analyze.md` 必须包含 mode-specific 分支说明：
- `mode = bug | diff`：通常路径，输出 root_cause + evidence_refs + impacted_areas
- `mode = conflict`：**必须先陈述双方意图**（side_a_intent / side_b_intent）再给出 resolution_plan，沿用原 conflict-analyze 硬规则
- `mode = conflict` 产物是 `conflict-resolution-plan.md`，不是 `defect-report.md`

Schema 文件需新建 `.claude/contracts/schemas/artifact-conflict-resolution-plan.json` 与 `defect-report` schema 并列。

## 7 Plugin Manifest Schema 终稿

```json
{
  "id": "lanhu",                                    // kebab-case
  "version": "1.0.0",                               // semver
  "description": "蓝湖 PRD 导入",                    // < 100 字
  "runtime": "command",                             // command | ts-module

  "entrypoints": {
    "commands": {
      "fetch": "bun plugins/lanhu/fetch.ts --url ${url} --feature ${feature}"
    }
  },

  "extension_points": {
    "input_adapters": ["case-draft:source-intake"],   // <skill-id>:<phase-id>
    "event_subscribers": ["artifact_written"]         // event_kind 订阅
  },

  "capability_required": {
    "fs_read":     ["workspace/**"],
    "fs_write":    ["workspace/*/features/**", "workspace/*/.kata/temp/**"],
    "net":         ["https://lanhuapp.com/**"],
    "secret_refs": ["env:KATA_LANHU_COOKIE"]
  },

  "outputs": {
    "events":    ["source.fetched"],
    "artifacts": ["prd-snapshot"]
  },

  "mcp_exports": []                                 // read-only MCP tool defs; default empty
}
```

**强制**：`capability_required` 4 个子字段必须全部显式声明（空数组 `[]` 是允许的，但不能省）。

## 8 Hook 系统

### 8.1 `.claude/contracts/hooks.yaml`

```yaml
hooks:
  - id: pre-bash-guard
    event: PreToolUse
    matcher: { tool: Bash }
    handler: engine/src/hooks/pre-bash-guard.ts
    enabled: true
  - id: pre-edit-guard
    event: PreToolUse
    matcher: { tool: [Edit, Write, NotebookEdit] }
    handler: engine/src/hooks/pre-edit-guard.ts
    enabled: true
  - id: post-edit-format
    event: PostToolUse
    matcher: { tool: [Edit, Write] }
    handler: engine/src/hooks/post-edit-format.ts
    enabled: true
  - id: post-edit-md-link
    event: PostToolUse
    matcher: { tool: [Edit, Write], path: "**/*.md" }
    handler: engine/src/hooks/post-edit-md-link.ts
    enabled: true
  - id: post-edit-debug-naming
    event: PostToolUse
    matcher: { tool: [Edit, Write] }
    handler: engine/src/hooks/post-edit-debug-naming.ts
    enabled: true
```

### 8.2 Installer 行为

- `bun kata hooks install`：读 `hooks.yaml` → 写 `.claude/settings.json` 中带 `_managed_by: kata` marker 的 block
- 不写 `.claude/settings.local.json`
- `bun kata hooks status`：显示 contract vs settings diff
- `bun kata hooks uninstall`：只删 kata-managed block，保留其它

## 9 Event Journal 终稿

### 9.1 存储布局

```
workspace/<project>/features/<feature>/
├── events/<run_id>.jsonl          # 主存储（append-only，per-session 单 writer）
├── events.index.jsonl             # feature 级摘要
└── blackboard.json                # 当前 blackboard projection
workspace/<project>/.kata/notify/<run_id>.md   # last-event projection
```

### 9.2 Event envelope schema

```json
{
  "schema_version": 1,
  "seq": 42,                          // 单调递增 per-session
  "event_id": "evt_xxxxx",
  "ts": "2026-05-28T20:30:00.000Z",
  "run_id": "run_xxxxx",              // session 权威字段（沿用现 telemetry run_id）
  "feature_id": "...",
  "skill_id": "case-draft",
  "skill_version": "1.0.0",
  "workflow_id": "case-draft@1.0.0",
  "phase": "case-draft",              // null if outside phase
  "event_kind": "phase_entered",
  "status": "ok",                     // ok | blocked | failed | resolved
  "agent_id": "...",
  "prompt_id": "...",                 // optional
  "plugin_id": "...",                 // optional
  "input_tokens": 1234,
  "output_tokens": 567,
  "rule_id": "...",                   // optional
  "hashed_artifact_ref": "sha256:...", // optional
  "payload": { ... },                 // event_kind-specific
  "blackboard_delta": { ... }         // optional, only for artifact_written / decision_made
}
```

### 9.3 event_kind 枚举（19 个）

```
session_started / session_ended
phase_entered / phase_exited
decision_made / artifact_written
command_ran / plugin_invoked / plugin_failed
validator_failed / blocked
human_gate_opened / human_gate_resolved
subagent_dispatched / subagent_completed / subagent_failed
handoff_emitted / skill_routed / projection_failed
```

旧 6 粗粒度（artifact / policy / plugin / agent / source_ref / config）映射弃用。

**新增 5 个的理由（codex 总审 I2）**：
- `human_gate_opened`：与 `human_gate_resolved` 配对，让 audit 可重放等待历史
- `subagent_dispatched` / `subagent_completed` / `subagent_failed`：Phase Dispatcher 派遣 subagent 的全生命周期可观测
- `projection_failed`：blackboard / notify projection 异常时的 compensating event（与 staged transaction 配套，见 §9.4）

### 9.4 Write 语义（staged transaction，解决 F2）

JSONL append 不可回滚——一旦写入就是历史。因此 "rollback" 必须重新定义为 **staged transaction + compensating event**：

| 阶段 | 实现 |
|---|---|
| Per-session 单 writer | `engine/src/runtime/session.ts` 维护 `run_id → writer` 映射 |
| 单调 seq | writer 内部递增 |
| Atomic append | tmp file + fsync + rename |
| **Staged transaction**（写产物 + 事件 + 投影） | 三阶段：(1) **stage**：写临时 artifact 文件 + 计算 sha256 hash + 通过 artifact validator；(2) **commit**：atomic-rename 临时文件到目标路径 + append `artifact_written` event（含 hashed_artifact_ref）；(3) **project**：应用 blackboard_delta + 写 `events.index.jsonl` 摘要 |
| **Fail-closed** | 任一阶段失败立即 throw 不进下一步；已 append 的 event **不删除**；compensating event（`projection_failed` 或 `validator_failed`）追加；blackboard.json 保留为最后成功 projection 状态 |
| Index 并发（S2） | `events.index.jsonl` 用 `O_APPEND` + advisory file lock 写入；如观察到 cross-process 大并发，改为异步 projector 从所有 session logs 重建 index（rebuild 是幂等的） |
| Schema validation | 写入前必须通过 `engine/src/runtime/event-validator.ts`（升级 telemetry validator，19 event_kinds + 完整 envelope） |

**事务示意**：

```
phase 想写 artifact:
  1. stage:   tmp file 写入 + sha256 = X
     失败 → throw, no event written
  2. commit:  rename tmp → final + append "artifact_written" event (seq=N, hashed_artifact_ref=X)
     append 成功后 artifact 视为存在
  3. project: blackboard.json 应用 delta + events.index append "ts run_id skill phase artifact_written ..."
     project 失败 → append "projection_failed" event (seq=N+1, status=failed, references seq=N)
                  → blackboard.json 保留 stage-2 之前的最后成功 projection
```

### 9.5 Blackboard projection

- 每次 `artifact_written` / `decision_made` 后，`blackboard.ts` 应用 `blackboard_delta`，写 `blackboard.json`（atomic rename）
- 写入 slot 必须在 `workflow.yaml` 当前 step 的 `blackboard_outputs` 中声明，否则 emit `validator_failed`

### 9.6 Notify projection

- last-event projection → `.kata/notify/<run_id>.md`
- Debounced 1s + atomic rename（避免读到半写）
- 模板继承当前 `【KATA 工作通知】` 风格，字段来自 event journal + blackboard 当前态

### 9.7 CLI

```
kata events tail [--feature X] [--run-id Y] [--kind validator_failed]
kata events replay <run_id>
kata events stats [--since 7d] [--by skill|phase]
kata events validate <jsonl>
kata events project <run_id>
```

### 9.8 MCP read-only

新增 `kata_query_events`（read-only，敏感字段 telemetry validator 已过滤）。

## 10 新增 lint（`bun run check:skills`）

1. **Claude SKILL.md frontmatter** 字段 ∈ Claude allowlist（含新 `argument-hint`）；**Codex SKILL.md frontmatter** 字段 ∈ Codex allowlist（保持 `name/description/allowed-tools/when_to_use/disable-model-invocation`）
2. SKILL.md 文件名 / 目录名 / frontmatter name / `workflows/<name>.yaml` 文件名 / workflow.yaml `name` 五者一致
3. workflow.yaml: `dispatch ∈ {inline, subagent}` per step
4. workflow.yaml: `model ∈ {sonnet, opus, haiku}` per step（若声明）
5. workflow.yaml: `effort ∈ {low, medium, high}` per step（若声明）
6. workflow.yaml: step 上 `subagent_type` 若声明，必须 == SKILL.md `agent` 或属于已知 subagent 列表
7. workflow.yaml: blackboard slot 必须在 `.claude/contracts/schemas/blackboard-slots.json` registry 中声明
8. SKILL.md / phase / reviewer / worker / rule / fewshot 文件长度上限
9. plugin manifest `capability_required` 4 个子字段全部显式（缺字段 hard error，不再 warning）
10. event_kind ∈ 19 枚举
11. Codex `agents/openai.yaml` 必须存在（每个 Codex SKILL.md 同目录有 `agents/openai.yaml`，含 model/effort/sandbox_capabilities）

## 11 Cleanup Migration Path（10 commits + Phase 5）

### P1 Cleanup（7 commits — 含 F1/I1 拆分）

| # | Commit | 影响 |
|---|---|---|
| 1 | `refactor: ✨ retire codex runtime mirror + catalog shim` | 删 `.agents/contracts/`、`.agents/rules/`；保 `.agents/skills/` 加 README 占位；**新增 `apps/core/catalog/compat-shim.ts`**：从 `.claude/contracts/skill-manifest.yaml` 合成同形 `SkillSummary`，保 MCP `kata_list_skills` 响应 contract 不变（I1）；解耦 `engine/src/skills/runtime-sync.ts`、`apps/core/catalog/skills.ts`、`engine/src/cli/skill-audit.ts`；移除 `AGENTS.md` 对 contracts/rules 引用 |
| 2 | `refactor: ✨ prune dead apps and yaml` | 删 `apps/console/`、`runtime-sync-exceptions.yaml`、`routes/*.yaml`（11 份）、`progress.json` |
| 3 | `refactor: ✨ promote skill graph to manifest` | `skill-graph.yaml → skill-manifest.yaml`；新增 facets 索引；扩 Claude `frontmatter-policy` allowlist（加 `argument-hint`，**不动 Codex allowlist**）；删 `engine/src/skills/route-check.ts` |
| 4.a | `refactor: ✨ workflow schema v2 parser` | 扩 `engine/src/skills/workflow-schema.ts` 支持 v2 字段（top-level `default_dispatch/default_model/default_effort/metadata`、step `dispatch/model/effort/subagent_type/blackboard_outputs_by_mode/validators_by_mode` 等），保 v1 fallback；新增 slot registry `.claude/contracts/schemas/blackboard-slots.json`；扩 tests（F1 拆分第一步） |
| 4.b | `refactor: ✨ migrate all workflows to v2` | 迁现有 4 个 workflow.yaml（case-draft / case-edit / case-hotfix / playwright-automation）到 v2；新建 defect-analyze workflow.yaml；新建 infra-diagnose / knowledge-curate / workspace-manage workflow.yaml（F1 拆分第二步） |
| 4.c | `feat: 🧩 enable workflow v2 lint` | 启 enum + filename + slot 一致性 lint；重写 `.claude/contracts/blackboard/state-model.md`（删「不强制校验」声明）；blackboard validator hard-on（F1 拆分第三步） |
| 5 | `refactor: ✨ collapse qa playwright overlap` | `case-qa.md` 三合一到 `.claude/skills/_shared/`；删 `.claude/skills/playwright-cli/`；不重叠 cli 内容浓缩到 `.claude/skills/playwright-automation/references/cli-essentials.md`；更新 `skill-manifest.yaml` |

### P2 Event journal core（2 commits）

| # | Commit | 影响 |
|---|---|---|
| 6.a | `feat: 🧩 event journal core (writer + validator + session)` | 新建 `engine/src/runtime/{event-writer,event-validator,session}.ts`；升级 telemetry validator 到 19 event_kinds + 完整 envelope schema；staged transaction + 单调 seq + atomic append；events.index 用 file lock |
| 6.b | `feat: 🧩 blackboard + projector + cli + phase dispatcher` | 新建 `engine/src/runtime/{blackboard,projector,phase-dispatcher}.ts`；新 `engine/src/cli/events.ts`（tail / replay / stats / validate / project）；Phase Dispatcher 显式 spawn Claude Agent / Codex subagent 并传 model/effort（解决 F3） |

### P3 Skill migration（2 commits，可拆 sub-commits）

| # | Commit | 影响 |
|---|---|---|
| 7 | `refactor: ✨ migrate case-draft to β-lite + E` | 重构 `case-draft/` 目录到 β-lite；workflow.yaml 升级新 schema；engine emit events；实跑验证 events.jsonl 生效 |
| 8 | `refactor: ✨ migrate remaining 7 skills` | case-edit / case-hotfix / infra-diagnose / knowledge-curate / workspace-manage / playwright-automation / defect-analyze（合并 bug-file + conflict-analyze + diff-scan）。每 skill 一个 sub-commit |

### P4 Plugin / Hook / MCP（2 commits）

| # | Commit | 影响 |
|---|---|---|
| 9 | `feat: 🧩 plugin sdk and hook installer` | 扩 `plugin-manifest.ts` 加 v2 schema **同时保 v1 兼容 adapter**（兼容现有 `url_patterns + commands.fetch` 直到所有 plugin 迁完，解决 I4）；`capability_required` 缺字段从 warning 改 hard error；新 `engine/src/plugins/event-subscriber.ts`；hooks 5 个迁入 `engine/src/hooks/`；新 `installer.ts` + `cli/hooks.ts`；3 个现有 plugin manifest 升级到 v2 |
| 10 | `refactor: ✨ upgrade mcp catalog scanning` | **新 `apps/mcp/registry.ts`**：built-in TOOLS + 从 plugin `mcp_exports` 动态注册 + 新 `kata_query_events` MCP tool（I5）；所有 export 必须 read-only（运行时 capability 检查） |

### P5 Codex runtime adapt（2 commits — 前置 spike 解决 I6）

| # | Commit | 影响 |
|---|---|---|
| 11.spike | `chore: 🧹 codex symlink spike (single skill)` | 用一个最简 skill（如 `workspace-manage`）实测 Codex CLI 对 `.agents/skills/<id>/{phases,reviewers,...}` 符号链接的解引用、context 限制、prompt 渲染；spike 记录写入 `docs/superpowers/specs/codex-symlink-spike-result.md`；spike 不合入主分支（独立 branch 或 detached 验证） |
| 11 | `feat: 🧩 codex runtime via symlink (if spike pass)` | spike **通过**：按零拷贝策略落地，`.agents/skills/<id>/SKILL.md` 重写适配 Codex + `agents/openai.yaml` 配置 model/effort/sandbox（解决 F4）；其它子目录全 symlink 到 `.claude/skills/<id>/`；删 `.agents/README` 的 placeholder note；更新 `apps/core/catalog/skills.ts` 双 runtime union。spike **不通过**：改为脚本同步策略（`bun kata skills sync-codex`），工期重估并写入 Roadmap |

### P6 Polish（1–3 commits）

| # | Commit | 影响 |
|---|---|---|
| 12+ | `docs: 📝 e backbone readme + metrics` | README / CHANGELOG / 简历 doc / metric snapshot 截图 |

## 12 总 Roadmap

| Phase | Commits | 工作量估计 | 关键交付 |
|---|---|---|---|
| P1 Cleanup | 1, 2, 3, 4.a, 4.b, 4.c, 5（7 commits） | M+（~1.5 周） | 仓库结构干净、contracts/schema/lint v2 完整 |
| P2 Event core | 6.a, 6.b（2 commits） | L（~1–2 周） | E backbone 脊柱 + Phase Dispatcher 可用，CLI tail/replay |
| P3 Skill migration | 7, 8（2 commits，每 skill sub-commit） | XL（~2–3 周） | 8 skill 全转 β-lite + emit events |
| P4 Plugin/Hook/MCP | 9, 10（2 commits） | L（~1–2 周） | 插件 SDK v2 + 兼容 adapter、hook installer、MCP 自动扫描 |
| P5 Codex adapt | 11.spike, 11（2 commits） | M（~1 周，含 spike） | runtime-portable 验证（spike 通过则零拷贝；不过则脚本同步并重估） |
| P6 Polish | 12+ | S（~3 天） | 简历 doc / metric snapshots |

**单人总工期：4.5–7 周**（吸收 codex 总审修正后比初版多 0.5–1 周）。

### 12.1 旧模块 → 新模块迁移表（解决 S3）

| 旧 | 新 | Phase |
|---|---|---|
| `engine/src/plugin-loader.ts` | `engine/src/plugins/plugin-manifest.ts` + v1 adapter | P4#9 |
| `engine/lib/plugin-utils.ts` | `engine/src/plugins/plugin-manifest.ts` | P4#9 |
| `engine/hooks/*.ts` | `engine/src/hooks/*.ts` | P4#9 |
| `engine/lib/hooks.ts` | `engine/src/hooks/installer.ts` | P4#9 |
| `engine/src/telemetry/runtime-telemetry.ts` | `engine/src/runtime/event-validator.ts`（升级 19 event_kinds） | P2#6.a |
| `engine/src/skills/skill-graph-check.ts` | `engine/src/skills/manifest-loader.ts` | P1#3 |
| `engine/src/skills/route-check.ts` | （删除） | P1#3 |
| `engine/src/skills/workflow-check.ts` | `engine/src/skills/validator.ts`（v2 enum + filename + slot） | P1#4.a / 4.c |
| `engine/src/skills/runtime-sync.ts` | （effectively deprecated；Codex 适配后改为双 runtime 一致性 check） | P1#1 |
| `engine/src/skills/workflow-schema.ts` | （extended v2） | P1#4.a |
| `apps/mcp/tools.ts`（静态 TOOLS） | `apps/mcp/registry.ts`（dynamic） | P4#10 |
| `.claude/contracts/skill-graph.yaml` | `.claude/contracts/skill-manifest.yaml` | P1#3 |
| `.claude/contracts/routes/*.yaml`（11 份） | （删除，并入 manifest） | P1#3 |
| `.claude/contracts/runtime-sync-exceptions.yaml` | （删除，空文件） | P1#2 |
| `.claude/contracts/blackboard/state-model.md` | （重写：删「不强制校验」） | P1#4.c |
| `progress.json` | （删除） | P1#2 |
| `.agents/contracts/` | （删除，symlink reuse via `.agents/skills/`） | P1#1 |
| `.agents/rules/` | （删除，symlink reuse via `.agents/skills/`） | P1#1 |
| `apps/console/` | （删除） | P1#2 |
| `.claude/skills/playwright-cli/` | merged into `playwright-automation/references/cli-essentials.md` | P1#5 |
| `.claude/skills/{bug-file,conflict-analyze,diff-scan}/` | merged into `defect-analyze/` | P3#8 |
| `.claude/skills/*/rules/case-qa.md`（3 份） | `.claude/skills/_shared/case-qa.md` | P1#5 |

## 13 风险

1. **per-phase model 实际收益不确定**：Phase Dispatcher spawn subagent 有启动延迟，sonnet/haiku 混合若实际省不了多少成本或换不来质量提升，P3 实测后简化为单 model
2. **event_kind 枚举可能再扩**：19 个不够时升 `schema_version: 2`
3. **blackboard validator 严格度**：太严 LLM 写不进，太松失去 contract 价值；P2 实施时 tuning
4. **`apps/core` 解耦 `.agents` 读取**：catalog compat-shim（P1#1）必须保 `kata_list_skills` 响应字段 schema 不变，避免破坏外部 MCP client
5. **`.claude/contracts/blackboard/state-model.md` 自带「不强制校验」声明**与新 validator 政策冲突——P1#4.c 重写
6. **P5 Codex symlink 适配**：依赖 symlink 在 Codex CLI 是否正确解引用，P5 前置 spike commit 实测；不支持则改脚本同步（`bun kata skills sync-codex`），工期 +0.5–1 周
7. **migrate case-draft 难度**：现有 case-draft 已有 spec/quality reviewer + worker prompt + workflow yaml，β-lite 迁移需保 reviewer 行为等价；建议先 1:1 移到 `reviewers/` 目录，再调 phase 拆分
8. **F1 workflow v2 滚动迁移风险**：v2 parser 必须保 v1 fallback 直到所有 workflow.yaml 迁完（P1#4.b 完成）才能 enable 强 lint（P1#4.c）；若中途 commit 顺序错，会 cascade 失败
9. **F2 staged transaction 复杂度**：三阶段事务实现错会导致 event journal 与 artifact / blackboard 不一致；P2#6.a 必须有专门测试覆盖 stage / commit / project 三种失败路径 + recover 路径
10. **F3 Phase Dispatcher 与 Claude 原生 Agent 工具**：实测 Agent 工具的 `model` 参数是否每次都被尊重，是否有静默 downgrade；P2#6.b 实施时验证
11. **F4 Codex runtime 字段差异**：Codex `agents/openai.yaml` 字段未在 kata 历史 lint 覆盖，P1#3 加扩展 + P5 完整生效；中间状态 Codex skill 可能临时跑不起来
12. **I3 defect-analyze mode-specific schema 复杂度**：`blackboard_outputs_by_mode` / `validators_by_mode` 是 workflow v2 的新 feature，P1#4.a 实现复杂度提高；建议先单 mode 验证再扩

## 14 开放问题（不阻 design 通过）

- `argument-hint` 是否在 `bun kata help <skill>` 输出渲染？（建议：是，简单文本）
- event journal compaction 策略（每 N events snapshot）？P2 不做，feature 数 > 50 再说
- workspace 跨 project 共享 plugin manifest？（当前 plugin 是 repo-global，跨 workspace OK）
- MCP write tool（涉及 approval gate）→ P7 future work
- 现有 `progress.json` 是否需要迁移历史数据到 event journal？（建议：不迁移，新 feature 用新系统）
- opus 何时触发：playwright-automation §5 repair-loop 连续失败 N 次后人工升级？

## 15 验收标准

| 标准 | 测量 |
|---|---|
| skill 数量 11 → 8 | `ls .claude/skills/` |
| 重复 case-qa 消除 | `_shared/case-qa.md` 存在 + 三 case-* skill 引用 |
| 死代码清除 | apps/console、playwright-cli、routes、progress.json 不存在 |
| Event journal 工作 | 跑一次 case-draft，verify `workspace/<project>/features/<feature>/events/<run_id>.jsonl` 有完整 phase_entered / subagent_dispatched / artifact_written / phase_exited 事件序列 |
| Event schema | 所有写入事件 ∈ 19 event_kind 枚举，validator 通过 |
| Staged transaction | 故意让 artifact validator 失败 → 临时文件未 rename，event 也未 append，blackboard.json 保持旧态；故意让 projection 失败 → append `projection_failed` event，blackboard.json 保留最后成功投影 |
| Blackboard validator 强制 | 故意 step output 写入未声明 slot → emit `validator_failed` 并阻断后续 |
| Phase Dispatcher | dispatch=subagent 的 phase 实测产生 `subagent_dispatched` + `subagent_completed/failed` 事件；Agent 工具传入的 model 与 workflow.yaml step.model 一致（log 比对） |
| Notify projection | events 写入后 `.kata/notify/<run_id>.md` 1 秒内更新；中途读取不见半写状态（atomic rename 验证） |
| CLI 可用 | `kata events tail / replay / stats / validate / project` 全部 exit 0 |
| Hook installer 工作 | `kata hooks install` 后 `.claude/settings.json` 含 `_managed_by: kata` block；`kata hooks uninstall` 干净移除；不写 `.claude/settings.local.json` |
| Plugin manifest 升级 | lanhu / zentao / notify 都符合 v2 schema，capability 4 子字段全显式；v1 adapter 在迁移期保活 |
| MCP 扫描 | `apps/mcp/registry.ts` 启动时扫描 plugin mcp_exports + 暴露 `kata_query_events`；外部 MCP client 可调 |
| Catalog shim | 删 `.agents/contracts/` 后 `kata_list_skills` MCP 响应字段 schema 不变（保 inputs/outputs/triggers） |
| defect-analyze mode-specific | bug/diff mode 产 `defect-report.md`；conflict mode 产 `conflict-resolution-plan.md` 且含 side_a_intent + side_b_intent |
| Codex runtime adapt | `.agents/skills/<id>/SKILL.md` 全部存在 + `agents/openai.yaml` 配置；子目录 symlink 工作（或脚本同步替代方案）；Codex CLI 实跑 case-draft 产生 events |
| 简历级文档 | README 含 E backbone 架构图、metric snapshot、双 runtime 说明、Phase Dispatcher 设计说明 |

## 16 Out of Scope（本 design 不覆盖）

- MCP write tool 的 approval gate 设计（推迟 P7）
- 多 user 工作区隔离（kata 假设单用户）
- 多语言 plugin runtime（仅 TypeScript / shell command）
- web dashboard / UI（CLI + MCP 为主）
- LLM 厂商抽象层（kata 假定 Claude / Codex）
- 跨 repo 工作（kata 假定单 repo）
