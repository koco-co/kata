# T3 用例单源(cases.yaml + 派生流水线)实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 确立 `cases/需求名.yaml` 为用例唯一正式源,实现 `kata cases build/export` 派生 xmind/md/csv/xlsx,并提供从现有 archive.md 到 yaml 的一次性转换器。编辑从此只改 yaml。

**Architecture:** 定义 cases.yaml 结构(schema + TS 类型)。build 从 yaml 渲染 xmind(必)与 exports/md(必);export 按需渲染 csv/xlsx。转换器从 archive.md 解析为 yaml(T2 迁移调用)。全部 TDD,落在 T1 的 `cli/` 结构里。

**Tech Stack:** Bun、TypeScript、jszip(xmind)、exceljs、gray-matter、cli/(T1 基座)。

## Global Constraints

- cases.yaml 是唯一正式源;派生物带「由 build 生成,勿手改」头注,永不手改。
- 写文件必须经 `AtomicWriter`;路径必须经 `PathPolicy`。
- 转换器是一次性工具,迁移验证通过后移除。
- 公开 API 注释英文,内部注释中文。
- 遵循 worktree 工作流,不自动 push。

---

### Task 0: worktree

- [ ] **Step 1: 创建 worktree(基于已含 T1 的 main)**
```bash
cd /Users/poco/Projects/kata
git worktree add -b codex/t3-cases-source .worktrees/t3-cases-source main
cd .worktrees/t3-cases-source && bun install
```

---

### Task 1: cases.yaml 类型与解析器

**Files:**
- Create: `cli/lib/cases/types.ts`
- Create: `cli/lib/cases/parse.ts`(yaml ↔ 对象)
- Create: `cli/lib/cases/schema.ts`(结构校验)
- Test: `tests/cli/cases-parse.test.ts`

**Interfaces:**
- Produces:
  - `interface CasesFile { meta: CaseMeta; cases: CaseItem[] }`
  - `interface CaseMeta { title: string; version: string; feature_id: string; source?: string }`
  - `interface CaseItem { id: string; title: string; priority: "P0"|"P1"|"P2"; precondition?: string; steps: { action: string; expected: string }[]; tags?: string[]; source_ref?: string }`
  - `parseCasesYaml(yamlText: string): CasesFile`(非法结构抛 `CasesParseError`)
  - `validateCases(file: CasesFile): string[]`(返回问题列表,空 = 通过)

- [ ] **Step 1: 写失败测试(解析 + 校验)**
```ts
// tests/cli/cases-parse.test.ts
import { describe, expect, it } from "bun:test";
import { parseCasesYaml, validateCases } from "../../cli/lib/cases/parse.ts";

const GOOD = `
meta:
  title: 数据质量规则合并
  version: v6.4.11
  feature_id: f1
cases:
  - id: C001
    title: 验证单表行数校验通过
    priority: P0
    steps:
      - action: 进入数据质量页
        expected: 显示规则列表
`;

describe("parseCasesYaml", () => {
  it("parses a valid file", () => {
    const f = parseCasesYaml(GOOD);
    expect(f.cases).toHaveLength(1);
    expect(f.cases[0].priority).toBe("P0");
    expect(validateCases(f)).toEqual([]);
  });
  it("flags a case with no steps", () => {
    const f = parseCasesYaml(GOOD);
    f.cases.push({ id: "C002", title: "空", priority: "P1", steps: [] });
    expect(validateCases(f).length).toBeGreaterThan(0);
  });
  it("rejects bad priority", () => {
    const bad = GOOD.replace("P0", "P9");
    expect(() => parseCasesYaml(bad)).toThrow();
  });
});
```
- [ ] **Step 2: 确认失败**
```bash
bun test tests/cli/cases-parse.test.ts
```
- [ ] **Step 3: 实现 types/parse/schema(用 gray-matter 或 js-yaml;校验优先级枚举、id 唯一、至少一步、零用例报错)**
- [ ] **Step 4: 确认通过**
```bash
bun test tests/cli/cases-parse.test.ts
```
- [ ] **Step 5: Commit**
```bash
git add cli/lib/cases tests/cli/cases-parse.test.ts
git commit -m "feat(cases): add cases.yaml types, parser, validator"
```

---

### Task 2: kata cases build(yaml → xmind + md)

**Files:**
- Create: `cli/lib/cases/render-xmind.ts`
- Create: `cli/lib/cases/render-md.ts`
- Create: `cli/commands/cases-build.ts`(注册进 `cli/commands/cases.ts`)
- Test: `tests/cli/cases-build.test.ts`

**Interfaces:**
- Consumes: `parseCasesYaml`、`validateCases`(T1);`writeFileAtomic`(T1 基座)
- Produces:
  - `kata cases build --feature <dir>` — 读 `cases/需求名.yaml`,产出 `cases/需求名.xmind` 与 `cases/exports/需求名.md`
  - `renderXmind(file: CasesFile): Buffer`
  - `renderMarkdown(file: CasesFile): string`

- [ ] **Step 1: 写失败测试(build 产出两个文件,xmind 可解压、md 含头注与全部用例)**
```ts
// tests/cli/cases-build.test.ts
import { describe, expect, it } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const YAML = `
meta: { title: 需求名, version: v1, feature_id: f1 }
cases:
  - { id: C001, title: 用例一, priority: P0, steps: [ { action: a, expected: e } ] }
`;

function feature(): string {
  const d = mkdtempSync(join(tmpdir(), "kata-cb-"));
  mkdirSync(join(d, "cases"), { recursive: true });
  writeFileSync(join(d, "cases", "需求名.yaml"), YAML);
  return d;
}

describe("kata cases build", () => {
  it("produces xmind and exports/md from yaml", () => {
    const d = feature();
    const r = spawnSync("bun", ["cli/bin/kata.ts", "cases", "build", "--feature", d], { encoding: "utf8" });
    expect(r.status).toBe(0);
    expect(existsSync(join(d, "cases", "需求名.xmind"))).toBe(true);
    const md = readFileSync(join(d, "cases", "exports", "需求名.md"), "utf8");
    expect(md).toContain("由 build 生成");
    expect(md).toContain("用例一");
  });
  it("fails on zero cases", () => {
    const d = feature();
    writeFileSync(join(d, "cases", "需求名.yaml"), "meta: { title: t, version: v, feature_id: f }\ncases: []\n");
    const r = spawnSync("bun", ["cli/bin/kata.ts", "cases", "build", "--feature", d], { encoding: "utf8" });
    expect(r.status).not.toBe(0);
  });
});
```
- [ ] **Step 2: 确认失败**
```bash
bun test tests/cli/cases-build.test.ts
```
- [ ] **Step 3: 实现 render-xmind(复用 T1 迁移的 xmind-gen 渲染)+ render-md + build 命令;零用例返回非零**
- [ ] **Step 4: 确认通过**
```bash
bun test tests/cli/cases-build.test.ts
```
- [ ] **Step 5: Commit**
```bash
git add cli/lib/cases cli/commands tests/cli/cases-build.test.ts
git commit -m "feat(cases): add cases build yaml->xmind/md"
```

---

### Task 3: kata cases export(yaml → csv/xlsx,按需)

**Files:**
- Create: `cli/lib/cases/render-csv.ts`、`cli/lib/cases/render-xlsx.ts`
- Modify: `cli/commands/cases-build.ts`(加 export verb)
- Test: `tests/cli/cases-export.test.ts`

**Interfaces:**
- Produces: `kata cases export --feature <dir> --to csv|xlsx` → `cases/exports/需求名.{csv,xlsx}`

- [ ] **Step 1: 写失败测试(export csv 含全部用例行;xlsx 可生成)**
- [ ] **Step 2: 确认失败**
- [ ] **Step 3: 实现(复用 cases-convert 的 csv/xlsx 序列化)**
- [ ] **Step 4: 确认通过**
- [ ] **Step 5: Commit**
```bash
git commit -m "feat(cases): add cases export csv/xlsx"
```

---

### Task 4: archive.md → yaml 一次性转换器

**Files:**
- Create: `cli/lib/cases/from-archive.ts`(解析 archive.md 的 frontmatter + `#####` 用例块)
- Test: `tests/cli/cases-from-archive.test.ts`

**Interfaces:**
- Consumes: 现有 archive.md 格式(见 `.claude/prompt/_shared/case-format-sample.md`)
- Produces: `archiveToCasesYaml(mdText: string, meta: CaseMeta): string`(供 T2 迁移调用)

- [ ] **Step 1: 写失败测试(真实 archive 样例 → yaml 用例数/标题/步骤一致)**
```ts
// tests/cli/cases-from-archive.test.ts
import { describe, expect, it } from "bun:test";
import { archiveToCasesYaml } from "../../cli/lib/cases/from-archive.ts";
import { parseCasesYaml } from "../../cli/lib/cases/parse.ts";

const ARCHIVE = `---
case_count: 1
---
##### 【P0】验证单表行数校验通过
- 前置条件:已创建 Doris 数据源
- 测试步骤:
1. 进入数据质量页
- 预期结果:显示规则列表
`;

describe("archiveToCasesYaml", () => {
  it("converts archive cases to yaml preserving count", () => {
    const yaml = archiveToCasesYaml(ARCHIVE, { title: "t", version: "v", feature_id: "f" });
    const f = parseCasesYaml(yaml);
    expect(f.cases).toHaveLength(1);
    expect(f.cases[0].title).toContain("行数校验");
  });
});
```
- [ ] **Step 2: 确认失败**
- [ ] **Step 3: 实现解析器(对齐现有 archive 真实结构,抽样 3 份真实 archive.md 验证)**
- [ ] **Step 4: 确认通过 + 对 40 份真实 archive.md 干跑,记录解析失败数**
- [ ] **Step 5: Commit**
```bash
git commit -m "feat(cases): add archive->yaml one-shot converter"
```

---

### Task 5: 接线 T2 迁移 + 收尾

- [ ] **Step 1: 在 T2 迁移脚本中把 archive.md 的 `convert` 动作接到 `archiveToCasesYaml`**
- [ ] **Step 2: 全量测试**
```bash
bun test
```
- [ ] **Step 3: lint + type-check**
```bash
bun run check && bun run type-check
```
- [ ] **Step 4: 汇报用户,确认后合并**
```bash
cd /Users/poco/Projects/kata
git merge --no-ff codex/t3-cases-source
git worktree remove .worktrees/t3-cases-source && git branch -d codex/t3-cases-source
```
不 push。

---

## Self-Review 记录

- **Spec coverage**:设计第 13 节(用例正式源与导出关系)、第 17 节(archive→yaml 转换)、第 21 节验收 3(只改 yaml)。覆盖。
- **占位符**:无;build/转换器给了真实测试代码与命令。
- **类型一致**:`CasesFile/CaseMeta/CaseItem/parseCasesYaml/validateCases/renderXmind/renderMarkdown/archiveToCasesYaml` 命名在 Task 间一致;T2 的 `convert` 动作依赖的 `archiveToCasesYaml` 在 Task 4 定义。
- **依赖**:依赖 T1 的 cli/ 基座(AtomicWriter/PathPolicy/bin);T2 的 convert 依赖本计划 Task 4。
