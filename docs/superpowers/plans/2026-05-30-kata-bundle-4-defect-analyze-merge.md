# Bundle 4 · defect-analyze 合并 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `bug-file` + `conflict-analyze` + `diff-scan` 三个 skill 合并为单一 `defect-analyze`（bug / conflict / diff 三模式），将 kata skill 数从 10 收口到目标 8，且 `.claude` 与 `.agents` 两 runtime、入口文档、测试与代码引用全部同步。

**Architecture:** 纯结构/提示词合并，**不迁移任何可执行代码**——三个源 skill 都是单文件 `SKILL.md` 的纯提示词 skill，不调用 engine 命令。新建一个 thin `defect-analyze` bundle（`SKILL.md` + Codex 占位 `SKILL.md` + `agents/openai.yaml`），与 `case-hotfix`/`infra-diagnose` 等非试点 skill 的「`SKILL.md`(+`references/`)」约定一致；**不引入 spec §8 草案里的 `phases/` 结构**（那是后续「非试点 skill 全量 phases 化」才统一做的事）。合并分两个「每步皆绿」的提交：先**加法**（建 defect-analyze + 注册命令索引，与旧 3 skill 共存，gate 仍绿），再**减法**（删旧 6 目录 + 清理全部引用，gate 仍绿）。

**Tech Stack:** Bun ≥ 1.3、TypeScript、`kata skills sync-check`（= `checkRuntimeSkillSync` + `checkRuntimeDetach` + `lintSkillStructure`）、Biome、gray-matter。

---

## Plan 3 已落地（前置状态）

Bundle 3（case-draft / playwright 可执行代码迁移）已执行并合并 main（`1172781f4 merge: 🔀 整合 bundle 3 skill 代码迁移与 lanhu 插件路径收尾`），worktree 已清理。本计划是路线图中的下一个增量，且按用户决策**只做 defect-analyze 合并**这一个子系统，不含 case-edit 代码迁移、不含共享渲染定位。

### 来自上一阶段的遗留事项（执行前先确认，本计划不处理）

1. **`.agents/README.md:7` 前瞻描述与实际约定不符**：其中写 Phase-2 将通过 symlink 共享 `phases/`、`reviewers/`、`workers/`，与实际 `prompts/agent-<step>.md` 约定不一致。属 Codex / Phase-2 设计范畴，**本计划不改**（Phase-1 同步义务对 Codex 侧降级为「确认 `.agents/README.md` 仍准确描述占位状态」——本计划只新增 `.agents/skills/defect-analyze/` 占位，README 的占位语义仍准确，无需改 README）。
2. **主树 pre-existing 脏 submodule `plugins/lanhu/mcp-bridge/lanhu-mcp`**（内部文件被删未提交）与历史遗留的 `docs/superpowers/plans/.process/**`、旧 plan 文件删除（见 `git status`），均与本计划无关。**硬约束：全程只用路径限定的 `git add <path>`，禁止 `git add -A` / `git add .`，避免把脏 submodule 或无关删除卷进本计划的 commit。**

---

## Scope

### IN（本计划交付）

- 新建 `.claude/skills/defect-analyze/SKILL.md`（thin，≤100 行，三模式分诊）。
- 新建 `.agents/skills/defect-analyze/SKILL.md`（Codex Phase-1 占位）+ `.agents/skills/defect-analyze/agents/openai.yaml`。
- 删除 6 个旧目录：`.claude/skills/{bug-file,conflict-analyze,diff-scan}` 与 `.agents/skills/{bug-file,conflict-analyze,diff-scan}`。
- 入口/路由文档同步：`CLAUDE.md`、`AGENTS.md`、`.claude/rules/routing-guard.md`、`README.md`、`README-EN.md`。
- 测试与代码引用同步：`engine/tests/lint/skill-frontmatter.test.ts`（`KNOWN_SKILLS`）、`apps/core/catalog/skills.test.ts`（roster 断言）、`engine/src/scan-report.ts`（契约注释）、`engine/tests/scan-report/e2e.test.ts`（describe 文案）。

### OUT（明确不做，留后续 Plan）

- **不迁移可执行代码**：`engine/src/scan-report.ts`（diff 模式背后的 `kata scan-report` 命令）等仍留在 engine，仅更新其指向已删 skill 路径的注释。代码迁移属 Plan 5「engine 收口」。
- **不建 `phases/` / `references/` / `rules/` / `fewshots/`**：spec §8 草案的 phases 化结构不在本计划；保持与其余 7 个非试点 skill 的 thin 约定一致，避免只给一个 skill 单独提前 phases 化造成不一致。
- **不删 `apps/core/catalog/`**：spec §6.1 曾标记删除，但它在 Bundle 1 后仍存活；本计划只更新其测试断言以适配新 roster，删除留给后续清理。
- **不动 case-edit / 共享渲染 / 其余 skill**。
- **不处理上面两条遗留事项**。

---

## 关键设计决策（请用户复核）

- **D1 · Thin 合并，不上 phases。** 三源 skill 均为单文件 `SKILL.md`；非试点 skill 现行约定是 `SKILL.md`(+`references/`)。`defect-analyze` 采同约定：单 `SKILL.md` 内联三模式分诊。spec §8 的 `phases/§1-4` + `references/` + `rules/` + `fewshots/` 是「全量 phases 化」阶段的目标，本计划**不提前**，否则与 `case-hotfix`/`knowledge-curate` 等同级 skill 割裂。

- **D2 · Frontmatter 收敛 + diff 模式 fork 下沉到正文（行为等价关键项）。** 三源 frontmatter 不同：`bug-file`(model sonnet/effort medium，无 paths)、`conflict-analyze`(+paths `diff`/`patch`/`**/*`)、`diff-scan`(effort **high** + `context: fork` + `agent: general-purpose` + 代码 glob)。单 skill 只能有一份 frontmatter：取 `model: sonnet` / `effort: medium` / `paths` = 代码与 diff/patch glob 的并集（**去掉 `conflict-analyze` 的 catch-all `**/*`**，否则等于全匹配、失去路由意义）。**不在 skill 级写 `context: fork`/`agent`**（那会强制 bug/conflict 模式也 fork、改变其行为）；改为在正文「模式分诊」里写明「diff 模式 → fork 一个 general-purpose 子代理执行扫描」，把 `diff-scan` 原本的子代理隔离语义忠实下沉到 diff 模式。**这是本计划唯一的行为等价风险点，对应 spec §12 风险 #4，验证时人工核对三模式行为。**

- **D3 · 零代码迁移。** 三源 skill 不 import / 不 shell-call 任何 engine 模块（已核：`SKILL.md` 内无脚本引用）。`scan-report.ts` 是 diff 模式可复用的 `kata scan-report` 命令，**留在 engine**；只把它指向 `.../skills/diff-scan/SKILL.md` 的契约注释改指 `defect-analyze`（准确性，非 gate 阻塞——`check-stale-paths.ts` 只禁 `docs/refactor/` 引用，不扫 skill 路径）。

- **D4 · Codex 侧合并是硬性要求，不是可选。** `check:skills` 对**真实仓库**运行 `checkRuntimeSkillSync`，强制 `.claude/skills` 与 `.agents/skills` **双向 roster 对齐**（claude 有而 codex 无 → `RUNTIME_SKILL_MISSING`，反之亦然），且每个 Codex skill 必须有 `agents/openai.yaml` 且 `policy.allow_implicit_invocation` 为 boolean。故 Claude 合并 3→1 必须同步 Codex 合并 3→1。Codex frontmatter 仅允许 `name`/`description`/`allowed-tools`/`when_to_use`/`disable-model-invocation`（`model`/`effort`/`paths`/`context`/`agent` 不进 Codex frontmatter）；占位沿用现有 `name`+`description` 形态。

- **D5 · 两提交，每步皆绿。** gate 不强制 skill 数量、不禁止「多」一个 skill。故：**Task 2（加法）** 建 defect-analyze 三文件 + 在 `CLAUDE.md`/`AGENTS.md` 命令索引**新增** defect-analyze 行（旧 3 行保留）→ defect-analyze 与旧 3 skill 共存，`checkRuntimeSkillSync` roster 双侧都含 defect-analyze、`lintSkillStructure` 的 `SK-NAME-INDEX` 对 defect-analyze 满足 → gate 绿。**Task 3（减法）** 删旧 6 目录 + 移除旧 3 命令索引行 + 清理路由/README/测试/注释 → 只剩 defect-analyze → gate 绿。执行期间两 commit 之间存在「bug 证据可能同时命中 bug-file 与 defect-analyze」的瞬时路由歧义，属计划内过渡态，Task 3 即消除；无自动化路由测试依赖这一点。

- **D6 · 入口文档不破坏 runtime-detach 必含短语。** 编辑 `CLAUDE.md`/`AGENTS.md` 只改命令索引行与一条「回退到 bug-file」路由句；`checkRuntimeDetach` 的 `ENTRY_REQUIRED_PHRASES`（worktree / sync 规则等）均不在改动范围内，不会被破坏。

---

## 受影响文件清单

**新建（Task 2）**
- `.claude/skills/defect-analyze/SKILL.md`
- `.agents/skills/defect-analyze/SKILL.md`
- `.agents/skills/defect-analyze/agents/openai.yaml`

**修改 · 命令索引新增（Task 2）**
- `CLAUDE.md`（命令索引表加 1 行）
- `AGENTS.md`(命令索引表加 1 行)

**删除（Task 3）**
- `.claude/skills/bug-file/`、`.claude/skills/conflict-analyze/`、`.claude/skills/diff-scan/`
- `.agents/skills/bug-file/`、`.agents/skills/conflict-analyze/`、`.agents/skills/diff-scan/`

**修改 · 引用清理（Task 3）**
- `CLAUDE.md`（删 3 行命令索引 + 1 行路由句改名）
- `AGENTS.md`（删 3 行命令索引 + 1 行路由句改名）
- `.claude/rules/routing-guard.md`（1 行路由句改名）
- `README.md`、`README-EN.md`（ASCII 流程图 + 命令表 + 编号列表，3→1）
- `engine/tests/lint/skill-frontmatter.test.ts`（`KNOWN_SKILLS`：`bug-file` → `defect-analyze`）
- `apps/core/catalog/skills.test.ts`（`toContain("bug-file")` → `toContain("defect-analyze")`）
- `engine/src/scan-report.ts`（契约注释 3 处指向 defect-analyze）
- `engine/tests/scan-report/e2e.test.ts`（describe 文案）

---

## Prerequisites: Worktree

按项目 worktree-first 流程，在 Task 1 内创建 detached worktree，所有实现/验证/commit 在其中完成。

---

## 验证约定

- 每个改动 Task 落盘后立即在 worktree 内跑下列**最小相关 gate**，必须全绿再 commit：
  ```bash
  bun run check:skills        # 关键：roster 对齐 + 结构 lint + detach
  bun test --cwd engine 2>&1 | tail -6
  bun run check               # biome
  ```
- Task 3 额外跑受影响的 apps 测试：`bun run test:apps 2>&1 | tail -3`。
- 最终 Task 4 跑全量 gate（含 `lint:debris` / `lint:paths` / `test:plugins`）。
- 任何 fail（含 pre-existing）必须在 worktree 内排查根因并修复；不得 skip / 注释 / 标 TODO（项目 testing 规则）。汇报写 exact command + exit code + pass/fail/skip。

---

## Task 1: 基线确认 + worktree

**Files:** 无代码改动。

- [ ] **Step 1: 主工作树基线 gate（确认起点全绿）**

Run（在 `/Users/poco/Projects/kata`）：
```bash
bun run check:skills; echo "check:skills exit=$?"
bun test --cwd engine 2>&1 | tail -6
```
Expected: `check:skills exit=0`；engine 测试全 pass。若已红，先记录、判断是否 pre-existing 再决定是否本计划处理。

- [ ] **Step 2: 确认脏 submodule 不在改动范围**

Run: `git status --short plugins/`
Expected: 仅 `plugins/lanhu/mcp-bridge/lanhu-mcp` 这类 pre-existing 脏项；**全程不 touch、不 `git add` 它**。

- [ ] **Step 3: 如主工作树有未提交改动，先做 pre-worktree 快照**

Run: `git status --short`。若存在与本计划无关的 tracked/untracked 改动且影响 worktree 创建，按项目规则用路径限定提交快照；脏 submodule 与历史 `.process/` 删除**不纳入**快照（保持原状）。

- [ ] **Step 4: 创建 detached worktree 并 symlink 只读 runtime**

```bash
ROOT=$(pwd)
W="$ROOT/.worktrees/bundle-4-defect-analyze"
git worktree add --detach "$W" main
git worktree list
```
（本计划是纯文档/提示词/测试改动，不需要 `.kata` 源码证据；如执行 `test:apps` 需要 repo 根识别，worktree 自带 `engine/` + `package.json` 已足够，无需 symlink `.kata`。）
Expected: 列表含 `bundle-4-defect-analyze`。后续所有步骤在 `$W` 内执行。

---

## Task 2: 新建 defect-analyze bundle 并注册命令索引（加法 · gate 绿）

**Files:**
- Create: `.claude/skills/defect-analyze/SKILL.md`
- Create: `.agents/skills/defect-analyze/SKILL.md`
- Create: `.agents/skills/defect-analyze/agents/openai.yaml`
- Modify: `CLAUDE.md`（命令索引表新增 1 行）
- Modify: `AGENTS.md`（命令索引表新增 1 行）

- [ ] **Step 1: 写 Claude 侧 `.claude/skills/defect-analyze/SKILL.md`**

完整内容（64 行，≤100；headers 均不触发 `checkRuntimeSkillSync` 的 decorative-contract 模式）：

```markdown
---
name: defect-analyze
description: 用户提供 bug 证据、合并冲突标记或代码 diff 并要求分析缺陷或给出解决方案。
when_to_use: 用户提供可复现 bug 证据、合并冲突标记或代码 diff，要求结构化缺陷分析、冲突解决方案或 diff 缺陷扫描时使用。
user-invocable: true
model: sonnet
effort: medium
paths:
  - "**/*.diff"
  - "**/*.patch"
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---

# defect-analyze


证据事实必须引用 SourceRef ID。

## 路由摘要

- 三模式缺陷分诊：bug 证据 / 合并冲突 / diff 扫描——凡无证据者，一律不入文。

## 模式分诊

- `bug`：用户给出异常堆栈、控制台错误、HTTP 失败或其他可复现 bug 证据 → 产 `defect-report.md`。
- `conflict`：用户给出带合并冲突标记的文本 → 产 `conflict-resolution-plan.md`。
- `diff`：用户给出仓库 diff / 分支对 / 变更文件集要求静态扫描 → fork 一个 general-purpose 子代理执行扫描，产 `defect-report.md`。

## 触发条件

- 用户给出可复现的失败证据（异常堆栈、控制台错误、HTTP 失败）并要求结构化 bug 报告。
- 用户给出带合并冲突标记的文本并要求剖析冲突成因或给出可靠解决路径。
- 用户要求对代码 diff、分支对或变更文件做静态扫描以查找可复现缺陷。

## 不触发条件

- 用户只给出 ZenTao bug URL、bug-view URL、bug ID 或其他已登记 issue 记录；优先路由到 case-hotfix。
- 用户要求依据 PRD 需求生成新的 QA 用例（case-draft）。
- 用户要求一般性代码讲解，且未指明 diff 目标。

## 按需加载协议

- 默认只读取当前 SKILL.md。
- 禁止批量读取 references/**。
- 只有当前阶段命中表格中的阶段与条件时，才读取对应文件。
- 没有命中的 reference 不得读取；few-shot 只可作为格式参考，不得作为领域事实证据。

无外部参考；仅使用当前 SKILL.md 与任务证据。

## 硬规则

- bug 模式：实际行为、预期行为、复现步骤、影响范围——四者须分项陈述，不得合并。
- conflict 模式：给出解决方案之前，先陈述冲突双方各自的意图与依据（side_a / side_b）。
- diff 模式：仅报告能依据所给 diff 与周边代码复现的 bug。
- 缺乏证据时，不得凭空虚构日志、负责人、模块或根因。
- workspace/{project}/.kata/repos/** 为只读源仓库；如需修改，必须先获得用户明确确认，并在源仓库工作区内操作。

## 产物

- bug / diff 模式 → `defect-report.md`（根因 + evidence_refs + impacted_areas）。
- conflict 模式 → `conflict-resolution-plan.md`（含 side_a / side_b 与 resolution_plan）。
```

- [ ] **Step 2: 写 Codex 侧 `.agents/skills/defect-analyze/SKILL.md`（Phase-1 占位）**

完整内容（frontmatter 仅 `name`+`description`，符合 Codex 字段策略；正文为占位级三模式摘要，无 decorative header）：

```markdown
---
name: defect-analyze
description: 用户提供 bug 证据、合并冲突标记或代码 diff 并要求分析缺陷或给出解决方案。
---

# defect-analyze


证据事实必须引用 SourceRef ID。

## 路由摘要

- 三模式缺陷分诊：bug 证据 / 合并冲突 / diff 扫描——凡无证据者，一律不入文。

## 模式分诊

- `bug`：可复现 bug 证据 → 产 `defect-report.md`。
- `conflict`：合并冲突标记 → 产 `conflict-resolution-plan.md`（含 side_a / side_b）。
- `diff`：代码 diff / 分支对 / 变更文件静态扫描 → 产 `defect-report.md`。

## 硬规则

- bug 模式：实际行为、预期行为、复现步骤、影响范围——四者须分项陈述。
- conflict 模式：先陈述双方意图（side_a / side_b）再给解决方案。
- diff 模式：仅报告能依据所给 diff 复现的 bug。
- 缺乏证据时不得虚构；workspace/{project}/.kata/repos/** 为只读源仓库。
```

- [ ] **Step 3: 写 Codex 侧 `.agents/skills/defect-analyze/agents/openai.yaml`**

完整内容（与现有 Codex 占位一致；`policy.allow_implicit_invocation` 必须是 boolean，否则 `CODEX_OPENAI_CONFIG_INVALID`）：

```yaml
policy:
  allow_implicit_invocation: true
```

- [ ] **Step 4: `CLAUDE.md` 命令索引新增 defect-analyze 行**

在 `/diff-scan` 行后插入一行（markdown 表格对齐为装饰性，不强制列宽精确对齐）：

```
| /diff-scan             | diff-scan             | 扫描代码 diff 发现可复现的缺陷。                                       |
| /defect-analyze        | defect-analyze        | bug 证据、合并冲突、代码 diff 三模式缺陷分诊与解决方案。               |
```

- [ ] **Step 5: `AGENTS.md` 命令索引新增 defect-analyze 行**

在 `/diff-scan` 行后插入：

```
| /defect-analyze | defect-analyze | bug 证据、合并冲突、代码 diff 三模式缺陷分诊与解决方案。 |
```

- [ ] **Step 6: 验证 gate 绿（defect-analyze 与旧 3 skill 共存）**

Run（在 worktree 内）：
```bash
bun run check:skills; echo "check:skills exit=$?"
bun test --cwd engine 2>&1 | tail -6
bun run check 2>&1 | tail -3
```
Expected: `check:skills exit=0`。校验点：`checkRuntimeSkillSync` 双侧 roster 均含 defect-analyze（无 `RUNTIME_SKILL_MISSING`）、Codex `openai.yaml` 合法；`lintSkillStructure` 对 defect-analyze 满足 `SK-NAME-INDEX`（已在 CLAUDE.md 索引）/`SK-LEN-SKILL`（64≤100）/frontmatter 白名单；engine 测试不受影响仍全绿；biome 绿。

- [ ] **Step 7: Commit（路径限定）**

```bash
git add .claude/skills/defect-analyze/SKILL.md \
        .agents/skills/defect-analyze/SKILL.md \
        .agents/skills/defect-analyze/agents/openai.yaml \
        CLAUDE.md AGENTS.md
git commit -m "feat: 🧩 add defect-analyze skill (bug/conflict/diff modes)"
```
（禁止 `git add -A`/`.`；确认 `git show --stat HEAD` 仅含上述 5 文件。）

---

## Task 3: 删除旧 6 目录并清理全部引用（减法 · gate 绿）

**Files:** 见下各 Step。

- [ ] **Step 1: 删除 6 个旧 skill 目录（Claude 3 + Codex 3）**

```bash
git rm -r .claude/skills/bug-file .claude/skills/conflict-analyze .claude/skills/diff-scan \
          .agents/skills/bug-file .agents/skills/conflict-analyze .agents/skills/diff-scan
# 清理可能残留的未跟踪 .DS_Store 等垃圾，确保目录消失
rm -rf .claude/skills/bug-file .claude/skills/conflict-analyze .claude/skills/diff-scan \
       .agents/skills/bug-file .agents/skills/conflict-analyze .agents/skills/diff-scan
```
Expected: 6 目录均不再存在；`git status --short` 显示对应 `SKILL.md` / `openai.yaml` 为 deleted。

- [ ] **Step 2: `CLAUDE.md` — 删 3 行命令索引 + 改路由句**

删除这三行：
```
| /bug-file              | bug-file              | 根据观察到的失败现象生成有证据支持的 bug 报告。                        |
| /conflict-analyze      | conflict-analyze      | 分析合并冲突并生成解决方案说明。                                       |
| /diff-scan             | diff-scan             | 扫描代码 diff 发现可复现的缺陷。                                       |
```
路由句改名（`bug-file` → `defect-analyze`）：
```
OLD: - 仅输入 ZenTao bug URL/bug-view URL/bug ID → 转发到 `case-hotfix`；若记录未修复或缺少修复范围，由该 skill 生成待办项而非回退到 `bug-file`。
NEW: - 仅输入 ZenTao bug URL/bug-view URL/bug ID → 转发到 `case-hotfix`；若记录未修复或缺少修复范围，由该 skill 生成待办项而非回退到 `defect-analyze`。
```

- [ ] **Step 3: `AGENTS.md` — 删 3 行命令索引 + 改路由句**

删除这三行：
```
| /bug-file | bug-file | 根据观察到的失败现象生成有证据支持的 bug 报告。 |
| /conflict-analyze | conflict-analyze | 分析合并冲突并生成解决方案说明。 |
| /diff-scan | diff-scan | 扫描代码 diff 发现可复现的缺陷。 |
```
路由句改名（同 CLAUDE.md）：
```
OLD: ...由该 skill 生成待办项而非回退到 `bug-file`。
NEW: ...由该 skill 生成待办项而非回退到 `defect-analyze`。
```

- [ ] **Step 4: `.claude/rules/routing-guard.md` — 改路由句**

```
OLD: - 仅输入 ZenTao bug URL/bug-view URL/bug ID → 转发到 `case-hotfix`；若记录未修复或缺少修复范围，由该 skill 生成待办项而非回退到 `bug-file`。
NEW: - 仅输入 ZenTao bug URL/bug-view URL/bug ID → 转发到 `case-hotfix`；若记录未修复或缺少修复范围，由该 skill 生成待办项而非回退到 `defect-analyze`。
```

- [ ] **Step 5: `README.md` — ASCII 流程图（合 3→1）**

改流程行：
```
OLD: 失败证据 / Bug / 冲突 ── /bug-file 等命令 ───────> 报告、Hotfix 回归用例、冲突分析
NEW: 失败证据 / Bug / 冲突 / diff ── /defect-analyze ──> 缺陷报告、冲突解决方案
```
删除单独的 diff 流程行：
```
DELETE: 源码 diff ───────────── /diff-scan ───────> 可复现缺陷报告
```

- [ ] **Step 6: `README.md` — 命令表（合 3→1）**

替换 bug-file 行：
```
OLD: | `/bug-file` | 缺陷与变更 | `bug-file@1` | 根据观察到的失败现象生成有证据支持的 bug 报告。 |
NEW: | `/defect-analyze` | 缺陷与变更 | `defect-analyze@1` | bug 证据、合并冲突、代码 diff 三模式缺陷分诊与解决方案。 |
```
删除 conflict-analyze 行与 diff-scan 行：
```
DELETE: | `/conflict-analyze` | 缺陷与变更 | `conflict-analyze@1` | 分析合并冲突并生成解决方案说明。 |
DELETE: | `/diff-scan` | 代码扫描 | `diff-scan@1` | 扫描代码 diff 发现可复现的缺陷。 |
```

- [ ] **Step 7: `README.md` — 编号列表（合 3→1 并重编号）**

把这一段（原 #6 / #7 / #8 / #9 / #10）：
```
# 6. Bug 报告 — 根据失败现象生成有证据支持的 bug 报告
/bug-file

# 7. 冲突分析 — 分析合并冲突并生成解决方案说明
/conflict-analyze

# 8. Hotfix 回归用例 — 根据 bug 或修复记录生成回归用例
/case-hotfix

# 9. 代码扫描 — 扫描源码 diff 发现可复现的缺陷
/diff-scan

# 10. 故障排查 — SSH 登录服务器排查连通性故障
/infra-diagnose
```
整体替换为：
```
# 6. 缺陷分析 — bug 证据 / 合并冲突 / 代码 diff 三模式缺陷分诊
/defect-analyze

# 7. Hotfix 回归用例 — 根据 bug 或修复记录生成回归用例
/case-hotfix

# 8. 故障排查 — SSH 登录服务器排查连通性故障
/infra-diagnose
```

- [ ] **Step 8: `README-EN.md` — ASCII 流程图（合 3→1）**

```
OLD: Failure / bug / conflict ───── /bug-file and peers ────> Reports, hotfix cases, conflict notes
NEW: Failure / bug / conflict / diff ── /defect-analyze ──> Defect reports, conflict resolutions
```
```
DELETE: Code diff ──────────────────── /diff-scan ───────> Reproducible defect reports
```

- [ ] **Step 9: `README-EN.md` — 命令表（合 3→1）**

```
OLD: | `/bug-file` | Defects and changes | `bug-file@1` | Turn observed failures into evidence-backed bug reports. |
NEW: | `/defect-analyze` | Defects and changes | `defect-analyze@1` | Triage bug evidence, merge conflicts, and code diffs in one skill. |
```
```
DELETE: | `/conflict-analyze` | Defects and changes | `conflict-analyze@1` | Analyze merge conflicts and produce resolution notes. |
DELETE: | `/diff-scan` | Code scanning | `diff-scan@1` | Scan code diffs for reproducible defects. |
```

- [ ] **Step 10: `README-EN.md` — 编号列表（合 3→1 并重编号）**

把原 #6 / #7 / #8 / #9 / #10 段整体替换为：
```
# 6. Defect analysis — triage bug evidence, merge conflicts, and code diffs
/defect-analyze

# 7. Hotfix regression cases — generate regression tests from bugs or fix records
/case-hotfix

# 8. Infra diagnosis — SSH into servers to diagnose connectivity failures
/infra-diagnose
```

- [ ] **Step 11: `engine/tests/lint/skill-frontmatter.test.ts` — `KNOWN_SKILLS` 改名**

```
OLD:   "bug-file",
NEW:   "defect-analyze",
```
（`KNOWN_SKILLS` 是 linter 测试夹具白名单，含历史残留 `ui-plan`/`playwright-cli`——那两项属 pre-existing，**本计划不动**；只把在范围内的 `bug-file` 改为 `defect-analyze`。fixtures 的 `owner_skill` 均为 `case-draft`/`ui-plan`，无一引用 `bug-file`，故改名不破坏任何用例。）

- [ ] **Step 12: `apps/core/catalog/skills.test.ts` — roster 断言改名**

```
OLD:   expect(ids).toContain("bug-file");
NEW:   expect(ids).toContain("defect-analyze");
```
（`listSkills()` 按文件系统扫描 `.claude/skills`，删 bug-file 目录后 ids 不再含 `bug-file`，含 `defect-analyze`。）

- [ ] **Step 13: `engine/src/scan-report.ts` — 契约注释改指 defect-analyze（准确性）**

```
OLD(L3):  * scan-report.ts — kata module for diff-scan reports.
NEW(L3):  * scan-report.ts — kata module for defect-analyze diff-mode reports.

OLD(L8):  * Contract: .agents/skills/diff-scan/SKILL.md and .claude/skills/diff-scan/SKILL.md
NEW(L8):  * Contract: .agents/skills/defect-analyze/SKILL.md and .claude/skills/defect-analyze/SKILL.md

OLD(L136):   description: "diff-scan report CRUD + render (spec §4.1)",
NEW(L136):   description: "defect-analyze diff-mode report CRUD + render (spec §4.1)",
```
（纯文档/描述，无 gate 或测试断言依赖；L8 指向已删目录，改名消除悬挂引用。）

- [ ] **Step 14: `engine/tests/scan-report/e2e.test.ts` — describe 文案对齐**

```
OLD(L46): describe("diff-scan E2E orchestration (mock agent output)", () => {
NEW(L46): describe("defect-analyze diff-mode E2E orchestration (mock agent output)", () => {
```

- [ ] **Step 15: 验证 gate 绿（只剩 defect-analyze）**

Run（在 worktree 内）：
```bash
bun run check:skills; echo "check:skills exit=$?"
bun test --cwd engine 2>&1 | tail -6
bun run check 2>&1 | tail -3
bun run test:apps 2>&1 | tail -3
```
Expected: 全绿。校验点：`checkRuntimeSkillSync` 双侧 roster 不含旧 3、含 defect-analyze、无 `RUNTIME_SKILL_MISSING`；`lintSkillStructure` 无悬挂索引行（旧 3 行已删）；`skill-frontmatter` / catalog / scan-report e2e 测试在改名后全 pass；`test:apps` 的 `skills.test.ts` roster 断言 pass。

- [ ] **Step 16: Commit（路径限定）**

```bash
git add .claude/skills .agents/skills CLAUDE.md AGENTS.md .claude/rules/routing-guard.md \
        README.md README-EN.md \
        engine/tests/lint/skill-frontmatter.test.ts apps/core/catalog/skills.test.ts \
        engine/src/scan-report.ts engine/tests/scan-report/e2e.test.ts
git commit -m "refactor: ✨ retire bug-file/conflict-analyze/diff-scan into defect-analyze"
```
确认 `git show --stat HEAD` 仅含上述路径的删除/修改，无 `plugins/lanhu/...` 或无关文件。

---

## Task 4: 全量回归 + 合并 main + 清理

**Files:** 无代码改动。

- [ ] **Step 1: worktree 内全量 gate**

```bash
bun run check:skills; echo "check:skills exit=$?"
bun test --cwd engine 2>&1 | tail -6
bun run check 2>&1 | tail -3
bun run lint:debris; echo "lint:debris exit=$?"
bun run lint:paths; echo "lint:paths exit=$?"
bun run test:apps 2>&1 | tail -3
bun run test:plugins 2>&1 | tail -3
```
Expected: 全部 exit 0 / 全 pass。`lint:debris`（含 `check-stale-paths.ts` 只禁 `docs/refactor/`）应仍绿；`lint:paths`（`kata paths audit`）应仍绿。

- [ ] **Step 2: 确认提交范围干净**

```bash
git log --oneline main..HEAD
git status --short
git log -p main..HEAD -- plugins/ | head
```
Expected: 2 个本计划 commit（feat + refactor）；`git status` 干净或仅剩主工作树固有脏 submodule（不在本 worktree）；`plugins/` diff 为空。

- [ ] **Step 3: 记录 HEAD SHA，回主工作树合并**

```bash
SHA=$(git rev-parse HEAD); echo "$SHA"
cd /Users/poco/Projects/kata
git merge --no-ff "$SHA" -m "merge: 🔀 合并 defect-analyze（bug-file + conflict-analyze + diff-scan）"
```

- [ ] **Step 4: 主工作树复验**

```bash
bun run check:skills; echo "exit=$?"
bun test --cwd engine 2>&1 | tail -6
bun run test:apps 2>&1 | tail -3
```
Expected: 全绿。`ls .claude/skills | grep -E 'bug-file|conflict-analyze|diff-scan'` 应无输出；`ls .claude/skills` 应含 `defect-analyze`，skill 总数为 8。

- [ ] **Step 5: 推送**

```bash
git push origin main
```
（远端不可用则记录阻塞，不静默跳过。）

- [ ] **Step 6: 清理 worktree**

```bash
git worktree remove .worktrees/bundle-4-defect-analyze
git worktree list
```
Expected: 列表不再含 `bundle-4-defect-analyze`。

---

## Self-Review（已执行）

**1. Spec/范围覆盖：** 交付 spec §6.2 + §8 的 `bug-file + conflict-analyze + diff-scan → defect-analyze` 合并，达成 §13 验收标准「skill 数 8」+「defect-analyze：bug/diff 产 `defect-report.md`、conflict 产 `conflict-resolution-plan.md` 且含 side_a/side_b」。据实测把 spec §8 草案的 `phases/` 结构降级为 thin 合并（D1，与其余非试点 skill 一致），并显式列出 OUT（不迁码、不建 phases、不删 catalog、不动其余 skill）供用户复核收敛边界。

**2. Placeholder 扫描：** 无 TBD/TODO；每个改动步骤给出 exact 文件与完整 before/after（含两份完整 `SKILL.md`、`openai.yaml`、每处 OLD/NEW 行）；每个验证步骤给出 exact 命令与预期。

**3. 类型/命名一致性：** 全程 skill id 统一 `defect-analyze`；产物名统一 `defect-report.md` / `conflict-resolution-plan.md`；三模式标识统一 `bug`/`conflict`/`diff`；Claude 与 Codex 两份 `SKILL.md` 的模式与硬规则一致（Codex 为占位精简版）。

**4. 顺序与每步绿：** Task 1（基线/worktree）→ Task 2（加法：建 defect-analyze + 注册索引，与旧 3 共存，gate 绿）→ Task 3（减法：删旧 6 + 清引用，gate 绿）→ Task 4（全量/合并）。关键是利用「gate 不限 skill 数」把合并拆成两个独立可绿的提交，避免出现「新 skill 已建但旧 skill 未删」或「索引/roster 半同步」的红态窗口。

**5. 验证完备性：** 关键 gate 是 `check:skills`（`checkRuntimeSkillSync` roster 双向对齐 + `checkRuntimeDetach` + `lintSkillStructure`），辅以 `bun test --cwd engine`（`skill-frontmatter` / `scan-report e2e`）、`test:apps`（catalog roster）、biome、`lint:debris`/`lint:paths`、`test:plugins`。每个 Task 落盘即跑最小相关 gate，merge 前全量复验。

**6. 风险 / watch-items：**
- **行为等价（D2，最高优先）**：diff 模式由 `context: fork`/`agent: general-purpose` 改为正文「fork general-purpose 子代理」指令；bug/conflict 保持 inline。对应 spec §12 风险 #4——执行后**人工实跑三模式各一次**，核对 diff 模式仍走子代理隔离、conflict 仍先 side_a/side_b、bug 仍四分项。
- **roster 对齐**：删除必须 Claude+Codex 对称，否则 `RUNTIME_SKILL_MISSING`；Task 3 Step 1 一次删 6 目录已保证对称，Step 15 gate 兜底。
- **Codex frontmatter 策略**：Codex `SKILL.md` 只能含 `name`/`description` 等 5 字段，**不可**写 `model`/`effort`/`paths`；占位已遵守。
- **README 编号列表重编号**：Step 7/10 给出整段替换文本，避免漏改编号。
- **`scan-report.ts` 描述串**：已核无测试断言依赖该 `description` 字符串（唯一测试引用是 e2e describe 文案，Step 14 已同步），改名安全。

---

## 后续 Plan（路线图剩余）

- **Plan 5（case-edit 代码迁移 + 共享渲染定位）**：迁 case-edit 专属代码；随之裁定 `archive-gen`/`xmind-gen`/`md-table` 的最终归宿（`_shared/` 渲染库 vs skill bundle）；迁 `verify-layers` 入 cases-verify/compare 归属 skill。
- **Plan 6（测试基础设施统一 + engine 收口删除）**：skill 测试物理迁入各自 `tests/`、`cli-runner` test helper 归位、加 `test:skills` 并入 `ci`、调 `bunfig.toml`；`_shared/cli` 收口 CLI 注册中心（改从 `@skills/*` 注册）；删 `engine/`、移除 workspace 成员、删 `apps/core/catalog/`；同步所有 `engine/bin/kata` 文档路径。
- **Phase-2 / Codex**：把本计划新建的 `.agents/skills/defect-analyze/` 占位升级为 Codex 适配版；同时校正 `.agents/README.md:7` 的 `reviewers/`/`workers/` 前瞻描述（见遗留事项 #1）。
