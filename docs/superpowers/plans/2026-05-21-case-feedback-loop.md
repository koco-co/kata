# Case Feedback Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `/playwright-automation` 在工作流中按需产出 `case-corrections.md` 工件，并由新增的 `/case-edit apply-corrections` 子命令完成 dry-run 审批 + archive/xmind 回写，形成持续优化用例质量的半自治闭环。

**Architecture:** 解耦设计——playwright-automation 在 `run-triage` 后新增 `case-feedback` step，依据 plan-reconcile/ui-probe/run-triage 证据生成 `case-corrections.md`（pending）+ `case-corrections-summary.json`（sidecar）；handoff 渲染器读取 sidecar，把 Case Feedback 段落渲染到 handoff.md。`/case-edit` 新增子命令 `apply-corrections`，提供 dry-run summary 三选一交互、按 `status=approved` 逐条改写 archive.md、调用现有 archive-xmind-sync 同步 xmind、产出 `case-corrections-applied.md` 日志。corrections 摘要新建 `CaseCorrections@1` 严格 schema 校验；不动 `PlaywrightAutomationHandoff@2`（保持 v2）。

**Tech Stack:** Bun（test runner、TS）；Handlebars（handoff 模板）；既有 ai-core schema 注册系统；biome（lint）。

**Spec:** `docs/superpowers/specs/2026-05-20-case-feedback-loop-design.md`

---

## File Structure

新建：
- `.ai/core/schemas/CaseCorrections.v1.schema.json` — sidecar `case-corrections-summary.json` 的 strict schema。
- `.ai/core/skills/playwright-automation/references/case-feedback.md` — corrections 生成协议、schema、confidence 判定、去重策略。
- `.ai/core/skills/case-edit/references/apply-corrections.md` — dry-run summary、落地协议、apply-log schema、冲突跳过。
- `engine/tests/ai-core/case-feedback.test.ts` — playwright-automation reference / skill.yaml / plan-reconcile 规则调整的回归测试。
- `engine/tests/ai-core/apply-corrections.test.ts` — case-edit 子命令 / reference 表达完整性测试。
- `engine/tests/ai-core/case-corrections-schema.test.ts` — `CaseCorrections@1` schema 合规与样例校验。
- `engine/tests/ai-core/handoff-render-corrections.test.ts` — handoff render 在有/无 sidecar 两种情况下的输出对比。

修改：
- `.ai/core/schemas/registry.yaml` — 注册 `CaseCorrections@1`。
- `.ai/core/skills/playwright-automation/skill.yaml` — `outputs` 增加 `case_corrections`；`references` 增加 `case-feedback.md`。
- `.ai/core/skills/playwright-automation/references/plan-reconcile.md` — 第三步"不修改 archive"改为"写 corrections.md"。
- `.ai/core/skills/playwright-automation/references/handoff.md` — 末尾追加 Case Feedback 段落说明。
- `.ai/core/skills/case-edit/skill.yaml` — `outputs` 增加 `apply_corrections`；`references` 增加 `apply-corrections.md`。
- `.ai/core/skills/case-edit/references/archive-xmind-sync.md` — 增补"corrections 触发的同步"段落。
- `engine/src/cli/handoff-render.ts` — 检测 sidecar `case-corrections-summary.json` 并注入模板上下文 `case_feedback`。
- `engine/templates/handoff.md.hbs` — 在 Next Actions 后追加 `{{#if case_feedback}}` Case Feedback 段落。
- `.claude/`、`.agents/` projection 目录 — 由 `bun engine/bin/kata ai-core projection render` 自动重生成（不手改）。
- `.ai/core/projection.lock` — 由 `bun engine/bin/kata ai-core projection lock render` 重生成。

约定常量：
- corrections 文件位置：`workspace/<project>/features/<featureId>/results/<run-id>/case-corrections.md`
- corrections sidecar：`workspace/<project>/features/<featureId>/results/<run-id>/case-corrections-summary.json`
- apply-log：`workspace/<project>/features/<featureId>/results/<run-id>/case-corrections-applied.md`
- 8 类 category 取值：`ui_text_drift`、`business_rule`、`ambiguous_step`、`dependency_missing`、`unverifiable_assertion`、`wrong_priority`、`duplicate`、`missing_coverage`。
- confidence 取值：`high` / `medium` / `low`。
- status 取值分两个层级：
  - **文件级**（`case-corrections-summary.json` 的 `status` 字段、`case-corrections.md` 的 frontmatter `status` 字段，受 `CaseCorrections@1` schema 约束）：`pending`（默认）/ `applying` / `applied` / `aborted`。
  - **条目级**（`case-corrections.md` 中每条 `## C-NNN` 段落里的 `status` 行，仅 markdown，不进 schema 校验）：`pending`（默认）/ `approved` / `rejected` / `edited` / `applied`。`/case-edit apply-corrections` 只落地条目级 `approved` 的条目。

---

## Phase 1 — CaseCorrections Schema

### Task 1: 注册 CaseCorrections@1 schema（先写测试）

**Files:**
- Create: `engine/tests/ai-core/case-corrections-schema.test.ts`
- Create: `.ai/core/schemas/CaseCorrections.v1.schema.json`
- Modify: `.ai/core/schemas/registry.yaml`

- [ ] **Step 1: 写失败测试**

创建 `engine/tests/ai-core/case-corrections-schema.test.ts`：

```typescript
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = join(import.meta.dirname, "../../..");
const schemaPath = ".ai/core/schemas/CaseCorrections.v1.schema.json";

function loadSchema(): unknown {
  return JSON.parse(readFileSync(join(root, schemaPath), "utf8"));
}

describe("CaseCorrections@1 schema", () => {
  it("is registered in registry.yaml", () => {
    const registry = readFileSync(join(root, ".ai/core/schemas/registry.yaml"), "utf8");
    expect(registry).toContain("id: CaseCorrections@1");
    expect(registry).toContain(`path: ${schemaPath}`);
  });

  it("has $id CaseCorrections@1 and strict additionalProperties", () => {
    const schema = loadSchema() as Record<string, unknown>;
    expect(schema.$id).toBe("CaseCorrections@1");
    expect(schema.additionalProperties).toBe(false);
  });

  it("validates a minimal valid summary", () => {
    const ajv = new Ajv({ strict: false });
    addFormats(ajv);
    const validate = ajv.compile(loadSchema() as object);
    const ok = validate({
      schema: "CaseCorrections@1",
      feature_id: "2026-04-dq-builtin-reasonability-field-calc-compare",
      run_id: "20260520-1500-abcdef12",
      generated_at: "2026-05-20T15:00:00Z",
      generator: "playwright-automation@1",
      status: "pending",
      total: 2,
      by_category: {
        ui_text_drift: 1,
        business_rule: 1,
        ambiguous_step: 0,
        dependency_missing: 0,
        unverifiable_assertion: 0,
        wrong_priority: 0,
        duplicate: 0,
        missing_coverage: 0,
      },
      corrections_md: "results/20260520-1500-abcdef12/case-corrections.md",
      apply_command:
        "/case-edit apply-corrections workspace/dataAssets/features/2026-04-dq-builtin-reasonability-field-calc-compare 20260520-1500-abcdef12",
    });
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
  });

  it("rejects unknown category in by_category", () => {
    const ajv = new Ajv({ strict: false });
    addFormats(ajv);
    const validate = ajv.compile(loadSchema() as object);
    const ok = validate({
      schema: "CaseCorrections@1",
      feature_id: "2026-04-dq-builtin-reasonability-field-calc-compare",
      run_id: "20260520-1500-abcdef12",
      generated_at: "2026-05-20T15:00:00Z",
      generator: "playwright-automation@1",
      status: "pending",
      total: 1,
      by_category: { unknown_bucket: 1 },
      corrections_md: "results/20260520-1500-abcdef12/case-corrections.md",
      apply_command: "/case-edit apply-corrections x y",
    });
    expect(ok).toBe(false);
  });

  it("rejects status outside the allowed enum", () => {
    const ajv = new Ajv({ strict: false });
    addFormats(ajv);
    const validate = ajv.compile(loadSchema() as object);
    const ok = validate({
      schema: "CaseCorrections@1",
      feature_id: "2026-04-dq-builtin-reasonability-field-calc-compare",
      run_id: "20260520-1500-abcdef12",
      generated_at: "2026-05-20T15:00:00Z",
      generator: "playwright-automation@1",
      status: "draft",
      total: 0,
      by_category: {
        ui_text_drift: 0,
        business_rule: 0,
        ambiguous_step: 0,
        dependency_missing: 0,
        unverifiable_assertion: 0,
        wrong_priority: 0,
        duplicate: 0,
        missing_coverage: 0,
      },
      corrections_md: "results/x/case-corrections.md",
      apply_command: "/case-edit apply-corrections x y",
    });
    expect(ok).toBe(false);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
bun test engine/tests/ai-core/case-corrections-schema.test.ts
```

Expected: FAIL（schema 文件不存在 / registry 未注册）。

- [ ] **Step 3: 创建 schema 文件**

写入 `.ai/core/schemas/CaseCorrections.v1.schema.json`：

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "CaseCorrections@1",
  "type": "object",
  "required": [
    "schema",
    "feature_id",
    "run_id",
    "generated_at",
    "generator",
    "status",
    "total",
    "by_category",
    "corrections_md",
    "apply_command"
  ],
  "additionalProperties": false,
  "properties": {
    "schema": { "type": "string", "const": "CaseCorrections@1" },
    "feature_id": { "type": "string", "pattern": "^\\d{4}-\\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$" },
    "run_id": { "type": "string", "pattern": "^\\d{8}-\\d{4}-[a-z0-9]{8}$" },
    "generated_at": { "type": "string", "format": "date-time" },
    "generator": { "type": "string", "const": "playwright-automation@1" },
    "status": {
      "type": "string",
      "enum": ["pending", "applying", "applied", "aborted"]
    },
    "total": { "type": "integer", "minimum": 0 },
    "by_category": {
      "type": "object",
      "required": [
        "ui_text_drift",
        "business_rule",
        "ambiguous_step",
        "dependency_missing",
        "unverifiable_assertion",
        "wrong_priority",
        "duplicate",
        "missing_coverage"
      ],
      "additionalProperties": false,
      "properties": {
        "ui_text_drift": { "type": "integer", "minimum": 0 },
        "business_rule": { "type": "integer", "minimum": 0 },
        "ambiguous_step": { "type": "integer", "minimum": 0 },
        "dependency_missing": { "type": "integer", "minimum": 0 },
        "unverifiable_assertion": { "type": "integer", "minimum": 0 },
        "wrong_priority": { "type": "integer", "minimum": 0 },
        "duplicate": { "type": "integer", "minimum": 0 },
        "missing_coverage": { "type": "integer", "minimum": 0 }
      }
    },
    "corrections_md": { "type": "string", "minLength": 1 },
    "apply_command": { "type": "string", "pattern": "^/case-edit apply-corrections " }
  }
}
```

- [ ] **Step 4: 注册 schema**

在 `.ai/core/schemas/registry.yaml` 末尾、最后一个 schema 条目之后追加：

```yaml
  - id: CaseCorrections@1
    version: 1
    path: .ai/core/schemas/CaseCorrections.v1.schema.json
```

- [ ] **Step 5: 跑测试确认通过**

```bash
bun test engine/tests/ai-core/case-corrections-schema.test.ts
```

Expected: PASS（4 个 it 全部通过）。

也跑一遍 ai-core contract test 确保不破坏既有 schema：

```bash
bun test engine/tests/ai-core/contract-schema.test.ts
```

Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add .ai/core/schemas/CaseCorrections.v1.schema.json .ai/core/schemas/registry.yaml engine/tests/ai-core/case-corrections-schema.test.ts
git commit -m "feat: ✨ register CaseCorrections@1 schema for case feedback summary"
```

---

## Phase 2 — playwright-automation 侧（生成 corrections）

### Task 2: 调整 plan-reconcile 规则 — 禁止改 archive 改为写 corrections

**Files:**
- Modify: `.ai/core/skills/playwright-automation/references/plan-reconcile.md`
- Create: `engine/tests/ai-core/case-feedback.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `engine/tests/ai-core/case-feedback.test.ts`：

```typescript
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "../../..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("plan-reconcile reference allows corrections writeback", () => {
  it("removes the legacy ban on editing archive.md", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/plan-reconcile.md");
    expect(ref).not.toContain("不修改 archive.md 或 test-point-checklist.md");
  });

  it("documents that discrepancies flow into case-corrections.md", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/plan-reconcile.md");
    expect(ref).toContain("case-corrections.md");
    expect(ref).toContain("/case-edit apply-corrections");
  });

  it("still forbids modifying test-point-checklist.md", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/plan-reconcile.md");
    expect(ref).toContain("test-point-checklist.md");
    expect(ref).toMatch(/test-point-checklist\.md.*(不修改|不变|不动)/);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
bun test engine/tests/ai-core/case-feedback.test.ts
```

Expected: FAIL（legacy ban 仍在）。

- [ ] **Step 3: 修改 plan-reconcile.md**

打开 `.ai/core/skills/playwright-automation/references/plan-reconcile.md`，把第三步「冲突裁决原则」整段（4 条编号项）替换为：

```markdown
### 第三步：冲突裁决原则

当文档用例与 live UI 证据冲突时：

1. **以 live UI 证据为准**。Archive MD 和 PRD 是需求文档，不是真实 UI 事实。
2. **调整脚本基于 live UI 编写断言**。脚本永远跟着真实 UI 走。
3. **不直接修改 archive.md**：plan-reconcile 阶段不动 archive 内容，而是把发现的差异以结构化条目记入本次 run 的 `case-corrections.md`，由 `/case-edit apply-corrections` 在 case-feedback step 之后处理审批和回写。`case-corrections.md` 的字段定义见 `references/case-feedback.md`。
4. **不修改 test-point-checklist.md**：测试点清单不变，避免与 case-draft 契约打架。
5. **保留差异记录**：在 reconciliation 输出中写明 "文档说 X，UI 是 Y，已按 UI Y 调整脚本并入 corrections"。
```

- [ ] **Step 4: 跑测试确认通过**

```bash
bun test engine/tests/ai-core/case-feedback.test.ts
```

Expected: PASS（3 个 it 全部通过）。

- [ ] **Step 5: Commit**

```bash
git add .ai/core/skills/playwright-automation/references/plan-reconcile.md engine/tests/ai-core/case-feedback.test.ts
git commit -m "refactor: ♻️ route plan-reconcile discrepancies into case-corrections.md"
```

---

### Task 3: 新建 case-feedback reference

**Files:**
- Create: `.ai/core/skills/playwright-automation/references/case-feedback.md`
- Modify: `engine/tests/ai-core/case-feedback.test.ts`

- [ ] **Step 1: 扩展测试**

在 `engine/tests/ai-core/case-feedback.test.ts` 末尾追加一个 describe block：

```typescript
describe("case-feedback reference exists and covers required protocol", () => {
  it("file exists at expected path", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/case-feedback.md");
    expect(ref.length).toBeGreaterThan(0);
  });

  it("defines the 8 correction categories", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/case-feedback.md");
    for (const cat of [
      "ui_text_drift",
      "business_rule",
      "ambiguous_step",
      "dependency_missing",
      "unverifiable_assertion",
      "wrong_priority",
      "duplicate",
      "missing_coverage",
    ]) {
      expect(ref).toContain(cat);
    }
  });

  it("defines the 3 confidence levels", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/case-feedback.md");
    for (const lvl of ["high", "medium", "low"]) {
      expect(ref).toContain(`confidence: ${lvl}`);
    }
  });

  it("requires sidecar summary json with CaseCorrections@1 schema", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/case-feedback.md");
    expect(ref).toContain("case-corrections-summary.json");
    expect(ref).toContain("CaseCorrections@1");
  });

  it("specifies dedup against applied (filter) and rejected (mark + 3-strike) history", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/case-feedback.md");
    expect(ref).toContain("case-corrections-applied.md");
    expect(ref).toContain("previously_rejected");
    expect(ref).toMatch(/3 ?次|≥ ?3|>= ?3/);
  });

  it("forbids touching archive/xmind directly inside case-feedback step", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/case-feedback.md");
    expect(ref).toMatch(/不得.*archive\.md|禁止.*archive\.md/);
    expect(ref).toMatch(/不得.*xmind|禁止.*xmind/);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
bun test engine/tests/ai-core/case-feedback.test.ts
```

Expected: FAIL（reference 文件不存在）。

- [ ] **Step 3: 创建 case-feedback.md**

写入 `.ai/core/skills/playwright-automation/references/case-feedback.md`：

```markdown
# case-feedback

## 读取时机

仅当当前 workflow step id 等于 `case-feedback` 时读取。不得批量读取 `references/**`。

## 协议

case-feedback 在 `run-triage` 之后、`handoff` 之前执行。输入：plan-reconcile 的 discrepancies、ui-probe 的 observed_facts、run-triage 的归类、ui-probe 发现的未覆盖场景。输出：两份工件，写入当前 run 目录 `workspace/<project>/features/<featureId>/results/<run-id>/`：

1. `case-corrections.md` — pending 清单（人类可读、可手改 status）。
2. `case-corrections-summary.json` — 结构化摘要，符合 `CaseCorrections@1` schema，供 handoff render 渲染使用。

本 step **只生成工件**；不得直接修改 `archive.md`、`cases.xmind` 或 `test-point-checklist.md`，所有回写由 `/case-edit apply-corrections` 完成。也不得修改任何 `.kata/repos/**` 源码。

## 8 类 category

| category | 触发证据 | 典型问题描述 |
|---|---|---|
| `ui_text_drift` | live UI 文案与 archive 描述不一致 | 菜单名/按钮名/字段名漂移 |
| `business_rule` | run-triage 明确归类为 archive 描述错；或 probe 显示行为差异 | 前置条件错、步骤顺序错、预期错 |
| `ambiguous_step` | ui-probe 反复无法定位 | "配置好规则后..." 这类无法落地为操作的描述 |
| `dependency_missing` | probe 显式跳转到前置页或提示缺资源 | 用例未声明的必备前置（如先建规则集） |
| `unverifiable_assertion` | DOM 无可见元素承载预期 | 用例预期"数据正确"等不可 DOM 验证的内容 |
| `wrong_priority` | run-triage 标记 partial_automation；或 P0 实际无 E2E 价值 | P0/P1/P2 标错 |
| `duplicate` | 多 case 同 case_ref 或同语义不同文本 | 多条用例测同一点位 |
| `missing_coverage` | probe 命中 archive 完全未覆盖的入口 | 真实 UI 出现关键场景但用例没写 |

## 3 级 confidence

- `confidence: high` — 有 probe 截图 + locator 命中 + 文本/行为可机械比对。
- `confidence: medium` — 有 probe 证据但需主观判断（如"模糊步骤"是否应改）。
- `confidence: low` — 仅基于失败归因推断，无直接 UI 证据；产出但默认建议人工先判定。

## case-corrections.md 结构

每个 run 一份，frontmatter + 若干 correction 段落：

```markdown
---
feature: <featureId>
run_id: <run-id>
generated_at: <ISO 8601>
generator: playwright-automation@1
status: pending
total: N
by_category:
  ui_text_drift: 4
  business_rule: 2
  ambiguous_step: 1
  dependency_missing: 1
  unverifiable_assertion: 0
  wrong_priority: 1
  duplicate: 0
  missing_coverage: 2
---

# Case Corrections — <featureId> / <run-id>

## C-001  ui_text_drift  ★★★ (confidence: high)

- **case_ref**: archive.md#L120 / cases.xmind 节点 `数据质量 > 概览 > P0-1`
- **category**: ui_text_drift
- **doc_claim**: "进入【概览】页面"
- **observed_ui**: 实际菜单文本为 "数据质量概览"
- **evidence**: SR-UI-PROBE-001 (screenshots/ui-probe-overview.png 第 14 行)
- **proposed_change**:
  ```diff
  - 进入【概览】页面
  + 进入【数据质量概览】页面
  ```
- **rationale**: live UI 与 archive 文案不一致；脚本已按 live UI 调整。
- **status**: pending
- **user_note**:
- **previously_rejected**:
```

字段约束：
- `case_ref` 必须同时给 archive.md 行号 + cases.xmind 节点路径。
- `evidence` 必须引用 ui-probe 截图、locator 路径或 run-triage source_ref；不得为空。
- `category` 取值受限于上述 8 类。
- `status` 默认 `pending`；只有 `approved` 才会被 `/case-edit apply-corrections` 落地。
- `previously_rejected` 由本 step 在跨轮去重时自动填充。

## sidecar summary json

同目录写 `case-corrections-summary.json`，必须符合 `CaseCorrections@1` schema。示例：

```json
{
  "schema": "CaseCorrections@1",
  "feature_id": "2026-04-dq-builtin-reasonability-field-calc-compare",
  "run_id": "20260520-1500-abcdef12",
  "generated_at": "2026-05-20T15:00:00Z",
  "generator": "playwright-automation@1",
  "status": "pending",
  "total": 9,
  "by_category": {
    "ui_text_drift": 4,
    "business_rule": 2,
    "ambiguous_step": 1,
    "dependency_missing": 1,
    "unverifiable_assertion": 0,
    "wrong_priority": 1,
    "duplicate": 0,
    "missing_coverage": 0
  },
  "corrections_md": "results/20260520-1500-abcdef12/case-corrections.md",
  "apply_command": "/case-edit apply-corrections workspace/dataAssets/features/2026-04-dq-builtin-reasonability-field-calc-compare 20260520-1500-abcdef12"
}
```

`by_category` 所有 8 个键必须全部出现，缺失类计 0。

## 跨轮去重

生成新 corrections 前，扫描该 feature 下所有历史 run-id：

1. 已 `applied` 的条目（来自历史 `case-corrections-applied.md`）→ 按三元组 `(case_ref, doc_claim, proposed_change)` **直接过滤**，不再生成。
2. 历史 `case-corrections.md` 中 `status: rejected` 的条目 → 按同三元组**保留生成**，但在新条目填充 `previously_rejected: <prev_run_id>` 提示。
3. 同三元组若被 `rejected` 3 次或以上（统计全部历史 run）→ 视为终态噪音，新一轮直接过滤。

## 输出阈值

- 若本轮无任何可生成的 correction，仍写 `case-corrections-summary.json`（total=0、status=pending），方便 handoff render 渲染"无反哺"段落。
- 单轮 corrections 超过 50 条时，按 confidence 从高到低截断到前 50；超出部分写入同目录 `case-corrections-overflow.md` 仅作记录，不进 summary。

## 禁止

- 不得直接修改 archive.md、cases.xmind 或 test-point-checklist.md。
- 不得依据 archive/PRD 文字单方面判定 UI 错；必须有 ui-probe / run-triage 证据。
- 不得在 case-feedback step 调用 `/case-edit apply-corrections`（审批权在用户）。
- 不得为通过率而弱化 evidence 要求。
- 不得修改 `.kata/repos/{project}/**`。
```

- [ ] **Step 4: 跑测试确认通过**

```bash
bun test engine/tests/ai-core/case-feedback.test.ts
```

Expected: PASS（含原有 3 个 + 新增 6 个 it 共 9 个）。

- [ ] **Step 5: Commit**

```bash
git add .ai/core/skills/playwright-automation/references/case-feedback.md engine/tests/ai-core/case-feedback.test.ts
git commit -m "feat: ✨ add case-feedback reference for playwright-automation"
```

---

### Task 4: skill.yaml 接入 case-feedback step

**Files:**
- Modify: `.ai/core/skills/playwright-automation/skill.yaml`
- Modify: `engine/tests/ai-core/case-feedback.test.ts`

- [ ] **Step 1: 扩展测试**

在 `engine/tests/ai-core/case-feedback.test.ts` 末尾追加：

```typescript
describe("playwright-automation skill.yaml exposes case-feedback", () => {
  it("declares case_corrections as an output", () => {
    const yaml = read(".ai/core/skills/playwright-automation/skill.yaml");
    expect(yaml).toMatch(/outputs:[\s\S]*- case_corrections/);
  });

  it("references case-feedback.md with phase case-feedback", () => {
    const yaml = read(".ai/core/skills/playwright-automation/skill.yaml");
    expect(yaml).toContain("references/case-feedback.md");
    expect(yaml).toMatch(/load_phases:[\s\S]*- case-feedback/);
    expect(yaml).toContain("step.id == case-feedback");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
bun test engine/tests/ai-core/case-feedback.test.ts
```

Expected: FAIL（skill.yaml 尚未更新）。

- [ ] **Step 3: 修改 skill.yaml**

打开 `.ai/core/skills/playwright-automation/skill.yaml`：

(a) 把 `outputs:` 段（约第 17-21 行）改为：

```yaml
outputs:
  - plan
  - script
  - run
  - handoff
  - case_corrections
```

(b) 在 `references:` 列表末尾、最后一个 reference 条目之后追加：

```yaml
  - path: references/case-feedback.md
    type: normative
    load_phases:
      - case-feedback
    purpose: 生成 case-corrections.md 与 case-corrections-summary.json，覆盖 8 类 category、3 级 confidence、跨轮去重。
    load_when: step.id == case-feedback
```

- [ ] **Step 4: 跑测试确认通过**

```bash
bun test engine/tests/ai-core/case-feedback.test.ts
```

Expected: PASS（11 个 it 全部通过）。

也跑 surface 测试确保没破坏既有断言：

```bash
bun test engine/tests/ai-core/playwright-automation-surface.test.ts engine/tests/ai-core/playwright-automation-orchestration.test.ts
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add .ai/core/skills/playwright-automation/skill.yaml engine/tests/ai-core/case-feedback.test.ts
git commit -m "feat: ✨ wire case-feedback step into playwright-automation skill"
```

---

### Task 5: handoff reference 增加 Case Feedback 段落说明

**Files:**
- Modify: `.ai/core/skills/playwright-automation/references/handoff.md`
- Modify: `engine/tests/ai-core/case-feedback.test.ts`

- [ ] **Step 1: 扩展测试**

在 `engine/tests/ai-core/case-feedback.test.ts` 末尾追加：

```typescript
describe("handoff reference documents Case Feedback section", () => {
  it("mentions case-corrections-summary.json as the sidecar", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/handoff.md");
    expect(ref).toContain("case-corrections-summary.json");
  });

  it("includes the apply-corrections command form", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/handoff.md");
    expect(ref).toContain("/case-edit apply-corrections");
  });

  it("notes the Case Feedback section is rendered conditionally", () => {
    const ref = read(".ai/core/skills/playwright-automation/references/handoff.md");
    expect(ref).toMatch(/Case Feedback/);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
bun test engine/tests/ai-core/case-feedback.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 修改 handoff.md reference**

打开 `.ai/core/skills/playwright-automation/references/handoff.md`，在文件末尾追加：

```markdown

## Case Feedback section

case-feedback step 写入 sidecar `results/<run-id>/case-corrections-summary.json`（schema `CaseCorrections@1`）后，`kata handoff render` 会自动把 Case Feedback 段落渲染到 `handoff.md` 末尾，格式为：

```
## Case Feedback
- corrections: results/<run-id>/case-corrections.md (<total> pending)
- by_category: ui_text_drift=N, business_rule=N, ...
- 应用命令：/case-edit apply-corrections <feature_path> <run-id>
```

`total=0` 时段落仅写 `corrections: none`。该段落由 sidecar 数据驱动，不进 `handoff.json` schema（保持 `PlaywrightAutomationHandoff@2` 不变）。
```

- [ ] **Step 4: 跑测试确认通过**

```bash
bun test engine/tests/ai-core/case-feedback.test.ts
```

Expected: PASS（14 个 it 全部通过）。

- [ ] **Step 5: Commit**

```bash
git add .ai/core/skills/playwright-automation/references/handoff.md engine/tests/ai-core/case-feedback.test.ts
git commit -m "docs: 📝 document Case Feedback section in handoff reference"
```

---

## Phase 3 — case-edit 侧（apply-corrections）

### Task 6: 新建 apply-corrections reference

**Files:**
- Create: `.ai/core/skills/case-edit/references/apply-corrections.md`
- Create: `engine/tests/ai-core/apply-corrections.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `engine/tests/ai-core/apply-corrections.test.ts`：

```typescript
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "../../..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("apply-corrections reference defines the protocol", () => {
  it("file exists", () => {
    const ref = read(".ai/core/skills/case-edit/references/apply-corrections.md");
    expect(ref.length).toBeGreaterThan(0);
  });

  it("documents the dry-run summary three-choice prompt", () => {
    const ref = read(".ai/core/skills/case-edit/references/apply-corrections.md");
    expect(ref).toContain("proceed");
    expect(ref).toContain("edit first");
    expect(ref).toContain("abort");
  });

  it("only applies entries with status approved", () => {
    const ref = read(".ai/core/skills/case-edit/references/apply-corrections.md");
    expect(ref).toMatch(/status:\s*approved/);
  });

  it("writes case-corrections-applied.md log with before/after diff", () => {
    const ref = read(".ai/core/skills/case-edit/references/apply-corrections.md");
    expect(ref).toContain("case-corrections-applied.md");
    expect(ref).toMatch(/before|after/);
  });

  it("skips when doc_claim no longer matches archive (source_changed)", () => {
    const ref = read(".ai/core/skills/case-edit/references/apply-corrections.md");
    expect(ref).toContain("skipped: source_changed");
  });

  it("skips when already applied", () => {
    const ref = read(".ai/core/skills/case-edit/references/apply-corrections.md");
    expect(ref).toContain("skipped: already_applied");
  });

  it("calls archive-xmind-sync to propagate edits", () => {
    const ref = read(".ai/core/skills/case-edit/references/apply-corrections.md");
    expect(ref).toContain("archive-xmind-sync");
  });

  it("updates corrections.md frontmatter status to applied at the end", () => {
    const ref = read(".ai/core/skills/case-edit/references/apply-corrections.md");
    expect(ref).toMatch(/status:\s*applied/);
  });

  it("validates summary against CaseCorrections@1", () => {
    const ref = read(".ai/core/skills/case-edit/references/apply-corrections.md");
    expect(ref).toContain("CaseCorrections@1");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
bun test engine/tests/ai-core/apply-corrections.test.ts
```

Expected: FAIL（文件不存在）。

- [ ] **Step 3: 创建 apply-corrections.md**

写入 `.ai/core/skills/case-edit/references/apply-corrections.md`：

```markdown
# apply-corrections

## 调用

```
/case-edit apply-corrections <feature_path> <run-id>
```

例：

```
/case-edit apply-corrections workspace/dataAssets/features/2026-04-dq-builtin-reasonability-field-calc-compare 20260520-1500-abcdef12
```

## 读取时机

仅当 case-edit 子命令为 `apply-corrections` 时读取本 reference。不得在普通 case-edit 路径加载。

## 输入工件

- `<feature_path>/results/<run-id>/case-corrections.md` — pending 清单（必读）
- `<feature_path>/results/<run-id>/case-corrections-summary.json` — sidecar，必须符合 `CaseCorrections@1` schema（必读，用作 dry-run summary 数据源）
- `<feature_path>/archive.md` — 回写目标
- `<feature_path>/cases.xmind` — 回写同步目标
- 历史 `<feature_path>/results/*/case-corrections-applied.md` — 去重参考（只读）

若任一必读工件缺失，输出 `blocked_by_missing_artifact` 并停止。若 sidecar JSON 不符合 `CaseCorrections@1`，输出 `blocked_by_invalid_summary` 并停止。

## 执行流程

### 第一步：加载并校验

1. 读取 `case-corrections-summary.json`，按 `CaseCorrections@1` 校验。
2. 读取 `case-corrections.md`，解析 frontmatter；若 `status != pending`，提示当前状态并停止（不重复落地）。
3. 解析每条 correction，提取 `id`、`case_ref`、`category`、`confidence`、`doc_claim`、`proposed_change`、`status`、`user_note`、`previously_rejected`。

### 第二步：Dry-run summary

按 category 分组打印计数 + 每组前 3 条样例（C-id / confidence / doc_claim 前 60 字符 / 当前 status），然后输出三选一提示：

```
Case Corrections — <featureId> / <run-id>
Total: N (approved=A, pending=P, rejected=R, edited=E)

By category:
  ui_text_drift: 4
    C-001 ★★★ "进入【概览】页面..." [pending]
    C-005 ★★  "新建规则集 按钮..."   [approved]
    ...
  business_rule: 2
    ...

请选择：
- proceed  — 落地所有 status=approved 的条目
- edit first — 退出，请先编辑 case-corrections.md 调整 status / proposed_change 后重跑
- abort    — 不做任何改动，把 frontmatter status 改为 aborted
```

通过 AskUserQuestion 获取选择；若非交互模式不可用，回退为直接文本提示并等待下一次显式调用。

### 第三步：落地（仅 proceed 分支）

对每条 `status: approved` 的 correction：

1. **定位**：用 `case_ref` 的 archive.md 行号 + `doc_claim` 文本精确匹配。
   - 若行号与 doc_claim 都不匹配 → 跳过，记 `skipped: source_changed`。
2. **去重**：检查 `proposed_change` 的目标文本是否已是 archive 当前内容 → 跳过，记 `skipped: already_applied`。
3. **应用 diff**：用 Edit 工具按 `proposed_change` 的 diff 替换 archive.md 对应片段（仅替换 `doc_claim` 那一段文本，不动周围内容）。
4. **xmind 同步**：archive.md 所有 approved 条目改完后，按 `references/archive-xmind-sync.md` 现有契约同步到 `cases.xmind`，并跑现有自检（archive↔xmind 数量/优先级/标题/前置条件/步骤/预期 6 项一致）。
5. **xmind 同步失败**：回滚本轮所有 archive 改动（git restore），把失败原因写入 apply-log，输出 `failed_xmind_sync`。

### 第四步：写 apply-log

写 `<feature_path>/results/<run-id>/case-corrections-applied.md`：

```markdown
---
feature: <featureId>
run_id: <run-id>
applied_at: <ISO 8601>
applied_total: A
skipped_total: S
---

# Case Corrections Applied — <featureId> / <run-id>

## C-001 ui_text_drift  status=applied
- case_ref: archive.md#L120 / cases.xmind 节点 ...
- before:
  ```
  进入【概览】页面
  ```
- after:
  ```
  进入【数据质量概览】页面
  ```
- applied_at: 2026-05-20T15:42:11Z

## C-005 ui_text_drift  status=skipped
- case_ref: archive.md#L210 / cases.xmind 节点 ...
- skipped: source_changed
- detail: doc_claim 在 archive 中未找到精确匹配

## C-009 business_rule  status=skipped
- case_ref: archive.md#L340 / cases.xmind 节点 ...
- skipped: already_applied
- detail: proposed_change 的 after 文本已在 archive 当前内容
```

### 第五步：收尾

1. 把 `case-corrections.md` frontmatter 的 `status` 改为 `applied`。
2. 把 `case-corrections-summary.json` 的 `status` 改为 `applied`。
3. 输出本次的 applied / skipped 计数和 apply-log 路径。

abort 分支：跳过 3-4 步，仅把 frontmatter status 改为 `aborted`，写一份最小 apply-log 记录 abort 原因（"user_abort"）。

edit first 分支：什么都不改，直接结束，提示用户编辑后重跑。

## 冲突 / 并发

- doc_claim 不匹配 → `skipped: source_changed`，不阻塞其他条目。
- proposed_change 已应用 → `skipped: already_applied`。
- xmind 同步失败 → 整轮 archive 回滚。
- 同一 feature 多次 apply：每个 run-id 各自独立 apply-log，互不覆盖。

## 禁止

- 不得在非 proceed 分支修改 archive.md。
- 不得跳过 archive-xmind-sync 步骤。
- 不得修改 status 不为 `approved` 的条目。
- 不得修改 `test-point-checklist.md`、`manifest.json`、`metadata.yaml`、`.kata/repos/**`。
- 不得静默丢失任何 correction：每条 approved 必须出现在 apply-log 中（applied 或 skipped 之一）。
- 不得在 apply-log 之外修改原 `case-corrections.md` 的 correction 段落内容（只可改 frontmatter status）。
```

- [ ] **Step 4: 跑测试确认通过**

```bash
bun test engine/tests/ai-core/apply-corrections.test.ts
```

Expected: PASS（9 个 it 全部通过）。

- [ ] **Step 5: Commit**

```bash
git add .ai/core/skills/case-edit/references/apply-corrections.md engine/tests/ai-core/apply-corrections.test.ts
git commit -m "feat: ✨ add apply-corrections reference for case-edit"
```

---

### Task 7: case-edit skill.yaml 接入 apply-corrections

**Files:**
- Modify: `.ai/core/skills/case-edit/skill.yaml`
- Modify: `engine/tests/ai-core/apply-corrections.test.ts`

- [ ] **Step 1: 扩展测试**

在 `engine/tests/ai-core/apply-corrections.test.ts` 末尾追加：

```typescript
describe("case-edit skill.yaml exposes apply-corrections", () => {
  it("declares apply_corrections as an output", () => {
    const yaml = read(".ai/core/skills/case-edit/skill.yaml");
    expect(yaml).toMatch(/outputs:[\s\S]*- apply_corrections/);
  });

  it("references apply-corrections.md with phase apply-corrections", () => {
    const yaml = read(".ai/core/skills/case-edit/skill.yaml");
    expect(yaml).toContain("references/apply-corrections.md");
    expect(yaml).toMatch(/load_phases:[\s\S]*- apply-corrections/);
    expect(yaml).toContain("step.id == apply-corrections");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
bun test engine/tests/ai-core/apply-corrections.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 修改 skill.yaml**

打开 `.ai/core/skills/case-edit/skill.yaml`：

(a) 把 `outputs:` 段（约第 15-18 行）改为：

```yaml
outputs:
  - archive
  - xmind
  - normalized
  - apply_corrections
```

(b) 在 `references:` 列表末尾、`archive-xmind-sync.md` 条目之后追加：

```yaml
  - path: references/apply-corrections.md
    type: normative
    load_phases:
      - apply-corrections
    purpose: 加载 case-corrections.md + sidecar，进行 dry-run summary 三选一，按 status=approved 回写 archive.md，调用 archive-xmind-sync 同步 xmind，写 apply-log。
    load_when: step.id == apply-corrections
```

- [ ] **Step 4: 跑测试确认通过**

```bash
bun test engine/tests/ai-core/apply-corrections.test.ts
```

Expected: PASS（11 个 it 全部通过）。

- [ ] **Step 5: Commit**

```bash
git add .ai/core/skills/case-edit/skill.yaml engine/tests/ai-core/apply-corrections.test.ts
git commit -m "feat: ✨ wire apply-corrections subcommand into case-edit skill"
```

---

### Task 8: archive-xmind-sync 增补 corrections 触发段落

**Files:**
- Modify: `.ai/core/skills/case-edit/references/archive-xmind-sync.md`
- Modify: `engine/tests/ai-core/apply-corrections.test.ts`

- [ ] **Step 1: 扩展测试**

在 `engine/tests/ai-core/apply-corrections.test.ts` 末尾追加：

```typescript
describe("archive-xmind-sync covers corrections-triggered sync", () => {
  it("references case-corrections.md as a sync trigger", () => {
    const ref = read(".ai/core/skills/case-edit/references/archive-xmind-sync.md");
    expect(ref).toContain("case-corrections.md");
  });

  it("uses case_ref xmind path for node lookup", () => {
    const ref = read(".ai/core/skills/case-edit/references/archive-xmind-sync.md");
    expect(ref).toContain("case_ref");
    expect(ref).toMatch(/xmind 节点|xmind path/);
  });

  it("specifies rollback when xmind sync fails", () => {
    const ref = read(".ai/core/skills/case-edit/references/archive-xmind-sync.md");
    expect(ref).toMatch(/回滚|rollback/);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
bun test engine/tests/ai-core/apply-corrections.test.ts
```

Expected: FAIL。

- [ ] **Step 3: 修改 archive-xmind-sync.md**

打开 `.ai/core/skills/case-edit/references/archive-xmind-sync.md`，在文件末尾追加：

```markdown

## corrections 触发的同步

当 `/case-edit apply-corrections` 在落地阶段调用本同步契约时，xmind 节点定位以 `case-corrections.md` 中每条 correction 的 `case_ref` 字段为权威：`case_ref` 形如 `archive.md#L120 / cases.xmind 节点 数据质量 > 概览 > P0-1`，本同步过程必须按"cases.xmind 节点"分号后给出的节点路径直接定位 xmind topic，再把已修改的 archive 文本同步到该 topic 的 title/notes，不得重新解析 archive 全文反推映射。

同步前先快照 archive.md（可用 `git stash` 或临时副本）；若同步后 archive↔xmind 自检（数量、优先级、标题、前置条件、步骤、预期 6 项一致）失败，必须回滚 archive 改动到快照点，并在 apply-log 中标记 `failed_xmind_sync`，对应 correction status 不得置 applied。
```

- [ ] **Step 4: 跑测试确认通过**

```bash
bun test engine/tests/ai-core/apply-corrections.test.ts
```

Expected: PASS（14 个 it 全部通过）。

- [ ] **Step 5: Commit**

```bash
git add .ai/core/skills/case-edit/references/archive-xmind-sync.md engine/tests/ai-core/apply-corrections.test.ts
git commit -m "docs: 📝 cover corrections-triggered sync in archive-xmind-sync"
```

---

## Phase 4 — Handoff 渲染集成

### Task 9: handoff render 检测并注入 case_feedback 上下文

**Files:**
- Create: `engine/tests/ai-core/handoff-render-corrections.test.ts`
- Modify: `engine/src/cli/handoff-render.ts`
- Modify: `engine/templates/handoff.md.hbs`

- [ ] **Step 1: 写失败测试**

创建 `engine/tests/ai-core/handoff-render-corrections.test.ts`：

```typescript
import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runHandoffRender } from "../../src/cli/handoff-render.ts";

const validHandoff = {
  schema: "PlaywrightAutomationHandoff@2",
  feature_id: "2026-04-dq-builtin-reasonability-field-calc-compare",
  run_id: "20260520-1500-abcdef12",
  status: "passed",
  intent_id: "SR-INTENT-XYZ",
  source_refs: { intent: "SR-INTENT-XYZ", env: "SR-ENV-1", probe: "SR-PROBE-1", self_run: "SR-RUN-1" },
  run_command: "npx playwright test ... --headed",
  acceptance_command:
    "KATA_DATAASSETS_ENV=ltqc-local.yaml KATA_ACTIVE_PROJECT=dataAssets npx playwright test 'features/x/tests/runners/full.spec.ts' --project=chromium --headed --reporter=line",
  run_exit_code: 0,
  results: { total: 5, passed: 5, failed: 0, skipped: 0, report_paths: {} },
  quality_gates: [],
  unresolved_blockers: [],
  next_actions: [],
};

const validSummary = {
  schema: "CaseCorrections@1",
  feature_id: "2026-04-dq-builtin-reasonability-field-calc-compare",
  run_id: "20260520-1500-abcdef12",
  generated_at: "2026-05-20T15:00:00Z",
  generator: "playwright-automation@1",
  status: "pending",
  total: 7,
  by_category: {
    ui_text_drift: 4,
    business_rule: 2,
    ambiguous_step: 1,
    dependency_missing: 0,
    unverifiable_assertion: 0,
    wrong_priority: 0,
    duplicate: 0,
    missing_coverage: 0,
  },
  corrections_md: "results/20260520-1500-abcdef12/case-corrections.md",
  apply_command:
    "/case-edit apply-corrections workspace/dataAssets/features/2026-04-dq-builtin-reasonability-field-calc-compare 20260520-1500-abcdef12",
};

let workspaceRoot: string;
let runDir: string;

function setupBase() {
  workspaceRoot = mkdtempSync(join(tmpdir(), "kata-handoff-test-"));
  runDir = join(
    workspaceRoot,
    "dataAssets",
    "features",
    validHandoff.feature_id,
    "results",
    validHandoff.run_id,
  );
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, "handoff.json"), JSON.stringify(validHandoff), "utf8");
}

describe("handoff render Case Feedback section", () => {
  beforeAll(() => setupBase());
  afterAll(() => rmSync(workspaceRoot, { recursive: true, force: true }));

  it("omits Case Feedback section when sidecar is absent", async () => {
    await runHandoffRender({
      project: "dataAssets",
      featureId: validHandoff.feature_id,
      runId: validHandoff.run_id,
      workspaceRoot,
    });
    const md = readFileSync(join(runDir, "handoff.md"), "utf8");
    expect(md).not.toContain("## Case Feedback");
  });

  it("renders Case Feedback section with counts and apply command when sidecar exists", async () => {
    writeFileSync(
      join(runDir, "case-corrections-summary.json"),
      JSON.stringify(validSummary),
      "utf8",
    );
    await runHandoffRender({
      project: "dataAssets",
      featureId: validHandoff.feature_id,
      runId: validHandoff.run_id,
      workspaceRoot,
    });
    const md = readFileSync(join(runDir, "handoff.md"), "utf8");
    expect(md).toContain("## Case Feedback");
    expect(md).toContain("corrections: results/20260520-1500-abcdef12/case-corrections.md (7 pending)");
    expect(md).toContain("ui_text_drift=4");
    expect(md).toContain("business_rule=2");
    expect(md).toContain("/case-edit apply-corrections");
  });

  it("renders Case Feedback section with 'none' when total is zero", async () => {
    writeFileSync(
      join(runDir, "case-corrections-summary.json"),
      JSON.stringify({
        ...validSummary,
        total: 0,
        by_category: Object.fromEntries(
          Object.keys(validSummary.by_category).map((k) => [k, 0]),
        ),
      }),
      "utf8",
    );
    await runHandoffRender({
      project: "dataAssets",
      featureId: validHandoff.feature_id,
      runId: validHandoff.run_id,
      workspaceRoot,
    });
    const md = readFileSync(join(runDir, "handoff.md"), "utf8");
    expect(md).toContain("## Case Feedback");
    expect(md).toContain("corrections: none");
  });

  it("throws when sidecar exists but fails CaseCorrections@1 schema", async () => {
    writeFileSync(
      join(runDir, "case-corrections-summary.json"),
      JSON.stringify({ ...validSummary, status: "draft" }),
      "utf8",
    );
    await expect(
      runHandoffRender({
        project: "dataAssets",
        featureId: validHandoff.feature_id,
        runId: validHandoff.run_id,
        workspaceRoot,
      }),
    ).rejects.toThrow(/CaseCorrections@1/);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
bun test engine/tests/ai-core/handoff-render-corrections.test.ts
```

Expected: FAIL（4 个 it 全部失败：当前 render 不识别 sidecar）。

- [ ] **Step 3: 修改 handoff-render.ts**

打开 `engine/src/cli/handoff-render.ts`，整文件替换为：

```typescript
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import Handlebars from "handlebars";
import { repoRoot } from "../../lib/paths.ts";
import { loadHandoffV2Validator } from "../schemas/loaders.ts";

export interface HandoffRenderContext {
  project: string;
  featureId: string;
  runId: string;
  workspaceRoot: string;
}

const tmplPath = join(repoRoot(), "engine/templates/handoff.md.hbs");
const tmpl = Handlebars.compile(readFileSync(tmplPath, "utf-8"));
const validate = loadHandoffV2Validator();

const correctionsSchemaPath = join(
  repoRoot(),
  ".ai/core/schemas/CaseCorrections.v1.schema.json",
);
const correctionsAjv = new Ajv({ strict: false });
addFormats(correctionsAjv);
const validateCorrections = correctionsAjv.compile(
  JSON.parse(readFileSync(correctionsSchemaPath, "utf-8")),
);

interface CaseFeedbackContext {
  total: number;
  corrections_md: string;
  apply_command: string;
  by_category_line: string;
  is_empty: boolean;
}

function loadCaseFeedback(runDir: string): CaseFeedbackContext | null {
  const sidecarPath = join(runDir, "case-corrections-summary.json");
  if (!existsSync(sidecarPath)) {
    return null;
  }
  const summary = JSON.parse(readFileSync(sidecarPath, "utf-8"));
  if (!validateCorrections(summary)) {
    throw new Error(
      `case-corrections-summary.json invalid (CaseCorrections@1): ${JSON.stringify(validateCorrections.errors)}`,
    );
  }
  const byCategory = summary.by_category as Record<string, number>;
  const byCategoryLine = Object.entries(byCategory)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}=${n}`)
    .join(", ");
  return {
    total: summary.total,
    corrections_md: summary.corrections_md,
    apply_command: summary.apply_command,
    by_category_line: byCategoryLine || "none",
    is_empty: summary.total === 0,
  };
}

export async function runHandoffRender(ctx: HandoffRenderContext): Promise<{ path: string }> {
  const runDir = join(
    ctx.workspaceRoot,
    ctx.project,
    "features",
    ctx.featureId,
    "results",
    ctx.runId,
  );
  const jsonPath = join(runDir, "handoff.json");
  const data = JSON.parse(readFileSync(jsonPath, "utf-8"));
  if (!validate(data)) {
    throw new Error(`handoff.json schema invalid: ${JSON.stringify(validate.errors)}`);
  }
  const caseFeedback = loadCaseFeedback(runDir);
  const mdPath = join(runDir, "handoff.md");
  writeFileSync(mdPath, tmpl({ ...data, case_feedback: caseFeedback }), "utf-8");
  return { path: mdPath };
}
```

- [ ] **Step 4: 修改 handoff.md.hbs 模板**

打开 `engine/templates/handoff.md.hbs`，在 `## Next Actions` 段（约 32-39 行）之后、`## Run Command` 之前插入：

```handlebars
{{#if case_feedback}}
## Case Feedback
{{#if case_feedback.is_empty}}
- corrections: none
{{else}}
- corrections: {{case_feedback.corrections_md}} ({{case_feedback.total}} pending)
- by_category: {{case_feedback.by_category_line}}
- 应用命令：{{case_feedback.apply_command}}
{{/if}}

{{/if}}
```

- [ ] **Step 5: 跑测试确认通过**

```bash
bun test engine/tests/ai-core/handoff-render-corrections.test.ts
```

Expected: PASS（4 个 it 全部通过）。

也跑既有 handoff 相关测试避免回归：

```bash
bun test engine/tests/ai-core/playwright-automation-contracts.test.ts engine/tests/ai-core/contract-schema.test.ts
```

Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add engine/src/cli/handoff-render.ts engine/templates/handoff.md.hbs engine/tests/ai-core/handoff-render-corrections.test.ts
git commit -m "feat: ✨ render Case Feedback section from sidecar in handoff render"
```

---

## Phase 5 — Projection 与 CI

### Task 10: 渲染 projection

**Files:**
- 自动修改: `.claude/skills/playwright-automation/SKILL.md`、`.claude/skills/case-edit/SKILL.md`、`.agents/skills/playwright-automation/SKILL.md`、`.agents/skills/case-edit/SKILL.md` 及对应 reference 投影
- 自动修改: `.ai/core/projection.lock`

- [ ] **Step 1: 渲染投影**

```bash
bun engine/bin/kata ai-core projection render
```

Expected: 输出 `projection rendered`，且 `git status` 显示 `.claude/skills/`、`.agents/skills/` 下相关文件被更新。

- [ ] **Step 2: 重新生成 lock**

```bash
bun engine/bin/kata ai-core projection lock render
```

Expected: 输出 `lock regenerated`，`.ai/core/projection.lock` 内容被更新。

- [ ] **Step 3: 跑 projection 测试**

```bash
bun test engine/tests/ai-core/projection.test.ts engine/tests/ai-core/projection-diff.test.ts engine/tests/ai-core/projection-inventory.test.ts engine/tests/ai-core/projection-lock.test.ts
```

Expected: PASS。

- [ ] **Step 4: Commit**

```bash
git add .claude .agents .ai/core/projection.lock
git commit -m "chore: 🔧 re-render projection after case-feedback wiring"
```

---

### Task 11: 跑全量 lint + test 通过 CI 等价检查

**Files:** 无新增，仅校验。

- [ ] **Step 1: 跑 biome lint**

```bash
bun run check
```

Expected: PASS（无 lint 错误）。

如有 lint 错误，跑 `bun run check:fix` 自动修，再人工检查 diff。

- [ ] **Step 2: 跑 ai-core lint 子集**

```bash
bun run lint:ai-core
```

Expected: PASS。

- [ ] **Step 3: 跑 paths / agents / cases lint**

```bash
bun run lint:paths && bun run lint:agents && bun run lint:cases
```

Expected: PASS。

- [ ] **Step 4: 跑完整测试**

```bash
bun test
```

Expected: PASS（包含 Phase 1-4 新增的 4 个测试文件，所有既有测试不受回归）。

- [ ] **Step 5: 跑完整 CI 等价**

```bash
bun run ci
```

Expected: PASS。

- [ ] **Step 6: Commit (only if 上述任一步骤需要修复)**

如有修复，分别 commit：

```bash
git add <fixed files>
git commit -m "fix: 🩹 resolve lint/test issues from case-feedback wiring"
```

否则跳过本步。

---

## Phase 6 — 端到端冒烟（可选，依赖真实 feature）

### Task 12: 在已有 feature 上跑一次 case-feedback 与 apply-corrections 冒烟

**前置：** Phase 1-5 全部通过；选定一个已有 `archive.md` + `cases.xmind` + 历史 run 目录的 feature（建议：`workspace/dataAssets/features/2026-04-dq-builtin-reasonability-field-calc-compare/`）。

**Files:** 临时工件 only。

- [ ] **Step 1: 手工构造一份最小 sidecar 与 corrections.md 验证 render 与 apply 链路**

在 `workspace/dataAssets/features/<feature>/results/test-smoke-001/` 下创建：

`handoff.json`（最小合规 `PlaywrightAutomationHandoff@2`，可从历史 run 复制）；

`case-corrections-summary.json`：

```json
{
  "schema": "CaseCorrections@1",
  "feature_id": "<feature>",
  "run_id": "20260520-1500-deadbeef",
  "generated_at": "2026-05-20T15:00:00Z",
  "generator": "playwright-automation@1",
  "status": "pending",
  "total": 1,
  "by_category": {
    "ui_text_drift": 1,
    "business_rule": 0,
    "ambiguous_step": 0,
    "dependency_missing": 0,
    "unverifiable_assertion": 0,
    "wrong_priority": 0,
    "duplicate": 0,
    "missing_coverage": 0
  },
  "corrections_md": "results/test-smoke-001/case-corrections.md",
  "apply_command": "/case-edit apply-corrections workspace/dataAssets/features/<feature> test-smoke-001"
}
```

`case-corrections.md`：1 条 ui_text_drift 修正 + status=approved。

- [ ] **Step 2: 跑 handoff render 验证 Case Feedback 段落**

```bash
bun engine/bin/kata handoff render <feature> --run test-smoke-001
```

Expected: 输出 `handoff.md` 末尾出现 Case Feedback 段落，total=1，含 ui_text_drift=1 与 apply-corrections 命令。

- [ ] **Step 3: 跑 /case-edit apply-corrections（人工触发）**

在 Claude Code 会话里执行：

```
/case-edit apply-corrections workspace/dataAssets/features/<feature> test-smoke-001
```

预期：先看到 dry-run summary，回 `proceed` 后 archive.md 被修改、cases.xmind 同步、生成 `case-corrections-applied.md`，corrections.md frontmatter status 变 `applied`。

- [ ] **Step 4: 清理冒烟工件**

```bash
git restore workspace/dataAssets/features/<feature>/archive.md workspace/dataAssets/features/<feature>/cases.xmind
rm -rf workspace/dataAssets/features/<feature>/results/test-smoke-001
```

- [ ] **Step 5: 不 commit 冒烟工件**

冒烟结束不留任何痕迹；只用于本地验证。

---

## 验收 checklist（对照 spec §8）

- [ ] `/playwright-automation` 跑完一个 feature 后，若存在差异，自动生成 `results/<run-id>/case-corrections.md` 与 sidecar，且 sidecar 通过 `CaseCorrections@1` schema 校验 → Task 1, 3, 9 已实现路径与 schema；冒烟在 Task 12 验证。
- [ ] handoff 报告末尾出现 Case Feedback 段落 → Task 9 实现，Task 12 冒烟。
- [ ] 在 corrections.md 把若干条改为 `approved` 后跑 `/case-edit apply-corrections`，archive.md 与 cases.xmind 同步更新，apply-log 完整 → Task 6, 7, 8 reference 定义；Task 12 冒烟。
- [ ] 人为破坏 archive 后再 apply，被跳过的条目记录原因 → Task 6 reference 中 `skipped: source_changed` 路径。
- [ ] 同一 feature 跑第二轮，已经 applied 的 correction 不会再被生成；rejected 的带 `previously_rejected` 标记 → Task 3 reference 跨轮去重段落定义。
- [ ] 所有新增/修改的 reference 通过 `bun run lint:ai-core` 与 `bun test` → Task 11。
