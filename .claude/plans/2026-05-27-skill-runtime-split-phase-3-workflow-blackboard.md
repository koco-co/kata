# Skill 运行目录拆分第三阶段 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 case-draft 的隐式长流程下沉为 `docs/skills/contracts/workflows/case-draft.yaml` 唯一规范源，并建立配套的 blackboard 状态模型与 workflow check 检查器；本阶段只完成基础设施 + 试点 case-draft，其他 skill 延期。

**Architecture:** 第三阶段先做 workflow/blackboard 的最小可机器校验骨架。`docs/skills/contracts/workflows/<name>.yaml` 是 workflow 唯一规范源，`docs/skills/workflows/<name>.md` 是与 yaml 对齐的人工 review 文档，`engine/src/skills/workflow-check.ts` 用 yaml 校验 .md 一致性；blackboard 第一版以 `docs/skills/blackboard/state-model.md` 和 `docs/skills/contracts/schemas/blackboard-state.json` 文档化共享状态槽。本阶段不重写其他 skill 的 SKILL.md，不接入 CI，留给 Phase 3B。

**Tech Stack:** Bun >= 1.3、TypeScript、commander CLI、`yaml@2.x`（engine workspace 已有）、`bun test`、biome、现有 `engine/tests/cli-runner.ts`。

---

## 范围说明

本计划是 Phase 3，对应 spec §12.3 "Workflow 和 Blackboard 下沉"。Phase 3A 是最小试点，Phase 3B 是剩余 workflow 下沉的 carryover；后续收口计划只能引用本文件的 Phase 3B 区块，不应重新定义 workflow/blackboard 的阶段归属。

Phase 3A 只处理可机器校验且对其他 skill 零影响的内容：

- 新增 blackboard 第一版状态模型文档和 JSON schema。
- 新增 workflow YAML schema（TypeScript 类型 + 运行时校验）和 workflow check 检查器。
- 把 `case-draft` SKILL.md 现有 "路由摘要" 段中隐式表达的 13 步固定流程抽取到 `docs/skills/contracts/workflows/case-draft.yaml`，并生成对齐的人工 review 文档 `docs/skills/workflows/case-draft.md`。
- 修改 `.claude/skills/case-draft/SKILL.md` 与 `.agents/skills/case-draft/SKILL.md` 的 "路由摘要" 段，让两侧改为引用同一份 workflow YAML，删除两侧内嵌的步骤列表（避免出现第二份规范源）。
- 把 `workflow-check` 接入 `kata skills sync-check`。
- Review 后加固：workflow schema 要求每个 step 显式声明 `blackboard_inputs`、`blackboard_outputs`、`references`、`failure_modes`、`human_gates`、`verification`；workflow check 按 YAML 顺序校验 review 文档步骤，并校验 failure modes / human gates 在 review 文档中出现。

本计划不做这些内容：

- 不为其他 9 个 skill 建立 workflow YAML（Phase 3A 不做；需要 workflow 的剩余 skill 见本文 "Phase 3B Carryover"）。
- 不删除 `.ai/**`。
- 不接入 `bun run check` 或 CI。
- 不补 Claude `model` / `effort` / `paths` 等 SKILL.md 字段（属于 Phase 2B）。
- 不创建 Codex `agents/openai.yaml`（属于 Phase 2B）。
- 不实现 spec §8 第三层 route-check 的 prompt 样例测试（继续延期）。
- 不把 long-form references 从 SKILL.md 全部迁出；本阶段仅处理与 workflow 直接重合的 "路由摘要" 段。

## 与 Phase 2 的关系

- Phase 2A（runtime detach）必须完整落地：`bun run check:skills` 同时输出 `runtime skill sync passed` 与 `runtime detach passed`。Task 1 会自动验证；偏移则停 Phase 3 工作。
- Phase 2B（runtime native config）可以与 Phase 3A 并行，不构成阻塞。如果 Phase 2B 在执行期间扩展了 SKILL.md frontmatter 白名单字段，必须同步更新 sync-check 测试，Task 1 中的 baseline 校验会一并发现。

## 文件结构

**Create:**

- `docs/skills/blackboard/state-model.md`：blackboard 8 个状态槽的人工 review 文档。
- `docs/skills/contracts/schemas/blackboard-state.json`：blackboard 状态机器可读 JSON schema。
- `docs/skills/contracts/workflows/case-draft.yaml`：case-draft workflow 唯一规范源。
- `docs/skills/workflows/case-draft.md`：case-draft workflow 的人工 review 文档。
- `engine/src/skills/workflow-schema.ts`：workflow YAML 的 TypeScript 类型和运行时校验。
- `engine/src/skills/workflow-check.ts`：扫描 `docs/skills/contracts/workflows/*.yaml` + 对齐 `docs/skills/workflows/*.md` 与 blackboard schema 的检查器。
- `engine/tests/skills/workflow-schema.test.ts`：schema 单元测试。
- `engine/tests/skills/workflow-check.test.ts`：检查器单元测试。
- `engine/tests/skills/workflow-check-repository.test.ts`：当前仓库的 workflow check 合同测试。
- `engine/tests/skills/blackboard-schema.test.ts`：blackboard JSON schema 校验测试。

**Modify:**

- `.claude/skills/case-draft/SKILL.md`：把内嵌 13 步流程替换为指向 workflow YAML 的引用。
- `.agents/skills/case-draft/SKILL.md`：同上。
- `engine/src/cli/skill-audit.ts`：`skills sync-check` 同时运行 workflow check。
- `engine/tests/cli/skills-sync-check.test.ts`：断言 CLI 输出包含 `workflow check`。

---

## Task 1: Pre-flight — 检查 Phase 1 + Phase 2 重构是否偏移

本任务**不修改任何文件**，只校验前置阶段状态。任一断言失败：停下 Phase 3 工作，先回到对应阶段修复，再开始 Task 2。

**Files:**

- Verify only.

- [ ] **Step 1: 确认当前在预期 worktree 与分支**

Run:

```bash
git rev-parse --show-toplevel
git rev-parse --abbrev-ref HEAD
git merge-base main HEAD
```

Expected：

- toplevel 路径以 `.worktrees/skill-runtime-split-design` 结尾。
- branch 名以 `skill-runtime-split-design` 结尾（含 `codex/` 等前缀亦可）。
- merge-base 输出一个 commit hash，无报错。

如果不是该 worktree，先 `cd` 进去再继续。

- [ ] **Step 2: 跑 Phase 1 + Phase 2A 既有测试**

Run:

```bash
bun test engine/tests/skills/frontmatter-check.test.ts engine/tests/skills/sync-check.test.ts engine/tests/skills/runtime-detach.test.ts engine/tests/skills/runtime-detach-repository.test.ts engine/tests/cli/skills-sync-check.test.ts
```

Expected: 全部 PASS。任一 FAIL：

- `frontmatter-check` 或 `sync-check` FAIL → Phase 1 偏移；先回 Phase 1 plan 修复。
- `runtime-detach` 或 `runtime-detach-repository` FAIL → Phase 2A 偏移；先回 Phase 2 plan 修复。
- `skills-sync-check` FAIL → CLI 接线偏移；先回 Phase 1 Task 5 或 Phase 2 Task 3 修复。

- [ ] **Step 3: 跑 `bun run check:skills` 对仓库现网**

Run:

```bash
bun run check:skills
```

Expected: exit code `0`，输出**同时**包含以下两行（顺序不限）：

```text
runtime skill sync passed
runtime detach passed
```

如果只有一行 passed，CLI 接线被回退；如果出现 failed，前置阶段未稳定。

- [ ] **Step 4: 自动断言 runtime 文件没有 generated marker 或现役 `.ai/core` 引用**

Run:

```bash
rg -n "generated by kata ai-core|ai-core-hash|\.ai/core|projection render|projection lock" AGENTS.md CLAUDE.md .claude/INDEX.md .agents/INDEX.md .claude/skills .agents/skills && exit 1 || true
```

Expected: exit code `0`，命令没有命中输出。任一命中：Phase 2A 偏移，回 Phase 2 plan Task 2 重新跑 sed/apply_patch。

- [ ] **Step 5: 自动断言 `CLAUDE.md` 不是 symlink、`CLAUDE.local.md` 不存在**

Run:

```bash
test -L CLAUDE.md && exit 1 || true
test -e CLAUDE.local.md && exit 1 || true
```

Expected: 两条命令 exit code `0`。

- [ ] **Step 6: 自动断言 `.ai/**` 仍存在但未被本分支动过**

Run:

```bash
test -d .ai
BASE=$(git merge-base main HEAD)
git diff --name-only "$BASE"..HEAD | rg '^\.ai/' && exit 1 || true
```

Expected: 第一条 exit code `0`（`.ai/**` 仍在）；第二条 exit code `0` 且无输出（本分支没动 `.ai/**`，符合 Phase 1–3 范围约束，Phase 4b 才能删）。

- [ ] **Step 7: 自动断言双 runtime skill 集合一致**

Run:

```bash
diff <(ls .claude/skills | sort) <(ls .agents/skills | sort)
```

Expected: exit code `0`，无输出。不一致：Phase 1 sync-check 应已先报错，但仍人工核查并补齐缺失的一侧。

- [ ] **Step 8: 校验 frontmatter 白名单与现网实际字段一致**

Run:

```bash
# 严格抽取 --- 之间的 frontmatter 区域，再列出实际使用的 key
for f in .claude/skills/*/SKILL.md .agents/skills/*/SKILL.md; do
  awk '/^---$/{c++; next} c==1 && /^[a-z][a-z_-]*:/{sub(":.*", ""); print}' "$f"
done | sort -u
```

Expected: 仅输出 `allowed-tools`、`description`、`name` 三行。任何其他字段（例如 `model`、`paths`、`when_to_use`）：

- 如果是 Phase 2B 已合入的新字段，**必须**同步更新 `engine/src/skills/frontmatter-policy.ts` 的白名单与 `engine/tests/skills/frontmatter-check.test.ts` 的断言；否则停下 Phase 3 先做白名单同步。
- 如果是误添加，回到对应 skill 修正。

- [ ] **Step 9: 校验 Phase 1/2 同步契约文档仍在线**

Run:

```bash
test -f docs/skills/contracts/runtime-skill-sync.md
test -f docs/skills/contracts/runtime-sync-exceptions.yaml
test -f docs/skills/contracts/output-artifacts.md
test -f docs/skills/contracts/verification-scope.md
test -f docs/skills/contracts/routes/case-draft.yaml
test -f docs/skills/contracts/routes/case-hotfix.yaml
```

Expected: 全部 exit code `0`。任一缺失：Phase 1 Task 2 偏移，先回 Phase 1 修复。

- [ ] **Step 10: 跑 biome 现状记录**

Run:

```bash
bun run check 2>&1 | tee /tmp/phase3-preflight-biome.log | tail -20
```

Expected: exit code `0`。如果已有 warning，记录数量到 `/tmp/phase3-preflight-biome.log` 末尾；Phase 3 任务**不允许新增 warning**。

- [ ] **Step 11: 写下 pre-flight 记录**

在 Task 1 完成的最终汇报中，写明：

```text
Pre-flight 通过：Phase 1+2A 测试与现网契约均符合预期；frontmatter 白名单 = {name, description, allowed-tools}；`.ai/**` 未被本分支动过；当前 biome warning 数 = <数字>。
```

任一断言失败：在 Task 1 报告中明确写"pre-flight 失败：<具体项>"，**停下** Phase 3 后续 Task 直到失败项修复。

---

## Task 2: 建立 blackboard 状态模型与 JSON schema

**Files:**

- Create: `docs/skills/blackboard/state-model.md`
- Create: `docs/skills/contracts/schemas/blackboard-state.json`
- Create: `engine/tests/skills/blackboard-schema.test.ts`

- [ ] **Step 1: 创建目录**

Run:

```bash
mkdir -p docs/skills/blackboard docs/skills/contracts/schemas
```

Expected: exit code `0`。

- [ ] **Step 2: 写 blackboard 状态模型文档**

Create `docs/skills/blackboard/state-model.md`:

```markdown
# Blackboard 状态模型

Blackboard 是 skill workflow 跨步骤共享的状态容器。第一版只把状态槽显式化为文档，**不在 engine 做运行时强制校验**。后续如需运行时校验，再把 schema 迁入 `engine/src/skills/schemas`。

机器可读 schema 见 `docs/skills/contracts/schemas/blackboard-state.json`，本文档是 schema 的人工 review 镜像；两者必须一致，由 `engine/tests/skills/blackboard-schema.test.ts` 校验。

## 状态槽

| 槽位 | 类型 | 含义 | 读写时机 |
| --- | --- | --- | --- |
| `sources` | `Source[]` | PRD、Lanhu、Axure、ZenTao、Git diff、用户输入等原始素材清单 | source-intake 写入，后续步骤只读 |
| `source_refs` | `SourceRef[]` | 可追溯的 SourceRef ID，含类型、位置、采集时间、有效性 | source-intake 写入；任何对外结论必须引用其中一个 ID |
| `decisions` | `Decision[]` | AI 在执行过程中做出的关键判断，必须区分事实 / 推断 / 假设 | normalize、plan、execute 阶段持续追加 |
| `open_questions` | `OpenQuestion[]` | 阻塞项、澄清项、用户待确认事项 | 任何步骤可追加；清空前不可进入 deliver |
| `artifacts` | `Artifact[]` | 已生成或修改的产物路径，含 Archive / XMind / CSV / metadata 等 | execute 阶段写入；deliver 时校验 |
| `coverage` | `CoverageMatrix` | 用例覆盖矩阵、风险覆盖、未覆盖原因 | coverage-matrix 阶段写入 |
| `verification` | `VerificationLog[]` | 已执行的命令、退出码、通过 / 失败 / 跳过数量、证据路径 | verify 阶段写入 |
| `handoff` | `Handoff` | 给下游 skill 或人工的交接信息 | deliver 前写入 |

## 槽位写入规则

- 任意步骤可以读全部槽位，但只能写入自己声明的槽位（在 workflow YAML 的 `blackboard_outputs` 字段声明）。
- 写入是追加语义（数组类槽位）或全量覆盖（`coverage`、`handoff` 这类单对象槽位）。
- 任一槽位为空时，下游需要它的步骤必须报 `BLACKBOARD_SLOT_MISSING` 而不是默默继续。

## 跨 runtime 一致性

- 两个 runtime 的 workflow YAML 必须引用同一份 blackboard schema；不允许在某个 runtime 侧悄悄扩展槽位。
- 新增槽位需要同时改本文档、JSON schema、以及任何引用它的 workflow YAML，并在 `runtime-sync-exceptions.yaml` 之外的协调说明里写明用途。
```

- [ ] **Step 3: 写 blackboard JSON schema**

Create `docs/skills/contracts/schemas/blackboard-state.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kata.local/schemas/blackboard-state.json",
  "title": "Blackboard State",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "sources",
    "source_refs",
    "decisions",
    "open_questions",
    "artifacts",
    "coverage",
    "verification",
    "handoff"
  ],
  "properties": {
    "sources": {
      "type": "array",
      "description": "原始素材清单",
      "items": { "type": "object" }
    },
    "source_refs": {
      "type": "array",
      "description": "可追溯 SourceRef 列表，每条必须含 id/type/location",
      "items": {
        "type": "object",
        "required": ["id", "type", "location"],
        "properties": {
          "id": { "type": "string", "minLength": 1 },
          "type": { "type": "string" },
          "location": { "type": "string" },
          "collected_at": { "type": "string" },
          "validity": { "type": "string" }
        }
      }
    },
    "decisions": {
      "type": "array",
      "description": "AI 关键判断，必须区分 fact/inference/assumption",
      "items": {
        "type": "object",
        "required": ["kind", "statement"],
        "properties": {
          "kind": { "enum": ["fact", "inference", "assumption"] },
          "statement": { "type": "string" },
          "evidence": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "open_questions": {
      "type": "array",
      "description": "阻塞项与澄清项",
      "items": {
        "type": "object",
        "required": ["question", "raised_by"],
        "properties": {
          "question": { "type": "string" },
          "raised_by": { "type": "string" },
          "status": { "enum": ["open", "answered", "deferred"] }
        }
      }
    },
    "artifacts": {
      "type": "array",
      "description": "本次产生或修改的产物路径",
      "items": {
        "type": "object",
        "required": ["path", "kind"],
        "properties": {
          "path": { "type": "string" },
          "kind": { "type": "string" }
        }
      }
    },
    "coverage": {
      "type": "object",
      "description": "覆盖矩阵；空对象代表本次 skill 不产 coverage"
    },
    "verification": {
      "type": "array",
      "description": "已执行命令与退出码",
      "items": {
        "type": "object",
        "required": ["command", "exit_code"],
        "properties": {
          "command": { "type": "string" },
          "exit_code": { "type": "integer" },
          "evidence": { "type": "string" }
        }
      }
    },
    "handoff": {
      "type": "object",
      "description": "交接信息；空对象代表本次 skill 是终态"
    }
  }
}
```

- [ ] **Step 4: 写 blackboard schema 单元测试**

Create `engine/tests/skills/blackboard-schema.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "../../lib/paths.ts";

const SCHEMA_PATH = join(
  repoRoot(),
  "docs/skills/contracts/schemas/blackboard-state.json",
);
const STATE_MODEL_PATH = join(repoRoot(), "docs/skills/blackboard/state-model.md");

const REQUIRED_SLOTS = [
  "sources",
  "source_refs",
  "decisions",
  "open_questions",
  "artifacts",
  "coverage",
  "verification",
  "handoff",
];

describe("blackboard schema", () => {
  test("JSON schema parses and declares the eight first-version slots", () => {
    const text = readFileSync(SCHEMA_PATH, "utf8");
    const schema = JSON.parse(text) as {
      required?: string[];
      properties?: Record<string, unknown>;
      additionalProperties?: boolean;
    };
    expect(schema.required).toEqual(REQUIRED_SLOTS);
    expect(Object.keys(schema.properties ?? {}).sort()).toEqual(
      [...REQUIRED_SLOTS].sort(),
    );
    expect(schema.additionalProperties).toBe(false);
  });

  test("state-model.md mirrors the same eight slots", () => {
    const text = readFileSync(STATE_MODEL_PATH, "utf8");
    for (const slot of REQUIRED_SLOTS) {
      expect(text).toContain("`" + slot + "`");
    }
  });
});
```

- [ ] **Step 5: 跑测试确认通过**

Run:

```bash
bun test engine/tests/skills/blackboard-schema.test.ts
```

Expected: PASS，2 个测试通过。

- [ ] **Step 6: 跑格式检查**

Run:

```bash
bunx biome check docs/skills/blackboard/state-model.md docs/skills/contracts/schemas/blackboard-state.json engine/tests/skills/blackboard-schema.test.ts --max-diagnostics=20
git diff --check
```

Expected: 两条命令 exit code `0`。biome 不检查 .md 内容是正常的，但 JSON 文件应通过。

- [ ] **Step 7: Commit**

```bash
git add docs/skills/blackboard/state-model.md docs/skills/contracts/schemas/blackboard-state.json engine/tests/skills/blackboard-schema.test.ts
git commit -m "feat: 📐 add blackboard state model and schema"
```

---

## Task 3: 实现 workflow YAML schema 与解析

**Files:**

- Create: `engine/src/skills/workflow-schema.ts`
- Create: `engine/tests/skills/workflow-schema.test.ts`

- [ ] **Step 1: 写 failing test**

Create `engine/tests/skills/workflow-schema.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import {
  parseWorkflow,
  validateWorkflow,
} from "../../src/skills/workflow-schema.ts";

const VALID_WORKFLOW = `
name: case-draft
version: 1
entry: /case-draft
description: 根据需求源生成 QA 用例的完整流程。
steps:
  - id: source-intake
    next: [module-identify]
    blackboard_outputs: [sources, source_refs]
    references: [.claude/skills/case-draft/SKILL.md]
    failure_modes: [SOURCE_FETCH_BLOCKED]
    human_gates: []
    verification: []
  - id: module-identify
    next: [output]
    blackboard_inputs: [sources]
    blackboard_outputs: [decisions]
  - id: output
    blackboard_inputs: [sources, decisions]
    blackboard_outputs: [artifacts, handoff]
`;

describe("workflow schema", () => {
  test("parses a well-formed workflow YAML", () => {
    const workflow = parseWorkflow(VALID_WORKFLOW);
    expect(workflow.name).toBe("case-draft");
    expect(workflow.version).toBe(1);
    expect(workflow.steps).toHaveLength(3);
  });

  test("validate passes on a well-formed workflow", () => {
    const errors = validateWorkflow(parseWorkflow(VALID_WORKFLOW));
    expect(errors).toEqual([]);
  });

  test("flags duplicate step ids", () => {
    const workflow = parseWorkflow(`
name: x
version: 1
entry: /x
description: x
steps:
  - id: a
    next: [a]
  - id: a
`);
    const errors = validateWorkflow(workflow);
    expect(errors.some((e) => e.includes("duplicate step id"))).toBe(true);
  });

  test("flags step.next that references unknown id", () => {
    const workflow = parseWorkflow(`
name: x
version: 1
entry: /x
description: x
steps:
  - id: a
    next: [missing]
  - id: b
`);
    const errors = validateWorkflow(workflow);
    expect(errors.some((e) => e.includes("unknown step id 'missing'"))).toBe(true);
  });

  test("flags workflow without a terminal step", () => {
    const workflow = parseWorkflow(`
name: x
version: 1
entry: /x
description: x
steps:
  - id: a
    next: [b]
  - id: b
    next: [a]
`);
    const errors = validateWorkflow(workflow);
    expect(errors.some((e) => e.includes("no terminal step"))).toBe(true);
  });

  test("flags blackboard slot outside the first-version schema", () => {
    const workflow = parseWorkflow(`
name: x
version: 1
entry: /x
description: x
steps:
  - id: a
    blackboard_outputs: [made_up_slot]
`);
    const errors = validateWorkflow(workflow);
    expect(errors.some((e) => e.includes("unknown blackboard slot 'made_up_slot'"))).toBe(true);
  });

  test("flags missing required top-level fields", () => {
    const workflow = parseWorkflow(`
name: x
steps:
  - id: a
`);
    const errors = validateWorkflow(workflow);
    expect(errors.some((e) => e.includes("version"))).toBe(true);
    expect(errors.some((e) => e.includes("entry"))).toBe(true);
    expect(errors.some((e) => e.includes("description"))).toBe(true);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run:

```bash
bun test engine/tests/skills/workflow-schema.test.ts
```

Expected: FAIL，原因是 `engine/src/skills/workflow-schema.ts` 还不存在。

- [ ] **Step 3: 写实现**

Create `engine/src/skills/workflow-schema.ts`:

```typescript
import YAML from "yaml";

export const BLACKBOARD_SLOTS = [
  "sources",
  "source_refs",
  "decisions",
  "open_questions",
  "artifacts",
  "coverage",
  "verification",
  "handoff",
] as const;

export type BlackboardSlot = (typeof BLACKBOARD_SLOTS)[number];

export interface WorkflowStep {
  id: string;
  next?: string[];
  blackboard_inputs?: string[];
  blackboard_outputs?: string[];
  references?: string[];
  failure_modes?: string[];
  human_gates?: string[];
  verification?: string[];
}

export interface Workflow {
  name: string;
  version: number;
  entry: string;
  description: string;
  steps: WorkflowStep[];
}

export function parseWorkflow(text: string): Workflow {
  const data = YAML.parse(text) as Partial<Workflow> | null;
  return {
    name: data?.name ?? "",
    version: data?.version ?? 0,
    entry: data?.entry ?? "",
    description: data?.description ?? "",
    steps: Array.isArray(data?.steps) ? (data.steps as WorkflowStep[]) : [],
  };
}

export function validateWorkflow(workflow: Workflow): string[] {
  const errors: string[] = [];

  if (!workflow.name) errors.push("missing required field: name");
  if (!workflow.version) errors.push("missing required field: version");
  if (!workflow.entry) errors.push("missing required field: entry");
  if (!workflow.description) errors.push("missing required field: description");

  if (workflow.steps.length === 0) {
    errors.push("workflow must declare at least one step");
    return errors;
  }

  const ids = new Set<string>();
  for (const step of workflow.steps) {
    if (!step.id) {
      errors.push("step is missing required field: id");
      continue;
    }
    if (ids.has(step.id)) {
      errors.push(`duplicate step id '${step.id}'`);
    }
    ids.add(step.id);
  }

  for (const step of workflow.steps) {
    for (const next of step.next ?? []) {
      if (!ids.has(next)) {
        errors.push(`step '${step.id}' references unknown step id '${next}'`);
      }
    }
    for (const slot of [
      ...(step.blackboard_inputs ?? []),
      ...(step.blackboard_outputs ?? []),
    ]) {
      if (!BLACKBOARD_SLOTS.includes(slot as BlackboardSlot)) {
        errors.push(`step '${step.id}' uses unknown blackboard slot '${slot}'`);
      }
    }
  }

  const hasTerminal = workflow.steps.some(
    (step) => !step.next || step.next.length === 0,
  );
  if (!hasTerminal) errors.push("workflow has no terminal step (a step with empty 'next')");

  return errors;
}
```

- [ ] **Step 4: 跑测试确认通过**

Run:

```bash
bun test engine/tests/skills/workflow-schema.test.ts
```

Expected: PASS，7 个测试通过。

- [ ] **Step 5: 跑格式检查**

Run:

```bash
bunx biome check engine/src/skills/workflow-schema.ts engine/tests/skills/workflow-schema.test.ts --max-diagnostics=20
git diff --check
```

Expected: 两条命令 exit code `0`。

- [ ] **Step 6: Commit**

```bash
git add engine/src/skills/workflow-schema.ts engine/tests/skills/workflow-schema.test.ts
git commit -m "feat: 📐 add workflow yaml schema"
```

---

## Task 4: 实现 workflow check 检查器

**Files:**

- Create: `engine/src/skills/workflow-check.ts`
- Create: `engine/tests/skills/workflow-check.test.ts`

- [ ] **Step 1: 写 failing test**

Create `engine/tests/skills/workflow-check.test.ts`:

```typescript
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  checkWorkflows,
  formatWorkflowCheckReport,
} from "../../src/skills/workflow-check.ts";

const tempRoots: string[] = [];

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-workflow-check-"));
  tempRoots.push(root);
  return root;
}

function writeFile(root: string, rel: string, body: string): void {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, "utf8");
}

const VALID_YAML = `name: case-draft
version: 1
entry: /case-draft
description: 根据需求源生成 QA 用例的完整流程。
steps:
  - id: source-intake
    next: [output]
    blackboard_outputs: [sources, source_refs]
  - id: output
    blackboard_inputs: [sources, source_refs]
    blackboard_outputs: [artifacts, handoff]
`;

const VALID_REVIEW_MD = `# case-draft workflow

> 唯一规范源：docs/skills/contracts/workflows/case-draft.yaml

## Steps

- source-intake
- output
`;

describe("workflow check", () => {
  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("passes a workflow whose review md mirrors yaml", () => {
    const root = makeRoot();
    writeFile(root, "docs/skills/contracts/workflows/case-draft.yaml", VALID_YAML);
    writeFile(root, "docs/skills/workflows/case-draft.md", VALID_REVIEW_MD);

    const report = checkWorkflows(root);
    expect(report.passed).toBe(true);
    expect(report.violations).toEqual([]);
    expect(formatWorkflowCheckReport(report, root)).toBe("workflow check passed");
  });

  test("flags yaml schema errors", () => {
    const root = makeRoot();
    writeFile(
      root,
      "docs/skills/contracts/workflows/bad.yaml",
      "name: bad\nversion: 1\nentry: /bad\ndescription: x\nsteps:\n  - id: a\n    next: [missing]\n",
    );

    const report = checkWorkflows(root);
    expect(report.passed).toBe(false);
    expect(report.violations.some((v) => v.rule === "WORKFLOW_SCHEMA_ERROR")).toBe(true);
  });

  test("flags missing review md", () => {
    const root = makeRoot();
    writeFile(root, "docs/skills/contracts/workflows/case-draft.yaml", VALID_YAML);

    const report = checkWorkflows(root);
    expect(report.violations.some((v) => v.rule === "WORKFLOW_REVIEW_MISSING")).toBe(true);
  });

  test("flags review md step list out of sync with yaml", () => {
    const root = makeRoot();
    writeFile(root, "docs/skills/contracts/workflows/case-draft.yaml", VALID_YAML);
    writeFile(
      root,
      "docs/skills/workflows/case-draft.md",
      `# case-draft workflow

> 唯一规范源：docs/skills/contracts/workflows/case-draft.yaml

## Steps

- source-intake
- something-else
`,
    );

    const report = checkWorkflows(root);
    expect(report.violations.some((v) => v.rule === "WORKFLOW_REVIEW_STEP_MISMATCH")).toBe(true);
  });

  test("flags review md missing canonical source pointer", () => {
    const root = makeRoot();
    writeFile(root, "docs/skills/contracts/workflows/case-draft.yaml", VALID_YAML);
    writeFile(
      root,
      "docs/skills/workflows/case-draft.md",
      `# case-draft workflow

## Steps

- source-intake
- output
`,
    );

    const report = checkWorkflows(root);
    expect(report.violations.some((v) => v.rule === "WORKFLOW_REVIEW_CANONICAL_MISSING")).toBe(true);
  });

  test("formats failures with relative paths", () => {
    const root = makeRoot();
    writeFile(root, "docs/skills/contracts/workflows/case-draft.yaml", VALID_YAML);

    const text = formatWorkflowCheckReport(checkWorkflows(root), root);
    expect(text).toContain("workflow check failed");
    expect(text).toContain("docs/skills/workflows/case-draft.md");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run:

```bash
bun test engine/tests/skills/workflow-check.test.ts
```

Expected: FAIL，原因是 `engine/src/skills/workflow-check.ts` 还不存在。

- [ ] **Step 3: 写实现**

Create `engine/src/skills/workflow-check.ts`:

```typescript
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  parseWorkflow,
  validateWorkflow,
  type Workflow,
} from "./workflow-schema.ts";

export type WorkflowCheckRule =
  | "WORKFLOW_PARSE_ERROR"
  | "WORKFLOW_SCHEMA_ERROR"
  | "WORKFLOW_REVIEW_MISSING"
  | "WORKFLOW_REVIEW_CANONICAL_MISSING"
  | "WORKFLOW_REVIEW_STEP_MISMATCH"
  | "WORKFLOW_REVIEW_DETAIL_MISSING";

export interface WorkflowCheckViolation {
  rule: WorkflowCheckRule;
  path: string;
  message: string;
}

export interface WorkflowCheckReport {
  passed: boolean;
  violations: WorkflowCheckViolation[];
}

const WORKFLOWS_YAML_DIR = "docs/skills/contracts/workflows";
const WORKFLOWS_REVIEW_DIR = "docs/skills/workflows";

export function checkWorkflows(root: string): WorkflowCheckReport {
  const violations: WorkflowCheckViolation[] = [];
  const yamlDir = join(root, WORKFLOWS_YAML_DIR);
  if (!existsSync(yamlDir)) return { passed: true, violations: [] };

  for (const entry of readdirSync(yamlDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".yaml")) continue;
    const yamlPath = join(yamlDir, entry.name);
    const reviewPath = join(
      root,
      WORKFLOWS_REVIEW_DIR,
      entry.name.replace(/\.yaml$/, ".md"),
    );

    let workflow: Workflow;
    try {
      workflow = parseWorkflow(readFileSync(yamlPath, "utf8"));
    } catch (error) {
      violations.push({
        rule: "WORKFLOW_PARSE_ERROR",
        path: yamlPath,
        message: `failed to parse workflow yaml: ${(error as Error).message}`,
      });
      continue;
    }

    for (const schemaError of validateWorkflow(workflow)) {
      violations.push({
        rule: "WORKFLOW_SCHEMA_ERROR",
        path: yamlPath,
        message: schemaError,
      });
    }

    if (!existsSync(reviewPath)) {
      violations.push({
        rule: "WORKFLOW_REVIEW_MISSING",
        path: reviewPath,
        message: `review document is required for workflow '${workflow.name}'.`,
      });
      continue;
    }

    const reviewText = readFileSync(reviewPath, "utf8");
    const canonicalRef = `docs/skills/contracts/workflows/${entry.name}`;
    if (!reviewText.includes(canonicalRef)) {
      violations.push({
        rule: "WORKFLOW_REVIEW_CANONICAL_MISSING",
        path: reviewPath,
        message: `review document must reference canonical source '${canonicalRef}'.`,
      });
    }

    const yamlIds = workflow.steps.map((step) => step.id);
    const reviewIds = extractReviewStepIds(reviewText);
    if (yamlIds.join(",") !== reviewIds.join(",")) {
      violations.push({
        rule: "WORKFLOW_REVIEW_STEP_MISMATCH",
        path: reviewPath,
        message: `review steps [${reviewIds.join(",")}] do not match yaml steps [${yamlIds.join(",")}].`,
      });
    }

    for (const detail of collectReviewRequiredDetails(workflow)) {
      if (!reviewText.includes(detail)) {
        violations.push({
          rule: "WORKFLOW_REVIEW_DETAIL_MISSING",
          path: reviewPath,
          message: `review document must mention yaml detail '${detail}'.`,
        });
      }
    }
  }

  return { passed: violations.length === 0, violations };
}

function extractReviewStepIds(reviewText: string): string[] {
  const ids: string[] = [];
  let inSteps = false;
  for (const rawLine of reviewText.split("\n")) {
    const line = rawLine.trim();
    if (/^##\s+Steps\b/i.test(line)) {
      inSteps = true;
      continue;
    }
    if (inSteps && line.startsWith("##")) break;
    if (inSteps && line.startsWith("- ")) {
      ids.push(line.slice(2).trim());
    }
  }
  return ids;
}

function collectReviewRequiredDetails(workflow: Workflow): string[] {
  const details = new Set<string>();
  for (const step of workflow.steps) {
    for (const mode of step.failure_modes ?? []) details.add(mode);
    for (const gate of step.human_gates ?? []) details.add(gate);
  }
  return [...details].sort();
}

export function formatWorkflowCheckReport(
  report: WorkflowCheckReport,
  root: string,
): string {
  if (report.passed) return "workflow check passed";
  const lines = report.violations.map((violation) => {
    const rel = violation.path.startsWith(root)
      ? violation.path.slice(root.length + 1)
      : violation.path;
    return `${violation.rule}: ${rel}: ${violation.message}`;
  });
  return ["workflow check failed", ...lines].join("\n");
}
```

- [ ] **Step 4: 跑测试确认通过**

Run:

```bash
bun test engine/tests/skills/workflow-check.test.ts
```

Expected: PASS，6 个测试通过。

- [ ] **Step 5: 跑格式检查**

Run:

```bash
bunx biome check engine/src/skills/workflow-check.ts engine/tests/skills/workflow-check.test.ts --max-diagnostics=20
git diff --check
```

Expected: 两条命令 exit code `0`。

- [ ] **Step 6: Commit**

```bash
git add engine/src/skills/workflow-check.ts engine/tests/skills/workflow-check.test.ts
git commit -m "feat: 🔍 add workflow yaml/review consistency check"
```

---

## Task 5: 抽取 case-draft workflow YAML 与 review 文档

**Files:**

- Create: `docs/skills/contracts/workflows/case-draft.yaml`
- Create: `docs/skills/workflows/case-draft.md`
- Create: `engine/tests/skills/workflow-check-repository.test.ts`

- [ ] **Step 1: 写 repository contract test**

Create `engine/tests/skills/workflow-check-repository.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { repoRoot } from "../../lib/paths.ts";
import {
  checkWorkflows,
  formatWorkflowCheckReport,
} from "../../src/skills/workflow-check.ts";

describe("repository workflow contract", () => {
  test("repository workflows pass consistency check", () => {
    const root = repoRoot();
    const report = checkWorkflows(root);
    expect(formatWorkflowCheckReport(report, root)).toBe("workflow check passed");
    expect(report.passed).toBe(true);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run:

```bash
bun test engine/tests/skills/workflow-check-repository.test.ts
```

Expected: PASS（因为还没有任何 workflow yaml，`checkWorkflows` 在目录不存在时返回 passed）。如果 FAIL，记录原因并先修复 Task 4 实现。

注意：本步骤的 PASS 是预期临时状态；写完 Step 3 yaml 后会进入"yaml 存在但 review md 缺失"的失败态，再用 Step 4 补齐。

- [ ] **Step 3: 创建 case-draft workflow YAML**

Create `docs/skills/contracts/workflows/case-draft.yaml`:

```yaml
name: case-draft
version: 1
entry: /case-draft
description: 根据 PRD、Lanhu、Axure 或功能描述生成 QA 用例的完整流程；本 yaml 是该 workflow 的唯一规范源。
steps:
  - id: source-intake
    next: [module-identify]
    blackboard_outputs: [sources, source_refs]
    references:
      - .claude/skills/case-draft/SKILL.md
      - .agents/skills/case-draft/SKILL.md
    failure_modes:
      - SOURCE_FETCH_BLOCKED
      - LANHU_AUTH_REQUIRED
    human_gates: []
    verification: []
  - id: module-identify
    next: [source-confirm]
    blackboard_inputs: [sources, source_refs]
    blackboard_outputs: [decisions]
    failure_modes:
      - MODULE_AMBIGUOUS
    human_gates: []
  - id: source-confirm
    next: [historical-context]
    blackboard_inputs: [sources, decisions]
    blackboard_outputs: [open_questions]
    human_gates:
      - ambiguous_source_requires_user_confirmation
  - id: historical-context
    next: [requirement-atomize]
    blackboard_inputs: [sources, decisions]
    blackboard_outputs: [decisions]
  - id: requirement-atomize
    next: [ambiguity-scan]
    blackboard_inputs: [sources, decisions]
    blackboard_outputs: [decisions]
  - id: ambiguity-scan
    next: [confirmation-package]
    blackboard_inputs: [decisions]
    blackboard_outputs: [open_questions]
  - id: confirmation-package
    next: [product-feedback-merge]
    blackboard_inputs: [open_questions]
    blackboard_outputs: [open_questions]
    human_gates:
      - confirmation_package_requires_user_decision
  - id: product-feedback-merge
    next: [coverage-matrix]
    blackboard_inputs: [open_questions, decisions]
    blackboard_outputs: [decisions]
  - id: coverage-matrix
    next: [case-draft]
    blackboard_inputs: [decisions]
    blackboard_outputs: [coverage]
  - id: case-draft
    next: [case-review]
    blackboard_inputs: [decisions, coverage, source_refs]
    blackboard_outputs: [artifacts]
  - id: case-review
    next: [output]
    blackboard_inputs: [artifacts, coverage]
    blackboard_outputs: [open_questions, verification]
  - id: output
    next: [automation-handoff]
    blackboard_inputs: [artifacts, verification]
    blackboard_outputs: [artifacts]
  - id: automation-handoff
    blackboard_inputs: [artifacts]
    blackboard_outputs: [handoff]
```

- [ ] **Step 4: 创建 case-draft review 文档**

Create `docs/skills/workflows/case-draft.md`:

```markdown
# case-draft workflow

> 唯一规范源：docs/skills/contracts/workflows/case-draft.yaml
>
> 本文档由人工维护以辅助 review；步骤集合必须与 yaml 严格一致，由 `engine/src/skills/workflow-check.ts` 校验。

## 摘要

case-draft 把 PRD、Lanhu、Axure 等需求源转化为 Archive、XMind 等 QA 用例产物。流程线性串行 13 步，跨步骤数据通过 blackboard 共享，关键节点要求人工确认。

## Steps

- source-intake
- module-identify
- source-confirm
- historical-context
- requirement-atomize
- ambiguity-scan
- confirmation-package
- product-feedback-merge
- coverage-matrix
- case-draft
- case-review
- output
- automation-handoff

## 人工确认节点

- `source-confirm`：来源含歧义时阻塞，要求用户确认主输入。
- `confirmation-package`：把澄清问题集中打包给用户决策，未结清不进入 coverage-matrix。

## 关键失败模式

- `source-intake` — `SOURCE_FETCH_BLOCKED`、`LANHU_AUTH_REQUIRED`：触发降级路径，写入 `open_questions` 并暂停。
- `module-identify` — `MODULE_AMBIGUOUS`：要求 source-confirm 步骤介入。
```

- [ ] **Step 5: 跑 workflow check 与 schema 测试**

Run:

```bash
bun test engine/tests/skills/workflow-schema.test.ts engine/tests/skills/workflow-check.test.ts engine/tests/skills/workflow-check-repository.test.ts
```

Expected: 全部 PASS。

- [ ] **Step 6: 跑命令直观验证**

Run:

```bash
bun -e 'import("./engine/src/skills/workflow-check.ts").then(async (m) => { const r = m.checkWorkflows(process.cwd()); console.log(m.formatWorkflowCheckReport(r, process.cwd())); process.exit(r.passed ? 0 : 1); })'
```

Expected: 输出 `workflow check passed`，exit code `0`。

- [ ] **Step 7: 跑格式检查**

Run:

```bash
bunx biome check docs/skills/contracts/workflows/case-draft.yaml docs/skills/workflows/case-draft.md engine/tests/skills/workflow-check-repository.test.ts --max-diagnostics=20
git diff --check
```

Expected: 两条命令 exit code `0`（biome 不一定校验 yaml/md，但应无错误退出）。

- [ ] **Step 8: Commit**

```bash
git add docs/skills/contracts/workflows/case-draft.yaml docs/skills/workflows/case-draft.md engine/tests/skills/workflow-check-repository.test.ts
git commit -m "feat: 📐 extract case-draft workflow yaml"
```

---

## Task 6: 让 case-draft SKILL.md 引用 workflow YAML

**Files:**

- Modify: `.claude/skills/case-draft/SKILL.md`
- Modify: `.agents/skills/case-draft/SKILL.md`

本任务把两侧 SKILL.md 中 "路由摘要" 段内嵌的 13 步流程替换为指向 workflow YAML 的引用，避免出现第二份规范源。其他段（输入、调用图、触发条件等）保持不变。

- [ ] **Step 1: 读两份 SKILL.md 当前 "路由摘要" 段**

Run:

```bash
sed -n '/^## 路由摘要$/,/^## /p' .claude/skills/case-draft/SKILL.md | head -20
sed -n '/^## 路由摘要$/,/^## /p' .agents/skills/case-draft/SKILL.md | head -20
```

Expected: 两份输出基本一致，且均以 "固定执行 source-intake → ... → automation-handoff" 起头。如果两侧已不一致，先暂停并人工核对差异原因。

- [ ] **Step 2: 用 apply_patch 同步替换两侧 "路由摘要" 段**

Use `apply_patch`：

```diff
*** Begin Patch
*** Update File: .claude/skills/case-draft/SKILL.md
@@
-## 路由摘要
-
-- 固定执行 source-intake → module-identify → source-confirm → historical-context → requirement-atomize → ambiguity-scan → confirmation-package → product-feedback-merge → coverage-matrix → case-draft → case-review → output → automation-handoff。
-- 首步执行 `bun engine/bin/kata features resolve --project <project> --module <module> --lanhu-page <pageId> --json`，从返回的 JSON 取 featureDir 作为所有产物的唯一写入根。featureId 写入 metadata.yaml#id。禁止自行拼接 workspace/{project}/features/{YYYY-MM-xxx} 路径。
-- 阶段内任务编排：source-intake 与 module-identify 完成且不在 Lanhu/Axure error-fallback 路径下时，按 references/execution-protocol.md 创建 TodoWrite、按 references/worker-prompt.md 派发 Worker、按 references/spec-reviewer-prompt.md 与 references/quality-reviewer-prompt.md 二阶段审查；Lanhu/Axure 阻塞草稿、source-intake 抓取静默期与所有 BlockedEnvelope 路径下禁用。
+## 路由摘要
+
+- workflow 唯一规范源：`docs/skills/contracts/workflows/case-draft.yaml`；人工 review 文档：`docs/skills/workflows/case-draft.md`。两份必须保持一致，由 `engine/src/skills/workflow-check.ts` 校验。
+- 流程编排、步骤集合、blackboard 输入输出、失败模式、人工确认节点均以上述 yaml 为准；本 SKILL.md 不再内嵌步骤列表，避免出现第二份规范源。
+- 首步执行 `bun engine/bin/kata features resolve --project <project> --module <module> --lanhu-page <pageId> --json`，从返回的 JSON 取 featureDir 作为所有产物的唯一写入根。featureId 写入 metadata.yaml#id。禁止自行拼接 workspace/{project}/features/{YYYY-MM-xxx} 路径。
+- 阶段内任务编排细节见 yaml 步骤的 references 字段与对应 reference 文档（execution-protocol、worker-prompt、spec-reviewer-prompt、quality-reviewer-prompt）。
*** Update File: .agents/skills/case-draft/SKILL.md
@@
-## 路由摘要
-
-- 固定执行 source-intake → module-identify → source-confirm → historical-context → requirement-atomize → ambiguity-scan → confirmation-package → product-feedback-merge → coverage-matrix → case-draft → case-review → output → automation-handoff。
-- 首步执行 `bun engine/bin/kata features resolve --project <project> --module <module> --lanhu-page <pageId> --json`，从返回的 JSON 取 featureDir 作为所有产物的唯一写入根。featureId 写入 metadata.yaml#id。禁止自行拼接 workspace/{project}/features/{YYYY-MM-xxx} 路径。
-- 阶段内任务编排：source-intake 与 module-identify 完成且不在 Lanhu/Axure error-fallback 路径下时，按 references/execution-protocol.md 创建 TodoWrite、按 references/worker-prompt.md 派发 Worker、按 references/spec-reviewer-prompt.md 与 references/quality-reviewer-prompt.md 二阶段审查；Lanhu/Axure 阻塞草稿、source-intake 抓取静默期与所有 BlockedEnvelope 路径下禁用。
+## 路由摘要
+
+- workflow 唯一规范源：`docs/skills/contracts/workflows/case-draft.yaml`；人工 review 文档：`docs/skills/workflows/case-draft.md`。两份必须保持一致，由 `engine/src/skills/workflow-check.ts` 校验。
+- 流程编排、步骤集合、blackboard 输入输出、失败模式、人工确认节点均以上述 yaml 为准；本 SKILL.md 不再内嵌步骤列表，避免出现第二份规范源。
+- 首步执行 `bun engine/bin/kata features resolve --project <project> --module <module> --lanhu-page <pageId> --json`，从返回的 JSON 取 featureDir 作为所有产物的唯一写入根。featureId 写入 metadata.yaml#id。禁止自行拼接 workspace/{project}/features/{YYYY-MM-xxx} 路径。
+- 阶段内任务编排细节见 yaml 步骤的 references 字段与对应 reference 文档（execution-protocol、worker-prompt、spec-reviewer-prompt、quality-reviewer-prompt）。
*** End Patch
```

如果实际仓库中两侧 "路由摘要" 文本与上面 patch 的 minus 行存在差异（例如其中一侧已经被 Phase 2B 改动）：

- **不要** 强制 patch。先比较两侧差异，再分别构造 patch 保证两侧最终都引用 workflow yaml，且 minus 行严格匹配各自当前内容。

- [ ] **Step 3: 校验 sync-check 与 workflow check 仍通过**

Run:

```bash
bun test engine/tests/skills/sync-check.test.ts engine/tests/skills/runtime-detach-repository.test.ts engine/tests/skills/workflow-check-repository.test.ts
bun run check:skills
```

Expected:

- 第一条命令所有测试 PASS。
- 第二条命令 exit code `0`，输出包含 `runtime skill sync passed` 与 `runtime detach passed`（workflow check 接入在 Task 7 完成；本步骤先确保已有检查未被破坏）。

- [ ] **Step 4: 确认 SKILL.md 不再含旧 13 步串**

Run:

```bash
rg -n "source-intake → module-identify → source-confirm" .claude/skills/case-draft/SKILL.md .agents/skills/case-draft/SKILL.md && exit 1 || true
rg -n "docs/skills/contracts/workflows/case-draft.yaml" .claude/skills/case-draft/SKILL.md .agents/skills/case-draft/SKILL.md
```

Expected:

- 第一条命令 exit code `0` 且无输出（旧内嵌列表已删除）。
- 第二条命令命中两次（两侧都引用了 yaml）。

- [ ] **Step 5: 跑格式检查**

Run:

```bash
git diff --check
```

Expected: exit code `0`。

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/case-draft/SKILL.md .agents/skills/case-draft/SKILL.md
git commit -m "refactor: 📐 point case-draft SKILL.md to workflow yaml"
```

---

## Task 7: 把 workflow check 接入 `kata skills sync-check`

**Files:**

- Modify: `engine/src/cli/skill-audit.ts`
- Modify: `engine/tests/cli/skills-sync-check.test.ts`

- [ ] **Step 1: 更新 CLI 测试**

Replace `engine/tests/cli/skills-sync-check.test.ts` content with:

```typescript
import { expect, test } from "bun:test";
import { spawnKataCli } from "../cli-runner.ts";

test("kata skills sync-check runs all three checks against the repository", () => {
  const result = spawnKataCli(["skills", "sync-check"]);
  const output = result.stdout + result.stderr;
  expect(result.signal).toBeNull();
  expect(result.status).toBe(0);
  expect(output).toContain("runtime skill sync");
  expect(output).toContain("runtime detach");
  expect(output).toContain("workflow check");
});
```

- [ ] **Step 2: 跑测试确认失败**

Run:

```bash
bun test engine/tests/cli/skills-sync-check.test.ts
```

Expected: FAIL，原因是 CLI 输出尚未包含 `workflow check`。

- [ ] **Step 3: 修改 CLI 实现**

In `engine/src/cli/skill-audit.ts`：

- 在 import 区追加：

```typescript
import {
  checkWorkflows,
  formatWorkflowCheckReport,
} from "../skills/workflow-check.ts";
```

- 把 `sync-check` 子命令的 `.action(...)` 替换为：

```typescript
    .action((opts: { exitCode: boolean }) => {
      const root = repoRoot();
      const skillReport = checkRuntimeSkillSync(root);
      const detachReport = checkRuntimeDetach(root);
      const workflowReport = checkWorkflows(root);
      const passed =
        skillReport.passed && detachReport.passed && workflowReport.passed;
      const text = [
        formatRuntimeSkillSyncReport(skillReport, root),
        formatRuntimeDetachReport(detachReport, root),
        formatWorkflowCheckReport(workflowReport, root),
      ].join("\n");
      if (passed) {
        console.log(text);
      } else {
        process.stderr.write(`${text}\n`);
      }
      if (opts.exitCode && !passed) process.exit(1);
    });
```

- [ ] **Step 4: 跑 CLI 测试与命令**

Run:

```bash
bun test engine/tests/cli/skills-sync-check.test.ts
bun engine/bin/kata skills sync-check
bun run check:skills
```

Expected:

- CLI 测试 PASS。
- 后两条命令 exit code `0`，输出同时包含：

```text
runtime skill sync passed
runtime detach passed
workflow check passed
```

- [ ] **Step 5: 跑格式检查**

Run:

```bash
bunx biome check engine/src/cli/skill-audit.ts engine/tests/cli/skills-sync-check.test.ts --max-diagnostics=20
git diff --check
```

Expected: 两条命令 exit code `0`。

- [ ] **Step 6: Commit**

```bash
git add engine/src/cli/skill-audit.ts engine/tests/cli/skills-sync-check.test.ts
git commit -m "feat: 🔍 include workflow check in skill sync"
```

---

## Task 8: 第三阶段总验证

**Files:**

- Verify only.

- [ ] **Step 1: 跑 Phase 3 全部新增与回归测试**

Run:

```bash
bun test \
  engine/tests/skills/blackboard-schema.test.ts \
  engine/tests/skills/workflow-schema.test.ts \
  engine/tests/skills/workflow-check.test.ts \
  engine/tests/skills/workflow-check-repository.test.ts \
  engine/tests/skills/frontmatter-check.test.ts \
  engine/tests/skills/sync-check.test.ts \
  engine/tests/skills/runtime-detach.test.ts \
  engine/tests/skills/runtime-detach-repository.test.ts \
  engine/tests/cli/skills-sync-check.test.ts
```

Expected: 全部 PASS。

- [ ] **Step 2: 跑 `bun run check:skills`**

Run:

```bash
bun run check:skills
```

Expected: exit code `0`，输出顺序为：

```text
runtime skill sync passed
runtime detach passed
workflow check passed
```

- [ ] **Step 3: 跑 biome**

Run:

```bash
bun run check
```

Expected: exit code `0`。Warning 数量不得超过 Task 1 Step 10 记录的 pre-flight baseline；超过则定位本阶段引入的 warning 修复。

- [ ] **Step 4: 自动断言 `.ai/**` 未被本分支改动**

Run:

```bash
test -d .ai
BASE=$(git merge-base main HEAD)
git diff --name-only "$BASE"..HEAD | rg '^\.ai/' && exit 1 || true
```

Expected: 两条命令 exit code `0`。

- [ ] **Step 5: 自动断言 Phase 3A 允许路径范围**

Run:

```bash
BASE=$(git merge-base main HEAD)
git diff --name-only "$BASE"..HEAD | grep -vE '^(AGENTS\.md$|CLAUDE\.md$|CLAUDE\.local\.md$|\.claude/INDEX\.md$|\.agents/INDEX\.md$|\.claude/skills/|\.agents/skills/|docs/skills/|docs/superpowers/(specs|plans)/2026-05-27-skill-runtime-split|engine/src/skills/|engine/src/cli/skill-audit\.ts$|engine/tests/(skills/|cli/skills-sync-check\.test\.ts$)|package\.json$)' && exit 1 || true
```

Expected: exit code `0`，无越界路径。

- [ ] **Step 6: 自动断言 Phase 3 新增产物存在**

Run:

```bash
test -f docs/skills/blackboard/state-model.md
test -f docs/skills/contracts/schemas/blackboard-state.json
test -f docs/skills/contracts/workflows/case-draft.yaml
test -f docs/skills/workflows/case-draft.md
test -f engine/src/skills/workflow-schema.ts
test -f engine/src/skills/workflow-check.ts
```

Expected: 全部 exit code `0`。

- [ ] **Step 7: 记录下一阶段入口**

最终汇报中明确：

```text
下一阶段：Phase 3B 把剩余 skill（case-edit、case-hotfix、playwright-automation 以及其他需要 workflow 的 skill）逐一抽取为 workflow YAML + review .md，并将长篇规范从 SKILL.md 移到 references/；同时根据 Phase 2B 进展同步扩展 frontmatter 白名单。
```

## Phase 3B Carryover — 剩余 Workflow YAML 下沉

> Phase 3B 属于本 Phase 3 计划。若由后续 closeout 计划执行，后续计划必须引用本区块作为源计划，而不是把 workflow/blackboard 范围改写成新的 Phase 5 架构。

Phase 3A 已完成 blackboard 状态模型、workflow schema、workflow check 和 `case-draft` workflow 试点。Phase 3B 只补需要显式 workflow 的剩余复杂 skill；不重建 blackboard，不重写已完成的 `case-draft`。

**Files:**

- Create: `docs/skills/contracts/workflows/case-edit.yaml`
- Create: `docs/skills/contracts/workflows/case-hotfix.yaml`
- Create: `docs/skills/contracts/workflows/playwright-automation.yaml`
- Create: `docs/skills/workflows/case-edit.md`
- Create: `docs/skills/workflows/case-hotfix.md`
- Create: `docs/skills/workflows/playwright-automation.md`
- Modify: `.claude/skills/case-edit/SKILL.md`
- Modify: `.agents/skills/case-edit/SKILL.md`
- Modify: `.claude/skills/case-hotfix/SKILL.md`
- Modify: `.agents/skills/case-hotfix/SKILL.md`
- Modify: `.claude/skills/playwright-automation/SKILL.md`
- Modify: `.agents/skills/playwright-automation/SKILL.md`

- [ ] **Step 1: 为剩余复杂 skill 创建 workflow YAML**

为 `case-edit`、`case-hotfix`、`playwright-automation` 分别创建 workflow YAML。每个 YAML 必须声明：

```yaml
name: case-edit
version: 1
entry: /case-edit
description: 编辑、同步、转换或标准化已有 QA 用例产物。
steps:
  - id: artifact-intake
    next: [format-detect]
    blackboard_inputs: []
    blackboard_outputs: [sources, source_refs, artifacts]
    references: [docs/skills/contracts/output-artifacts.md]
    failure_modes: [ARTIFACT_MISSING]
    human_gates: [ASK_FOR_TARGET_ARTIFACT]
    verification: [record input artifact paths]
```

每个 step 必须声明 `workflow-schema.ts` 已强制的数组字段：

```text
blackboard_inputs
blackboard_outputs
references
failure_modes
human_gates
verification
```

所有 blackboard slot 必须来自 `docs/skills/contracts/schemas/blackboard-state.json`。

- [ ] **Step 2: 为每个 workflow 创建人工 review 文档**

为每个新 YAML 创建 `docs/skills/workflows/<skill>.md`，格式如下：

```markdown
# case-edit Workflow

> 唯一规范源：docs/skills/contracts/workflows/case-edit.yaml

## Steps

- artifact-intake
- format-detect
```

`## Steps` 列表必须与 YAML step 顺序完全一致。YAML 中每个 `failure_modes` 和 `human_gates` 值都必须出现在 review 文档正文中。

- [ ] **Step 3: 两套 runtime SKILL.md 指向同一 workflow YAML**

在每个新增 workflow 对应的 `.claude/skills/<skill>/SKILL.md` 与 `.agents/skills/<skill>/SKILL.md` 中加入 `## Workflow`：

```markdown
## Workflow

复杂流程以 `docs/skills/contracts/workflows/case-edit.yaml` 为唯一规范源；人工 review 文档为 `docs/skills/workflows/case-edit.md`。本 SKILL.md 只保留触发边界、加载协议和 runtime 注意事项。
```

按实际 skill 名替换路径。不要删除无关的触发、输入或加载协议段落；如果只改一侧 runtime，必须同步检查另一侧并记录不改理由。

- [ ] **Step 4: 验证 Phase 3B workflow**

Run:

```bash
bun test engine/tests/skills/workflow-schema.test.ts engine/tests/skills/workflow-check.test.ts engine/tests/skills/workflow-check-repository.test.ts engine/tests/skills/blackboard-schema.test.ts
bun run check:skills
```

Expected:

- 测试命令 exit code `0`。
- `bun run check:skills` exit code `0`，输出包含 `workflow check passed`。

---

## Self-Review Checklist

- [ ] Task 1 pre-flight 通过；任一断言失败已在 Phase 3 之前修复，不带 Phase 1/2 偏移进入 Phase 3。
- [ ] blackboard 状态模型 .md 与 JSON schema 字段集合一致（由 `blackboard-schema.test.ts` 校验）。
- [ ] workflow schema 的 ID 唯一性、`next` 引用、终态、blackboard slot 白名单、每个 step 的 metadata 字段存在性全部覆盖。
- [ ] case-draft workflow yaml 步骤顺序与 review .md 中 "## Steps" 列表完全一致，failure modes / human gates 已在 review 文档中出现。
- [ ] `.claude/skills/case-draft/SKILL.md` 与 `.agents/skills/case-draft/SKILL.md` 都引用 workflow yaml；两侧不再内嵌 13 步流程文本。
- [ ] `bun run check:skills` 同时输出三段 passed；CLI 测试断言三段都在。
- [ ] 没有把 workflow check 接入 `bun run check` 或 CI。
- [ ] Phase 3A 没有为其他 skill 创建 workflow yaml；Phase 3B 若执行，则只处理本文件 Phase 3B Carryover 指定的复杂 skill。
- [ ] `.ai/**` 未被本阶段任何步骤删除或重命名。
- [ ] biome warning 数量未超过 pre-flight baseline。
