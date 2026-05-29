# kata Skill-Bundle 迁移 · Plan 3: 试点 skill 可执行代码迁移

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `case-draft` 与 `playwright-automation` 两个试点 skill **专属的可执行代码**（flow 模块、信号/策略分析、专属 lib、handoff 渲染 + 模板）从 `engine/src` / `_shared/lib` 迁入各自 skill 的 `scripts/` 目录，新增 `@skills/*` 路径别名让 CLI 注册中心从 skill 路径引用，并修复这些文件进入根 type-check gate 后暴露的历史类型错误——全程保持 `tsc --noEmit` exit 0 与 `bun test --cwd engine` 全绿。

**Architecture:** 迁移采用 `git mv` + 别名重指，分阶段保持每步绿。新增 `@skills/*` → `./.claude/skills/*`（写入 `tsconfig.base.json`，root 与 engine 两个 project 都继承，bun 运行时与 tsc 编译时同样解析，机制与现有 `@shared/*` 完全一致）。试点专属代码下沉到 `.claude/skills/<name>/scripts/`（含 `scripts/lib/`），其它 skill 共享或归属未定的渲染类代码（archive-gen / xmind-gen / md-table / verify-layers）**本计划不动**，留待 case-edit 迁移时统一定位最终归宿。**测试文件本计划不做物理迁移**——只把深 import 测试的 import specifier 重指到 `@skills/*`，让它们在 `engine/tests` 原位继续被 `bun test --cwd engine` 发现并运行；测试物理迁移 + 测试基础设施（bunfig / `test:skills` / 共享 `cli-runner` test helper 重置）统一推迟到后续「engine 收口」计划。

**Tech Stack:** Bun 1.3、TypeScript（`strict`、`allowImportingTsExtensions`）、commander、Ajv、Handlebars、Biome、tsconfig path alias。

---

## Plan 2 Carryover（Opus handoff，必读）

Bundle-2 落地后 Opus 留下两条遗留问题，按用户要求置于本计划开头并给出 Plan 3 处理策略：

1. **`.agents/README.md:7` 前瞻描述与 prompts/ 约定不符。** 该行前瞻性地写 Phase-2 将共享 `reviewers/`、`workers/`，与试点实际采用的 `prompts/agent-<step>.md` 约定不一致。Plan 2 已明确「Codex 侧无需变更」，Opus 未擅改。**Plan 3 不处理**（属 Codex runtime / Phase-2 设计范畴）；记录为 Phase-2 设计时需校正的待办，本计划仅在 Task 7 占位评估时复述其仍为占位状态。

2. **主工作树 pre-existing 脏状态，与本计划无关、不得触碰：**
   - 脏 submodule `plugins/lanhu/mcp-bridge/lanhu-mcp`（内部文件被删未提交，`git status` 显示 ` m`）。
   - 2 个 prunable 旧 worktree：`p1-cleanup`、`p2-event-core`。

   **Plan 3 处理策略（重要，覆盖项目默认 pre-worktree 快照规则）：**
   - **不** 对脏 submodule 执行 `git add -A` 快照提交。`git worktree add --detach … main` 从 main 已提交状态检出 tracked 文件，脏 submodule 状态只存在于主工作树工作目录、不会传播进新 worktree；合并回 main 也不触碰其未暂存状态。故本计划全程忽略它即可。
   - 本计划 **所有 commit 必须使用 path-scoped `git add <具体路径>`，严禁 `git add -A` / `git add .`**，以免误纳脏 submodule 指针变更。
   - 2 个 prunable worktree 在 Task 1 用 `git worktree prune` 清理（仅移除已失效的管理记录，无副作用）。

---

## Scope

**IN（本计划交付）：**
- 新增 `@skills/*` 路径别名（`tsconfig.base.json`）。
- 迁 `case-draft` 专属 lib：`signal-probe.ts`、`strategy-router.ts`（`_shared/lib/` → `.claude/skills/case-draft/scripts/lib/`）。
- 迁 `case-draft` flow 模块：`case-draft.ts`、`test-case-flow.ts` + `test-case-flow/{project-resolver,session,source-consent,source-resolver}.ts`、`case-signal-analyzer.ts`、`case-strategy-resolver.ts`（`engine/src/` → `.claude/skills/case-draft/scripts/`）。
- 迁 `playwright-automation` 的 `handoff-render.ts` + 其唯一模板 `handoff.md.hbs`（`engine/src/cli/` 与 `engine/templates/` → `.claude/skills/playwright-automation/scripts/` 与 `templates/`）。
- 重指 CLI 注册中心（`engine/src/cli/index.ts`、`engine/src/cli/handoff.ts`）与深 import 测试的 import 到 `@skills/*`。
- 修复迁入文件进入根 gate 后暴露的历史类型错误（`case-draft.ts`、`test-case-flow.ts`、`case-signal-analyzer.ts`、`handoff-render.ts`）。
- 修复 `case-signal-analyzer.ts` 自指脚本路径（缓存失效用）。
- 删除 vestigial `context-builder.ts`。

**OUT（本计划不动，附依赖图证据与延后理由）：**
- `engine/src/archive-gen.ts`、`engine/src/xmind-gen/*`（+ barrel `engine/src/xmind-gen.ts`）、`_shared/lib/md-table.ts`：archive.md / cases.xmind 的渲染机制，**很可能被 case-edit 共享**（case-edit 负责已有用例产物的转换/标准化，会复用同一套 archive/xmind 渲染）。现在放进 case-draft 会造成 case-edit→case-draft 的 skill 间耦合（违反自包含/低耦合）。**正确归宿（`_shared/` 渲染库 或 别处）需在 case-edit 迁移时确定**，故延后。`md-table.ts` 当前唯一 importer 是 `xmind-gen/archive.ts`，二者同进同出，本计划一并保留在原位。
- `engine/src/cases/verify-layers.ts`：依赖图实测 **不属于 case-draft cluster**——其 importer 是 `cli/cases-compare.ts`、`cli/cases-verify.ts`、`cases/case-extract.ts`（cases-verify/compare 命令簇，属 case-edit 范畴）。Plan-2 草案误列为 case-draft 模块，本计划据实**剔除**，留待相应 skill 迁移。
- **测试物理迁移 + 测试基础设施**：所有测试文件留在 `engine/tests` 原位（只改 import specifier）；`bunfig.toml`、`test:skills` 脚本、共享 `cli-runner.ts` test helper 的重置统一推迟到后续 engine 收口计划，避免为 2 个试点做一次、为 6 个 skill 再做一次的重复 infra 改动。

---

## 关键架构决策

**D1 — 新增 `@skills/*` 别名（而非相对路径）。** CLI 注册中心 `engine/src/cli/index.ts` 位于 `engine/src/cli/`，若用相对路径引用 skill 代码会是 `../../../.claude/skills/...` 这种脆弱长链。新增 `@skills/*` → `./.claude/skills/*`，与现有 `@shared/*` 同写在 `tsconfig.base.json` 的 `paths`，root（`tsconfig.json`）与 engine（`engine/tsconfig.json`）均 `extends` 它，故两边 tsc 编译与 bun 运行时都解析（机制与今天 CLI 运行时解析 `@shared/*` 完全相同，已被现网验证）。该别名也是 engine 删除后 `_shared` CLI 收口引用 skill 代码的**永久机制**，现在引入即前向兼容。

**D2 — 跨 module import 统一用 `@skills/*`；同目录/同迁移单元内保留相对路径。** 凡跨越「不同迁移单元」的引用（`index.ts`→skill、`case-signal-analyzer`→`lib/signal-probe`、深 import 测试→被测模块）一律改 `@skills/...`，绝对、与嵌套深度无关、迁移中不需二次改。同迁移单元内（结构原样平移）的相对 import **保持不变**：`case-draft.ts` 的 `./test-case-flow/*`、`test-case-flow.ts` 的 `./test-case-flow/*`、`strategy-router.ts` 的 `./signal-probe.ts`（与 `signal-probe.ts` 同进 `scripts/lib/`）均无需改。各迁入文件原有的 `@shared/*` import（`cli-runner`、`paths`、`frontmatter`、`cli`、`plugin-utils`、`rules`、`types`、`schemas/loaders` 等）一律**不变**——这些依赖仍在 `_shared`。

**D3 — 测试就地重指、不物理迁移（Plan 3 边界）。** 依赖图实测：迁入模块中只有「深 import 单元测试」直接 `import` 被测文件（必须改 import），而 `case-signal-analyzer` / `case-strategy-resolver` / `case-draft` 的主测试是 **CLI 子进程测试**（`spawn kata <subcommand>`，经 `engine/tests/cli-runner.ts` 这个共享 helper），它们**不 import 被测模块**，只要 `kata` 仍注册该 subcommand 即继续通过——故连 import 都不用改。把这些 CLI 测试搬进 bundle 需要先把共享 `cli-runner.ts` 迁到公共 test-helper 位置（牵动十余个无关 engine 测试），属跨切面改动，明确推迟。结论：Plan 3 = 纯生产代码迁移 + 测试就地重指，`bun test --cwd engine` 原命令即可全绿，风险最小。

**D4 — 范围以依赖图实测为准，修正 Plan-2 草案。** Plan-2 follow-up 草案（写于依赖分析之前）把 `verify-layers` / `archive-gen` / `xmind-gen` 列入 case-draft 迁移；实测证明 `verify-layers` 属 cases-verify 簇、`archive-gen`/`xmind-gen`/`md-table` 很可能 case-draft+case-edit 共享。本计划据实剔除（见 Scope OUT），把 Plan 3 收敛为「**明确 case-draft 专属、import-clean** 的 flow/信号/策略代码」+ playwright handoff，保证迁移单元边界清晰、零 skill 间耦合。

---

## File Structure（目标 bundle 布局）

迁移后两个试点的目标布局（仅列本计划新增/移动的文件）：

```
.claude/skills/case-draft/
  scripts/
    case-draft.ts                     # ← engine/src/case-draft.ts
    case-signal-analyzer.ts           # ← engine/src/case-signal-analyzer.ts
    case-strategy-resolver.ts         # ← engine/src/case-strategy-resolver.ts
    test-case-flow.ts                 # ← engine/src/test-case-flow.ts
    test-case-flow/                   # ← engine/src/test-case-flow/
      project-resolver.ts
      session.ts
      source-consent.ts
      source-resolver.ts
    lib/
      signal-probe.ts                 # ← .claude/scripts/_shared/lib/signal-probe.ts
      strategy-router.ts              # ← .claude/scripts/_shared/lib/strategy-router.ts
  (SKILL.md / phases / prompts / fewshots / rules / references 不动)

.claude/skills/playwright-automation/
  scripts/
    handoff-render.ts                 # ← engine/src/cli/handoff-render.ts
  templates/
    handoff.md.hbs                    # ← engine/templates/handoff.md.hbs
  (SKILL.md / phases / prompts / references 不动)
```

**就地改动（文件不动、只改内容）：**
- `tsconfig.base.json`（加 `@skills/*` 别名）
- `engine/src/cli/index.ts`（4 行 import 重指：line 26/27/28/144）
- `engine/src/cli/handoff.ts`（line 4 import 重指）
- `engine/src/case-signal-analyzer.ts`（迁移后：line 28 lib import 重指 + line 302 自指路径 + line 308–311 类型修复）
- `engine/src/case-strategy-resolver.ts`（迁移后：line 12/19 lib import 重指）
- `engine/src/case-draft.ts`（迁移后：line 88/91 类型修复）
- `engine/src/test-case-flow.ts`（迁移后：line 78/81 类型修复）
- `engine/src/cli/handoff-render.ts`（迁移后：line 16 模板路径 + line 40–57 / line 76 类型修复）
- 深 import 测试 import 重指（均留 `engine/tests` 原位）：
  - `engine/tests/test-case-flow/{cli,project-resolver,session,enhanced-gates,source-consent,source-resolver,lanhu-replay}.test.ts`
  - `engine/tests/lib/{signal-probe,strategy-router}.test.ts`
  - `engine/tests/cli/handoff-render.test.ts`

**删除：** `.claude/scripts/_shared/lib/context-builder.ts`（vestigial，0 importer；注意与 active 的 `engine/src/writer-context-builder.ts` 同名前缀但无关，后者**不动**）。

**不动但需知：** `engine/src/case-signal-analyzer.ts` line 124/149/178/220/260 的 `"engine/src/xxx.ts"` 字符串是**子命令名约定参数**（line 35 注释：「Convert engine/src/xxx.ts first arg to kata subcommand name」），指向的 `source-analyze`/`archive-gen`/`search-filter`/`knowledge-curate` 命令本计划均**留在 engine**，故这些字符串在 Plan 3 内继续有效，不改；后续 engine 收口计划再统一改为子命令名。

---

## Prerequisites: Worktree

本计划在专用 detached worktree 内执行（项目 worktree-first 硬规则）。

```shell
ROOT=$(pwd)                                   # /Users/poco/Projects/kata
git worktree prune                            # 清理 Plan-2 carryover 的 p1-cleanup / p2-event-core 失效记录
git worktree add --detach .worktrees/bundle-3-code-migration main
cd .worktrees/bundle-3-code-migration
```

- **不** symlink `workspace/{project}/.kata`：本计划为纯代码迁移，不读 workspace 证据。
- **不** 对主工作树脏 submodule 做快照（见 Carryover 第 2 条）。
- worktree 内 `bun install` 通常无需（依赖未变）；若 `bun test` 报缺依赖再 `bun install`。

---

## 验证约定（每个 Task 的 green bar）

每个改代码的 Task 结束前，在 worktree 内运行并记录：

| 命令 | 通过标准 |
| --- | --- |
| `bun run type-check` | exit 0（根 `tsc --noEmit`，覆盖 `.claude/skills/**/scripts/**` 与 `.claude/scripts/**`） |
| `bun test --cwd engine` | 全部 pass，记录 pass/fail/skip 计数（基线见 Task 1） |
| `bun run check` | Biome exit 0 |

最终 Task 7 追加：`bun run check:skills`、`bun run lint:debris`、`bun run lint:paths`、`bun run test:apps`、`bun run test:plugins` 全绿。

**类型 gate 口径：** 迁移前 `engine/src` 的历史类型错误是 **engine tsc 未被 CI gate 覆盖** 的存量债；文件迁入 `.claude/skills/**/scripts/` 后即进入**根 type-check gate**，故必须在迁入的同一 Task 内修到 `bun run type-check` exit 0。若根 gate 在某迁入文件上报出本计划未列出的额外错误，按同类「联合类型收窄 / 显式类型断言」模式一并修复，直至 exit 0，不得跳过或 `@ts-ignore`。

**Commit 规范：** path-scoped `git add`（严禁 `-A`/`.`）；type:emoji 固定映射（`refactor: ✨`、`build: 🏗️`、`test: 🧪`、`merge: 🔀`）；description ≤ 72 字符。

---

## Task 1: 基线确认 + carryover 前置清理

**Files:** 无代码改动（只读 + worktree 准备）。

- [ ] **Step 1: 主工作树确认脏 submodule 并保持不动**

Run: `git -C /Users/poco/Projects/kata status --short`
Expected: 仅出现 ` m plugins/lanhu/mcp-bridge/lanhu-mcp`（脏 submodule，按 Carryover 不处理）。若出现其它未提交改动，停下来向用户确认是否属本计划范畴，再决定是否快照——**不要**把脏 submodule 卷进任何快照。

- [ ] **Step 2: 清理 prunable 旧 worktree**

Run: `git -C /Users/poco/Projects/kata worktree prune && git -C /Users/poco/Projects/kata worktree list`
Expected: 输出不再含 `p1-cleanup`、`p2-event-core`（或其 prunable 标记消失）。

- [ ] **Step 3: 创建并进入 worktree**

```bash
cd /Users/poco/Projects/kata
git worktree add --detach .worktrees/bundle-3-code-migration main
cd .worktrees/bundle-3-code-migration
```
Expected: worktree 创建成功，HEAD detached 于 main 当前 SHA（`a4fdbed4f` 或更新）。

- [ ] **Step 4: 记录基线绿**

Run（在 worktree 内）：
```bash
bun run type-check; echo "type-check exit=$?"
bun test --cwd engine 2>&1 | tail -5
bun run check 2>&1 | tail -3
```
Expected: `type-check exit=0`；`bun test --cwd engine` 全 pass（记录 pass/skip 计数作为后续对账基线）；Biome 无 error。

- [ ] **Step 5: 记录迁入文件的存量类型错误（确认与计划一致）**

Run: `(cd engine && bun run type-check 2>&1) | grep -E "case-draft\.ts|test-case-flow\.ts|case-signal-analyzer\.ts|handoff-render\.ts" | grep "error TS"`
Expected: 恰好出现以下 6 处（其余 engine 错误不在迁入文件上，不属本计划）：
```
src/case-draft.ts(88,29): error TS2339: Property 'status' ...
src/case-draft.ts(91,29): error TS2339: Property 'reason' ...
src/case-signal-analyzer.ts(311,21): error TS2345: ... 'SignalProfile | undefined' ...
src/cli/handoff-render.ts(46,22): error TS18046: 'summary' is of type 'unknown'. (及 52/53/54/56、76)
src/test-case-flow.ts(78,33): error TS2339: Property 'status' ...
src/test-case-flow.ts(81,33): error TS2339: Property 'reason' ...
```
若与此不符，停下来重新核对计划再继续。

（Task 1 无 commit。）

---

## Task 2: 新增 `@skills/*` 路径别名

**Files:**
- Modify: `tsconfig.base.json:16-18`

- [ ] **Step 1: 加别名**

把 `tsconfig.base.json` 的 `paths` 由：
```json
    "paths": {
      "@shared/*": ["./.claude/scripts/_shared/*"]
    },
```
改为：
```json
    "paths": {
      "@shared/*": ["./.claude/scripts/_shared/*"],
      "@skills/*": ["./.claude/skills/*"]
    },
```

- [ ] **Step 2: 验证未破坏现状**

Run: `bun run type-check; echo "exit=$?"`
Expected: `exit=0`（仅新增别名，尚无文件使用它，应无变化）。

- [ ] **Step 3: Commit**

```bash
git add tsconfig.base.json
git commit -m "build: 🏗️ add @skills path alias for skill-bundle imports"
```

---

## Task 3: 迁移 case-draft 专属 lib（signal-probe + strategy-router）

实测：`signal-probe.ts`、`strategy-router.ts` 仅被 case-draft cluster 引用（`case-signal-analyzer.ts`、`case-strategy-resolver.ts`、以及 `strategy-router` 自身依赖 `signal-probe`），无任何外部 importer。先迁这两个 lib，importer 仍在 engine、经 `@skills` 绝对别名引用 → 本 Task 即可独立绿。

**Files:**
- Move: `.claude/scripts/_shared/lib/signal-probe.ts` → `.claude/skills/case-draft/scripts/lib/signal-probe.ts`
- Move: `.claude/scripts/_shared/lib/strategy-router.ts` → `.claude/skills/case-draft/scripts/lib/strategy-router.ts`
- Modify: `engine/src/case-signal-analyzer.ts:28`、`engine/src/case-strategy-resolver.ts:12,19`
- Modify: `engine/tests/lib/signal-probe.test.ts`、`engine/tests/lib/strategy-router.test.ts`

- [ ] **Step 1: 建目录并 git mv 两个 lib**

```bash
mkdir -p .claude/skills/case-draft/scripts/lib
git mv .claude/scripts/_shared/lib/signal-probe.ts .claude/skills/case-draft/scripts/lib/signal-probe.ts
git mv .claude/scripts/_shared/lib/strategy-router.ts .claude/skills/case-draft/scripts/lib/strategy-router.ts
```
`strategy-router.ts` 内 `import ... from "./signal-probe.ts"` 与 `signal-probe.ts` 仍同目录 → **不改**。

- [ ] **Step 2: 重指 `case-signal-analyzer.ts` 的 lib import**

`engine/src/case-signal-analyzer.ts` line 28 由：
```ts
} from "@shared/lib/signal-probe.ts";
```
改为：
```ts
} from "@skills/case-draft/scripts/lib/signal-probe.ts";
```
（该 import 是多符号块：`ArchiveSearchHit, buildCacheEntry, classifyHistory, … SignalProfile, SourceAnalyzeOutput`，只改末行的 `from` 路径。）

- [ ] **Step 3: 重指 `case-strategy-resolver.ts` 的 lib import**

`engine/src/case-strategy-resolver.ts`：
- line 12 `import type { SignalProfile } from "@shared/lib/signal-probe.ts";` → `from "@skills/case-draft/scripts/lib/signal-probe.ts";`
- line 19（多符号块 `buildOverrides, composeResolution, STRATEGY_NAMES, StrategyId, StrategyResolution` 的末行）`} from "@shared/lib/strategy-router.ts";` → `} from "@skills/case-draft/scripts/lib/strategy-router.ts";`

- [ ] **Step 4: 重指两个 lib 测试的 import**

`engine/tests/lib/signal-probe.test.ts`：把全部 `@shared/lib/signal-probe.ts` 替换为 `@skills/case-draft/scripts/lib/signal-probe.ts`（line 2 type import + line 3–13 值 import 块的末行 `from`）。

`engine/tests/lib/strategy-router.test.ts`：
- line 2 `@shared/lib/signal-probe.ts` → `@skills/case-draft/scripts/lib/signal-probe.ts`
- line 3 与值 import 块（line 4–9 末行）`@shared/lib/strategy-router.ts` → `@skills/case-draft/scripts/lib/strategy-router.ts`

- [ ] **Step 5: 确认 `_shared/lib` 再无对这两文件的引用残留**

Run: `rg -n "_shared/lib/(signal-probe|strategy-router)|@shared/lib/(signal-probe|strategy-router)" --type ts`
Expected: 无输出（所有引用已改 `@skills`）。

- [ ] **Step 6: 验证绿**

Run:
```bash
bun run type-check; echo "exit=$?"
bun test --cwd engine 2>&1 | tail -5
bun run check 2>&1 | tail -3
```
Expected: `type-check exit=0`；engine 测试 pass 数 == 基线；Biome 无 error。

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/case-draft/scripts/lib engine/src/case-signal-analyzer.ts engine/src/case-strategy-resolver.ts engine/tests/lib/signal-probe.test.ts engine/tests/lib/strategy-router.test.ts
git commit -m "refactor: ✨ relocate case-draft-only signal libs into skill bundle"
```
（`git mv` 的删除侧会随被删原文件自动纳入 `git add` 的对应路径；若 `git status` 显示 `_shared/lib/*.ts` 仍为未暂存删除，追加 `git add .claude/scripts/_shared/lib/signal-probe.ts .claude/scripts/_shared/lib/strategy-router.ts`。）

---

## Task 4: 迁移 case-draft flow 模块 + 修类型 + 重指 CLI/测试

迁 4 个顶层模块 + `test-case-flow/` 子目录。`case-signal-analyzer.ts` 的 lib import 在 Task 3 已改 `@skills` 绝对别名，迁入后仍解析、**无需再改**；`case-draft.ts`/`test-case-flow.ts` 的 `./test-case-flow/*` 相对 import 因结构原样平移而**保持有效**。本 Task 同时修 5 处历史类型错误 + 1 处自指路径。

**Files:**
- Move: `engine/src/{case-draft,case-signal-analyzer,case-strategy-resolver,test-case-flow}.ts` → `.claude/skills/case-draft/scripts/`
- Move: `engine/src/test-case-flow/` → `.claude/skills/case-draft/scripts/test-case-flow/`
- Modify: `case-signal-analyzer.ts`（自指路径 + 类型）、`case-draft.ts`（类型）、`test-case-flow.ts`（类型）
- Modify: `engine/src/cli/index.ts:26,27,28,144`
- Modify: 7 个 `engine/tests/test-case-flow/*.test.ts`

- [ ] **Step 1: git mv 顶层模块与子目录**

```bash
mkdir -p .claude/skills/case-draft/scripts
git mv engine/src/case-draft.ts            .claude/skills/case-draft/scripts/case-draft.ts
git mv engine/src/case-signal-analyzer.ts  .claude/skills/case-draft/scripts/case-signal-analyzer.ts
git mv engine/src/case-strategy-resolver.ts .claude/skills/case-draft/scripts/case-strategy-resolver.ts
git mv engine/src/test-case-flow.ts        .claude/skills/case-draft/scripts/test-case-flow.ts
git mv engine/src/test-case-flow           .claude/skills/case-draft/scripts/test-case-flow
```

- [ ] **Step 2: 修 `case-signal-analyzer.ts` 自指脚本路径（line 302）**

`.claude/skills/case-draft/scripts/case-signal-analyzer.ts` 中：
```ts
  const probeScriptPath = resolve(repoRoot(), "engine/src/case-signal-analyzer.ts");
```
改为：
```ts
  const probeScriptPath = resolve(repoRoot(), ".claude/skills/case-draft/scripts/case-signal-analyzer.ts");
```
（该路径用于 `statSync` 取脚本 mtime 做缓存失效；不改会 ENOENT。注意此文件 line 124/149/178/220/260 的 `"engine/src/xxx.ts"` 字符串是子命令名约定参数，指向仍在 engine 的命令，**不改**。）

- [ ] **Step 3: 修 `case-signal-analyzer.ts` 类型错误（原 line 308–311，TS2345）**

把：
```ts
    if (isCacheValid(cached, prdMtimeMs, probeScriptMtimeMs)) {
      process.stderr.write("[case-signal-analyzer] cache hit\n");
      const profile = cached?.profile;
      outputProfile(profile, opts.output);
      return;
    }
```
改为（在条件里加 `cached &&` 收窄 `cached` 为非 undefined，直接用 `cached.profile`）：
```ts
    if (cached && isCacheValid(cached, prdMtimeMs, probeScriptMtimeMs)) {
      process.stderr.write("[case-signal-analyzer] cache hit\n");
      outputProfile(cached.profile, opts.output);
      return;
    }
```

- [ ] **Step 4: 修 `case-draft.ts` 联合类型收窄（原 line 88/91，TS2339）**

`resolveProject` 返回 `{ project: string } | { status: string; candidates?: string[]; reason?: string }`；`if (!projectName)` 分支里 `projectResult` 未被收窄到含 `status`/`reason` 的成员。沿用同段 line 90 已有的 `"x" in projectResult` 模式修复。把：
```ts
      status: projectResult.status || "needs_project_selection",
```
改为：
```ts
      status: ("status" in projectResult && projectResult.status) || "needs_project_selection",
```
把：
```ts
      reason: projectResult.reason || "Project selection required",
```
改为：
```ts
      reason: ("reason" in projectResult && projectResult.reason) || "Project selection required",
```
（保留 `||` 兜底语义；`"x" in projectResult` 收窄后再取值。`candidates`（line 90）原已用该模式，不改。）

- [ ] **Step 5: 修 `test-case-flow.ts` 联合类型收窄（原 line 78/81，TS2339）**

同 Step 4 模式。把：
```ts
          status: projectResult.status || "needs_project_selection",
```
改为：
```ts
          status: ("status" in projectResult && projectResult.status) || "needs_project_selection",
```
把：
```ts
          reason: projectResult.reason || "Project selection required",
```
改为：
```ts
          reason: ("reason" in projectResult && projectResult.reason) || "Project selection required",
```

- [ ] **Step 6: 重指 CLI 注册中心 import（`engine/src/cli/index.ts`）**

- line 26 `import { program as caseDraft } from "../case-draft.ts";` → `from "@skills/case-draft/scripts/case-draft.ts";`
- line 27 `import { program as caseSignalAnalyzer } from "../case-signal-analyzer.ts";` → `from "@skills/case-draft/scripts/case-signal-analyzer.ts";`
- line 28 `import { program as caseStrategyResolver } from "../case-strategy-resolver.ts";` → `from "@skills/case-draft/scripts/case-strategy-resolver.ts";`
- line 144 `import { registerTestCaseFlow } from "../test-case-flow.ts";` → `from "@skills/case-draft/scripts/test-case-flow.ts";`

（line 24 `archive-gen`、line 52 `xmind-gen` 不动——未迁移。）

- [ ] **Step 7: 重指 7 个深 import 测试（留 `engine/tests/test-case-flow/` 原位）**

逐文件改 `from` 路径（原均无 `.ts` 后缀，改后加 `.ts`）：
- `cli.test.ts`: `from "../../src/test-case-flow"` → `from "@skills/case-draft/scripts/test-case-flow.ts"`
- `project-resolver.test.ts`: `from "../../src/test-case-flow/project-resolver"` → `from "@skills/case-draft/scripts/test-case-flow/project-resolver.ts"`
- `session.test.ts`: `from "../../src/test-case-flow/session"` → `from "@skills/case-draft/scripts/test-case-flow/session.ts"`
- `enhanced-gates.test.ts`: `from "../../src/test-case-flow/session"` → `from "@skills/case-draft/scripts/test-case-flow/session.ts"`
- `source-consent.test.ts`: `from "../../src/test-case-flow/source-consent"` → `from "@skills/case-draft/scripts/test-case-flow/source-consent.ts"`
- `source-resolver.test.ts`: `from "../../src/test-case-flow/source-resolver"` → `from "@skills/case-draft/scripts/test-case-flow/source-resolver.ts"`
- `lanhu-replay.test.ts`: `from "../../src/test-case-flow/source-resolver"` → `from "@skills/case-draft/scripts/test-case-flow/source-resolver.ts"`

（`case-draft-cli.test.ts`、`engine/tests/case-signal-analyzer.test.ts`、`engine/tests/case-strategy-resolver.test.ts` 是 CLI 子进程测试、不 import 被测模块 → **不改**，靠重注册的 `kata` 子命令继续通过，亦验证 `@skills` 运行时解析。）

- [ ] **Step 8: 确认无残留旧路径引用**

Run: `rg -n "\.\./case-draft\.ts|\.\./case-signal-analyzer\.ts|\.\./case-strategy-resolver\.ts|\.\./test-case-flow\.ts|src/test-case-flow/" engine --type ts`
Expected: 无输出（CLI 与测试均已重指）。

- [ ] **Step 9: 验证绿**

Run:
```bash
bun run type-check; echo "exit=$?"
bun test --cwd engine 2>&1 | tail -8
bun run check 2>&1 | tail -3
```
Expected: `type-check exit=0`（Step 3–5 修复的 5 处错误消失，且无新错误）；engine 测试 pass 数 == 基线（含 CLI 子进程测试 `case-signal-analyzer`/`case-strategy-resolver`/`case-draft-cli` 通过 → 证明 `@skills` 运行时解析正常）；Biome 无 error。若根 gate 报出本计划未列的迁入文件错误，按同类收窄/断言模式修到 exit 0。

- [ ] **Step 10: Commit**

```bash
git add .claude/skills/case-draft/scripts engine/src/cli/index.ts engine/tests/test-case-flow
# git mv 的删除侧若未自动暂存，追加被删原路径：
git add -u engine/src
git commit -m "refactor: ✨ migrate case-draft flow modules into skill scripts"
```
（`git add -u engine/src` 仅暂存 engine/src 下已跟踪文件的删除，不波及脏 submodule。）

---

## Task 5: 迁移 playwright handoff-render + 模板 + 修类型

`handoff-render.ts` 仅被 `engine/src/cli/handoff.ts:4` import；其唯一模板 `engine/templates/handoff.md.hbs` 仅被 `handoff-render.ts:16` 读取（其余 `handoff.md` 引用均指生成产物，非模板）。迁入 playwright skill 并修 TS18046/TS2698。

**Files:**
- Move: `engine/src/cli/handoff-render.ts` → `.claude/skills/playwright-automation/scripts/handoff-render.ts`
- Move: `engine/templates/handoff.md.hbs` → `.claude/skills/playwright-automation/templates/handoff.md.hbs`
- Modify: `handoff-render.ts`（模板路径 + 类型）、`engine/src/cli/handoff.ts:4`、`engine/tests/cli/handoff-render.test.ts:5`

- [ ] **Step 1: git mv 代码与模板**

```bash
mkdir -p .claude/skills/playwright-automation/scripts .claude/skills/playwright-automation/templates
git mv engine/src/cli/handoff-render.ts .claude/skills/playwright-automation/scripts/handoff-render.ts
git mv engine/templates/handoff.md.hbs  .claude/skills/playwright-automation/templates/handoff.md.hbs
```
（`engine/templates/` 迁空后无 tracked 文件，git 自动不再跟踪该目录，无需手动 rmdir。）

- [ ] **Step 2: 修模板路径（line 16）**

`.claude/skills/playwright-automation/scripts/handoff-render.ts`：
```ts
const tmplPath = join(repoRoot(), "engine/templates/handoff.md.hbs");
```
改为：
```ts
const tmplPath = join(repoRoot(), ".claude/skills/playwright-automation/templates/handoff.md.hbs");
```

- [ ] **Step 3: 修 `loadCaseFeedback` 的 `summary` unknown（TS18046，原 line 40–46）**

把：
```ts
  const summary = JSON.parse(readFileSync(sidecarPath, "utf-8"));
  if (!validateCorrections(summary)) {
    throw new Error(
      `case-corrections-summary.json invalid (CaseCorrections@1): ${JSON.stringify(validateCorrections.errors)}`,
    );
  }
  const byCategory = summary.by_category as Record<string, number>;
```
改为（验证后落到显式类型本地变量，消除后续 `summary.*` 的 unknown）：
```ts
  const parsed = JSON.parse(readFileSync(sidecarPath, "utf-8"));
  if (!validateCorrections(parsed)) {
    throw new Error(
      `case-corrections-summary.json invalid (CaseCorrections@1): ${JSON.stringify(validateCorrections.errors)}`,
    );
  }
  const summary = parsed as {
    total: number;
    corrections_md: string;
    apply_command: string;
    by_category: Record<string, number>;
  };
  const byCategory = summary.by_category;
```
（其后 line 52–56 的 `summary.total` / `summary.corrections_md` / `summary.apply_command` 因 `summary` 已显式类型而不再报 TS18046，无需再改。）

- [ ] **Step 4: 修 `runHandoffRender` 的 spread（TS2698，原 line 76）**

把：
```ts
  writeFileSync(mdPath, tmpl({ ...data, case_feedback: caseFeedback }), "utf-8");
```
改为：
```ts
  writeFileSync(mdPath, tmpl({ ...(data as Record<string, unknown>), case_feedback: caseFeedback }), "utf-8");
```
（`data` 经 `validate(data)` 守卫后被收窄为 `unknown`，spread 前显式断言为对象类型。）

- [ ] **Step 5: 重指 importer 与测试**

- `engine/src/cli/handoff.ts` line 4 `import { runHandoffRender } from "./handoff-render.ts";` → `from "@skills/playwright-automation/scripts/handoff-render.ts";`
- `engine/tests/cli/handoff-render.test.ts` line 5 `from "../../src/cli/handoff-render.ts"` → `from "@skills/playwright-automation/scripts/handoff-render.ts"`

- [ ] **Step 6: 确认无残留引用 + 模板无其它消费者受影响**

Run:
```bash
rg -n "cli/handoff-render|engine/templates/handoff" engine --type ts
rg -n "engine/templates/handoff\.md\.hbs" .
```
Expected: 第一条仅命中（若有）注释/非 import；第二条无输出（唯一引用已改）。

- [ ] **Step 7: 验证绿**

Run:
```bash
bun run type-check; echo "exit=$?"
bun test --cwd engine 2>&1 | tail -6
bun run check 2>&1 | tail -3
```
Expected: `type-check exit=0`（handoff-render 的 TS18046×5 + TS2698×1 消失）；`engine/tests/cli/handoff-render.test.ts` 与 handoff CLI 测试 pass；Biome 无 error。

- [ ] **Step 8: Commit**

```bash
git add .claude/skills/playwright-automation/scripts .claude/skills/playwright-automation/templates engine/src/cli/handoff.ts engine/tests/cli/handoff-render.test.ts
git add -u engine/src engine/templates
git commit -m "refactor: ✨ migrate handoff-render into playwright skill bundle"
```

---

## Task 6: 删除 vestigial `context-builder.ts`

`.claude/scripts/_shared/lib/context-builder.ts`（导出 `buildSubagentContext` / `BuildContextParams`）无任何 importer，是死代码。**注意**与 active 的 `engine/src/writer-context-builder.ts`（`kata writer-context-builder` 命令，有测试）同名前缀但**完全无关**，后者不动。

**Files:**
- Delete: `.claude/scripts/_shared/lib/context-builder.ts`

- [ ] **Step 1: 复核 0 importer**

Run: `rg -n "buildSubagentContext|BuildContextParams|lib/context-builder" --type ts -g '!**/context-builder.ts'`
Expected: 无输出。若有，停下来——说明并非死代码，重新评估。

- [ ] **Step 2: 删除**

```bash
git rm .claude/scripts/_shared/lib/context-builder.ts
```

- [ ] **Step 3: 验证绿**

Run:
```bash
bun run type-check; echo "exit=$?"
bun test --cwd engine 2>&1 | tail -5
bun run check 2>&1 | tail -3
```
Expected: `type-check exit=0`（无悬空 import）；engine 测试 pass 数 == 基线；Biome 无 error。

- [ ] **Step 4: Commit**

```bash
git add .claude/scripts/_shared/lib/context-builder.ts
git commit -m "refactor: ✨ remove vestigial context-builder"
```

---

## Task 7: 最终回归 + 合并 main + 清理

**Files:** 无代码改动。

- [ ] **Step 1: worktree 内全量 gate**

Run（逐条记录 exit/计数）：
```bash
bun run type-check; echo "type-check exit=$?"
bun test --cwd engine 2>&1 | tail -6
bun run check 2>&1 | tail -3
bun run check:skills; echo "check:skills exit=$?"
bun run lint:debris; echo "lint:debris exit=$?"
bun run lint:paths; echo "lint:paths exit=$?"
bun run test:apps 2>&1 | tail -3
bun run test:plugins 2>&1 | tail -3
```
Expected: 全部 exit 0 / 全 pass。`check:skills` 应仍绿（thin-lint 的 `DIR_LINE_CAPS` 仅覆盖 phases/prompts/references/fewshots/rules，不约束新增的 `scripts/`/`templates/`）。`lint:paths` 应仍绿（迁移的测试文件留在 `engine/tests` 原位，`path-treatment.ts` 的 allowlist 路径未失效）。

- [ ] **Step 2: 确认提交范围干净（无脏 submodule、无越界文件）**

Run: `git log --oneline main..HEAD && git status --short`
Expected: 5 个本计划 commit（build/4×refactor）；`git status` 干净或仅剩主工作树固有的脏 submodule（不在本 worktree）。确认无 `plugins/lanhu/...` 出现在任何 commit：`git log -p main..HEAD -- plugins/ | head` 应无输出。

- [ ] **Step 3: 记录 HEAD SHA，回主工作树合并**

```bash
SHA=$(git rev-parse HEAD); echo "$SHA"
cd /Users/poco/Projects/kata
git merge --no-ff "$SHA" -m "merge: 🔀 整合 bundle 3 试点 skill 可执行代码迁移"
```

- [ ] **Step 4: 主工作树复验**

Run（在 `/Users/poco/Projects/kata`）：
```bash
bun run type-check; echo "exit=$?"
bun test --cwd engine 2>&1 | tail -6
```
Expected: `exit=0`；engine 测试全 pass。

- [ ] **Step 5: 推送**

```bash
git push origin main
```
（远端不可用则记录阻塞，不静默跳过。）

- [ ] **Step 6: 清理 worktree**

```bash
git worktree remove .worktrees/bundle-3-code-migration
git worktree list
```
Expected: 列表不再含 `bundle-3-code-migration`。

---

## Self-Review（已执行）

**1. Spec/范围覆盖：** 本计划交付 Plan-2 follow-up 定义的「case-draft 专属可执行模块 + handoff-render + 类型债修复 + 删 context-builder」核心，并据依赖图实测做了三处**有据的范围修正**（D4 / Scope OUT）：剔除 `verify-layers`（非 case-draft cluster）、延后 `archive-gen`/`xmind-gen`/`md-table`（疑似 case-edit 共享）、测试只就地重指不物理迁移（避免重复 infra 改动）。这些修正均在文档内标注证据与理由，供用户复核是否同意收敛后的边界。

**2. Placeholder 扫描：** 无 TBD/TODO；每个改代码步骤给出 exact 文件:行 与完整 before/after 代码块；每个验证步骤给出 exact 命令与预期。

**3. 类型一致性：** 5 处 `status`/`reason` 收窄统一用 `("x" in obj && obj.x) || fallback`；`cached` 收窄用条件前缀 `cached &&`；`handoff-render` 用「验证后显式类型本地变量」+「spread 前 `as Record<string,unknown>`」。别名统一 `@skills/case-draft/scripts/...` 与 `@skills/playwright-automation/scripts/...`；同迁移单元相对 import 明确标注不改。

**4. 顺序与每步绿：** Task 2（别名）→ Task 3（lib，独立绿）→ Task 4（flow + 类型，独立绿）→ Task 5（handoff，独立绿）→ Task 6（删死码）→ Task 7（回归/合并）。每个改代码 Task 自带 type-check + engine test + biome green bar，中途红只存在于 Task 内部、commit 前必转绿。

**5. 验证完备性：** 迁移正确性由「根 type-check exit 0」+「`bun test --cwd engine` 全 pass（含 CLI 子进程测试，间接验证 `@skills` 运行时解析）」双重把关；最终 Task 7 追加 check:skills / lint:debris / lint:paths / test:apps / test:plugins。

**6. 风险/watch-items：**
- `@skills` 运行时解析：机制同 `@shared`（现网已验证），且 CLI 子进程测试会在 Task 4 Step 9 实证；若意外失败，说明 bun tsconfig paths 解析有别于预期，需在该步排查（回退手段：改用相对 import）。
- `large-file-split.test.ts` / `output-style.test.ts` / `space-separated-style.test.ts` 扫描 `engine/src`：迁出文件只缩小其扫描集（断言为 `toEqual([])`），不会新增失败；由 engine test gate 兜底。
- 若根 gate 在迁入文件上报出本计划未列错误：按同类收窄/断言模式修到 exit 0（见验证约定）。

---

## 后续 Plan（更新后路线图，待本计划落地后再写）

依赖图实测后，原 Plan 3/4/5 编号与边界调整为：

- **Plan 4（共享渲染代码定位 + case-edit/其余 skill 代码迁移 + defect-analyze 合并）**：随 case-edit 迁移确定 `archive-gen`/`xmind-gen`/`md-table` 的最终归宿（`_shared/` 渲染库 vs 某 skill）；迁 `verify-layers` 入 cases-verify/compare 归属的 skill；迁其余 skill 专属代码；11→8 合并 `defect-analyze = bug-file + conflict-analyze + diff-scan`。
- **Plan 5（测试基础设施统一 + engine 收口删除）**：把所有 skill 测试物理迁入各自 `tests/`，重置共享 `cli-runner.ts` test helper 到公共 test-helper 位置，加 `test:skills` 脚本并入 `ci` 链、调整 `bunfig.toml`；`_shared/cli` 收口 CLI 注册中心（改从 `@skills/*` 注册全部命令）；删除 `engine/`、移除 workspace 成员；同步 `engine/bin/kata` → `.claude/scripts/_shared/bin/kata` 的所有文档路径（含 `case-draft` SKILL.md 路由摘要的 `bun engine/bin/kata features resolve`）。
- **Codex/Phase-2**：校正 `.agents/README.md:7` 的 `reviewers/`/`workers/` 前瞻描述与 `prompts/agent-<step>.md` 约定（见 Carryover 第 1 条）。
