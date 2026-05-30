# Bundle-8 cases/e2e 子系统收口 `_shared` 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: 用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实施本计划。步骤用 checkbox（`- [ ]`）跟踪。

**Goal:** 迁移 e2e 簇与 `features-lint.ts`，解除 `cases-e2e.ts`、`cases-lint.ts` 仅存的两条 engine 反向依赖，把它们一并下沉 `_shared/cli`，使 cases/lint/e2e/audit 子系统彻底脱离 `engine/`。

**Architecture:** 沿用 bundle-5/6/7 的 `git mv` + 路径别名重指模式。e2e 运行时逻辑 `engine/src/e2e/{case-draft-e2e,runtime-invoke}.ts` → `_shared/lib/e2e/`（与 `_shared/lib/cases/` 同构的领域子目录）；`features-lint.ts`、`cases-e2e.ts`、`cases-lint.ts` 三个 CLI 模块 → `_shared/cli/`（与 bundle-6 迁入的 cases 动词同位）。按依赖顺序分三个独立绿 commit：e2e → features-lint → cases 收口。`engine/src/cli/index.ts`（CLI 注册中心，留 bundle-11）只把 `buildCasesCommand` 的 import 前向重指到 `@shared/cli`。

**Tech Stack:** Bun ≥ 1.3、TypeScript、commander、biome；路径别名 `@shared/* → ./.claude/scripts/_shared/*`（`tsconfig.base.json`）。

---

## 背景与关键发现

bundle-6/7 落地后实测依赖图，确认 cases 子系统只剩两条 engine 反向边，且 e2e、features-lint 均零反向依赖、可干净下沉，故本计划能一次性收口整个 cases/lint/e2e/audit 子系统：

1. **e2e 簇零反向依赖。** `case-draft-e2e.ts` 只 import `@shared/cli/cases-compare.ts`、`@shared/cli/cases-verify.ts`（bundle-6 已迁）+ 同目录 `./runtime-invoke.ts` + node；`runtime-invoke.ts` 只 import `node:child_process`。无任何 `engine/` 反向 import。两文件构成内聚对（`case-draft-e2e → ./runtime-invoke`），同目录同迁则 `./` 相对 import 全程有效。

2. **`features-lint.ts` 零反向依赖，但双消费者。** 只 import `@shared/schemas/loaders.ts` + yaml + node。被 `engine/src/cli/features.ts:7`（features 簇，留 bundle-9）与 `engine/src/cli/cases-lint.ts:30` 双重消费。下沉 `_shared/cli` 后，两消费者均改 `@shared/cli/features-lint.ts`（engine → shared 前向，合法），`features.ts` 留 engine 不受影响。

3. **`cases-e2e.ts` 仅一条反向边。** import `../e2e/case-draft-e2e.ts`（唯一 engine 反向依赖），被 `cases-lint.ts:29`（registerCasesE2e）消费。e2e 迁出后 → `@shared/lib/e2e/case-draft-e2e.ts`，`cases-e2e.ts` 转干净，可下沉 `_shared/cli`。

4. **`cases-lint.ts` umbrella 仅两条反向边（bundle-6/7 后）。** 全部 lint import 已是 `@shared/lint/*`（bundle-7）、全部 cases 动词 import 已是 `@shared/cli/*`（bundle-6）；仅存 L29 `./cases-e2e.ts` + L30 `./features-lint.ts` 两条 engine 相对 import。两者迁出后 `cases-lint.ts` 转干净，可下沉 `_shared/cli`。其唯一外部消费者为 `engine/src/cli/index.ts:117`（`buildCasesCommand`，注册中心留 bundle-11）+ `cases-lint.test.ts`。

5. **无字符串路径/自引用需改。** 实测 `dead-code-cleanup.test.ts`、`large-file-split.test.ts`、`audits-paths.test.ts`、`paths-audit.ts` 均无对本计划 4 个迁移目标的字符串路径或自引用豁免引用（与 bundle-7 需改 `paths-audit` 自引用不同）。

6. **基线测试计数。** 迁移前 `bun test engine/tests/e2e engine/tests/cli/features-lint.test.ts engine/tests/lint/manifest-gate.test.ts engine/tests/lint/metadata-gate.test.ts engine/tests/cli/cases-lint.test.ts` = **27 pass / 0 fail / 6 files**；全量 `bun test --cwd engine` = 1358 pass / 1 skip / 0 fail（bundle-7 后基线，迁移不改变 e2e 测试的 run/skip 行为）。

---

## Carryover 约束（贯穿全计划）

- **Worktree-first：** 改动在 detached worktree `.worktrees/bundle-8-cases-e2e-closure` 内完成；不新建分支；`git worktree add --detach .worktrees/bundle-8-cases-e2e-closure main`。
- **路径限定暂存：** 只用 `git add <path>` / `git rm <path>` / `git mv <from> <to>`，**严禁** `git add -A` / `git add .`（规避脏 submodule `plugins/lanhu/mcp-bridge/lanhu-mcp` 与历史 `docs/superpowers/plans/.process/**` 删除）。
- **只读源仓库：** `workspace/{project}/.kata/repos/**` 只读，禁 push/commit/write/mv/rm/chmod。
- **Immutability：** 不就地修改对象，迁移仅移动文件 + 改 import，不改运行逻辑。
- **Commit 规范：** `type: emoji description`（type 小写、≤72 字符），固定映射 `refactor: ✨`、`chore: 🧹`、`merge: 🔀`。
- **Test-after-edit：** 每个改代码步骤后跑相关测试；任何失败（含 pre-existing）须在本 worktree 排查根因修复，不得 skip/TODO/注释绕过；超范围失败须先停下来向用户说明并取得显式同意才能 defer。
- **Codex Phase-2：** 本计划不动 `.agents/**`；同步评估义务降级为「确认 `.agents/README.md` 仍准确描述占位状态」。已知 `lint:skills:codex` 占位红为 pre-existing，不在本计划修复范围。
- **lint 脚本覆盖缺口（承自 bundle-5/6/7）：** `lint` 脚本不扫描 `.claude/scripts/`，迁入文件由 `bun run check`（`biome check .`）与根 `type-check` 覆盖；全局 lint 缺口记入 engine 收口计划。

---

## Scope

**IN：**
- `git mv` e2e 簇 `engine/src/e2e/{case-draft-e2e,runtime-invoke}.ts` → `.claude/scripts/_shared/lib/e2e/`。
- `git mv` `engine/src/cli/features-lint.ts` → `.claude/scripts/_shared/cli/`。
- `git mv` `engine/src/cli/{cases-e2e,cases-lint}.ts` → `.claude/scripts/_shared/cli/`。
- 重指消费者：`cases-e2e.ts`、`cases-lint.ts`、`features.ts`、`index.ts` 与对应测试。

**OUT：**
- `engine/src/cli/features.ts` 本体与 features 簇（`features-{index,ls,new,resolve,show}.ts`、`engine/src/features/*`）不迁——留 bundle-9。
- `engine/src/cli/index.ts` 注册中心本体不迁，仅重指一行 import——留 bundle-11。
- history-convert / knowledge-curate / scan-report 不迁——各成后续 plan。
- 不改任何运行逻辑、CLI 命令名、子命令字符串、选项、阈值、报告格式。
- 不动 `.agents/**`、不修 Codex 占位红。

---

## File Structure（迁移与重指全表）

### A. 迁移（5 个 `git mv`）

| From | To | 别名 |
| --- | --- | --- |
| `engine/src/e2e/case-draft-e2e.ts` | `.claude/scripts/_shared/lib/e2e/case-draft-e2e.ts` | `@shared/lib/e2e/case-draft-e2e.ts` |
| `engine/src/e2e/runtime-invoke.ts` | `.claude/scripts/_shared/lib/e2e/runtime-invoke.ts` | `@shared/lib/e2e/runtime-invoke.ts` |
| `engine/src/cli/features-lint.ts` | `.claude/scripts/_shared/cli/features-lint.ts` | `@shared/cli/features-lint.ts` |
| `engine/src/cli/cases-e2e.ts` | `.claude/scripts/_shared/cli/cases-e2e.ts` | `@shared/cli/cases-e2e.ts` |
| `engine/src/cli/cases-lint.ts` | `.claude/scripts/_shared/cli/cases-lint.ts` | `@shared/cli/cases-lint.ts` |

### B. 迁出文件内部 import（**全部不改**）

- `_shared/lib/e2e/case-draft-e2e.ts`：`./runtime-invoke.ts`（同目录同迁，不改）；`@shared/cli/cases-compare.ts`、`@shared/cli/cases-verify.ts`（bundle-6 绝对别名，不改）。
- `_shared/cli/cases-e2e.ts`：`../e2e/case-draft-e2e.ts` → `@shared/lib/e2e/case-draft-e2e.ts`（Commit 1 设定，迁移后从新位置仍有效）。
- `_shared/cli/cases-lint.ts`：`@shared/lint/*`、`@shared/cli/cases-{compare,validate,verify}.ts`、`@shared/cli/features-lint.ts`（Commit 2 设定）均为绝对别名，迁移后有效；仅 L29 `./cases-e2e.ts` → `@shared/cli/cases-e2e.ts`（Commit 3，统一绝对别名）。
- `_shared/cli/features-lint.ts`：import 全为 `@shared/schemas/*`/yaml/node，不改。

### C. 留 engine 消费者 import 前向重指（engine → shared）

| 文件:行 | From | To | Commit |
| --- | --- | --- | --- |
| `engine/src/cli/cases-e2e.ts:3` | `../e2e/case-draft-e2e.ts` | `@shared/lib/e2e/case-draft-e2e.ts` | 1 |
| `engine/src/cli/features.ts:7` | `./features-lint.ts` | `@shared/cli/features-lint.ts` | 2 |
| `engine/src/cli/cases-lint.ts:30` | `./features-lint.ts` | `@shared/cli/features-lint.ts` | 2 |
| `engine/src/cli/cases-lint.ts:29` | `./cases-e2e.ts` | `@shared/cli/cases-e2e.ts` | 3 |
| `engine/src/cli/index.ts:117` | `./cases-lint.ts` | `@shared/cli/cases-lint.ts` | 3 |

> 说明：C 表中 `cases-e2e.ts`、`cases-lint.ts` 在各自 Commit 中既被 `git mv` 又改 import；其改后的 import 从新位置（`_shared/cli/`）解析仍正确（绝对别名）。

### D. 测试 import 重指

| 文件:行 | From | To | Commit |
| --- | --- | --- | --- |
| `engine/tests/e2e/case-draft-e2e.test.ts:7` | `../../src/e2e/case-draft-e2e.ts` | `@shared/lib/e2e/case-draft-e2e.ts` | 1 |
| `engine/tests/e2e/runtime-invoke.test.ts:2` | `../../src/e2e/runtime-invoke.ts` | `@shared/lib/e2e/runtime-invoke.ts` | 1 |
| `engine/tests/cli/features-lint.test.ts:6` | `../../src/cli/features-lint.ts` | `@shared/cli/features-lint.ts` | 2 |
| `engine/tests/lint/manifest-gate.test.ts:6` | `../../src/cli/features-lint.ts` | `@shared/cli/features-lint.ts` | 2 |
| `engine/tests/lint/metadata-gate.test.ts:5` | `../../src/cli/features-lint.ts` | `@shared/cli/features-lint.ts` | 2 |
| `engine/tests/cli/cases-lint.test.ts:8` | `../../src/cli/cases-lint.ts` | `@shared/cli/cases-lint.ts` | 3 |

### Commit 划分（按依赖顺序，各自独立绿）

- **Commit 1（e2e 簇）：** 迁 e2e 两文件 → `_shared/lib/e2e/` + 重指 `cases-e2e.ts`（留 engine）与 2 个 e2e 测试。
- **Commit 2（features-lint）：** 迁 `features-lint.ts` → `_shared/cli/` + 重指 `features.ts`、`cases-lint.ts`（均留 engine）与 3 个测试。
- **Commit 3（cases 收口）：** 迁 `cases-e2e.ts`、`cases-lint.ts` → `_shared/cli/` + 重指 `cases-lint.ts` L29、`index.ts` L117 与 `cases-lint.test.ts`。

---

## Prerequisites：建立 worktree 与基线

- [ ] **P-1：主工作树快照（如有改动）**

Run（在 `/Users/poco/Projects/kata`）：
```bash
git status --short
```
若有任何 tracked/untracked 改动：`git add -A && git commit -m "chore: 🧹 save pre-worktree local changes"`。若为空则跳过。

- [ ] **P-2：创建 detached worktree + symlink `.kata`**

Run（在 `/Users/poco/Projects/kata`）：
```bash
ROOT=$(pwd)
W="$ROOT/.worktrees/bundle-8-cases-e2e-closure"
git worktree add --detach "$W" main
mkdir -p "$W/workspace/kata"
ln -s "$ROOT/workspace/kata/.kata" "$W/workspace/kata/.kata"
git -C "$W" rev-parse HEAD
```
Expected：worktree 建在 `.worktrees/bundle-8-cases-e2e-closure`，HEAD = 当前 main SHA；`.kata` symlink 就位（只读）。后续步骤 `cd` 目标均为该 worktree。

- [ ] **P-3：记录基线**

Run（在 worktree 内）：
```bash
cd .worktrees/bundle-8-cases-e2e-closure
bun test engine/tests/e2e engine/tests/cli/features-lint.test.ts engine/tests/lint/manifest-gate.test.ts engine/tests/lint/metadata-gate.test.ts engine/tests/cli/cases-lint.test.ts 2>&1 | tail -3
```
Expected：`27 pass / 0 fail`。记录为迁移后对账基线。

---

## Task 1：e2e 簇 → `_shared/lib/e2e/`（Commit 1）

**Files:**
- Move: `engine/src/e2e/{case-draft-e2e,runtime-invoke}.ts` → `.claude/scripts/_shared/lib/e2e/`
- Modify: `engine/src/cli/cases-e2e.ts`（留 engine，L3 重指）
- Modify（测试）: `engine/tests/e2e/{case-draft-e2e,runtime-invoke}.test.ts`

- [ ] **Step 1：建目标目录并 `git mv` e2e 两文件**

Run（在 worktree 内）：
```bash
mkdir -p .claude/scripts/_shared/lib/e2e
git mv engine/src/e2e/case-draft-e2e.ts .claude/scripts/_shared/lib/e2e/case-draft-e2e.ts
git mv engine/src/e2e/runtime-invoke.ts .claude/scripts/_shared/lib/e2e/runtime-invoke.ts
ls engine/src/e2e/ 2>/dev/null && echo "ERROR: engine/src/e2e not empty" || echo "engine/src/e2e GONE (good)"
```
Expected：`engine/src/e2e/` 消失（两文件全迁）；`case-draft-e2e.ts` 的 `./runtime-invoke.ts` 仍同目录有效、不改；其 `@shared/cli/cases-*` import 为绝对别名、不改。

- [ ] **Step 2：重指 `cases-e2e.ts`（留 engine）对 e2e 的 import**

`engine/src/cli/cases-e2e.ts:3`，before：
```ts
import { runCaseDraftE2e } from "../e2e/case-draft-e2e.ts";
```
after：
```ts
import { runCaseDraftE2e } from "@shared/lib/e2e/case-draft-e2e.ts";
```

- [ ] **Step 3：重指 e2e 测试 import**

- `engine/tests/e2e/case-draft-e2e.test.ts:7`：`../../src/e2e/case-draft-e2e.ts` → `@shared/lib/e2e/case-draft-e2e.ts`
- `engine/tests/e2e/runtime-invoke.test.ts:2`：`../../src/e2e/runtime-invoke.ts` → `@shared/lib/e2e/runtime-invoke.ts`

- [ ] **Step 4：类型检查 + 相关测试转绿**

Run（在 worktree 内）：
```bash
bun run type-check; echo "type-check exit=$?"
bun test engine/tests/e2e engine/tests/cli/cases-lint.test.ts 2>&1 | tail -3
```
Expected：`type-check exit=0`；e2e 测试 run/skip 行为同基线、0 fail；`cases-lint.test.ts` 仍 pass（其经 `cases-e2e.ts` 间接依赖迁出的 e2e）。

- [ ] **Step 5：Commit 1（路径限定暂存）**

Run（在 worktree 内）：
```bash
git add .claude/scripts/_shared/lib/e2e/case-draft-e2e.ts \
        .claude/scripts/_shared/lib/e2e/runtime-invoke.ts \
        engine/src/cli/cases-e2e.ts \
        engine/tests/e2e/case-draft-e2e.test.ts \
        engine/tests/e2e/runtime-invoke.test.ts
git commit -m "refactor: ✨ move e2e cluster to _shared/lib/e2e"
git status --short
```
Expected：commit 成功；旧路径残留「D」用 `git rm engine/src/e2e/<file>.ts` 显式补暂存；禁 `git add -A`。

---

## Task 2：`features-lint.ts` → `_shared/cli/`（Commit 2）

**Files:**
- Move: `engine/src/cli/features-lint.ts` → `.claude/scripts/_shared/cli/features-lint.ts`
- Modify: `engine/src/cli/features.ts`（L7）、`engine/src/cli/cases-lint.ts`（L30）（均留 engine）
- Modify（测试）: `engine/tests/cli/features-lint.test.ts`、`engine/tests/lint/{manifest-gate,metadata-gate}.test.ts`

- [ ] **Step 1：`git mv` features-lint**

Run（在 worktree 内）：
```bash
git mv engine/src/cli/features-lint.ts .claude/scripts/_shared/cli/features-lint.ts
```
Expected：features-lint 迁入 `_shared/cli/`；其 `@shared/schemas/*`/yaml/node import 不改。

- [ ] **Step 2：重指两个 engine 消费者**

- `engine/src/cli/features.ts:7`：`./features-lint.ts` → `@shared/cli/features-lint.ts`
- `engine/src/cli/cases-lint.ts:30`：`./features-lint.ts` → `@shared/cli/features-lint.ts`

- [ ] **Step 3：重指三个测试 import**

- `engine/tests/cli/features-lint.test.ts:6`：`../../src/cli/features-lint.ts` → `@shared/cli/features-lint.ts`
- `engine/tests/lint/manifest-gate.test.ts:6`：`../../src/cli/features-lint.ts` → `@shared/cli/features-lint.ts`
- `engine/tests/lint/metadata-gate.test.ts:5`：`../../src/cli/features-lint.ts` → `@shared/cli/features-lint.ts`

- [ ] **Step 4：类型检查 + 相关测试转绿**

Run（在 worktree 内）：
```bash
bun run type-check; echo "type-check exit=$?"
bun test engine/tests/cli/features-lint.test.ts engine/tests/lint/manifest-gate.test.ts engine/tests/lint/metadata-gate.test.ts engine/tests/cli/cases-lint.test.ts 2>&1 | tail -3
```
Expected：`type-check exit=0`；全 pass、0 fail（`features.ts` 与 `cases-lint.ts` 经 `@shared/cli/features-lint.ts` 解析）。

- [ ] **Step 5：Commit 2（路径限定暂存）**

Run（在 worktree 内）：
```bash
git add .claude/scripts/_shared/cli/features-lint.ts \
        engine/src/cli/features.ts engine/src/cli/cases-lint.ts \
        engine/tests/cli/features-lint.test.ts \
        engine/tests/lint/manifest-gate.test.ts \
        engine/tests/lint/metadata-gate.test.ts
git commit -m "refactor: ✨ move features-lint to _shared/cli"
git status --short
```
Expected：commit 成功；旧路径残留「D」用 `git rm engine/src/cli/features-lint.ts` 显式补暂存；禁 `git add -A`。

---

## Task 3：cases 收口 `cases-e2e` + `cases-lint` → `_shared/cli/`（Commit 3）

**Files:**
- Move: `engine/src/cli/{cases-e2e,cases-lint}.ts` → `.claude/scripts/_shared/cli/`
- Modify: `engine/src/cli/index.ts`（L117，留 engine 注册中心）
- Modify（测试）: `engine/tests/cli/cases-lint.test.ts`

- [ ] **Step 1：`git mv` cases-e2e + cases-lint**

Run（在 worktree 内）：
```bash
git mv engine/src/cli/cases-e2e.ts  .claude/scripts/_shared/cli/cases-e2e.ts
git mv engine/src/cli/cases-lint.ts .claude/scripts/_shared/cli/cases-lint.ts
```
Expected：两文件迁入 `_shared/cli/`；`cases-e2e.ts` 的 `@shared/lib/e2e/case-draft-e2e.ts`（Commit 1）从新位置仍有效；`cases-lint.ts` 的 `@shared/lint/*`、`@shared/cli/cases-{compare,validate,verify}.ts`、`@shared/cli/features-lint.ts` 均绝对别名、有效。

- [ ] **Step 2：重指 `cases-lint.ts` L29 对 cases-e2e 的 import（统一绝对别名）**

`.claude/scripts/_shared/cli/cases-lint.ts:29`，before：
```ts
import { registerCasesE2e } from "./cases-e2e.ts";
```
after：
```ts
import { registerCasesE2e } from "@shared/cli/cases-e2e.ts";
```
（L30 `@shared/cli/features-lint.ts` 已在 Commit 2 设定，不改。）

- [ ] **Step 3：重指 `index.ts`（留 engine 注册中心）对 cases-lint 的 import**

`engine/src/cli/index.ts:117`，before：
```ts
import { buildCasesCommand } from "./cases-lint.ts";
```
after：
```ts
import { buildCasesCommand } from "@shared/cli/cases-lint.ts";
```

- [ ] **Step 4：重指 `cases-lint.test.ts` import**

- `engine/tests/cli/cases-lint.test.ts:8`：`../../src/cli/cases-lint.ts` → `@shared/cli/cases-lint.ts`

- [ ] **Step 5：完整性 grep + 类型检查 + 相关测试转绿**

Run（在 worktree 内）：
```bash
echo "--- 残留 engine 引用扫描（应为空）---"
grep -rn '"\.\./e2e/\|src/e2e/\|src/cli/cases-e2e\|src/cli/cases-lint\|src/cli/features-lint\|"\./cases-e2e\|"\./cases-lint\|"\./features-lint' engine .claude/scripts tools --include="*.ts" | grep -v '\.claude/scripts/_shared/' || echo "no stray engine refs (good)"
bun run type-check; echo "type-check exit=$?"
bun test engine/tests/e2e engine/tests/cli/cases-lint.test.ts engine/tests/cli/features-lint.test.ts 2>&1 | tail -3
```
Expected：残留扫描为空（cases 子系统全部 `@shared/*`）；`type-check exit=0`；相关测试全 pass（`index.ts` 经 `@shared/cli/cases-lint.ts` 注册 `buildCasesCommand`，命令链完整）。

- [ ] **Step 6：Commit 3（路径限定暂存）**

Run（在 worktree 内）：
```bash
git add .claude/scripts/_shared/cli/cases-e2e.ts \
        .claude/scripts/_shared/cli/cases-lint.ts \
        engine/src/cli/index.ts \
        engine/tests/cli/cases-lint.test.ts
git commit -m "refactor: ✨ move cases-e2e and cases-lint to _shared/cli"
git status --short
```
Expected：commit 成功；旧路径残留「D」用 `git rm engine/src/cli/cases-e2e.ts engine/src/cli/cases-lint.ts` 显式补暂存；禁 `git add -A`。

---

## Task 4：全量回归 + 合并 main + push + 清理

- [ ] **Step 1：worktree 内全量回归**

Run（在 worktree 内）：
```bash
bun run type-check; echo "type-check exit=$?"
bun test --cwd engine 2>&1 | tail -6
bun run check:skills; echo "check:skills exit=$?"
bun run check; echo "check exit=$?"
bun run lint:debris; echo "lint:debris exit=$?"
bun run lint:paths; echo "lint:paths exit=$?"
```
Expected：`type-check exit=0`；engine 测试 1358 pass / 1 skip / 0 fail（与基线一致）；`check:skills exit=0`；`check exit=0`；`lint:debris exit=0`；`lint:paths exit=0`。任何失败先在本 worktree 修复，不带病合并。

- [ ] **Step 2：确认 Codex 占位状态未漂移**

Run（在 worktree 内）：
```bash
git diff --stat main -- .agents/ ; echo "agents-diff exit=$?"
```
Expected：未触碰 `.agents/**`（diff 为空）；`.agents/README.md` 占位描述仍准确。`lint:skills:codex` 占位红为 pre-existing，不在本计划修复范围。

- [ ] **Step 3：记录 worktree HEAD 并合并回 main**

Run：
```bash
cd .worktrees/bundle-8-cases-e2e-closure && SHA=$(git rev-parse HEAD); echo "$SHA"
cd /Users/poco/Projects/kata
git merge --no-ff "$SHA" -m "merge: 🔀 整合 bundle 8 cases/e2e 子系统收口 _shared"
```

- [ ] **Step 4：主工作树复验**

Run（在 `/Users/poco/Projects/kata`）：
```bash
bun run type-check; echo "type-check exit=$?"
bun test --cwd engine 2>&1 | tail -6
bun run check:skills; echo "check:skills exit=$?"
```
Expected：`type-check exit=0`；engine 测试全 pass；`check:skills exit=0`。

- [ ] **Step 5：推送**

```bash
git push origin main
```
（远端不可用则记录阻塞，不静默跳过。）

- [ ] **Step 6：清理 worktree**

```bash
git worktree remove .worktrees/bundle-8-cases-e2e-closure
git worktree list
```
Expected：列表不再含 `bundle-8-cases-e2e-closure`。

---

## Self-Review

**1. 范围覆盖：** 本计划交付「cases/e2e 子系统收口」单一连贯增量：迁 e2e 簇 + features-lint，解除 cases-e2e/cases-lint 仅存的两条反向边，把 cases 子系统整体迁出 engine。这是 bundle-6（cases 动词/领域）+ bundle-7（lint 簇）的自然终结。三个迁移目标（e2e、features-lint、cases 收口）+ 全量回归各成一 Task，逐项覆盖。features 簇本体、index.ts 注册中心明确列入 §后续。

**2. Placeholder 扫描：** 无 TBD/TODO；每个 `git mv` 与 import 重指给出 exact 文件:行 与完整 before/after 或精确 from→to（A/C/D 三表 + 各 Task Step）；每个验证步骤给出 exact 命令与预期计数；Commit 3 含全仓残留完整性 grep。

**3. 类型/命名一致性：** 落点统一——e2e 运行时逻辑 `_shared/lib/e2e/`（别名 `@shared/lib/e2e/<file>.ts`，与 `_shared/lib/cases/` 同构）；CLI 模块 `_shared/cli/`（别名 `@shared/cli/<file>.ts`，与 bundle-6 cases 动词同位）。导出符号（`runCaseDraftE2e`、`invokeClaude/invokeCodex/buildClaudeArgs/buildCodexArgs`、`runFeaturesLint`、`registerCasesE2e`、`buildCasesCommand`、`lintLanhuBlockedDrafts` 等）内容不变、仅位置变；import 名前后一致。cases-lint 迁后 import 统一为绝对 `@shared/*`（L29 由 `./cases-e2e` 收敛为 `@shared/cli/cases-e2e`，与 L30/lint/动词 import 风格一致）。

**4. 顺序与每步绿（依赖顺序论证）：** 依赖链 e2e（零反向）→ features-lint（零反向）→ cases-e2e（依赖 e2e）→ cases-lint（依赖 cases-e2e + features-lint）。三 commit 严格按此序：Commit 1 迁 e2e（cases-e2e 留 engine 前向引用 `@shared/lib/e2e`）→ Commit 2 迁 features-lint（features.ts/cases-lint 留 engine 前向引用）→ Commit 3 同时迁 cases-e2e + cases-lint（两者互为同目录 `_shared/cli` 邻居，且各自 `@shared` 依赖已在前两 commit 就位）。每 commit 内 `git mv` 破坏的 import 在 commit 前全部重指转绿，无跨 commit 悬空。

**5. 验证完备性：** 各 Task 自带 type-check + 受影响测试转绿；Commit 3 追加全仓残留 grep（确认 cases 子系统无 `../e2e/`/`./cases-e2e`/`./cases-lint`/`./features-lint`/`src/cli/cases-*`/`src/e2e/` 悬空，仅剩 `_shared/`）；Task 4 追加全量 `bun test --cwd engine`（1358 对账）+ check:skills（经迁入模块运行）+ check + lint:debris + lint:paths + Codex 占位复核。关键正确性：`index.ts` 经 `@shared/cli/cases-lint.ts` 注册 `buildCasesCommand` → `kata cases` 命令链（compare/verify/validate/e2e/lint）完整，由 `cases-lint.test.ts` + 全量 CLI 测试覆盖。

**6. 风险/watch-items：**
- **e2e 测试 run/skip 行为：** 迁移仅改 import 路径、不改测试体；`case-draft-e2e.test.ts` 若原本 spawn 真实 runtime 或被 env 守卫，迁后行为不变（全量基线 1 skip 守恒）。Task 1 Step 4 实证 0 fail。
- **`index.ts` 注册中心前向引用迁出 umbrella：** L117 改 `@shared/cli/cases-lint.ts` 后，注册中心 → shared 前向依赖合法（注册中心本体留 bundle-11）；由 check:skills/全量 CLI 测试间接验证命令注册不缺失。
- **Commit 3 双文件同迁的邻居解析：** cases-lint L29 用绝对 `@shared/cli/cases-e2e.ts`（非 `./`），即使两文件同 commit 迁移也稳定解析到新位置；与 bundle-6 sibling 用绝对别名的既定风格一致。
- **`git mv` 删除侧暂存：** 路径限定暂存下若旧路径残留未暂存「D」，用 `git rm <旧路径>` 显式补暂存，严禁 `git add -A`。

---

## 后续 Plan（更新后路线图，待本计划落地后再写）

cases/lint/e2e/audit 子系统收口后，engine 仅剩 features 簇、若干 skill-exclusive 命令与注册中心/基础设施：

- **bundle-9（features 簇）**：`engine/src/cli/features-{index,ls,new,resolve,show}.ts` + `features.ts` + `engine/src/features/*` 依赖图实测后归属判定（多 skill 共享 → `_shared/cli`+`_shared/lib`），并处理 `features.ts` 对已迁 `@shared/cli/features-lint.ts` 的现有前向引用。
- **bundle-10（剩余 skill-exclusive 命令）**：`history-convert` + `history-convert.ts`（case-edit）、`knowledge-curate` + `knowledge-curate.ts`（knowledge-curate）、`scan-report.ts` + `_shared/lib/scan-report-*`（defect-analyze）逐簇判定 skill-exclusive vs shared 后迁移。
- **bundle-11（engine 收口删除 + 测试基础设施统一）**：CLI 注册中心 `engine/src/cli/index.ts` 收口到 `_shared/cli`（noun-verb builders + `@shared/cli/bin/kata` 直接注册全部命令）；剩余 `engine/src/*`（api、auto-fixer、config、codemod、policy、runners、telemetry、source-analyze、discuss、repo-sync、init-wizard 等）逐项判定归宿；所有 skill 测试物理迁入各自 `tests/` + `cli-runner.ts` 收口 + `bunfig.toml`/`test:skills` 并入 `ci`；`lint` 脚本并入 `_shared` 覆盖（补累积的覆盖缺口）；移除 `engine/` workspace 成员并删除 `engine/`；同步所有 `engine/...` 文档路径。
- **phases-md 决策（spec §10 commit 4-5）**：统一回 `phases/§N-*.md` 还是认可现 bundle `prompts/`+`references/` 结构为等效——需用户拍板。
- **Codex / Phase-2**：`.agents/**` 适配，消解 `lint:skills:codex` 占位红。
