# Bundle-11a engine/src 子目录支撑库下沉 `_shared/lib` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `engine/src/` 下 6 个支撑库子目录（codemod/config/policy/runners/skills/telemetry，共 13 文件）整体迁入 `.claude/scripts/_shared/lib/`，作为 engine 收口（bundle-11）的最深叶子层，解锁上层 cli verb 层（11b）与顶层基础设施（11c）。

**Architecture:** bundle-11 是 engine 收口大工程，按依赖图 leaf-first 拆为 11a→11d。本 plan（11a）只迁最深叶子 —— 6 个子目录全部零跨目录反向依赖（唯一内部边 `runners/agent-runner.ts → ../policy/schema-guard.ts` 在簇内）。13 文件在**单个原子 commit** 内同迁（保留 `_shared/lib/<subdir>/` 子目录结构，使簇内相对 import 原样存活），仅重指 2 个 engine cli 消费者（forward 到 `@shared`）+ 13 个测试 + 1 处 audit 字符串 + 1 处注释。

**Tech Stack:** TypeScript + Bun test；`@shared/*` → `./.claude/scripts/_shared/*`（`tsconfig.base.json`）；`git mv` 保留历史；biome organize-imports 收口。

---

## 背景：依赖图调查结论（执行前已实测，基于 bundle-10 合并后 main HEAD=`bf9364120`）

1. **11a 文件清单（6 子目录 / 13 文件）：**
   - `engine/src/codemod/{fix-truthy-corruption,node-test-to-bun-test,strip-matcher-message}.ts`（3）
   - `engine/src/config/runtime-config.ts`（1）
   - `engine/src/policy/{content-lint,plugin-sandbox-policy,schema-guard,write-policy}.ts`（4）
   - `engine/src/runners/agent-runner.ts`（1）
   - `engine/src/skills/{frontmatter-policy,runtime-detach,runtime-sync}.ts`（3）
   - `engine/src/telemetry/runtime-telemetry.ts`（1）

2. **零跨目录反向依赖，唯一簇内边：** 全部子目录文件仅 import `@shared/*` + `node:*` + 簇内相对。唯一跨目录 engine 内部边 = `engine/src/runners/agent-runner.ts → ../policy/schema-guard.ts`（runners→policy，两者均在 11a 内）。簇内同目录边 = `engine/src/skills/runtime-sync.ts → ./frontmatter-policy.ts`。两条边均在保留子目录结构后**原样存活**，无需重指。

3. **`config.ts`（文件）≠ `config/`（目录）：** `engine/src/config.ts`（`config` 命令，顶层，属 11c）与 `engine/src/config/runtime-config.ts`（11a）是不同对象；`git mv engine/src/config`（目录）不触碰 `engine/src/config.ts`。

4. **engine 侧消费者（cli verb 层，留 engine 待 11b，仅重指 forward）：**
   - `engine/src/cli/codemod-apply.ts:5,6,7` → `../codemod/{fix-truthy-corruption,node-test-to-bun-test,strip-matcher-message}.ts`
   - `engine/src/cli/skill-audit.ts:14,15` → `../skills/{runtime-detach,runtime-sync}.ts`

5. **多数子目录文件仅被各自测试消费（无生产消费者）：** `policy/{plugin-sandbox-policy,write-policy,content-lint}`、`config/runtime-config`、`telemetry/runtime-telemetry` 全仓除自身测试外无 import；`policy/schema-guard` 另被 `runners/agent-runner`（簇内）消费；`skills/*`、`codemod/*` 另被上述 cli 消费。迁移faithful，不评估是否 dead code。

6. **测试消费者（13 文件，留 engine/tests，仅重指 `../../src/<subdir>/` → `@shared/lib/<subdir>/`）：**
   - `engine/tests/codemod/{fix-truthy-corruption:7,node-test-to-bun-test:4,strip-matcher-message:4}.test.ts`
   - `engine/tests/config/runtime-config.test.ts:2`
   - `engine/tests/policy/{content-lint:2,schema-guard:2,write-policy:4}.test.ts`
   - `engine/tests/runners/agent-runner.test.ts:6（schema-guard）,7（agent-runner）`
   - `engine/tests/skills/{frontmatter-check:7,runtime-detach-repository:3+4,runtime-detach:6,sync-check:9}.test.ts`
   - `engine/tests/telemetry/runtime-telemetry.test.ts:2`
   - **不在范围：** `engine/tests/skills/shared-case-qa.test.ts`（实测不 import 任何 11a 模块）。

7. **字符串/注释引用（需更新）：**
   - `engine/tests/large-file-split.test.ts:13` `TARGET_ENTRY_FILES` 含 `"engine/src/skills/runtime-sync.ts"`（载荷性 audit，须改新路径；同数组其它项已是迁移后路径）。
   - `engine/tests/skills/sync-check.test.ts:119` 注释 `// engine/src/skills/frontmatter-policy.ts`（顺带改，保持准确）。

8. **scriptsDir() 不受影响：** `.claude/scripts/_shared/lib/paths.ts:246-247` `scriptsDir()` 返回 `resolve(repoRoot(), "engine/src")`，仅被 `engine/tests/lib/paths.test.ts` 消费（非 audit 扫描器）；11a 仅移 13 子目录文件、`engine/src` 仍存在，故 scriptsDir 行为不变。该 `_shared→engine` 字符串引用的修复属 **11d**（删 engine 时）。

9. **lint/校验安全：** 迁入文件由 `bun run check`（`biome check .` + 根 type-check）覆盖（`bun run lint` 的 `biome check engine/src` 范围缩小是预期，与 bundle-6~10 一致）；`lint:agents` 经 case-draft 试点先例确认 `_shared` 新增无需 `.agents` 镜像；`lint:paths` 因字符串均指真实磁盘路径而通过。`.agents` 无并行代码副本；Phase 1 同步义务降级为「确认 `.agents/README.md` 占位描述仍准确」。

10. **worktree 无需 symlink runtime 目录** —— 子目录文件测试为纯 TS 单测（policy/codemod/telemetry 等），用临时目录或固定 fixture，不读真实 `workspace/{project}/.kata`。

## Scope

**IN（本 plan 迁移）：**
- 6 子目录 / 13 文件 → `.claude/scripts/_shared/lib/{codemod,config,policy,runners,skills,telemetry}/`
- 重指 2 engine cli 消费者（codemod-apply 3 行 + skill-audit 2 行）+ 13 测试文件 + 1 audit 字符串 + 1 注释

**OUT（留待 bundle-11b/c/d）：**
- cli verb 层 `engine/src/cli/*.ts`（agents-audit/codemod-apply/env/env-check/handoff/paths-audit/results*/safety-audit-command/skill-audit/test-bucket-audit）→ 11b
- 23 顶层基础设施文件 → 11c
- 枢纽（api/index/cli-index）+ bin + `scriptsDir()` 重指 + 删 `engine/` + 根 config + test infra → 11d
- `.agents/**` Codex 适配（Phase 2）

## File Structure

### 迁移表：6 子目录 → `_shared/lib/`（整目录 `git mv`）

| From（目录） | To（目录） | 文件数 |
| --- | --- | --- |
| `engine/src/codemod/` | `.claude/scripts/_shared/lib/codemod/` | 3 |
| `engine/src/config/` | `.claude/scripts/_shared/lib/config/` | 1 |
| `engine/src/policy/` | `.claude/scripts/_shared/lib/policy/` | 4 |
| `engine/src/runners/` | `.claude/scripts/_shared/lib/runners/` | 1 |
| `engine/src/skills/` | `.claude/scripts/_shared/lib/skills/` | 3 |
| `engine/src/telemetry/` | `.claude/scripts/_shared/lib/telemetry/` | 1 |

子目录结构原样保留，簇内相对 import（`runners→../policy/schema-guard`、`runtime-sync→./frontmatter-policy`）随迁存活 —— **迁入文件内部零改动**。

### 重指/更新汇总

| 文件 | 行 | 旧 | 新 |
| --- | --- | --- | --- |
| `engine/src/cli/codemod-apply.ts` | 5-7 | `"../codemod/<x>.ts"` | `"@shared/lib/codemod/<x>.ts"` |
| `engine/src/cli/skill-audit.ts` | 14-15 | `"../skills/<x>.ts"` | `"@shared/lib/skills/<x>.ts"` |
| `engine/tests/{codemod,config,policy,runners,skills,telemetry}/*.test.ts`（13 文件） | 各 import 行 | `"../../src/<subdir>/<x>.ts"` | `"@shared/lib/<subdir>/<x>.ts"` |
| `engine/tests/large-file-split.test.ts` | 13 | `"engine/src/skills/runtime-sync.ts"` | `".claude/scripts/_shared/lib/skills/runtime-sync.ts"` |
| `engine/tests/skills/sync-check.test.ts` | 119（注释） | `engine/src/skills/frontmatter-policy.ts` | `.claude/scripts/_shared/lib/skills/frontmatter-policy.ts` |

---

## Task 1: 创建 detached worktree 与删除前基线

**Files:**
- 无源码改动；建立隔离工作区并记录基线。

- [ ] **Step 1: 提交主工作树现有改动（pre-worktree 快照）**

Run:
```bash
git -C /Users/poco/Projects/kata status -sb
# 若有非 submodule 改动：git add <具体路径> && git commit -m "chore: 🧹 save pre-worktree local changes"
```
Expected: `## main...origin/main` 且无待提交改动；不得 `git add -A`/`git add .`（避开 dirty submodule `plugins/lanhu/mcp-bridge/lanhu-mcp`、`.DS_Store`）。

- [ ] **Step 2: 创建 detached worktree**

Run:
```bash
cd /Users/poco/Projects/kata
git worktree add --detach .worktrees/bundle-11a-subdir-libs main
cd .worktrees/bundle-11a-subdir-libs
```
Expected: worktree 检出到 `main` HEAD（`bf9364120` 或更新）。**无需 symlink `.kata`**（背景结论 10）。

- [ ] **Step 3: 记录删除前基线（全量测试）**

Run:
```bash
bun test --cwd engine 2>&1 | tail -5
```
Expected: 0 fail（既有基线量级，bundle-10 后行数微增）。记录确切 pass/skip/fail 数作为回归对照。

- [ ] **Step 4: 确认目标子目录为新命名空间**

Run:
```bash
ls .claude/scripts/_shared/lib/{codemod,config,policy,runners,skills,telemetry} 2>&1 | head
grep -rn "@shared/lib/\(codemod\|config\|policy\|runners\|skills\|telemetry\)/" --include="*.ts" . | grep -v node_modules
```
Expected: 6 目录均不存在（git mv 将创建）；除已迁内容外无 `@shared/lib/<subdir>` 引用（空输出）。

---

## Task 2: 6 子目录整体迁移 → `_shared/lib/`（单原子 commit）

**Files:**
- Move: `engine/src/{codemod,config,policy,runners,skills,telemetry}/` → `.claude/scripts/_shared/lib/`
- Modify: `engine/src/cli/codemod-apply.ts:5-7`、`engine/src/cli/skill-audit.ts:14-15`、13 个测试文件、`engine/tests/large-file-split.test.ts:13`、`engine/tests/skills/sync-check.test.ts:119`

- [ ] **Step 1: `git mv` 6 个子目录**

Run:
```bash
git mv engine/src/codemod   .claude/scripts/_shared/lib/codemod
git mv engine/src/config    .claude/scripts/_shared/lib/config
git mv engine/src/policy    .claude/scripts/_shared/lib/policy
git mv engine/src/runners   .claude/scripts/_shared/lib/runners
git mv engine/src/skills    .claude/scripts/_shared/lib/skills
git mv engine/src/telemetry .claude/scripts/_shared/lib/telemetry
```
Expected: 13 文件迁入对应子目录；`engine/src/config.ts`（顶层文件）**保持原位不动**。簇内相对 import（`runners/agent-runner.ts → ../policy/schema-guard.ts`、`skills/runtime-sync.ts → ./frontmatter-policy.ts`）经保留结构存活 —— **迁入文件零改动**。

- [ ] **Step 2: 重指 engine cli 消费者（forward 到 @shared）**

`engine/src/cli/codemod-apply.ts` 第 5-7 行：

```ts
// 旧
import { fixStandaloneTruthy, fixTruthyCorruption } from "../codemod/fix-truthy-corruption.ts";
import { transformNodeTestToBunTest } from "../codemod/node-test-to-bun-test.ts";
import { stripMatcherMessage } from "../codemod/strip-matcher-message.ts";
// 新
import { fixStandaloneTruthy, fixTruthyCorruption } from "@shared/lib/codemod/fix-truthy-corruption.ts";
import { transformNodeTestToBunTest } from "@shared/lib/codemod/node-test-to-bun-test.ts";
import { stripMatcherMessage } from "@shared/lib/codemod/strip-matcher-message.ts";
```

`engine/src/cli/skill-audit.ts` 第 14-15 行：

```ts
// 旧
import { checkRuntimeDetach, formatRuntimeDetachReport } from "../skills/runtime-detach.ts";
import { checkRuntimeSkillSync, formatRuntimeSkillSyncReport } from "../skills/runtime-sync.ts";
// 新
import { checkRuntimeDetach, formatRuntimeDetachReport } from "@shared/lib/skills/runtime-detach.ts";
import { checkRuntimeSkillSync, formatRuntimeSkillSyncReport } from "@shared/lib/skills/runtime-sync.ts";
```

- [ ] **Step 3: 重指 13 个测试文件（统一 perl 转换）**

```bash
perl -pi -e 's{\.\./\.\./src/(codemod|config|policy|runners|skills|telemetry)/}{\@shared/lib/$1/}g' \
  engine/tests/codemod/fix-truthy-corruption.test.ts \
  engine/tests/codemod/node-test-to-bun-test.test.ts \
  engine/tests/codemod/strip-matcher-message.test.ts \
  engine/tests/config/runtime-config.test.ts \
  engine/tests/policy/content-lint.test.ts \
  engine/tests/policy/schema-guard.test.ts \
  engine/tests/policy/write-policy.test.ts \
  engine/tests/runners/agent-runner.test.ts \
  engine/tests/skills/frontmatter-check.test.ts \
  engine/tests/skills/runtime-detach-repository.test.ts \
  engine/tests/skills/runtime-detach.test.ts \
  engine/tests/skills/sync-check.test.ts \
  engine/tests/telemetry/runtime-telemetry.test.ts
```
（覆盖单 import 与多 import 文件：`agent-runner.test.ts` 的 schema-guard+agent-runner、`runtime-detach-repository.test.ts` 的 runtime-detach+runtime-sync 均一并转换。）

- [ ] **Step 4: 更新 audit 字符串 `engine/tests/large-file-split.test.ts:13`**

```ts
// TARGET_ENTRY_FILES 内
// 旧  "engine/src/skills/runtime-sync.ts"
// 新  ".claude/scripts/_shared/lib/skills/runtime-sync.ts"
```

- [ ] **Step 5: 更新注释 `engine/tests/skills/sync-check.test.ts:119`**

```ts
// 旧  // engine/src/skills/frontmatter-policy.ts; replaces the previous
// 新  // .claude/scripts/_shared/lib/skills/frontmatter-policy.ts; replaces the previous
```

- [ ] **Step 6: 校验无遗漏的旧路径引用**

Run:
```bash
grep -rnE "(src/(codemod|config|policy|runners|skills|telemetry)/|\.\./(codemod|skills)/|engine/src/(codemod|config|policy|runners|skills|telemetry))" --include="*.ts" . \
  | grep -v node_modules \
  | grep -vE "@shared/lib/(codemod|config|policy|runners|skills|telemetry)" \
  | grep -vE "_shared/lib/(codemod|config|policy|runners|skills|telemetry)"
```
Expected: 空输出（所有 import 与字符串/注释均已指向 `@shared/lib/<subdir>` 或 `_shared/lib/<subdir>`）。注意 `engine/src/config.ts`/`config-examples` 等顶层不被该式命中（无 `config/` 斜杠路径）。

- [ ] **Step 7: 收口 import 顺序**

Run:
```bash
bun run check:fix 2>&1 | tail -5
```
Expected: biome organize-imports 通过；迁入文件若 import 顺序被重排，纳入本 commit。

- [ ] **Step 8: 跑受影响测试**

Run:
```bash
bun test engine/tests/codemod engine/tests/config engine/tests/policy engine/tests/runners engine/tests/skills engine/tests/telemetry engine/tests/large-file-split.test.ts 2>&1 | tail -10
```
Expected: 全绿（6 子目录测试 + large-file-split audit，0 fail）。

- [ ] **Step 9: Commit（单原子）**

Run:
```bash
git add .claude/scripts/_shared/lib/codemod \
        .claude/scripts/_shared/lib/config \
        .claude/scripts/_shared/lib/policy \
        .claude/scripts/_shared/lib/runners \
        .claude/scripts/_shared/lib/skills \
        .claude/scripts/_shared/lib/telemetry \
        engine/src/cli/codemod-apply.ts \
        engine/src/cli/skill-audit.ts \
        engine/tests/codemod engine/tests/config engine/tests/policy \
        engine/tests/runners engine/tests/skills engine/tests/telemetry \
        engine/tests/large-file-split.test.ts
git commit -m "refactor: ✨ move engine subdir libs to _shared/lib"
```
注意：路径精确 `git add`（含目录），不得 `git add -A`；勿带入 `.DS_Store`、dirty submodule。`engine/tests/{policy,skills}` 目录内仅 11a 测试被改动，`shared-case-qa.test.ts` 等未改文件不会进 commit（git add 仅暂存已修改项）。

---

## Task 3: 终检 + 合并回 main + push + 清理

**Files:**
- 无源码改动；验证、合并、推送、清理。

- [ ] **Step 1: worktree 内全量测试 + 契约/类型/路径/agents 检查**

Run:
```bash
bun test --cwd engine 2>&1 | tail -5
bun run check:skills 2>&1 | tail -3
bun run check 2>&1 | tail -5
bun run lint:paths 2>&1 | tail -5
bun run lint:agents 2>&1 | tail -5
```
Expected: `bun test` 与 Task 1 Step 3 基线一致（0 fail）；`check:skills` 通过；`check`（biome + 根 type-check，覆盖迁入文件）通过；`lint:paths` 通过；`lint:agents` 通过（背景结论 9：`_shared` 新增无需 `.agents` 镜像）。`lint:skills:codex` 13 条 known-red 为 Codex Phase-2 占位、**不在范围**，保持现状。

- [ ] **Step 2: 确认 `.agents/` 同步义务（Phase 1 降级）**

Run:
```bash
sed -n '1,12p' .agents/README.md
```
Expected: `.agents/README.md` 仍准确描述 Codex Phase 2 占位。本 bundle 未改 Codex 路由/产物语义、未在 `.agents` 新增代码，确认占位描述无需更新（背景结论 9）。

- [ ] **Step 3: 记录 worktree HEAD SHA**

Run:
```bash
git rev-parse HEAD
```
记录该 SHA（设为 `<W_SHA>`）。

- [ ] **Step 4: 回主工作树 merge（--no-ff）**

Run:
```bash
cd /Users/poco/Projects/kata
git merge --no-ff <W_SHA> -m "merge: 🔀 整合 bundle 11a engine 子目录支撑库下沉 _shared/lib"
```
Expected: 干净合并。

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
git worktree remove .worktrees/bundle-11a-subdir-libs
git worktree list
```
Expected: worktree 移除；detached worktree 无分支删除步骤。

---

## §后续（bundle-11 剩余片，本 plan 不实现）

11a 后 `engine/src/` 仅剩 cli verb 层、23 顶层文件、枢纽。后续 leaf→hub 顺序：

- **bundle-11b（cli verb 层 → `_shared/cli`）：** `engine/src/cli/{agents-audit,codemod-apply,env,env-check,handoff,paths-audit,results,results-path,results-prune,results-publish,safety-audit-command,skill-audit,test-bucket-audit}.ts`（13 文件，`index.ts` 除外）。簇内边：`env→env-check`、`results→results-{path,prune,publish}`（同目录随迁存活）。**注意 `paths-audit.ts` 的 `isKnownSafe()` 含字符串自引用**（类似 bundle-7 的处理），迁移时同步改。消费者仅 `cli/index.ts`（留 engine 待 11d，重指 `@shared/cli`）+ 各自测试。
- **bundle-11c（23 顶层基础设施 → `_shared/cli` 或 `_shared/lib`，按归属判定）：** `api`(枢纽除外)、`auto-fixer`、`config`、`create-project`、`db-cli`、`discuss`、`format-check-script`、`format-report-locator`、`image-compress`、`init-wizard`、`plan`、`plugin-loader`、`prd-frontmatter`、`progress`、`repo-profile`、`repo-sync`、`report-to-pdf`、`rule-loader`、`run-tests-notify`、`search-filter`、`source-analyze`、`source-ref`、`writer-context-builder`。多数导出 `program`（→ `_shared/cli`），少数为库（→ `_shared/lib`）。**需同步更新跨 skill 字符串：** `.claude/skills/case-draft/scripts/case-signal-analyzer.ts:124（source-analyze）,178（search-filter）`（`invokeJson` 取 basename，行为中性但消除 stale 串）。多处 audit/CLI 测试字符串路径（`dead-code-cleanup`、`discuss-cli`、`init-wizard`、`output-style`、`paths.test`、`source-ref` 等）随迁更新。
- **bundle-11d（枢纽收口 + 物理删 engine）：** `engine/src/api.ts` + `engine/src/index.ts`（纯 re-export，可删或迁兼容层）；`engine/src/cli/index.ts`（注册中心，**最后迁** → `_shared/cli/index.ts`，所有消费者已就绪后）；`engine/bin/kata` 与 `.claude/scripts/_shared/bin/kata` 的 import 路径；`_shared/lib/paths.ts:246-247` `scriptsDir()` 重指（解 `_shared→engine` 字符串边）；删 `engine/`（src/bin/tests/package.json/tsconfig）；根 `package.json` 的 `workspaces`/`lint`/`test` 脚本清理；test infra 统一（`engine/tests/**` 就近或归 `_shared` 测试目录）。
- **phases-md decision（需用户拍板）：** spec §10 commit 4-5 的编排元数据落点。
- **Codex Phase-2：** `.agents/**` 对称适配，解 `lint:skills:codex` 13 条 known-red，恢复双 runtime 对称手写义务。

---

## Self-Review

**1. Spec coverage（依赖图全覆盖）：**
- 6 子目录 / 13 文件全部有 git mv 步骤（迁移表）。✅
- 重指/更新汇总 = 2 engine cli（codemod-apply 3 + skill-audit 2）+ 13 测试 + 1 audit 字符串 + 1 注释，全部映射到 Task 2 步骤。✅
- 簇内边（runners→policy/schema-guard、runtime-sync→frontmatter-policy）说明随迁存活、无需重指；`shared-case-qa.test.ts` 显式标注出范围。✅

**2. Placeholder scan：** 无 TBD/TODO/"类似 Task N"；重指给出旧→新具体 import；perl 转换给完整命令；audit/注释更新给具体旧→新串。✅

**3. Type consistency：** 导出符号贯穿一致 —— `fixStandaloneTruthy`/`fixTruthyCorruption`/`transformNodeTestToBunTest`/`stripMatcherMessage`（codemod）、`checkRuntimeDetach`/`formatRuntimeDetachReport`/`checkRuntimeSkillSync`/`formatRuntimeSkillSyncReport`（skills）、`validateHandoffEnvelope`（schema-guard）、`runPatchOnlyAgent`（agent-runner）、`resolveRuntimeConfig`/`isRuntimeConfigEnvName`（runtime-config）、`validateTelemetryEvent`、`lintArtifactContent`、`evaluateWrite`，与实测 import 一致。✅

**4. 原子性正确：** 唯一跨目录簇内边 runners→policy 要求 runners/ 与 policy/ 同 commit 迁移并保留子目录结构；单原子 commit 满足（镜像 bundle-7 lint 簇）。`config.ts`≠`config/` 已论证不冲突。✅

**5. 叶子层定位：** 11a 是 bundle-11 最深叶子，零跨目录反向依赖，迁后解锁 11b（cli verb）；leaf-first 顺序在 §后续 完整排为 11b→11c→11d，枢纽 `cli/index.ts` 最后。✅

**6. 工作流合规：** worktree-first（detached `.worktrees/bundle-11a-subdir-libs`）、路径精确 `git add`（避 `.DS_Store`/dirty submodule）、`git mv` 保历史、test-after-edit、merge --no-ff、push、worktree remove、commit type/emoji（refactor:✨ / merge:🔀）、`.agents/README` 占位确认、scriptsDir 影响已排除（背景结论 8）。✅
