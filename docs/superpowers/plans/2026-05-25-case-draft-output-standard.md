# case-draft 输出产物标准 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 case-draft 产物重定义为「4 文件干净交付层 + `.process/` 机器层 + 正确性硬标准」，并改造已合并的 cross-model 稳定层使其遵从此契约。

**Architecture:** 两阶段。Phase 1 把机器层稳定文件（`source-snapshot.json` / `coverage-matrix.json`）从 feature 根移入 `.process/`，改 `verify-layers` 单一常量即同时覆盖 verify+compare，再补 cases-verify 硬编码路径、resolve-target、features-resolve、references、测试与 e2e fixtures。Phase 2 新增正确性标准：`references/output-standard.md` + skill.yaml hard_rules + 新 archive lint，并接入收尾门 `kata cases lint`。

**Tech Stack:** Bun ≥1.3、TypeScript、commander CLI、`bun test`、biome（`bun run check`）、kata ai-core projection。

**前置：** 本计划改动 main 上刚合并的代码。按 `.ai/core/rules/git-workflow.md` 在 `.worktrees/case-draft-output-standard` worktree 执行；每个 Task 一次 commit。基线 commit：`a9528e0d6`（spec v2）。

**仓库约定（已核对）：**
- Lint 模块在 `engine/src/lint/`，每个导出 `lintXxx(...): CaseLintReport`（`{ scanRoot, files, violations, passed }`），由 `engine/src/cli/cases-lint.ts` 的 `reports[]` 聚合。`CaseLintViolation = { rule, file, lineNumber, matched, severity?, message }`（`engine/src/lint/types.ts`）。
- 稳定核心文件集是单一常量 `STABLE_CORE_ARTIFACTS`（`engine/src/cases/verify-layers.ts`），被 `verify` 与 `compare` 共用。
- 改 `.ai/core/**` 后必须 `kata ai-core projection render` + projection lock render，再 `bun run lint:ai-core`。
- skill.yaml hard_rules 改动须更新 `engine/tests/ai-core/case-draft-hardrules-regression.test.ts` 的 `BASELINE_COUNT` 与 `BASELINE_SHA256`。

---

## Phase 1 — 机器层文件移入 `.process/`

### Task 1.1: verify-layers 稳定核心常量改指 `.process/`

**Files:**
- Modify: `engine/src/cases/verify-layers.ts:20-27`（`STABLE_CORE_ARTIFACTS`）, `:40-44`（`STRUCTURED_SCHEMA_FILES`）
- Test: `engine/tests/cases/verify-layers.test.ts`

- [ ] **Step 1: 更新测试期望（先红）**

打开 `engine/tests/cases/verify-layers.test.ts`，把所有写入 `source-snapshot.json` / `coverage-matrix.json` 到 feature 根的 fixture 改为写入 `<featureDir>/.process/`（用 `mkdirSync(join(dir, ".process"), { recursive: true })` 后写入）。对断言「`stable_core_missing` 缺失提示」的用例，期望消息文本更新为 `.process/source-snapshot.json` / `.process/coverage-matrix.json`。

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test engine/tests/cases/verify-layers.test.ts`
Expected: FAIL —— 现有源码仍在 feature 根找文件，新 fixture 放在 `.process/`，报 `stable_core_missing`。

- [ ] **Step 3: 改常量指向 `.process/`**

`engine/src/cases/verify-layers.ts` 中：

```typescript
export const STABLE_CORE_ARTIFACTS = [
  "manifest.json",
  "metadata.yaml",
  ".process/source-snapshot.json",
  ".process/coverage-matrix.json",
  "archive.md",
  "cases.xmind",
] as const;
```

```typescript
const STRUCTURED_SCHEMA_FILES: { file: string; loader: () => (d: unknown) => boolean; kind: "json" | "yaml"; array?: boolean }[] = [
  { file: "metadata.yaml", loader: loadFeatureMetadataValidator, kind: "yaml" },
  { file: ".process/source-snapshot.json", loader: loadFeatureSourceSnapshotValidator, kind: "json" },
  { file: ".process/coverage-matrix.json", loader: loadCoverageMatrixValidator, kind: "json", array: true },
];
```

`join(featureDir, ".process/source-snapshot.json")` 在 `verifyStableCoreArtifacts` / `verifyStructuredSchemas` 内已用 `join`，无需改 join 逻辑；`cases-compare.ts` 复用该常量，自动跟随。

- [ ] **Step 4: 跑测试确认通过**

Run: `bun test engine/tests/cases/verify-layers.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add engine/src/cases/verify-layers.ts engine/tests/cases/verify-layers.test.ts
git commit -m "refactor: 📦 locate source-snapshot/coverage-matrix under .process/ in verify-layers"
```

---

### Task 1.2: cases-verify 硬编码路径改指 `.process/`

**Files:**
- Modify: `engine/src/cli/cases-verify.ts:41`, `:64`
- Test: `engine/tests/cli/cases-verify.test.ts`

- [ ] **Step 1: 更新测试期望（先红）**

`engine/tests/cli/cases-verify.test.ts` 中，凡建测试 feature 目录时写 `source-snapshot.json` / `coverage-matrix.json` 的，改写入 `<dir>/.process/`（`mkdirSync(join(dir, ".process"), { recursive: true })`）。`source-snapshot_missing` / `coverage_matrix_missing` 的「缺失」用例保持把文件「不创建」即可（路径变了，断言 rule 名不变）。

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test engine/tests/cli/cases-verify.test.ts`
Expected: FAIL —— `runCasesVerify` 仍在 feature 根找两文件，新 fixture 在 `.process/`，completed 路径报 `source-snapshot_missing` / `coverage_matrix_missing`。

- [ ] **Step 3: 改两处路径**

`engine/src/cli/cases-verify.ts`：

第 41 行：
```typescript
  const snapshotPath = join(dir, ".process", "source-snapshot.json");
```

第 64 行：
```typescript
  const coveragePath = join(dir, ".process", "coverage-matrix.json");
```

- [ ] **Step 4: 跑测试确认通过**

Run: `bun test engine/tests/cli/cases-verify.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add engine/src/cli/cases-verify.ts engine/tests/cli/cases-verify.test.ts
git commit -m "refactor: 📦 read source-snapshot/coverage-matrix from .process/ in cases verify"
```

---

### Task 1.3: resolve-target 与 features-resolve 改指 `.process/`，并建目录

**Files:**
- Modify: `engine/src/source-ref/resolve-target.ts:111`
- Modify: `engine/src/cli/features-resolve.ts:49`（读路径）+ 目录创建处
- Test: `engine/tests/cli/features-resolve.test.ts`

- [ ] **Step 1: 更新测试期望（先红）**

`engine/tests/cli/features-resolve.test.ts`：断言 `features resolve` 后存在 `.process/` 目录（`expect(existsSync(join(featureDir, ".process"))).toBe(true)`）；若测试读/写 `source-snapshot.json`，路径改 `.process/`。

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test engine/tests/cli/features-resolve.test.ts`
Expected: FAIL —— resolve 尚未创建 `.process/`。

- [ ] **Step 3: 改 resolve-target 读路径**

`engine/src/source-ref/resolve-target.ts` 第 111 行：
```typescript
      const snapPath = join(ctx.featureDir, ".process", "source-snapshot.json");
```

- [ ] **Step 4: 改 features-resolve 读路径 + 建目录**

`engine/src/cli/features-resolve.ts`：
- 第 49 行读路径改：`const snapPath = join(dir, ".process", "source-snapshot.json");`
- 在 resolve 确定/创建 feature 目录处，追加创建 `.process/`：
```typescript
  mkdirSync(join(dir, ".process"), { recursive: true });
```
确认文件顶部已 `import { mkdirSync } from "node:fs";`（若无则补入 import）。

- [ ] **Step 5: 跑测试确认通过**

Run: `bun test engine/tests/cli/features-resolve.test.ts engine/tests/source-ref/`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add engine/src/source-ref/resolve-target.ts engine/src/cli/features-resolve.ts engine/tests/cli/features-resolve.test.ts
git commit -m "refactor: 📦 resolve source-snapshot under .process/ + ensure .process/ exists"
```

---

### Task 1.4: references 写入路径改 `.process/` + 重渲染 projection

**Files:**
- Modify: `.ai/core/skills/case-draft/references/execution-protocol.md:41-42`
- Modify: `.ai/core/skills/case-draft/references/source-confirm.md:16`
- Modify: `.ai/core/skills/case-draft/references/coverage-matrix-guide.md`
- Modify: `.ai/core/skills/case-draft/references/worker-prompt.md:98`
- Test: `engine/tests/ai-core/case-draft-contract.test.ts`（确保仍绿）

- [ ] **Step 1: 改 execution-protocol.md**

把第 41 行的 featureDir 写入清单改为：
```
- `featureDir` is the single write root for the 4 delivery artifacts (manifest.json, metadata.yaml, archive.md, cases.xmind). Machine-layer files go under `.process/` (.process/source-snapshot.json, .process/coverage-matrix.json) and never pollute the feature root.
```
第 42 行 `slug_source` 路径改为 `.process/source-snapshot.json#slug_source`。

- [ ] **Step 2: 改 source-confirm.md**

第 16 行把 `source-snapshot.json#confirmed_source_repos[]` 与 `#slug_source` 的写入路径改为 `.process/source-snapshot.json`（两处）。保留「不写 metadata.yaml」说明不变。

- [ ] **Step 3: 改 coverage-matrix-guide.md 与 worker-prompt.md**

- coverage-matrix-guide.md：把生成 `coverage-matrix.json` 的落点说明改为 `.process/coverage-matrix.json`。
- worker-prompt.md 第 98 行示例路径改为 `workspace/dataAssets/features/example/.process/source-snapshot.json`。

- [ ] **Step 4: 重渲染 projection + lock**

Run:
```bash
bun engine/bin/kata ai-core projection render
bun engine/bin/kata ai-core projection lock render
```
Expected: 退出码 0；`.claude/skills/case-draft/` 与 `.agents/skills/case-draft/` 同步更新。

- [ ] **Step 5: 跑契约与 ai-core lint**

Run: `bun test engine/tests/ai-core/case-draft-contract.test.ts && bun run lint:ai-core`
Expected: PASS / 退出码 0。

- [ ] **Step 6: Commit**

```bash
git add .ai/core/skills/case-draft/references/ .claude/skills/case-draft/ .agents/skills/case-draft/
git commit -m "docs: 📦 point case-draft references at .process/ for machine-layer files"
```

---

### Task 1.5: e2e fixtures 与剩余测试同步 `.process/`，全绿

**Files:**
- Modify: `engine/tests/fixtures/case-draft-e2e/expected/claude/2026-05-lanhu-cd882ee8/`（移 `source-snapshot.json`、`coverage-matrix.json` 进 `.process/`）
- Modify: `engine/tests/fixtures/case-draft-e2e/expected/codex/2026-05-lanhu-cd882ee8/`（同上）
- Modify（按需）: `engine/tests/e2e/case-draft-e2e.test.ts`, `engine/tests/test-case-flow/lanhu-replay.test.ts`, `engine/tests/cli/cases-compare.test.ts`, `engine/tests/cli/cases-validate.test.ts`, `engine/tests/schemas/feature-manifest.test.ts`

- [ ] **Step 1: 移动 e2e 期望 fixture 内的两文件**

对 claude 与 codex 两个 expected feature 目录各执行：
```bash
cd engine/tests/fixtures/case-draft-e2e/expected/claude/2026-05-lanhu-cd882ee8
mkdir -p .process && git mv source-snapshot.json .process/source-snapshot.json && git mv coverage-matrix.json .process/coverage-matrix.json
cd ../../codex/2026-05-lanhu-cd882ee8
mkdir -p .process && git mv source-snapshot.json .process/source-snapshot.json && git mv coverage-matrix.json .process/coverage-matrix.json
```
（路径以实际 fixture 为准；若 fixture 还含别的机器文件，一并移入 `.process/`。）

- [ ] **Step 2: 跑相关测试，按报错逐个修路径**

Run: `bun test engine/tests/e2e/case-draft-e2e.test.ts engine/tests/test-case-flow/lanhu-replay.test.ts engine/tests/cli/cases-compare.test.ts engine/tests/cli/cases-validate.test.ts engine/tests/schemas/feature-manifest.test.ts`
Expected: 初次可能 FAIL（测试内仍按旧路径构造/断言）。把每个失败处对两文件的 `join(dir, "source-snapshot.json")` / `"coverage-matrix.json"` 改为 `.process/` 子路径；写 fixture 处先 `mkdirSync(join(dir, ".process"), { recursive: true })`。

- [ ] **Step 3: 跑全量稳定层测试确认通过**

Run: `bun test engine/tests/cases/ engine/tests/cli/cases-verify.test.ts engine/tests/cli/cases-compare.test.ts engine/tests/e2e/`
Expected: PASS

- [ ] **Step 4: 全量回归**

Run: `bun test`
Expected: 全绿（与基线一致，无新增失败）。

- [ ] **Step 5: Commit**

```bash
git add engine/tests/
git commit -m "test: 📦 move e2e fixtures + tests to .process/ machine-layer layout"
```

---

## Phase 2 — 正确性标准

### Task 2.1: 新建 `references/output-standard.md`

**Files:**
- Create: `.ai/core/skills/case-draft/references/output-standard.md`

- [ ] **Step 1: 写标准内容**

新建文件，正文为 spec §4 的规范（用规范化措辞）：

```markdown
# case-draft 输出产物标准（normative）

## 文件集
- 交付层（feature 根，仅 4 件）：archive.md、cases.xmind、metadata.yaml、manifest.json。
- 机器层 + 过程/证据：一律落 `.process/`（source-snapshot.json、coverage-matrix.json、enhanced.md、confirmation-package.md、case-evidence-map.json、unresolved-summary.md、archive.draft.md、tmp/）。feature 根禁止出现这些文件。

## archive.md frontmatter（字段固定）
suite_name / root_name / module / prd_version / prd_id / tags / status / create_at / case_count / origin。
禁止 product / description / dev_version 等无消费方字段。prd_id 与 case_id 统一用 prd_id。

## 章节层级（映射 xmind-gen 树）
`## 模块` → `### 页面` → `#### 子分组(可选)` → `##### 【Pn】用例`。

## 用例标题（硬）
- 必带 `【Pn】` 前缀（工具解析优先级）。
- 标题内禁止任何机器标识：TC-ID、SR-、RA-。
- 自然中文动宾句。

## 括号语义（硬）
- `【】` 专用于 `【Pn】` 优先级前缀。
- `「」` 用于所有 UI/菜单/选项/字段名。

## 用例内容质量（硬）
- 每条用例 ≥1 前置条件、≥1 步骤，每步预期具体可验；禁止「页面正常打开」作为唯一断言。
- 原子化：一条用例一个验证目标。
- 覆盖维度齐全：正常 + 边界 + 异常/空态 + 组合联动 + 持久化。
- 每条用例可追溯真实证据；纯推断不进最终档（见证据底线）。

## cases.xmind
- 永远 `kata xmind-gen` 从 archive.md 生成；archive 改后即重生成；与 archive 逐字段一致。
- 节点可读性：单节点不堆多操作分句、引号项 < 3。

## 证据底线（硬）
- 关键设计证据（Lanhu 设计内容、相关源码）读不到 → 不产出最终 archive.md/cases.xmind。
- 用 AskUser 一次性批量索要缺口（贴内容 / Lanhu cookie / 截图 / 可读源码路径）。拿到真实证据再产出。
```

- [ ] **Step 2: 在 skill.yaml references 注册该文件**

`.ai/core/skills/case-draft/skill.yaml` 的 `references:` 列表追加：
```yaml
  - path: references/output-standard.md
    type: normative
    load_phases:
      - case-draft
      - case-review
      - output
    purpose: case-draft 产物正确性标准（文件集/frontmatter/标题/括号/内容质量/证据底线）的唯一来源。
    load_when: step.id in [case-draft, case-review, output]
```

- [ ] **Step 3: 重渲染 projection + lock，跑 ai-core lint**

Run:
```bash
bun engine/bin/kata ai-core projection render
bun engine/bin/kata ai-core projection lock render
bun run lint:ai-core
```
Expected: 退出码 0。

- [ ] **Step 4: Commit**

```bash
git add .ai/core/skills/case-draft/references/output-standard.md .ai/core/skills/case-draft/skill.yaml .claude/skills/case-draft/ .agents/skills/case-draft/
git commit -m "feat: 📝 add case-draft output-standard normative reference"
```

---

### Task 2.2: skill.yaml hard_rules 增正确性条款 + 更新回归基线

**Files:**
- Modify: `.ai/core/skills/case-draft/skill.yaml`（`body.always_load.hard_rules`）
- Modify: `engine/tests/ai-core/case-draft-hardrules-regression.test.ts:27,28`（`BASELINE_SHA256`, `BASELINE_COUNT`）

- [ ] **Step 1: 追加 hard_rules（5 条）**

在 `hard_rules:` 末尾追加：
```yaml
      - 交付层仅 archive.md、cases.xmind、metadata.yaml、manifest.json 四件落 feature 根；source-snapshot.json、coverage-matrix.json 及过程/证据产物一律落 .process/，详见 references/output-standard.md。
      - archive.md/cases.xmind 用例标题禁止任何机器标识（TC-ID、SR-、RA-）；标题仅 `【Pn】` 前缀 + 自然中文动宾句。
      - 括号语义：`【】` 专用于 `【Pn】` 优先级前缀，`「」` 用于所有 UI/菜单/选项/字段名。
      - 每条用例每步预期必须具体可验，禁止「页面正常打开」之类空泛断言作为唯一预期。
      - 证据底线：Lanhu 设计内容或相关源码读取失败时，用 ask_user 一次性批量索要缺口，不得凭历史/推断产出最终 archive.md/cases.xmind。
```

- [ ] **Step 2: 跑回归测试确认失败（基线变更）**

Run: `bun test engine/tests/ai-core/case-draft-hardrules-regression.test.ts`
Expected: FAIL —— `hard_rules.length` 由 14 变 19，sha256 不匹配。

- [ ] **Step 3: 计算新基线值**

Run:
```bash
bun -e 'import {readFileSync} from "node:fs";import {parse} from "yaml";import {createHash} from "node:crypto";const y=parse(readFileSync(".ai/core/skills/case-draft/skill.yaml","utf8"));const h=y.body.always_load.hard_rules;console.log("COUNT",h.length);console.log("SHA",createHash("sha256").update(h.join("\n")).digest("hex"));'
```
记录输出的 COUNT 与 SHA。

- [ ] **Step 4: 更新测试基线**

`engine/tests/ai-core/case-draft-hardrules-regression.test.ts`：
- `BASELINE_COUNT` 改为 Step 3 输出的 COUNT（应为 19）。
- `BASELINE_SHA256` 改为 Step 3 输出的 SHA。
- 第 26 行注释追加：`// Updated 2026-05-25: +5 output-standard rules (file-set, no machine id in title, bracket semantics, no weak expected, evidence floor).`

- [ ] **Step 5: 重渲染 projection + lock，跑测试**

Run:
```bash
bun engine/bin/kata ai-core projection render
bun engine/bin/kata ai-core projection lock render
bun test engine/tests/ai-core/case-draft-hardrules-regression.test.ts && bun run lint:ai-core
```
Expected: PASS / 退出码 0。

- [ ] **Step 6: Commit**

```bash
git add .ai/core/skills/case-draft/skill.yaml engine/tests/ai-core/case-draft-hardrules-regression.test.ts .claude/skills/case-draft/ .agents/skills/case-draft/
git commit -m "feat: 🔒 add output-standard hard_rules to case-draft + update regression baseline"
```

---

### Task 2.3: 新增 archive 输出标准 lint 模块

**Files:**
- Create: `engine/src/lint/archive-output-standard.ts`
- Create: `engine/tests/lint/archive-output-standard.test.ts`
- Create: `engine/tests/lint/fixtures/archive-standard-good/`、`engine/tests/lint/fixtures/archive-standard-bad/`

- [ ] **Step 1: 写失败测试**

`engine/tests/lint/archive-output-standard.test.ts`：
```typescript
import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lintArchiveOutputStandard } from "../../src/lint/archive-output-standard.ts";

function feature(files: Record<string, string>, dirs: string[] = []): string {
  const root = mkdtempSync(join(tmpdir(), "aos-"));
  const fdir = join(root, "p", "features", "2026-05-x");
  mkdirSync(fdir, { recursive: true });
  for (const d of dirs) mkdirSync(join(fdir, d), { recursive: true });
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(join(fdir, name, ".."), { recursive: true });
    writeFileSync(join(fdir, name), body);
  }
  return root;
}

const GOOD_ARCHIVE = `---
suite_name: "X"
status: "草稿"
case_count: 1
origin: "case-draft"
---

## 元数据

### 数据地图

##### 【P0】验证选择「已绑定」仅返回已绑定的数据表

> 前置条件

\`\`\`
1. 已登录
\`\`\`

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 选择「已绑定」 | 列表仅展示已绑定数据表 |
`;

describe("lintArchiveOutputStandard", () => {
  test("flags TC-ID in case title", () => {
    const root = feature({ "archive.md": GOOD_ARCHIVE.replace("验证选择", "TC-DM-001 验证选择") });
    const r = lintArchiveOutputStandard(join(root, "p", "features"));
    expect(r.violations.some((v) => v.rule === "archive-title-machine-id")).toBe(true);
    rmSync(root, { recursive: true });
  });

  test("flags machine file in feature root", () => {
    const root = feature({ "archive.md": GOOD_ARCHIVE, "source-snapshot.json": "{}" });
    const r = lintArchiveOutputStandard(join(root, "p", "features"));
    expect(r.violations.some((v) => v.rule === "archive-machine-file-in-root")).toBe(true);
    rmSync(root, { recursive: true });
  });

  test("flags deprecated frontmatter field", () => {
    const root = feature({ "archive.md": GOOD_ARCHIVE.replace('status: "草稿"', 'status: "草稿"\nproduct: "dataAssets"') });
    const r = lintArchiveOutputStandard(join(root, "p", "features"));
    expect(r.violations.some((v) => v.rule === "archive-frontmatter-deprecated")).toBe(true);
    rmSync(root, { recursive: true });
  });

  test("passes a clean archive", () => {
    const root = feature({ "archive.md": GOOD_ARCHIVE }, [".process"]);
    const r = lintArchiveOutputStandard(join(root, "p", "features"));
    expect(r.passed).toBe(true);
    rmSync(root, { recursive: true });
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test engine/tests/lint/archive-output-standard.test.ts`
Expected: FAIL —— `lintArchiveOutputStandard` 未定义。

- [ ] **Step 3: 写 lint 模块**

`engine/src/lint/archive-output-standard.ts`：
```typescript
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { CaseLintReport, CaseLintViolation } from "./types.ts";

const MACHINE_FILES = ["source-snapshot.json", "coverage-matrix.json"];
const ALLOWED_FRONTMATTER = new Set([
  "suite_name", "root_name", "module", "prd_version", "prd_id",
  "tags", "status", "create_at", "case_count", "origin",
]);
const TITLE_MACHINE_ID_RE = /\b(TC|SR|RA)-[A-Z0-9]/;
const PRIORITY_RE = /^【P\d】/;

function isDir(p: string): boolean {
  try { return statSync(p).isDirectory(); } catch { return false; }
}

function scanArchive(featureDir: string, violations: CaseLintViolation[]): void {
  const archivePath = join(featureDir, "archive.md");
  if (!existsSync(archivePath)) return;
  const lines = readFileSync(archivePath, "utf-8").split("\n");

  let inFrontmatter = false;
  let frontmatterDone = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // frontmatter field whitelist
    if (i === 0 && line.trim() === "---") { inFrontmatter = true; continue; }
    if (inFrontmatter && !frontmatterDone) {
      if (line.trim() === "---") { frontmatterDone = true; inFrontmatter = false; continue; }
      const kv = line.match(/^(\w[\w_]*)\s*:/);
      if (kv && !ALLOWED_FRONTMATTER.has(kv[1]!)) {
        violations.push({ rule: "archive-frontmatter-deprecated", file: archivePath, lineNumber: i + 1, matched: kv[1]!, severity: "warn", message: `frontmatter 字段 "${kv[1]}" 不在允许集，去除或改用 references/output-standard.md 规定字段` });
      }
      continue;
    }

    // case heading: ##### 【Pn】title
    const h5 = line.match(/^#####\s+(.+)$/);
    if (h5) {
      const title = h5[1]!.trim();
      const afterPriority = title.replace(PRIORITY_RE, "").trim();
      if (TITLE_MACHINE_ID_RE.test(afterPriority)) {
        violations.push({ rule: "archive-title-machine-id", file: archivePath, lineNumber: i + 1, matched: afterPriority.slice(0, 24), severity: "fail", message: "用例标题禁止机器标识（TC-/SR-/RA-）" });
      }
      // bracket semantics: 【】 only allowed as 【Pn】 prefix
      const stripped = title.replace(PRIORITY_RE, "");
      if (stripped.includes("【")) {
        violations.push({ rule: "archive-bracket-semantics", file: archivePath, lineNumber: i + 1, matched: "【", severity: "warn", message: "标题中【】仅用于【Pn】优先级前缀，UI 名用「」" });
      }
    }
  }
}

function scanMachineFilesInRoot(featureDir: string, violations: CaseLintViolation[]): void {
  for (const f of MACHINE_FILES) {
    if (existsSync(join(featureDir, f))) {
      violations.push({ rule: "archive-machine-file-in-root", file: join(featureDir, f), lineNumber: 1, matched: f, severity: "fail", message: `${f} 必须落 .process/，禁止污染 feature 根` });
    }
  }
}

export function lintArchiveOutputStandard(featuresGlobRoot: string): CaseLintReport {
  const violations: CaseLintViolation[] = [];
  let files = 0;
  // featuresGlobRoot 形如 <workspace>/<project>/features ；逐 feature 目录扫描
  const roots: string[] = [];
  if (isDir(featuresGlobRoot) && featuresGlobRoot.endsWith("features")) {
    roots.push(featuresGlobRoot);
  } else if (isDir(featuresGlobRoot)) {
    for (const proj of readdirSync(featuresGlobRoot)) {
      const fr = join(featuresGlobRoot, proj, "features");
      if (isDir(fr)) roots.push(fr);
    }
  }
  for (const fr of roots) {
    for (const fid of readdirSync(fr)) {
      const fdir = join(fr, fid);
      if (!isDir(fdir)) continue;
      if (!existsSync(join(fdir, "archive.md"))) continue;
      files += 1;
      scanArchive(fdir, violations);
      scanMachineFilesInRoot(fdir, violations);
    }
  }
  return { scanRoot: featuresGlobRoot, files, violations, passed: violations.length === 0 };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `bun test engine/tests/lint/archive-output-standard.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add engine/src/lint/archive-output-standard.ts engine/tests/lint/archive-output-standard.test.ts engine/tests/lint/fixtures/
git commit -m "feat: 🔍 add archive output-standard lint (title id / machine file / frontmatter)"
```

---

### Task 2.4: 把新 lint 接入 `kata cases lint`

**Files:**
- Modify: `engine/src/cli/cases-lint.ts`（import + `reports[]`）
- Test: `engine/tests/cli/cases-lint.test.ts`

- [ ] **Step 1: 更新聚合器测试期望（先红）**

`engine/tests/cli/cases-lint.test.ts`：新增用例——在临时 workspace 放一个标题带 `TC-` 的 archive，断言聚合 `lint` 结果含 `archive-title-machine-id` violation。（若该测试通过 CLI action 跑，则放在 `workspace/<proj>/features/<id>/archive.md` 临时夹具并断言输出含规则名。）

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test engine/tests/cli/cases-lint.test.ts`
Expected: FAIL —— 聚合器尚未调用新 lint。

- [ ] **Step 3: 接入聚合器**

`engine/src/cli/cases-lint.ts`：
- 顶部加 import：
```typescript
import { lintArchiveOutputStandard } from "../lint/archive-output-standard.ts";
```
- 在 `reports: any[] = [ ... ]` 数组末尾追加一项（按项目逐个扫，与 `opts.scope` 一致）：
```typescript
        ...projects.map((project) =>
          lintArchiveOutputStandard(join(workspaceLintRoot, project, "features")),
        ),
```
（放进 `reports` 数组的展开位置：把上面这段 `...projects.map(...)` 作为数组元素之一加入。`reports.flatMap((r) => r.violations)` 已能消费 `CaseLintReport`。）

- [ ] **Step 4: 跑测试确认通过**

Run: `bun test engine/tests/cli/cases-lint.test.ts`
Expected: PASS

- [ ] **Step 5: 跑全量 lint 自检（不应误报既有干净 feature）**

Run: `bun engine/bin/kata cases lint --scope workspace`
Expected: 退出码 0 路径下，新规则不对既有合规 archive 误报；若有 `archive-machine-file-in-root` 命中，说明既有 feature 仍把机器文件放根目录——记录但本次不批量回刷（YAGNI，spec §6）。

- [ ] **Step 6: Commit**

```bash
git add engine/src/cli/cases-lint.ts engine/tests/cli/cases-lint.test.ts
git commit -m "feat: 🔍 wire archive output-standard lint into kata cases lint"
```

---

### Task 2.5: 证据底线 AskUser 协议落 references

**Files:**
- Modify: `.ai/core/skills/case-draft/references/error-fallback-paths.md`
- Modify: `.ai/core/skills/case-draft/references/source-intake-protocol.md`

- [ ] **Step 1: 在 error-fallback-paths.md 增「证据底线」节**

新增一节，规定：当 Lanhu 设计内容抓取失败、或确认的源码仓库不可读时，**不进入推断产出最终档**，改用 `ask_user` 一次性批量索要：
- 「贴 Lanhu 设计内容/导出」
- 「提供 Lanhu cookie 或可读链接」
- 「上传设计截图」
- 「给可读源码路径/分支或把仓库 clone 到 .kata/repos」

只有拿到真实证据后才解除阻塞、产出 archive.md/cases.xmind；否则维持 blocking 草稿（落 `.process/archive.draft.md`）。

- [ ] **Step 2: 在 source-intake-protocol.md 引用该底线**

在抓取失败处理处加一句：抓取失败的关键设计证据按 references/error-fallback-paths.md「证据底线」走 ask_user 索要，不得静默降级为推断最终档。

- [ ] **Step 3: 重渲染 + lint**

Run:
```bash
bun engine/bin/kata ai-core projection render
bun engine/bin/kata ai-core projection lock render
bun run lint:ai-core
```
Expected: 退出码 0。

- [ ] **Step 4: Commit**

```bash
git add .ai/core/skills/case-draft/references/ .claude/skills/case-draft/ .agents/skills/case-draft/
git commit -m "docs: 🔒 add evidence-floor AskUser protocol to case-draft fallback paths"
```

---

### Task 2.6: 全量验收

**Files:** 无（验证）

- [ ] **Step 1: 全量测试**

Run: `bun test`
Expected: 全绿，无新增失败。

- [ ] **Step 2: biome + ai-core lint**

Run: `bun run check && bun run lint:ai-core`
Expected: 退出码 0。

- [ ] **Step 3: cases lint 自检**

Run: `bun run lint:cases`
Expected: 退出码 0（或仅既有未回刷 feature 的预期命中，新 feature 路径干净）。

- [ ] **Step 4: 收尾**

按 superpowers:finishing-a-development-branch 合并 worktree 回 main 并推送。

---

## Self-Review

**Spec 覆盖核对（spec v2 §4/§5）：**
- §4.1 文件集（4 + .process/）→ Task 1.1–1.5（机器文件移位）、Task 2.3/2.4（lint 守护 feature 根干净）。✅
- §4.2 frontmatter/层级/标题/括号 → Task 2.1（标准文）、2.2（hard_rules）、2.3（lint）。✅
- §4.3 内容质量（空预期等）→ Task 2.1/2.2（hard_rules + 标准），既有 `verifyL3Quality` 兜底空预期。✅
- §4.4 cases.xmind → Task 2.1（标准文，xmind-gen 派生）。✅
- §4.5 证据底线 → Task 2.5。✅
- §5.6 改造已合并稳定层 → Task 1.1–1.5。✅
- §5.5 收尾硬门 → Task 2.3/2.4。✅

**占位符扫描：** Task 1.5 / 2.4 的测试更新依赖读现有测试结构（已给出确切改法：路径加 `.process/`、新增断言规则名），非占位符；source 改动均给完整代码。

**类型一致性：** 新 lint 用 `CaseLintReport`/`CaseLintViolation`（types.ts 既有）；`lintArchiveOutputStandard(featuresGlobRoot)` 在 Task 2.3 定义、Task 2.4 调用，签名一致。`STABLE_CORE_ARTIFACTS` 单一来源（verify-layers），compare 自动跟随。
