# kata Skill-Bundle 迁移 · Plan 1: Chassis 地基

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `.claude/scripts/_shared/` 立起跨 skill 共享代码底盘（lib / schemas / plugin-runtime / cli / bin），拆解 `.claude/contracts/`，迁移 `plugins/` 与 `scripts/lint/`，把 `kata skills sync-check` 重写为文件级薄 lint —— 全程 `bun test` / `tsc` / `check:skills` 保持绿，engine/ 与 `_shared` 并存过渡（engine 本计划不删）。

**Architecture:** 纯搬迁 + 接口收敛。共享代码用 `git mv` 搬到 `_shared`，import 用 tsconfig `@shared/*` 别名收敛（避免 `../../../` 与后续二次移动失效）。engine/src 暂留为「待迁 skill 专属代码」，改为从 `@shared/*` 引用。薄 lint 直接读文件结构，不再依赖 manifest/workflow。

**Tech Stack:** Bun 1.3、TypeScript、commander、Biome。

**Spec:** `docs/superpowers/specs/2026-05-29-kata-skill-bundle-migration-design.md`（§3 布局、§4 CLI 组合根、§7 contracts 拆解、§8 build/lint，commit `26157fdd0`）。本计划覆盖 spec §9 commit 1–4。

---

## Prerequisites: Worktree

按项目 worktree-first 规则，在隔离 detached worktree 内执行（在主工作树运行）：

```bash
ROOT=$(pwd)
W="$ROOT/.worktrees/bundle-1-chassis"
git worktree add --detach "$W" main
cd "$W"
```

> 注：本计划只搬迁 tracked 代码与配置，不读 `workspace/` 业务源，无需 symlink `.kata`。
> 注：主工作树当前有一批与本计划无关的未提交删除（P2/P3 plans、reviews、lt-dq specs）；worktree 从 `main` 检出，不受影响。

---

## File Structure

**新建：**
- `.claude/scripts/_shared/lib/`（接收 `engine/lib/**`）
- `.claude/scripts/_shared/schemas/`（接收 `engine/src/schemas/**` + `.claude/contracts/schemas/*.json|*.yaml`）
- `.claude/scripts/_shared/plugin-runtime/`（接收 `engine/src/plugins/**`）
- `.claude/scripts/_shared/cli/`（kata 命令注册中心 + 共享命令模块）
- `.claude/scripts/_shared/bin/kata`（CLI 入口 shim）
- `.claude/scripts/lint/`（接收根 `scripts/lint/*.ts`）
- `.claude/plugins/`（接收根 `plugins/{lanhu,notify,zentao}`）
- `.claude/prompt/_shared/`（接收 `.claude/skills/_shared/case-qa.md` + `.claude/contracts/output-artifacts.md`）

**修改：**
- `tsconfig.base.json`：加 `baseUrl` + `@shared/*` paths
- `tsconfig.json`：include 增加 `.claude/scripts/**`、`.claude/skills/**`
- `package.json`：合并 engine deps；`bin`/`check:skills`/`lint`/`lint:debris`/`test` 路径切换
- `engine/src/cli/skill-audit.ts`：去 manifest/workflow，接薄 lint
- `engine/src/api.ts`：删 `SkillManifest*` re-export

**删除：**
- `.claude/contracts/`（整目录）
- `engine/src/skills/{manifest-loader,workflow-check,workflow-schema}.ts`

---

## 验证约定

根 `bun run type-check` 的 `include` 不含 `engine/**`，故凡步骤改动 `engine/src/**`，「全绿回归」一律执行**双 type-check**：

```bash
bun run type-check && (cd engine && bun run type-check)
```

`engine/tsconfig.json` 继承 `tsconfig.base.json` 的 `@shared/*` 别名，故 engine 侧 tsc 能解析 `@shared/*`。下文步骤中 `bun run type-check` 均按此约定理解为「root + engine 双检」。

---

## Task 1: 建立基线（确认搬迁前全绿）

**Files:** 无改动（只读验证）

- [ ] **Step 1: 引擎测试基线**

Run: `bun test --cwd engine 2>&1 | tail -5`
Expected: 全 PASS，记录 `N pass, 0 fail`（作为后续每个 Task 的对照基线）。

- [ ] **Step 2: type-check 基线**

Run: `bun run type-check`
Expected: exit 0。

- [ ] **Step 3: check:skills 基线**

Run: `bun run check:skills`
Expected: exit 0，含 `skill manifest check passed` 与 `workflow check passed`（搬迁后这两行将消失，属预期）。

- [ ] **Step 4: lint:debris 基线**

Run: `bun run lint:debris`
Expected: exit 0（三个根 `scripts/lint` 守卫通过）。

---

## Task 2: 立 `@shared` 别名 + 目录骨架 + 依赖合并（additive，先不搬代码）

**Files:**
- Modify: `tsconfig.base.json`
- Modify: `tsconfig.json`
- Modify: `package.json`
- Create: `.claude/scripts/_shared/.gitkeep`

- [ ] **Step 1: 读 `tsconfig.base.json` 现状**

Run: `cat tsconfig.base.json`
Expected: 记录现有 `compilerOptions`，确认无 `paths`/`baseUrl` 冲突。

- [ ] **Step 2: 在 `tsconfig.base.json` 的 `compilerOptions` 加 baseUrl + 别名**

加入（与现有 compilerOptions 合并，不覆盖其它字段）：

```json
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["./.claude/scripts/_shared/*"]
    }
```

> 放在 base 而非 root，使 root 与 `engine/tsconfig.json` 都继承别名（engine/src 过渡期需 `@shared/*` 解析）。别名相对 base.json 所在的仓库根，故对两边都正确。

- [ ] **Step 3: root `tsconfig.json` 扩 include**

把 `include` 改为：

```json
  "include": ["plugins/**/*.ts", "scripts/**/*.ts", "lib/**/*.ts", ".claude/scripts/**/*.ts", ".claude/skills/**/scripts/**/*.ts", ".claude/skills/**/tests/**/*.ts"]
```

- [ ] **Step 4: 合并 engine deps 到根 `package.json`**

把 `engine/package.json` 的 `dependencies`（`ajv`、`ajv-formats`、`gray-matter`、`handlebars`、`pinyin-pro`、`yaml`）并入根 `package.json` 的 `dependencies`（`commander` 已在根，保留根版本）。

Run: `bun install`
Expected: 安装成功，lockfile 更新。

- [ ] **Step 5: 建骨架目录**

Run: `mkdir -p .claude/scripts/_shared && touch .claude/scripts/_shared/.gitkeep`
Expected: 目录创建。

- [ ] **Step 6: 验证别名可解析（冒烟）**

Run: `echo 'export const ping = 1;' > .claude/scripts/_shared/ping.ts && bun -e 'import {ping} from "@shared/ping.ts"; console.log("alias-ok", ping)' && rm .claude/scripts/_shared/ping.ts`
Expected: 输出 `alias-ok 1`（确认 Bun 解析 `@shared/*`）。

- [ ] **Step 7: 全绿回归**

Run: `bun run type-check && bun test --cwd engine 2>&1 | tail -3`
Expected: type-check exit 0；测试 PASS 数 = Task 1 Step 1。

- [ ] **Step 8: 提交**

```bash
git add -A
git commit -m "build: 🏗️ add @shared alias, chassis skeleton, merge engine deps"
```

---

## Task 3: 搬迁 `engine/lib/` → `_shared/lib/`（codemod 收敛 import）

**Files:**
- Move: `engine/lib/**` → `.claude/scripts/_shared/lib/**`
- Modify: `engine/src/**/*.ts`、`engine/tests/**/*.ts`（import 改 `@shared/lib/*`）

- [ ] **Step 1: 移动整个 lib 目录**

```bash
git rm -r --cached engine/lib >/dev/null 2>&1 || true
git mv engine/lib .claude/scripts/_shared/lib
rm -f .claude/scripts/_shared/.gitkeep
```
Expected: `engine/lib` 消失，`.claude/scripts/_shared/lib/` 含 ~40 个 `.ts`。lib 内部 `./` 相对 import 不受影响。

- [ ] **Step 2: codemod —— 静态 import / re-export 改别名**

```bash
grep -rlZ --include="*.ts" -E 'from "(\.\./)+lib/' engine/src engine/tests | xargs -0 perl -pi -e 's{from "(?:\.\./)+lib/}{from "\@shared/lib/}g'
```
Expected: 所有 `from "../lib/X"` / `from "../../lib/X"` → `from "@shared/lib/X"`。

- [ ] **Step 3: codemod —— 动态 import 改别名**

```bash
grep -rlZ --include="*.ts" -E 'import\("(\.\./)+lib/' engine/src engine/tests | xargs -0 perl -pi -e 's{import\("(?:\.\./)+lib/}{import("\@shared/lib/}g' 2>/dev/null || echo "no dynamic lib imports"
```
Expected: 无遗漏的动态 `lib/` import。

- [ ] **Step 4: 确认无残留相对 lib import**

Run: `grep -rn -E 'from "(\.\./)+lib/' engine/src engine/tests; echo "exit=$?"`
Expected: 无输出（grep `exit=1`）。

- [ ] **Step 5: 全绿回归**

Run: `bun run type-check && bun test --cwd engine 2>&1 | tail -3`
Expected: type-check exit 0；测试 PASS 数 = 基线。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "refactor: ✨ move engine/lib to _shared/lib via @shared alias"
```

---

## Task 4: 搬迁 schemas → `_shared/schemas/`（含 contracts 的 schema 定义）

**Files:**
- Move: `engine/src/schemas/**` → `.claude/scripts/_shared/schemas/**`
- Move: `.claude/contracts/schemas/{保留项}` → `.claude/scripts/_shared/schemas/`
- Modify: `.claude/scripts/_shared/lib/paths.ts`（加 `sharedSchemasPath`）
- Modify: `.claude/scripts/_shared/schemas/loaders.ts`（改 schema 路径）
- Modify: `engine/src/**`（import 改 `@shared/schemas/*`）

- [ ] **Step 1: 移动 schema 加载器目录**

```bash
git mv engine/src/schemas .claude/scripts/_shared/schemas
```
Expected: `_shared/schemas/loaders.ts` 就位。

- [ ] **Step 2: 移动 contracts 下要保留的 schema 定义文件**

```bash
cd .claude/contracts/schemas
git mv FeatureManifest.v2.schema.json FeatureMetadata.v1.schema.json \
  SourceSnapshot.v1.schema.json FeatureSourceSnapshot.v1.schema.json \
  CoverageMatrix.v1.schema.json CaseCorrections.v1.schema.json \
  PlaywrightAutomationHandoff.v2.schema.json SourceRefRegistry.v1.schema.json \
  source-ref-registry.yaml \
  ../../scripts/_shared/schemas/
cd -
```
Expected: 9 个文件迁入 `_shared/schemas/`。**保留** `blackboard-slots.json`、`blackboard-state.json` 于原地（Task 7 删除）。

- [ ] **Step 3: 在 `_shared/lib/paths.ts` 加 `sharedSchemasPath` 助手**

在 `contractPath` 函数附近加入：

```typescript
/** Absolute path under .claude/scripts/_shared/schemas/. */
export function sharedSchemasPath(...segments: string[]): string {
  return resolve(repoRoot(), ".claude/scripts/_shared/schemas", ...segments);
}
```

- [ ] **Step 4: 改 `_shared/schemas/loaders.ts` 用新路径**

把：

```typescript
import { contractPath } from "../../lib/paths.ts";
```
改为：
```typescript
import { sharedSchemasPath } from "@shared/lib/paths.ts";
```
并把 `loadSchema` 内：
```typescript
  const path = contractPath("schemas", filename);
```
改为：
```typescript
  const path = sharedSchemasPath(filename);
```

- [ ] **Step 5: codemod —— `../schemas/loaders.ts` 引用改别名**

```bash
grep -rlZ --include="*.ts" -E 'from "(\.\./)+schemas/loaders' engine/src engine/tests | xargs -0 perl -pi -e 's{from "(?:\.\./)+schemas/loaders}{from "\@shared/schemas/loaders}g'
```
Expected: `features-lint`、`cases-validate`、`handoff-render`、`lint/handoff-double-track`、`cases/verify-layers` 等改为 `@shared/schemas/loaders.ts`。

- [ ] **Step 6: 确认无残留相对 schemas 引用 + 全绿**

Run: `grep -rn -E 'from "(\.\./)+schemas/loaders' engine; echo "exit=$?"; bun run type-check && bun test --cwd engine 2>&1 | tail -3`
Expected: grep 无输出；type-check exit 0；测试 PASS 数 = 基线（schema 校验类用例仍绿，证明 JSON 路径正确）。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "refactor: ✨ move schemas to _shared/schemas"
```

---

## Task 5: 搬迁插件运行时 + 重定位插件定义

**Files:**
- Move: `engine/src/plugins/**` → `.claude/scripts/_shared/plugin-runtime/**`
- Move: `plugins/{lanhu,notify,zentao}` → `.claude/plugins/`
- Modify: `.claude/scripts/_shared/lib/paths.ts`（`pluginsDir` 指向 `.claude/plugins`）
- Modify: 引用 `plugins/plugin-runner|sandbox` 的文件

- [ ] **Step 1: 定位插件运行时 import 形态**

Run: `grep -rn -E 'plugins/(plugin-runner|sandbox)' engine/src; grep -rn "test:plugins\|\"plugins\"" package.json`
Expected: 记录 `plugin-loader.ts` 等对 `./plugins/...` 的引用，以及 `package.json` 的 `test:plugins` 脚本路径。

- [ ] **Step 2: 移动插件执行运行时**

```bash
git mv engine/src/plugins .claude/scripts/_shared/plugin-runtime
```
Expected: `_shared/plugin-runtime/{plugin-runner.ts,sandbox/}` 就位。

- [ ] **Step 3: codemod —— 插件运行时 import 改别名**

```bash
grep -rlZ --include="*.ts" -E 'from "(\.\./)*plugins/(plugin-runner|sandbox)' engine/src engine/tests | xargs -0 perl -pi -e 's{from "(?:\.\./)*plugins/}{from "\@shared/plugin-runtime/}g'
```
Expected: `plugin-loader.ts` 等对运行时的 import 改为 `@shared/plugin-runtime/*`。

- [ ] **Step 4: 重定位插件定义目录**

```bash
mkdir -p .claude/plugins
git mv plugins/lanhu plugins/notify plugins/zentao .claude/plugins/
rmdir plugins 2>/dev/null || true
```
Expected: `.claude/plugins/{lanhu,notify,zentao}` 就位；根 `plugins/` 消失。

- [ ] **Step 5: `pluginsDir` 指向新位置**

在 `.claude/scripts/_shared/lib/paths.ts` 把：

```typescript
export function pluginsDir(): string {
  return resolve(repoRoot(), "plugins");
}
```
改为：
```typescript
export function pluginsDir(): string {
  return resolve(repoRoot(), ".claude/plugins");
}
```

- [ ] **Step 6: 更新 `package.json` 的 `test:plugins` 路径**

把 `"test:plugins": "bun test ./plugins"` 改为 `"test:plugins": "bun test .claude/plugins"`（若 Step 1 显示该脚本指向 `./plugins`）。

- [ ] **Step 7: 全绿回归（含插件测试）**

Run: `bun run type-check && bun test --cwd engine 2>&1 | tail -3 && bun run test:plugins 2>&1 | tail -3`
Expected: type-check exit 0；引擎测试 = 基线；插件测试 PASS。

- [ ] **Step 8: 提交**

```bash
git add -A
git commit -m "refactor: ✨ relocate plugin runtime to _shared and plugin defs to .claude/plugins"
```

---

## Task 6: `kata` 入口落 `_shared/bin`（组合根 shim，命令模块暂留 engine）

**Files:**
- Create: `.claude/scripts/_shared/bin/kata`
- Create: `.claude/scripts/_shared/cli/README.md`（共享命令模块未来落点说明）
- Modify: `package.json`（`bin`、`check:skills` 指向新入口）

> 说明：本计划只立**入口**。~30 个命令模块（features/cases/case-draft/xmind 等）暂留 `engine/src/`，待 Bundle-2/3 各 skill 迁移时再把专属命令移入 skill、共享命令移入 `_shared/cli/`。入口 shim 过渡期反向 import engine 注册中心，是组合根模式可接受的临时反向依赖。

- [ ] **Step 1: 建新入口 shim**

写入 `.claude/scripts/_shared/bin/kata`：

```bash
#!/usr/bin/env bun
// kata CLI 入口（组合根）。过渡期复用 engine 注册中心；
// 命令模块随各 skill 迁移逐步移入 .claude/skills/<name>/scripts/ 与 @shared/cli/。
await import("../../../../engine/src/cli/index.ts");
```

Run: `chmod +x .claude/scripts/_shared/bin/kata`
Expected: 可执行。

- [ ] **Step 2: 建 `_shared/cli/` 落点说明**

写入 `.claude/scripts/_shared/cli/README.md`：

```markdown
# _shared/cli

跨 skill 共享命令模块的落点（features-*·paths-audit·skill-audit·results-*·env·handoff-render 等）。
kata 入口在 `../bin/kata`。命令模块随 Bundle-2/3 迁移逐步移入此处；skill 专属命令移入对应 skill 的 `scripts/`。
```

- [ ] **Step 3: 新入口冒烟**

Run: `bun .claude/scripts/_shared/bin/kata features resolve --help 2>&1 | head -5`
Expected: 打印 `features resolve` 用法（证明新入口可驱动全命令树）。

- [ ] **Step 4: repoint `package.json`**

把 `bin` 改为：
```json
  "bin": { "kata": ".claude/scripts/_shared/bin/kata" },
```
把 `check:skills` 改为：
```json
    "check:skills": "bun .claude/scripts/_shared/bin/kata skills sync-check --exit-code",
```
> 其余 `lint:agents` 等用全局 `kata`（`bun link`）的脚本不变；`engine/bin/kata` 暂留不删（Bundle-4 删 engine 时一并清理）。

- [ ] **Step 5: 全绿回归**

Run: `bun run check:skills 2>&1 | tail -5 && bun test --cwd engine 2>&1 | tail -3`
Expected: check:skills exit 0（仍含 manifest/workflow，Task 7 才薄化）；测试 = 基线。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: 🧩 stand up kata entry under _shared/bin"
```

---

## Task 7: 拆解 contracts + 薄化 `sync-check`（原子保绿）

> contracts 删除会同时让 `checkWorkflows`/`loadSkillManifest` 运行时失效，故「删 contracts」与「薄化 sync-check + 删 loader」必须同一 commit 完成，避免中途 `check:skills` 红。

**Files:**
- Create: `.claude/prompt/_shared/{case-qa.md,output-artifacts.md}`（自旧位移入）
- Create: `.claude/scripts/_shared/lint/skill-structure.ts`（新薄 lint）
- Create: `engine/tests/lint/skill-structure.test.ts`
- Modify: `engine/src/cli/skill-audit.ts`、`engine/src/api.ts`、`.claude/scripts/_shared/lib/paths.ts`
- Delete: `.claude/contracts/`（整目录）、`engine/src/skills/{manifest-loader,workflow-check,workflow-schema}.ts`、过时的 manifest/workflow 测试

- [ ] **Step 1: 共享提示词移入 `prompt/_shared/`**

```bash
mkdir -p .claude/prompt/_shared
git mv .claude/skills/_shared/case-qa.md .claude/prompt/_shared/case-qa.md
git mv .claude/contracts/output-artifacts.md .claude/prompt/_shared/output-artifacts.md
# 旧 case-qa.md 位置留 symlink，使现有 SKILL/prompt 引用继续解析（体现共享 symlink 模式）
ln -s ../../prompt/_shared/case-qa.md .claude/skills/_shared/case-qa.md
```
Expected: 两文件入 `prompt/_shared/`；`.claude/skills/_shared/case-qa.md` 为指向新位的 symlink。

- [ ] **Step 2: 更新 `output-artifacts.md` 路径引用（contracts 即将删除）**

```bash
grep -rlZ --include="*.md" "\.claude/contracts/output-artifacts.md" .claude | xargs -0 perl -pi -e 's{\.claude/contracts/output-artifacts\.md}{.claude/prompt/_shared/output-artifacts.md}g'
```
Expected: case-draft/case-edit 的 SKILL.md、fewshots、`prompt/_shared/case-qa.md` 内引用改为新路径。

- [ ] **Step 3: 删除 workflow / blackboard / manifest 契约**

```bash
git rm -r .claude/contracts/workflows .claude/contracts/blackboard
git rm .claude/contracts/schemas/blackboard-slots.json .claude/contracts/schemas/blackboard-state.json
git rm .claude/contracts/skill-manifest.yaml
rmdir .claude/contracts/schemas .claude/contracts 2>/dev/null || true
```
Expected: `.claude/contracts/` 不再存在（Task 4 已搬走 keep-schemas，此处删尽余项）。

- [ ] **Step 4: 写新薄 lint 模块 `_shared/lint/skill-structure.ts`**

```typescript
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { repoRoot, skillsDir } from "@shared/lib/paths.ts";

export interface StructureViolation {
  rule: string;
  skill: string;
  path?: string;
  message: string;
}
export interface StructureReport {
  passed: boolean;
  violations: StructureViolation[];
}

// Claude frontmatter 字段白名单（§8.3）
const ALLOWED_FRONTMATTER = new Set([
  "name", "description", "when_to_use", "user-invocable", "model", "effort",
  "context", "agent", "paths", "argument-hint", "allowed-tools", "disable-model-invocation",
]);
const SKILL_MD_CAP = 100;

// 从 CLAUDE.md 命令索引表收集 skill id（第 2 列 Skill）
function commandIndexSkills(root: string): Set<string> {
  const ids = new Set<string>();
  const md = join(root, "CLAUDE.md");
  if (!existsSync(md)) return ids;
  for (const line of readFileSync(md, "utf-8").split("\n")) {
    if (!line.trimStart().startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length >= 3 && cells[1].startsWith("/") && /^[a-z][a-z0-9-]*$/.test(cells[2])) {
      ids.add(cells[2]);
    }
  }
  return ids;
}

// 抽取 SKILL.md 正文引用的 phase 文件名（phases/§N-*.md）
function referencedPhaseFiles(body: string): string[] {
  const out = new Set<string>();
  const re = /phases\/(§\d+[^)\s|`"']*\.md)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) out.add(m[1]);
  return [...out];
}

export function lintSkillStructure(root: string = repoRoot()): StructureReport {
  const v: StructureViolation[] = [];
  const skillsRoot = skillsDir("claude");
  if (!existsSync(skillsRoot)) return { passed: true, violations: v };
  const indexed = commandIndexSkills(root);
  const dirs = readdirSync(skillsRoot).filter(
    (f) => !f.startsWith("_") && statSync(join(skillsRoot, f)).isDirectory(),
  );

  for (const skill of dirs) {
    const dir = join(skillsRoot, skill);
    const skillMd = join(dir, "SKILL.md");
    if (!existsSync(skillMd)) {
      v.push({ rule: "SK-NO-SKILLMD", skill, path: skillMd, message: "缺 SKILL.md" });
      continue;
    }
    const raw = readFileSync(skillMd, "utf-8");
    const fm = matter(raw);
    const data = fm.data as Record<string, unknown>;

    // 1 命名一致：目录名 == frontmatter name == CLAUDE.md 命令索引
    if (data.name !== skill) {
      v.push({ rule: "SK-NAME-DIR", skill, path: skillMd, message: `name='${String(data.name)}' != 目录 '${skill}'` });
    }
    if (typeof data.name === "string" && !indexed.has(data.name)) {
      v.push({ rule: "SK-NAME-INDEX", skill, message: `name '${data.name}' 不在 CLAUDE.md 命令索引` });
    }
    // 4 frontmatter 白名单
    for (const key of Object.keys(data)) {
      if (!ALLOWED_FRONTMATTER.has(key)) {
        v.push({ rule: "SK-FM-WHITELIST", skill, path: skillMd, message: `非法 frontmatter 字段 '${key}'` });
      }
    }
    // 5 长度：SKILL.md ≤ 100（其余目录上限随 Bundle-2 内容成形后启用）
    const n = raw.split("\n").length;
    if (n > SKILL_MD_CAP) {
      v.push({ rule: "SK-LEN-SKILL", skill, path: skillMd, message: `SKILL.md ${n} 行 > ${SKILL_MD_CAP}` });
    }
    // 2 phase 完整：SKILL.md 引用的 phase 文件必须存在
    const phasesDir = join(dir, "phases");
    for (const pf of referencedPhaseFiles(fm.content)) {
      if (!existsSync(join(phasesDir, pf))) {
        v.push({ rule: "SK-PHASE-MISSING", skill, message: `引用 phases/${pf} 但文件不存在` });
      }
    }
    // 3 prompts 命名：prompts/*.md 必须为 agent-<step>.md
    const promptsDir = join(dir, "prompts");
    if (existsSync(promptsDir)) {
      for (const f of readdirSync(promptsDir).filter((x) => x.endsWith(".md"))) {
        if (!/^agent-.+\.md$/.test(f)) {
          v.push({ rule: "SK-PROMPT-NAME", skill, path: join(promptsDir, f), message: `prompts/${f} 不符 agent-<step>.md` });
        }
      }
    }
  }
  return { passed: v.length === 0, violations: v };
}

export function formatStructureReport(report: StructureReport, root: string): string {
  if (report.passed) return "skill structure check passed";
  const lines = ["skill structure check failed"];
  for (const x of report.violations) {
    const p = x.path ? ` ${x.path.replace(root, ".")}` : "";
    lines.push(`  ${x.rule} [${x.skill}]${p} — ${x.message}`);
  }
  return lines.join("\n");
}
```

- [ ] **Step 5: 改 `skill-audit.ts` —— 去 manifest/workflow，接 structure 检查**

删除这两行 import：
```typescript
import { loadSkillManifest, validateManifestAgainstWorkflows } from "../skills/manifest-loader.ts";
import { checkWorkflows, formatWorkflowCheckReport } from "../skills/workflow-check.ts";
```
加入：
```typescript
import { formatStructureReport, lintSkillStructure } from "@shared/lint/skill-structure.ts";
```
把 `sync-check` 的整个 `.action(...)` 体替换为：
```typescript
    .action((opts: { exitCode: boolean }) => {
      const root = repoRoot();
      const skillReport = checkRuntimeSkillSync(root);
      const detachReport = checkRuntimeDetach(root);
      const structureReport = lintSkillStructure(root);
      const passed = skillReport.passed && detachReport.passed && structureReport.passed;
      const text = [
        formatRuntimeSkillSyncReport(skillReport, root),
        formatRuntimeDetachReport(detachReport, root),
        formatStructureReport(structureReport, root),
      ]
        .filter((s) => s.length > 0)
        .join("\n");
      if (passed) {
        console.log(text);
      } else {
        process.stderr.write(`${text}\n`);
      }
      if (opts.exitCode && !passed) process.exit(1);
    });
```

- [ ] **Step 6: 删 `api.ts` 的 manifest re-export**

删除 `engine/src/api.ts` 中对 `./skills/manifest-loader.ts` 的 `SkillManifest`、`SkillManifestEntry` 类型 re-export 与 `export { loadSkillManifest } …` 行（约 31–35 行）；若残留空 `export type { } from "./skills/manifest-loader.ts";` 一并删除整句。

- [ ] **Step 7: 删 loader 源文件**

```bash
git rm engine/src/skills/manifest-loader.ts engine/src/skills/workflow-check.ts engine/src/skills/workflow-schema.ts
```

- [ ] **Step 8: 清理可能成死代码的 contract 路径助手**

Run: `grep -rn -E 'contractPath|contractsDir|contractPluginsDir' .claude/scripts/_shared engine/src; echo "exit=$?"`
Expected: 若仅剩 `paths.ts` 内定义、无调用方 → 从 `.claude/scripts/_shared/lib/paths.ts` 删除 `contractPath`、`contractsDir`、`contractPluginsDir` 三个函数（`contractPluginsDir` 的调用方 `plugin-loader.ts` 在 Task 5 已改用 `pluginsDir`，确认无残留调用再删）。仍有调用方则保留并记录。

- [ ] **Step 9: 删过时 manifest/workflow 测试，加 structure 测试**

```bash
git rm -f engine/tests/skills/*manifest* engine/tests/skills/*workflow* 2>/dev/null || true
```
写入 `engine/tests/lint/skill-structure.test.ts`：
```typescript
import { describe, expect, test } from "bun:test";
import { repoRoot } from "@shared/lib/paths.ts";
import { lintSkillStructure } from "@shared/lint/skill-structure.ts";

describe("lintSkillStructure", () => {
  test("real .claude/skills conform to structure rules", () => {
    const r = lintSkillStructure(repoRoot());
    if (!r.passed) console.error(r.violations);
    expect(r.passed).toBe(true);
  });
});
```
> 负向 fixture 测试（命名漂移 / 缺 phase / 非法 frontmatter / 超长）随 Bundle-2 把 `lintSkillStructure` 参数化为可指定 skillsRoot 后补齐。

- [ ] **Step 10: 全绿回归**

Run: `bun run type-check && bun run check:skills 2>&1 | tail -8 && bun test --cwd engine 2>&1 | tail -4`
Expected: type-check exit 0；check:skills exit 0，末段含 `skill structure check passed`，不再出现 manifest/workflow 行；测试全绿（manifest/workflow 测试已删，新增 structure 测试 PASS）。

- [ ] **Step 11: 确认 contracts 与 workflow.yaml 彻底消失**

Run: `test ! -d .claude/contracts && echo "contracts gone"; grep -rn "workflow.yaml\|skill-manifest\|blackboard" .claude engine/src; echo "exit=$?"`
Expected: 打印 `contracts gone`；grep 仅可能命中文档/注释（非代码契约引用），无 `.claude/contracts/**` 实体引用。

- [ ] **Step 12: 提交**

```bash
git add -A
git commit -m "refactor: ✨ dissolve contracts and rewrite sync-check as thin structure lint"
```

---

## Task 8: 重定位仓库级 lint → `.claude/scripts/lint/`

**Files:**
- Move: `scripts/lint/*.ts` → `.claude/scripts/lint/`
- Modify: `package.json`（`lint:debris` 路径）、`.claude/scripts/lint/check-stale-paths.ts`（git grep 排除路径）

- [ ] **Step 1: 移动三个守卫脚本**

```bash
mkdir -p .claude/scripts/lint
git mv scripts/lint/check-debug-files.ts scripts/lint/check-stale-paths.ts scripts/lint/check-runtime-artifacts.ts .claude/scripts/lint/
rmdir scripts/lint scripts 2>/dev/null || true
```
Expected: 三脚本入 `.claude/scripts/lint/`；根 `scripts/` 若已空则消失。

- [ ] **Step 2: 更新 `check-stale-paths.ts` 的自排除路径**

把 `check-stale-paths.ts` 中 git grep 的 `':!scripts/lint/'` 改为 `':!.claude/scripts/lint/'`（避免守卫脚本自身命中）。

- [ ] **Step 3: 更新 `package.json` 的 `lint:debris`**

把：
```json
    "lint:debris": "bun run scripts/lint/check-debug-files.ts && bun run scripts/lint/check-stale-paths.ts && bun run scripts/lint/check-runtime-artifacts.ts",
```
改为：
```json
    "lint:debris": "bun run .claude/scripts/lint/check-debug-files.ts && bun run .claude/scripts/lint/check-stale-paths.ts && bun run .claude/scripts/lint/check-runtime-artifacts.ts",
```

- [ ] **Step 4: 验证守卫仍工作**

Run: `bun run lint:debris; echo "exit=$?"`
Expected: exit 0（三守卫从新位置运行通过）。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "refactor: ✨ relocate repo hygiene lint to .claude/scripts/lint"
```

---

## Task 9: 合并前最终回归 + 合入 main

**Files:** 无改动（验证 + 合并）

- [ ] **Step 1: worktree 内最终全绿**

Run: `bun run type-check && (cd engine && bun run type-check) && bun test --cwd engine 2>&1 | tail -4 && bun run check:skills 2>&1 | tail -4 && bun run lint:debris && bun run check`
Expected: 全部 exit 0；测试 = 基线 PASS 数；check:skills 含 `skill structure check passed`。

- [ ] **Step 2: 记录 worktree HEAD SHA**

Run: `git rev-parse HEAD`
Expected: 记录 SHA（供主工作树 merge）。

- [ ] **Step 3: 回主工作树合并**

```bash
cd "$ROOT"
git merge --no-ff <worktree-sha>
```
Expected: 8 个 commit（Task 2–8）以 no-ff 合入 main。

- [ ] **Step 4: 主工作树最终确认**

Run: `bun install && bun run type-check && (cd engine && bun run type-check) && bun test --cwd engine 2>&1 | tail -4 && bun run check:skills 2>&1 | tail -4`
Expected: 全绿（依赖已合并，alias 生效）。

- [ ] **Step 5: 推送 + 清理 worktree**

```bash
git push origin main
git worktree remove .worktrees/bundle-1-chassis
```
Expected: 推送成功；worktree 移除。

---

## Self-Review（已执行）

**1. Spec 覆盖**（本计划覆盖 spec §9 commit 1–4）：
- commit 1（chassis）→ Task 2（骨架/alias/deps）+ Task 3（lib）+ Task 4（schemas）+ Task 5（plugin-runtime）+ Task 6（cli/bin 入口）。
- commit 2（dissolve contracts）→ Task 7。
- commit 3（relocate plugins + repo lint）→ Task 5（plugins 定义）+ Task 8（repo lint）。
- commit 4（thin lint + build config）→ Task 2（tsconfig/deps）+ Task 7（薄 lint 重写 + 测试）。
- **范围边界**：命令模块物理迁入 skill/`_shared/cli`、其余 4 项薄 lint 长度上限（phase/reference/rule/fewshot/prompt）留 Bundle-2（待内容成形）；负向 lint fixture 测试留 Bundle-2。engine/ 本计划不删（Bundle-4）。

**2. 占位扫描**：无 TBD/TODO。Task 7 Step 8 的「死代码清理」为基于 grep 结果的条件删除（带明确判据），非占位；Task 8 路径依赖 Task 5 Step 1 grep 输出，均为可执行命令。

**3. 类型/命名一致**：`lintSkillStructure` / `formatStructureReport`（Task 7 模块）== skill-audit 调用 == 测试导入；`sharedSchemasPath`（Task 4 加入 paths.ts）== loaders.ts 调用；`pluginsDir`（Task 5 改）== plugin-loader 调用；`@shared/*` 别名跨 Task 2–9 一致。

**4. 验证完整**：每个搬迁 Task 末尾「全绿回归」按验证约定执行 root+engine 双 type-check + 测试 + check:skills；Task 9 merge 前后各跑一次最终确认。

---

## 后续 Plan（待本计划落地后再写）

- **Bundle-2**：迁 case-draft + playwright-automation（references→phases/prompts、专属 scripts+tests 入 skill、专属 lib 出 `_shared`），补长度上限 + 负向 lint fixture，实跑产物等价。
- **Bundle-3**：迁其余 5 skill + 合并 defect-analyze。
- **Bundle-4**：删 engine/、移除 workspace 成员、`_shared/cli` 收口共享命令、同步入口文档至 8 skill。

> Bundle-2 起依赖本计划落地后的真实 `_shared` 布局与 import-graph 分类结果，故按序在各自前置完成后再撰写。
