# kata Skill-Bundle 迁移 · Plan 5（bundle-5）: 渲染簇下沉 `_shared/cli`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 archive.md / cases.xmind 的渲染命令簇（`archive-gen` + `xmind-gen` barrel 及其 `xmind-gen/{archive,cli,render,xmind-io}` 子模块 + `xmind-patch`）从 `engine/src` 迁入跨 skill 共享命令落点 `.claude/scripts/_shared/cli/`，定调 Bundle-3 显式延后的「渲染机制最终归宿」为 `_shared` 共享层，重指 CLI 注册中心与唯一受影响测试，全程保持 `bun run type-check` exit 0、`bun test --cwd engine` 全绿、`bun run check` 无 error。

**Architecture:** 渲染簇是叶子 CLI 命令模块（commander `program`），仅被 `engine/src/cli/index.ts` 注册引用、被 `kata <cmd>` 子进程调用，依赖全部是 `@shared/lib/*` 与 npm 包 → 迁移是「`git mv` + 重指 3 行注册 import + 修 1 个测试扫描清单」的纯结构平移，零库级耦合、零类型债。落点 `_shared/cli/` 是 `bin/kata` 注释与 `_shared/cli/README.md` 已声明的共享命令模块归宿；命令名（`archive-gen`/`xmind-gen`/`xmind-patch`）不变，故所有 `kata` 子进程测试与子命令名约定字符串继续有效。

**Tech Stack:** Bun 1.3、TypeScript（`strict`、`allowImportingTsExtensions`）、commander、Handlebars、JSZip、xmind-generator、Biome、tsconfig path alias（`@shared/*`）。

---

## 背景与关键发现（必读）

本计划是「取消 engine、8 skill 自包含 bundle」initiative 的第 5 个落地计划。Bundle-1（chassis）/ Bundle-2（试点提示词重组）/ Bundle-3（试点 case-draft + playwright 代码迁移）/ Bundle-4（defect-analyze 合并）均已合并 main。写本计划前做了完整依赖图实测，三条发现直接决定了本计划的边界，必读：

1. **case-edit 无 skill 专属可执行代码。** 用户最初设想的「迁移 case-edit 专属代码」在代码层不存在：case-edit 是 prompt-only skill，其 `apply-corrections` / `archive-xmind-sync` 是 LLM 散文过程（模型直接读写 `archive.md`、手工同步 xmind topic），bundle 内只有 `SKILL.md` + `references/`，无 `scripts/`、不 `kata cases|xmind-gen|history-convert` 子进程调用。故「case-edit + 渲染定位」选项的真实内容只剩「渲染定位」一半。

2. **渲染簇是 shared，不属任何单一 skill。** `archive-gen` 被已迁移的 case-draft（`case-signal-analyzer.ts` 子进程 `kata archive-gen search`）调用；`xmind-gen`/`xmind-patch` 产出 cases.xmind、概念上 case-draft 产出与 case-edit 转换都会用。库级 import 实测：渲染簇**只被 `engine/src/cli/index.ts` 注册引用**（line 27/52/53），无任何 skill 代码 import 它。结论：渲染簇归宿是 `_shared` 共享层，**不是** case-draft bundle——放进 case-draft 会让 case-edit 未来用 xmind 时被迫依赖 case-draft bundle（违反自包含/低耦合，正是 Bundle-3 延后它的原因）。

3. **cases 簇是独立子系统，本计划不含。** `kata cases`（compare/verify/validate/e2e/lint）是带 CI `lint` verb（`lint:cases`）的**共享 umbrella 命令**：`cases-lint.ts` 是 umbrella，`runCasesValidate` 被全局 linter（`lintLanhuBlockedDrafts`）调用 → cases 簇是 shared CLI infra、与渲染簇无共享代码。按 writing-plans Scope Check「独立子系统拆分独立 plan」，cases 簇迁移列为 **bundle-6**，不并入本计划。

> 一句话定位：本计划只做「渲染簇 → `_shared/cli`」这一个独立、干净、解锁 Bundle-3 延后决策的增量，不碰 case-edit（无代码）、不碰 cases 簇（独立子系统）。

---

## Carryover（执行前必读，沿用 Bundle-3/4 约束）

1. **主工作树 pre-existing 脏状态，与本计划无关、不得触碰：** 脏 submodule `plugins/lanhu/mcp-bridge/lanhu-mcp`（内部文件被删未提交，`git status` 显示 ` m`）、历史 `docs/superpowers/plans/.process/**` 与若干 plan 文件的未提交删除。`git worktree add --detach … main` 从 main 已提交状态检出，这些脏状态只存在于主工作树工作目录、不传播进新 worktree；合并回 main 也不触碰它们。全程忽略即可。

2. **所有 commit 必须 path-scoped `git add <具体路径>`，严禁 `git add -A` / `git add .`**，以免误纳脏 submodule 指针或历史删除。

3. **`workspace/{project}/.kata/repos/**` 只读**：本计划为纯代码迁移，不读 workspace，无需 symlink `.kata`。

4. **Codex 同步评估（Phase-1 降级）：** 本计划只在 runtime-neutral 的 `_shared/cli` 内平移 `kata` 命令模块，不改路由表、入口语义、交付产物清单或证据口径；`.agents/` Codex runtime Phase-1 占位不消费 `_shared/cli`，不受影响。同步义务降级为「确认 `.agents/README.md` 仍准确描述占位状态」，在 Task 4 复述。`.agents/README.md:7` 的 `reviewers/`/`workers/` 前瞻描述与 `prompts/agent-<step>.md` 约定不符，属 Phase-2 待办（Bundle-2/3 Carryover 已记录），本计划不处理。

---

## Scope

**IN（本计划交付）：**
- 迁 `engine/src/archive-gen.ts` → `.claude/scripts/_shared/cli/archive-gen.ts`。
- 迁 `engine/src/xmind-patch.ts` → `.claude/scripts/_shared/cli/xmind-patch.ts`。
- 迁 `engine/src/xmind-gen.ts`（barrel）+ `engine/src/xmind-gen/{archive,cli,render,xmind-io}.ts` → `.claude/scripts/_shared/cli/xmind-gen.ts` + `.claude/scripts/_shared/cli/xmind-gen/`。
- 重指 `engine/src/cli/index.ts` 的 3 行注册 import（line 27/52/53）到 `@shared/cli/*`。
- 重指 `engine/tests/large-file-split.test.ts` 的 2 条扫描清单条目（line 12/19）到 `_shared/cli` 新路径。

**OUT（本计划不动，附理由）：**
- **cases 簇**（`cases/{verify-layers,source-fact-set,case-extract}.ts`、`cli/cases-{compare,verify,validate,e2e,lint}.ts`）：共享 `kata cases` umbrella、独立子系统，列 bundle-6（见背景发现 3 + 后续 Plan）。
- **`history-convert` / `knowledge-curate` / `scan-report`**：各自归属（case-edit 转换 / knowledge-curate / defect-analyze）需独立判定与迁移，列 bundle-6/7。
- **`_shared/lib/md-table.ts`**：已在 `_shared/lib`（非 engine/src），唯一 importer `xmind-gen/archive.ts` 经 `@shared/lib/md-table.ts` 绝对引用，迁移后仍解析 → **原位不动**。
- **`templates/archive.md.hbs`（repo 根 `templates/`）**：`archive-gen` 的 `--template` 默认值 `templates/archive.md.hbs` 是 **CWD-relative CLI 选项**（`resolve(templatePath)`，相对调用 CWD = repo 根），与模块物理位置解耦；迁 `archive-gen.ts` 不影响模板解析 → **模板不迁**，repo 根 `templates/` 收口留待 engine 删除计划。
- **测试物理迁移**：渲染簇测试（`archive-gen.test.ts`、`xmind/gen.test.ts`、`xmind/patch.test.ts`）是 `kata` 子进程测试（`KATA_CLI` + `execFileSync`），不 import 被测模块 → 留 `engine/tests` 原位、零改动，靠命令重注册继续通过。测试物理迁移 + `cli-runner.ts` test helper 收口统一推迟到 engine 删除计划（沿用 Bundle-3 D3）。
- **`engine/src/cli/index.ts` 注册中心本体迁移**：CLI 注册中心收口到 `_shared/cli` 属 engine 删除计划，本计划只重指其 import、不搬它。
- **`lint` 脚本 path 扩展**：`bun run lint`（biome）的显式 path 列表不含 `.claude/scripts/_shared`（沿用 Bundle-3 现状，渲染簇迁后由 `bun run check` = `biome check .` 覆盖 lint）；是否把 `_shared` 并入 `lint` 脚本属全局 lint 覆盖决策，留 engine 删除计划统一处理。

---

## 关键设计决策

**D1 — 落点 `.claude/scripts/_shared/cli/`（共享命令模块归宿）。** `bin/kata` 注释明写「命令模块随各 skill 迁移逐步移入 `.claude/skills/<name>/scripts/` 与 `@shared/cli/`」，`_shared/cli/README.md` 亦声明该目录是「跨 skill 共享命令模块的落点」。渲染簇是 ≥2 skill 共享的命令（非单 skill 专属）→ 落 `_shared/cli/`，与 Bundle-3 把 case-draft 专属代码落 `skills/case-draft/scripts/` 形成「专属进 skill、共享进 `_shared`」的对称。`@shared/*` → `./.claude/scripts/_shared/*` 别名（`tsconfig.base.json`，root 与 engine 两 project 都 `extends`，bun 运行时与 tsc 同样解析），故 `@shared/cli/archive-gen.ts` 在编译与运行时都指向新位置。

**D2 — 渲染簇判定为 shared → `_shared`，而非 case-draft bundle。** 实测渲染簇零库级 import 耦合（只被 `cli/index.ts` 注册），子进程层被 case-draft 调用、概念上 case-edit 转换亦复用。放进 case-draft bundle 会让 case-edit 未来用 xmind 依赖 case-draft（Bundle-3 延后它正因此）。落 `_shared` 让两 skill 经 `kata <cmd>` 子进程平等调用、互不依赖。这正是 Bundle-3 Scope OUT 所说「正确归宿需在后续确定」的落定。

**D3 — 模板不迁、默认值不改。** `archive-gen` 用 Handlebars，模板路径来自 `--template` 选项（默认 `templates/archive.md.hbs`），`readFileSync(resolve(templatePath))` 相对调用 CWD 解析。该默认是 CWD-relative、与模块物理位置解耦：迁 `archive-gen.ts` 到 `_shared/cli` 后，`kata archive-gen convert` 仍以 repo 根为 CWD、默认模板仍解析到 repo 根 `templates/archive.md.hbs`。故**不迁模板、不改默认值**，避免引入模板重定位风险（与 Bundle-3 handoff 模板「随模块迁」不同——那是 `join(repoRoot(), "engine/templates/...")` 硬编码内部路径，本处是 CWD-relative 选项默认值，机制不同）。

**D4 — 无类型修复（与 Bundle-3 关键差异）。** 根 `tsconfig.json` 的 `include` 不含 `engine/**`（engine 是独立 project，自带 `engine/tsconfig.json`），故渲染簇当前在根 type-check gate 之外。迁入 `.claude/scripts/_shared/cli/` 后进入根 gate。实测：engine tsc 对渲染簇只报 `TS6059`（`@shared/*` 文件不在 engine `rootDir` 内的边界噪音），**无任何真实类型错误**（TS2xxx/TS18xxx）；而 `TS6059` 在根 gate 下消失（`_shared` 在根 `rootDir "."` 内）。故本计划**无类型修复步骤**，迁移后根 type-check 直接 exit 0。

**D5 — 测试就地、不物理迁移；仅扫描清单测试需改。** 渲染簇测试是 `kata` 子进程测试（`KATA_CLI = engine/bin/kata` → `engine/src/cli/index.ts` 注册中心；`engine/bin/kata` 与 `_shared/bin/kata` 同指 `cli/index.ts`），不 import 被测模块 → 命令重注册后继续通过，**零改动**。唯一例外是 `large-file-split.test.ts`：它硬编码扫描清单含 `engine/src/xmind-gen.ts`（ENTRY，`readFileSync` 找不到会 throw）与 `engine/src/xmind-gen`（DIR，`collectTsFiles` 找不到则 graceful skip）。两条都重指到 `_shared/cli` 新路径：ENTRY 防 throw，DIR 保持尺寸覆盖。`archive-gen`/`xmind-patch` 不在该测试清单内，无需改。

**D6 — 子命令名约定字符串不改。** `case-signal-analyzer.ts:149` 的 `"engine/src/archive-gen.ts"` 是「把 `engine/src/xxx.ts` 首参转 `kata` 子命令名」的约定参数（basename 去 `.ts` → 子命令 `archive-gen`）。命令名 `archive-gen` 在 `program` 定义内、不随文件位置变 → 该字符串解析出的子命令仍有效，**不改**（沿用 Bundle-3 同款处理；统一改为纯子命令名留 engine 删除计划）。

---

## File Structure（目标布局）

```
.claude/scripts/_shared/cli/
  archive-gen.ts            # ← engine/src/archive-gen.ts
  xmind-patch.ts            # ← engine/src/xmind-patch.ts
  xmind-gen.ts              # ← engine/src/xmind-gen.ts（barrel，re-export ./xmind-gen/*）
  xmind-gen/
    archive.ts             # ← engine/src/xmind-gen/archive.ts（import @shared/lib/md-table.ts，不变）
    cli.ts                 # ← engine/src/xmind-gen/cli.ts
    render.ts              # ← engine/src/xmind-gen/render.ts
    xmind-io.ts            # ← engine/src/xmind-gen/xmind-io.ts
  README.md                # 不动
  (lib/ schemas/ lint/ bin/ plugin-runtime/ 不动)
```

**就地改动（文件不动、只改内容）：**
- `engine/src/cli/index.ts`（3 行 import 重指：line 27/52/53）。
- `engine/tests/large-file-split.test.ts`（2 行扫描清单重指：line 12/19）。

**原位不动但需知：**
- `.claude/scripts/_shared/lib/md-table.ts`：`xmind-gen/archive.ts` 经 `@shared/lib/md-table.ts` 引用，迁移后仍解析（见 Scope OUT）。
- `templates/archive.md.hbs`：`archive-gen` CWD-relative 默认模板，不迁（见 D3）。
- 渲染簇内部相对 import（barrel 的 `./xmind-gen/*`、`cli.ts`/`xmind-io.ts` 的 `./render.ts`/`./archive.ts`、`render.ts`↔`archive.ts`）：barrel 与子目录同进 `_shared/cli`，相对路径结构原样平移 → **全部不改**。
- 渲染簇的 `@shared/lib/*`（cli-runner / frontmatter / paths / rules / types）与 npm（Handlebars / JSZip / xmind-generator）import：绝对/包引用，迁移后不变。

---

## Prerequisites: Worktree

本计划在专用 detached worktree 内执行（项目 worktree-first 硬规则）。

```shell
cd /Users/poco/Projects/kata
git worktree prune                                         # 清理失效记录（若有）
git worktree add --detach .worktrees/bundle-5-render-shared main
cd .worktrees/bundle-5-render-shared
```

- **不** symlink `workspace/{project}/.kata`：纯代码迁移，不读 workspace 证据。
- **不** 对主工作树脏 submodule 做快照（见 Carryover 1）。
- worktree 内 `bun install` 通常无需（依赖未变）；若 `bun test` 报缺依赖再 `bun install`。

---

## 验证约定（每个改代码 Task 的 green bar）

每个改代码 Task 结束前，在 worktree 内运行并记录 exit/计数：

| 命令 | 通过标准 |
| --- | --- |
| `bun run type-check` | exit 0（根 `tsc --noEmit`，覆盖 `.claude/scripts/**`，迁入文件已进根 gate） |
| `bun test --cwd engine` | 全部 pass，记录 pass/fail/skip（基线见 Task 1） |
| `bun run check` | Biome（`biome check .`）exit 0，覆盖 `_shared/cli` 新文件 |

最终 Task 4 追加全量：`bun run check:skills`、`bun run lint`、`bun run lint:debris`、`bun run lint:paths`、`bun run test:apps`、`bun run test:plugins` 全绿。

**Commit 规范：** path-scoped `git add`（严禁 `-A`/`.`）；type:emoji 固定映射（`refactor: ✨`、`merge: 🔀`）；description ≤ 72 字符。每个 commit 前 green bar 必须转绿，中途红只允许存在于 Task 内部。

---

## Task 1: 基线确认 + worktree 准备

**Files:** 无代码改动（只读 + worktree 准备）。

- [ ] **Step 1: 主工作树确认脏状态并保持不动**

Run: `git -C /Users/poco/Projects/kata status --short`
Expected: 仅出现 ` m plugins/lanhu/mcp-bridge/lanhu-mcp`（脏 submodule）与历史 `docs/superpowers/plans/.process/**` 等未提交删除。若出现其它意外改动，停下来向用户确认是否属本计划范畴——**不要**把脏 submodule 或历史删除卷进任何快照。

- [ ] **Step 2: 创建并进入 worktree**

```bash
cd /Users/poco/Projects/kata
git worktree prune
git worktree add --detach .worktrees/bundle-5-render-shared main
cd .worktrees/bundle-5-render-shared
```
Expected: worktree 创建成功，HEAD detached 于 main 当前 SHA（`061b191e0` 或更新）。

- [ ] **Step 3: 记录基线绿**

Run（在 worktree 内）：
```bash
bun run type-check; echo "type-check exit=$?"
bun test --cwd engine 2>&1 | tail -5
bun run check 2>&1 | tail -3
```
Expected: `type-check exit=0`；`bun test --cwd engine` 全 pass（记录 pass/skip 计数作为后续对账基线）；Biome 无 error。

- [ ] **Step 4: 复核渲染簇引用面与零类型债（确认与计划一致）**

Run:
```bash
rg -n "from \"\.\./archive-gen|from \"\.\./xmind-gen|from \"\.\./xmind-patch" engine/src
(cd engine && bunx tsc --noEmit 2>&1) | grep "error TS" | grep -vE "TS6059" | grep -E "archive-gen|xmind-gen|xmind-patch|xmind-io" || echo "render files: no real type errors"
```
Expected: 第一条恰好命中 `engine/src/cli/index.ts:27/52/53` 三行；第二条输出 `render files: no real type errors`。若不符，停下来重新核对计划。

（Task 1 无 commit。）

---

## Task 2: 迁 `archive-gen` + `xmind-patch` → `_shared/cli` + 重指注册

两个顶层单文件命令，互不依赖、均不在 `large-file-split.test.ts` 清单内，故同 commit、独立绿。

**Files:**
- Move: `engine/src/archive-gen.ts` → `.claude/scripts/_shared/cli/archive-gen.ts`
- Move: `engine/src/xmind-patch.ts` → `.claude/scripts/_shared/cli/xmind-patch.ts`
- Modify: `engine/src/cli/index.ts:27,53`

- [ ] **Step 1: git mv 两个命令模块**

```bash
git mv engine/src/archive-gen.ts .claude/scripts/_shared/cli/archive-gen.ts
git mv engine/src/xmind-patch.ts .claude/scripts/_shared/cli/xmind-patch.ts
```
（两文件的 `@shared/lib/*` import 与 npm import 均为绝对/包引用，迁移后不变。）

- [ ] **Step 2: 重指 `engine/src/cli/index.ts` 的 archive-gen import（line 27）**

把：
```ts
import { program as archiveGen } from "../archive-gen.ts";
```
改为：
```ts
import { program as archiveGen } from "@shared/cli/archive-gen.ts";
```

- [ ] **Step 3: 重指 `engine/src/cli/index.ts` 的 xmind-patch import（line 53）**

把：
```ts
import { program as xmindPatch } from "../xmind-patch.ts";
```
改为：
```ts
import { program as xmindPatch } from "@shared/cli/xmind-patch.ts";
```

- [ ] **Step 4: 确认无残留旧路径引用**

Run: `rg -n "\.\./archive-gen\.ts|\.\./xmind-patch\.ts" engine --type ts`
Expected: 无输出（注册中心已重指；子进程测试与 `case-signal-analyzer.ts:149` 的子命令名字符串不在此列）。

- [ ] **Step 5: 验证绿**

Run:
```bash
bun run type-check; echo "exit=$?"
bun test --cwd engine 2>&1 | tail -6
bun run check 2>&1 | tail -3
```
Expected: `type-check exit=0`（迁入文件进根 gate 无新错误）；engine 测试 pass 数 == 基线（含 `archive-gen.test.ts`、`xmind/patch.test.ts` 子进程测试通过 → 证明 `@shared/cli` 运行时解析正常 + `kata archive-gen`/`kata xmind-patch` 命令名不变）；Biome 无 error。

- [ ] **Step 6: Commit**

```bash
git add .claude/scripts/_shared/cli/archive-gen.ts .claude/scripts/_shared/cli/xmind-patch.ts engine/src/cli/index.ts
git add -u engine/src
git commit -m "refactor: ✨ relocate archive-gen + xmind-patch into _shared/cli"
```
（`git add -u engine/src` 仅暂存 engine/src 下已跟踪文件的删除侧，不波及脏 submodule。）

---

## Task 3: 迁 `xmind-gen`（barrel + 子目录）→ `_shared/cli` + 重指注册 + 修测试清单

barrel `xmind-gen.ts` 与 `xmind-gen/` 子目录同进 `_shared/cli`，内部相对 import 结构原样平移；同 commit 修 `large-file-split.test.ts` 两条扫描清单（否则 ENTRY 项 `readFileSync` throw、测试红）。

**Files:**
- Move: `engine/src/xmind-gen.ts` → `.claude/scripts/_shared/cli/xmind-gen.ts`
- Move: `engine/src/xmind-gen/` → `.claude/scripts/_shared/cli/xmind-gen/`（`archive.ts` / `cli.ts` / `render.ts` / `xmind-io.ts`）
- Modify: `engine/src/cli/index.ts:52`
- Modify: `engine/tests/large-file-split.test.ts:12,19`

- [ ] **Step 1: git mv barrel 与子目录**

```bash
git mv engine/src/xmind-gen.ts .claude/scripts/_shared/cli/xmind-gen.ts
git mv engine/src/xmind-gen   .claude/scripts/_shared/cli/xmind-gen
```
（barrel 的 `export * from "./xmind-gen/archive.ts"` 等 4 行、子目录内 `./render.ts`/`./archive.ts`/`./xmind-io.ts` 互引、`archive.ts` 的 `@shared/lib/md-table.ts` 与各文件 `@shared/lib/*`：均同迁移单元或绝对引用，**全部不改**。）

- [ ] **Step 2: 重指 `engine/src/cli/index.ts` 的 xmind-gen import（line 52）**

把：
```ts
import { program as xmindGen } from "../xmind-gen.ts";
```
改为：
```ts
import { program as xmindGen } from "@shared/cli/xmind-gen.ts";
```

- [ ] **Step 3: 重指 `large-file-split.test.ts` 的 ENTRY 扫描项（line 12）**

把：
```ts
  "engine/src/xmind-gen.ts",
```
改为：
```ts
  ".claude/scripts/_shared/cli/xmind-gen.ts",
```

- [ ] **Step 4: 重指 `large-file-split.test.ts` 的 SPLIT_DIR 扫描项（line 19）**

把：
```ts
  "engine/src/xmind-gen",
```
改为：
```ts
  ".claude/scripts/_shared/cli/xmind-gen",
```
（这两项用 `path.join(ROOT, filePath)` 解析为绝对路径；ROOT = `repoRoot()`，新路径在 repo 根下、与运行 CWD 无关，正确解析到迁入位置，保持尺寸预算覆盖。）

- [ ] **Step 5: 确认无残留旧路径引用**

Run: `rg -n "\.\./xmind-gen\.ts|engine/src/xmind-gen" engine --type ts`
Expected: 无输出（注册中心 + 测试清单均已重指；历史 plan 文档 `docs/superpowers/plans/2026-05-29-kata-bundle-3-code-migration.md` 的旧路径是历史记录、**不改**）。

- [ ] **Step 6: 验证绿**

Run:
```bash
bun run type-check; echo "exit=$?"
bun test --cwd engine 2>&1 | tail -8
bun run check 2>&1 | tail -3
```
Expected: `type-check exit=0`；engine 测试 pass 数 == 基线（含 `xmind/gen.test.ts` 子进程测试 + `large-file-split.test.ts` 两个 P4-01 用例通过 → 证明扫描清单重指后仍能 `readFileSync` 到迁入文件、尺寸预算覆盖未丢）；Biome 无 error。

- [ ] **Step 7: Commit**

```bash
git add .claude/scripts/_shared/cli/xmind-gen.ts .claude/scripts/_shared/cli/xmind-gen engine/src/cli/index.ts engine/tests/large-file-split.test.ts
git add -u engine/src
git commit -m "refactor: ✨ relocate xmind-gen into _shared/cli"
```

---

## Task 4: 最终回归 + 合并 main + 清理

**Files:** 无代码改动。

- [ ] **Step 1: worktree 内全量 gate**

Run（逐条记录 exit/计数）：
```bash
bun run type-check; echo "type-check exit=$?"
bun test --cwd engine 2>&1 | tail -6
bun run check 2>&1 | tail -3
bun run check:skills; echo "check:skills exit=$?"
bun run lint 2>&1 | tail -3; echo "lint exit=$?"
bun run lint:debris; echo "lint:debris exit=$?"
bun run lint:paths; echo "lint:paths exit=$?"
bun run test:apps 2>&1 | tail -3
bun run test:plugins 2>&1 | tail -3
```
Expected: 全部 exit 0 / 全 pass。`check:skills` 仍绿（thin-lint 不约束 `_shared/cli`）。`lint`（biome 显式 path 列表）仍绿——渲染簇迁出 `engine/src` 后不再被 `lint` 扫描，但由 `bun run check`（`biome check .`）覆盖，内容未变故无 error。`lint:paths` 仍绿（无残留 `engine/src/(archive-gen|xmind-gen|xmind-patch)` 引用、无 stale-path）。

- [ ] **Step 2: 确认 Codex 占位状态仍准确（Phase-1 同步评估）**

Run: `sed -n '1,12p' .agents/README.md`
Expected: 仍准确描述 `.agents/` Phase-1 占位、Codex runtime 未消费 `_shared/cli`。本计划未改路由/入口语义，确认无需改 `.agents/**`；若 README 已不准确，记录为 Phase-2 待办，**不在本计划修**（见 Carryover 4）。

- [ ] **Step 3: 确认提交范围干净（无脏 submodule、无越界文件）**

Run:
```bash
git log --oneline main..HEAD
git status --short
git log -p main..HEAD -- plugins/ | head
```
Expected: 恰好 2 个本计划 commit（2×refactor）；`git status` 干净或仅剩主工作树固有脏状态（不在本 worktree）；第三条无输出（无 `plugins/` 越界）。

- [ ] **Step 4: 记录 HEAD SHA，回主工作树合并**

```bash
SHA=$(git rev-parse HEAD); echo "$SHA"
cd /Users/poco/Projects/kata
git merge --no-ff "$SHA" -m "merge: 🔀 整合 bundle 5 渲染簇下沉 _shared/cli"
```

- [ ] **Step 5: 主工作树复验**

Run（在 `/Users/poco/Projects/kata`）：
```bash
bun run type-check; echo "exit=$?"
bun test --cwd engine 2>&1 | tail -6
bun run check:skills; echo "check:skills exit=$?"
```
Expected: `type-check exit=0`；engine 测试全 pass；`check:skills` exit 0。

- [ ] **Step 6: 推送**

```bash
git push origin main
```
（远端不可用则记录阻塞，不静默跳过。）

- [ ] **Step 7: 清理 worktree**

```bash
git worktree remove .worktrees/bundle-5-render-shared
git worktree list
```
Expected: 列表不再含 `bundle-5-render-shared`。

---

## Self-Review（已执行）

**1. 范围覆盖：** 本计划交付「渲染簇 → `_shared/cli`」单一独立增量，落定 Bundle-3 显式延后的渲染机制归宿（背景发现 2 + D2）。依赖图实测做了两处有据的范围裁剪并标注理由：剔除 case-edit（实测无 skill 专属代码，背景发现 1）、剔除 cases 簇（共享 umbrella、独立子系统，背景发现 3 + Scope OUT），均按 writing-plans Scope Check「独立子系统拆分独立 plan」处理。

**2. Placeholder 扫描：** 无 TBD/TODO；每个改代码步骤给出 exact 文件:行 与完整 before/after 代码块；每个验证步骤给出 exact 命令与预期（含计数对账口径）。

**3. 类型/命名一致性：** 落点统一 `.claude/scripts/_shared/cli/`，别名统一 `@shared/cli/<file>.ts`；3 行注册 import（index.ts 27/53/52）与 2 行测试清单（large-file-split 12/19）逐行给出 before/after；内部相对 import、`@shared/lib/*`、npm import、模板默认值、子命令名字符串均显式标注「不改」并附理由（D3/D5/D6 + File Structure）。无前后命名漂移。

**4. 顺序与每步绿：** Task 1（基线/worktree）→ Task 2（archive-gen+xmind-patch，独立绿，commit 1）→ Task 3（xmind-gen barrel+子目录+测试清单，独立绿，commit 2）→ Task 4（全量回归/合并/push/清理）。每个改代码 Task 自带 type-check + engine test + biome green bar；`git mv` 破坏注册 import 的红只存在于 Task 内部、commit 前必转绿。Task 3 把测试清单修复与 xmind-gen 迁移放同一 commit，避免「迁移后测试 ENTRY 项 `readFileSync` throw」的中途红。

**5. 验证完备性：** 迁移正确性由「根 type-check exit 0」+「`bun test --cwd engine` 全 pass（含 `archive-gen`/`xmind/gen`/`xmind/patch` 子进程测试 → 间接验证 `@shared/cli` 运行时解析 + 命令名不变；`large-file-split` P4-01 → 验证测试清单重指）」双重把关；Task 4 追加 check:skills / lint / lint:debris / lint:paths / test:apps / test:plugins + Codex 占位复核。

**6. 风险/watch-items：**
- `@shared/cli` 运行时解析：机制同 `@shared/lib`（Bundle-3 现网已验证），Task 2 Step 5 子进程测试会实证；若意外失败，说明 bun tsconfig paths 解析有别于预期，在该步排查（回退手段：相对 import）。
- `large-file-split.test.ts` 重指后路径正确性：新路径以 `repoRoot()` 为基、与运行 CWD 无关；Task 3 Step 6 由 P4-01 两用例实证 `readFileSync` 成功。
- `lint` 脚本不再扫描迁出文件：渲染簇内容未变、`bun run check` 覆盖，无回归；全局 lint 覆盖缺口（`_shared` 未入 `lint` 脚本）记入后续 engine 删除计划，非本计划新增问题。

---

## 后续 Plan（更新后路线图，待本计划落地后再写）

依赖图实测后，剩余迁移按「独立子系统各成一 plan」拆分：

- **bundle-6（cases 共享簇 → `_shared`）**：迁 `engine/src/cases/{verify-layers,source-fact-set,case-extract}.ts` + `engine/src/cli/cases-{compare,verify,validate,e2e}.ts`，并处理 `cases-lint.ts` umbrella（含 CI `lint` verb）对它们的 `@shared` 重指；判定 `cases-lint.ts` 本体归宿（共享 umbrella → `_shared/cli`）。属独立子系统，与渲染簇无共享代码。
- **bundle-7（剩余命令归属判定 + 迁移）**：`history-convert`（case-edit 转换语义 → bundle vs `_shared`）、`knowledge-curate` + `knowledge-curate/*`（knowledge-curate skill）、`scan-report` + `_shared/lib/scan-report-*`（defect-analyze）；逐簇判定 skill-exclusive vs shared 后迁移。
- **bundle-8（engine 收口删除 + 测试基础设施统一）**：CLI 注册中心 `engine/src/cli/index.ts` 收口到 `_shared/cli`（含 noun-verb builders、`@shared/cli/bin/kata` 直接注册全部命令）；所有 skill 测试物理迁入各自 `tests/` + `cli-runner.ts` test helper 收口到公共位置 + `bunfig.toml`/`test:skills` 并入 `ci`；`templates/archive.md.hbs` 与 repo 根 `templates/` 收口；`lint` 脚本并入 `_shared`；移除 `engine/` workspace 成员并删除 `engine/`；同步所有 `engine/bin/kata` / `engine/src/...` 文档路径。
- **MCP/catalog 拆除（正交，可任意时点）**：spec §6.1 的 `apps/mcp/` + `apps/core/catalog/` + `package.json` `mcp` 脚本 + `test:apps` 删除（已有 `2026-05-29-kata-simplify-1-mcp-catalog-teardown.md` 草案，未执行）；在 `apps/`、不阻塞删 engine，可并入 bundle-8 或单独执行。
- **Codex / Phase-2**：校正 `.agents/README.md:7` 的 `reviewers/`/`workers/` 前瞻描述与 `prompts/agent-<step>.md` 约定（Bundle-2/3 Carryover 第 1 条）。
