# Bundle-11b：engine cli verb 层下沉 `_shared/cli` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `engine/src/cli/` 下 13 个 cli verb 模块整体迁到 `.claude/scripts/_shared/cli/`，只留枢纽 `index.ts` 在原地（留待 bundle-11d 最后收口），并把全部消费方（index.ts + 6 个测试）重指到 `@shared/cli/*` alias。

**Architecture:** 单一原子 commit 完成迁移。13 个 verb 文件全部落到已存在的扁平目录 `.claude/scripts/_shared/cli/`（bundle-8/9 已在此放 cases-*/features-* 命令模块）。两组簇内相对边（`env.ts → ./env-check.ts`、`results.ts → ./results-{path,prune,publish}.ts`）因源与目标同目录而原样存活；index.ts 的 9 个 `./X.ts` import 全部重指 `@shared/cli/X.ts`；6 个测试的 `../../src/cli/X.ts` import 重指 `@shared/cli/X.ts`。全部 forward dep（`@shared/*`、`@skills/*`、node 内建）保持 alias 不变。

**Tech Stack:** TypeScript + Bun；tsconfig paths alias `@shared/* → ./.claude/scripts/_shared/*`；`git mv` 保留历史；biome（`bun run check`）+ `bun test --cwd engine`。

---

## 背景与依赖分析（执行者必读）

### 这是 bundle-11（engine 收口）的第二片

engine 收口按 **leaf-first** 拆为 11a→11d：

- **11a（已合并 `0f40a269b`）**：6 个支撑库子目录（codemod/config/policy/runners/skills/telemetry，13 文件）→ `_shared/lib/`。
- **11b（本计划）**：`engine/src/cli/` 的 13 个 verb 模块 → `_shared/cli/`。枢纽 `index.ts` 不动。
- **11c（后续）**：`engine/src/` 顶层 ~23 个基础设施文件 → `_shared/cli` 或 `_shared/lib`。
- **11d（后续）**：枢纽三件套 `api.ts`/`index.ts`/`cli/index.ts` 最后迁 + `bin/kata` + `_shared/lib/paths.ts` 的 `scriptsDir()` 重指 + **物理删 `engine/`** + 根 config/test infra 统一。

### 迁移清单（13 文件，全部 flat-move 到 `.claude/scripts/_shared/cli/`）

| # | From | To |
| --- | --- | --- |
| 1 | `engine/src/cli/agents-audit.ts` | `.claude/scripts/_shared/cli/agents-audit.ts` |
| 2 | `engine/src/cli/codemod-apply.ts` | `.claude/scripts/_shared/cli/codemod-apply.ts` |
| 3 | `engine/src/cli/env-check.ts` | `.claude/scripts/_shared/cli/env-check.ts` |
| 4 | `engine/src/cli/env.ts` | `.claude/scripts/_shared/cli/env.ts` |
| 5 | `engine/src/cli/handoff.ts` | `.claude/scripts/_shared/cli/handoff.ts` |
| 6 | `engine/src/cli/paths-audit.ts` | `.claude/scripts/_shared/cli/paths-audit.ts` |
| 7 | `engine/src/cli/results-path.ts` | `.claude/scripts/_shared/cli/results-path.ts` |
| 8 | `engine/src/cli/results-prune.ts` | `.claude/scripts/_shared/cli/results-prune.ts` |
| 9 | `engine/src/cli/results-publish.ts` | `.claude/scripts/_shared/cli/results-publish.ts` |
| 10 | `engine/src/cli/results.ts` | `.claude/scripts/_shared/cli/results.ts` |
| 11 | `engine/src/cli/safety-audit-command.ts` | `.claude/scripts/_shared/cli/safety-audit-command.ts` |
| 12 | `engine/src/cli/skill-audit.ts` | `.claude/scripts/_shared/cli/skill-audit.ts` |
| 13 | `engine/src/cli/test-bucket-audit.ts` | `.claude/scripts/_shared/cli/test-bucket-audit.ts` |

迁移后 `engine/src/cli/` 只剩 `index.ts`。

### 为什么是单一原子 commit

1. **两组簇内相对边必须随迁同步**：`env.ts` import `./env-check.ts`；`results.ts` import `./results-path.ts`/`./results-prune.ts`/`./results-publish.ts`。若把一组里的文件拆到不同 commit，留在 `engine/src/cli/` 的那个会 import 一个已移走的 `./sibling.ts` → 编译断裂。因此 env 对、results 四件套各自必须整组同迁。
2. **index.ts 的 9 个 `./` import 一次性重指**最干净。拆 commit 会让 index.ts 被反复部分重指，增加 churn 与风险。
3. 全部 13 文件落同一扁平目录，`git mv` 逐文件即可（不像 11a 是整目录 mv）。

镜像 bundle-7（lint 簇）/ bundle-11a（subdir 簇）的原子迁移范式。

### 消费面（已用全仓库 grep 闭合验证）

**直接 import 这 13 verb 的，只有 index.ts（枢纽）+ 6 个 `engine/tests/cli/` 测试**，无任何 `.claude` skill 脚本引用。

index.ts 的 9 个 `./` import（全部要重指 `@shared/cli/`）：

```
engine/src/cli/index.ts:117  buildAgentsCommand      from "./agents-audit.ts"
engine/src/cli/index.ts:118  buildCodemodCommand     from "./codemod-apply.ts"
engine/src/cli/index.ts:119  buildEnvCommand         from "./env.ts"
engine/src/cli/index.ts:120  buildHandoffCommand     from "./handoff.ts"
engine/src/cli/index.ts:121  buildPathsCommand       from "./paths-audit.ts"
engine/src/cli/index.ts:122  buildResultsCommand     from "./results.ts"
engine/src/cli/index.ts:123  buildSafetyCommand      from "./safety-audit-command.ts"
engine/src/cli/index.ts:124  buildSkillsCommand      from "./skill-audit.ts"
engine/src/cli/index.ts:138  registerTestBucketAudit from "./test-bucket-audit.ts"
```

> 注意：index.ts **只直接 import 9 个**。另 4 个（`env-check`、`results-path`、`results-prune`、`results-publish`）不被 index.ts 引用，只被兄弟模块（env.ts / results.ts）和各自测试引用——它们随簇内边同迁，无需在 index.ts 动。迁移后 index.ts 的 `./` import 归零。

6 个测试 import（全部要重指 `@shared/cli/`）：

```
engine/tests/cli/env-check.test.ts:5       runEnvCheck       from "../../src/cli/env-check.ts"
engine/tests/cli/results-path.test.ts:5    runResultsPath    from "../../src/cli/results-path.ts"
engine/tests/cli/results-prune.test.ts:5   runResultsPrune   from "../../src/cli/results-prune.ts"
engine/tests/cli/results-publish.test.ts:5 runResultsPublish from "../../src/cli/results-publish.ts"
engine/tests/cli/paths-audit.test.ts:3     isKnownSafe       from "../../src/cli/paths-audit.ts"
engine/tests/cli/skills-audit.test.ts:6    listSkillDirNames from "../../src/cli/skill-audit.ts"
```

> 测试文件**留在 `engine/tests/cli/` 原地**（测试基础设施统一推迟到 11d），本计划只改它们的 import 路径。

### 已排查的非问题（不要在这些上浪费时间）

- **paths-audit.ts 的 isKnownSafe「自引用」是非问题**。bundle-11a §后续曾标注「paths-audit.ts isKnownSafe string self-ref like bundle-7」，需复核 path-treatment lint 是否会在新位置标记 paths-audit.ts 内的路径字符串。**已核实**：`.claude/scripts/_shared/lint/path-treatment.ts` 当前只有 2 条活跃规则——P-S2（regex `bun\s+test\s+\./\.claude/scripts/__tests__`）和 P-S3（regex `workspace/[^/\s]+/(prds|archive|xmind|tests)/`）；P-S1/P-S4（曾针对 `.claude/scripts/`、`engine/src/` 引用）**已退役**。paths-audit.ts 内的字符串（`.claude/scripts/_shared/lint/`、`engine/tests/lint/`、`engine/tests/cli/paths-audit.test.ts`、`.claude/settings.local.json`、`.claude/agents/`、`docs/superpowers/plans/` 等）**零匹配 P-S2/P-S3**。`.claude/scripts/_shared/cli/` 会被 lint 扫描（`.ts` 在 SCAN_SUFFIXES、不在 EXCLUDED），但因无匹配字符串 → 移动后**不产生新违规，无需新增 isKnownSafe 白名单条目**。lint:paths 基线 `total=8 (8 known-safe skipped)` exit 0，迁移后应保持不变。
- **isKnownSafe 白名单里的 `engine/tests/cli/paths-audit.test.ts` 不用改**：该测试文件留在原地（11b 不迁测试），字符串仍有效。
- **handoff.ts 的 `@skills/playwright-automation/scripts/handoff-render.ts` 不用改**：forward dep（engine → @skills），已是 alias，文件移动不影响 alias 解析。
- **`.agents/` 无需同步**：`.agents/` 下无 cli 脚本目录、无 paths-audit/skill-audit 等镜像（Codex Phase-2 占位）。本片只搬 engine cli verb 到 `_shared`，对应 Codex 侧无文件——按 Phase-1 降级义务，仅需确认 `.agents/README.md` 仍准确描述占位状态，无文件改动。
- **全仓库唯一 `engine/src/cli/` 字符串引用是 `engine/tests/source-ref.test.ts:9` 指向 `index.ts`**（11d 枢纽），**13 verb 文件零字符串引用** → 本片无 invokeJson/audit 串更新。

### 关键约束

- 只用路径限定 `git mv <from> <to>` 与 `git add <path>`；**严禁 `git add -A` / `git add .`**（避免脏 submodule `plugins/lanhu/mcp-bridge/lanhu-mcp`、`.DS_Store` 孤儿、历史 `docs/superpowers/plans/.process/**` 删除被卷入）。
- Worktree-first：detached `.worktrees/bundle-11b`，不建分支。
- 改后即测：本片 commit 内必须跑相关测试并全绿，再 merge。
- perl 替换的替换段含 `@shared` 时**必须写 `\@shared`**：未转义的 `@shared` 会被 perl 当数组插值成空串，产出 `/cli/$1.ts` 这种坏路径。

---

### Task 1: 建立 worktree 与迁移前基线

**Files:**
- 无源码改动；只建 worktree、symlink runtime、抓基线。

- [ ] **Step 1: 确认主工作树干净，记录 main HEAD**

Run:
```bash
cd /Users/poco/Projects/kata
git status --short
git rev-parse --short HEAD
```
Expected: `git status --short` 输出为空（无未提交改动；若有，先按项目规则 `git add -A && git commit -m "chore: 🧹 save pre-worktree local changes"` 做 pre-worktree 快照，再继续）。HEAD 应为 bundle-11a 合并后的 main（`0f40a269b` 或更新）。

- [ ] **Step 2: 创建 detached worktree**

Run:
```bash
cd /Users/poco/Projects/kata
git worktree add --detach .worktrees/bundle-11b main
```
Expected: `Preparing worktree (detached HEAD ...)`，`.worktrees/bundle-11b` 创建成功。

- [ ] **Step 3: symlink ignored runtime 目录（只读证据，供测试解析）**

Run:
```bash
cd /Users/poco/Projects/kata
ROOT=$(pwd)
W="$ROOT/.worktrees/bundle-11b"
for proj in "$ROOT"/workspace/*/; do
  name=$(basename "$proj")
  if [ -d "$proj/.kata" ]; then
    mkdir -p "$W/workspace/$name"
    ln -s "$ROOT/workspace/$name/.kata" "$W/workspace/$name/.kata"
  fi
done
echo "symlink-done"
```
Expected: 输出 `symlink-done`。本片是纯代码迁移、不读 workspace 业务数据，此步是保险；若 `workspace/` 为空则直接跳过。

- [ ] **Step 4: 抓迁移前基线（全部应为绿/已知态）**

Run（在 worktree 内）:
```bash
cd /Users/poco/Projects/kata/.worktrees/bundle-11b
bun run lint:paths
bun run check:skills
bun test engine/tests/cli 2>&1 | tail -15
bun run check 2>&1 | tail -8
```
Expected:
- `lint:paths`：`[paths audit] total=8 (8 known-safe skipped)`，exit 0。
- `check:skills`：exit 0（skill frontmatter 同步通过）。
- `bun test engine/tests/cli`：全 pass（记录确切 pass 数）。
- `bun run check`（`biome check .`）：exit 0。

记录这 4 项基线数字（尤其 `engine/tests/cli` 的 pass 计数与 lint:paths 的 total=8），Task 2 迁移后需逐项对齐。

- [ ] **Step 5: 不 commit，进入 Task 2**

本 Task 无文件改动，无需 commit。

---

### Task 2: 原子迁移 13 个 cli verb 模块（单一 commit）

**Files:**
- Move: 上表 13 个 `engine/src/cli/*.ts` → `.claude/scripts/_shared/cli/*.ts`
- Modify: `engine/src/cli/index.ts`（9 个 `./` import → `@shared/cli/`）
- Modify(Test): `engine/tests/cli/{env-check,results-path,results-prune,results-publish,paths-audit,skills-audit}.test.ts`（各 1 个 `../../src/cli/X.ts` import → `@shared/cli/X.ts`）

> 全部在 worktree `/Users/poco/Projects/kata/.worktrees/bundle-11b` 内操作。

- [ ] **Step 1: `git mv` 全部 13 个 verb 文件到 `_shared/cli/`**

Run:
```bash
cd /Users/poco/Projects/kata/.worktrees/bundle-11b
D=.claude/scripts/_shared/cli
git mv engine/src/cli/agents-audit.ts          "$D/agents-audit.ts"
git mv engine/src/cli/codemod-apply.ts         "$D/codemod-apply.ts"
git mv engine/src/cli/env-check.ts             "$D/env-check.ts"
git mv engine/src/cli/env.ts                   "$D/env.ts"
git mv engine/src/cli/handoff.ts               "$D/handoff.ts"
git mv engine/src/cli/paths-audit.ts           "$D/paths-audit.ts"
git mv engine/src/cli/results-path.ts          "$D/results-path.ts"
git mv engine/src/cli/results-prune.ts         "$D/results-prune.ts"
git mv engine/src/cli/results-publish.ts       "$D/results-publish.ts"
git mv engine/src/cli/results.ts               "$D/results.ts"
git mv engine/src/cli/safety-audit-command.ts  "$D/safety-audit-command.ts"
git mv engine/src/cli/skill-audit.ts           "$D/skill-audit.ts"
git mv engine/src/cli/test-bucket-audit.ts     "$D/test-bucket-audit.ts"
```
Expected: 13 个 `git mv` 全部成功，无报错。

- [ ] **Step 2: 验证 `engine/src/cli/` 只剩 `index.ts`**

Run:
```bash
cd /Users/poco/Projects/kata/.worktrees/bundle-11b
ls -1 engine/src/cli/
```
Expected: 只输出 `index.ts`。

- [ ] **Step 3: 重指 index.ts 的 9 个 `./` import → `@shared/cli/`**

Run:
```bash
cd /Users/poco/Projects/kata/.worktrees/bundle-11b
perl -pi -e 's{from "\./([a-z-]+)\.ts"}{from "\@shared/cli/$1.ts"}g' engine/src/cli/index.ts
```
说明：迁移后 index.ts 的所有 `./X.ts` import 都指向已移走的 verb（其余 import 用 `../` 或已是 alias），故 catch-all 安全。`\@` 转义防 perl 数组插值。

- [ ] **Step 4: 验证 index.ts 已无 `./` import，且 9 个 `@shared/cli/` import 就位**

Run:
```bash
cd /Users/poco/Projects/kata/.worktrees/bundle-11b
echo "--- residual ./ imports (should be empty) ---"
grep -nE 'from "\./' engine/src/cli/index.ts || echo "NONE-OK"
echo "--- new @shared/cli imports ---"
grep -nE 'from "@shared/cli/(agents-audit|codemod-apply|env|handoff|paths-audit|results|safety-audit-command|skill-audit|test-bucket-audit)\.ts"' engine/src/cli/index.ts
```
Expected: 第一段输出 `NONE-OK`（无残留 `./` import）；第二段输出 9 行 `@shared/cli/*` import。

- [ ] **Step 5: 重指 6 个测试的 `../../src/cli/X.ts` import → `@shared/cli/X.ts`**

Run:
```bash
cd /Users/poco/Projects/kata/.worktrees/bundle-11b
perl -pi -e 's{from "\.\./\.\./src/cli/([a-z-]+)\.ts"}{from "\@shared/cli/$1.ts"}g' \
  engine/tests/cli/env-check.test.ts \
  engine/tests/cli/results-path.test.ts \
  engine/tests/cli/results-prune.test.ts \
  engine/tests/cli/results-publish.test.ts \
  engine/tests/cli/paths-audit.test.ts \
  engine/tests/cli/skills-audit.test.ts
```
说明：这 6 个文件各只有 1 个 `../../src/cli/` import（均指向被迁 verb，无人 import `index.ts`），故按 verb 名 catch-all 安全。`\@` 转义同上。

- [ ] **Step 6: 验证 6 个测试已重指、簇内相对边存活**

Run:
```bash
cd /Users/poco/Projects/kata/.worktrees/bundle-11b
echo "--- tests now point at @shared/cli (expect 6) ---"
grep -rn 'from "@shared/cli/' engine/tests/cli/ | grep -E '(env-check|results-path|results-prune|results-publish|paths-audit|skill-audit)\.ts'
echo "--- no residual ../../src/cli/ in tests (should be empty) ---"
grep -rn '\.\./\.\./src/cli/' engine/tests/cli/ || echo "NONE-OK"
echo "--- intra-cluster ./ edges survive in moved files ---"
grep -nE 'from "\./(env-check|results-path|results-prune|results-publish)\.ts"' \
  .claude/scripts/_shared/cli/env.ts .claude/scripts/_shared/cli/results.ts
```
Expected:
- 第一段：6 行 `@shared/cli/*` import。
- 第二段：`NONE-OK`。
- 第三段：4 行——`env.ts` 的 `./env-check.ts` + `results.ts` 的 `./results-path.ts`/`./results-prune.ts`/`./results-publish.ts`（原样保留，证明簇内边随迁存活）。

- [ ] **Step 7: 跑相关测试 + lint，对齐基线**

Run:
```bash
cd /Users/poco/Projects/kata/.worktrees/bundle-11b
bun test engine/tests/cli 2>&1 | tail -15
bun run lint:paths
bun run check:skills
bun run check 2>&1 | tail -8
bun run lint 2>&1 | tail -8
```
Expected:
- `bun test engine/tests/cli`：pass 数与 Task 1 Step 4 基线一致，0 fail。
- `lint:paths`：`total=8 (8 known-safe skipped)` exit 0（与基线一致，证明 paths-audit.ts 移动未引入新违规）。
- `check:skills`：exit 0（证明 index.ts → `@shared/cli/skill-audit.ts` 注册链通）。
- `bun run check`（`biome check .`）：exit 0（覆盖新 `_shared/cli/*` 文件）。
- `bun run lint`（`biome check engine/src ...`）：exit 0（engine/src/cli 现仅 index.ts；覆盖面缩小符合预期）。

任一失败必须在本 worktree 内排查根因并修复，禁止 skip/TODO/注释掉。

- [ ] **Step 8: 端到端冒烟——确认 kata CLI 经 index.ts 仍能加载迁移后的 verb**

Run:
```bash
cd /Users/poco/Projects/kata/.worktrees/bundle-11b
bun .claude/scripts/_shared/bin/kata results path --help 2>&1 | tail -5
bun .claude/scripts/_shared/bin/kata env check 2>&1 | tail -5 || true
```
Expected: `kata results path --help` 正常打印用法（证明 index.ts → `@shared/cli/results.ts` → `./results-path.ts` 链路通）；`kata env check` 正常执行（可能因环境给出非零业务退出码，但**不得**是模块解析/import 报错）。若出现 `Cannot find module` 等 import 错误，回头检查 Step 3/5。

- [ ] **Step 9: 路径限定暂存并 commit（单一原子 commit）**

Run:
```bash
cd /Users/poco/Projects/kata/.worktrees/bundle-11b
git add .claude/scripts/_shared/cli/ engine/src/cli/index.ts engine/tests/cli/
git status --short
```
Expected：`git status --short` 只显示本次迁移相关条目——13 个 `R` 重命名（`engine/src/cli/* -> .claude/scripts/_shared/cli/*`）、`M engine/src/cli/index.ts`、6 个 `M engine/tests/cli/*.test.ts`。**不得**出现 submodule、`.DS_Store` 或无关文件；若有，逐个 `git restore --staged <path>` 剔除。

Run:
```bash
cd /Users/poco/Projects/kata/.worktrees/bundle-11b
git commit -m "refactor: ✨ move engine cli verbs to _shared/cli"
```
Expected: commit 成功；message 符合 `type: emoji description`（refactor → ✨），≤72 字符。

- [ ] **Step 10: 记录 worktree HEAD SHA**

Run:
```bash
cd /Users/poco/Projects/kata/.worktrees/bundle-11b
git rev-parse HEAD
```
Expected: 输出 40 位 SHA；记下供 Task 3 merge 使用。

---

### Task 3: 合并回 main、push、清理 worktree

**Files:**
- 无源码改动；只做 merge / push / cleanup。

- [ ] **Step 1: 回主工作树，确认干净**

Run:
```bash
cd /Users/poco/Projects/kata
git status --short
```
Expected: 空输出（主工作树无未提交改动）。

- [ ] **Step 2: `--no-ff` 合并 worktree HEAD（用 Task 2 Step 10 的 SHA）**

Run（把 `<SHA>` 替换为 Task 2 Step 10 记录的值）:
```bash
cd /Users/poco/Projects/kata
git merge --no-ff <SHA> -m "merge: 🔀 整合 bundle 11b engine cli verb 下沉 _shared/cli"
```
Expected: merge 成功，生成 merge commit；无冲突（main 自 worktree 创建以来未动这些文件）。若有冲突，停止并排查（不应发生）。

- [ ] **Step 3: 合并后在 main 上重新验证**

Run:
```bash
cd /Users/poco/Projects/kata
bun run lint:paths
bun run check:skills
bun test 2>&1 | tail -20
```
Expected:
- `lint:paths`：`total=8 (8 known-safe skipped)` exit 0。
- `check:skills`：exit 0。
- `bun test`（全量 `bun test --cwd engine`）：全 pass，0 fail。**这是 merge 前最终确认**；任一失败必须修复后才能 push。

- [ ] **Step 4: push 到 origin/main**

Run:
```bash
cd /Users/poco/Projects/kata
git push origin main
```
Expected: push 成功（`<old>..<new>  main -> main`）。若远端不可用，记录阻塞，**不得**静默跳过。

- [ ] **Step 5: 清理 worktree**

Run:
```bash
cd /Users/poco/Projects/kata
git worktree remove .worktrees/bundle-11b
git worktree list
```
Expected: `bundle-11b` 从列表消失；detached worktree 无分支删除步骤。

- [ ] **Step 6: 确认 local == origin**

Run:
```bash
cd /Users/poco/Projects/kata
git rev-parse HEAD
git rev-parse origin/main
```
Expected: 两个 SHA 一致。

---

## §后续 roadmap（11b 之后的剩余收口，供后续 plan 编写参考）

- **bundle-11c（engine 顶层基础设施层）**：`engine/src/` 顶层 ~23 个文件（非 `cli/`、非已迁子目录）→ 按职责分流到 `_shared/cli`（命令型）或 `_shared/lib`（库型）。编写前必须：
  - 重新测绘顶层文件的依赖 DAG（哪些是命令注册、哪些是纯库、哪些有簇内边）。
  - 处理 `.claude/skills/case-draft/scripts/case-signal-analyzer.ts` 的字符串引用 `"engine/src/source-analyze.ts"`（约 :124）与 `"engine/src/search-filter.ts"`（约 :178）——这些是 invokeJson 的 disk-path 字符串，迁文件后需同步更新。
  - 排查 audit/CLI 测试里对顶层文件的字符串引用（dead-code-cleanup / discuss-cli / init-wizard / output-style / paths.test / source-ref 等）。
- **bundle-11d（枢纽收口 + 物理删 engine）**：
  - `engine/src/api.ts`、`engine/src/index.ts`、`engine/src/cli/index.ts` 三件套**最后**迁（它们 import 面最广）。
  - `engine/bin/kata` 入口迁移 / 重指。
  - `.claude/scripts/_shared/lib/paths.ts:246-247` 的 `scriptsDir()` 返回 `resolve(repoRoot(), "engine/src")` —— 这是仅存的 `_shared → engine` 字符串边，在此片重指（其唯一消费者是 `engine/tests/lib/paths.test.ts`）。
  - `engine/tests/source-ref.test.ts:9` 的 `engine/src/cli/index.ts` 字符串引用随枢纽迁移更新。
  - 物理删 `engine/`；统一根 `package.json`（workspaces / `lint` / `test` / `lint:paths` 等脚本指向新结构）与测试基础设施（`engine/tests/` 是否迁、`bun test --cwd engine` 是否改）。
- **phases-md 决策**：spec §10 commit 4-5 的编排文件落点，需用户确认后再排 plan。
- **Codex Phase-2**：`.agents/**` 对称适配，解掉 `lint:skills:codex` 的 13 个 known-red 占位。

---

## Self-Review

**1. Spec coverage（迁移清单逐项可达）**：13 文件全部在 Task 2 Step 1 的 `git mv` 列出；index.ts 9 个 import 在 Step 3 重指、Step 4 验证；6 测试在 Step 5 重指、Step 6 验证；簇内边在 Step 6 第三段验证存活。消费面已用全仓库 grep 闭合（只有 index.ts + 6 测试），无遗漏。

**2. Placeholder scan**：无 TBD/TODO/「适当处理」类占位。每个 code step 给出确切命令与期望输出。`<SHA>` 是 Task 3 唯一占位，已明确指向 Task 2 Step 10 的记录值。

**3. Type/path consistency**：
- alias 一致：全部用 `@shared/cli/<basename>.ts`，与 tsconfig `@shared/* → ./.claude/scripts/_shared/*` 对齐，落点 `.claude/scripts/_shared/cli/` 已存在、无碰撞。
- perl 一致：index.ts 用 `from "\./([a-z-]+)\.ts"`、测试用 `from "\.\./\.\./src/cli/([a-z-]+)\.ts"`，替换段统一 `\@shared/cli/$1.ts`（`\@` 转义已在「关键约束」与各 step 重申）。
- commit 规范一致：迁移 commit `refactor: ✨ ...`、merge commit `merge: 🔀 ...`，type 小写、≤72 字符。

**4. 风险复核**：paths-audit.ts 的 isKnownSafe「自引用」经 path-treatment lint 规则核实为非问题（P-S1/P-S4 已退役，剩余 P-S2/P-S3 零匹配），已在背景「已排查的非问题」记录，Task 2 Step 7 用 lint:paths `total=8` 守住。`.agents/` 无镜像，按 Phase-1 降级仅确认 README 占位描述准确。

