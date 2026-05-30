# Bundle-7 lint 簇下沉 `_shared/lint` 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: 用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实施本计划。步骤用 checkbox（`- [ ]`）跟踪。

**Goal:** 把 `engine/src/lint/` 全部 21 个 lint 规则模块原子下沉到 `.claude/scripts/_shared/lint/`，完成既有 `_shared/lint/`（已有 `skill-structure.ts`）的收口，使 lint/audit 子系统脱离 engine、只依赖 `@shared/*` + npm。

**Architecture:** 沿用 bundle-5/6 的 `git mv` + 路径别名重指模式。lint 簇零反向依赖（每个模块只 import `@shared/lib/paths.ts`、`@shared/schemas/loaders.ts` 与 npm），但簇内 18/21 模块 import `./types.ts`（外加 `agents-sync→agents-drift`、`v2-quality-gates→tests-layout`），因此**必须整簇原子迁移**：`types.ts` 一旦移出 `engine/src/lint/`，留守同目录的兄弟模块 `./types.ts` 立即悬空。整簇同 commit 移动后，所有簇内 `./` 相对 import 保持同目录有效、无需改；只需把 engine 外部消费者（4 个 audit/CLI）与测试的 import 前向重指到 `@shared/lint/*`。

**Tech Stack:** Bun ≥ 1.3、TypeScript、commander、biome；路径别名 `@shared/* → ./.claude/scripts/_shared/*`（`tsconfig.base.json`）。

---

## 背景与关键发现

依赖图实测（全仓 importer + 各模块 import 头 + 簇内 `./` 相对 import 图）后确认 lint 簇边界，并对 bundle-6 §后续 把「lint + e2e + history-convert + knowledge-curate + scan-report」一并塞进 bundle-7 的写法做了 writing-plans Scope Check 要求的拆分——本计划只取**最内聚、零反向依赖、解锁面最大**的 lint 簇，其余各成独立后续 plan：

1. **lint 簇零反向依赖，整体可下沉。** 21 个模块的 engine 外部 import 仅为 `@shared/lib/paths.ts`、`@shared/schemas/loaders.ts` 与 npm（`bun`、`yaml`、`jszip`、`gray-matter`），无任何 `engine/` 反向 import。

2. **`_shared/lint/` 是既定目标，本计划是收口而非新建。** `engine/src/cli/skill-audit.ts:10` 已 import `@shared/lint/skill-structure.ts`（早先迁入）；本计划把剩余 21 个模块迁入同目录，别名统一 `@shared/lint/<module>.ts`。

3. **簇内 `./types.ts` 通用依赖 ⇒ 原子迁移（核心约束）。** 18/21 模块 import `./types.ts`，另有 `agents-sync.ts → ./agents-drift.ts`、`v2-quality-gates.ts → ./tests-layout.ts`。任何「先迁子集」方案都会让「移出 `types.ts` 后仍留 engine 的模块」或「移出的模块找不到尚未迁的 `./types.ts`」悬空。故 21 个模块 + 全部外部消费者/测试重指必须在**同一个 commit** 完成；簇内 `./` import 因整体同目录搬迁，全程有效、零改动。

4. **外部消费者重指面 = 三个统一变换。** engine 侧消费者（`agents-audit.ts`×4、`skill-audit.ts`×2、`paths-audit.ts`×2、`cases-lint.ts`×13）全部走 `from "../lint/...` ⇒ 统一 `../lint/` → `@shared/lint/`；测试侧（19/22 个 `engine/tests/lint/*.test.ts`——其余 3 个：`manifest-gate`/`metadata-gate` 测 `features-lint.ts`（留 engine）、`skill-structure` 已用 `@shared/lint/skill-structure.ts`，均无需改——+ `cli/cases-lint.test.ts` + `cli/paths-audit.test.ts`）走 `from "../../src/lint/...` ⇒ 统一 `../../src/lint/` → `@shared/lint/`。方向均为 engine/test → shared（合法前向）。

5. **两处字符串路径需改为真实磁盘路径（非别名）。** `paths-audit.ts:24` 的 `file.includes("engine/src/lint/")`（lint 自引用豁免）→ `.claude/scripts/_shared/lint/`，否则迁入文件被 path-audit 误报为违规（lint 规则文件本身含被检测的路径字面量）；`dead-code-cleanup.test.ts:18` 的 `["engine/src/lint/agents-sync.ts","engine/src/lint/agents-drift.ts"]`（经 `readFileSync(join(repoRoot(), path))` 读取）→ `.claude/scripts/_shared/lint/...`（与 bundle-6 `dead-code-cleanup` 把 `engine/src/cli/cases-validate.ts` 改 `.claude/scripts/_shared/cli/...` 同例）。

6. **基线测试计数。** 迁移前 `bun test engine/tests/lint engine/tests/cli/cases-lint.test.ts engine/tests/cli/paths-audit.test.ts engine/tests/audits-paths.test.ts` 全 pass；全量 `bun test --cwd engine` = 1358 pass / 1 skip / 0 fail（bundle-6 后基线）。

---

## Carryover 约束（贯穿全计划）

- **Worktree-first：** 改动在 detached worktree `.worktrees/bundle-7-lint-shared` 内完成；不新建分支；`git worktree add --detach .worktrees/bundle-7-lint-shared main`。
- **路径限定暂存：** 只用 `git add <path>` / `git rm <path>` / `git mv <from> <to>`，**严禁** `git add -A` / `git add .`（规避脏 submodule `plugins/lanhu/mcp-bridge/lanhu-mcp` 与历史 `docs/superpowers/plans/.process/**` 删除）。
- **只读源仓库：** `workspace/{project}/.kata/repos/**` 只读，禁 push/commit/write/mv/rm/chmod。
- **Immutability：** 不就地修改对象，迁移仅移动文件 + 改 import/字符串，不改运行逻辑。
- **Commit 规范：** `type: emoji description`（type 小写、≤72 字符），固定映射 `refactor: ✨`、`chore: 🧹`、`merge: 🔀`。
- **Test-after-edit：** 每个改代码步骤后跑相关测试；任何失败（含 pre-existing）须在本 worktree 排查根因修复，不得 skip/TODO/注释绕过；超范围失败须先停下来向用户说明并取得显式同意才能 defer。
- **Codex Phase-2：** 本计划不动 `.agents/**`；同步评估义务降级为「确认 `.agents/README.md` 仍准确描述占位状态」。已知 `lint:skills:codex` 占位红为 pre-existing，不在本计划修复范围。
- **lint 脚本覆盖缺口（承自 bundle-5/6）：** `lint` 脚本（`biome check engine/src ...`）不扫描 `.claude/scripts/`，故迁入文件不被 `lint` 覆盖；但 `bun run check`（`biome check .`）与根 `type-check` 覆盖之。全局 lint 缺口记入 bundle engine 收口计划，非本计划新增。

---

## Scope

**IN：**
- `git mv` 全部 21 个 `engine/src/lint/*.ts` → `.claude/scripts/_shared/lint/`。
- engine 侧 4 个消费者（`agents-audit.ts`、`skill-audit.ts`、`paths-audit.ts`、`cases-lint.ts`）`../lint/` → `@shared/lint/`。
- `paths-audit.ts:24` lint 自引用豁免字符串 → `.claude/scripts/_shared/lint/`。
- 21 个测试文件 import（19 lint 测试 + cases-lint + paths-audit 测试）`../../src/lint/` → `@shared/lint/`。
- `dead-code-cleanup.test.ts:18` 两处字符串路径 → `.claude/scripts/_shared/lint/`。

**OUT：**
- 不迁 e2e 簇（`engine/src/e2e/*`）、`cases-e2e.ts`、`cases-lint.ts` 本体、`features-lint.ts`——留 bundle-8（cases/e2e 收口）。
- 不迁 history-convert / knowledge-curate / scan-report——各成后续 plan。
- 不改任何 lint 规则逻辑、阈值、报告格式、CLI 命令名。
- 不动 `.agents/**`、不修 Codex 占位红。
- 不补 `lint` 脚本对 `_shared` 的覆盖（engine 收口计划）。

---

## File Structure（迁移与重指全表）

### A. 迁移（21 个 `git mv`，全部 `engine/src/lint/<X>.ts` → `.claude/scripts/_shared/lint/<X>.ts`）

`agent-naming` `agent-shape` `agents-drift` `agents-sync` `archive-case-qa` `case-md-sourceref-leak` `case-traceability-header` `debug-file-naming` `handoff-double-track` `hardcode-path` `no-debug-in-cases` `no-feature-local-helpers` `owner-skill-dup` `path-treatment` `skill-frontmatter` `skill-shape` `source-ref-registry` `tests-layout` `types` `v2-quality-gates` `weak-assertion`

别名统一 `@shared/lint/<X>.ts`。

### B. 簇内相对 import（**全部不改**）

簇内 `./types.ts`（×18）、`agents-sync → ./agents-drift.ts`、`v2-quality-gates → ./tests-layout.ts` 因整簇同目录搬迁，迁移后仍同目录有效，零改动。各模块对 `@shared/lib/paths.ts`/`@shared/schemas/loaders.ts`/npm 的 import 为绝对别名/包名，零改动。

### C. engine 侧消费者 import 前向重指（统一 `from "../lint/` → `from "@shared/lint/`）

| 文件 | 行 | 模块 |
| --- | --- | --- |
| `engine/src/cli/agents-audit.ts` | 10-13 | agent-naming, agent-shape, agents-drift, agents-sync |
| `engine/src/cli/skill-audit.ts` | 12-13 | skill-frontmatter, skill-shape（L10 `@shared/lint/skill-structure.ts` 已是别名，不改） |
| `engine/src/cli/paths-audit.ts` | 3-4 | path-treatment, types |
| `engine/src/cli/cases-lint.ts` | 8-18, 24, 25 | archive-case-qa, case-md-sourceref-leak, case-traceability-header, debug-file-naming, handoff-double-track, hardcode-path, no-debug-in-cases, no-feature-local-helpers, owner-skill-dup, source-ref-registry, types, v2-quality-gates, weak-assertion |

### D. 字符串路径重指（真实磁盘路径，非别名）

- `engine/src/cli/paths-audit.ts:24`：`file.includes("engine/src/lint/")` → `file.includes(".claude/scripts/_shared/lint/")`（L25 `engine/tests/lint/` 不改，测试不迁）。
- `engine/tests/dead-code-cleanup.test.ts:18`：`"engine/src/lint/agents-sync.ts"` → `".claude/scripts/_shared/lint/agents-sync.ts"`；`"engine/src/lint/agents-drift.ts"` → `".claude/scripts/_shared/lint/agents-drift.ts"`。

### E. 测试 import 前向重指（统一 `from "../../src/lint/` → `from "@shared/lint/`）

- `engine/tests/lint/*.test.ts`（19/22 个文件经该路径引用；其余 3 个测 `features-lint` 或已用 `@shared/lint/skill-structure`，perl glob 跑到亦无匹配、无副作用）。
- `engine/tests/cli/cases-lint.test.ts:7-8`（archive-case-qa, case-md-sourceref-leak）。
- `engine/tests/cli/paths-audit.test.ts:3`（types）。

### 原子性

A+C+D+E 全部在**单一 commit** 完成（背景发现 3）。无中途绿的子集切分；正确性由「同 commit 内 type-check + 全量 lint 测试 + paths-audit 测试」把关。

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
W="$ROOT/.worktrees/bundle-7-lint-shared"
git worktree add --detach "$W" main
mkdir -p "$W/workspace/kata"
ln -s "$ROOT/workspace/kata/.kata" "$W/workspace/kata/.kata"
git -C "$W" rev-parse HEAD
```
Expected：worktree 建在 `.worktrees/bundle-7-lint-shared`，HEAD = 当前 main SHA；`.kata` symlink 就位（只读）。后续步骤 `cd` 目标均为该 worktree。

- [ ] **P-3：记录基线**

Run（在 worktree 内）：
```bash
cd .worktrees/bundle-7-lint-shared
bun test engine/tests/lint engine/tests/cli/cases-lint.test.ts engine/tests/cli/paths-audit.test.ts engine/tests/audits-paths.test.ts 2>&1 | tail -3
```
Expected：全 pass / 0 fail。记录为迁移后对账基线。

---

## Task 1：lint 簇原子下沉 `_shared/lint`（单 commit）

**Files:**
- Move: 21 个 `engine/src/lint/*.ts` → `.claude/scripts/_shared/lint/`
- Modify（engine 消费者）: `engine/src/cli/{agents-audit,skill-audit,paths-audit,cases-lint}.ts`
- Modify（测试）: 22 个 `engine/tests/lint/*.test.ts` + `engine/tests/cli/cases-lint.test.ts` + `engine/tests/cli/paths-audit.test.ts` + `engine/tests/dead-code-cleanup.test.ts`

- [ ] **Step 1：`git mv` 全部 21 个 lint 模块**

Run（在 worktree 内）：
```bash
for f in engine/src/lint/*.ts; do
  git mv "$f" ".claude/scripts/_shared/lint/$(basename "$f")"
done
ls engine/src/lint/ 2>/dev/null && echo "ERROR: engine/src/lint not empty" || echo "engine/src/lint GONE (good)"
ls .claude/scripts/_shared/lint/ | wc -l
```
Expected：`engine/src/lint/` 消失（21 文件全迁，git 不跟踪空目录）；`_shared/lint/` 现含 22 项（21 迁入 + 既有 `skill-structure.ts`）。簇内 `./types.ts` 等相对 import 仍同目录有效，无需改。

- [ ] **Step 2：统一重指 engine 消费者 import（`../lint/` → `@shared/lint/`）**

Run（在 worktree 内）：
```bash
perl -pi -e 's{from "\.\./lint/}{from "\@shared/lint/}g' \
  engine/src/cli/agents-audit.ts \
  engine/src/cli/skill-audit.ts \
  engine/src/cli/paths-audit.ts \
  engine/src/cli/cases-lint.ts
grep -rn 'from "\.\./lint/' engine/src/cli/ || echo "no residual ../lint/ in cli (good)"
```
Expected：4 文件共 21 行 import 改为 `@shared/lint/*`；`skill-audit.ts:10` 的 `@shared/lint/skill-structure.ts` 不受影响；残留检查为空。

- [ ] **Step 3：更新 `paths-audit.ts` lint 自引用豁免字符串**

`engine/src/cli/paths-audit.ts:24`，before：
```ts
    file.includes("engine/src/lint/") || // lint self-references
```
after：
```ts
    file.includes(".claude/scripts/_shared/lint/") || // lint self-references
```
（L25 `engine/tests/lint/` 不改——测试不迁。）此改防止迁入的 lint 规则文件（含被检测的路径字面量）被 path-audit 误报。

- [ ] **Step 4：统一重指测试 import（`../../src/lint/` → `@shared/lint/`）**

Run（在 worktree 内）：
```bash
perl -pi -e 's{from "\.\./\.\./src/lint/}{from "\@shared/lint/}g' \
  engine/tests/lint/*.test.ts \
  engine/tests/cli/cases-lint.test.ts \
  engine/tests/cli/paths-audit.test.ts
grep -rn 'from "\.\./\.\./src/lint/' engine/tests/ || echo "no residual ../../src/lint/ in tests (good)"
```
Expected：24 行 import 改为 `@shared/lint/*`；残留检查为空。

- [ ] **Step 5：更新 `dead-code-cleanup.test.ts` 字符串路径**

`engine/tests/dead-code-cleanup.test.ts:18`，before：
```ts
    for (const path of ["engine/src/lint/agents-sync.ts", "engine/src/lint/agents-drift.ts"]) {
```
after：
```ts
    for (const path of [".claude/scripts/_shared/lint/agents-sync.ts", ".claude/scripts/_shared/lint/agents-drift.ts"]) {
```

- [ ] **Step 6：完整性 grep + 类型检查 + 相关测试转绿**

Run（在 worktree 内）：
```bash
echo "--- 残留引用全仓扫描（应为空）---"
grep -rn 'src/lint/\|"\.\./lint/\|"\./lint/' engine .claude/scripts tools --include="*.ts" | grep -v '\.claude/scripts/_shared/lint/' | grep -v 'engine/tests/lint/' || echo "no stray engine-lint refs (good)"
bun run type-check; echo "type-check exit=$?"
bun test engine/tests/lint engine/tests/cli/cases-lint.test.ts engine/tests/cli/paths-audit.test.ts engine/tests/audits-paths.test.ts engine/tests/dead-code-cleanup.test.ts 2>&1 | tail -3
```
Expected：残留扫描仅剩 `engine/tests/lint/`（测试目录字面量，合法）与 `_shared/lint/`，无 `engine/src/lint/`/`../lint/`/`./lint/` 悬空；`type-check exit=0`；相关测试全 pass（`audits-paths`/`paths-audit` 经更新后的自引用豁免确认迁入文件不被误报；`dead-code-cleanup` P4-03 经新磁盘路径 `readFileSync` 成功）。

- [ ] **Step 7：Commit（路径限定暂存）**

Run（在 worktree 内）：
```bash
git add .claude/scripts/_shared/lint/ \
        engine/src/cli/agents-audit.ts engine/src/cli/skill-audit.ts \
        engine/src/cli/paths-audit.ts engine/src/cli/cases-lint.ts \
        engine/tests/lint/ engine/tests/cli/cases-lint.test.ts \
        engine/tests/cli/paths-audit.test.ts engine/tests/dead-code-cleanup.test.ts
git status --short | grep -E '^.?D ' && echo "checking deletes staged"
git commit -m "refactor: ✨ move lint cluster to _shared/lint"
git status --short
```
Expected：commit 成功；若旧路径 `engine/src/lint/*.ts` 残留为未暂存「D」，用 `git rm engine/src/lint/<file>.ts` 显式补暂存后再 commit；严禁 `git add -A`（规避脏 submodule）。`git status --short` 末态不含脏 submodule 等无关项。

---

## Task 2：全量回归 + 合并 main + push + 清理

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
Expected：`type-check exit=0`；engine 测试 1358 pass / 1 skip / 0 fail（与基线一致）；`check:skills exit=0`（3 行 passed，经迁入的 `skill-frontmatter`/`skill-shape` 运行）；`check exit=0`；`lint:debris exit=0`；`lint:paths exit=0`（迁入 lint 文件经更新后的自引用豁免不触发）。任何失败先在本 worktree 修复，不带病合并。

- [ ] **Step 2：确认 Codex 占位状态未漂移**

Run（在 worktree 内）：
```bash
git diff --stat main -- .agents/ ; echo "agents-diff exit=$?"
```
Expected：未触碰 `.agents/**`（diff 为空）；`.agents/README.md` 占位描述仍准确。`lint:skills:codex` 占位红为 pre-existing，不在本计划修复范围。

- [ ] **Step 3：记录 worktree HEAD 并合并回 main**

Run：
```bash
cd .worktrees/bundle-7-lint-shared && SHA=$(git rev-parse HEAD); echo "$SHA"
cd /Users/poco/Projects/kata
git merge --no-ff "$SHA" -m "merge: 🔀 整合 bundle 7 lint 簇下沉 _shared/lint"
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
git worktree remove .worktrees/bundle-7-lint-shared
git worktree list
```
Expected：列表不再含 `bundle-7-lint-shared`。

---

## Self-Review

**1. 范围覆盖：** 本计划交付「lint 簇 → `_shared/lint`」单一独立增量，并对 bundle-6 §后续 把 5 个子系统塞进 bundle-7 做了 writing-plans Scope Check 拆分（背景开头），只取最内聚、零反向依赖、解锁面最大的 lint 簇。spec（skill-bundle-migration §9）「lint 子系统下沉 `_shared`」由 Task 1（原子迁移）+ Task 2（回归/合并）覆盖。e2e/cases 收口/features-lint/history-convert/knowledge-curate/scan-report 明确列入 §后续，各成独立 plan。

**2. Placeholder 扫描：** 无 TBD/TODO；统一变换给出确定性 `perl` 命令（命令即精确内容）+ 受影响文件全清单 + 残留校验 grep；两处字符串改动给出 exact 文件:行 与完整 before/after；每个验证步骤给出 exact 命令与预期。

**3. 类型/命名一致性：** 落点统一 `.claude/scripts/_shared/lint/`，别名统一 `@shared/lint/<module>.ts`，与既有 `@shared/lint/skill-structure.ts` 同构。导出符号（各 `lintXxx`、`auditAgentRuntimeDrift`、`runAgentsSync`、`PathViolation`、`CaseLintViolation`、`Violation` 等）内容不变、仅文件位置变；import 名前后一致。`paths-audit` 自引用豁免与 `dead-code-cleanup` 字符串同步指向新磁盘路径，避免「迁移后路径字面量与实际位置漂移」。

**4. 顺序与每步绿（原子性论证）：** 簇内 18/21 模块 import `./types.ts` 构成通用依赖（背景发现 3），任何子集切分都会产生悬空 `./types.ts`，故迁移为单一原子 commit：Step 1 整簇 `git mv`（簇内 `./` 全程同目录有效）→ Step 2-5 在同一未提交工作区内重指全部外部消费者/测试/字符串 → Step 6 完整性 grep + type-check + 相关测试统一转绿 → Step 7 单 commit。Task 2 全量回归/合并/push/清理。无跨 commit 悬空 import。

**5. 验证完备性：** 迁移正确性多重把关——完整性 grep（全仓无 `engine/src/lint/`/`../lint/`/`./lint/` 悬空，仅剩合法的 `engine/tests/lint/` 字面量与 `_shared/lint/`）；`type-check exit 0`（tsconfig 解析 `@shared/lint/*`）；`bun test` lint 全 22 文件 + cases-lint + paths-audit + `audits-paths`（经更新后的自引用豁免确认迁入文件不被 path-audit 误报）+ `dead-code-cleanup`（新磁盘路径 `readFileSync` 成功）；Task 2 追加全量 `bun test --cwd engine`（1358 对账）+ check:skills（经迁入 `skill-frontmatter`/`skill-shape` 运行）+ check + lint:debris + lint:paths + Codex 占位复核。

**6. 风险/watch-items：**
- **`paths-audit` 自引用豁免漏改 → `audits-paths`/`lint:paths` 误报红：** 载荷点；Step 3 必改，Step 6/Task 2 Step 1 的 `audits-paths` + `lint:paths exit 0` 实证。若仍红，检查迁入 lint 文件触发的具体 `P-S*` 规则与豁免字符串是否匹配新路径。
- **`perl` 统一替换误伤：** 全部 21 个 `engine/src/lint/*` 均迁，故所有 `../lint/X.ts`/`../../src/lint/X.ts` 命中都应改；Step 2/4 各带残留 grep 校验，Step 6 带全仓完整性 grep 兜底。
- **运行时别名解析：** `@shared/lint/*` 机制同既有 `@shared/lint/skill-structure.ts`（现网已验证）+ `@shared/lib`/`@shared/cli`（bundle-3/5/6 已验证）；check:skills 子进程经 `skill-audit` → 迁入模块实证。
- **`git mv` 删除侧暂存：** 路径限定暂存下若旧路径残留未暂存「D」，用 `git rm <旧路径>` 显式补暂存，严禁 `git add -A`。
- **lint 脚本不扫描迁出文件：** 内容未变、`bun run check` 覆盖，无回归；全局 lint 覆盖缺口记入 engine 收口计划。

---

## 后续 Plan（更新后路线图，待本计划落地后再写）

lint 簇下沉后，按「独立子系统各成一 plan」推进 engine 收口：

- **bundle-8（cases/e2e 收口）**：迁 `engine/src/e2e/{case-draft-e2e,runtime-invoke}.ts` → `_shared`（零反向依赖，2 文件 + 2 测试 + `cases-e2e.ts` 消费者重指）；`features-lint.ts` 归属判定后迁移；至此 `cases-lint.ts`（仅余 `./features-lint.ts`、`./cases-e2e.ts` 反向依赖）与 `cases-e2e.ts` 反向依赖全消，顺势下沉 `_shared/cli`，cases/lint/e2e/audit 子系统彻底脱离 engine。
- **bundle-9（features 簇）**：`engine/src/cli/features-{index,ls,new,resolve,show}.ts` + `features.ts` + `engine/src/features/*` 归属判定后迁移（多 skill 共享 → `_shared/cli`+`_shared/lib`）。
- **bundle-10（剩余 skill-exclusive 命令）**：`history-convert` + `history-convert.ts`（case-edit）、`knowledge-curate` + `knowledge-curate.ts`（knowledge-curate）、`scan-report.ts` + `_shared/lib/scan-report-*`（defect-analyze）逐簇判定 skill-exclusive vs shared 后迁移。
- **bundle-11（engine 收口删除 + 测试基础设施统一）**：CLI 注册中心 `engine/src/cli/index.ts` 收口到 `_shared/cli`（noun-verb builders + `@shared/cli/bin/kata` 直接注册全部命令）；剩余 `engine/src/*`（api、auto-fixer、config、codemod、policy、runners、telemetry、source-analyze 等）逐项判定归宿；所有 skill 测试物理迁入各自 `tests/` + `cli-runner.ts` 收口 + `bunfig.toml`/`test:skills` 并入 `ci`；`lint` 脚本并入 `_shared` 覆盖（补本计划记录的覆盖缺口）；移除 `engine/` workspace 成员并删除 `engine/`；同步所有 `engine/...` 文档路径。
- **phases-md 决策（spec §10 commit 4-5）**：统一回 `phases/§N-*.md` 还是认可现 bundle `prompts/`+`references/` 结构为等效——需用户拍板。
- **Codex / Phase-2**：`.agents/**` 适配（`reviewers/`/`workers/`、`prompts/agent-<step>.md`），消解 `lint:skills:codex` 占位红。
