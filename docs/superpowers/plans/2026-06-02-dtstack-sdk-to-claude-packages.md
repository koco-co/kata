# dtstack-sdk 迁移到 .claude/packages 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `tools/dtstack-sdk` workspace 包整体搬到 `.claude/packages/dtstack`，保持包名不变，重写所有硬编码物理路径，删除空 `tools/` 目录。

**Architecture:** 这是一次**原子目录搬迁 + 路径重写**重构，不是 TDD 增量开发。`git mv` 后所有路径引用必须在同一改动里全部更新——中间态必然是断的，因此先集中改完全部引用，再一次性验证 + grep 兜底，而非 write-test→fail→impl 循环。包名 `dtstack-sdk` 保持不变，所有 `import ... from "dtstack-sdk"` 靠 bun workspace 名解析、零改动；只动物理路径和代码里硬编码的运行时路径字符串。

**Tech Stack:** Bun workspaces、TypeScript（项目内 `tsc` + 包内 tsconfig）、biome、bun test。

**Spec:** [docs/superpowers/specs/2026-06-02-dtstack-sdk-to-claude-packages-design.md](../specs/2026-06-02-dtstack-sdk-to-claude-packages-design.md)

---

## Preflight（执行环境）

本计划按项目 worktree-first 工作流执行：应已通过 `superpowers:using-git-worktrees` 创建 detached worktree，并 symlink 必要的 ignored runtime 目录。所有 `git mv`、编辑、验证、分批 commit 都在 worktree 内完成；验证通过后再回主工作树 `git merge --no-ff`。

**注意路径深度**：`tools/dtstack-sdk`（2 层）→ `.claude/packages/dtstack`（3 层），包内 `tsconfig.json` 的 `extends` 相对路径会多一层 `../`。

---

## 文件结构

迁移后涉及的文件与职责：

- `.claude/packages/dtstack/`（**新位置**，由 `tools/dtstack-sdk/` 整体 `git mv` 而来）：dtstack workspace 包，含 `package.json`、`tsconfig.json`、`src/`、`__tests__/`、`scripts/`、`docs/`、`README.md`。
- `package.json`（根）：workspaces glob、`test:tools` 脚本、`lint` 脚本。
- `.claude/packages/dtstack/tsconfig.json`：`extends` 相对路径。
- `.claude/packages/dtstack/src/adapters/execute-table.ts`：spawn CLI 的 fallback 路径字符串。
- `.claude/packages/dtstack/__tests__/adapters/execute-table.test.ts`：上述路径的断言。
- `.claude/scripts/_shared/tests/security-command-hardening.test.ts`：scopedFiles 路径。
- `workspace/.../tests/helpers/dtstack-preconditions.ts`：CLI fallback 路径字符串。
- `.claude/packages/dtstack/README.md`、`.claude/packages/dtstack/scripts/diagnose-insert.ts`、根 `README.md`、根 `README-EN.md`：文档路径引用。

---

## Task 1: 整体搬迁目录

**Files:**
- Move: `tools/dtstack-sdk/` → `.claude/packages/dtstack/`
- Delete: `tools/`（搬迁后应仅剩 `.DS_Store`）

- [ ] **Step 1: git mv 整个包**

```bash
cd "$(git rev-parse --show-toplevel)"
mkdir -p .claude/packages
git mv tools/dtstack-sdk .claude/packages/dtstack
```

- [ ] **Step 2: 删除残留的 tools/ 与 .DS_Store**

```bash
rm -f tools/.DS_Store
rmdir tools 2>/dev/null || true
ls tools 2>/dev/null && echo "WARN: tools/ 仍存在" || echo "OK: tools/ 已删除"
```

Expected: 输出 `OK: tools/ 已删除`。

- [ ] **Step 3: 暂不 commit**

本 task 产生断裂中间态（路径未更新），与 Task 2–4 一起在 Task 4 末尾首次 commit。

---

## Task 2: 更新包内 tsconfig 的 extends 深度

**Files:**
- Modify: `.claude/packages/dtstack/tsconfig.json`

- [ ] **Step 1: 改 extends 相对路径（多一层 ../）**

把：

```json
{
  "extends": "../../tsconfig.json",
```

改为：

```json
{
  "extends": "../../../tsconfig.json",
```

其余字段（`rootDir`、`outDir`、`include`）不变。

- [ ] **Step 2: 验证 JSON 仍合法**

Run: `bun -e "JSON.parse(require('fs').readFileSync('.claude/packages/dtstack/tsconfig.json','utf8')); console.log('tsconfig ok')"`
Expected: 输出 `tsconfig ok`。

---

## Task 3: 更新根 package.json 的 workspace 与脚本

**Files:**
- Modify: `package.json:7`（workspaces）
- Modify: `package.json:26`（test:tools）
- Modify: `package.json:30`（lint）

- [ ] **Step 1: 改 workspaces 路径**

把第 7 行：

```json
    "tools/dtstack-sdk",
```

改为：

```json
    ".claude/packages/dtstack",
```

- [ ] **Step 2: 改 test:tools 脚本**

把：

```json
    "test:tools": "bun test --cwd tools/dtstack-sdk",
```

改为：

```json
    "test:tools": "bun test --cwd .claude/packages/dtstack",
```

- [ ] **Step 3: 改 lint 脚本的 tools glob**

把：

```json
    "lint": "biome check .claude/skills .claude/plugins .claude/scripts tools",
```

改为：

```json
    "lint": "biome check .claude/skills .claude/plugins .claude/scripts .claude/packages",
```

（`ci` 脚本通过 `test:tools` 间接引用，无需单独改。）

- [ ] **Step 4: 验证 JSON 合法**

Run: `bun -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json ok')"`
Expected: 输出 `package.json ok`。

---

## Task 4: 更新硬编码运行时路径与测试断言

这些是 filesystem 路径字符串（spawn 子进程 / 测试断言），**不是包名 import**，必须随目录改。

**Files:**
- Modify: `.claude/packages/dtstack/src/adapters/execute-table.ts`
- Modify: `.claude/packages/dtstack/__tests__/adapters/execute-table.test.ts`
- Modify: `.claude/scripts/_shared/tests/security-command-hardening.test.ts`
- Modify: `workspace/dataAssets/features/【v6410】【岚图汽车】【数据质量】主流程用例整理/tests/helpers/dtstack-preconditions.ts`

- [ ] **Step 1: execute-table.ts —— spawn fallback 路径**

把 `resolveDtstackCliInvocation` 中：

```ts
  return { command: "bun", argsPrefix: ["tools/dtstack-sdk/src/cli.ts"] };
```

改为：

```ts
  return { command: "bun", argsPrefix: [".claude/packages/dtstack/src/cli.ts"] };
```

- [ ] **Step 2: execute-table.test.ts —— 断言里的同路径**

把 else 分支：

```ts
      expect(invocation).toEqual({
        command: "bun",
        argsPrefix: ["tools/dtstack-sdk/src/cli.ts"],
      });
```

改为：

```ts
      expect(invocation).toEqual({
        command: "bun",
        argsPrefix: [".claude/packages/dtstack/src/cli.ts"],
      });
```

- [ ] **Step 3: security-command-hardening.test.ts —— scopedFiles 路径**

把：

```ts
    const scopedFiles = [
      "tools/dtstack-sdk/src/adapters/execute-table.ts",
      ".claude/plugins/lanhu/fetch.ts",
    ];
```

改为：

```ts
    const scopedFiles = [
      ".claude/packages/dtstack/src/adapters/execute-table.ts",
      ".claude/plugins/lanhu/fetch.ts",
    ];
```

- [ ] **Step 4: dtstack-preconditions.ts —— CLI fallback 路径**

把：

```ts
    ...(existsSync(localBin) ? [] : ["tools/dtstack-sdk/src/cli.ts"]),
```

改为：

```ts
    ...(existsSync(localBin) ? [] : [".claude/packages/dtstack/src/cli.ts"]),
```

- [ ] **Step 5: 首次 commit（Task 1–4 合一）**

```bash
cd "$(git rev-parse --show-toplevel)"
git add -A
git commit -m "refactor: ✨ dtstack-sdk 迁移到 .claude/packages 并重写硬编码路径"
```

---

## Task 5: 更新文档路径引用

**Files:**
- Modify: `.claude/packages/dtstack/README.md:41`
- Modify: `.claude/packages/dtstack/scripts/diagnose-insert.ts:5`
- Modify: `README.md`（目录树 `tools/` 行）
- Modify: `README-EN.md`（目录树 `tools/` 行）

- [ ] **Step 1: 包内 README 测试命令**

把：

```bash
bun test tools/dtstack-sdk/__tests__
```

改为：

```bash
bun test .claude/packages/dtstack/__tests__
```

- [ ] **Step 2: diagnose-insert.ts 运行注释**

把：

```ts
 * 运行：bun run tools/dtstack-sdk/scripts/diagnose-insert.ts
```

改为：

```ts
 * 运行：bun run .claude/packages/dtstack/scripts/diagnose-insert.ts
```

- [ ] **Step 3: 根 README.md 目录树删 tools/ 行**

删除整行：

```text
├── tools/           # 独立工具包
```

（dtstack 已并入 `.claude/`，不再需要顶层 `tools/` 条目。）

- [ ] **Step 4: 根 README-EN.md 目录树删 tools/ 行**

删除整行：

```text
├── tools/           # standalone toolkits
```

- [ ] **Step 5: commit 文档**

```bash
git add .claude/packages/dtstack/README.md .claude/packages/dtstack/scripts/diagnose-insert.ts README.md README-EN.md
git commit -m "docs: 📝 更新 dtstack 迁移后的路径引用"
```

---

## Task 6: 重链、验证、grep 兜底

**Files:** 无（仅运行命令）

- [ ] **Step 1: 重建 workspace symlink**

```bash
bun install
```

Expected: 成功，`node_modules/dtstack-sdk` 指向 `.claude/packages/dtstack`。验证：

```bash
ls -l node_modules/dtstack-sdk
```

Expected: symlink 目标含 `.claude/packages/dtstack`。

- [ ] **Step 2: 跑包自身测试**

Run: `bun run test:tools`
Expected: PASS，0 fail。

- [ ] **Step 3: 跑受影响测试（import 站点 + 安全断言）**

Run: `bun test .claude/scripts/_shared/tests/security-command-hardening.test.ts`
Expected: PASS。

- [ ] **Step 4: biome check + lint**

Run: `bun run check && bun run lint`
Expected: 均 0 error。

- [ ] **Step 5: skill 同步契约**

Run: `bun run check:skills`
Expected: PASS（应不受影响）。

- [ ] **Step 6: grep 兜底——确认无残留 tools/dtstack 引用**

Run:

```bash
grep -rn "tools/dtstack" --include="*.ts" --include="*.json" --include="*.md" . 2>/dev/null | grep -v node_modules | grep -v "/.worktrees/"
```

Expected: **无输出**（空）。若有输出，逐条修正后回到 Step 2 重跑。

- [ ] **Step 7: 确认 tools/ 已不在 git 跟踪**

Run: `git ls-files tools/ | head`
Expected: 无输出。

---

## 完成标准

- `dtstack-sdk` 包位于 `.claude/packages/dtstack`，`tools/` 已删除且不在 git 跟踪。
- 所有 `from "dtstack-sdk"` import 无需改动即解析（`bun run test:tools` 与受影响测试全绿即证明）。
- grep 无残留 `tools/dtstack` 引用。
- `bun run check` / `lint` / `check:skills` 通过。
- 按测试规范记录每条验证命令的 exit code 与 pass/fail/skip 计数。

合并：worktree 内全绿后记录 HEAD SHA，回主工作树 `git merge --no-ff <sha>`，merge 后重跑 `bun test` + `bun run test:tools` 做最终确认，再 `git push origin main`，最后清理 worktree。
