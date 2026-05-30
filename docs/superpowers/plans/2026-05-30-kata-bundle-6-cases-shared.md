# Bundle-6 cases 共享簇下沉 `_shared` 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: 用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实施本计划。步骤用 checkbox（`- [ ]`）跟踪。

**Goal:** 把 cases 领域逻辑三件套与 compare/verify/validate 三个 CLI 动词从 `engine/` 下沉到 `.claude/scripts/_shared/`，使 case 校验子系统脱离 engine、只依赖 `@shared/*`。

**Architecture:** 沿用 bundle-3/5 的 `git mv` + 路径别名重指模式。领域逻辑 `engine/src/cases/{verify-layers,source-fact-set,case-extract}.ts` → `_shared/lib/cases/`（与 `_shared/lib/source-ref/` 同构的领域子目录）；CLI 动词 `engine/src/cli/cases-{compare,verify,validate}.ts` → `_shared/cli/`（与 bundle-5 迁入的 archive-gen/xmind-gen 同位）。umbrella `cases-lint.ts` 与 `cases-e2e.ts` 因反向依赖 `engine/src/{lint,e2e}/*` + `features-lint.ts` 留在 engine，仅把它们对迁出文件的 import 前向重指到 `@shared/*`。

**Tech Stack:** Bun ≥ 1.3、TypeScript、commander、biome；路径别名 `@shared/* → ./.claude/scripts/_shared/*`（`tsconfig.base.json`）。

---

## 背景与关键发现

依赖图实测（`grep` 全仓 importer + 各文件 import 头）后确认 cases 簇的真实边界，并据实对 bundle-5 §后续 列出的「迁 `cases-{compare,verify,validate,e2e}`」做了一处有据收窄：

1. **领域三件套完全干净，可直接下沉。** `cases/verify-layers.ts` 只 import `@shared/lib/source-ref/resolve-target.ts`、`@shared/schemas/loaders.ts`、`yaml`；`cases/source-fact-set.ts` 零 import；`cases/case-extract.ts` 只 import 同目录 `./verify-layers.ts`。无任何 `engine/` 反向依赖。

2. **compare/verify/validate 三动词干净，可下沉。** 三者 import 仅为「领域三件套 + `@shared/lib/*` + `@shared/schemas/*` + commander」。迁出后对三件套的 import 由相对路径 `../cases/*` 改为 `@shared/lib/cases/*`，方向仍是「shared → shared」，无反向依赖。

3. **`cases-e2e.ts` 必须留在 engine（收窄理由）。** 它 import `../e2e/case-draft-e2e.ts`（`engine/src/e2e/`，bundle-7/8 才迁）。若把 `cases-e2e.ts` 迁入 `_shared/cli/`，会产生 `_shared → engine/src/e2e` 反向依赖，违反 bundle 模式核心不变量（shared 不得依赖待删的 engine）。`cases-e2e.ts` 不 import 任何迁出文件，留在 engine 零成本。bundle-5 §后续 把它列入迁移集属表层「cases-* 动词」归并；依赖图实测据实剔除，与 bundle-5 自身剔除 case-edit/cases 同类处理。

4. **`cases-lint.ts` umbrella 必须留在 engine。** 它 import 11 个 `../lint/*` 模块 + `./features-lint.ts` + `./cases-e2e.ts`，全是 bundle-7/8 才迁的反向依赖；本体下沉会立刻制造大量 `_shared → engine` 反向边。本计划只把它对迁出三动词的注册 import（L26/28/29）前向重指到 `@shared/cli/*`；它仍是 `engine/src/cli/index.ts` 经 `buildCasesCommand` 注册的 CLI 入口，方向为「engine → shared」，合法。

5. **engine 源 `e2e/case-draft-e2e.ts` 也消费迁出动词。** 其 L3/L4 import `../cli/cases-compare.ts`、`../cli/cases-verify.ts`，迁移后必须前向重指到 `@shared/cli/*`（engine → shared，合法）。

6. **cases 测试直接 import 源文件，迁移即破。** 与 bundle-5 渲染簇测试走 `KATA_CLI` 子进程不同，cases 的 8 处测试 import 直指 `../../src/cases/*` 或 `../../src/cli/cases-*`，`git mv` 后必须同 commit 重指到 `@shared/*`，否则中途红。`dead-code-cleanup.test.ts:14` 的 `source("engine/src/cli/cases-validate.ts")` 是字符串路径，同样需改为 `.claude/scripts/_shared/cli/cases-validate.ts`（该测试已有 `.claude/scripts/_shared/lib/state.ts` 字符串先例）。

7. **基线测试计数。** 迁移前 `bun test engine/tests/cases engine/tests/cli/cases-{compare,verify,validate}.test.ts` = **47 pass / 0 fail / 6 files**；全量 `bun test --cwd engine` = 1358 pass / 1 skip / 0 fail。

---

## Carryover 约束（贯穿全计划）

- **Worktree-first：** 改动在 detached worktree `.worktrees/bundle-6-cases-shared` 内完成；不新建分支；`git worktree add --detach .worktrees/bundle-6-cases-shared main`。
- **路径限定暂存：** 只用 `git add <path>` / `git rm <path>` / `git mv <from> <to>`，**严禁** `git add -A` / `git add .`（规避脏 submodule `plugins/lanhu/mcp-bridge/lanhu-mcp` 与历史 `docs/superpowers/plans/.process/**` 删除）。
- **只读源仓库：** `workspace/{project}/.kata/repos/**` 只读，禁 push/commit/write/mv/rm/chmod。
- **Immutability：** 不就地修改对象，迁移仅移动文件 + 改 import 字符串，不改运行逻辑。
- **Commit 规范：** `type: emoji description`（type 小写、≤72 字符），固定映射 `refactor: ✨`、`chore: 🧹`、`merge: 🔀`、`test: 🧪`。
- **Test-after-edit：** 每个改代码步骤后跑相关测试；任何失败（含 pre-existing）须在本 worktree 排查根因修复，不得 skip/TODO/注释绕过；超范围失败须先停下来向用户说明并取得显式同意才能 defer。
- **Codex Phase-2：** 本计划不动 `.agents/**`；同步评估义务降级为「确认 `.agents/README.md` 仍准确描述占位状态」。已知 `lint:skills:codex` 13 项为占位红，非本计划引入，不在本计划修复范围。
- **lint 脚本覆盖缺口（承自 bundle-5）：** `lint` 脚本（`biome check engine/src ...`）不扫描 `.claude/scripts/`，故迁入文件不被 `lint` 覆盖；但 `bun run check`（`biome check .`）与根 `type-check` 覆盖之。该全局 lint 缺口记入 bundle-8 engine 删除计划，非本计划新增问题。

---

## Scope

**IN：**
- `git mv` 领域三件套 `engine/src/cases/*` → `.claude/scripts/_shared/lib/cases/`。
- `git mv` 三动词 `engine/src/cli/cases-{compare,verify,validate}.ts` → `.claude/scripts/_shared/cli/`。
- 迁出文件内部对三件套的相对 import 重指为 `@shared/lib/cases/*`。
- 留 engine 的 `cases-lint.ts`、`e2e/case-draft-e2e.ts` 对迁出文件的 import 前向重指为 `@shared/*`。
- 8 处测试 import（含 1 处字符串路径）重指为 `@shared/*` / `.claude/scripts/_shared/*`。

**OUT：**
- `cases-e2e.ts`、`cases-lint.ts` 本体不迁（背景发现 3、4）——留 bundle-7/8。
- `engine/src/lint/*`、`engine/src/e2e/*`、`engine/src/cli/features-lint.ts` 不迁——bundle-7/8。
- 不改任何运行逻辑、CLI 命令名、子命令字符串、选项、模板。
- 不动 `.agents/**`、不修 Codex 占位红、不动 MCP/catalog（已由 simplify-1 拆除）。
- 不补 `lint` 脚本对 `_shared` 的覆盖（bundle-8）。

---

## File Structure（迁移与重指全表）

### A. 迁移（6 个 `git mv`）

| From | To | 别名 |
| --- | --- | --- |
| `engine/src/cases/verify-layers.ts` | `.claude/scripts/_shared/lib/cases/verify-layers.ts` | `@shared/lib/cases/verify-layers.ts` |
| `engine/src/cases/source-fact-set.ts` | `.claude/scripts/_shared/lib/cases/source-fact-set.ts` | `@shared/lib/cases/source-fact-set.ts` |
| `engine/src/cases/case-extract.ts` | `.claude/scripts/_shared/lib/cases/case-extract.ts` | `@shared/lib/cases/case-extract.ts` |
| `engine/src/cli/cases-compare.ts` | `.claude/scripts/_shared/cli/cases-compare.ts` | `@shared/cli/cases-compare.ts` |
| `engine/src/cli/cases-verify.ts` | `.claude/scripts/_shared/cli/cases-verify.ts` | `@shared/cli/cases-verify.ts` |
| `engine/src/cli/cases-validate.ts` | `.claude/scripts/_shared/cli/cases-validate.ts` | `@shared/cli/cases-validate.ts` |

### B. 迁出文件内部 import 重指

- `_shared/cli/cases-compare.ts`：`../cases/source-fact-set.ts` → `@shared/lib/cases/source-fact-set.ts`；`../cases/verify-layers.ts` → `@shared/lib/cases/verify-layers.ts`。
- `_shared/cli/cases-verify.ts`：`../cases/case-extract.ts` → `@shared/lib/cases/case-extract.ts`；`../cases/verify-layers.ts` → `@shared/lib/cases/verify-layers.ts`；`@shared/lib/source-ref/resolve-target.ts` **不改**。
- `_shared/lib/cases/case-extract.ts`：`./verify-layers.ts` **不改**（同目录一起迁）。
- `_shared/lib/cases/verify-layers.ts`、`source-fact-set.ts`：import 全为 `@shared/*`/node/yaml，**不改**。
- `_shared/cli/cases-validate.ts`：import 全为 `@shared/*`/node/commander，**不改**。

### C. 留 engine 文件 import 前向重指（engine → shared）

- `engine/src/cli/cases-lint.ts` L26：`./cases-compare.ts` → `@shared/cli/cases-compare.ts`；L28：`./cases-validate.ts` → `@shared/cli/cases-validate.ts`；L29：`./cases-verify.ts` → `@shared/cli/cases-verify.ts`；L27 `./cases-e2e.ts` **不改**。
- `engine/src/e2e/case-draft-e2e.ts` L3：`../cli/cases-compare.ts` → `@shared/cli/cases-compare.ts`；L4：`../cli/cases-verify.ts` → `@shared/cli/cases-verify.ts`。

### D. 测试 import 重指

| 文件:行 | From | To |
| --- | --- | --- |
| `engine/tests/cases/source-fact-set.test.ts:2` | `../../src/cases/source-fact-set.ts` | `@shared/lib/cases/source-fact-set.ts` |
| `engine/tests/cases/verify-layers.test.ts:13` | `../../src/cases/verify-layers.ts` | `@shared/lib/cases/verify-layers.ts` |
| `engine/tests/cases/case-extract.test.ts:5` | `../../src/cases/case-extract.ts` | `@shared/lib/cases/case-extract.ts` |
| `engine/tests/cli/cases-compare.test.ts:5` | `../../src/cli/cases-compare.ts` | `@shared/cli/cases-compare.ts` |
| `engine/tests/cli/cases-verify.test.ts:5` | `../../src/cli/cases-verify.ts` | `@shared/cli/cases-verify.ts` |
| `engine/tests/cli/cases-validate.test.ts:7` | `../../src/cli/cases-validate.ts` | `@shared/cli/cases-validate.ts` |
| `engine/tests/e2e/case-draft-e2e.test.ts:6` | `../../src/cli/cases-compare.ts` | `@shared/cli/cases-compare.ts` |
| `engine/tests/dead-code-cleanup.test.ts:14` | `"engine/src/cli/cases-validate.ts"`（字符串） | `".claude/scripts/_shared/cli/cases-validate.ts"` |

### Commit 划分

- **Commit 1（领域三件套）：** 迁 `cases/*` 三件套 + 重指其 importer（仍在 engine 的 compare/verify 的 `../cases/*` → `@shared/lib/cases/*`）+ 重指三件套测试。独立绿。
- **Commit 2（三动词）：** 迁 compare/verify/validate → `_shared/cli/` + 重指外部 importer（cases-lint L26/28/29、e2e 源 L3/4）+ 重指动词测试 + dead-code-cleanup 字符串。独立绿。

---

## Prerequisites：建立 worktree 与基线

- [ ] **P-1：主工作树快照（如有改动）**

Run（在 `/Users/poco/Projects/kata`）：
```bash
git status --short
```
若有任何 tracked/untracked 改动：`git add -A && git commit -m "chore: 🧹 save pre-worktree local changes"`。若 `git status --short` 为空则跳过。
Expected：工作树干净后再继续。

- [ ] **P-2：创建 detached worktree + symlink `.kata`**

Run（在 `/Users/poco/Projects/kata`）：
```bash
ROOT=$(pwd)
W="$ROOT/.worktrees/bundle-6-cases-shared"
git worktree add --detach "$W" main
mkdir -p "$W/workspace/kata"
ln -s "$ROOT/workspace/kata/.kata" "$W/workspace/kata/.kata"
git -C "$W" rev-parse HEAD
```
Expected：worktree 建在 `.worktrees/bundle-6-cases-shared`，HEAD = 当前 main SHA；`.kata` symlink 就位（全量测试子进程读取证据用，只读）。后续所有步骤的 `cd` 目标均为该 worktree。

- [ ] **P-3：记录基线**

Run（在 worktree 内）：
```bash
cd .worktrees/bundle-6-cases-shared
bun test engine/tests/cases engine/tests/cli/cases-compare.test.ts engine/tests/cli/cases-verify.test.ts engine/tests/cli/cases-validate.test.ts 2>&1 | tail -3
```
Expected：`47 pass / 0 fail`。记录为迁移后回归对账基线。

---

## Task 1：领域三件套 → `_shared/lib/cases/`（Commit 1）

**Files:**
- Move: `engine/src/cases/{verify-layers,source-fact-set,case-extract}.ts` → `.claude/scripts/_shared/lib/cases/`
- Modify: `engine/src/cli/cases-compare.ts`、`engine/src/cli/cases-verify.ts`（仍在 engine，重指 `../cases/*` → `@shared/lib/cases/*`）
- Modify（测试）: `engine/tests/cases/{source-fact-set,verify-layers,case-extract}.test.ts`

- [ ] **Step 1：建目标目录并 `git mv` 三件套**

Run（在 worktree 内）：
```bash
mkdir -p .claude/scripts/_shared/lib/cases
git mv engine/src/cases/verify-layers.ts   .claude/scripts/_shared/lib/cases/verify-layers.ts
git mv engine/src/cases/source-fact-set.ts .claude/scripts/_shared/lib/cases/source-fact-set.ts
git mv engine/src/cases/case-extract.ts    .claude/scripts/_shared/lib/cases/case-extract.ts
```
Expected：`engine/src/cases/` 不再存在（三文件全迁，git 不跟踪空目录）；`case-extract.ts` 的 `import type { CaseRecord } from "./verify-layers.ts";` 仍同目录有效，无需改。

- [ ] **Step 2：重指 `cases-compare.ts`（仍在 engine）对三件套的 import**

`engine/src/cli/cases-compare.ts` L4-5，before：
```ts
import { extractSourceFactSet, jaccard } from "../cases/source-fact-set.ts";
import { STABLE_CORE_ARTIFACTS } from "../cases/verify-layers.ts";
```
after：
```ts
import { extractSourceFactSet, jaccard } from "@shared/lib/cases/source-fact-set.ts";
import { STABLE_CORE_ARTIFACTS } from "@shared/lib/cases/verify-layers.ts";
```

- [ ] **Step 3：重指 `cases-verify.ts`（仍在 engine）对三件套的 import**

`engine/src/cli/cases-verify.ts` L8，before `import { extractCaseRecords } from "../cases/case-extract.ts";` → after `import { extractCaseRecords } from "@shared/lib/cases/case-extract.ts";`。

同文件 L19，before（多行 import 块结尾）：
```ts
} from "../cases/verify-layers.ts";
```
after：
```ts
} from "@shared/lib/cases/verify-layers.ts";
```
（L6 `@shared/lib/source-ref/resolve-target.ts` 不改。）

- [ ] **Step 4：重指三件套测试 import**

- `engine/tests/cases/source-fact-set.test.ts:2`：`../../src/cases/source-fact-set.ts` → `@shared/lib/cases/source-fact-set.ts`
- `engine/tests/cases/verify-layers.test.ts:13`：`../../src/cases/verify-layers.ts` → `@shared/lib/cases/verify-layers.ts`
- `engine/tests/cases/case-extract.test.ts:5`：`../../src/cases/case-extract.ts` → `@shared/lib/cases/case-extract.ts`

- [ ] **Step 5：类型检查 + 相关测试转绿**

Run（在 worktree 内）：
```bash
bun run type-check; echo "type-check exit=$?"
bun test engine/tests/cases engine/tests/cli/cases-compare.test.ts engine/tests/cli/cases-verify.test.ts engine/tests/cli/cases-validate.test.ts 2>&1 | tail -3
```
Expected：`type-check exit=0`；`47 pass / 0 fail`（迁移正确性由「三件套测试经 `@shared/lib/cases/*` 解析 + compare/verify 命令测试经重指 import 运行」双重把关）。

- [ ] **Step 6：Commit 1（路径限定暂存）**

Run（在 worktree 内）：
```bash
git add .claude/scripts/_shared/lib/cases/verify-layers.ts \
        .claude/scripts/_shared/lib/cases/source-fact-set.ts \
        .claude/scripts/_shared/lib/cases/case-extract.ts \
        engine/src/cli/cases-compare.ts engine/src/cli/cases-verify.ts \
        engine/tests/cases/source-fact-set.test.ts \
        engine/tests/cases/verify-layers.test.ts \
        engine/tests/cases/case-extract.test.ts
git commit -m "refactor: ✨ move cases domain trio to _shared/lib/cases"
git status --short
```
Expected：commit 成功；`git status --short` 不含脏 submodule 等无关项（git mv 的删除侧由 `git add <新路径>` + git 自动记录重命名；若旧路径残留为「D」未暂存，用 `git rm engine/src/cases/<file>.ts` 显式暂存，仍禁 `git add -A`）。

---

## Task 2：三动词 → `_shared/cli/`（Commit 2）

**Files:**
- Move: `engine/src/cli/cases-{compare,verify,validate}.ts` → `.claude/scripts/_shared/cli/`
- Modify: `engine/src/cli/cases-lint.ts`（L26/28/29 前向重指）、`engine/src/e2e/case-draft-e2e.ts`（L3/4 前向重指）
- Modify（测试）: `engine/tests/cli/cases-{compare,verify,validate}.test.ts`、`engine/tests/e2e/case-draft-e2e.test.ts`、`engine/tests/dead-code-cleanup.test.ts`

- [ ] **Step 1：`git mv` 三动词**

Run（在 worktree 内）：
```bash
git mv engine/src/cli/cases-compare.ts  .claude/scripts/_shared/cli/cases-compare.ts
git mv engine/src/cli/cases-verify.ts   .claude/scripts/_shared/cli/cases-verify.ts
git mv engine/src/cli/cases-validate.ts .claude/scripts/_shared/cli/cases-validate.ts
```
Expected：三动词迁入 `_shared/cli/`；其对 `@shared/lib/cases/*`（Task 1 已设）与其余 `@shared/*` 的 import 因是绝对别名仍有效，无需再改；`cases-validate.ts` 全 `@shared/*` import 无需改。

- [ ] **Step 2：重指 `cases-lint.ts`（留 engine）对三动词的注册 import**

`engine/src/cli/cases-lint.ts` L26/28/29，before：
```ts
import { registerCasesCompare } from "./cases-compare.ts";
import { registerCasesE2e } from "./cases-e2e.ts";
import { registerCasesValidate, runCasesValidate } from "./cases-validate.ts";
import { registerCasesVerify } from "./cases-verify.ts";
```
after（仅改 26/28/29，L27 `cases-e2e` 不改）：
```ts
import { registerCasesCompare } from "@shared/cli/cases-compare.ts";
import { registerCasesE2e } from "./cases-e2e.ts";
import { registerCasesValidate, runCasesValidate } from "@shared/cli/cases-validate.ts";
import { registerCasesVerify } from "@shared/cli/cases-verify.ts";
```

- [ ] **Step 3：重指 `e2e/case-draft-e2e.ts`（留 engine）对动词的 import**

`engine/src/e2e/case-draft-e2e.ts` L3-4，before：
```ts
import { runCasesCompare } from "../cli/cases-compare.ts";
import { runCasesVerify } from "../cli/cases-verify.ts";
```
after：
```ts
import { runCasesCompare } from "@shared/cli/cases-compare.ts";
import { runCasesVerify } from "@shared/cli/cases-verify.ts";
```

- [ ] **Step 4：重指动词测试 + dead-code-cleanup 字符串**

- `engine/tests/cli/cases-compare.test.ts:5`：`../../src/cli/cases-compare.ts` → `@shared/cli/cases-compare.ts`
- `engine/tests/cli/cases-verify.test.ts:5`：`../../src/cli/cases-verify.ts` → `@shared/cli/cases-verify.ts`
- `engine/tests/cli/cases-validate.test.ts:7`：`../../src/cli/cases-validate.ts` → `@shared/cli/cases-validate.ts`
- `engine/tests/e2e/case-draft-e2e.test.ts:6`：`../../src/cli/cases-compare.ts` → `@shared/cli/cases-compare.ts`
- `engine/tests/dead-code-cleanup.test.ts:14`：`source("engine/src/cli/cases-validate.ts")` → `source(".claude/scripts/_shared/cli/cases-validate.ts")`

- [ ] **Step 5：类型检查 + 相关测试转绿**

Run（在 worktree 内）：
```bash
bun run type-check; echo "type-check exit=$?"
bun test engine/tests/cases engine/tests/cli/cases-compare.test.ts engine/tests/cli/cases-verify.test.ts engine/tests/cli/cases-validate.test.ts engine/tests/e2e/case-draft-e2e.test.ts engine/tests/dead-code-cleanup.test.ts 2>&1 | tail -3
```
Expected：`type-check exit=0`；全 pass、0 fail（`dead-code-cleanup` P4-03 经新字符串路径 `readFileSync` 成功 → 验证字符串重指正确；`case-draft-e2e` import 经 `@shared/cli/*` 解析成功 → 验证 e2e 源重指正确）。

- [ ] **Step 6：Commit 2（路径限定暂存）**

Run（在 worktree 内）：
```bash
git add .claude/scripts/_shared/cli/cases-compare.ts \
        .claude/scripts/_shared/cli/cases-verify.ts \
        .claude/scripts/_shared/cli/cases-validate.ts \
        engine/src/cli/cases-lint.ts engine/src/e2e/case-draft-e2e.ts \
        engine/tests/cli/cases-compare.test.ts \
        engine/tests/cli/cases-verify.test.ts \
        engine/tests/cli/cases-validate.test.ts \
        engine/tests/e2e/case-draft-e2e.test.ts \
        engine/tests/dead-code-cleanup.test.ts
git commit -m "refactor: ✨ move cases compare/verify/validate verbs to _shared/cli"
git status --short
```
Expected：commit 成功；旧路径残留「D」用 `git rm engine/src/cli/cases-<verb>.ts` 显式暂存；禁 `git add -A`。

---

## Task 3：全量回归 + 合并 main + push + 清理

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
Expected：`type-check exit=0`；engine 测试 1358 pass / 1 skip / 0 fail（与基线一致）；`check:skills exit=0`（输出 3 行 passed）；`check exit=0`；`lint:debris exit=0`；`lint:paths exit=0`（P-S1/P-S4 已退役，迁入 `.claude/scripts/` 不触发）。任何失败先在本 worktree 修复，不得带病合并。

- [ ] **Step 2：确认 Codex 占位状态未漂移**

Run（在 worktree 内）：
```bash
git diff --stat main -- .agents/ ; echo "agents-diff exit=$?"
```
Expected：本计划未触碰 `.agents/**`（diff 为空）；`.agents/README.md` 占位描述仍准确（无 apps/mcp、projection、cases 相关前瞻语句受影响）。`lint:skills:codex` 13 项占位红为 pre-existing，不在本计划修复范围。

- [ ] **Step 3：记录 worktree HEAD 并合并回 main**

Run：
```bash
cd .worktrees/bundle-6-cases-shared && SHA=$(git rev-parse HEAD); echo "$SHA"
cd /Users/poco/Projects/kata
git merge --no-ff "$SHA" -m "merge: 🔀 整合 bundle 6 cases 簇下沉 _shared"
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
git worktree remove .worktrees/bundle-6-cases-shared
git worktree list
```
Expected：列表不再含 `bundle-6-cases-shared`。

---

## Self-Review

**1. 范围覆盖：** 本计划交付「cases 簇 → `_shared`」单一独立增量。依赖图实测对 bundle-5 §后续 的迁移集做了一处有据收窄（剔除 `cases-e2e.ts`，背景发现 3）+ 一处早已明确的不迁（`cases-lint.ts` 本体，背景发现 4），理由均为「避免 `_shared → engine` 反向依赖」，符合 bundle 模式不变量与 writing-plans Scope Check。spec（skill-bundle-migration §9 迁移序列）中「cases 簇下沉」要求由 Task 1（领域三件套）+ Task 2（三动词）+ Task 3（回归/合并）逐项覆盖。

**2. Placeholder 扫描：** 无 TBD/TODO；每个改代码步骤给出 exact 文件:行 与完整 before/after 代码块或精确 from→to；每个验证步骤给出 exact 命令与预期计数。

**3. 类型/命名一致性：** 落点统一——领域逻辑 `.claude/scripts/_shared/lib/cases/`（别名 `@shared/lib/cases/<file>.ts`），CLI 动词 `.claude/scripts/_shared/cli/`（别名 `@shared/cli/<file>.ts`）。导出符号（`registerCasesCompare/Verify/Validate`、`runCasesValidate/Compare/Verify`、`extractSourceFactSet`、`jaccard`、`STABLE_CORE_ARTIFACTS`、`extractCaseRecords`、`CaseRecord`）内容不变、仅文件位置变；import 名前后一致。`cases-e2e.ts`/`cases-lint.ts` 留 engine 与「umbrella 仍由 index.ts `buildCasesCommand` 注册」一致。

**4. 顺序与每步绿：** Prerequisites（worktree/symlink/基线）→ Task 1（三件套迁移 + 其 engine-side importer 与测试同 commit 重指，独立绿，commit 1）→ Task 2（三动词迁移 + 外部 importer/测试/字符串同 commit 重指，独立绿，commit 2）→ Task 3（全量回归/合并/push/清理）。`git mv` 破坏 import 的红只存在于 Task 内部、commit 前必转绿：Commit 1 把「三件套的 engine-side 消费者（compare/verify 的 `../cases/*`）」与三件套测试同 commit 重指；Commit 2 把「三动词的外部消费者（cases-lint/e2e 源）+ 动词测试 + dead-code 字符串」同 commit 重指。无跨 commit 悬空 import。

**5. 验证完备性：** 迁移正确性由多重把关——`type-check exit 0`（根 tsconfig 解析 `@shared/lib/cases/*` 与 `@shared/cli/*`）；`bun test engine/tests/cases + cli/cases-* + e2e/case-draft-e2e + dead-code-cleanup` 全 pass（三件套测试 → 验证领域别名解析；动词测试 → 验证动词别名解析；`case-draft-e2e` → 验证 e2e 源前向重指；`dead-code-cleanup` P4-03 `readFileSync` → 验证字符串路径重指）；Task 3 追加 `bun test --cwd engine` 全量（1358 pass 对账基线）+ check:skills + check + lint:debris + lint:paths + Codex 占位复核。

**6. 风险/watch-items：**
- **`@shared/lib/cases/` 新子目录解析：** 机制同既有 `@shared/lib/source-ref/`（现网已验证），Task 1 Step 5 三件套测试实证；若意外失败说明 tsconfig paths 对新子目录解析异常，在该步排查（回退：相对 import）。
- **`cases-lint.ts` umbrella 留 engine 后仍引用迁出动词：** L26/28/29 改 `@shared/cli/*` 后，`buildCasesCommand` 注册链（compare/verify/validate/e2e/lint）须完整；由 `bun test --cwd engine` 中 `cases-lint.test.ts`（`lintLanhuBlockedDrafts`）+ CLI 注册相关测试间接覆盖。
- **`git mv` 删除侧暂存：** 路径限定暂存下，若旧路径残留为未暂存「D」，用 `git rm <旧路径>` 显式暂存，严禁 `git add -A`（规避脏 submodule）。
- **lint 脚本不扫描迁出文件：** 内容未变、`bun run check` 覆盖，无回归；全局 lint 覆盖缺口记入 bundle-8，非本计划新增。

---

## 后续 Plan（更新后路线图，待本计划落地后再写）

cases 簇下沉后，engine 收口剩余：

- **bundle-7（剩余命令簇归属判定 + 迁移）**：`engine/src/cli/features-lint.ts`、`engine/src/lint/*`（cases-lint umbrella 依赖的 11 个 lint 模块 + types）、`engine/src/e2e/*`（`case-draft-e2e.ts`、`runtime-invoke.ts`，cases-e2e 依赖）、`history-convert`（case-edit 转换语义）、`knowledge-curate` + `knowledge-curate/*`、`scan-report` + `_shared/lib/scan-report-*`（defect-analyze）；逐簇判定 skill-exclusive vs shared 后迁移。lint/e2e 簇迁完后，`cases-lint.ts`/`cases-e2e.ts` 的反向依赖消除，可顺势下沉，cases 簇彻底脱离 engine。
- **bundle-8（engine 收口删除 + 测试基础设施统一）**：CLI 注册中心 `engine/src/cli/index.ts` 收口到 `_shared/cli`（含 noun-verb builders、`buildCasesCommand`、`@shared/cli/bin/kata` 直接注册全部命令）；所有 skill 测试物理迁入各自 `tests/` + `cli-runner.ts` 收口 + `bunfig.toml`/`test:skills` 并入 `ci`；`lint` 脚本并入 `_shared` 覆盖（补本计划记录的覆盖缺口）；移除 `engine/` workspace 成员并删除 `engine/`；同步所有 `engine/bin/kata`/`engine/src/...` 文档路径。
- **phases-md 决策（spec §10 commit 4-5）**：统一回 `phases/§N-*.md` 还是认可现 bundle `prompts/`+`references/` 结构为等效实现——目前仅 playwright-automation 用 `phases/`，需用户拍板后再补/改。
- **Codex / Phase-2**：校正 `.agents/**` 适配（`reviewers/`/`workers/` 前瞻、`prompts/agent-<step>.md` 约定），消解 `lint:skills:codex` 13 项占位红。
