# kata 简化重构 · Plan 1: MCP + Catalog Teardown

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除只读 MCP 查询面(`apps/mcp/`)及其唯一依赖库(`apps/core/`),清理 `.mcp.json` 与 `package.json` 中的相关引用,过程中保持 `bun test` / `tsc` / `check:skills` 全绿。

**Architecture:** 纯删除型变更。`apps/` 的唯一外部消费者是 `apps/mcp` 自身 + 根 `.mcp.json` 注册;engine 从不 import `apps/`(仅 `skill-audit.ts` 有一行注释提及)。`skill-manifest.yaml` / `manifest-loader.ts` **本计划不动**——它们仍被 `kata skills sync-check` 使用,留给 Plan 3 与薄 lint 一起拆。

**Tech Stack:** Bun 1.3、TypeScript、Biome。

**Spec:** `docs/superpowers/specs/2026-05-29-kata-skill-router-simplify-design.md`(§6.1 MCP/catalog 删除项,commit `9b41ee350`)。这是 4 个顺序计划中的第 1 个,独立可先执行。

---

## Prerequisites: Worktree

按项目 worktree-first 规则,在隔离 detached worktree 内执行(在主工作树运行):

```bash
ROOT=$(pwd)
W="$ROOT/.worktrees/simplify-1-mcp-teardown"
git worktree add --detach "$W" main
cd "$W"
```

> 注:本计划只删 tracked 代码与配置,不依赖 ignored runtime 目录,无需 symlink `.kata`。
> 注:主工作树当前有一批与本计划无关的未提交删除(P2/P3 plans、reviews、lt-dq specs);worktree 从 `main` 检出,不受其影响,无需处理。

## File Structure

**删除:**
- `apps/`(整个目录):`apps/mcp/{server,tools,dispatch}.ts` + 三个 `*.test.ts`;`apps/core/catalog/{artifacts,features,guards,projects,skills,xmind,compat-shim,index}.ts` + 各 `*.test.ts`;`apps/core/{errors,types,test-helpers}.ts`;`apps/tsconfig.json`
- `.mcp.json`(仅注册了指向 `apps/mcp/server.ts` 的 `kata` server)

**修改:**
- `package.json`:删 `mcp` 脚本、`test:apps` 脚本、`ci` 脚本中的 `&& bun run test:apps` 段

**不动(留给 Plan 3):**
- `.claude/contracts/skill-manifest.yaml`、`engine/src/skills/manifest-loader.ts`、`engine/src/api.ts` 的 `SkillManifest*` re-export、`engine/src/cli/skill-audit.ts`

---

## Task 1: 建立基线(确认删除前全绿)

**Files:** 无改动(只读验证)

- [ ] **Step 1: 跑引擎测试,记录通过数**

Run: `bun test --cwd engine 2>&1 | tail -5`
Expected: 全部 PASS,记录 `N pass, 0 fail`(作为 Task 2 之后的对照基线)。

- [ ] **Step 2: 跑 type-check**

Run: `bun run type-check`
Expected: exit 0,无 error。

- [ ] **Step 3: 跑 skill 同步检查**

Run: `bun run check:skills`
Expected: exit 0,末行 `workflow check passed`(manifest/​workflow 检查此刻仍在,属正常)。

- [ ] **Step 4: 确认 apps 当前可独立测试(删除前的存在性证据)**

Run: `bun test ./apps 2>&1 | tail -3`
Expected: PASS(确认这些是"删除前还活着"的测试,删除后随目录消失)。

---

## Task 2: 删除 apps/ + .mcp.json + 清理 package.json

**Files:**
- Delete: `apps/`(整目录)
- Delete: `.mcp.json`
- Modify: `package.json`(scripts:删 `mcp`、`test:apps`、`ci` 中 `test:apps` 段)

- [ ] **Step 1: 删除整个 apps 目录**

Run: `git rm -r apps/`
Expected: 列出删除的 ~20 个文件(含 `apps/mcp/*`、`apps/core/catalog/*`、`apps/core/*.ts`、`apps/tsconfig.json`)。

- [ ] **Step 2: 删除 .mcp.json**

Run: `git rm .mcp.json`
Expected: `rm '.mcp.json'`。

- [ ] **Step 3: 从 package.json 删除 `mcp` 脚本行**

在 `package.json` 的 `scripts` 中删除这一行:

```json
    "mcp": "bun apps/mcp/server.ts",
```

- [ ] **Step 4: 从 package.json 删除 `test:apps` 脚本行**

删除这一行:

```json
    "test:apps": "bun test ./apps",
```

- [ ] **Step 5: 从 package.json 的 `ci` 脚本移除 `test:apps` 段**

将 `ci` 脚本中的:

```json
    "ci": "bun run lint && bun run lint:debris && bun run lint:agents && bun run lint:paths && bun run check:skills && bun run lint:agents:codex && bun run lint:skills:codex && bun run type-check && bun run test && bun run test:apps && bun run test:plugins && bun run test:tools",
```

改为(去掉 ` && bun run test:apps`):

```json
    "ci": "bun run lint && bun run lint:debris && bun run lint:agents && bun run lint:paths && bun run check:skills && bun run lint:agents:codex && bun run lint:skills:codex && bun run type-check && bun run test && bun run test:plugins && bun run test:tools",
```

- [ ] **Step 6: 校验 package.json 仍是合法 JSON**

Run: `bun -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('valid json')"`
Expected: 输出 `valid json`。

- [ ] **Step 7: 确认仓库已无 apps 残留引用**

Run: `grep -rn "apps/mcp\|apps/core\|test:apps\|core/catalog" --include="*.ts" --include="*.json" . 2>/dev/null | grep -v node_modules`
Expected: 仅可能命中 `engine/src/cli/skill-audit.ts` 与 `engine/tests/skills/manifest-repository.test.ts` 里的**注释**(非代码引用);无 import / script 引用。若出现注释外的命中,需一并清理。

- [ ] **Step 8: 跑引擎测试,确认与基线一致**

Run: `bun test --cwd engine 2>&1 | tail -5`
Expected: PASS 数与 Task 1 Step 1 一致,`0 fail`(引擎不依赖 apps,删除不影响)。

- [ ] **Step 9: type-check 全绿**

Run: `bun run type-check`
Expected: exit 0(根 `tsconfig.json` 的 include 为 `plugins/**`、`scripts/**`、`lib/**`,不含 apps,删除后无影响)。

- [ ] **Step 10: check:skills 全绿**

Run: `bun run check:skills`
Expected: exit 0,末行 `workflow check passed`(manifest/workflow 检查未改,仍通过)。

- [ ] **Step 11: biome 全量检查**

Run: `bun run check`
Expected: exit 0(`biome check .`;apps 已删,无残留 lint 目标)。

- [ ] **Step 12: 提交**

```bash
git add -A
git commit -m "refactor: ✨ drop read-only mcp server and catalog lib"
```

Expected: 一个 commit,变更为 `apps/` 全删 + `.mcp.json` 删除 + `package.json` 三处脚本清理。

---

## Self-Review（已执行,记录于此）

**1. Spec 覆盖**:本计划覆盖 spec §6.1 中 `apps/mcp/`、`apps/core/catalog/` 两项删除及 `package.json` mcp 脚本删除。spec §6.1 的 `skill-manifest.yaml` / `manifest-loader` / `api re-export` / `workflow*` / `blackboard*` / `projection-targets` 删除**不在本计划**,明确划归 Plan 3(避免破坏当前 `sync-check`)。`.mcp.json` 是 spec 未显式列出但删 MCP 必须处理的连带项,已纳入。

**2. 占位扫描**:无 TBD/TODO;每个删除/修改步骤给出精确命令与 package.json 前后字符串。

**3. 类型一致**:本计划无新增类型/函数;仅删除与脚本字符串编辑。删除的 `apps/core` 类型(`FeatureRow` re-export 等)无 `apps/` 外消费者(已 grep 确认),不影响 engine。

**4. 验证完整**:Task 1 建基线,Task 2 Step 8–11 用相同命令对照,确保 teardown 不回归。
