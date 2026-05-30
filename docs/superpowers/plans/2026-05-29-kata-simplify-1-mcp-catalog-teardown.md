# kata 简化重构 · Plan 1（refreshed 2026-05-30）: MCP + Catalog + Projection Teardown

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除 router-simplify spec §6.1 中尚未拆除的运行时野心残留——只读 MCP 查询面（`apps/mcp/`）、其唯一依赖库（`apps/core/`）、孤儿投影模块（`engine/src/runtime/projection-targets.ts`），以及 `.mcp.json` 与 `package.json` 中的相关脚本；全程保持 `bun test` / `type-check` / `check:skills` / lint 全绿。

**Architecture:** 纯删除型变更，零运行时回归风险。实测 `apps/` 在仓库内**无任何代码 import**（唯一引用是 `.mcp.json` 的 server 注册 + `package.json` 两个脚本 + `skill-audit.ts` 两行注释）；`projection-targets.ts` **零 importer**（其 manifest / workflow / blackboard / projector 消费者已在前序 bundle 全部删除，本模块退化为孤儿）。两簇各成一 commit，独立可回滚。

**Tech Stack:** Bun 1.3、TypeScript、Biome。

**Spec:** `docs/superpowers/specs/2026-05-29-kata-skill-router-simplify-design.md` —— §6.1 删除项、§10 commit 1（mcp+catalog）与 commit 2 的 `projection-targets` 残留、§13 验收「MCP / catalog 删净」。

---

## 背景与关键发现（refreshed，supersede 原 2026-05-29 草案）

1. **草案已过期**：原草案把 manifest / workflow / projection 全部延后到一个「Plan 3」。但 bundle-3/4 期间 `manifest-loader.ts` / `workflow-schema.ts` / `workflow-check.ts` / `api.ts` 的 `SkillManifest*` re-export / 整个 `.claude/contracts/` 均已删除，`engine/src/runtime/projection-targets.ts` 成为唯一残留孤儿（`grep` 实测 0 importer）。故本版把它并入本 teardown，**不再需要单独的 Plan 3**。
2. **lint 输出已变**：`bun run check:skills` 现输出三行 `runtime skill sync passed` / `runtime detach passed` / `skill structure check passed`，已无 `workflow check passed`（原草案 Task 1/2 的「末行 workflow check passed」预期失效，本版改正）。
3. **测试集已变**：`manifest-repository.test.ts` 已不存在；当前 `engine/tests/skills/` = `{frontmatter-check, runtime-detach-repository, runtime-detach, shared-case-qa, sync-check}`，均与 apps/projection 无关。
4. **`apps/` 仓内引用面（实测）**：仅 `.mcp.json:5`、`package.json:25`（`mcp`）+ `package.json:26`（`test:apps`）+ `ci` 脚本中的 `&& bun run test:apps`，以及 `engine/src/cli/skill-audit.ts:20,24` 两行**注释**（提及已删的 `manifest-repository` 与 `apps/core/catalog/skills.ts`）。F2 stale-path lint 只禁 `docs/refactor/`，不会因该注释失败，但删除后注释指向不存在文件，本版顺手清理（hygiene，并入 commit A）。

## Carryover 约束（沿用项目规则）

1. **worktree-first**：detached `.worktrees/simplify-1-mcp-teardown`，从 `main` 检出，不含主工作树固有脏状态。
2. **只删 tracked 代码/配置**，不依赖 ignored runtime 目录，无需 symlink `.kata`。
3. **路径限定暂存**：仅用 `git rm <path>` / `git add <path>`，禁 `git add -A` / `git add .`。
4. **合并按 SHA**：在主工作树 `git merge --no-ff <sha>`；主工作树固有脏文件（`.vscode/settings.json`、`docs/superpowers/plans/.process/**` 删除）与本计划改动**无重叠**，不触碰、不暂存。
5. **Phase-1 Codex 同步评估**：本计划不改路由 / 入口语义；确认 `.agents/README.md` 占位描述仍准确即可，不改 `.agents/**`。

## Scope

**IN：** 删 `apps/mcp/`、`apps/core/`、`apps/tsconfig.json`、`.mcp.json`；清 `package.json`（`mcp` / `test:apps` 脚本 + `ci` 段）；删 `engine/src/runtime/projection-targets.ts` + 空 `engine/src/runtime/`；清 `engine/src/cli/skill-audit.ts` 两行 stale 注释。

**OUT：**
- `skill-audit.ts` 本体逻辑（薄 lint §7 已落地为 `lintSkillStructure`，无 manifest 依赖，无需再动）。
- engine 其它命令 / 重组（spec §14 OOS；只删不重组）。
- bundle-6 cases 簇（独立 engine-relocation 轨，**非** spec 删除项）。

---

## File Structure

**删除：**
- `apps/`（整目录）：`apps/mcp/{server,tools,dispatch}.ts` + 三个 `*.test.ts`；`apps/core/catalog/{artifacts,features,guards,index,projects,skills,xmind}.ts` + 各 `*.test.ts`；`apps/core/{errors,types,test-helpers}.ts`；`apps/tsconfig.json`
- `.mcp.json`（仅注册指向 `apps/mcp/server.ts` 的 `kata` server）
- `engine/src/runtime/projection-targets.ts` + 空 `engine/src/runtime/` 目录

**修改：**
- `package.json`：删 `mcp` 脚本、`test:apps` 脚本、`ci` 脚本中的 ` && bun run test:apps` 段
- `engine/src/cli/skill-audit.ts`：清理 `listSkillDirNames` 上方 JSDoc 与行内注释里对已删 `manifest-repository` / `apps/core/catalog/skills.ts` 的引用

---

## Prerequisites: Worktree

按项目 worktree-first 规则，在隔离 detached worktree 内执行（命令在主工作树运行）：

```bash
ROOT=$(pwd)
W="$ROOT/.worktrees/simplify-1-mcp-teardown"
git worktree add --detach "$W" main
cd "$W"
```

> 注：本计划只删 tracked 代码与配置，不依赖 ignored runtime 目录，无需 symlink `.kata`。
> 注：主工作树当前有一批与本计划无关的未提交改动（`.vscode`、`docs/.process` 删除）；worktree 从 `main` 检出，不受其影响，无需处理。

## 验证约定

每个改动 Task 收尾跑：`bun run type-check`（exit 0）+ `bun test --cwd engine`（pass 数与基线一致、0 fail）+ `bun run check`（biome，0 error）。Task 4 追加全量 `bun run ci` + `check:skills` + lint 簇做合并前终检。

---

## Task 1: 建立基线（确认删除前全绿）

**Files:** 无改动（只读验证）。

- [ ] **Step 1: 跑引擎测试，记录通过数**

Run: `bun test --cwd engine 2>&1 | tail -5`
Expected: 全部 PASS，记录 `N pass, 0 fail`（作为后续 Task 的对照基线）。

- [ ] **Step 2: 跑 type-check**

Run: `bun run type-check; echo "exit=$?"`
Expected: `exit=0`，无 error。

- [ ] **Step 3: 跑 skill 同步检查（确认当前三行输出）**

Run: `bun run check:skills 2>&1 | tail -4; echo "exit=$?"`
Expected: `exit=0`，输出三行 `runtime skill sync passed` / `runtime detach passed` / `skill structure check passed`（**无** `workflow check passed`——manifest/workflow 已在前序 bundle 删除）。

- [ ] **Step 4: 确认 apps 当前可独立测试（删除前的存在性证据）**

Run: `bun test ./apps 2>&1 | tail -3`
Expected: PASS（确认这些是「删除前还活着」的测试，删除后随目录消失）。

- [ ] **Step 5: 确认 projection-targets 确为孤儿（0 importer）**

Run:
```bash
grep -rn "projection-targets\|skillProjectionPath\|skillReferencePath" --include="*.ts" . 2>/dev/null \
  | grep -v node_modules | grep -v 'engine/src/runtime/projection-targets.ts'
```
Expected: **无输出**（仓库内无任何文件 import 或调用该模块的导出 → 删除安全）。

---

## Task 2: 删 apps/ + .mcp.json + 清 package.json + 修 skill-audit 注释

**Files:**
- Delete: `apps/`（整目录）
- Delete: `.mcp.json`
- Modify: `package.json`（scripts：删 `mcp`、`test:apps`、`ci` 中 `test:apps` 段）
- Modify: `engine/src/cli/skill-audit.ts`（清 stale 注释）

- [ ] **Step 1: 删除整个 apps 目录**

Run: `git rm -r apps/`
Expected: 列出删除的约 20 个文件（`apps/mcp/*`、`apps/core/catalog/*`、`apps/core/*.ts`、`apps/tsconfig.json`）。

- [ ] **Step 2: 删除 .mcp.json**

Run: `git rm .mcp.json`
Expected: `rm '.mcp.json'`。

- [ ] **Step 3: 从 package.json 删 `mcp` 脚本行**

删除这一行：

```json
    "mcp": "bun apps/mcp/server.ts",
```

- [ ] **Step 4: 从 package.json 删 `test:apps` 脚本行**

删除这一行：

```json
    "test:apps": "bun test ./apps",
```

- [ ] **Step 5: 从 package.json 的 `ci` 脚本移除 `test:apps` 段**

将 `ci` 脚本中的：

```json
    "ci": "bun run lint && bun run lint:debris && bun run lint:agents && bun run lint:paths && bun run check:skills && bun run lint:agents:codex && bun run lint:skills:codex && bun run type-check && bun run test && bun run test:apps && bun run test:plugins && bun run test:tools",
```

改为（去掉 ` && bun run test:apps`）：

```json
    "ci": "bun run lint && bun run lint:debris && bun run lint:agents && bun run lint:paths && bun run check:skills && bun run lint:agents:codex && bun run lint:skills:codex && bun run type-check && bun run test && bun run test:plugins && bun run test:tools",
```

- [ ] **Step 6: 清理 skill-audit.ts 的 stale 注释**

把 `engine/src/cli/skill-audit.ts` 中 `listSkillDirNames` 上方的 JSDoc 块：

```ts
/**
 * List skill directory names under `skillsRoot`, skipping `_`-prefixed aggregate
 * directories (e.g. `_shared/`) the same way runtime-sync, manifest-repository,
 * and apps/core/catalog enumerate skills. Returns `[]` when the root is absent.
 */
```

改为（删去已不存在的 `manifest-repository` / `apps/core/catalog` 引用）：

```ts
/**
 * List skill directory names under `skillsRoot`, skipping `_`-prefixed aggregate
 * directories (e.g. `_shared/`) the same way runtime-sync enumerates skills.
 * Returns `[]` when the root is absent.
 */
```

并把函数体内的行内注释：

```ts
  // 过滤 `_` 前缀目录（如 `_shared/`），与 runtime-sync.ts / apps/core/catalog/skills.ts 一致
```

改为：

```ts
  // 过滤 `_` 前缀目录（如 `_shared/`），与 runtime-sync.ts 一致
```

- [ ] **Step 7: 校验 package.json 仍是合法 JSON**

Run: `bun -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('valid json')"`
Expected: 输出 `valid json`。

- [ ] **Step 8: 确认仓库已无 apps 残留引用**

Run:
```bash
grep -rn "apps/mcp\|apps/core\|core/catalog\|test:apps" --include="*.ts" --include="*.json" . 2>/dev/null | grep -v node_modules
```
Expected: **无输出**（import / script / 注释引用全部清除）。

- [ ] **Step 9: 验证绿（与基线一致）**

Run:
```bash
bun run type-check; echo "type-check exit=$?"
bun test --cwd engine 2>&1 | tail -5
bun run check 2>&1 | tail -3; echo "check exit=$?"
bun run check:skills 2>&1 | tail -4; echo "check:skills exit=$?"
```
Expected: `type-check exit=0`；engine PASS 数 == Task 1 Step 1 基线、`0 fail`（引擎不依赖 apps）；`check exit=0`（apps 已删，无残留 lint 目标）；`check:skills exit=0`，三行 passed 不变。

- [ ] **Step 10: 提交（commit A）**

```bash
git rm -r apps/        # 若 Step 1/2 已 git rm，可跳过；此处确保暂存
git add package.json engine/src/cli/skill-audit.ts
git commit -m "refactor: ✨ drop read-only mcp server and catalog lib"
```
Expected: 单 commit，变更 = `apps/` 全删 + `.mcp.json` 删除 + `package.json` 三处脚本清理 + `skill-audit.ts` 注释清理。

---

## Task 3: 删孤儿 projection-targets 模块

**Files:**
- Delete: `engine/src/runtime/projection-targets.ts` + 空 `engine/src/runtime/` 目录

- [ ] **Step 1: 删除 projection-targets.ts**

Run: `git rm engine/src/runtime/projection-targets.ts`
Expected: `rm 'engine/src/runtime/projection-targets.ts'`。

- [ ] **Step 2: 清理遗留空目录**

Run: `rmdir engine/src/runtime 2>/dev/null; ls engine/src/runtime 2>&1 | head -1`
Expected: `ls` 报 `No such file or directory`（目录已空被删；`git` 不跟踪空目录，无需额外暂存）。

- [ ] **Step 3: 再次确认 0 引用**

Run:
```bash
grep -rn "projection-targets\|skillProjectionPath\|skillReferencePath\|src/runtime" --include="*.ts" . 2>/dev/null | grep -v node_modules
```
Expected: **无输出**。

- [ ] **Step 4: 验证绿**

Run:
```bash
bun run type-check; echo "type-check exit=$?"
bun test --cwd engine 2>&1 | tail -5
```
Expected: `type-check exit=0`；engine PASS 数与基线一致、`0 fail`（projection-targets 零 importer，删除不影响任何编译单元）。

- [ ] **Step 5: 提交（commit B）**

```bash
git add -u engine/src/runtime
git commit -m "refactor: ✨ drop orphaned projection-targets module"
```
Expected: 单 commit，仅删除 `engine/src/runtime/projection-targets.ts`。

---

## Task 4: 最终回归 + 合并 main + 清理

**Files:** 无代码改动。

- [ ] **Step 1: worktree 内全量 gate**

Run（逐条记录 exit/计数）：
```bash
bun run ci 2>&1 | tail -15; echo "ci exit=$?"
bun run lint:debris; echo "lint:debris exit=$?"
bun run lint:paths; echo "lint:paths exit=$?"
bun run test:plugins 2>&1 | tail -3
bun run test:tools 2>&1 | tail -3
```
Expected: `ci exit=0`（`ci` 已不含 `test:apps`，全链通过即同时验证 package.json 编辑合法且无 apps 残留引用）；`lint:debris` / `lint:paths` exit 0（F2 只禁 `docs/refactor/`，无 stale-path；`apps` 残留已清）；plugins / tools 测试全 PASS。

- [ ] **Step 2: 确认 Codex 占位状态仍准确（Phase-1 同步评估）**

Run: `sed -n '1,12p' .agents/README.md`
Expected: 仍准确描述 `.agents/` Phase-1 占位。本计划只删 `apps/` + 孤儿模块、未改路由 / 入口语义，确认无需改 `.agents/**`；若 README 已不准确，记录为 Phase-2 待办，不在本计划修。

- [ ] **Step 3: 确认提交范围干净**

Run:
```bash
git log --oneline main..HEAD
git status --short
```
Expected: 恰好 2 个本计划 commit（2×refactor）；`git status` 干净（worktree 从 main 检出，无主工作树脏状态）。

- [ ] **Step 4: 记录 HEAD SHA，回主工作树合并**

```bash
SHA=$(git rev-parse HEAD); echo "$SHA"
cd /Users/poco/Projects/kata
git merge --no-ff "$SHA" -m "merge: 🔀 拆除 mcp/catalog 查询面与孤儿投影模块"
```
> 主工作树固有脏文件（`.vscode`、`docs/.process` 删除）与本计划改动无重叠，merge 不触碰它们；若 git 因意外重叠拒绝 merge，停下来报告，不强制。

- [ ] **Step 5: 主工作树复验**

Run（在 `/Users/poco/Projects/kata`）：
```bash
bun run type-check; echo "exit=$?"
bun test --cwd engine 2>&1 | tail -5
bun run check:skills 2>&1 | tail -4; echo "check:skills exit=$?"
grep -rn "apps/mcp\|apps/core\|projection-targets\|test:apps" --include="*.ts" --include="*.json" . 2>/dev/null | grep -v node_modules
```
Expected: `type-check exit=0`；engine 全 PASS；`check:skills exit=0`；最后一条 grep **无输出**（合并后主工作树彻底无残留）。

- [ ] **Step 6: 推送**

```bash
git push origin main
```
（远端不可用则记录阻塞，不静默跳过。）

- [ ] **Step 7: 清理 worktree**

```bash
git worktree remove .worktrees/simplify-1-mcp-teardown
git worktree list
```
Expected: 列表不再含 `simplify-1-mcp-teardown`。

---

## Self-Review（已执行）

**1. 范围覆盖：** 本计划覆盖 router-simplify spec §6.1 中**当前仍存在**的删除项：`apps/mcp/`、`apps/core/catalog/`（commit 1）+ `engine/src/runtime/projection-targets.ts`（commit 2 残留，其余 workflow/blackboard/manifest 已在前序 bundle 删除）+ `.mcp.json` + `package.json` mcp/test:apps 脚本。§13 验收「MCP / catalog 删净」「`bun run` 无 mcp 脚本」可由 Task 2 Step 8 + Task 4 Step 5 grep 与 `package.json` 编辑证明。

**2. Placeholder 扫描：** 无 TBD/TODO；每个删除/修改步骤给出精确命令与 `package.json` / `skill-audit.ts` 前后字符串；每个验证步骤给出 exact 命令与预期（含计数与三行 lint 输出对账口径）。

**3. 类型/命名一致：** 无新增类型/函数；仅删除 + 脚本字符串编辑 + 注释清理。删除的 `apps/core` 类型与 `projection-targets` 导出（`skillProjectionPath` / `skillReferencePath`）经 Task 1 Step 5 实测 0 importer，删除不影响任何编译单元。`ci` 脚本去段前后字符串逐字给出。

**4. 顺序与每步绿：** Task 1（基线/孤儿确认）→ Task 2（apps+mcp+catalog+注释，独立绿，commit A）→ Task 3（projection 孤儿，独立绿，commit B）→ Task 4（全量回归/合并/push/清理）。每个删除 Task 自带 type-check + engine test green bar；apps 与 projection 各 0 importer，删除不会引入中途红。

**5. 验证完备性：** 删除正确性由「根 type-check exit 0」+「`bun test --cwd engine` pass 数 == 基线」双重把关；Task 4 追加全量 `bun run ci`（已剔除 `test:apps`，绿即证明 package.json 编辑合法）+ lint:debris/lint:paths/test:plugins/test:tools + 主工作树合并后 grep 终检 + Codex 占位复核。

**6. 与原草案差异（refresh 要点）：** ① 并入 `projection-targets`（原延后到从未编写的 Plan 3，现为唯一孤儿）；② 改正 `check:skills` 预期为三行 passed（删 `workflow check passed`）；③ 删除对已不存在的 `manifest-repository.test.ts` 的依赖性预期；④ 顺手清理 `skill-audit.ts` 两行 stale 注释；⑤ 暂存改用路径限定 `git rm`/`git add <path>`，不再 `git add -A`。

---

## 后续 Plan（spec 落地后的剩余轨道）

router-simplify spec 在本计划合并后基本收口，剩余仅两条独立轨：

- **phases-md 迁移（spec §10 commit 4-5）**：spec 设想把编排迁入 `phases/§N-*.md`；实测仅 `playwright-automation` 采用 `phases/`，case-draft 等走了 bundle 初始化的 `prompts/` + `references/` + `rules/` 结构。需用户裁决：是按 spec 统一回 `phases/`，还是认可 bundle 结构为等效实现并把 spec §4/§10 标注为「以 bundle 结构落地」。**属 prompt 重构，非删除项，单独立项。**
- **engine 收口删除轨（bundle-6/7/8）**：cases 共享簇 / 剩余命令归属 / engine 整体删除——属 bundle-migration 轨，spec §14 明确 OOS（「只删不重组」），与本 teardown 正交，按 bundle-5 路线图各自成 plan。

