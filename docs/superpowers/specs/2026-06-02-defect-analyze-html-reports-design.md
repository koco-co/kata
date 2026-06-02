# defect-analyze 三模式统一输出 HTML — 设计稿

- 日期：2026-06-02
- 范围：`defect-analyze` skill 的产物形态从「bug/conflict 出 markdown、diff 出 HTML」统一为三模式全部输出 `report.html`
- 决策来源：用户确认（方案 A 轻量 render-only / bug 默认 full variant 且三模版可切 / markdown 彻底换 HTML / 保留 4 个 hbs 模版 / 删除 GUIDE.md）

## 背景与问题

`defect-analyze` 按输入分三种模式：

- `bug`（异常堆栈/控制台报错/HTTP 失败）当前由 AI 直接写 `defect-report.md`，无工具、无 schema。
- `conflict`（合并冲突文本）当前由 AI 直接写 `conflict-resolution-plan.md`，无工具。
- `diff`（分支对静态扫描）由 `scan-report.ts` + `scan-report-render.ts` 渲染出 `report.html`，是唯一接了渲染器的链路。

`templates/` 下有 6 个产物模版，但只有 `scan-report.html.hbs` 被代码引用；`bug-report.html.hbs`、`bug-report-full.html.hbs`、`bug-report-zentao.html.hbs`、`conflict-report.html.hbs` **全历史零引用**（`git log -S "bug-report.html.hbs" -- '*.ts'` 为空）——它们是 `d9c4c1629` 当年作为「reusable templates」投机性添加、`df56fa6b7` 搬进 skill bundle，但渲染器一直只为 scan-report 建过。`templates/GUIDE.md` 同时引用了不存在的 `archive.md.hbs`（实在 case-draft）和一批已改名的旧 skill（test-case-gen / bug-report / hotfix-case-gen / static-scan / zentao 插件），整篇过时。

此外 `SKILL.md` 第 26、38 行声明 diff 模式产 `defect-report.md`，与实际 `scan-report.ts` 产 `report.html` **不一致**。

目标：让三模式统一输出 HTML，复活并接线那 4 个生产级模版，修正 SKILL.md 与代码的偏差，删除过时 GUIDE.md。

## §1 架构总览

三模式全部产 `report.html`，渲染层复刻已跑通的 scan-report 范式（读 hbs → 注册 helper → `Handlebars.compile` → 喂 typed context）：

| 模式 | 模版 | 数据类型 | 现状 |
| --- | --- | --- | --- |
| bug | `bug-report{,-full,-zentao}.html.hbs`（默认 full） | `BugReport`（新） | 新建渲染链 |
| conflict | `conflict-report.html.hbs` | `ConflictReport`（新） | 新建渲染链 |
| diff | `scan-report.html.hbs` | `ScanReport`（已存在） | **不动** |

方案：轻量 render-only —— 不建 CRUD store，AI 分诊后组装 JSON → 一条 CLI 命令**校验 + 渲染**。schema 校验守住 skill「无证据不入文」硬规则。

## §2 数据模型（`.claude/scripts/_shared/lib/bug-report-types.ts`）

字段**逆向自模版变量全集**（exhaustive scan 各 hbs 的 `{{...}}`/`{{#each}}`/`{{#if}}`），可选字段用 `?`，模版已用 `{{#if}}` 兜底缺省。沿用 `scan-report-types.ts` 房规（`SCHEMA_VERSION` 常量 + `interface` + readonly 枚举数组）。

```ts
export const BUG_REPORT_SCHEMA_VERSION = "1.0" as const;
export type BugVariant = "simple" | "full" | "zentao";
import type { Severity } from "./scan-report-types.ts"; // 复用，不重复声明

export interface BugReport {
  schema_version: typeof BUG_REPORT_SCHEMA_VERSION;
  title: string;
  severity: Severity;
  problem_type: string;          // badge-code / badge-env / badge-mix
  priority?: string;             // full / zentao 用
  confidence: number;            // [0,1]
  analysis_time: string;         // ISO-8601
  summary: string;
  root_cause: string;
  stack_trace?: {
    exception_type: string;
    exception_message: string;
    root_cause_frame: string;
    frames?: Array<{ class: string; method: string; line: number; description?: string; error?: string }>;
    trigger_handler?: string;
    note?: string;
  };
  request_info?: { url: string; method?: string; status_code: number; response_preview: string };
  environment?: { deploy_env: string };
  impacted_areas?: string[];
  evidence_refs?: string[];
  suggestion: string;
}

export interface ConflictReport {
  schema_version: typeof BUG_REPORT_SCHEMA_VERSION;
  title: string;
  analysis_time: string;
  summary: { total_conflicts: number; manual_required: number; auto_resolvable: number; files_affected: string[] };
  conflicts: Array<{
    id: string;
    conflict_id: string;
    file: string;
    line_range: string;
    type: string;
    description: string;
    head_intent: string;
    incoming_intent: string;
    branches: { incoming: string };
    decision_basis: string;
    suggestion: string;
    merged_code?: string;
  }>;
}
```

> 注：上述字段为依模版抽样草拟，实现时以「逐模版穷举变量 + render 冒烟测试无 `{{` 残留」为准，可能微调命名以对齐模版真实引用。

## §3 校验与渲染

### `.claude/scripts/_shared/lib/bug-report-validate.ts`

严格校验 JSON 是否满足类型契约，缺必填字段或类型错 → 抛 `invalid bug report: ...`（照 `scan-report-validate.ts` 的报错风格），CLI 据此非零退出。目的：渲染前拦住缺字段/虚构，落实「无证据不入文」。

### `.claude/scripts/_shared/lib/bug-report-render.ts`

复刻 `scan-report-render.ts` 结构：

- 注册模版需要的自定义 helper：`eq`（相等判断，模版大量用 `{{#eq}}`）、`severityClass`（severity → `severity-{critical|major|normal|low}` css class）；`unless`/`each`/`if` 为 Handlebars 内置无需注册。
- 按 `kind`（bug/conflict）+ `variant`（simple/full/zentao）解析模版路径：`repoRoot()/.claude/skills/defect-analyze/templates/<name>.html.hbs`。
- `Handlebars.compile` + 模块级 cache（与 scan-report 一致）。
- 导出 `renderBugReport(report: BugReport, variant: BugVariant): string` 与 `renderConflictReport(report: ConflictReport): string`。

## §4 CLI（`.claude/skills/defect-analyze/scripts/defect-report.ts`）

照 `scan-report.ts` 的 `createCli` + `export const program` 写新 CLI 模块，在 `cli/index.ts`（`kata.addCommand(scanReport)` 旁）`import { program as defectReport }` 并 `kata.addCommand(defectReport)` 注册。

```
kata defect-report render-bug      --json <bug.json> [--variant simple|full|zentao] --out <path>
kata defect-report render-conflict --json <conflicts.json> --out <path>
```

- `--variant` 默认 `full`。
- `--out` 默认落新桶 `workspace/{project}/_shared/archive/defects/{ym}-{slug}/report.html`，由 `paths.ts` 新增 `defectDir(project, yyyymm, slug)` 提供（与 diff 的 `auditDir` → `archive/audits/` 平行）；也可显式覆盖 `--out`。
- 命令流程：读 JSON → `validate` → `render` → 写 HTML → stdout 打印 `{ ok, out }`。

## §5 数据流

bug 模式：

1. AI 接异常堆栈 / 控制台报错 / HTTP 失败证据。
2. 分诊 → 组装 `BugReport` JSON；缺证据的字段**直接省略不虚构**，事实结论回指 `evidence_refs`。
3. `kata defect-report render-bug --json bug.json --variant full --out .../report.html`。
4. CLI 校验 → 渲染 → 写 `report.html`。

conflict 模式同理，喂 `ConflictReport` JSON 调 `render-conflict`。

## §6 SKILL.md / 模版 / GUIDE 改动

- **`SKILL.md`** §模式分诊 + §产物：三模式产物全改成 `report.html`（bug 标注默认 full variant、可切 simple/zentao），删去 `defect-report.md` / `conflict-resolution-plan.md` 字样。frontmatter 不动（仍在 11 字段白名单内，SKILL.md 远低于 300 行上限）。改动须确保 `bun run check:skills` 通过。
- **4 个 hbs 模版**：保留并接线（不再是死文件）。
- **`templates/GUIDE.md`**：删除（删后 templates/ 各模版有专属渲染器，无「选择」歧义；全仓无文件引用 GUIDE.md）。

## §7 测试（`.claude/scripts/_shared/tests/bug-report/`）

照 scan-report 测试范式：

- `render.test.ts`：三个 bug variant + conflict 各喂 fixture JSON，断言关键字段进了 HTML、**输出无 `{{` 残留**（helper / 字段全命中）。
- `validate.test.ts`：缺必填字段被拒、退出码 / 错误信息正确。
- fixtures：`bug-report.fixture.json`、`conflict-report.fixture.json`。

测试纪律遵循 `.claude/rules/testing.md`：改后即跑 `bun test .claude/scripts/_shared/tests/bug-report`，merge 前再跑全量 `bun test` + `bun run check` + `bun run check:skills`。

## §8 受影响文件清单

**新增**

- `.claude/scripts/_shared/lib/bug-report-types.ts`
- `.claude/scripts/_shared/lib/bug-report-validate.ts`
- `.claude/scripts/_shared/lib/bug-report-render.ts`
- `.claude/skills/defect-analyze/scripts/defect-report.ts`
- `.claude/scripts/_shared/tests/bug-report/render.test.ts`
- `.claude/scripts/_shared/tests/bug-report/validate.test.ts`
- fixtures（同目录）

**修改**

- `.claude/scripts/_shared/lib/paths.ts`（加 `defectDir()`）
- `.claude/scripts/_shared/cli/index.ts`（注册 `defectReport`）
- `.claude/skills/defect-analyze/SKILL.md`（§模式分诊 + §产物）
- `.agents/skills/defect-analyze` 镜像（如需与 `.claude` 同步）

**删除**

- `.claude/skills/defect-analyze/templates/GUIDE.md`

**保留并接线**

- `bug-report.html.hbs` / `bug-report-full.html.hbs` / `bug-report-zentao.html.hbs` / `conflict-report.html.hbs`

## §9 边界 / 非目标

- diff 模式（scan-report 整条链）**零改动**。
- 不建 CRUD store、不做报告增量编辑。
- 不碰 case-* / 其它 skill。
- `.agents` 下那份独立的 `scan-report.ts` 副本是否改为 symlink-canonical → 单独议题，不并入本次。

## 落地顺序

types → validate → render → CLI（含 `defectDir`）→ cli/index 注册 → SKILL.md → 删 GUIDE.md → 测试。批准后走 writing-plans 出详细分步 plan，再按项目 worktree-first 流程实现（detached worktree → 实现 → 测试 → `git merge --no-ff` → push → cleanup）。

