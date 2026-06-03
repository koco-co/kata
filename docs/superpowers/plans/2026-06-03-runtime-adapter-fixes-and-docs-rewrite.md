# 多 runtime 适配修正 + 文档去花里胡哨重写 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 reasonix/hermes 适配对齐各自 runtime 的官方真实机制（删捏造、修映射、换发现机制），三 runtime 纳入 audit+CI 守护，并把 README 等文档改为如实描述 kata 真实架构。

**Architecture:** kata 的 8 个业务 skill 单一存放于 `.claude/skills/<name>`，通过 `.agents`(codex)/`.reasonix`/`.hermes` 三套目录暴露给其它 runtime。codex 已正确；本计划修 reasonix（删 `.reasonix-plugin/`、改工具映射、改 lint 保留 symlink 校验）、hermes（弃 symlink 改 `external_dirs`、lint 反转）、补 audit/CI、重写 README 与依据/旁支文档。

**Tech Stack:** Bun + TypeScript；biome lint；bun:test；gray-matter 解析 frontmatter；commander CLI。

**Spec:** `docs/superpowers/specs/2026-06-03-runtime-adapter-fixes-and-docs-rewrite-design.md`

---

## 执行前置（worktree）

本计划所有改动在独立 detached worktree 内完成。**绝不复用 `.worktrees/zentao-fetch-enrich`（有并行会话）。**

```bash
ROOT=$(pwd)                       # /Users/poco/Projects/kata
W="$ROOT/.worktrees/runtime-adapter-fix"
git worktree add --detach "$W" main
# 只读证据 symlink（任务读前后端字段名时用；本计划基本不需要 .kata，但按惯例备好）
# 业务源码证据只读，不写
cd "$W"
bun install --frozen-lockfile   # 确保依赖一致
```

验证基线（任何任务开始前先确认绿/已知红）：

```bash
bun test .claude/scripts/_shared/tests/lint   # 三个 *-skill-shape 现状须全 pass
bun run check                                  # biome 0 error
```

---

## 文件结构（改动地图）

| 文件 | 责任 | 动作 |
| --- | --- | --- |
| `.claude/scripts/_shared/lint/reasonix-skill-shape.ts` | reasonix 形状 lint | 改（删 plugin-manifest 校验） |
| `.claude/scripts/_shared/tests/lint/reasonix-skill-shape.test.ts` | 上者单测 | 改 |
| `.reasonix-plugin/plugin.json` | 捏造的 manifest | 删 |
| `.reasonix/skills/using-kata-reasonix/SKILL.md` | reasonix bootstrap | 改 |
| `.reasonix/skills/using-kata-reasonix/references/reasonix-tools.md` | reasonix 工具映射 | 改 |
| `.claude/scripts/_shared/lint/hermes-skill-shape.ts` | hermes 形状 lint | 改（反转 symlink 断言） |
| `.claude/scripts/_shared/tests/lint/hermes-skill-shape.test.ts` | 上者单测 | 改 |
| `.hermes/skills/{8 业务 skill, _shared}` | symlink | 删 |
| `.hermes/skills/using-kata-hermes/SKILL.md` | hermes bootstrap | 改 |
| `.hermes/skills/using-kata-hermes/references/hermes-tools.md` | hermes 工具映射 | 改（末尾补一句） |
| `.agents/skills/using-kata-codex/references/codex-tools.md` | codex 工具映射 | 改（补 multi_agent 注记） |
| `docs/skills/2026-06-02-codex-native-skill-adaptation.md` | codex 依据文档 | 改 |
| `.claude/scripts/_shared/cli/skill-audit.ts` | skills audit CLI | 改（加 reasonix/hermes 分支） |
| `package.json` | 脚本 + ci | 改 |
| `README.md` / `README-EN.md` | 项目门面 | 改（去虚构架构） |
| `docs/skills/2026-06-03-reasonix-native-skill-adaptation.md` | reasonix 依据 | 建 |
| `docs/skills/2026-06-03-hermes-native-skill-adaptation.md` | hermes 依据 | 建 |
| `CONTRIBUTING.md` | 贡献指南 | 改 |
| `.claude/plugins/{lanhu,notify,zentao}/README.md` | 插件文档 | 改（路径） |

---

## Task 1: Reasonix lint 去掉 plugin-manifest 校验

reasonix 无 JSON manifest（plugins 是 `reasonix.toml [[plugins]]`），删 `checkPluginManifest`，保留 symlink 树校验。

**Files:**
- Modify: `.claude/scripts/_shared/tests/lint/reasonix-skill-shape.test.ts`
- Modify: `.claude/scripts/_shared/lint/reasonix-skill-shape.ts`

- [ ] **Step 1: 改测试表达新行为（先红）**

在 `reasonix-skill-shape.test.ts`：
1. 删除 `pluginJson()` 函数（整段）。
2. `buildCompliant()` 内删除这一行：
   ```ts
   write(join(root, ".reasonix-plugin/plugin.json"), pluginJson());
   ```
3. 删除三个测试块：`"missing plugin manifest is flagged"`、`"invalid plugin JSON is flagged"`、`"defaultPrompt as a string (not array) is rejected"`。
4. 新增一个回归测试，锁定「无 `.reasonix-plugin/` 也通过」：

```ts
  test("tree without .reasonix-plugin still passes (reasonix has no JSON manifest)", () => {
    const report = lintReasonixSkillTree(root);
    expect(report.passed).toBe(true);
    expect(rules(root)).not.toContain("REASONIX_PLUGIN_MANIFEST_MISSING" as ReasonixSkillRule);
  });
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test .claude/scripts/_shared/tests/lint/reasonix-skill-shape.test.ts`
Expected: FAIL — 当前 lint 仍要求 `.reasonix-plugin/plugin.json`，新「canonical passes」/回归用例会报 `REASONIX_PLUGIN_MANIFEST_MISSING`。

- [ ] **Step 3: 改 lint 去掉 plugin-manifest 校验**

在 `reasonix-skill-shape.ts`：

1. JSDoc 末句改为（删去 plugin manifest 提法）：
   ```ts
    * that canonical shape: symlinks resolve correctly, bootstrap SKILL.md exists
    * with correct frontmatter, and the reasonix tool mapping is present.
   ```
2. 从 `ReasonixSkillRule` 联合类型删除两行：
   ```ts
     | "REASONIX_PLUGIN_MANIFEST_MISSING"
     | "REASONIX_PLUGIN_MANIFEST_INVALID";
   ```
   （让 `"REASONIX_MAPPING_MISSING"` 成为联合的最后一项，结尾改为 `;`）
3. 整段删除 `function checkPluginManifest(...) { ... }`。
4. 在 `lintReasonixSkillTree` 中删除这一行调用：
   ```ts
     checkPluginManifest(root, violations);
   ```
5. 若 `readFileSync` 仅被 `checkPluginManifest` 用——核对：`checkBootstrap` 仍用 `readFileSync`（解析 frontmatter），故保留 import 不动。

- [ ] **Step 4: 跑测试确认通过**

Run: `bun test .claude/scripts/_shared/tests/lint/reasonix-skill-shape.test.ts`
Expected: PASS（全部用例）。

- [ ] **Step 5: 类型与 lint 自检**

Run: `bun run check && bun run type-check 2>&1 | tail -5`
Expected: biome 0 error；type-check 与基线比对无新增错误（reasonix-skill-shape.ts 不得出现未用变量/悬挂引用）。

- [ ] **Step 6: 提交**

```bash
git add .claude/scripts/_shared/lint/reasonix-skill-shape.ts \
        .claude/scripts/_shared/tests/lint/reasonix-skill-shape.test.ts
git commit -m "fix: 🩹 drop fabricated plugin.json check from reasonix lint

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Reasonix 内容修正（删捏造 manifest + 改工具映射）

删 `.reasonix-plugin/`，重写 bootstrap SKILL.md 与工具映射（reasonix 原生支持 subagent `runAs: subagent` 与 `todo_write`/`ask`）。

**Files:**
- Delete: `.reasonix-plugin/plugin.json`（及空目录）
- Modify: `.reasonix/skills/using-kata-reasonix/references/reasonix-tools.md`
- Modify: `.reasonix/skills/using-kata-reasonix/SKILL.md`

- [ ] **Step 1: 删除捏造的 plugin manifest**

```bash
git rm .reasonix-plugin/plugin.json
rmdir .reasonix-plugin 2>/dev/null || true
```

- [ ] **Step 2: 重写 `references/reasonix-tools.md`（完整覆盖）**

写入以下完整内容：

````markdown
# Reasonix (DeepSeek Agent) Tool Mapping

kata 的 skill 正文使用 Claude Code 工具名（这些 skill 在 `.claude/skills/` 与 `.reasonix/skills/` 之间共用同一份文件）。在 reasonix 里遇到这些工具名时，换成你的平台等价工具。reasonix（`esengine/DeepSeek-Reasonix`）原生支持子代理与任务跟踪，无需降级。

| skill 正文写的 | reasonix 等价 |
| --- | --- |
| `Task`（派子代理） | `task` 内置工具派子代理；或把子任务做成 `runAs: subagent` 的 skill（可配 `subagent_model`） |
| 并行多个 `Task` | 多个 `task`，原生并行，不降级 |
| Task 返回结果 | `task` 自动返回 |
| `TodoWrite`（任务跟踪） | `todo_write` 内置工具 |
| `AskUserQuestion`（结构化提问） | `ask` 内置工具（提问并明确列出候选项与推荐项） |
| `Skill`（调用 skill） | skill 原生加载，直接照其指令执行 |
| `Read` / `Write` / `Edit`（文件） | 原生文件工具 |
| `Bash`（执行命令） | 原生 shell 工具 |
| `Grep` / `Glob`（搜索） | 原生搜索工具 |
| `kata <command>`（CLI） | 原样在 shell 里执行（`npx kata` / `bunx kata`） |

## 子代理（原生支持，不降级）

reasonix 原生支持子代理：内置 `task` 工具可派子代理，skill 也可声明 `runAs: subagent`（子代理 skill 默认继承执行器模型，可用 `subagent_model` 覆盖）。因此 skill 正文里的多代理工作流（如 `case-draft` 的 worker/spec-reviewer/quality-reviewer 三阶段、`playwright-automation` 的多阶段 worker）直接映射为 `task`/`runAs: subagent`，**保持结构与并行能力，不降级为主会话顺序执行**。任务跟踪用内置 `todo_write`。

## 技能发现

reasonix 按目录扫描发现 skill：扫描各根目录与 home 下的 convention dirs（`.reasonix` / `.agents` / `.agent` / `.claude`）的 `skills/` 子目录，每个 skill 是含 `SKILL.md` 的目录（或扁平 `<name>.md`）。仅 `name` + `description`（frontmatter）进入索引；正文按需加载。**支持整目录 symlink**（`.reasonix/skills/<name>` 指向 `.claude/skills/<name>` 即被正常发现）。

## frontmatter 字段

各 skill SKILL.md 的 `argument-hint`、`model`、`effort`、`allowed-tools` 是 Claude Code 专属字段。reasonix 只用 `name` + `description` 做发现，未知字段忽略。
````

- [ ] **Step 3: 重写 `using-kata-reasonix/SKILL.md`（完整覆盖）**

写入以下完整内容（frontmatter 仅 name+description，避免触发 skill-prompt 约束 lint）：

````markdown
---
name: using-kata-reasonix
description: Load at the start of any kata session running under reasonix (esengine/DeepSeek-Reasonix). The kata skills under .reasonix/skills/ are symlinks to .claude/skills/ and keep Claude Code tool names in their bodies; this skill maps those tool names to reasonix equivalents and applies the kata routing table so inputs reach the right skill.
---

# Using kata skills under reasonix

kata 的 8 个业务 skill（case-draft、case-edit、case-hotfix、defect-analyze、infra-diagnose、knowledge-curate、playwright-automation、workspace-manage）位于 `.reasonix/skills/<name>`，是指向 `.claude/skills/<name>` 的**整目录 symlink**（reasonix 官方按目录扫描发现，ConventionDirs 含 `.reasonix`，支持 symlink）。它们与 Claude Code 共用同一份正文，正文里写的是 Claude Code 的工具名。在 reasonix 里使用时，按下面规则消化差异即可——无需修改任何 skill 文件。

## 1. 工具名翻译

skill 正文出现 Claude Code 工具名时，换成你的 reasonix 等价工具。完整对照见 [`references/reasonix-tools.md`](references/reasonix-tools.md)，要点：

- `Task`（派子代理）/ 并行多个 `Task` → `task` 内置工具，或 `runAs: subagent` 的 skill；reasonix **原生支持子代理，不降级**。
- `TodoWrite` → `todo_write` 内置工具。
- `AskUserQuestion` → `ask` 内置工具（列候选项 + 推荐项）。
- `Read` / `Write` / `Edit` → 原生文件工具；`Bash` → 原生 shell；`Skill` → 原生加载，直接照做。

## 2. frontmatter 兼容

各 skill 的 SKILL.md frontmatter 含 Claude Code 专属字段（`argument-hint`、`model`、`effort`、`allowed-tools`）。reasonix 只读 `name` + `description` 做发现，其余未知字段忽略即可；`allowed-tools` 不作为硬性工具限制，按任务实际需要使用工具。

## 3. 路由表

仅凭单条输入即可静默分发到对应 skill（与 `.claude/CLAUDE.md` 路由规则一致）：

| 输入 | 走 skill |
| --- | --- |
| Lanhu/Axure URL（lanhuapp.com，含 axure/产品设计） | `case-draft` |
| ZenTao bug URL / bug-view-NNN / bug ID | `case-hotfix`（未修复或缺修复范围时由它生成待办，不回退 `defect-analyze`） |
| 需求功能**目录**路径/目录名（`features/【v...】`，无文件扩展名） | `playwright-automation` |
| 用例产物**文件**（`.xmind`/`.csv`/`archive.md`），或编辑/同步/标准化已有用例 | `case-edit` |
| 异常堆栈/控制台报错/HTTP 失败、合并冲突文本、diff/分支对 | `defect-analyze` |
| 数据源/数据库/服务器连通性报错（如 JDBC No route to host） | `infra-diagnose` |
| 记录/查询/维护业务知识、规则、术语，或问「XX 是什么」 | `knowledge-curate` |
| kata 能力/功能菜单/命令帮助，或创建/初始化/自检/收尾/修复工作区 | `workspace-manage` |

匹配优先级：精确格式/URL/路径匹配 > 意图关键词匹配 > 通用请求。description 里的「改走/不在此」声明优先于触发关键词。无 skill 匹配的请求自行处理，不强套路由。
````

- [ ] **Step 4: 用修正后的 lint 校验真实仓库形状**

Run: `bun run kata skills audit --runtime reasonix` （若 Task 6 未做，临时直接调函数：）
```bash
bun -e "import {lintReasonixSkillTree,formatReasonixSkillReport} from './.claude/scripts/_shared/lint/reasonix-skill-shape.ts'; const r=lintReasonixSkillTree(process.cwd()); console.log(formatReasonixSkillReport(r,process.cwd())); process.exit(r.passed?0:1)"
```
Expected: `reasonix skill shape passed`（无 `.reasonix-plugin/` 也通过；symlink 树仍完整）。

- [ ] **Step 5: 全量 lint 测试 + biome**

Run: `bun test .claude/scripts/_shared/tests/lint && bun run check`
Expected: PASS / 0 error。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "refactor: ✨ align reasonix adapter with real runtime (drop manifest, fix tools)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Hermes lint 反转（禁 symlink + 要求 external_dirs 文档）

Hermes 会把 skills 目录下的整目录 symlink 从发现里漏掉（#8293），故 lint 反转：`.hermes/skills/` 不得有 symlink；bootstrap 必须文档化 external_dirs。

**Files:**
- Modify: `.claude/scripts/_shared/tests/lint/hermes-skill-shape.test.ts`
- Modify: `.claude/scripts/_shared/lint/hermes-skill-shape.ts`

- [ ] **Step 1: 整体改写测试（先红）**

用以下完整内容覆盖 `hermes-skill-shape.test.ts`：

```ts
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type HermesSkillRule, lintHermesSkillTree } from "@shared/lint/hermes-skill-shape.ts";

function write(p: string, body: string): void {
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, body);
}

// bootstrap 正文须含 external_dirs（新规则要求文档化发现机制）
function bootstrapMd(): string {
  return `---\nname: using-kata-hermes\ndescription: demo hermes bootstrap for shape lint.\n---\n\nbody — discovery via external_dirs in ~/.hermes/config.yaml\n`;
}

// 构建一棵合规树（无 symlink，仅真实 bootstrap + 工具映射）并返回 root
function buildCompliant(): string {
  const root = mkdtempSync(join(tmpdir(), "hermes-shape-"));
  mkdirSync(join(root, ".hermes/skills"), { recursive: true });
  write(join(root, ".hermes/skills/using-kata-hermes/SKILL.md"), bootstrapMd());
  write(
    join(root, ".hermes/skills/using-kata-hermes/references/hermes-tools.md"),
    "# Hermes Tool Mapping\nTask -> delegate_task\n",
  );
  return root;
}

function rules(root: string): HermesSkillRule[] {
  return lintHermesSkillTree(root).violations.map((v) => v.rule);
}

describe("lintHermesSkillTree (hermes shape)", () => {
  let root = "";
  beforeEach(() => {
    root = buildCompliant();
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("canonical non-symlink tree passes", () => {
    const report = lintHermesSkillTree(root);
    expect(report.passed).toBe(true);
    expect(report.violations).toEqual([]);
  });

  test("a stray skill symlink under .hermes/skills is flagged (#8293)", () => {
    mkdirSync(join(root, ".claude/skills/case-draft"), { recursive: true });
    symlinkSync("../../.claude/skills/case-draft", join(root, ".hermes/skills/case-draft"));
    expect(rules(root)).toContain("HERMES_STRAY_SYMLINK");
  });

  test("missing bootstrap SKILL.md is flagged", () => {
    rmSync(join(root, ".hermes/skills/using-kata-hermes/SKILL.md"));
    expect(rules(root)).toContain("HERMES_BOOTSTRAP_MISSING");
  });

  test("bootstrap with wrong frontmatter name is flagged", () => {
    write(
      join(root, ".hermes/skills/using-kata-hermes/SKILL.md"),
      "---\nname: wrong-name\ndescription: x external_dirs\n---\nbody\n",
    );
    expect(rules(root)).toContain("HERMES_BOOTSTRAP_FRONTMATTER");
  });

  test("bootstrap not documenting external_dirs is flagged", () => {
    write(
      join(root, ".hermes/skills/using-kata-hermes/SKILL.md"),
      "---\nname: using-kata-hermes\ndescription: demo.\n---\n\nbody without the mechanism\n",
    );
    expect(rules(root)).toContain("HERMES_EXTERNAL_DIRS_UNDOCUMENTED");
  });

  test("missing tool mapping is flagged", () => {
    rmSync(join(root, ".hermes/skills/using-kata-hermes/references/hermes-tools.md"));
    expect(rules(root)).toContain("HERMES_MAPPING_MISSING");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test .claude/scripts/_shared/tests/lint/hermes-skill-shape.test.ts`
Expected: FAIL — 旧 lint 没有 `HERMES_STRAY_SYMLINK`/`HERMES_EXTERNAL_DIRS_UNDOCUMENTED` 规则，且旧 `buildCompliant`（无业务 symlink）会触发旧的 `HERMES_SYMLINK_MISSING`，新断言不满足。

- [ ] **Step 3: 整体改写 lint**

用以下完整内容覆盖 `hermes-skill-shape.ts`：

```ts
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import matter from "gray-matter";

/**
 * Hermes Agent skill-tree lint.
 *
 * The kata business skills live once under `.claude/skills/<name>`. Hermes
 * discovers them via `external_dirs` in `~/.hermes/config.yaml` pointing at the
 * real `.claude/skills/` directory — NOT via symlinks: whole-directory symlinks
 * under the skills dir are omitted from Hermes discovery (upstream bug
 * NousResearch/hermes-agent#8293). This lint asserts the opposite of the
 * codex/reasonix trees: `.hermes/skills/` must hold only the real
 * `using-kata-hermes` bootstrap (with its tool mapping) and NO skill symlinks,
 * and the bootstrap must document the external_dirs discovery mechanism.
 */
export type HermesSkillRule =
  | "HERMES_STRAY_SYMLINK"
  | "HERMES_BOOTSTRAP_MISSING"
  | "HERMES_BOOTSTRAP_FRONTMATTER"
  | "HERMES_MAPPING_MISSING"
  | "HERMES_EXTERNAL_DIRS_UNDOCUMENTED";

export interface HermesSkillViolation {
  rule: HermesSkillRule;
  path: string;
  message: string;
}

export interface HermesSkillReport {
  passed: boolean;
  violations: HermesSkillViolation[];
}

const BOOTSTRAP = "using-kata-hermes";

function lstatSafe(p: string): ReturnType<typeof lstatSync> | null {
  try {
    return lstatSync(p);
  } catch {
    return null;
  }
}

// `.hermes/skills/` 下不得出现任何 symlink（symlink 目录会被 Hermes 发现机制漏掉，见 #8293）
function checkNoStraySymlinks(agentSkills: string, violations: HermesSkillViolation[]): void {
  if (!existsSync(agentSkills)) return;
  for (const entry of readdirSync(agentSkills)) {
    const p = join(agentSkills, entry);
    const st = lstatSafe(p);
    if (st?.isSymbolicLink()) {
      violations.push({
        rule: "HERMES_STRAY_SYMLINK",
        path: p,
        message: `.hermes/skills/${entry} must not be a symlink; Hermes omits symlinked skill dirs from discovery (#8293). Use external_dirs pointing at .claude/skills instead.`,
      });
    }
  }
}

function checkBootstrap(agentSkills: string, violations: HermesSkillViolation[]): void {
  const skillMd = join(agentSkills, BOOTSTRAP, "SKILL.md");
  if (!existsSync(skillMd)) {
    violations.push({
      rule: "HERMES_BOOTSTRAP_MISSING",
      path: skillMd,
      message: `${BOOTSTRAP}/SKILL.md is required (tool mapping + routing bootstrap)`,
    });
  } else {
    const raw = readFileSync(skillMd, "utf8");
    let data: Record<string, unknown> = {};
    try {
      data = matter(raw).data;
    } catch {
      data = {};
    }
    if (data.name !== BOOTSTRAP || typeof data.description !== "string" || !data.description.trim()) {
      violations.push({
        rule: "HERMES_BOOTSTRAP_FRONTMATTER",
        path: skillMd,
        message: `${BOOTSTRAP}/SKILL.md frontmatter must set name: ${BOOTSTRAP} and a non-empty description`,
      });
    }
    if (!raw.includes("external_dirs")) {
      violations.push({
        rule: "HERMES_EXTERNAL_DIRS_UNDOCUMENTED",
        path: skillMd,
        message: `${BOOTSTRAP}/SKILL.md must document the external_dirs discovery mechanism (symlinks don't work on Hermes; see #8293)`,
      });
    }
  }

  const mapping = join(agentSkills, BOOTSTRAP, "references", "hermes-tools.md");
  if (!existsSync(mapping) || statSync(mapping).size === 0) {
    violations.push({
      rule: "HERMES_MAPPING_MISSING",
      path: mapping,
      message: `${BOOTSTRAP}/references/hermes-tools.md is required and must be non-empty`,
    });
  }
}

export function lintHermesSkillTree(root: string): HermesSkillReport {
  const violations: HermesSkillViolation[] = [];
  const agentSkills = join(root, ".hermes", "skills");

  checkNoStraySymlinks(agentSkills, violations);
  checkBootstrap(agentSkills, violations);

  return { passed: violations.length === 0, violations };
}

export function formatHermesSkillReport(report: HermesSkillReport, root: string): string {
  if (report.passed) return "hermes skill shape passed";
  const absoluteRoot = resolve(root);
  return [
    "hermes skill shape failed",
    ...report.violations.map((v) => {
      const p =
        v.path === absoluteRoot || v.path.startsWith(`${absoluteRoot}/`)
          ? relative(absoluteRoot, v.path)
          : v.path;
      return `${v.rule} ${p} — ${v.message}`;
    }),
  ].join("\n");
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `bun test .claude/scripts/_shared/tests/lint/hermes-skill-shape.test.ts`
Expected: PASS（全部用例）。

- [ ] **Step 5: 类型 + biome 自检**

Run: `bun run check && bun run type-check 2>&1 | tail -5`
Expected: 0 error；type-check 无新增（注意：旧 import `cpSync`/`realpathSync` 已不在新文件，确认无未用 import）。

- [ ] **Step 6: 提交**

```bash
git add .claude/scripts/_shared/lint/hermes-skill-shape.ts \
        .claude/scripts/_shared/tests/lint/hermes-skill-shape.test.ts
git commit -m "fix: 🩹 invert hermes lint to forbid symlinks per upstream #8293

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Hermes 内容修正（删 symlink + external_dirs SKILL.md）

**Files:**
- Delete: `.hermes/skills/{case-draft,case-edit,case-hotfix,defect-analyze,infra-diagnose,knowledge-curate,playwright-automation,workspace-manage,_shared}`（均为 symlink）
- Modify: `.hermes/skills/using-kata-hermes/SKILL.md`
- Modify: `.hermes/skills/using-kata-hermes/references/hermes-tools.md`

- [ ] **Step 1: 删除全部业务 skill symlink 与 _shared symlink**

```bash
for s in case-draft case-edit case-hotfix defect-analyze infra-diagnose \
         knowledge-curate playwright-automation workspace-manage _shared; do
  git rm ".hermes/skills/$s" 2>/dev/null || rm -f ".hermes/skills/$s"
done
ls -la .hermes/skills/   # 应只剩 using-kata-hermes（真实目录）
```

- [ ] **Step 2: 重写 `using-kata-hermes/SKILL.md`（完整覆盖）**

写入以下完整内容：

````markdown
---
name: using-kata-hermes
description: Load at the start of any kata session running under Hermes Agent (NousResearch/hermes-agent). kata business skills live in .claude/skills/ and are discovered by Hermes via external_dirs (NOT symlinks — symlinked skill dirs are omitted from Hermes discovery, upstream #8293). This skill maps Claude Code tool names to Hermes equivalents and applies the kata routing table so inputs reach the right skill.
---

# Using kata skills under Hermes Agent

kata 的 8 个业务 skill（case-draft、case-edit、case-hotfix、defect-analyze、infra-diagnose、knowledge-curate、playwright-automation、workspace-manage）单一存放于 `.claude/skills/<name>`。它们与 Claude Code 共用同一份正文，正文里写的是 Claude Code 的工具名。在 Hermes Agent 里使用时，按下面规则消化差异即可——无需修改任何 skill 文件。

## 1. 发现机制（external_dirs，不用 symlink）

Hermes 的官方 skill 源是 `~/.hermes/skills/`，并可在 `~/.hermes/config.yaml` 的 `skills.external_dirs` 增加额外目录。**不要**用 symlink 把业务 skill 挂进 `.hermes/skills/`：Hermes 当前会把 skills 目录下的整目录 symlink 从 `skills_list`/`skill_view` 漏掉（上游 open bug NousResearch/hermes-agent#8293）。

正确做法是让 Hermes 直接扫真实目录。在 `~/.hermes/config.yaml`：

```yaml
skills:
  external_dirs:
    - ${KATA_REPO}/.claude/skills   # 8 个业务 skill（_shared 因下划线前缀被自动忽略）
    - ${KATA_REPO}/.hermes/skills   # 取本 bootstrap（using-kata-hermes）
```

把 `${KATA_REPO}` 换成 kata 仓库绝对路径（也可写死；`external_dirs` 支持 `~` 与 `${VAR}`）。`.hermes/skills/` 下只保留本 bootstrap 真实目录，无业务 skill symlink。

## 2. 工具名翻译

skill 正文出现 Claude Code 工具名时，换成你的 Hermes 等价工具。完整对照见 [`references/hermes-tools.md`](references/hermes-tools.md)，要点：

- `Task`（派子代理）/ 并行多个 `Task` → `delegate_task`（原生子代理，不降级）。
- `TodoWrite` → `todo`。
- `AskUserQuestion` → 无结构化提问工具；直接在对话里提问并列候选项 + 推荐项。
- `Read` → `read_file`；`Write` → `write_file`；`Edit` → `patch`。
- `Bash` → `terminal`；`Grep` / `Glob` → `search_files`；`Skill` → `skill_view`。

## 3. frontmatter 兼容

各 skill 的 SKILL.md frontmatter 含 Claude Code 专属字段（`argument-hint`、`model`、`effort`、`allowed-tools`）。Hermes Agent 只读 `name` + `description` 做发现，其余未知字段忽略即可；`allowed-tools` 不作为硬性工具限制，按任务实际需要使用工具。

## 4. 路由表

仅凭单条输入即可静默分发到对应 skill（与 `.claude/CLAUDE.md` 路由规则一致）：

| 输入 | 走 skill |
| --- | --- |
| Lanhu/Axure URL（lanhuapp.com，含 axure/产品设计） | `case-draft` |
| ZenTao bug URL / bug-view-NNN / bug ID | `case-hotfix`（未修复或缺修复范围时由它生成待办，不回退 `defect-analyze`） |
| 需求功能**目录**路径/目录名（`features/【v...】`，无文件扩展名） | `playwright-automation` |
| 用例产物**文件**（`.xmind`/`.csv`/`archive.md`），或编辑/同步/标准化已有用例 | `case-edit` |
| 异常堆栈/控制台报错/HTTP 失败、合并冲突文本、diff/分支对 | `defect-analyze` |
| 数据源/数据库/服务器连通性报错（如 JDBC No route to host） | `infra-diagnose` |
| 记录/查询/维护业务知识、规则、术语，或问「XX 是什么」 | `knowledge-curate` |
| kata 能力/功能菜单/命令帮助，或创建/初始化/自检/收尾/修复工作区 | `workspace-manage` |

匹配优先级：精确格式/URL/路径匹配 > 意图关键词匹配 > 通用请求。description 里的「改走/不在此」声明优先于触发关键词。无 skill 匹配的请求自行处理，不强套路由。
````

- [ ] **Step 3: 给 `references/hermes-tools.md` 末尾补一句**

在现有 `hermes-tools.md` 文件**末尾追加**（工具表本身不动，已全部正确）：

```markdown

## 技能发现

业务 skill 不在 `.hermes/skills/` 下 symlink，而由 Hermes `external_dirs` 直接扫 `.claude/skills/` 真实目录发现，配置见本 bootstrap 的 SKILL.md「## 1. 发现机制」节（symlink 因上游 #8293 不可用）。
```

- [ ] **Step 4: 用新 lint 校验真实仓库**

```bash
bun -e "import {lintHermesSkillTree,formatHermesSkillReport} from './.claude/scripts/_shared/lint/hermes-skill-shape.ts'; const r=lintHermesSkillTree(process.cwd()); console.log(formatHermesSkillReport(r,process.cwd())); process.exit(r.passed?0:1)"
```
Expected: `hermes skill shape passed`（`.hermes/skills/` 仅余真实 bootstrap，无 symlink，SKILL.md 含 external_dirs）。

- [ ] **Step 5: 全量 lint 测试 + biome + check:skills**

Run: `bun test .claude/scripts/_shared/tests/lint && bun run check && bun run check:skills`
Expected: PASS / 0 error。`check:skills` 不校验 `.hermes`（它只看 `.claude` ↔ `.agents`），不受影响。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "refactor: ✨ switch hermes adapter from symlinks to external_dirs

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Codex 文档微调（multi_agent 默认开启注记）

**Files:**
- Modify: `.agents/skills/using-kata-codex/references/codex-tools.md`
- Modify: `docs/skills/2026-06-02-codex-native-skill-adaptation.md`

- [ ] **Step 1: codex-tools.md 补 multi_agent 现状注记**

在 `codex-tools.md` 的「## 子代理需要 multi-agent 支持」节，把现有这段：

```markdown
启用后才有 `spawn_agent`、`wait_agent`、`close_agent`，供 `playwright-automation`、`case-draft` 等用到「派 worker / spec review / quality review」的 skill 使用。
```

改为：

```markdown
> 注：在当前 stable Codex 上，`multi_agent` 已是「stable; on by default」（见官方 config-reference），`spawn_agent`/`wait_agent`/`close_agent` 默认可用，此 flag 非强制；旧版仍需显式开启，故保留上面的配置说明。

启用后才有 `spawn_agent`、`wait_agent`、`close_agent`，供 `playwright-automation`、`case-draft` 等用到「派 worker / spec review / quality review」的 skill 使用。
```

- [ ] **Step 2: 适配文档补一句**

在 `docs/skills/2026-06-02-codex-native-skill-adaptation.md` 的「## Codex 侧使用」节末尾追加一句：

```markdown

> 时效注记（2026-06-03 核实）：Codex `[features].multi_agent` 现为「stable; on by default」，当前 stable 版无需显式开启该 flag；保留开启说明以兼容旧版 Codex。
```

- [ ] **Step 3: 验证 codex lint 仍绿（未触动结构）**

Run: `bun run lint:skills:codex`
Expected: codex skill shape passed（仅改文档，不影响结构校验）。

- [ ] **Step 4: 提交**

```bash
git add .agents/skills/using-kata-codex/references/codex-tools.md \
        docs/skills/2026-06-02-codex-native-skill-adaptation.md
git commit -m "docs: 📝 note codex multi_agent is now on by default

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: audit CLI + CI 接线（reasonix/hermes 与 codex 对齐）

**Files:**
- Modify: `.claude/scripts/_shared/cli/skill-audit.ts`
- Modify: `package.json`

- [ ] **Step 1: skill-audit.ts 加 import**

在文件顶部 import 区，紧跟现有 codex-skill-shape import 之后加入：

```ts
import {
  type HermesSkillReport,
  formatHermesSkillReport,
  lintHermesSkillTree,
} from "@shared/lint/hermes-skill-shape.ts";
import {
  type ReasonixSkillReport,
  formatReasonixSkillReport,
  lintReasonixSkillTree,
} from "@shared/lint/reasonix-skill-shape.ts";
```

- [ ] **Step 2: 更新 `--runtime` 选项文案**

把：

```ts
    .option("--runtime <runtime>", "审查目标运行时：claude | codex", "claude")
```

改为：

```ts
    .option("--runtime <runtime>", "审查目标运行时：claude | codex | reasonix | hermes", "claude")
```

- [ ] **Step 3: 在 codex 分支后加 reasonix/hermes 分支**

在现有 `if (opts.runtime === "codex") { ... return; }` 块**之后**插入：

```ts
      // reasonix 运行时：校验 .reasonix/skills symlink 树 + bootstrap（无 JSON manifest）
      if (opts.runtime === "reasonix") {
        const report: ReasonixSkillReport = lintReasonixSkillTree(root);
        const text = formatReasonixSkillReport(report, root);
        if (report.passed) console.log(text);
        else process.stderr.write(`${text}\n`);
        console.log(`\n[skills audit:reasonix] total violations=${report.violations.length}`);
        if (opts.exitCode && !report.passed) process.exit(1);
        return;
      }

      // hermes 运行时：校验 .hermes/skills 无 symlink + bootstrap 文档化 external_dirs
      if (opts.runtime === "hermes") {
        const report: HermesSkillReport = lintHermesSkillTree(root);
        const text = formatHermesSkillReport(report, root);
        if (report.passed) console.log(text);
        else process.stderr.write(`${text}\n`);
        console.log(`\n[skills audit:hermes] total violations=${report.violations.length}`);
        if (opts.exitCode && !report.passed) process.exit(1);
        return;
      }
```

- [ ] **Step 4: 对真实仓库跑两个新 runtime（集成冒烟）**

Run:
```bash
bun run kata skills audit --runtime reasonix --exit-code
bun run kata skills audit --runtime hermes --exit-code
```
Expected: 两条均输出 `... skill shape passed` 且退出码 0（依赖 Task 2/4 已落地）。

- [ ] **Step 5: package.json 加脚本 + 接 ci**

1. 在 `"lint:skills:codex": ...` 行后加两行：

```json
    "lint:skills:reasonix": "kata skills audit --runtime reasonix --exit-code",
    "lint:skills:hermes": "kata skills audit --runtime hermes --exit-code",
```

2. `"ci"` 脚本里，把 `&& bun run lint:skills:codex` 改为：

```text
&& bun run lint:skills:codex && bun run lint:skills:reasonix && bun run lint:skills:hermes
```

- [ ] **Step 6: 跑脚本验证接线**

Run: `bun run lint:skills:reasonix && bun run lint:skills:hermes`
Expected: 两条均 pass、退出码 0。

- [ ] **Step 7: type-check + biome**

Run: `bun run check && bun run type-check 2>&1 | tail -5`
Expected: 0 error；type-check 无新增（确认新 import 的类型 `ReasonixSkillReport`/`HermesSkillReport` 解析正常）。

- [ ] **Step 8: 提交**

```bash
git add .claude/scripts/_shared/cli/skill-audit.ts package.json
git commit -m "feat: 🧩 wire reasonix and hermes skill audits into CLI and CI

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: README 双语去花里冗余重写

去掉 README 中虚构的 Graph / Workflow 子系统 / Blackboard / `contracts/**` 叙事，修正陈旧目录树，新增「多 runtime 支持」小节。以下 old/new 为精确替换串。

**Files:**
- Modify: `README.md`
- Modify: `README-EN.md`

- [ ] **Step 1: README.md — tagline（E1）**

old:
```text
### SKILL + Router + Graph + Workflow + Blackboard 驱动的 QA Runtime
```
new:
```text
### 基于 Claude Code Skills 的可审计 QA 工作流
```

- [ ] **Step 2: README.md — 架构段 intro（E2）**

old:
```text
Kata 的当前 runtime 架构以 `.claude/**` 为一等实现，以 runtime 内部 contracts 承接 schema、route、skill graph、workflow 与 blackboard，以 `.claude/scripts/_shared/**` 为执行与校验层，以 `workspace/{project}` 为业务产物区：
```
new:
```text
Kata 的 runtime 以 `.claude/**` 为一等实现：8 个业务 skill 为单一来源，prompt 级路由表（见 `CLAUDE.md`）把输入分发到对应 skill，`.claude/scripts/_shared/**`（lib / schemas / lint / cli）为执行与校验层，`.claude/plugins/` 提供 lanhu/zentao/notify 集成，`workspace/{project}` 存业务产物：
```

- [ ] **Step 3: README.md — 目录树（E3）**

old:
```text
kata/
├── .claude/         # Claude Code runtime skills
├── docs/            # 架构、ADR、审计、技能和排查文档
├── .claude/scripts/_shared/  # CLI、runtime 校验、工作流支撑代码和测试
├── plugins/         # lanhu / zentao / notify
├── templates/       # 项目骨架与输出模板
└── workspace/       # 用户项目产物；源码副本位于 workspace/{project}/.kata/repos/
```
new:
```text
kata/
├── .claude/                       # Claude Code runtime
│   ├── skills/                    # 8 个业务 skill（单一来源）
│   ├── scripts/_shared/           # CLI、lib、schemas、lint、测试
│   ├── plugins/                   # lanhu / zentao / notify
│   ├── rules/                     # 项目工作流规则
│   └── hooks/                     # 写入/命令守卫
├── .agents/  .reasonix/  .hermes/ # 多 runtime 适配（codex / reasonix / hermes）
├── docs/                          # 架构、审计、技能与排查文档
└── workspace/                     # 用户项目产物；源码证据只读，位于 workspace/{project}/.kata/repos/
```

- [ ] **Step 4: README.md — 开发与验证段（E4）**

old:
```text
# 检查 runtime skill 同步、detach、route、graph 和 workflow 契约
bun run check:skills
```
new:
```text
# 检查 runtime skill 同步、detach 与结构契约（.claude ↔ .agents）
bun run check:skills
```

old:
```text
schema、workflow、skill graph、blackboard 和同步例外落在 runtime `contracts/**`；共享内容使用 symlink 复用。
```
new:
```text
schema 与同步例外落在 `.claude/scripts/_shared/schemas/**` 与各 runtime 适配目录；跨 runtime 共享的 skill 正文使用 symlink（codex/reasonix）或 external_dirs（hermes）复用，零复制。
```

- [ ] **Step 5: README.md — 新增「多 runtime 支持」小节**

在「## 插件」小节之前插入：

```markdown
## 多 runtime 支持

kata 的 8 个业务 skill 单一存放于 `.claude/skills/`，通过适配目录暴露给其它 agent runtime，正文零复制、靠工具映射在运行时翻译：

| Runtime | 适配目录 | 发现机制 | 状态 |
| --- | --- | --- | --- |
| Claude Code | `.claude/skills/` | 原生 | ✅ 一等实现 |
| OpenAI Codex | `.agents/skills/` + `.codex-plugin/plugin.json` | 官方 `.agents/skills` 扫描，整目录 symlink | ✅ 官方支持 |
| Reasonix（DeepSeek） | `.reasonix/skills/` | 官方目录扫描（ConventionDirs 含 `.reasonix`），整目录 symlink | ✅ 官方支持 |
| Hermes Agent | `.hermes/skills/` + `~/.hermes/config.yaml` `external_dirs` | external_dirs 指向真实 `.claude/skills/`（symlink 受阻于上游 #8293） | ✅ 经 external_dirs |

各 runtime 的工具名映射与会话起始引导见对应 bootstrap：`using-kata-codex` / `using-kata-reasonix` / `using-kata-hermes`，依据见 `docs/skills/`。
```

- [ ] **Step 6: README-EN.md — 同步上述 E1–E5（英文）**

逐条对应替换：

| old | new |
| --- | --- |
| `### SKILL + Router + Graph + Workflow + Blackboard driven QA runtimes` | `### Auditable QA workflows built on Claude Code Skills` |
| 架构 intro `Kata uses ``.claude/**`` as the first-class runtime implementation, runtime-local contracts for schemas, routes, the skill graph, workflows, and the blackboard, ...` | `Kata uses ``.claude/**`` as the first-class runtime: 8 business skills as the single source, a prompt-level routing table (see ``CLAUDE.md``) dispatching inputs to the right skill, ``.claude/scripts/_shared/**`` (lib / schemas / lint / cli) as the execution and verification layer, ``.claude/plugins/`` for lanhu/zentao/notify, and ``workspace/{project}`` for artifacts:` |
| 目录树 `├── plugins/` / `├── templates/` 行 | 同 Step 3 的英文版结构（`.claude/{skills,scripts/_shared,plugins,rules,hooks}` + `.agents/.reasonix/.hermes` 多 runtime 适配，删 `templates/`） |
| `# Check runtime skill sync, detach, route, graph, and workflow contracts` | `# Check runtime skill sync, detach, and structure contracts (.claude <-> .agents)` |
| `Schemas, workflows, the skill graph, the blackboard, and sync exceptions live under runtime ``contracts/**``; shared content is reused through symlinks.` | `Schemas and sync exceptions live under ``.claude/scripts/_shared/schemas/**`` and the per-runtime adapter dirs; cross-runtime skill bodies are reused via symlinks (codex/reasonix) or external_dirs (hermes), with zero copies.` |
| 新增 "## Multi-runtime support" 小节（Plugins 之前） | 同 Step 5 表格的英文版 |

- [ ] **Step 7: 手工核对 README 内所有命令/路径示例真实可达**

```bash
grep -nE "plugins/|templates/|contracts/" README.md README-EN.md   # 应无残留虚构路径
```
Expected: 仅 `.claude/plugins/` 出现，无裸 `plugins/`、`templates/`、`contracts/`。

- [ ] **Step 8: 提交**

```bash
git add README.md README-EN.md
git commit -m "docs: 📝 rewrite README to match real architecture, drop fictional subsystems

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: reasonix / hermes 依据文档（对齐 codex 那份）

**Files:**
- Create: `docs/skills/2026-06-03-reasonix-native-skill-adaptation.md`
- Create: `docs/skills/2026-06-03-hermes-native-skill-adaptation.md`

- [ ] **Step 1: 写 reasonix 依据文档**

`docs/skills/2026-06-03-reasonix-native-skill-adaptation.md`，须含以下小节与事实（对齐 `2026-06-02-codex-native-skill-adaptation.md` 的结构）：

- **标题/日期/目标**：让 8 个业务 skill 在 reasonix（`esengine/DeepSeek-Reasonix`）原生可发现，与 Claude Code 共用一份源。
- **reasonix 真实的 skill 体系（依据）**：目录扫描，ConventionDirs `= .reasonix / .agents / .agent / .claude`，每个 skill 是含 `SKILL.md` 的目录（或扁平 `<name>.md`），仅 `name`+`description` 进索引；**支持整目录 symlink**。来源：仓库 `internal/skill/skill.go`、`internal/config/config.go`、`docs/SPEC.md §3.3`、`api-docs.deepseek.com` agent integrations。
- **canonical 落法**：`.reasonix/skills/<skill>` → `.claude/skills/<skill>` symlink + `using-kata-reasonix` bootstrap + `references/reasonix-tools.md`。
- **工具映射**：`Task → task`/`runAs: subagent`、`TodoWrite → todo_write`、`AskUserQuestion → ask`；reasonix **原生支持子代理**，不降级。
- **明确废弃**：`.reasonix-plugin/plugin.json`（reasonix 无 JSON manifest；plugins 是 `reasonix.toml` 的 `[[plugins]]` MCP server）。
- **校验**：`kata skills audit --runtime reasonix`（`lint:skills:reasonix`，已纳入 ci）；实现 `reasonix-skill-shape.ts`。

- [ ] **Step 2: 写 hermes 依据文档**

`docs/skills/2026-06-03-hermes-native-skill-adaptation.md`，须含：

- **标题/日期/目标**：让 8 个业务 skill 在 Hermes（`NousResearch/hermes-agent`）原生可发现。
- **Hermes 真实的 skill 体系（依据）**：源是 `~/.hermes/skills/`，可经 `~/.hermes/config.yaml` `skills.external_dirs` 扩展；SKILL.md 目录 + `name`+`description`，progressive disclosure（`skills_list`→`skill_view`）。8 工具：`delegate_task`/`todo`/`read_file`/`write_file`/`patch`/`terminal`/`search_files`/`skill_view`。来源：官方 `website/docs/reference/tools-reference.md`、`website/docs/user-guide/features/skills.md`。
- **canonical 落法（external_dirs）**：业务 skill 不 symlink；`external_dirs` 指 `.claude/skills` + `.hermes/skills`（取 bootstrap）。
- **明确不用 symlink 的原因**：上游 open bug `NousResearch/hermes-agent#8293`（+ #4759）——symlink 目录被 `skills_list`/`skill_view` 漏掉。
- **明确无 plugin manifest**：Hermes 无 per-plugin manifest（分发走 taps / Skills Hub）。
- **校验**：`kata skills audit --runtime hermes`（`lint:skills:hermes`，已纳入 ci）；实现 `hermes-skill-shape.ts`（禁 symlink + 要求 external_dirs 文档）。

- [ ] **Step 3: 校验文档内命令真实可达**

```bash
bun run lint:skills:reasonix && bun run lint:skills:hermes   # 文档描述的校验命令确能跑
```
Expected: 两条 pass。

- [ ] **Step 4: 提交**

```bash
git add docs/skills/2026-06-03-reasonix-native-skill-adaptation.md \
        docs/skills/2026-06-03-hermes-native-skill-adaptation.md
git commit -m "docs: 📝 add reasonix and hermes native skill adaptation references

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: 旁支文档对齐（CONTRIBUTING + plugin README）

**Files:**
- Modify: `CONTRIBUTING.md`
- Modify: `.claude/plugins/lanhu/README.md`、`.claude/plugins/zentao/README.md`、`.claude/plugins/notify/README.md`

- [ ] **Step 1: CONTRIBUTING.md 修失效命令**

old:
```bash
bun run --cwd engine type-check  # verify TypeScript
bun test --cwd engine             # verify tests
```
new:
```bash
bun run type-check  # verify TypeScript
bun test            # verify tests
```

- [ ] **Step 2: CONTRIBUTING.md 补全 commit 约定（type/emoji + 英文标题）**

把现有 Commit Convention 块：
```text
<type>: <description>

Types: feat, fix, refactor, docs, test, chore, perf, ci
```
替换为：
```text
<type>: <emoji> <description>

标题行用英文，description ≤ 72 字符。type/emoji 固定映射：
feat 🧩 · fix 🩹 · refactor ✨ · docs 📝 · test 🧪 · chore 🧹 · style 🎨 · build 🏗️ · ci 👷 · perf ⚡ · revert ⏪ · merge 🔀
详见 .claude/rules/project-workflow-rules.md。
```

- [ ] **Step 3: 3 个 plugin README 修过时路径**

把各 README 中 `bun run plugins/<name>/...` 改为 `bun run .claude/plugins/<name>/...`：

```bash
sed -i '' 's#bun run plugins/lanhu/#bun run .claude/plugins/lanhu/#g' .claude/plugins/lanhu/README.md
sed -i '' 's#bun run plugins/zentao/#bun run .claude/plugins/zentao/#g' .claude/plugins/zentao/README.md
# notify：逐处核对正文内 `plugins/notify/` 字样，统一加 `.claude/` 前缀
grep -n "plugins/notify/" .claude/plugins/notify/README.md
```
然后人工核对三个 README 内是否还有裸 `plugins/<name>/` 路径（含非 `bun run` 的引用），统一改为 `.claude/plugins/<name>/`。

- [ ] **Step 4: 核对无残留裸路径**

```bash
grep -rnE "(^|[^.])plugins/(lanhu|zentao|notify)/" .claude/plugins/*/README.md || echo "clean"
grep -nE "cwd engine" CONTRIBUTING.md || echo "clean"
```
Expected: 两条均 `clean`。

- [ ] **Step 5: 提交**

```bash
git add CONTRIBUTING.md .claude/plugins/lanhu/README.md .claude/plugins/zentao/README.md .claude/plugins/notify/README.md
git commit -m "docs: 📝 fix stale engine/plugins paths in contributing and plugin docs

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: 全量验证门 + 合并回 main

**Files:** 无（验证 + git 操作）

- [ ] **Step 1: 全量验证（在 worktree 内）**

```bash
bun test                                       # 全量，须 0 fail
bun run check                                  # biome 0 error
bun run check:skills                           # skill sync + detach + structure
bun run lint:skills:codex                      # codex 形状
bun run lint:skills:reasonix                   # reasonix 形状（新）
bun run lint:skills:hermes                     # hermes 形状（新）
bun run type-check 2>&1 | tail -3              # 与 ~202 预存错误基线比对：无新增
```
Expected: 测试 0 fail；biome 0 error；三个 `lint:skills:*` 均 pass；type-check 无新增错误。

- [ ] **Step 2: 记录 worktree HEAD SHA**

```bash
SHA=$(git rev-parse HEAD); echo "$SHA"
```

- [ ] **Step 3: 回主工作树合并**

```bash
cd "$ROOT"
git merge --no-ff "$SHA" -m "merge: 🔀 runtime adapter fixes (reasonix/hermes) and README rewrite"
```

- [ ] **Step 4: 合并后重验**

```bash
bun test && bun run check && bun run check:skills \
  && bun run lint:skills:codex && bun run lint:skills:reasonix && bun run lint:skills:hermes
```
Expected: 全绿。

- [ ] **Step 5: push + 清理 worktree**

```bash
git push origin main
git worktree remove .worktrees/runtime-adapter-fix
```
（远端不可用时记下阻塞，不静默略过。）

---

## 自检（Self-Review，已执行）

**1. Spec 覆盖**（spec 各节 → task）

| spec | task |
| --- | --- |
| §4 A1 删 plugin.json / A2 工具映射 / A3 SKILL.md / A4 lint+test | Task 2 / 2 / 2 / 1 |
| §5 B1 删 symlink / B2-B3 external_dirs+SKILL.md / B4 tools.md / B5 lint+test | Task 4 / 4 / 4 / 3 |
| §6 C codex 注记 | Task 5 |
| §7 D1 audit CLI / D2 package.json+ci | Task 6 |
| §8 E1–E5 README 双语 | Task 7 |
| §9 F1 依据文档 / F2 CONTRIBUTING+plugin README | Task 8 / 9 |
| §11 验证门 / §12 worktree 执行 | Task 10 / 执行前置+Task 10 |

无遗漏需求。

**2. Placeholder 扫描**：无 TBD/TODO。Task 8 文档任务以「必含小节 + 确切事实 + 一手来源 URL」形式给出（非占位），事实全部来自 spec §2，足以直接成文。`${KATA_REPO}` 为用户仓库路径的显式占位，附替换说明。

**3. 类型一致性**：lint 导出名跨 task 一致——`lintReasonixSkillTree`/`formatReasonixSkillReport`/`ReasonixSkillReport`（Task 1 定义、Task 6 引用）、`lintHermesSkillTree`/`formatHermesSkillReport`/`HermesSkillReport`（Task 3 定义、Task 6 引用）。规则名一致——reasonix 删 `REASONIX_PLUGIN_MANIFEST_*` 后其余沿用；hermes 用 `HERMES_STRAY_SYMLINK`/`HERMES_BOOTSTRAP_MISSING`/`HERMES_BOOTSTRAP_FRONTMATTER`/`HERMES_MAPPING_MISSING`/`HERMES_EXTERNAL_DIRS_UNDOCUMENTED`（Task 3 lint 与 test 完全对应）。

**4. 依赖顺序**：Task 1→2（lint 先于内容删 manifest）、Task 3→4（lint 先于删 symlink）、Task 2/4→6（audit 集成冒烟依赖真实仓库已修正）、Task 7/8/9 文档独立、Task 10 收口。顺序自洽。
