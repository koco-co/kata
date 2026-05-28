# Skill Runtime 独立维护与企业级编排重构设计

- **日期**：2026-05-27
- **作者**：Codex
- **状态**：待审
- **类型**：架构重构 + runtime skill 体系重建
- **相关**：`docs/superpowers/specs/2026-05-27-skill-contract-enforcement-design.md`

## 1. 背景

当前 kata 的 agent 能力体系以 `.ai/core` 为统一契约源，再投影（projection，指从 SSOT 合约渲染生成 runtime 目录文件）到 `.claude/**` 和 `.agents/**`。这个模式在早期能统一产物，但现在暴露出几个结构性问题：

1. `.claude` 与 `.agents` 只是投影目录，不能充分使用 Claude Code 与 Codex 各自的原生能力。
2. `SKILL.md` 里存在大量看似强约束、实际只是正文提示的装饰性契约字段，例如 `outputs`、`allowed_tools`、`context_budget`、`evidence`、`failure_policy`。
3. Router、Workflow、Blackboard、Graph 都混在 prompt 文本里，没有清晰的边界、状态模型和可测同步机制。
4. `CLAUDE.md` 是 `AGENTS.md` symlink，无法表达两个 runtime 的差异化规则。
5. `CLAUDE.local.md` 额外引入本地入口，增加规则来源数量。

`2026-05-27-skill-contract-enforcement-design.md` 已经指出装饰字段问题，但当时明确不引入 frontmatter 提升。本设计接续该结论，并把方向推进为：废弃 `.ai/**`，让 `.claude/**` 与 `.agents/**` 成为两个独立维护的一等 runtime 实现。

## 2. 外部调研结论

### 2.1 Agent Skills open standard

Agent Skills 标准把 skill 定义为目录包：`SKILL.md` 加可选 `scripts/`、`references/`、`assets/`。标准 frontmatter 以 `name`、`description` 为核心，另有 `license`、`compatibility`、`metadata`、实验性的 `allowed-tools`。它强调 progressive disclosure：启动时加载少量 metadata，命中 skill 后再加载正文，引用资料按需读取。

来源：<https://agentskills.io/specification>

### 2.2 Codex Skills

Codex 启动时只把 skill 的 `name`、`description`、路径放入上下文；完整 `SKILL.md` 只有在 Codex 决定使用该 skill 后才加载。Codex 的 `SKILL.md` 必须包含 `name` 与 `description`，隐式调用主要依赖 `description`。Codex 扩展控制面位于 `agents/openai.yaml`，可配置 UI metadata、`policy.allow_implicit_invocation`、工具依赖等。

来源：<https://developers.openai.com/codex/skills>

本机环境：`codex-cli 0.133.0`，本机 Codex skill 样例中 `SKILL.md` frontmatter 只使用 `name` / `description`，扩展配置均在 `agents/openai.yaml` 中声明。

### 2.3 Claude Code Skills

Claude Code Skills 基于 Agent Skills 标准扩展了更强的 runtime frontmatter。应在 Claude 侧直接使用这些字段，而不是把它们写成正文说明：

| 字段 | 设计用途 |
|---|---|
| `name` | skill 标识 |
| `description` | AI 选择 skill 的主触发描述 |
| `when_to_use` | 更明确的触发边界 |
| `argument-hint` / `arguments` | 用户调用参数提示与参数替换 |
| `disable-model-invocation` | 禁止模型自动调用该 skill |
| `user-invocable` | 控制用户菜单可见性 |
| `allowed-tools` | skill 激活后的工具预批准，不是工具限制 |
| `model` | skill 激活后覆盖当前 turn 的模型 |
| `effort` | skill 激活后覆盖当前 turn 的推理强度 |
| `context: fork` | 在 forked context 中运行 |
| `agent` | 与 `context: fork` 配合指定 subagent |
| `hooks` | 生命周期 hook |
| `paths` | 基于路径/glob 的自动触发限制 |
| `shell` | 控制 `!` shell 注入环境 |

来源：<https://code.claude.com/docs/en/skills>

本机核验：

- `claude --version`：`2.1.148 (Claude Code)`
- 本次尝试调用 `claude-code-guide` 的命令退出码为 `1`，错误为 `Not logged in · Please run /login`
- 本机历史 transcript `/Users/poco/.claude/projects/-Users-poco-Projects-kata/8721c7c2-f2bd-4c0b-8792-aa788e574812/subagents/agent-aaa6c78b3ffe92de9.jsonl` 已由 `claude-code-guide` 基于官方 Claude Code skills 文档校对过上述字段

### 2.4 GitHub Copilot Skills

GitHub Copilot 支持 repo/personal skill 目录，包括 `.github/skills`、`.claude/skills`、`.agents/skills`。这说明多 runtime 共存和 repo-scoped skills 已是主流方向。Copilot 的 `SKILL.md` 同样采用 YAML frontmatter，基础字段为 `name`、`description`、可选 `license`，也支持 `allowed-tools` 作为免确认工具列表。

来源：<https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills>

### 2.5 Workflow Orchestration

OpenAI Agents SDK 把编排分为两类：LLM 决策编排与代码编排。官方文档明确指出代码编排在速度、成本、性能上更确定，适合结构化流程、循环评估、并行子任务和可检查的中间结果。

来源：<https://openai.github.io/openai-agents-python/multi_agent/>

LangGraph 的核心模型是 `State + Nodes + Edges`：共享状态保存当前快照，节点执行工作并返回 state update，边决定下一步。这与本项目需要的 `Blackboard + Workflow Graph + Router` 直接对应。

来源：<https://docs.langchain.com/oss/python/langgraph/graph-api>

## 3. 设计目标

### 3.1 方案选择：为什么不增强 projection renderer

在决定废弃 `.ai/core` 之前，评估过另一条路径：**增强 projection renderer，让它支持 per-runtime frontmatter 差异**（Claude 侧输出 `model`/`effort`/`paths` 等字段，Codex 侧输出 `agents/openai.yaml`）。该路径被排除的原因：

1. **根本张力不在 renderer**：装饰字段问题只是表象，深层问题是 `.ai/core` 的"统一契约"定位迫使两个 runtime 用同一套抽象表达，这在 runtime 能力差异扩大时越来越勉强。即使 renderer 支持差异化输出，源契约仍然需要同时描述两套语义，复杂度转移到 skill.yaml。
2. **projection 链条的维护成本**：当前 `.ai/core` 289 个文件、projection-inventory 134 条映射、engine 59 个源文件 + 43 个测试文件全部服务于"从 YAML 生成 Markdown"这条链路。随着 runtime 能力分化，这条链路的复杂度只会增长。
3. **手写 SKILL.md 的边际成本可控**：10 个 skill × 2 runtime = 20 个 SKILL.md。关键差异集中在 frontmatter（10-20 行）和 runtime-specific references（2-3 个文件/skill），正文 hard_rules 和核心 reference 大部分可共享。sync-check 机器兜底结构对齐。

因此选择"双 runtime 手写分治"而非"compiler v2"。

### 3.2 必须达成

1. `.ai/**` 整体移除，不再作为 skill、command、workflow、agent、prompt、schema、projection 的来源。
2. `.claude/**` 与 `.agents/**` 完全手写、完全分开维护。
3. Claude 与 Codex 同等优先：任一 runtime 下 skill 不可用视为整体不可用，每个保留的 skill 都同步设计两套完整实现；行为差异通过 sync-exceptions 声明，不要求行为完全一致。
4. 现有用户入口名继续可用，包括 `/workspace-manage`、`/case-draft`、`/case-edit`、`/case-hotfix`、`/playwright-automation` 等。
5. `CLAUDE.md` 与 `AGENTS.md` 不再互为 symlink，分别表达 runtime 专属规则。
6. `CLAUDE.local.md` 删除，不再作为项目规则入口。
7. 任何改动 `.claude` 或 `.agents` 的 skill、router、workflow、blackboard、脚本、reference、产物规范，都必须同步评估另一套实现。
8. 同步规则不能只靠文字提醒，必须有机器检查。

### 3.3 不追求

1. 不再重建 `.ai/core` 的 compiler v2。
2. 不追求 Claude 与 Codex 文件内容逐字一致。
3. 不把所有 workflow 都塞回 `SKILL.md`。
4. 不以 frontmatter 字段模拟另一 runtime 不支持的能力。
5. Blackboard 不追求运行时强制校验（Phase 1-5 内），先作为文档化共享状态模型使用；未来如需运行时校验再迁入 engine。

## 4. 总体架构

```text
CLAUDE.md
AGENTS.md

.claude/
  skills/
    case-draft/
      SKILL.md
      references/
      scripts/
    ...
  agents/
  hooks/
  settings.local.json

.agents/
  skills/
    case-draft/
      SKILL.md
      agents/openai.yaml
      references/
      scripts/
    ...

docs/skills/
  contracts/
    runtime-skill-sync.md
    output-artifacts.md
    verification-scope.md
    workflows/
      case-draft.yaml
      case-edit.yaml
      case-hotfix.yaml
      playwright-automation.yaml
    schemas/
  workflows/
    case-draft.md
    case-edit.md
    case-hotfix.md
    playwright-automation.md
  blackboard/
    state-model.md
    evidence-model.md
    artifact-model.md

engine/
  src/skills/
    frontmatter-policy.ts
    runtime-sync.ts
  tests/skills/
    sync-check.test.ts
    frontmatter-check.test.ts
    route-check.test.ts  # Phase 2
```

Runtime 目录是执行面。`docs/skills/**` 是非 runtime 的治理和设计文档，其中 `docs/skills/contracts/workflows/*.yaml` 是 workflow 唯一规范来源，`docs/skills/workflows/*.md` 是由 YAML 生成或校验的 review 文档。`engine/src/skills/**` 是检查逻辑实现，`engine/tests/skills/**` 是机器检查测试（复用项目已有的 Bun test runner 和 CI 入口），均不生成 runtime 文件。

## 5. Runtime 目录职责

### 5.1 `.claude/**`

Claude Code 侧使用 Claude 原生能力表达运行时语义：

- `SKILL.md` frontmatter 使用 Claude 支持字段。
- 需要隔离上下文的流程使用 `context: fork` 和 `agent`。
- 高风险或重推理流程使用 `model`、`effort`。
- 文件路径触发场景使用 `paths`。
- 不适合模型自动触发的内部 skill 使用 `disable-model-invocation`。
- 自动化前后置动作使用 `hooks`，但 hook 必须短小、可解释、可单独验证。
- `allowed-tools` 只表达预批准，不写成“工具限制”。

Claude 侧的 `SKILL.md` 可以比 Codex 侧更强约束，但最终用户语义和交付物必须与 Codex 对齐。

### 5.2 `.agents/**`

Codex 侧遵循 Codex 官方支持面：

- `SKILL.md` frontmatter 只依赖 `name` 与 `description` 做稳定触发。
- `description` 必须前置触发词和排除边界，避免技能列表压缩后丢失核心语义。
- UI、默认 prompt、隐式调用策略、工具依赖放入 `agents/openai.yaml`。
- 若某 skill 不应隐式触发，使用 `policy.allow_implicit_invocation: false`。
- 复杂流程用 `references/` 和 `scripts/` 拆分，避免单个 `SKILL.md` 膨胀。

Codex 侧不能把 Claude 独有字段写进 `SKILL.md` frontmatter。

## 6. 入口规则

### 6.1 `CLAUDE.md`

`CLAUDE.md` 是 Claude Code 的公开入口，必须包含：

1. Claude Code 专属 skill 使用规则。
2. `.claude/**` 是手写 runtime 实现，不是 `.ai` 投影。
3. 修改 `.claude/**` 必须同步评估 `.agents/**`。
4. 修改 `.agents/**` 也必须同步评估 `.claude/**`。
5. 若只改单边，提交说明必须写明另一侧无需变更的具体理由。
6. 不再引用 `CLAUDE.local.md`。

### 6.2 `AGENTS.md`

`AGENTS.md` 是 Codex 的公开入口，必须包含：

1. Codex skill 触发和 `agents/openai.yaml` 规则。
2. `.agents/**` 是手写 runtime 实现，不是 `.ai` 投影。
3. 修改 `.agents/**` 必须同步评估 `.claude/**`。
4. 修改 `.claude/**` 也必须同步评估 `.agents/**`。
5. 若只改单边，提交说明必须写明另一侧无需变更的具体理由。
6. 不再引用 `.ai/core/**`、projection render、projection lock。

## 7. Skill 同步契约

`engine/tests/skills/sync-check.test.ts` 负责检查双 runtime 同步。**sync-check 只提供结构保证，不保证语义对齐**：两个 runtime 的 SKILL.md 即使通过所有结构检查，仍可能因模型行为差异、上下文窗口位置不同、runtime 能力差异而产生不同执行结果。语义对齐依赖 route-check 的 prompt 样例测试（§8 第三层），但 route-check 只覆盖路由触发，不覆盖完整执行流程。

第一版检查规则（Phase 1，仅结构检查）：

| 检查项 | 规则 |
|---|---|
| skill 集合 | `.claude/skills/*/SKILL.md` 与 `.agents/skills/*/SKILL.md` 的目录名集合必须一致 |
| SKILL.md | 每个 skill 目录必须包含 `SKILL.md` |
| frontmatter name | `SKILL.md` 的 `name` 必须存在，且必须等于目录名 |
| frontmatter description | `SKILL.md` 的 `description` 必须存在且非空 |
| frontmatter 字段 | Claude 与 Codex 只能使用 Phase 1 白名单字段：`name`、`description`、`allowed-tools` |
| sync exceptions | `docs/skills/contracts/runtime-sync-exceptions.yaml` 必须存在且符合 schema |

后续检查规则（Phase 2+，不属于 Phase 1 sync-check）：

| 检查项 | 规则 |
|---|---|
| 入口语义 | 用户可见 slash command 名和用户意图语义必须一致 |
| Codex openai.yaml | Codex skill 如配置隐式调用策略，必须在 `agents/openai.yaml` 中声明 |
| description | 两侧 `description` 必须包含同一核心触发词组 |
| 产物规范 | 两侧必须引用或内联同一份 `docs/skills/contracts/output-artifacts.md` 条款 |
| 验证口径 | 两侧必须引用或内联同一份 `docs/skills/contracts/verification-scope.md` 条款 |
| references | runtime-agnostic reference 放 `docs/skills/references/`，两侧 skill 通过路径引用；runtime-specific reference 必须成对存在于各自 runtime 目录 |
| scripts | 同名确定性脚本必须成对存在，或在 sync manifest 中说明单边原因 |

单边差异通过 `docs/skills/contracts/runtime-sync-exceptions.yaml` 声明。每条例外必须包含：

```yaml
- skill: case-draft
  side: claude
  file: .claude/skills/case-draft/hooks/preflight.sh
  reason: Claude Code hooks are runtime-specific; Codex has no equivalent hook field.
  reviewer: required-before-merge
```

例外不能用于跳过用户语义、产物规范或验证口径。

## 8. Router 模式

Router 分三层：

1. Runtime native router
   - Claude：`SKILL.md` 的 `name` / `description`；slash-command 专属 frontmatter 只能在后续 `.claude/commands/**` 设计中单独使用，不进入 SKILL.md 白名单
   - Codex：frontmatter `description`、显式 `$skill`、`agents/openai.yaml` 的 `policy.allow_implicit_invocation`
2. Entry routing docs
   - `CLAUDE.md` 和 `AGENTS.md` 保留用户入口表，但不再从 `.ai/core/commands` 生成
3. Sync/eval router tests
   - `engine/tests/skills/route-check.test.ts` 用固定 prompt 样例检查应触发、不得触发、需澄清三类场景

Router 测试样例放在 `docs/skills/contracts/routes/*.yaml`。示例：

```yaml
skill: case-hotfix
should_trigger:
  - "bug 12345 已修复，帮我生成 hotfix 回归用例"
should_not_trigger:
  - "我发现一个新 bug，帮我写缺陷报告"
clarify:
  - "这个问题修好了，补一下用例"
```

## 9. Workflow Graph 模式

复杂 skill 不再用长 prompt 表达隐式流程。每个复杂 workflow 以 `docs/skills/contracts/workflows/<name>.yaml` 为**唯一规范来源**，保留 step、gates、blackboard slots、subagent constraints 等机器可读字段。`docs/skills/workflows/<name>.md` 只是面向人工 review 的说明文档，必须由 YAML 生成或由检查器验证与 YAML 一致，不允许手写成第二份规范源；检查器至少校验 step 顺序、失败模式、人工确认点与 YAML 一致。

```text
intake -> normalize -> plan -> execute -> verify -> deliver
                 \-> clarify -> normalize
```

每个节点必须说明：

- 输入状态槽
- 输出状态槽
- 可调用 reference/script
- 失败条件
- 人工确认点
- 验证证据

Claude 与 Codex 的 `SKILL.md` 只写主流程入口和必须遵守的边界，细节链接到 workflow YAML 结构化定义。sync-check 对比两侧 SKILL.md 是否引用同一份 workflow YAML 结构化定义。

## 10. Blackboard 模式

Blackboard（跨节点共享状态，LangGraph 称 State，OpenAI Agents SDK 称 context）不再散落在自然语言里，而是作为显式状态模型文档化。第一版状态槽：

| 状态槽 | 含义 |
|---|---|
| `sources` | PRD、Lanhu、Axure、ZenTao、Git diff、用户输入等来源 |
| `source_refs` | 可追溯 SourceRef，包含类型、位置、时间、有效性 |
| `decisions` | AI 做出的关键判断，必须区分事实、推断、假设 |
| `open_questions` | 阻塞项和澄清项 |
| `artifacts` | 生成或修改的产物路径 |
| `coverage` | 用例覆盖矩阵、风险覆盖、未覆盖原因 |
| `verification` | 执行过的命令、退出码、通过/失败/跳过数量、证据路径 |
| `handoff` | 给后续 skill 或人工的交接信息 |

Blackboard schema 不放在 `.ai`。第一版可放入 `docs/skills/blackboard/state-model.md` 和 `docs/skills/contracts/schemas/*.json`，后续如 engine 需要运行时校验，再迁移到 `engine/src/skills/schemas`。

## 11. Graph 模式

维护一个非生成用途的能力图：`docs/skills/contracts/skill-graph.yaml`。

```yaml
skills:
  case-draft:
    user_entry: /case-draft
    related:
      - case-edit
      - playwright-automation
    consumes:
      - prd-source
      - lanhu-snapshot
    produces:
      - archive-md
      - xmind-md
      - source-refs
  case-edit:
    user_entry: /case-edit
    consumes:
      - archive-md
      - xmind-md
    produces:
      - archive-md
      - xmind-md
```

该图只服务检查、文档和 review，不生成 `.claude` 或 `.agents`。

## 12. 迁移计划

### Phase 0：设计和冻结

- 写入本 spec。
- 冻结 `.ai/core/skills` 新增需求。
- 后续变更不得再新增 projection 依赖。

### Phase 1：同步契约和结构检查

- 新增 `docs/skills/contracts/runtime-skill-sync.md`。
- 新增 `docs/skills/contracts/output-artifacts.md` 与 `docs/skills/contracts/verification-scope.md` 的第一版稳定基线。
- 新增 `engine/src/skills/**`、`engine/tests/skills/**` 与 `kata skills sync-check`。
- 新增 `bun run check:skills`，但不接入 `bun run check` 或 CI。

### Phase 2：runtime 入口和 skill 去投影化

实施分为 2A（本阶段）和 2B（后续）：

**Phase 2A — runtime detach**：

- 断开 `CLAUDE.md -> AGENTS.md` symlink。
- 重写 `CLAUDE.md` 和 `AGENTS.md`，明确 Claude 与 Codex 同等优先、任一侧改动必须同步评估另一侧。
- 删除 `CLAUDE.local.md`。
- 移除 `.claude/skills/**` 与 `.agents/skills/**` 中的 `generated by kata ai-core` 和 `ai-core-hash`。
- 清理 `.ai/core` 引用。
- 保留现有 skill 名和用户入口语义。

**Phase 2B — runtime native config**（不在 Phase 2A 范围）：

- Claude 侧补齐 Claude frontmatter（`model`、`effort`、`paths` 等，需基于官方文档逐字段确认）。
- Codex 侧补齐 `agents/openai.yaml`（需基于官方文档确认 schema）。
- runtime 去投影化稳定后，再决定是否把 `check:skills` 接入总检查或 CI。

### Phase 3：Workflow 和 Blackboard 下沉

- 为 `case-draft`、`case-edit`、`case-hotfix`、`playwright-automation` 先建立 workflow YAML 结构化定义，并生成或校验对应 review 文档。
- 建立 blackboard 状态模型。
- 将长篇规范从 `SKILL.md` 移到 `references/` 或 `docs/skills/**`。

### Phase 4a：`.ai/**` 停用

- 把仍有价值的 schema 从 `.ai/core/schemas` 迁到 `docs/skills/contracts/schemas` 或 `engine/src/skills/schemas`。
- 把仍有价值的 rules 迁到 `CLAUDE.md`、`AGENTS.md` 或 `docs/skills/contracts`。
- 禁用 `kata ai-core` CLI（改名或加 deprecated 警告），停止 projection render/check/lock。
- 更新 README、README-EN、架构文档，将 `.ai/core` 标记为"已废弃，保留待删除"。

### Phase 4b：`.ai/**` 物理删除（至少间隔一个 PR 周期）

- 删除 `.ai/**` 目录。
- 删除 projection render/check/lock 和相关 engine 代码。
- 删除 projection 相关测试。
- 更新 CI 流程移除 ai-core 检查。

### Phase 5：回归和收尾

- 运行 `bun run check`。
- 运行受影响测试，至少覆盖 paths、CLI、schema、skill sync。
- 人工核查每个 skill 的 Claude/Codex 对齐状态。
- 确认没有 `.ai/`、`ai-core`、projection 作为现行架构的引用。

## 13. 验证策略

每个重构 PR 必须报告：

- exact command
- exit code
- passed/failed/skipped counts
- artifact paths
- 未验证范围

这条规则写入 `CLAUDE.md` 和 `AGENTS.md`，并继承当前项目 `AGENTS.md` 顶部的反馈约束。

建议验证命令分层：

```text
bun run check:skills        # Phase 1 skill 同步和 frontmatter 结构检查
bun run check               # 当前仍为 biome；Phase 2+ 稳定后再评估是否纳入 skill 检查
bun test engine/tests/...   # 受影响 engine 测试
bun test                    # 全量测试，最终阶段必须跑
```

如果 `bun test` 因环境依赖无法全量通过，必须列出失败命令、退出码、失败数量和未验证范围，不能把局部通过说成全量通过。

## 14. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 双 runtime 手写后漂移 | 高 | `sync-check`（结构）、route 样例（路由）、runtime-sync-exceptions 审核；sync-check 不保证语义对齐，见 §7 |
| 删除 `.ai` 后 schema 引用断裂 | 高 | Phase 4a 停用期先迁移 schema 并验证，所有引用用 `rg` 清点；至少一个 PR 周期后再物理删除 |
| Phase 4b 物理删除后无法快速回滚 | 高 | Phase 4a 与 4b 间隔至少一个 PR 周期；4a 阶段保持 `.ai/**` 只读，确保新架构稳定；紧急情况通过 git revert 恢复 |
| Claude 使用了 Codex 不支持的字段 | 中 | `frontmatter-check` 分 runtime 校验 |
| Codex description 被压缩后误触发 | 中 | description 前置触发词，route-check 覆盖触发和排除样例 |
| 旧 projection CLI 测试大面积失败 | 高 | 分阶段删除或重命名 `ai-core` 测试，避免半迁移状态 |
| `CLAUDE.md` / `AGENTS.md` 分裂后规则不一致 | 中 | 两份入口都内置同步硬规则，sync-check 检查关键条款 |
| `CLAUDE.local.md` 删除影响本地习惯 | 低 | 本地配置迁到 `.claude/settings.local.json` 或用户级配置 |

## 15. 成功标准

1. 仓库不再包含 `.ai/**`（Phase 4b 完成后）。
2. `CLAUDE.md` 是普通文件，不再 symlink `AGENTS.md`。
3. `CLAUDE.local.md` 不存在。
4. `.claude/skills/*` 与 `.agents/skills/*` skill 名集合一致。
5. 每个保留 skill 都有 Claude 与 Codex 两套完整实现。
6. Claude skill 使用 Claude 原生 frontmatter，不再只输出 `name` / `description`。
7. Codex skill 遵守 Codex frontmatter 支持面，并用 `agents/openai.yaml` 承载 Codex 扩展 metadata。
8. `sync-check` 能发现单边新增、单边删除、frontmatter 错用；Phase 2+ 的 route/semantic 检查能发现核心触发词不一致。
9. README、README-EN、CI 文档不再把 `.ai/core` 描述为当前架构。
10. 最终验收报告不扩大测试范围表述，明确已验证和未验证内容。

## 16. 决策记录

- 采用”双 runtime 手写独立维护”，不采用 `.ai/core` compiler v2（理由见 §3.1）。
- 保留现有用户入口名和 skill 名。
- Claude 与 Codex 同等优先：任一侧 skill 不可用视为整体不可用，不要求行为完全一致。
- `.ai/**` 分两步移除：Phase 4a 停用并迁移 → Phase 4b 物理删除（至少间隔一个 PR 周期）。
- `CLAUDE.md` 和 `AGENTS.md` 分别维护 runtime 专属规则。
- 修改任一 runtime 必须同步评估另一 runtime，sync-check 提供结构兜底，语义对齐依赖 route-check 和人工 review。
