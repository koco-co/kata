# Bundle-10 skill-exclusive 子系统下沉各自 skill bundle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把三个 skill-exclusive 子系统迁出 `engine/`，各落归属 skill bundle 的 `scripts/`：`history-convert` → `.claude/skills/case-edit/scripts/`、`knowledge-curate` → `.claude/skills/knowledge-curate/scripts/`、`scan-report` → `.claude/skills/defect-analyze/scripts/`，让单 skill 命令脱离 engine 源码树。

**Architecture:** 三子系统互不依赖，各成 1 个独立绿 commit。落点遵循 case-draft 试点已确立的既定模式 —— skill-exclusive CLI 命令住 `.claude/skills/<name>/scripts/<entry>.ts`，中央 `engine/src/cli/index.ts` 经 `@skills/<name>/scripts/...` import 其 `program`（`index.ts:24-26`/`:144` 已对 case-draft 这样做）。三子系统**全部零反向依赖**（仅 import `@shared/*` + npm + 簇内相对），barrel 的 `export *` 与目录随迁存活，主要改动是 import 重指 + 字符串磁盘路径（audit/CLI 测试/跨 skill 调用）更新。

**Tech Stack:** TypeScript + Bun test；`@skills/*` → `./.claude/skills/*`、`@shared/*` → `./.claude/scripts/_shared/*`（`tsconfig.base.json`）；`git mv` 保留历史；`kata` 子命令名调用不受文件位置影响。

---

## 背景：依赖图调查结论（执行前已实测，基于 bundle-9 合并后 main HEAD=`6d5e5504d`）

1. **三子系统结构：**
   - `history-convert`：barrel `engine/src/history-convert.ts`（`export *` 7 行）+ 目录 `engine/src/history-convert/{cli,convert,csv,paths,tags,types,xmind}.ts`（7 文件）
   - `knowledge-curate`：barrel `engine/src/knowledge-curate.ts`（`export *` 6 行）+ 目录 `engine/src/knowledge-curate/{cli,index-data,maintenance,read,update,write}.ts`（6 文件）
   - `scan-report`：单文件 `engine/src/scan-report.ts`（`scan-report-*` 库早已在 `_shared/lib/`）

2. **三子系统零反向依赖（均可迁）：**
   - `history-convert/*` 仅 import `@shared/{lib/cli-runner,lib/frontmatter,lib/paths}.ts` + `jszip` + 簇内 `./`
   - `knowledge-curate/*` 仅 import `@shared/{lib/cli-runner,lib/knowledge,lib/knowledge-guard,lib/paths}.ts` + 簇内 `./`
   - `scan-report.ts` 仅 import `@shared/{lib/cli-runner,lib/paths,lib/scan-report-diff,lib/scan-report-render,lib/scan-report-store,lib/scan-report-types}.ts` + `node:*`
   - 无一条 `→ engine/*` 反向边。`jszip`/`pinyin-pro` 等 npm 包在根 deps，`@skills` 可解析。

3. **`engine → @skills` 是既定模式（非首次）：** `engine/src/cli/index.ts:24-26` import `@skills/case-draft/scripts/case-{draft,signal-analyzer,strategy-resolver}.ts`、`:144` import `@skills/case-draft/scripts/test-case-flow.ts`、`engine/src/cli/handoff.ts:3` import `@skills/playwright-automation/scripts/handoff-render.ts`。本 bundle 沿用该模式。

4. **中央 CLI 注册（留 engine 待 bundle-11，仅重指）：**
   - `index.ts:36` `import { program as historyConvert } from "../history-convert.ts"`
   - `index.ts:39` `import { program as managingProjectKnowledge } from "../knowledge-curate.ts"`（`:96-105` 的 `knowledge-keeper` 别名复用此变量，**不受路径影响**）
   - `index.ts:49` `import { program as scanReport } from "../scan-report.ts"`

5. **跨 skill 运行时字符串调用（knowledge-curate，需更新）：** `.claude/skills/case-draft/scripts/case-signal-analyzer.ts:220,260` 以 `invokeJson(["engine/src/knowledge-curate.ts", ...])` 调用。`invokeJson` 用 `scriptPath.replace(/^.*\/([^/]+)\.ts$/, "$1")` **仅取 basename** 当 kata 子命令名（`knowledge-curate`），故正则行为对新旧路径一致；但留指向已删 engine 文件的字符串属 stale，且违反 `.claude` 一致性，**更新为新路径**（documentary，行为不变）。

6. **audit 型测试硬编码源路径（需更新，载荷性）：** `engine/tests/large-file-split.test.ts` 的 `TARGET_ENTRY_FILES`（L10-11）+ `TARGET_SPLIT_DIRS`（L17-18）列 `engine/src/history-convert{,.ts}`、`engine/src/knowledge-curate{,.ts}`。该数组已含迁移后的 `.claude/scripts/_shared/cli/xmind-gen{,.ts}`，证明此 audit 随迁更新 —— 同理改 4 条。

7. **scan-report 字符串磁盘路径测试（需更新）：** `engine/tests/scan-report/e2e.test.ts:9` + `cli.test.ts:9` `CLI = join(repoRoot(), "engine/src/scan-report.ts")`；`engine/tests/cli/output-style.test.ts:18` `join(sourceRoot, "scan-report.ts")`（其中 `sourceRoot = join(repoRoot, "engine/src")`，且该数组已含 `join(repoRoot, ".claude/skills/case-draft/scripts/test-case-flow.ts")`，随迁更新先例）。

8. **不需改的引用（用 kata 子命令名或已迁 `@shared`，与文件位置无关）：**
   - 黑盒 CLI 测试：`engine/tests/history-convert.test.ts`、`engine/tests/knowledge-curate.test.ts`（`execFileSync(KATA_CLI, ["history-convert"/"knowledge-curate", ...])`）
   - `engine/src/writer-context-builder.ts:123`、`engine/src/create-project.ts:206`（`spawnSync("kata", ["knowledge-curate", ...])`）
   - `engine/src/cli/index.ts:98`（alias 描述串）、`engine/tests/lint/skill-frontmatter.test.ts:11`（KNOWN_SKILLS skill 名）、`engine/tests/lib/knowledge.test.ts:344`（注释）
   - `engine/tests/scan-report/{diff,validate,store,render}.test.ts`（import `@shared/lib/scan-report-*`，非本文件）

9. **lint/校验全部安全（先例确凿）：** `skill-structure`/`skill-shape` 不约束 scripts 内容；`agents-sync`/`agents-drift` 走 `.agents/drift-policy.json`，case-draft 试点已有完整 `scripts/` 且无 `.agents` 镜像、CI `lint:agents` 仍绿 → 迁码进 skill scripts 无需 `.agents` 对等副本；`check:skills`（`skill-audit.ts`）校验 SKILL.md frontmatter 同步、不管 scripts。

10. **worktree 无需 symlink runtime 目录** —— 子系统测试用 `tmpdir()`/`mkdtempSync` 临时目录或黑盒 `KATA_CLI`，不读真实 `workspace/{project}/.kata`。`.agents` 仅 `knowledge-curate/SKILL.md` 占位文档、无并行代码副本；Phase 1 同步义务降级为「确认 `.agents/README.md` 占位描述仍准确」。

## Scope

**IN（本 plan 迁移）：**
- `engine/src/history-convert.ts` + `engine/src/history-convert/`（8 文件）→ `.claude/skills/case-edit/scripts/`
- `engine/src/knowledge-curate.ts` + `engine/src/knowledge-curate/`（7 文件）→ `.claude/skills/knowledge-curate/scripts/`
- `engine/src/scan-report.ts`（1 文件）→ `.claude/skills/defect-analyze/scripts/`
- 重指 3 行 index.ts import + 更新 9 处字符串路径（large-file-split ×4、output-style ×1、scan-report e2e/cli ×2、case-signal-analyzer ×2）

**OUT（留待后续 bundle）：**
- `engine/src/cli/index.ts` 注册中心自身（仅重指，留 engine → bundle-11）
- `engine/src/{writer-context-builder,create-project}.ts`（用子命令名，不改，留 engine → bundle-11）
- 其余 engine/src 基础设施（bundle-11）
- `.agents/**` Codex 对称适配（Phase 2）

## File Structure

### 迁移表 A：history-convert → `.claude/skills/case-edit/scripts/`（Task 2）

| From | To |
| --- | --- |
| `engine/src/history-convert.ts`（barrel） | `.claude/skills/case-edit/scripts/history-convert.ts` |
| `engine/src/history-convert/`（目录 7 文件） | `.claude/skills/case-edit/scripts/history-convert/` |

barrel `export * from "./history-convert/*.ts"` 与目录同迁，相对路径存活；目录文件 import `@shared/*`+`jszip` 不变 —— **内部无需改 import**。

### 迁移表 B：knowledge-curate → `.claude/skills/knowledge-curate/scripts/`（Task 3）

| From | To |
| --- | --- |
| `engine/src/knowledge-curate.ts`（barrel） | `.claude/skills/knowledge-curate/scripts/knowledge-curate.ts` |
| `engine/src/knowledge-curate/`（目录 6 文件） | `.claude/skills/knowledge-curate/scripts/knowledge-curate/` |

barrel + 目录同迁，相对路径存活；目录文件 import `@shared/*` 不变 —— **内部无需改 import**。

### 迁移表 C：scan-report → `.claude/skills/defect-analyze/scripts/`（Task 4）

| From | To |
| --- | --- |
| `engine/src/scan-report.ts`（单文件） | `.claude/skills/defect-analyze/scripts/scan-report.ts` |

单文件，import 全 `@shared/*` —— **内部无需改 import**。

### 重指/更新汇总（按文件）

| 文件 | 行 | 旧 | 新 | Task |
| --- | --- | --- | --- | --- |
| `engine/src/cli/index.ts` | 36 | `"../history-convert.ts"` | `"@skills/case-edit/scripts/history-convert.ts"` | 2 |
| `engine/tests/large-file-split.test.ts` | 10 | `"engine/src/history-convert.ts"` | `".claude/skills/case-edit/scripts/history-convert.ts"` | 2 |
| `engine/tests/large-file-split.test.ts` | 17 | `"engine/src/history-convert"` | `".claude/skills/case-edit/scripts/history-convert"` | 2 |
| `engine/src/cli/index.ts` | 39 | `"../knowledge-curate.ts"` | `"@skills/knowledge-curate/scripts/knowledge-curate.ts"` | 3 |
| `.claude/skills/case-draft/scripts/case-signal-analyzer.ts` | 220 | `"engine/src/knowledge-curate.ts"` | `".claude/skills/knowledge-curate/scripts/knowledge-curate.ts"` | 3 |
| `.claude/skills/case-draft/scripts/case-signal-analyzer.ts` | 260 | `"engine/src/knowledge-curate.ts"` | `".claude/skills/knowledge-curate/scripts/knowledge-curate.ts"` | 3 |
| `engine/tests/large-file-split.test.ts` | 11 | `"engine/src/knowledge-curate.ts"` | `".claude/skills/knowledge-curate/scripts/knowledge-curate.ts"` | 3 |
| `engine/tests/large-file-split.test.ts` | 18 | `"engine/src/knowledge-curate"` | `".claude/skills/knowledge-curate/scripts/knowledge-curate"` | 3 |
| `engine/src/cli/index.ts` | 49 | `"../scan-report.ts"` | `"@skills/defect-analyze/scripts/scan-report.ts"` | 4 |
| `engine/tests/scan-report/e2e.test.ts` | 9 | `"engine/src/scan-report.ts"` | `".claude/skills/defect-analyze/scripts/scan-report.ts"` | 4 |
| `engine/tests/scan-report/cli.test.ts` | 9 | `"engine/src/scan-report.ts"` | `".claude/skills/defect-analyze/scripts/scan-report.ts"` | 4 |
| `engine/tests/cli/output-style.test.ts` | 18 | `join(sourceRoot, "scan-report.ts")` | `join(repoRoot, ".claude/skills/defect-analyze/scripts/scan-report.ts")` | 4 |

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
git worktree add --detach .worktrees/bundle-10-skill-exclusive main
cd .worktrees/bundle-10-skill-exclusive
```
Expected: worktree 检出到 `main` HEAD（`6d5e5504d` 或更新）。**无需 symlink `.kata`**（背景结论 10）。

- [ ] **Step 3: 记录删除前基线（全量测试）**

Run:
```bash
bun test --cwd engine 2>&1 | tail -5
```
Expected: 0 fail（既有基线 `1358 pass / 1 skip` 量级，bundle-9 后行数可能微增）。记录确切 pass/skip/fail 数作为回归对照。

- [ ] **Step 4: 确认目标 bundle 与 case-draft 试点结构**

Run:
```bash
ls .claude/skills/case-edit .claude/skills/knowledge-curate .claude/skills/defect-analyze
ls .claude/skills/case-draft/scripts | head    # 试点参考: barrel.ts + 同名 dir 共存
grep -n "program as caseDraft" engine/src/cli/index.ts   # 确认 @skills import 既定模式
```
Expected: 三 bundle 均存在且**无 `scripts/` 子目录**（git mv 将创建）；试点 `scripts/` 含 `case-draft.ts`+`test-case-flow.ts`+`test-case-flow/` 印证 barrel+同名目录共存；`index.ts` 已 `@skills/case-draft/scripts/case-draft.ts`。

---

## Task 2: history-convert → `.claude/skills/case-edit/scripts/`

**Files:**
- Move: `engine/src/history-convert.ts` + `engine/src/history-convert/`（8 文件）→ `.claude/skills/case-edit/scripts/`
- Modify: `engine/src/cli/index.ts:36`、`engine/tests/large-file-split.test.ts:10,17`
- Black-box（不改）: `engine/tests/history-convert.test.ts`

- [ ] **Step 1: `git mv` barrel + 目录**

Run:
```bash
mkdir -p .claude/skills/case-edit/scripts
git mv engine/src/history-convert.ts .claude/skills/case-edit/scripts/history-convert.ts
git mv engine/src/history-convert    .claude/skills/case-edit/scripts/history-convert
```
Expected: barrel + 7 个目录文件迁入；`engine/src/history-convert.ts` 与 `engine/src/history-convert/` 消失。barrel 的 `export * from "./history-convert/*.ts"` 相对路径随迁存活，目录文件 `@shared/*`+`jszip` import 不变 —— **内部零改动**。

- [ ] **Step 2: 重指中央 CLI 注册 `engine/src/cli/index.ts:36`**

```ts
// 旧
import { program as historyConvert } from "../history-convert.ts";
// 新
import { program as historyConvert } from "@skills/case-edit/scripts/history-convert.ts";
```

- [ ] **Step 3: 更新 audit 路径 `engine/tests/large-file-split.test.ts`**

`TARGET_ENTRY_FILES`（L10）与 `TARGET_SPLIT_DIRS`（L17）：

```ts
// L10  "engine/src/history-convert.ts"  → ".claude/skills/case-edit/scripts/history-convert.ts"
// L17  "engine/src/history-convert"     → ".claude/skills/case-edit/scripts/history-convert"
```

- [ ] **Step 4: 校验无遗漏的 history-convert 旧路径引用**

Run:
```bash
grep -rnE "(history-convert\.ts|src/history-convert|\"\.\./history-convert)" --include="*.ts" . \
  | grep -v node_modules \
  | grep -vE "skills/case-edit/scripts/history-convert|@skills/case-edit/scripts/history-convert"
```
Expected: 空输出（除黑盒测试用子命令名 `["history-convert", ...]` 外，所有路径引用已指向新位置 —— 这些子命令名引用不含 `.ts`/`src/`，不被上式命中）。

- [ ] **Step 5: 收口新文件 import 顺序**

Run:
```bash
bun run check:fix 2>&1 | tail -5
```
Expected: biome organize-imports 通过；新迁文件若 import 顺序被重排，纳入本 commit。

- [ ] **Step 6: 跑受影响测试**

Run:
```bash
bun test engine/tests/history-convert.test.ts engine/tests/large-file-split.test.ts 2>&1 | tail -8
```
Expected: 全绿。`history-convert.test.ts` 黑盒经 `KATA_CLI history-convert` 验证注册中心仍解析 `@skills/case-edit/scripts/history-convert.ts`；`large-file-split` 经新路径读文件做大小审计。

- [ ] **Step 7: Commit**

Run:
```bash
git add .claude/skills/case-edit/scripts/history-convert.ts \
        .claude/skills/case-edit/scripts/history-convert \
        engine/src/cli/index.ts \
        engine/tests/large-file-split.test.ts
git commit -m "refactor: ✨ move history-convert to case-edit skill bundle"
```
注意：路径精确 `git add`（含目录），不得 `git add -A`；勿带入 `.DS_Store`。

---

## Task 3: knowledge-curate → `.claude/skills/knowledge-curate/scripts/`

**Files:**
- Move: `engine/src/knowledge-curate.ts` + `engine/src/knowledge-curate/`（7 文件）→ `.claude/skills/knowledge-curate/scripts/`
- Modify: `engine/src/cli/index.ts:39`、`.claude/skills/case-draft/scripts/case-signal-analyzer.ts:220,260`、`engine/tests/large-file-split.test.ts:11,18`
- Black-box（不改）: `engine/tests/knowledge-curate.test.ts`、`engine/src/{writer-context-builder,create-project}.ts`（用子命令名）

- [ ] **Step 1: `git mv` barrel + 目录**

Run:
```bash
mkdir -p .claude/skills/knowledge-curate/scripts
git mv engine/src/knowledge-curate.ts .claude/skills/knowledge-curate/scripts/knowledge-curate.ts
git mv engine/src/knowledge-curate    .claude/skills/knowledge-curate/scripts/knowledge-curate
```
Expected: barrel + 6 个目录文件迁入；相对路径与 `@shared/*` import 随迁存活 —— **内部零改动**。

- [ ] **Step 2: 重指中央 CLI 注册 `engine/src/cli/index.ts:39`**

```ts
// 旧
import { program as managingProjectKnowledge } from "../knowledge-curate.ts";
// 新
import { program as managingProjectKnowledge } from "@skills/knowledge-curate/scripts/knowledge-curate.ts";
```
（`:96-105` 的 `knowledge-keeper` 别名复用 `managingProjectKnowledge` 变量，不变。）

- [ ] **Step 3: 更新跨 skill 运行时字符串 `case-signal-analyzer.ts:220,260`**

两处 `invokeJson` 首参（`invokeJson` 仅取 basename 当子命令名，行为对新旧路径一致；改为新路径仅为消除指向已删 engine 文件的 stale 串）：

```ts
// L220
const coreRaw = invokeJson([".claude/skills/knowledge-curate/scripts/knowledge-curate.ts", "read-core", "--project", project]);
// L260（read-module 调用的数组首元素）
".claude/skills/knowledge-curate/scripts/knowledge-curate.ts",
```

可用单条 perl 统一替换该文件两处：

```bash
perl -pi -e 's{"engine/src/knowledge-curate\.ts"}{".claude/skills/knowledge-curate/scripts/knowledge-curate.ts"}g' \
  .claude/skills/case-draft/scripts/case-signal-analyzer.ts
```

- [ ] **Step 4: 更新 audit 路径 `engine/tests/large-file-split.test.ts`**

```ts
// L11  "engine/src/knowledge-curate.ts"  → ".claude/skills/knowledge-curate/scripts/knowledge-curate.ts"
// L18  "engine/src/knowledge-curate"     → ".claude/skills/knowledge-curate/scripts/knowledge-curate"
```

- [ ] **Step 5: 校验无遗漏的 knowledge-curate 路径引用**

Run:
```bash
grep -rnE "(knowledge-curate\.ts|src/knowledge-curate|\"\.\./knowledge-curate)" --include="*.ts" . \
  | grep -v node_modules \
  | grep -vE "skills/knowledge-curate/scripts/knowledge-curate|@skills/knowledge-curate/scripts/knowledge-curate"
```
Expected: 空输出（黑盒/子命令名引用 `["knowledge-curate", ...]` 不含 `.ts`/`src/`，不被命中）。

- [ ] **Step 6: 收口 import 顺序**

Run:
```bash
bun run check:fix 2>&1 | tail -5
```
Expected: biome 通过。

- [ ] **Step 7: 跑受影响测试**

Run:
```bash
bun test engine/tests/knowledge-curate.test.ts engine/tests/large-file-split.test.ts engine/tests/lib engine/tests/test-case-flow 2>&1 | tail -8
```
Expected: 全绿。`knowledge-curate.test.ts` 黑盒经 `KATA_CLI knowledge-curate`；`engine/tests/lib`+`test-case-flow` 覆盖 case-signal-analyzer 所属 case-draft 链路（字符串改动行为中性，应无回归）。

- [ ] **Step 8: Commit**

Run:
```bash
git add .claude/skills/knowledge-curate/scripts/knowledge-curate.ts \
        .claude/skills/knowledge-curate/scripts/knowledge-curate \
        engine/src/cli/index.ts \
        .claude/skills/case-draft/scripts/case-signal-analyzer.ts \
        engine/tests/large-file-split.test.ts
git commit -m "refactor: ✨ move knowledge-curate to skill bundle"
```

---

## Task 4: scan-report → `.claude/skills/defect-analyze/scripts/`

**Files:**
- Move: `engine/src/scan-report.ts` → `.claude/skills/defect-analyze/scripts/scan-report.ts`
- Modify: `engine/src/cli/index.ts:49`、`engine/tests/scan-report/e2e.test.ts:9`、`engine/tests/scan-report/cli.test.ts:9`、`engine/tests/cli/output-style.test.ts:18`

- [ ] **Step 1: `git mv` 单文件**

Run:
```bash
mkdir -p .claude/skills/defect-analyze/scripts
git mv engine/src/scan-report.ts .claude/skills/defect-analyze/scripts/scan-report.ts
```
Expected: 单文件迁入；import 全 `@shared/*` —— **内部零改动**。

- [ ] **Step 2: 重指中央 CLI 注册 `engine/src/cli/index.ts:49`**

```ts
// 旧
import { program as scanReport } from "../scan-report.ts";
// 新
import { program as scanReport } from "@skills/defect-analyze/scripts/scan-report.ts";
```

- [ ] **Step 3: 更新 scan-report 黑盒 CLI 测试字符串路径**

```ts
// engine/tests/scan-report/e2e.test.ts:9
const CLI = join(repoRoot(), ".claude/skills/defect-analyze/scripts/scan-report.ts");
// engine/tests/scan-report/cli.test.ts:9
const CLI = join(repoRoot(), ".claude/skills/defect-analyze/scripts/scan-report.ts");
```

- [ ] **Step 4: 更新 output-style audit 路径 `engine/tests/cli/output-style.test.ts:18`**

```ts
// 旧（sourceRoot = join(repoRoot, "engine/src")）
  join(sourceRoot, "scan-report.ts"),
// 新（改用 repoRoot 锚定 skill 路径，与同数组 test-case-flow 行一致）
  join(repoRoot, ".claude/skills/defect-analyze/scripts/scan-report.ts"),
```

- [ ] **Step 5: 校验无遗漏的 scan-report.ts 路径引用**

Run:
```bash
grep -rnE "scan-report\.ts" --include="*.ts" . \
  | grep -v node_modules \
  | grep -vE "_shared/lib/scan-report" \
  | grep -vE "skills/defect-analyze/scripts/scan-report"
```
Expected: 仅剩 `.claude/skills/defect-analyze/scripts/scan-report.ts:3` 自身文件头注释（`scan-report.ts — kata module ...`），无其它旧路径。

- [ ] **Step 6: 收口 import 顺序**

Run:
```bash
bun run check:fix 2>&1 | tail -5
```
Expected: biome 通过。

- [ ] **Step 7: 跑受影响测试**

Run:
```bash
bun test engine/tests/scan-report engine/tests/cli/output-style.test.ts 2>&1 | tail -8
```
Expected: 全绿。`scan-report/{e2e,cli}.test.ts` 经新 `CLI` 路径跑 `bun <path>`；`output-style` 经新路径读文件审计 console 输出风格。

- [ ] **Step 8: Commit**

Run:
```bash
git add .claude/skills/defect-analyze/scripts/scan-report.ts \
        engine/src/cli/index.ts \
        engine/tests/scan-report/e2e.test.ts \
        engine/tests/scan-report/cli.test.ts \
        engine/tests/cli/output-style.test.ts
git commit -m "refactor: ✨ move scan-report to defect-analyze skill bundle"
```

---

## Task 5: 终检 + 合并回 main + push + 清理

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
Expected: `bun test` 与 Task 1 Step 3 基线一致（0 fail）；`check:skills`（SKILL.md frontmatter 同步）通过；`check`（biome + 根 type-check）通过；`lint:paths` 通过（字符串路径均指向真实磁盘位置，无新增 hardcode 违规）；`lint:agents` 通过（背景结论 9：skill scripts 无需 `.agents` 镜像，case-draft 试点先例）。`lint:skills:codex` 13 条 known-red 为 Codex Phase-2 占位、**不在本 bundle 范围**，保持现状。

- [ ] **Step 2: 确认 `.agents/` 同步义务（Phase 1 降级）**

Run:
```bash
sed -n '1,12p' .agents/README.md
ls .agents/skills/knowledge-curate/ 2>/dev/null   # 仅 SKILL.md 占位文档，无代码副本
```
Expected: `.agents/README.md` 仍准确描述 Codex Phase 2 占位（"本目录下 `skills/<id>/` 当前仍是 Phase 1 旧 SKILL.md 副本，不保证可用"）。本 bundle 未改 Codex 路由/产物语义、未在 `.agents` 新增代码，确认占位描述无需更新（背景结论 10）。

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
git merge --no-ff <W_SHA> -m "merge: 🔀 整合 bundle 10 skill-exclusive 子系统下沉 skill bundle"
```
Expected: 干净合并（main 自 worktree 创建后无并行改动）。

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
git worktree remove .worktrees/bundle-10-skill-exclusive
git worktree list
```
Expected: worktree 移除；detached worktree 无分支删除步骤。

---

## §后续（未来 bundle，本 plan 不实现）

bundle-10 后 `engine/src/` 仅剩注册中心与基础设施。后续路线：

- **bundle-11（engine 收口删除，范围大、建议拆 11a/b/c）：**
  - 11a — CLI 注册中心 `engine/src/cli/index.ts` + 顶层 `engine/src/index.ts` → `_shared/cli`；剩余 audit 命令（`agents-audit`/`paths-audit`/`skill-audit`/`safety-audit-command`/`test-bucket-audit`）；`results-*`/`handoff`/`env*`/`codemod-apply`。
  - 11b — 基础设施簇（`api`/`auto-fixer`/`config`/`codemod`/`policy`/`runners`/`telemetry`/`source-analyze`/`source-ref`/`discuss`/`repo-sync`/`repo-profile`/`init-wizard`/`plugin-loader`/`rule-loader`/`plan`/`progress`/`prd-frontmatter`/`db-cli`/`create-project`/`image-compress`/`report-to-pdf`/`run-tests-notify`/`search-filter`/`format-*`/`writer-context-builder`/`skills`）→ `_shared/lib` 或 `_shared/cli`，按归属判定。
  - 11c — test infra 统一（`engine/tests/**` → 各 bundle 就近或 `_shared` 测试目录）；删除 `engine/`（含 `engine/package.json`、`engine/bin`）；根 `package.json`/`tsconfig` 清理 engine 引用。
- **phases-md decision（需用户拍板）：** spec §10 commit 4-5 的编排元数据落点。
- **Codex Phase-2：** `.agents/**` 对称适配，解 `lint:skills:codex` 13 条 known-red，恢复双 runtime 对称手写义务。

---

## Self-Review

**1. Spec coverage（依赖图全覆盖）：**
- 三子系统（迁移表 A/B/C）= 16 个待迁文件（history-convert 8 + knowledge-curate 7 + scan-report 1），全部有 git mv 步骤。✅
- 重指/更新汇总表 12 行 = 3（index.ts import）+ 4（large-file-split audit）+ 2（case-signal-analyzer 跨 skill）+ 2（scan-report e2e/cli）+ 1（output-style），全部映射到 Task 2/3/4 具体步骤。✅
- 8 类不需改引用（背景结论 8）已显式列举并说明理由（子命令名 / 已迁 @shared / 注释）。✅

**2. Placeholder scan：** 无 TBD/TODO/"类似 Task N"；每处重指给出旧→新具体串；每个测试步骤给出确切命令；perl 替换给出完整命令。✅

**3. Type consistency：** 注册变量名贯穿一致 —— `historyConvert`/`managingProjectKnowledge`/`scanReport`（index.ts `program` 别名，与实测一致）；`invokeJson` 取 basename 行为已在背景结论 5 论证。✅

**4. 落点正确性：** skill-exclusive → `.claude/skills/<name>/scripts/` 遵循 case-draft 试点既定模式（`@skills/case-draft/scripts/*` 已在 index.ts），非新架构；`engine → @skills` forward 合法（背景结论 3）。barrel + 同名目录共存镜像试点 `test-case-flow.ts`+`test-case-flow/`。✅

**5. 独立性与逐 commit 绿：** 三子系统互不依赖，Task 2/3/4 任意序均自洽可测；每个 commit 内 git mv 破坏的引用在提交前补齐。✅

**6. 工作流合规：** worktree-first（detached `.worktrees/bundle-10-skill-exclusive`）、路径精确 `git add`（含目录、避 `.DS_Store`/dirty submodule）、`git mv` 保历史、test-after-edit、merge --no-ff、push、worktree remove、commit type/emoji 映射（refactor:✨ / merge:🔀）、`.agents/README` 占位确认、lint:agents 经 case-draft 先例确认安全。✅
