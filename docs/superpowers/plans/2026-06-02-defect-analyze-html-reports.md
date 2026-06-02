# defect-analyze 三模式统一输出 HTML Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 defect-analyze 的 bug / conflict / diff 三模式统一输出 `report.html`，复活并接线现有 4 个 hbs 模版，修正 SKILL.md 与代码的偏差，删除过时 GUIDE.md。

**Architecture:** 轻量 render-only —— 不建 CRUD store。新增 `bug-report-types.ts`（宽松 superset 类型，逆向自模版变量）+ `bug-report-validate.ts`（只卡少量公共必填）+ `bug-report-render.ts`（注册 `eq`/`gte` helper、注入计算字段 `severityClass`、按 variant 选模版），由新 CLI `defect-report.ts` 暴露 `render-bug` / `render-conflict`，注册进 kata CLI。diff 模式（scan-report 整条链）零改动。

**Tech Stack:** Bun ≥ 1.3、TypeScript、Handlebars（已是依赖）、commander（经 `@shared/lib/cli-runner.ts` 的 `createCli`）、bun:test。

**关键事实（实现时务必尊重，已逐模版穷举校准 spec §2/§3）：**
- `severityClass` 是**注入 context 的计算值**（`{{severityClass}}` 输出 + `{{#eq severityClass 'critical'}}` 比较），不是 helper。由 severity 映射：`critical→critical, major→major, normal→normal, minor→low`。
- 自定义 helper 是 `eq` 与 `gte`（`bug-report.html.hbs` 用 `{{#gte request_info.status_code 400}}`；`conflict-report.html.hbs` 用子表达式 `{{#if (eq this ../recommended)}}`）。`eq`/`gte` 必须**同时支持 block 与 inline 子表达式**两种调用。`if`/`unless`/`each` 是 Handlebars 内置。
- 三个 bug 模版不完全统一：simple 用 `stack_trace.caused_by_chain` + 顶层 `root_cause`；full/zentao 用 `stack_trace.call_chain`（每帧 `{class,method,line,error,description,is_entry,is_root}`）+ `priority_label`；zentao 把 `confidence` 当枚举串（high/medium/low）比较。**用一个 superset 类型喂全部 variant，模版自身 `{{#if}}` 兜底缺省字段；Handlebars 从原始 JSON 渲染，TS 类型只服务 validate 与作者，多余 JSON 字段照样渲染。**

---

## File Structure

| 文件 | 责任 | 动作 |
| --- | --- | --- |
| `.claude/scripts/_shared/lib/bug-report-types.ts` | BugReport / ConflictReport / BugVariant / 版本常量 | 新增 |
| `.claude/scripts/_shared/lib/bug-report-validate.ts` | 渲染前宽松校验（卡公共必填，拦虚构/缺字段） | 新增 |
| `.claude/scripts/_shared/lib/bug-report-render.ts` | 注册 helper、注入 severityClass、选模版、compile+render | 新增 |
| `.claude/scripts/_shared/lib/paths.ts` | 加 `defectDir()`（`_shared/archive/defects/{ym}-{slug}/`） | 修改 |
| `.claude/skills/defect-analyze/scripts/defect-report.ts` | CLI：`render-bug` / `render-conflict` | 新增 |
| `.claude/scripts/_shared/cli/index.ts` | 注册 `defectReport` 子命令 | 修改 |
| `.claude/skills/defect-analyze/SKILL.md` | §模式分诊 + §产物 改为 report.html | 修改 |
| `.claude/skills/defect-analyze/templates/GUIDE.md` | 过时，删除 | 删除 |
| `.claude/scripts/_shared/tests/bug-report/*` | 类型/校验/渲染/CLI 测试 + fixtures | 新增 |

---

## Task 1: 数据类型 bug-report-types.ts

**Files:**
- Create: `.claude/scripts/_shared/lib/bug-report-types.ts`

- [ ] **Step 1: 写类型文件**

```ts
/**
 * Type contracts for defect-analyze bug & conflict HTML reports.
 * Fields are a permissive superset reverse-engineered from the Handlebars
 * templates (bug-report{,-full,-zentao}.html.hbs, conflict-report.html.hbs);
 * variant templates guard optional fields with {{#if}}. Handlebars renders
 * from the raw parsed JSON, so extra fields pass through; these types serve
 * authoring + validation only.
 */
import type { Severity } from "./scan-report-types.ts";

export const BUG_REPORT_SCHEMA_VERSION = "1.0" as const;

export type BugVariant = "simple" | "full" | "zentao";
export const BUG_VARIANTS: readonly BugVariant[] = ["simple", "full", "zentao"];

export interface StackFrame {
  class?: string;
  method?: string;
  line?: number | string;
  error?: string;
  description?: string;
  is_entry?: boolean;
  is_root?: boolean;
}

export interface FixSuggestion {
  action?: string;
  reason?: string;
  detail?: string;
  location?: string;
}

export interface BugReport {
  title: string;
  severity: Severity;
  problem_type: string; // 代码问题 | 环境问题 | 混合
  priority?: number | string;
  priority_label?: string;
  confidence?: number | string; // number in simple; 'high'|'medium'|'low' in zentao
  confidence_reason?: string;
  analysis_time?: string;
  summary: string;
  root_cause?: string; // simple variant
  stack_trace?: {
    exception_type?: string;
    exception_message?: string;
    root_cause_frame?: string;
    trigger_handler?: string;
    note?: string;
    caused_by_chain?: string[]; // simple
    call_chain?: StackFrame[]; // full / zentao
  };
  request_info?: {
    url?: string;
    method?: string;
    status_code?: number;
    params?: string;
    response_preview?: string;
  };
  environment?: {
    deploy_env?: string;
    framework?: string;
    java_version?: string;
    source_ref?: string;
  };
  code_location?: {
    file?: string;
    line?: number | string;
    snippet?: string;
    analysis?: string;
    evidence?: string;
    evidence_code?: string;
  };
  location?: string;
  fix_suggestions?: FixSuggestion[];
}

export interface ConflictItem {
  id: string;
  conflict_id?: string;
  file: string;
  line_range?: string;
  type: string; // 逻辑冲突 | 格式冲突 | 依赖冲突
  description: string;
  head_intent?: string;
  incoming_intent?: string;
  branches?: { head?: string; incoming?: string };
  decision_basis?: string;
  suggestion?: string;
  merged_code?: string;
  resolution?: "auto" | "manual";
}

export interface ManualDecision {
  recommended?: string;
  options?: string[];
}

export interface ConflictReport {
  title: string;
  analysis_time?: string;
  summary: {
    total_conflicts: number;
    manual_required: number;
    auto_resolvable: number;
    files_affected: string[];
  };
  conflicts: ConflictItem[];
  manual_decision_list?: ManualDecision[];
}
```

- [ ] **Step 2: 类型编译通过**

Run: `bun run type-check`
Expected: PASS（无新增类型错误）

- [ ] **Step 3: Commit**

```bash
git add .claude/scripts/_shared/lib/bug-report-types.ts
git commit -m "feat: 🧩 add BugReport/ConflictReport type contracts for defect-analyze HTML"
```

---

## Task 2: paths.defectDir()

**Files:**
- Modify: `.claude/scripts/_shared/lib/paths.ts`（在 `auditDir`/`auditFile` 之后追加）
- Test: `.claude/scripts/_shared/tests/bug-report/paths.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, test } from "bun:test";
import { defectDir } from "@shared/lib/paths.ts";

describe("defectDir", () => {
  test("points to the project defects bucket", () => {
    const dir = defectDir("dtstack", "202606", "bug_order-npe");
    expect(dir).toContain("/_shared/archive/defects/202606-bug_order-npe");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test .claude/scripts/_shared/tests/bug-report/paths.test.ts`
Expected: FAIL（`defectDir` is not exported / not a function）

- [ ] **Step 3: 实现 defectDir**

在 `paths.ts` 中 `auditFile` 函数之后追加（复用同文件已有的 `projectDir` 与 `join`）：

```ts
/**
 * Bug/conflict defect report bucket. HTML reports for bug & conflict modes.
 * workspace/{project}/_shared/archive/defects/{yyyymm}-{slug}/.
 */
export function defectDir(project: string, yyyymm: string, slug: string): string {
  return join(projectDir(project), "_shared", "archive", "defects", `${yyyymm}-${slug}`);
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `bun test .claude/scripts/_shared/tests/bug-report/paths.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .claude/scripts/_shared/lib/paths.ts .claude/scripts/_shared/tests/bug-report/paths.test.ts
git commit -m "feat: 🧩 add defectDir() path helper for bug/conflict reports"
```

---

## Task 3: 校验 bug-report-validate.ts

**Files:**
- Create: `.claude/scripts/_shared/lib/bug-report-validate.ts`
- Test: `.claude/scripts/_shared/tests/bug-report/validate.test.ts`

宽松策略：只卡渲染必需的公共字段，其余可选透传（守「无证据不入文」同时不阻塞 variant 差异）。

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, test } from "bun:test";
import { validateBugReport, validateConflictReport } from "@shared/lib/bug-report-validate.ts";

describe("validateBugReport", () => {
  test("accepts a valid minimal report", () => {
    expect(() =>
      validateBugReport({ title: "t", severity: "major", problem_type: "代码问题", summary: "s" }),
    ).not.toThrow();
  });
  test("rejects missing title", () => {
    expect(() =>
      validateBugReport({ severity: "major", problem_type: "代码问题", summary: "s" }),
    ).toThrow(/title required/);
  });
  test("rejects invalid severity", () => {
    expect(() =>
      validateBugReport({ title: "t", severity: "blocker", problem_type: "代码问题", summary: "s" }),
    ).toThrow(/severity must be one of/);
  });
});

describe("validateConflictReport", () => {
  test("accepts a valid report", () => {
    expect(() =>
      validateConflictReport({
        title: "t",
        summary: { total_conflicts: 1, manual_required: 0, auto_resolvable: 1, files_affected: ["a"] },
        conflicts: [{ id: "c-1", file: "a", type: "逻辑冲突", description: "d" }],
      }),
    ).not.toThrow();
  });
  test("rejects conflict missing id", () => {
    expect(() =>
      validateConflictReport({
        title: "t",
        summary: { total_conflicts: 1, manual_required: 0, auto_resolvable: 1, files_affected: [] },
        conflicts: [{ file: "a", type: "逻辑冲突", description: "d" }],
      }),
    ).toThrow(/conflicts\[0\]\.id required/);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test .claude/scripts/_shared/tests/bug-report/validate.test.ts`
Expected: FAIL（模块/导出不存在）

- [ ] **Step 3: 实现校验**

```ts
import { SEVERITIES } from "./scan-report-types.ts";
import type { BugReport, ConflictReport } from "./bug-report-types.ts";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

export function validateBugReport(input: unknown): BugReport {
  if (typeof input !== "object" || input === null) {
    throw new Error("invalid bug report: not an object");
  }
  const r = input as Record<string, unknown>;
  if (!isNonEmptyString(r.title)) throw new Error("invalid bug report: title required");
  if (!isNonEmptyString(r.summary)) throw new Error("invalid bug report: summary required");
  if (!isNonEmptyString(r.problem_type)) throw new Error("invalid bug report: problem_type required");
  if (typeof r.severity !== "string" || !SEVERITIES.includes(r.severity as never)) {
    throw new Error(`invalid bug report: severity must be one of ${SEVERITIES.join("|")}`);
  }
  return input as BugReport;
}

export function validateConflictReport(input: unknown): ConflictReport {
  if (typeof input !== "object" || input === null) {
    throw new Error("invalid conflict report: not an object");
  }
  const r = input as Record<string, unknown>;
  if (!isNonEmptyString(r.title)) throw new Error("invalid conflict report: title required");
  const summary = r.summary as Record<string, unknown> | undefined;
  if (!summary || typeof summary.total_conflicts !== "number") {
    throw new Error("invalid conflict report: summary.total_conflicts required");
  }
  if (!Array.isArray(r.conflicts)) {
    throw new Error("invalid conflict report: conflicts must be an array");
  }
  (r.conflicts as unknown[]).forEach((c, i) => {
    const cc = c as Record<string, unknown>;
    if (!isNonEmptyString(cc.id)) throw new Error(`invalid conflict report: conflicts[${i}].id required`);
    if (!isNonEmptyString(cc.file)) throw new Error(`invalid conflict report: conflicts[${i}].file required`);
    if (!isNonEmptyString(cc.type)) throw new Error(`invalid conflict report: conflicts[${i}].type required`);
    if (!isNonEmptyString(cc.description))
      throw new Error(`invalid conflict report: conflicts[${i}].description required`);
  });
  return input as ConflictReport;
}
```

> `SEVERITIES` 来自 `scan-report-types.ts`，值为 `["critical","major","normal","minor"]`。

- [ ] **Step 4: 跑测试确认通过**

Run: `bun test .claude/scripts/_shared/tests/bug-report/validate.test.ts`
Expected: PASS（4 个用例）

- [ ] **Step 5: Commit**

```bash
git add .claude/scripts/_shared/lib/bug-report-validate.ts .claude/scripts/_shared/tests/bug-report/validate.test.ts
git commit -m "feat: 🧩 add lenient validation for bug/conflict reports"
```

---

## Task 4: 渲染 bug-report-render.ts + fixtures

**Files:**
- Create: `.claude/scripts/_shared/lib/bug-report-render.ts`
- Create: `.claude/scripts/_shared/tests/bug-report/bug-report.fixture.json`
- Create: `.claude/scripts/_shared/tests/bug-report/conflict-report.fixture.json`
- Test: `.claude/scripts/_shared/tests/bug-report/render.test.ts`

- [ ] **Step 1: 写两个 fixture（覆盖 superset 字段，喂全部 variant）**

`bug-report.fixture.json`：

```json
{
  "title": "NPE in OrderService.calculateTotal",
  "severity": "major",
  "problem_type": "代码问题",
  "priority": 2,
  "priority_label": "高",
  "confidence": 0.82,
  "confidence_reason": "堆栈直指空指针来源帧",
  "analysis_time": "2026-06-02T10:00:00Z",
  "summary": "下单计算总价时空指针导致 500",
  "root_cause": "couponList 未判空即遍历",
  "stack_trace": {
    "exception_type": "NullPointerException",
    "exception_message": "Cannot invoke size() on null",
    "root_cause_frame": "OrderService.calculateTotal(OrderService.java:88)",
    "trigger_handler": "OrderController.submit",
    "note": "仅在无优惠券时触发",
    "caused_by_chain": ["couponService.list 返回 null", "calculateTotal 未判空"],
    "call_chain": [
      { "class": "OrderController", "method": "submit", "line": 42, "is_entry": true },
      { "class": "OrderService", "method": "calculateTotal", "line": 88, "is_root": true, "error": "NPE here" }
    ]
  },
  "request_info": {
    "url": "/api/order/submit",
    "method": "POST",
    "status_code": 500,
    "params": "{\"orderId\":123}",
    "response_preview": "{\"code\":500,\"msg\":\"系统异常\"}"
  },
  "environment": {
    "deploy_env": "测试环境",
    "framework": "Spring Boot 2.7",
    "java_version": "11",
    "source_ref": "release_6.3.x@a1b2c3d"
  },
  "code_location": {
    "file": "OrderService.java",
    "line": 88,
    "snippet": "for (Coupon c : couponList) { ... }",
    "analysis": "couponList 来自外部服务，可能为 null",
    "evidence": "couponService.list javadoc 标注 nullable",
    "evidence_code": "List<Coupon> list() // @Nullable"
  },
  "location": "OrderService.java:88",
  "fix_suggestions": [
    { "action": "对 couponList 判空", "reason": "避免遍历 null", "detail": "Optional.ofNullable(...).orElse(emptyList)", "location": "calculateTotal 入口" }
  ]
}
```

`conflict-report.fixture.json`：

```json
{
  "title": "release_6.3.x 合并 feature/order-refactor 冲突",
  "analysis_time": "2026-06-02T10:00:00Z",
  "summary": {
    "total_conflicts": 2,
    "manual_required": 1,
    "auto_resolvable": 1,
    "files_affected": ["OrderService.java", "pom.xml"]
  },
  "conflicts": [
    {
      "id": "c-001",
      "conflict_id": "OrderService#calculateTotal",
      "file": "OrderService.java",
      "line_range": "80-95",
      "type": "逻辑冲突",
      "description": "两边都改了总价计算",
      "head_intent": "加优惠券判空",
      "incoming_intent": "改税率计算顺序",
      "branches": { "head": "release_6.3.x", "incoming": "feature/order-refactor" },
      "decision_basis": "两处修改正交，可合并",
      "suggestion": "保留判空 + 新税率顺序",
      "merged_code": "if (couponList != null) { ... } applyTax();",
      "resolution": "manual"
    },
    {
      "id": "c-002",
      "conflict_id": "pom.xml#deps",
      "file": "pom.xml",
      "line_range": "30-34",
      "type": "依赖冲突",
      "description": "版本号冲突",
      "head_intent": "升级到 2.7.5",
      "incoming_intent": "保持 2.7.3",
      "branches": { "head": "release_6.3.x", "incoming": "feature/order-refactor" },
      "decision_basis": "取较高版本",
      "suggestion": "用 2.7.5",
      "resolution": "auto"
    }
  ],
  "manual_decision_list": [
    {
      "recommended": "保留判空 + 新税率顺序",
      "options": ["保留判空 + 新税率顺序", "只保留判空", "只保留新税率顺序"]
    }
  ]
}
```

- [ ] **Step 2: 写失败测试**

```ts
import { describe, expect, test } from "bun:test";
import { renderBugReport, renderConflictReport } from "@shared/lib/bug-report-render.ts";
import { validateBugReport, validateConflictReport } from "@shared/lib/bug-report-validate.ts";
import bugFixture from "./bug-report.fixture.json";
import conflictFixture from "./conflict-report.fixture.json";

describe("renderBugReport", () => {
  for (const variant of ["simple", "full", "zentao"] as const) {
    test(`renders ${variant} with no unresolved handlebars`, () => {
      const html = renderBugReport(validateBugReport(bugFixture), variant);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain(bugFixture.title);
      expect(html).not.toContain("{{");
    });
  }
  test("injects severityClass (minor -> low)", () => {
    const html = renderBugReport(validateBugReport({ ...bugFixture, severity: "minor" }), "zentao");
    expect(html).toContain("severity-low");
    expect(html).not.toContain("{{");
  });
});

describe("renderConflictReport", () => {
  test("renders conflict report with no unresolved handlebars", () => {
    const html = renderConflictReport(validateConflictReport(conflictFixture));
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain(conflictFixture.title);
    expect(html).not.toContain("{{");
  });
});
```

- [ ] **Step 3: 跑测试确认失败**

Run: `bun test .claude/scripts/_shared/tests/bug-report/render.test.ts`
Expected: FAIL（render 模块不存在）

- [ ] **Step 4: 实现渲染**

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Handlebars from "handlebars";
import { repoRoot } from "./paths.ts";
import type { BugReport, BugVariant, ConflictReport } from "./bug-report-types.ts";
import type { Severity } from "./scan-report-types.ts";

const VARIANT_TEMPLATE: Record<BugVariant, string> = {
  simple: "bug-report.html.hbs",
  full: "bug-report-full.html.hbs",
  zentao: "bug-report-zentao.html.hbs",
};
const CONFLICT_TEMPLATE = "conflict-report.html.hbs";

const SEVERITY_CLASS: Record<Severity, string> = {
  critical: "critical",
  major: "major",
  normal: "normal",
  minor: "low",
};

let helpersRegistered = false;
function registerHelpers(): void {
  if (helpersRegistered) return;
  // eq: 支持 block ({{#eq a b}}…{{/eq}}) 与 inline 子表达式 ((eq a b))
  Handlebars.registerHelper("eq", function (this: unknown, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
    const equal = a === b;
    if (options && typeof options.fn === "function") return equal ? options.fn(this) : options.inverse(this);
    return equal;
  });
  // gte: 数值 >=，同样兼容 block 与 inline
  Handlebars.registerHelper("gte", function (this: unknown, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
    const pass = typeof a === "number" && typeof b === "number" && a >= b;
    if (options && typeof options.fn === "function") return pass ? options.fn(this) : options.inverse(this);
    return pass;
  });
  helpersRegistered = true;
}

const cache = new Map<string, HandlebarsTemplateDelegate>();
function getTemplate(file: string): HandlebarsTemplateDelegate {
  const cached = cache.get(file);
  if (cached) return cached;
  registerHelpers();
  const src = readFileSync(join(repoRoot(), ".claude/skills/defect-analyze/templates", file), "utf8");
  const tpl = Handlebars.compile(src);
  cache.set(file, tpl);
  return tpl;
}

export function renderBugReport(report: BugReport, variant: BugVariant = "full"): string {
  const severityClass = SEVERITY_CLASS[report.severity] ?? "normal";
  return getTemplate(VARIANT_TEMPLATE[variant])({ ...report, severityClass });
}

export function renderConflictReport(report: ConflictReport): string {
  return getTemplate(CONFLICT_TEMPLATE)(report);
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `bun test .claude/scripts/_shared/tests/bug-report/render.test.ts`
Expected: PASS（5 个用例）。若出现 `{{` 残留断言失败 → 说明某模版变量/helper 未覆盖，回到模版穷举核对缺失字段或 helper，**不得删断言绕过**。

- [ ] **Step 6: Commit**

```bash
git add .claude/scripts/_shared/lib/bug-report-render.ts .claude/scripts/_shared/tests/bug-report/
git commit -m "feat: 🧩 render bug/conflict HTML reports via existing hbs templates"
```

---

## Task 5: CLI defect-report.ts

**Files:**
- Create: `.claude/skills/defect-analyze/scripts/defect-report.ts`
- Test: `.claude/scripts/_shared/tests/bug-report/cli.test.ts`

参照 `.claude/skills/defect-analyze/scripts/scan-report.ts` 的 `createCli` + `export const program` 范式。`--out` 优先；缺省时由 `--project/--yyyymm/--slug` 经 `defectDir` 计算 `report.html` 路径。

- [ ] **Step 1: 写失败测试（e2e：跑 CLI 入口，断言写出 HTML 文件）**

```ts
import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { repoRoot } from "@shared/lib/paths.ts";
import bugFixture from "./bug-report.fixture.json";

const CLI = join(repoRoot(), ".claude/skills/defect-analyze/scripts/defect-report.ts");

describe("defect-report render-bug CLI", () => {
  test("writes a report.html for a valid bug fixture", async () => {
    const dir = mkdtempSync(join(tmpdir(), "defect-cli-"));
    const jsonPath = join(dir, "bug.json");
    const outPath = join(dir, "report.html");
    writeFileSync(jsonPath, JSON.stringify(bugFixture), "utf8");

    const proc = Bun.spawn(["bun", CLI, "render-bug", "--json", jsonPath, "--variant", "full", "--out", outPath]);
    const code = await proc.exited;

    expect(code).toBe(0);
    expect(existsSync(outPath)).toBe(true);
    const html = readFileSync(outPath, "utf8");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).not.toContain("{{");
  });

  test("exits non-zero on invalid severity", async () => {
    const dir = mkdtempSync(join(tmpdir(), "defect-cli-"));
    const jsonPath = join(dir, "bad.json");
    writeFileSync(jsonPath, JSON.stringify({ title: "t", severity: "blocker", problem_type: "代码问题", summary: "s" }), "utf8");

    const proc = Bun.spawn(["bun", CLI, "render-bug", "--json", jsonPath, "--out", join(dir, "out.html")], {
      stderr: "pipe",
    });
    const code = await proc.exited;
    expect(code).not.toBe(0);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test .claude/scripts/_shared/tests/bug-report/cli.test.ts`
Expected: FAIL（CLI 文件不存在）

- [ ] **Step 3: 实现 CLI**

```ts
#!/usr/bin/env bun
/**
 * defect-report.ts — defect-analyze bug/conflict-mode HTML report render.
 *
 * Subcommands: render-bug / render-conflict
 * Contract: .claude/skills/defect-analyze/SKILL.md (§产物)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createCli } from "@shared/lib/cli-runner.ts";
import { BUG_VARIANTS, type BugVariant } from "@shared/lib/bug-report-types.ts";
import { renderBugReport, renderConflictReport } from "@shared/lib/bug-report-render.ts";
import { validateBugReport, validateConflictReport } from "@shared/lib/bug-report-validate.ts";
import { defectDir } from "@shared/lib/paths.ts";

function fail(code: number, msg: string): never {
  process.stderr.write(`${msg}\n`);
  process.exit(code);
}

function ensureParent(p: string): void {
  const d = dirname(p);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function loadJson(path: string): unknown {
  if (!existsSync(path)) fail(1, `[defect-report] json not found: ${path}`);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    fail(1, `[defect-report] invalid JSON: ${(e as Error).message}`);
  }
}

interface OutOpts {
  out?: string;
  project?: string;
  yyyymm?: string;
  slug?: string;
}

function resolveOut(opts: OutOpts): string {
  if (opts.out) return opts.out;
  if (opts.project && opts.yyyymm && opts.slug) {
    return join(defectDir(opts.project, opts.yyyymm, opts.slug), "report.html");
  }
  fail(1, "[defect-report] need --out, or --project + --yyyymm + --slug");
}

const outOptions = [
  { flag: "--out <path>", description: "output report.html path" },
  { flag: "--project <name>", description: "project (with --yyyymm/--slug, computes default out)" },
  { flag: "--yyyymm <ym>", description: "yyyymm (for default out path)" },
  { flag: "--slug <slug>", description: "report slug (for default out path)" },
];

export const program = createCli({
  name: "defect-report",
  description: "defect-analyze bug/conflict-mode HTML report render",
  commands: [
    {
      name: "render-bug",
      description: "Render a bug-mode HTML report from a BugReport JSON",
      options: [
        { flag: "--json <path>", description: "path to BugReport JSON", required: true },
        { flag: "--variant <v>", description: "simple | full | zentao (default full)" },
        ...outOptions,
      ],
      action: (opts: OutOpts & { json: string; variant?: string }) => {
        const variant = (opts.variant ?? "full") as BugVariant;
        if (!BUG_VARIANTS.includes(variant)) {
          fail(1, `[defect-report] invalid variant: ${opts.variant} (expect ${BUG_VARIANTS.join("|")})`);
        }
        const report = validateBugReport(loadJson(opts.json));
        const out = resolveOut(opts);
        ensureParent(out);
        writeFileSync(out, renderBugReport(report, variant), "utf8");
        process.stdout.write(`${JSON.stringify({ ok: true, out, variant })}\n`);
      },
    },
    {
      name: "render-conflict",
      description: "Render a conflict-mode HTML report from a ConflictReport JSON",
      options: [{ flag: "--json <path>", description: "path to ConflictReport JSON", required: true }, ...outOptions],
      action: (opts: OutOpts & { json: string }) => {
        const report = validateConflictReport(loadJson(opts.json));
        const out = resolveOut(opts);
        ensureParent(out);
        writeFileSync(out, renderConflictReport(report), "utf8");
        process.stdout.write(`${JSON.stringify({ ok: true, out })}\n`);
      },
    },
  ],
});

if (import.meta.main) {
  program.parseAsync(process.argv);
}
```

> 校验失败会从 `validateBugReport`/`validateConflictReport` 抛出 Error。`createCli` 默认会让未捕获异常以非零码退出（与 scan-report 行为一致）；若实测退出码为 0，则在 action 内对 validate 包 try/catch 后 `fail(2, …)`，照 scan-report.ts `add-bug` 的 `invalid bug:` 处理范式。实现后以 Step 2 的「invalid severity」用例验证退出码。

- [ ] **Step 4: 跑测试确认通过**

Run: `bun test .claude/scripts/_shared/tests/bug-report/cli.test.ts`
Expected: PASS（2 个用例）

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/defect-analyze/scripts/defect-report.ts .claude/scripts/_shared/tests/bug-report/cli.test.ts
git commit -m "feat: 🧩 add defect-report CLI (render-bug/render-conflict)"
```

---

## Task 6: 注册进 kata CLI

**Files:**
- Modify: `.claude/scripts/_shared/cli/index.ts`（参照 `scanReport` 的 import + `kata.addCommand`）

- [ ] **Step 1: 加 import**

在现有 `import { program as scanReport } from "@skills/defect-analyze/scripts/scan-report.ts";` 之后追加：

```ts
import { program as defectReport } from "@skills/defect-analyze/scripts/defect-report.ts";
```

- [ ] **Step 2: 注册命令**

在现有 `kata.addCommand(scanReport);` 之后追加：

```ts
kata.addCommand(defectReport);
```

- [ ] **Step 3: 验证命令挂载**

Run: `bun .claude/scripts/_shared/bin/kata defect-report render-bug --help`
Expected: 打印 `render-bug` 用法（含 `--json`、`--variant`、`--out`），退出 0

- [ ] **Step 4: Commit**

```bash
git add .claude/scripts/_shared/cli/index.ts
git commit -m "feat: 🧩 register defect-report command in kata CLI"
```

---

## Task 7: 更新 SKILL.md + 删除 GUIDE.md + 同步 .agents

**Files:**
- Modify: `.claude/skills/defect-analyze/SKILL.md`
- Delete: `.claude/skills/defect-analyze/templates/GUIDE.md`
- Sync: `.agents/skills/defect-analyze/`（按闸门输出处理）

- [ ] **Step 1: 改 SKILL.md §模式分诊**

将现有三行（`.claude/skills/defect-analyze/SKILL.md` 第 24–26 行）替换为：

```markdown
- `bug`：异常堆栈、控制台错误、HTTP 失败等可复现 bug 证据 → 组装 BugReport JSON → `kata defect-report render-bug`（默认 full variant，可切 simple/zentao）产 `report.html`。
- `conflict`：带合并冲突标记的文本 → 组装 ConflictReport JSON → `kata defect-report render-conflict` 产 `report.html`。
- `diff`：仓库 diff / 分支对 / 变更文件集要求静态扫描 → fork 一个 general-purpose 子代理执行扫描，经 `kata scan-report` 产 `report.html`。
```

- [ ] **Step 2: 改 SKILL.md §产物**

将现有两行（第 38–39 行）替换为：

```markdown
- bug 模式 → `report.html`（bug-report 模版，默认 full variant；根因 + evidence_refs + impacted_areas 编入 JSON）。
- diff 模式 → `report.html`（scan-report 模版，根因 + evidence_refs + impacted_areas）。
- conflict 模式 → `report.html`（conflict-report 模版，含 side_a / side_b 与 resolution_plan）。
```

- [ ] **Step 3: 删除 GUIDE.md**

```bash
git rm .claude/skills/defect-analyze/templates/GUIDE.md
```

- [ ] **Step 4: 同步 .agents 镜像并跑闸门**

`.agents/skills/defect-analyze/` 是独立副本。把本任务对 `SKILL.md` 的改动、新增 `scripts/defect-report.ts`、删除 `templates/GUIDE.md` 同步到 `.agents/skills/defect-analyze/` 对应位置（保持与 `.claude` 一致）。然后跑闸门，按输出消解 drift：

Run: `bun run check:skills && bun run lint:agents && bun run lint:skills:codex`
Expected: 全部 PASS（exit 0）。若报 .agents 与 .claude 不一致，按报告把缺失/多余文件补齐或删除后重跑。

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/defect-analyze/SKILL.md .agents/skills/defect-analyze
git commit -m "docs: 📝 switch defect-analyze products to report.html; drop stale GUIDE.md"
```

---

## Task 8: 全量验证闸门

**Files:** 无（仅验证）

- [ ] **Step 1: 跑本特性测试 + 全量测试**

Run: `bun test .claude/scripts/_shared/tests/bug-report && bun test`
Expected: 全 PASS（含既有用例，无回归）

- [ ] **Step 2: 跑 lint / typecheck / skill 契约闸门**

Run: `bun run check && bun run type-check && bun run check:skills && bun run lint:agents && bun run lint:skills:codex`
Expected: 全 PASS。任何失败必须排查根因修复（见 `.claude/rules/testing.md`），不得 skip。

- [ ] **Step 3: 冒烟一条真实 bug 渲染（人工眼检产物）**

Run（用 Task 4 的 fixture）：
```bash
bun .claude/scripts/_shared/bin/kata defect-report render-bug \
  --json .claude/scripts/_shared/tests/bug-report/bug-report.fixture.json \
  --variant full --out /tmp/defect-smoke.html
```
Expected: stdout `{"ok":true,...}`；打开 `/tmp/defect-smoke.html` 确认卡片样式正常、无 `{{` 残留、severity 配色生效。

- [ ] **Step 4: 最终确认（无新增改动则免提交）**

若前述步骤产生修复改动，按对应 type/emoji 提交；否则进入合并流程。

---

## Self-Review（已对 spec 逐节核对）

- **§1 架构 / §4 CLI**：Task 5–6 实现 `render-bug`/`render-conflict` 并注册，bug 默认 full variant ✓。
- **§2 数据模型**：Task 1 类型按穷举校准（superset + 可选），优于 spec 草稿 ✓（spec §2 已声明「以逐模版穷举为准」）。
- **§3 校验 / 渲染**：Task 3–4，helper 修正为 `eq`+`gte`、`severityClass` 改为注入 context 值（spec §3 原写 `eq`+`severityClass helper` 不准，本 plan 为准）✓。
- **§5 数据流**：Task 7 SKILL.md 写明「组装 JSON → render 命令」流程 ✓。
- **§6 SKILL/模版/GUIDE**：Task 7 改产物声明 + 删 GUIDE.md + 接线 4 模版 ✓。
- **§7 测试**：Task 3/4/5 覆盖 validate/render/CLI + fixtures；Task 8 全量闸门 ✓。
- **§8 边界**：diff 链零改动（仅 §模式分诊措辞同步）、不建 CRUD、不碰 case-*、.agents canonical 化单列 ✓。
- **类型一致性**：`BugReport`/`ConflictReport`/`BugVariant`/`BUG_VARIANTS`/`defectDir`/`renderBugReport`/`renderConflictReport`/`validateBugReport`/`validateConflictReport` 全任务签名一致 ✓。
- **占位符扫描**：无 TBD/TODO；每个改码步骤含完整代码 ✓。

> 注：`.agents` 那份独立 `scan-report.ts` 副本是否改为 symlink-canonical 属 spec §8 列明的独立议题，不在本 plan 范围。

## 落地约束（项目 worktree-first）

实现走 detached worktree：先 `git worktree add --detach .worktrees/<slug> main`，symlink `.kata` 后在 worktree 内逐任务实现 + 测试 + 分批 commit；全绿后记录 HEAD SHA，回主树 `git merge --no-ff <sha>`，重跑 `bun test` + 闸门，`git push origin main`，最后 `git worktree remove`。每个任务的 commit 用上方给定的 type/emoji。
