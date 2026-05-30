# Bundle-9 features 簇下沉 `_shared` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 features 簇（3 个领域文件 + 6 个 cli 文件）整体迁出 `engine/`，领域文件落 `.claude/scripts/_shared/lib/features/`、cli 文件落 `.claude/scripts/_shared/cli/`，让 `kata features` 命令族脱离 engine 源码树。

**Architecture:** 依赖图驱动的 2 个独立绿 commit，按「领域 → cli」依赖序串联：先搬 `engine/src/features/{paths,run-id,slug}.ts`（零反向依赖，仅 forward 到 `@shared/lib/paths.ts` 或纯 stdlib），把全部消费者重指到 `@shared/lib/features/*`；再搬 cli 六元组（簇内 `./features-*` 相对 import 随迁存活，仅需重指外部消费者 `index.ts`/`api.ts`/cli 测试）。每个 commit 内 `git mv` 破坏的 import 在提交前补齐，保证逐 commit 可编译可测。

**Tech Stack:** TypeScript + Bun test；`@shared/*` → `./.claude/scripts/_shared/*`、`@skills/*` → `./.claude/skills/*`（`tsconfig.base.json`）；`git mv` 保留历史；biome organize-imports 收口新文件 import 顺序。

---

## 背景：依赖图调查结论（执行前已实测）

调查命令与结论（全部基于 bundle-8 合并后的 main，HEAD=`19370b77a`）：

1. **领域三元组零反向依赖** —— `engine/src/features/`：
   - `paths.ts` → `import { repoRoot } from "@shared/lib/paths.ts"` + `node:path`（forward，合法）
   - `run-id.ts` → 仅 `node:crypto`
   - `slug.ts` → `node:crypto` + `pinyin-pro`
   - 三者**互不 import**，均为叶子模块；无一条 `@shared → engine` 反向边。`pinyin-pro` 同时在根 `package.json:55` 与 `engine/package.json:23`，`_shared` 可解析。

2. **cli 六元组簇内相对依赖（随迁存活）：**
   - `features.ts` → `@shared/cli/features-lint.ts` + `@shared/lib/cli.ts` + `@shared/lib/paths.ts`（均 forward，已是 `@shared`）+ `commander` + `./features-{index,ls,new,resolve,show}.ts`（簇内）
   - `features-index.ts` → `./features-ls.ts`（簇内）
   - `features-ls.ts` → 纯 stdlib + `yaml`（叶子）
   - `features-new.ts` → `../features/slug.ts`（领域）+ `./features-index.ts`（簇内）
   - `features-resolve.ts` → `../features/slug.ts`（领域）
   - `features-show.ts` → 纯 stdlib + `yaml`（叶子）
   - 六元组全部落同一个 `_shared/cli/` 目录后，`./features-*.ts` 相对 import **原样存活**，无需改写；只有 `../features/slug.ts`（跨到领域目录）需重指 `@shared/lib/features/slug.ts`。

3. **外部消费者（留 engine，重指为 forward）：**
   - `engine/src/cli/results-path.ts:3` → `../features/run-id.ts`（results-path 不属本簇，留 engine 待 bundle-11；重指 `@shared/lib/features/run-id.ts`）
   - `engine/src/api.ts:23-26` → re-export `runFeaturesLs`/`FeatureRow`/`FeaturesLsContext`/`runFeaturesShow`/`FeaturesShowContext`（api.ts 留 engine 待 bundle-11；重指 `@shared/cli/features-{ls,show}.ts`）
   - `engine/src/cli/index.ts:120,133` → `import { buildFeaturesCommand } from "./features.ts"` + `kata.addCommand(buildFeaturesCommand())`（注册中心留 engine 待 bundle-11；重指 `@shared/cli/features.ts`）

4. **测试消费者：**
   - 领域：`engine/tests/features/{paths,slug,run-id,slug-derive}.test.ts`（4 个，全部 `../../src/features/*`）
   - cli：`engine/tests/cli/features-{show,index,new,resolve,ls}.test.ts`（5 个，全部 `../../src/cli/features-*`）
   - **不需改的测试：** `engine/tests/cli/features-resolve-cli.test.ts`（execSync 黑盒跑 `bun engine/bin/kata features --help`，不 import 模块）；`engine/tests/cli/features-lint.test.ts`（import `@shared/cli/features-lint.ts`，是已迁的 lint，非本簇）。

5. **无字符串自引用需改** —— 全仓扫描 `paths-audit.ts` / `dead-code-cleanup.test.ts` 等无任何 `src/features` / `cli/features` 字符串路径（与 bundle-7 不同、与 bundle-8 一致），省一类改动。

6. **worktree 无需 symlink runtime 目录** —— features/cli 测试全部用 `scratch` 临时目录自建 `workspace/dataAssets/...`，不读真实 `workspace/{project}/.kata`；`paths.test.ts` 仅 regex 断言，`features-resolve-cli.test.ts` 仅跑 `--help`。纯 TS 模块搬迁。

7. **`.agents/` 同步义务（Phase 1 降级）** —— `.agents/README.md` 仍准确描述 Codex Phase 2 占位状态（"本目录下 `skills/<id>/` 当前仍是 Phase 1 旧 SKILL.md 副本，不保证可用"）。本 bundle 不触碰 Codex runtime 路由/产物语义，确认占位描述无需更新即可。

## Scope

**IN（本 plan 迁移）：**
- 领域三元组 `engine/src/features/{paths,run-id,slug}.ts` → `.claude/scripts/_shared/lib/features/`
- cli 六元组 `engine/src/cli/{features,features-index,features-ls,features-new,features-resolve,features-show}.ts` → `.claude/scripts/_shared/cli/`
- 重指 9 个外部消费者（`results-path.ts` ×1、`api.ts` ×4、`index.ts` ×1、9 个测试文件中的 import）

**OUT（留待后续 bundle）：**
- `engine/src/cli/results-path.ts` 自身（仅重指其 run-id import，文件留 engine → bundle-11）
- `engine/src/api.ts` 自身（仅重指，文件留 engine → bundle-11）
- `engine/src/cli/index.ts` 注册中心自身（仅重指，文件留 engine → bundle-11）
- 其余 engine/src 基础设施、skill-exclusive 命令（bundle-10/11）

## File Structure

### 迁移表 A：领域三元组 → `_shared/lib/features/`（Task 1）

| From | To | Alias |
| --- | --- | --- |
| `engine/src/features/paths.ts` | `.claude/scripts/_shared/lib/features/paths.ts` | `@shared/lib/features/paths.ts` |
| `engine/src/features/run-id.ts` | `.claude/scripts/_shared/lib/features/run-id.ts` | `@shared/lib/features/run-id.ts` |
| `engine/src/features/slug.ts` | `.claude/scripts/_shared/lib/features/slug.ts` | `@shared/lib/features/slug.ts` |

迁移文件内部：`paths.ts` 已用 `@shared/lib/paths.ts`，`run-id.ts`/`slug.ts` 无 sibling import —— 三个文件**自身无需改 import**。

### 迁移表 B：cli 六元组 → `_shared/cli/`（Task 2）

| From | To | Alias |
| --- | --- | --- |
| `engine/src/cli/features.ts` | `.claude/scripts/_shared/cli/features.ts` | `@shared/cli/features.ts` |
| `engine/src/cli/features-index.ts` | `.claude/scripts/_shared/cli/features-index.ts` | `@shared/cli/features-index.ts` |
| `engine/src/cli/features-ls.ts` | `.claude/scripts/_shared/cli/features-ls.ts` | `@shared/cli/features-ls.ts` |
| `engine/src/cli/features-new.ts` | `.claude/scripts/_shared/cli/features-new.ts` | `@shared/cli/features-new.ts` |
| `engine/src/cli/features-resolve.ts` | `.claude/scripts/_shared/cli/features-resolve.ts` | `@shared/cli/features-resolve.ts` |
| `engine/src/cli/features-show.ts` | `.claude/scripts/_shared/cli/features-show.ts` | `@shared/cli/features-show.ts` |

迁移文件内部：六元组簇内 `./features-*.ts` 相对 import 随迁存活；`features-new.ts`/`features-resolve.ts` 的 `../features/slug.ts` 已在 Task 1 重指为 `@shared/lib/features/slug.ts`，无需在 Task 2 再动。

### 重指汇总（按文件）

| 文件 | 行 | 旧 import | 新 import | 所属 Task |
| --- | --- | --- | --- | --- |
| `engine/src/cli/features-new.ts` | 4 | `../features/slug.ts` | `@shared/lib/features/slug.ts` | 1 |
| `engine/src/cli/features-resolve.ts` | 10 | `../features/slug.ts` | `@shared/lib/features/slug.ts` | 1 |
| `engine/src/cli/results-path.ts` | 3 | `../features/run-id.ts` | `@shared/lib/features/run-id.ts` | 1 |
| `engine/tests/features/paths.test.ts` | 8 | `../../src/features/paths.ts` | `@shared/lib/features/paths.ts` | 1 |
| `engine/tests/features/slug.test.ts` | 2 | `../../src/features/slug.ts` | `@shared/lib/features/slug.ts` | 1 |
| `engine/tests/features/run-id.test.ts` | 2 | `../../src/features/run-id.ts` | `@shared/lib/features/run-id.ts` | 1 |
| `engine/tests/features/slug-derive.test.ts` | 2 | `../../src/features/slug.ts` | `@shared/lib/features/slug.ts` | 1 |
| `engine/src/cli/index.ts` | 120 | `./features.ts` | `@shared/cli/features.ts` | 2 |
| `engine/src/api.ts` | 23 | `./cli/features-ls.ts` | `@shared/cli/features-ls.ts` | 2 |
| `engine/src/api.ts` | 24 | `./cli/features-ls.ts` | `@shared/cli/features-ls.ts` | 2 |
| `engine/src/api.ts` | 25 | `./cli/features-show.ts` | `@shared/cli/features-show.ts` | 2 |
| `engine/src/api.ts` | 26 | `./cli/features-show.ts` | `@shared/cli/features-show.ts` | 2 |
| `engine/tests/cli/features-show.test.ts` | 6 | `../../src/cli/features-show.ts` | `@shared/cli/features-show.ts` | 2 |
| `engine/tests/cli/features-index.test.ts` | 6 | `../../src/cli/features-index.ts` | `@shared/cli/features-index.ts` | 2 |
| `engine/tests/cli/features-new.test.ts` | 7 | `../../src/cli/features-new.ts` | `@shared/cli/features-new.ts` | 2 |
| `engine/tests/cli/features-resolve.test.ts` | 5 | `../../src/cli/features-resolve.ts` | `@shared/cli/features-resolve.ts` | 2 |
| `engine/tests/cli/features-ls.test.ts` | 6 | `../../src/cli/features-ls.ts` | `@shared/cli/features-ls.ts` | 2 |

---

## Task 1: 创建 detached worktree 与删除前基线

**Files:**
- 无源码改动；建立隔离工作区并记录基线。

- [ ] **Step 1: 提交主工作树现有改动（pre-worktree 快照）**

主工作树须干净。若存在 tracked/untracked 改动（不含 dirty submodule `plugins/lanhu/mcp-bridge/lanhu-mcp`），先快照：

Run:
```bash
git -C /Users/poco/Projects/kata status -sb
# 若有非 submodule 改动：git add <具体路径> && git commit -m "chore: 🧹 save pre-worktree local changes"
```
Expected: `## main...origin/main` 且无待提交改动；不得 `git add -A`/`git add .`。

- [ ] **Step 2: 创建 detached worktree**

Run:
```bash
cd /Users/poco/Projects/kata
git worktree add --detach .worktrees/bundle-9-features main
cd .worktrees/bundle-9-features
```
Expected: worktree 检出到 `main` HEAD（`19370b77a` 或更新）。**无需 symlink `.kata`**（背景结论 6）。

- [ ] **Step 3: 记录删除前基线（全量测试）**

Run:
```bash
bun test --cwd engine 2>&1 | tail -5
```
Expected: 与既有基线一致（`1358 pass / 1 skip / 0 fail` 量级，0 fail）。记录确切 pass/skip/fail 数作为回归对照。

- [ ] **Step 4: 确认 `_shared/lib/features/` 为新命名空间**

Run:
```bash
ls .claude/scripts/_shared/lib/features 2>&1 || echo "NEW namespace (expected)"
grep -rn "@shared/\(lib/features\|cli/features\)\b" --include="*.ts" . | grep -v node_modules | grep -v "features-lint"
```
Expected: 目录不存在（git mv 会创建）；除已迁的 `features-lint` 外无 `@shared/lib/features` 或 `@shared/cli/features` 引用。

---

## Task 2: 领域三元组 → `_shared/lib/features/`

**Files:**
- Move: `engine/src/features/{paths,run-id,slug}.ts` → `.claude/scripts/_shared/lib/features/`
- Modify: `engine/src/cli/features-new.ts:4`、`engine/src/cli/features-resolve.ts:10`、`engine/src/cli/results-path.ts:3`
- Test: `engine/tests/features/{paths,slug,run-id,slug-derive}.test.ts`（重指）

- [ ] **Step 1: `git mv` 领域三元组**

Run:
```bash
mkdir -p .claude/scripts/_shared/lib/features
git mv engine/src/features/paths.ts   .claude/scripts/_shared/lib/features/paths.ts
git mv engine/src/features/run-id.ts  .claude/scripts/_shared/lib/features/run-id.ts
git mv engine/src/features/slug.ts    .claude/scripts/_shared/lib/features/slug.ts
```
Expected: 三个文件移动，`engine/src/features/` 目录清空（git 不追踪空目录）。三个被移动文件**自身 import 无需改**（`paths.ts` 已用 `@shared/lib/paths.ts`，另两者无 sibling import）。

- [ ] **Step 2: 重指 engine 侧消费者（forward 到 @shared）**

`engine/src/cli/features-new.ts` 第 4 行：

```ts
// 旧
import { buildFeatureId, isValidSlug } from "../features/slug.ts";
// 新
import { buildFeatureId, isValidSlug } from "@shared/lib/features/slug.ts";
```

`engine/src/cli/features-resolve.ts` 第 3-10 行的多行 import 尾部 `from`：

```ts
import {
  buildFeatureId,
  deriveSlugFromSource,
  hexFallbackSlug,
  isValidSlug,
  type SlugSource,
  sanitizeSlug,
} from "@shared/lib/features/slug.ts";   // 旧为 "../features/slug.ts"
```

`engine/src/cli/results-path.ts` 第 3 行：

```ts
// 旧
import { generateRunId } from "../features/run-id.ts";
// 新
import { generateRunId } from "@shared/lib/features/run-id.ts";
```

- [ ] **Step 3: 重指领域测试（4 个）**

```ts
// engine/tests/features/paths.test.ts:8   "../../src/features/paths.ts"   → "@shared/lib/features/paths.ts"
// engine/tests/features/slug.test.ts:2     "../../src/features/slug.ts"    → "@shared/lib/features/slug.ts"
// engine/tests/features/run-id.test.ts:2   "../../src/features/run-id.ts"  → "@shared/lib/features/run-id.ts"
// engine/tests/features/slug-derive.test.ts:2 "../../src/features/slug.ts" → "@shared/lib/features/slug.ts"
```

可用单条 perl 统一转换（覆盖上述 4 文件，无副作用）：

```bash
perl -pi -e 's{\.\./\.\./src/features/(paths|run-id|slug)\.ts}{\@shared/lib/features/$1.ts}g' \
  engine/tests/features/paths.test.ts \
  engine/tests/features/slug.test.ts \
  engine/tests/features/run-id.test.ts \
  engine/tests/features/slug-derive.test.ts
```

- [ ] **Step 4: 校验无遗漏的领域旧路径引用**

Run:
```bash
grep -rnE "features/(paths|run-id|slug)\.ts" --include="*.ts" . | grep -v node_modules | grep -vE "_shared/lib/features|@shared/lib/features"
```
Expected: 空输出（所有引用已指向 `@shared/lib/features/*` 或已是迁入文件本身）。

- [ ] **Step 5: 收口新文件 import 顺序**

Run:
```bash
bun run check:fix 2>&1 | tail -5
```
Expected: biome organize-imports 通过；若 `_shared/lib/features/*` 新文件 import 顺序被重排，纳入本 commit。

- [ ] **Step 6: 跑受影响测试**

Run:
```bash
bun test engine/tests/features engine/tests/cli 2>&1 | tail -8
```
Expected: 全绿（features 领域测试 + cli features/results 测试，0 fail）。`results-path` 经 `engine/tests/cli/results*.test.ts` 覆盖。

- [ ] **Step 7: Commit**

Run:
```bash
git add .claude/scripts/_shared/lib/features/paths.ts \
        .claude/scripts/_shared/lib/features/run-id.ts \
        .claude/scripts/_shared/lib/features/slug.ts \
        engine/src/cli/features-new.ts \
        engine/src/cli/features-resolve.ts \
        engine/src/cli/results-path.ts \
        engine/tests/features/paths.test.ts \
        engine/tests/features/slug.test.ts \
        engine/tests/features/run-id.test.ts \
        engine/tests/features/slug-derive.test.ts
git commit -m "refactor: ✨ move features domain trio to _shared/lib/features"
```
注意：用路径精确 `git add`，不得 `git add -A`；若 Step 5 改了别的文件需单独审视后再决定是否纳入。

---

## Task 3: cli 六元组 → `_shared/cli/`

**Files:**
- Move: `engine/src/cli/{features,features-index,features-ls,features-new,features-resolve,features-show}.ts` → `.claude/scripts/_shared/cli/`
- Modify: `engine/src/cli/index.ts:120`、`engine/src/api.ts:23-26`
- Test: `engine/tests/cli/features-{show,index,new,resolve,ls}.test.ts`（重指）

- [ ] **Step 1: `git mv` cli 六元组**

Run:
```bash
git mv engine/src/cli/features.ts          .claude/scripts/_shared/cli/features.ts
git mv engine/src/cli/features-index.ts    .claude/scripts/_shared/cli/features-index.ts
git mv engine/src/cli/features-ls.ts       .claude/scripts/_shared/cli/features-ls.ts
git mv engine/src/cli/features-new.ts      .claude/scripts/_shared/cli/features-new.ts
git mv engine/src/cli/features-resolve.ts  .claude/scripts/_shared/cli/features-resolve.ts
git mv engine/src/cli/features-show.ts     .claude/scripts/_shared/cli/features-show.ts
```
Expected: 六文件落 `_shared/cli/`。**簇内 import 无需改**：`features.ts → ./features-{index,ls,new,resolve,show}.ts`、`features-index.ts → ./features-ls.ts`、`features-new.ts → ./features-index.ts` 全部随迁存活；`features-new.ts`/`features-resolve.ts` 的 `@shared/lib/features/slug.ts` 已在 Task 2 重指；`features.ts` 的 `@shared/cli/features-lint.ts`+`@shared/lib/{cli,paths}.ts` 已是 `@shared`。

- [ ] **Step 2: 重指注册中心 `engine/src/cli/index.ts:120`**

```ts
// 旧
import { buildFeaturesCommand } from "./features.ts";
// 新
import { buildFeaturesCommand } from "@shared/cli/features.ts";
```
（第 133 行 `kata.addCommand(buildFeaturesCommand());` 不变。）

- [ ] **Step 3: 重指 `engine/src/api.ts:23-26`**

```ts
// 旧
export type { FeatureRow, FeaturesLsContext } from "./cli/features-ls.ts";
export { runFeaturesLs } from "./cli/features-ls.ts";
export type { FeaturesShowContext } from "./cli/features-show.ts";
export { runFeaturesShow } from "./cli/features-show.ts";
// 新
export type { FeatureRow, FeaturesLsContext } from "@shared/cli/features-ls.ts";
export { runFeaturesLs } from "@shared/cli/features-ls.ts";
export type { FeaturesShowContext } from "@shared/cli/features-show.ts";
export { runFeaturesShow } from "@shared/cli/features-show.ts";
```

- [ ] **Step 4: 重指 cli 测试（5 个）**

可用单条 perl 统一转换（覆盖 5 文件）：

```bash
perl -pi -e 's{\.\./\.\./src/cli/(features-(show|index|new|resolve|ls))\.ts}{\@shared/cli/$1.ts}g' \
  engine/tests/cli/features-show.test.ts \
  engine/tests/cli/features-index.test.ts \
  engine/tests/cli/features-new.test.ts \
  engine/tests/cli/features-resolve.test.ts \
  engine/tests/cli/features-ls.test.ts
```
注意：**不动** `engine/tests/cli/features-resolve-cli.test.ts`（execSync 黑盒）与 `engine/tests/cli/features-lint.test.ts`（已 `@shared`）。

- [ ] **Step 5: 校验无遗漏的 cli 旧路径引用**

Run:
```bash
grep -rnE "(cli/features\.ts|features-(index|ls|new|resolve|show)\.ts)" --include="*.ts" . \
  | grep -v node_modules \
  | grep -vE "_shared/cli/features|@shared/cli/features" \
  | grep -v "features-resolve-cli.test.ts"
```
Expected: 空输出（除黑盒 CLI 测试外，所有引用已指向 `@shared/cli/features*`）。

- [ ] **Step 6: 收口新文件 import 顺序**

Run:
```bash
bun run check:fix 2>&1 | tail -5
```
Expected: biome organize-imports 通过；`_shared/cli/features*` 新文件若被重排，纳入本 commit。

- [ ] **Step 7: 跑受影响测试**

Run:
```bash
bun test engine/tests/cli engine/tests/features 2>&1 | tail -8
```
Expected: 全绿；`features-resolve-cli.test.ts` 经 `bun engine/bin/kata features --help` 验证注册中心仍能解析 `@shared/cli/features.ts`。

- [ ] **Step 8: Commit**

Run:
```bash
git add .claude/scripts/_shared/cli/features.ts \
        .claude/scripts/_shared/cli/features-index.ts \
        .claude/scripts/_shared/cli/features-ls.ts \
        .claude/scripts/_shared/cli/features-new.ts \
        .claude/scripts/_shared/cli/features-resolve.ts \
        .claude/scripts/_shared/cli/features-show.ts \
        engine/src/cli/index.ts \
        engine/src/api.ts \
        engine/tests/cli/features-show.test.ts \
        engine/tests/cli/features-index.test.ts \
        engine/tests/cli/features-new.test.ts \
        engine/tests/cli/features-resolve.test.ts \
        engine/tests/cli/features-ls.test.ts
git commit -m "refactor: ✨ move features cluster cli to _shared/cli"
```

---

## Task 4: 终检 + 合并回 main + push + 清理

**Files:**
- 无源码改动；验证、合并、推送、清理。

- [ ] **Step 1: worktree 内全量测试 + 契约/类型/路径检查**

Run:
```bash
bun test --cwd engine 2>&1 | tail -5
bun run check:skills 2>&1 | tail -3
bun run check 2>&1 | tail -5
bun run lint:paths 2>&1 | tail -5
```
Expected: `bun test` 与 Task 1 Step 3 基线一致（0 fail）；`check:skills` 通过；`check`（biome + 根 type-check）通过；`lint:paths` 通过（无新增 hardcode/path 违规；features 无字符串自引用，背景结论 5）。`lint:skills:codex` 的 13 条 known-red 为 Codex Phase-2 占位、**不在本 bundle 范围**，保持现状。

- [ ] **Step 2: 确认 `.agents/` 同步义务（Phase 1 降级）**

Run:
```bash
sed -n '1,12p' .agents/README.md
```
Expected: 仍准确描述 Codex Phase 2 占位。本 bundle 未改 Codex 路由/产物语义，确认占位描述无需更新即可（背景结论 7）。

- [ ] **Step 3: 记录 worktree HEAD SHA**

Run:
```bash
git rev-parse HEAD
```
记录该 SHA（设为 `<W_SHA>`）用于主工作树 merge。

- [ ] **Step 4: 回主工作树 merge（--no-ff）**

Run:
```bash
cd /Users/poco/Projects/kata
git merge --no-ff <W_SHA> -m "merge: 🔀 整合 bundle 9 features 簇下沉 _shared"
```
Expected: 干净 fast-forward-free 合并（main 自 worktree 创建后无并行改动）。

- [ ] **Step 5: 合并后复测**

Run:
```bash
bun test --cwd engine 2>&1 | tail -5
```
Expected: 0 fail，与基线一致。

- [ ] **Step 6: Push**

Run:
```bash
git push origin main
```
Expected: 推送成功；`git rev-parse HEAD` == `git rev-parse origin/main`。远端不可用时记录阻塞，不静默跳过。

- [ ] **Step 7: 清理 worktree**

Run:
```bash
git worktree remove .worktrees/bundle-9-features
git worktree list
```
Expected: worktree 移除；detached worktree 无分支删除步骤。

---

## §后续（未来 bundle，本 plan 不实现）

bundle-9 后 `engine/src/` 剩余面进一步收敛。后续路线：

- **bundle-10（skill-exclusive 下沉）：** `history-convert.ts` + `history-convert/`（case-edit）、`knowledge-curate.ts` + `knowledge-curate/`（knowledge-curate）、`scan-report.ts`（defect-analyze，配合已迁的 `_shared/lib/scan-report-*`）→ 各自 skill bundle 或 `_shared`，按归属判定。需先实测每个的反向依赖与 importer 全集。
- **bundle-11（engine 收口删除，范围大、建议再拆 11a/b/c）：** CLI 注册中心 `engine/src/cli/index.ts` + 顶层 `engine/src/index.ts` → `_shared/cli`；剩余 audit 命令（`agents-audit`/`paths-audit`/`skill-audit`/`safety-audit-command`/`test-bucket-audit`）；`results-*`/`handoff`/`env*`/`codemod-apply`；基础设施（`api`/`auto-fixer`/`config`/`codemod`/`policy`/`runners`/`telemetry`/`source-analyze`/`source-ref`/`discuss`/`repo-sync`/`repo-profile`/`init-wizard`/`plugin-loader`/`rule-loader`/`plan`/`progress`/`prd-frontmatter`/`db-cli`/`create-project`/`image-compress`/`report-to-pdf`/`run-tests-notify`/`search-filter`/`format-*`/`writer-context-builder`/`skills`）；test infra 统一；最终**物理删除 `engine/`**。
- **phases-md decision（需用户拍板）：** spec §10 commit 4-5 的编排元数据落点。
- **Codex Phase-2：** `.agents/**` 对称适配，解 `lint:skills:codex` 的 13 条 known-red，恢复双 runtime 对称手写义务。

---

## Self-Review

**1. Spec coverage（依赖图全覆盖）：**
- 领域三元组（迁移表 A）+ cli 六元组（迁移表 B）= 9 个待迁文件，全部有 git mv 步骤。✅
- 重指汇总表 17 行 = 3（领域消费者）+ 4（领域测试）+ 1（index）+ 4（api）+ 5（cli 测试），全部映射到 Task 2/3 的具体步骤。✅
- 不需改的 2 个文件（`features-resolve-cli.test.ts` 黑盒、`features-lint.test.ts` 已 @shared）已显式标注「不动」。✅

**2. Placeholder scan：** 无 TBD/TODO/"类似 Task N"；每个重指步骤给出旧→新具体 import 行；每个测试步骤给出确切 perl 命令。✅

**3. Type consistency：** 导出符号名贯穿一致 —— `buildFeatureId`/`isValidSlug`/`sanitizeSlug`/`deriveSlugFromSource`/`hexFallbackSlug`/`SlugSource`（slug.ts）、`generateRunId`（run-id.ts）、`buildFeaturesCommand`（features.ts）、`runFeaturesLs`/`FeatureRow`/`FeaturesLsContext`/`runFeaturesShow`/`FeaturesShowContext`（ls/show）。与背景调查实测签名一致。✅

**4. 依赖序正确性：** Task 2（领域）先于 Task 3（cli），因 cli 的 `features-new`/`features-resolve` 消费领域 `slug.ts`；Task 2 内已把这两处重指 `@shared/lib/features/slug.ts`，故 Task 3 git mv cli 时领域引用已稳定。每个 commit 自洽可测。✅

**5. 工作流合规：** worktree-first（detached `.worktrees/bundle-9-features`）、路径精确 `git add`、`git mv` 保历史、test-after-edit、merge --no-ff、push、worktree remove、commit type/emoji 映射（refactor:✨ / merge:🔀）、`.agents/README` 占位确认。✅
