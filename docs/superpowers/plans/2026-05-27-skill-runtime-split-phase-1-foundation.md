# Skill 运行目录拆分第一阶段 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 `.claude` 与 `.agents` 独立维护前的基础检查能力：修正设计文档、写共享同步契约、加入双 runtime skill 同步检查工具，但本阶段不改 runtime skill 内容。

**Architecture:** 第一阶段先做低风险基础设施。新增 `docs/skills/contracts/**` 保存同步规则和路由样例，新增 `engine/src/skills/**` 做检查逻辑，新增 `engine/tests/skills/**` 和 CLI 测试保证检查器可用；先不接入强制 CI，等下一阶段清理生成投影后再设为必须通过。

**Tech Stack:** Bun >= 1.3、TypeScript、commander CLI、gray-matter、`bun test`、biome。

---

## 范围说明

这个设计拆动面很大，不能一次性实施。第一份计划只做 Phase 1 基础能力：

- 提交 spec review 后的修正（主要内容：§9 workflow YAML 作为唯一规范源、§2.3 恢复可追溯核验证据、路径 `tools/skills` → `engine/` 统一）。
- 新增非 `.ai` 的同步契约文档。
- 新增 runtime skill 检查代码和测试。
- 新增 `kata skills sync-check` 命令和 `bun run check:skills` 脚本。

本计划不改这些内容：

- 不删除 `.ai/**`。
- 不改 `.claude/skills/**` 或 `.agents/skills/**` 的正文。
- 不断开 `CLAUDE.md -> AGENTS.md`。
- 不删除 `CLAUDE.local.md`。
- 不把 `check:skills` 接进 `bun run check` 或 `ci`，因为当前 runtime 目录仍是生成投影，严格同步检查会先失败。

本阶段 sync-check 实现覆盖范围（仅结构检查，语义检查延期到 Phase 2）：

- skill 名集合一致性、SKILL.md 存在性、frontmatter name 与目录名一致、frontmatter 字段白名单。
- **延期到 Phase 2**：description 核心触发词组一致性检查、output-artifacts/verification-scope 引用一致性检查、Codex `agents/openai.yaml` 隐式调用策略检查、references/scripts 成对检查。
- **route-check 实现延期到 Phase 2**：本阶段只创建路由样例 YAML 文件（`docs/skills/contracts/routes/*.yaml`），不实现 `engine/tests/skills/route-check.test.ts` 和对应检查逻辑。
- 第一阶段 frontmatter 白名单只采用当前仓库与官方 evidence 能支撑的字段：`name`、`description`、`allowed-tools`。`argument-hint`、`arguments`、`disable-model-invocation`、`user-invocable` 等 slash-command 字段不得写入 SKILL.md 白名单；`when_to_use`、`model`、`effort`、`hooks`、`paths` 等字段必须等官方证据补齐后再单独扩展。

## 文件结构

**Create:**

- `docs/skills/contracts/runtime-skill-sync.md`：人工可读的双 runtime 同步规则。
- `docs/skills/contracts/runtime-sync-exceptions.yaml`：允许的单边差异清单，初始为空数组。
- `docs/skills/contracts/output-artifacts.md`：第一版共同要求和当前产物矩阵。
- `docs/skills/contracts/verification-scope.md`：第一版共同验证规则。
- `docs/skills/contracts/routes/case-draft.yaml`：case-draft 路由样例。
- `docs/skills/contracts/routes/case-hotfix.yaml`：case-hotfix 路由样例。
- `engine/src/skills/frontmatter-policy.ts`：Claude/Codex frontmatter 字段白名单。
- `engine/src/skills/runtime-sync.ts`：扫描 `.claude/skills` 与 `.agents/skills` 并产出违规项。
- `engine/tests/skills/frontmatter-check.test.ts`：字段白名单单元测试。
- `engine/tests/skills/sync-check.test.ts`：双 runtime skill 集合与异常清单测试。
- `engine/tests/cli/skills-sync-check.test.ts`：CLI 命令测试。

**Modify:**

- `docs/superpowers/specs/2026-05-27-skill-runtime-split-workflow-redesign.md`：修正 review 发现的问题。
- `engine/src/cli/skill-audit.ts`：增加 `skills sync-check` 子命令。
- `package.json`：增加 `check:skills` 脚本。

---

## Task 1: 修正并提交设计文档

设计文档 `2026-05-27-skill-runtime-split-workflow-redesign.md` 当前已有 review 后改动。本任务把两处关键修正落定并提交，避免后续任务混入未提交文档改动。

**Files:**

- Modify: `docs/superpowers/specs/2026-05-27-skill-runtime-split-workflow-redesign.md`

- [ ] **Step 1: 确认 §9 workflow 唯一规范源**

检查 `## 9. Workflow Graph 模式` 段落中包含以下关键措辞：

```text
唯一规范来源
必须由 YAML 生成或由检查器验证与 YAML 一致，不允许手写成第二份规范源
```

Run:

```bash
rg -c "唯一规范来源" docs/superpowers/specs/2026-05-27-skill-runtime-split-workflow-redesign.md
```

Expected：至少命中 1 次。

- [ ] **Step 2: 恢复 §2.3 Claude Code 核验证据**

把 `### 2.3 Claude Code Skills` 末尾的 `本机环境` 一句改成下面这段，避免误导读者以为本次成功调用了 `claude-code-guide`：

```markdown
本机核验：

- `claude --version`：`2.1.148 (Claude Code)`
- 本次尝试调用 `claude-code-guide` 的命令退出码为 `1`，错误为 `Not logged in · Please run /login`
- 本机历史 transcript `/Users/poco/.claude/projects/-Users-poco-Projects-kata/8721c7c2-f2bd-4c0b-8792-aa788e574812/subagents/agent-aaa6c78b3ffe92de9.jsonl` 已由 `claude-code-guide` 基于官方 Claude Code skills 文档校对过上述字段
```

- [ ] **Step 3: 跑文档自检**

Run:

```bash
rg -n "待定|占位|以后再说|未确定" docs/superpowers/specs/2026-05-27-skill-runtime-split-workflow-redesign.md
git diff --check
```

Expected:

- `rg` exit code `1`，表示没有命中。
- `git diff --check` exit code `0`。

- [ ] **Step 4: 提交设计文档修正**

```bash
if git diff --quiet -- docs/superpowers/specs/2026-05-27-skill-runtime-split-workflow-redesign.md; then
  echo "no spec diff; skip commit"
else
  git add docs/superpowers/specs/2026-05-27-skill-runtime-split-workflow-redesign.md
  git commit -m "docs: 📝 clarify skill runtime split spec"
fi
```

---

## Task 2: 新增共享同步契约文档

**Files:**

- Create: `docs/skills/contracts/runtime-skill-sync.md`
- Create: `docs/skills/contracts/runtime-sync-exceptions.yaml`
- Create: `docs/skills/contracts/output-artifacts.md`
- Create: `docs/skills/contracts/verification-scope.md`
- Create: `docs/skills/contracts/routes/case-draft.yaml`
- Create: `docs/skills/contracts/routes/case-hotfix.yaml`

- [ ] **Step 1: 创建目录**

Run:

```bash
mkdir -p docs/skills/contracts/routes
```

Expected: command exit code `0`。

- [ ] **Step 2: 写 runtime 同步规则文档**

Create `docs/skills/contracts/runtime-skill-sync.md`:

```markdown
# Runtime Skill 同步规则

## 基本规则

- `.claude/skills/<name>/SKILL.md` 和 `.agents/skills/<name>/SKILL.md` 必须成对存在。
- 两边的 `name` 必须一致。
- 两边的用户入口语义必须一致，例如 `/case-draft` 在 Claude 与 Codex 下都表示 `根据需求源生成 QA 用例`。
- 修改任一 runtime 的 skill、reference、script、workflow、blackboard、产物规则时，必须同步检查另一 runtime。
- 如果只改单边，必须在 `runtime-sync-exceptions.yaml` 写明原因。

## 不要求一致的内容

- 不要求两边文件逐字相同。
- Claude 可以使用 Claude Code 支持的 frontmatter。
- Codex 只能在 `SKILL.md` frontmatter 使用 Codex 支持字段，扩展配置放在 `agents/openai.yaml`。

## 不允许例外的内容

- skill 名集合。
- 用户入口含义。
- 交付产物清单。
- 验证口径。
- 证据最低要求。
```

- [ ] **Step 3: 写空例外文件**

Create `docs/skills/contracts/runtime-sync-exceptions.yaml`:

```yaml
# Schema:
# - skill: skill name, for example case-draft
# - side: runtime side with intentional one-sided change, for example claude or codex
# - file: affected file path
# - reason: why the exception is allowed
# - reviewer: required-before-merge
exceptions: []
```

- [ ] **Step 4: 写第一版产物规范**

Create `docs/skills/contracts/output-artifacts.md`:

```markdown
# 产物规范

本文件定义生成测试用例的 QA skills 共同要求和当前产物矩阵，适用于 `case-draft`、`case-edit`、`case-hotfix`。
不适用于 `bug-file`、`conflict-analyze`、`diff-scan`、`infra-diagnose`、`knowledge-curate`、`workspace-manage`、`playwright-automation`、`playwright-cli`；这些 skill 的产物规则在 Phase 2 单独补齐。

## 共同要求

- 产物清单以各 skill 当前 `SKILL.md` 和 references 为准。
- Phase 1 只记录稳定基线，不替代各 skill 的细化产物规则。
- 不把 CSV 作为 `case-draft`、`case-edit`、`case-hotfix` 三者共同必产物；CSV 仅在本次 skill 明确生成或转换时纳入交付范围。

## 当前产物矩阵

| Skill | 当前稳定产物 | 条件与边界 |
| --- | --- | --- |
| `case-draft` | `archive.md`、`cases.xmind`、`metadata.yaml`、`manifest.json` | blocking pending 非零时只输出确认/草稿类产物。 |
| `case-edit` | `archive`、`xmind` | CSV 可以作为输入或转换语义出现，Phase 1 不强制输出 CSV。 |
| `case-hotfix` | `archive`、`notes` | 目录内保留一个 `archive.md`、必要 JSON 文件和 `.temp/`；`archive.md` 禁止 SourceRef 字符串，SourceRefs 写入 `source_refs.json`。 |

## 质量要求

- 字段一致性：只在本次实际声明或生成的产物之间检查用例标题、步骤、预期结果一致性。
- 可读性：产物需经人工可直接审阅，不依赖工具解析
```

- [ ] **Step 5: 写第一版验证口径**

Create `docs/skills/contracts/verification-scope.md`:

```markdown
# 验证口径

本文件定义生成测试用例的 QA skills 执行完成前必须通过的验证项，适用于 `case-draft`、`case-edit`、`case-hotfix`。
其他 skill 的验证口径在 Phase 2 按各自交付物单独补齐。

## 通用验证项

- 产物文件存在且可解析
- 只验证本次 skill 实际声明或生成的产物。
- Archive 与 XMind 一致性只在两者都应生成时检查。
- CSV 只在本次明确生成或转换时检查。
- 无未完成标记残留（包括常见英文待办词和中文待确认词）

## SourceRef 放置边界

- `case-draft`：人类可读产物不含 SourceRef 字符串。
- `case-hotfix`：`archive.md` 不含 SourceRef 字符串，SourceRefs 写入 `source_refs.json`。

## 未验证范围声明

每次交付必须列出已验证和未验证的条目，不得将局部通过表述为全量通过。
```

- [ ] **Step 6: 写 case-draft 路由样例**

Create `docs/skills/contracts/routes/case-draft.yaml`:

```yaml
skill: case-draft
entry: /case-draft
should_trigger:
  - "根据这个 PRD 生成 QA 用例"
  - "这个 Lanhu 页面帮我出测试用例"
  - "根据 Axure 原型补一份 Archive 和 XMind"
should_not_trigger:
  - "把这个已有 Archive 转成 XMind"
  - "这个 bug 已修复，生成 hotfix 回归用例"
clarify:
  - "帮我补一下用例"
```

- [ ] **Step 7: 写 case-hotfix 路由样例**

Create `docs/skills/contracts/routes/case-hotfix.yaml`:

```yaml
skill: case-hotfix
entry: /case-hotfix
should_trigger:
  - "bug 12345 已修复，帮我生成 hotfix 回归用例"
  - "这个 ZenTao 缺陷修完了，补一条回归用例"
should_not_trigger:
  - "我发现一个新 bug，帮我写缺陷报告"
  - "根据 PRD 生成完整测试用例"
clarify:
  - "这个问题修好了，补一下用例"
```

- [ ] **Step 8: 跑文档检查**

Run:

```bash
git diff --check
```

Expected: exit code `0`。

- [ ] **Step 9: Commit**

```bash
git add docs/skills/contracts/runtime-skill-sync.md docs/skills/contracts/runtime-sync-exceptions.yaml docs/skills/contracts/output-artifacts.md docs/skills/contracts/verification-scope.md docs/skills/contracts/routes/case-draft.yaml docs/skills/contracts/routes/case-hotfix.yaml
git commit -m "docs: 📝 add runtime skill sync contracts"
```

---

## Task 3: 新增 frontmatter 字段规则

**Files:**

- Create: `engine/src/skills/frontmatter-policy.ts`
- Create: `engine/tests/skills/frontmatter-check.test.ts`

- [ ] **Step 1: 写测试**

Create `engine/tests/skills/frontmatter-check.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import {
  CODEX_SKILL_FRONTMATTER_FIELDS,
  CLAUDE_SKILL_FRONTMATTER_FIELDS,
  findUnsupportedFrontmatterFields,
} from "../../src/skills/frontmatter-policy.ts";

describe("skill frontmatter policy", () => {
  test("Claude policy allows only current SKILL.md fields", () => {
    expect(CLAUDE_SKILL_FRONTMATTER_FIELDS).toEqual(
      new Set(["name", "description", "allowed-tools"]),
    );
  });

  test("Codex policy keeps the current repository baseline", () => {
    expect(CODEX_SKILL_FRONTMATTER_FIELDS).toEqual(
      new Set(["name", "description", "allowed-tools"]),
    );
  });

  test("flags unsupported model field in Codex frontmatter", () => {
    const result = findUnsupportedFrontmatterFields("codex", {
      name: "case-draft",
      description: "生成 QA 用例",
      model: "sonnet",
    });
    expect(result).toEqual(["model"]);
  });

  test("flags slash-command fields in Claude SKILL.md frontmatter", () => {
    const commandOnlyFields = [
      "argument-hint",
      "arguments",
      "disable-model-invocation",
      "user-invocable",
    ];
    for (const field of commandOnlyFields) {
      const result = findUnsupportedFrontmatterFields("claude", {
        name: "case-draft",
        description: "生成 QA 用例",
        [field]: "x",
      });
      expect(result).toEqual([field]);
    }
  });

  test("flags fields that need official SKILL.md evidence before adoption", () => {
    const unconfirmedFields = ["when_to_use", "paths", "model", "effort", "hooks"];
    for (const field of unconfirmedFields) {
      const result = findUnsupportedFrontmatterFields("claude", {
        name: "case-draft",
        description: "生成 QA 用例",
        [field]: "x",
      });
      expect(result).toEqual([field]);
    }
  });

  test("allows current allowed-tools baseline in both runtimes", () => {
    const result = findUnsupportedFrontmatterFields("claude", {
      name: "case-draft",
      description: "生成 QA 用例",
      "allowed-tools": "Bash(playwright-cli:*)",
    });
    expect(result).toEqual([]);

    const codexResult = findUnsupportedFrontmatterFields("codex", {
      name: "playwright-cli",
      description: "Automate browser interactions",
      "allowed-tools": "Bash(playwright-cli:*)",
    });
    expect(codexResult).toEqual([]);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run:

```bash
bun test engine/tests/skills/frontmatter-check.test.ts
```

Expected: FAIL（import resolve 失败，因为 `engine/src/skills/frontmatter-policy.ts` 还不存在，测试无法启动）。

- [ ] **Step 3: 写实现**

Create `engine/src/skills/frontmatter-policy.ts`:

```typescript
export type SkillRuntime = "claude" | "codex";

const CURRENT_SKILL_FRONTMATTER_FIELDS = [
  "name",
  "description",
  "allowed-tools",
] as const;

// Phase 1 only accepts fields seen in the current repository baseline and verified evidence.
// Add more SKILL.md fields only in the same change that cites the official source.
export const CLAUDE_SKILL_FRONTMATTER_FIELDS: ReadonlySet<string> = new Set(
  CURRENT_SKILL_FRONTMATTER_FIELDS,
);

// Codex keeps allowed-tools as a transitional baseline because .agents/skills/playwright-cli
// already uses it. Phase 2 moves provider-specific tool settings into agents/openai.yaml.
export const CODEX_SKILL_FRONTMATTER_FIELDS: ReadonlySet<string> = new Set(
  CURRENT_SKILL_FRONTMATTER_FIELDS,
);

export function findUnsupportedFrontmatterFields(
  runtime: SkillRuntime,
  frontmatter: Record<string, unknown>,
): string[] {
  const allowed =
    runtime === "claude" ? CLAUDE_SKILL_FRONTMATTER_FIELDS : CODEX_SKILL_FRONTMATTER_FIELDS;
  return Object.keys(frontmatter)
    .filter((field) => !allowed.has(field))
    .sort();
}
```

- [ ] **Step 4: 跑测试确认通过**

Run:

```bash
bun test engine/tests/skills/frontmatter-check.test.ts
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add engine/src/skills/frontmatter-policy.ts engine/tests/skills/frontmatter-check.test.ts
git commit -m "feat: 🔍 add runtime skill frontmatter policy"
```

---

## Task 4: 新增双 runtime skill 同步检查

**Files:**

- Create: `engine/src/skills/runtime-sync.ts`
- Create: `engine/tests/skills/sync-check.test.ts`

- [ ] **Step 1: 写测试**

Create `engine/tests/skills/sync-check.test.ts`:

```typescript
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkRuntimeSkillSync, validateExceptionEntry } from "../../src/skills/runtime-sync.ts";

const tempRoots: string[] = [];

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-skill-sync-"));
  tempRoots.push(root);
  return root;
}

function writeSkill(root: string, runtimeDir: ".claude" | ".agents", name: string, body: string): void {
  const dir = join(root, runtimeDir, "skills", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), body, "utf8");
}

describe("runtime skill sync", () => {
  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("passes matching Claude and Codex skill names", () => {
    const root = makeRoot();
    writeSkill(
      root,
      ".claude",
      "case-draft",
      "---\nname: case-draft\ndescription: 生成 QA 用例\nallowed-tools: \"Bash(playwright-cli:*)\"\n---\n# case-draft\n",
    );
    writeSkill(
      root,
      ".agents",
      "case-draft",
      "---\nname: case-draft\ndescription: 生成 QA 用例\nallowed-tools: \"Bash(playwright-cli:*)\"\n---\n# case-draft\n",
    );

    const report = checkRuntimeSkillSync(root);
    expect(report.passed).toBe(true);
    expect(report.violations).toEqual([]);
  });

  test("flags missing counterpart skill", () => {
    const root = makeRoot();
    writeSkill(root, ".claude", "case-draft", "---\nname: case-draft\ndescription: 生成 QA 用例\n---\n");

    const report = checkRuntimeSkillSync(root);
    expect(report.passed).toBe(false);
    expect(report.violations.some((v) => v.rule === "RUNTIME_SKILL_MISSING")).toBe(true);
  });

  test("flags unsupported Codex frontmatter field", () => {
    const root = makeRoot();
    writeSkill(root, ".claude", "case-draft", "---\nname: case-draft\ndescription: 生成 QA 用例\n---\n");
    writeSkill(
      root,
      ".agents",
      "case-draft",
      "---\nname: case-draft\ndescription: 生成 QA 用例\nmodel: gpt-5\n---\n",
    );

    const report = checkRuntimeSkillSync(root);
    expect(report.passed).toBe(false);
    expect(report.violations.some((v) => v.rule === "UNSUPPORTED_FRONTMATTER")).toBe(true);
  });

  test("flags name mismatch between directory and frontmatter", () => {
    const root = makeRoot();
    writeSkill(root, ".claude", "case-draft", "---\nname: wrong-name\ndescription: 生成 QA 用例\n---\n");
    writeSkill(root, ".agents", "case-draft", "---\nname: case-draft\ndescription: 生成 QA 用例\n---\n");

    const report = checkRuntimeSkillSync(root);
    expect(report.passed).toBe(false);
    expect(report.violations.some((v) => v.rule === "SKILL_NAME_MISMATCH")).toBe(true);
  });

  test("validates exception entry has required fields", () => {
    expect(
      validateExceptionEntry({
        skill: "case-draft",
        side: "claude",
        file: "x",
        reason: "y",
        reviewer: "required-before-merge",
      }),
    ).toEqual([]);
    expect(validateExceptionEntry({ skill: "case-draft" })).toContain(
      "missing required fields: side, file, reason, reviewer",
    );
    expect(
      validateExceptionEntry({
        skill: "case-draft",
        side: "invalid",
        file: "x",
        reason: "y",
        reviewer: "z",
      }),
    ).toContain("side must be 'claude' or 'codex'");
  });

  test("rejects exception entries that bypass user semantics", () => {
    expect(
      validateExceptionEntry({
        skill: "case-draft",
        side: "claude",
        file: ".claude/skills/case-draft/SKILL.md",
        reason: "different output spec",
        reviewer: "optional",
      }),
    ).toContain("reason must not describe user-semantic or artifact divergence");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run:

```bash
bun test engine/tests/skills/sync-check.test.ts
```

Expected: FAIL，原因是 `engine/src/skills/runtime-sync.ts` 还不存在。

- [ ] **Step 3: 写实现**

Create `engine/src/skills/runtime-sync.ts`:

```typescript
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { findUnsupportedFrontmatterFields, type SkillRuntime } from "./frontmatter-policy.ts";

export interface RuntimeSkillViolation {
  rule:
    | "RUNTIME_SKILL_MISSING"
    | "SKILL_MD_MISSING"
    | "FRONTMATTER_PARSE_ERROR"
    | "SKILL_NAME_MISSING"
    | "SKILL_NAME_MISMATCH"
    | "UNSUPPORTED_FRONTMATTER";
  runtime?: SkillRuntime;
  skill: string;
  path: string;
  message: string;
}

export interface RuntimeSkillSyncReport {
  passed: boolean;
  violations: RuntimeSkillViolation[];
}

interface RuntimeSkillRecord {
  dirName: string;
  skillMdPath: string;
}

export function checkRuntimeSkillSync(root: string): RuntimeSkillSyncReport {
  const violations: RuntimeSkillViolation[] = [];
  const claude = readRuntimeSkills(root, "claude", violations);
  const codex = readRuntimeSkills(root, "codex", violations);
  const allSkillNames = new Set([...claude.keys(), ...codex.keys()]);

  for (const skill of [...allSkillNames].sort()) {
    const claudeRecord = claude.get(skill);
    const codexRecord = codex.get(skill);
    if (!claudeRecord) {
      violations.push({
        rule: "RUNTIME_SKILL_MISSING",
        runtime: "claude",
        skill,
        path: join(root, ".claude", "skills", skill, "SKILL.md"),
        message: `Claude skill '${skill}' is missing.`,
      });
    }
    if (!codexRecord) {
      violations.push({
        rule: "RUNTIME_SKILL_MISSING",
        runtime: "codex",
        skill,
        path: join(root, ".agents", "skills", skill, "SKILL.md"),
        message: `Codex skill '${skill}' is missing.`,
      });
    }
  }

  return { passed: violations.length === 0, violations };
}

function readRuntimeSkills(
  root: string,
  runtime: SkillRuntime,
  violations: RuntimeSkillViolation[],
): Map<string, RuntimeSkillRecord> {
  const runtimeDir = runtime === "claude" ? ".claude" : ".agents";
  const skillsRoot = join(root, runtimeDir, "skills");
  const records = new Map<string, RuntimeSkillRecord>();
  if (!existsSync(skillsRoot)) return records;

  for (const entry of readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dirName = entry.name;
    const skillMdPath = join(skillsRoot, dirName, "SKILL.md");
    if (!existsSync(skillMdPath)) {
      violations.push({
        rule: "SKILL_MD_MISSING",
        runtime,
        skill: dirName,
        path: skillMdPath,
        message: `${runtime} skill '${dirName}' is missing SKILL.md.`,
      });
      continue;
    }

    let frontmatter: Record<string, unknown>;
    try {
      const parsed = matter(readFileSync(skillMdPath, "utf8"));
      frontmatter = parsed.data as Record<string, unknown>;
    } catch {
      violations.push({
        rule: "FRONTMATTER_PARSE_ERROR",
        runtime,
        skill: dirName,
        path: skillMdPath,
        message: `${runtime} skill '${dirName}' has invalid frontmatter.`,
      });
      continue;
    }

    const frontmatterName = frontmatter.name;
    if (typeof frontmatterName !== "string" || frontmatterName.trim() === "") {
      violations.push({
        rule: "SKILL_NAME_MISSING",
        runtime,
        skill: dirName,
        path: skillMdPath,
        message: `${runtime} skill '${dirName}' must declare frontmatter name.`,
      });
    } else if (frontmatterName !== dirName) {
      violations.push({
        rule: "SKILL_NAME_MISMATCH",
        runtime,
        skill: dirName,
        path: skillMdPath,
        message: `${runtime} skill directory '${dirName}' declares name '${frontmatterName}'.`,
      });
    }

    for (const field of findUnsupportedFrontmatterFields(runtime, frontmatter)) {
      violations.push({
        rule: "UNSUPPORTED_FRONTMATTER",
        runtime,
        skill: dirName,
        path: skillMdPath,
        message: `${runtime} skill '${dirName}' uses unsupported frontmatter field '${field}'.`,
      });
    }

    records.set(dirName, { dirName, skillMdPath });
  }

  return new Map([...records.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export interface RuntimeSyncExceptionEntry {
  skill: string;
  side: "claude" | "codex";
  file: string;
  reason: string;
  reviewer: "required-before-merge";
}

const EXCEPTION_REQUIRED_FIELDS = ["skill", "side", "file", "reason", "reviewer"] as const;

const FORBIDDEN_EXCEPTION_REASONS = [
  "user semantic",
  "artifact",
  "output spec",
  "verification scope",
  "different output",
];

// Exported now so Phase 2 can wire exception validation into the repository check.
export function validateExceptionEntry(entry: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const missing = EXCEPTION_REQUIRED_FIELDS.filter((f) => !(f in entry));
  if (missing.length > 0) {
    errors.push(`missing required fields: ${missing.join(", ")}`);
  }
  if (entry.side !== undefined && entry.side !== "claude" && entry.side !== "codex") {
    errors.push("side must be 'claude' or 'codex'");
  }
  if (entry.reviewer !== undefined && entry.reviewer !== "required-before-merge") {
    errors.push("reviewer must be 'required-before-merge'");
  }
  if (typeof entry.reason === "string") {
    const lower = entry.reason.toLowerCase();
    if (FORBIDDEN_EXCEPTION_REASONS.some((kw) => lower.includes(kw))) {
      errors.push("reason must not describe user-semantic or artifact divergence");
    }
  }
  return errors;
}

export function formatRuntimeSkillSyncReport(report: RuntimeSkillSyncReport, root: string): string {
  if (report.passed) return "runtime skill sync passed";
  const lines = report.violations.map((violation) => {
    const rel = violation.path.startsWith(root)
      ? violation.path.slice(root.length + 1)
      : violation.path;
    return `${violation.rule}: ${rel}: ${violation.message}`;
  });
  return ["runtime skill sync failed", ...lines].join("\n");
}
```

- [ ] **Step 4: 跑测试确认通过**

Run:

```bash
bun test engine/tests/skills/frontmatter-check.test.ts engine/tests/skills/sync-check.test.ts
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add engine/src/skills/runtime-sync.ts engine/tests/skills/sync-check.test.ts
git commit -m "feat: 🔍 check claude/codex skill sync"
```

---

## Task 5: 增加 `kata skills sync-check` 命令

**Files:**

- Modify: `engine/src/cli/skill-audit.ts`
- Create: `engine/tests/cli/skills-sync-check.test.ts`
- Modify: `package.json`

- [ ] **Step 1: 写 CLI 测试**

Create `engine/tests/cli/skills-sync-check.test.ts`:

```typescript
import { expect, test } from "bun:test";
import { spawnKataCli } from "../cli-runner.ts";

test("kata skills sync-check runs against the repository", () => {
  const result = spawnKataCli(["skills", "sync-check"]);
  expect(result.signal).toBeNull();
  expect(result.status).toBe(0);
  expect(result.stdout + result.stderr).toContain("runtime skill sync");
});
```

- [ ] **Step 2: 跑测试确认失败**

Run:

```bash
bun test engine/tests/cli/skills-sync-check.test.ts
```

Expected: FAIL，原因是 `skills sync-check` 命令还不存在。

- [ ] **Step 3: 增加 CLI 子命令**

在 `engine/src/cli/skill-audit.ts` 顶部补充 import：

```typescript
import {
  checkRuntimeSkillSync,
  formatRuntimeSkillSyncReport,
} from "../skills/runtime-sync.ts";
```

在 `buildSkillsCommand()` 里、`skills.command("audit")...` 之前加入：

```typescript
  skills
    .command("sync-check")
    .description("检查 .claude 与 .agents 的 skill 是否同步")
    .option("--exit-code", "exit non-zero on any violation", false)
    .action((opts: { exitCode: boolean }) => {
      const root = repoRoot();
      const report = checkRuntimeSkillSync(root);
      const text = formatRuntimeSkillSyncReport(report, root);
      if (report.passed) {
        console.log(text);
      } else {
        process.stderr.write(`${text}\n`);
      }
      if (opts.exitCode && !report.passed) process.exit(1);
    });
```

- [ ] **Step 4: 增加 package 脚本**

在 `package.json` 的 `scripts` 增加：

```json
"check:skills": "kata skills sync-check --exit-code"
```

不要在本任务里修改 `"check"` 或 `"ci"`。

- [ ] **Step 5: 跑 CLI 测试**

Run:

```bash
bun test engine/tests/cli/skills-sync-check.test.ts
```

Expected: PASS。

- [ ] **Step 6: 手动跑命令，记录当前结果**

Run:

```bash
bun engine/bin/kata skills sync-check
```

Expected: exit code `0`，输出包含 `runtime skill sync passed`。`playwright-cli` 的 `allowed-tools` 是第一阶段过渡白名单内字段，不应产生 `UNSUPPORTED_FRONTMATTER`。

- [ ] **Step 7: Commit**

```bash
git add engine/src/cli/skill-audit.ts engine/tests/cli/skills-sync-check.test.ts package.json
git commit -m "feat: 🔍 add skills sync-check command"
```

---

## Task 6: 第一阶段总验证

**Files:**

- Verify only.

- [ ] **Step 1: 跑新增测试**

Run:

```bash
bun test engine/tests/skills/frontmatter-check.test.ts engine/tests/skills/sync-check.test.ts engine/tests/cli/skills-sync-check.test.ts
```

Expected: PASS。

- [ ] **Step 2: 跑格式检查**

Run:

```bash
git diff --check
bun run check
```

Expected:

- `git diff --check` exit code `0`。
- `bun run check` exit code `0`。如果仍有已有 warning，记录数量，不把 warning 说成失败。

- [ ] **Step 3: 确认没有误改 runtime 目录**

使用当前分支与 `main` 的共同起点来列出本阶段改动，不创建本地标签：

```bash
BASE=$(git merge-base main HEAD)
git diff --name-only "$BASE"..HEAD | grep -vE '^(docs/skills/contracts/|docs/superpowers/(specs|plans)/2026-05-27-skill-runtime-split|engine/src/skills/|engine/src/cli/skill-audit\.ts$|engine/tests/(skills/|cli/skills-sync-check\.test\.ts$)|package\.json$)' && exit 1 || true
git diff --name-only "$BASE"..HEAD | rg '^\.ai/' && exit 1 || true
```

Expected: exit code `0`，且第一条命令没有打印任何不在允许范围内的路径。

允许路径范围：

```text
docs/skills/contracts/
docs/superpowers/specs/2026-05-27-skill-runtime-split-workflow-redesign.md
docs/superpowers/plans/2026-05-27-skill-runtime-split-phase-1-foundation.md
engine/src/skills/
engine/src/cli/skill-audit.ts
engine/tests/skills/
engine/tests/cli/skills-sync-check.test.ts
package.json
```

- [ ] **Step 4: 记录下一阶段入口**

在最终汇报中明确下一阶段计划名称：

```text
下一阶段：Phase 2 runtime 去投影化，内容包括重写 CLAUDE.md / AGENTS.md、删除 CLAUDE.local.md、清理 generated marker、补齐 Claude/Codex 原生字段。
```

---

## Self-Review Checklist

- [ ] 设计文档已修正并提交，review 修正点均已到位（§9 workflow 唯一规范源、§2.3 可追溯核验证据、路径统一）。
- [ ] 第一阶段没有改 `.claude/skills/**`、`.agents/skills/**`、`.ai/**`，并已用 Task 6 Step 3 的命令自动验证。
- [ ] 新增检查器有单元测试和 CLI 测试。
- [ ] exceptions schema 校验覆盖了必填字段、side 值、禁止豁免的语义类别。
- [ ] `check:skills` 存在，但没有接进 `check` 或 `ci`。
- [ ] `output-artifacts.md` 和 `verification-scope.md` 已限定为 `case-draft`、`case-edit`、`case-hotfix` 的第一版共同要求，并避免把 CSV 写成三者共同必产物。
- [ ] route-check 实现显式标注延期到 Phase 2。
- [ ] 每个任务都有明确命令和预期结果。
