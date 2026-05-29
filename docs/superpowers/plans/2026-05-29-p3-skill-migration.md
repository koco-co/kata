# P3 Skill Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 实现这份 plan。所有 step 用 `- [ ]` checkbox 语法跟踪。

**Goal:** 把 8 个 skill（含新合 `defect-analyze`）全部从 P1#4.b 留下的 v2 schema 13 step 中转态迁到 β-lite final（`phases/ reviewers/ workers/ rules/ fewshots/` 骨架），每个 skill 的 `workflow.yaml` 升 β-lite final phase 结构，engine 通过 P2 Phase Dispatcher emit events，并在 case-draft / defect-analyze / playwright-automation 用 **fake-orchestrator smoke** 验证 `events.jsonl` 形态（phase 序列 + artifact_written + subagent_dispatched/completed 配对）。真实 LLM 跑通 + 真 `bunx playwright test` 跑通**不在 P3 smoke 范围**——前者交付声明为"P3 mock validates structure；P6 metric snapshot 时做端到端 LLM dry-run"；后者交付声明为"P3 smoke 验证 §5-run event 流；CI 任务做真实 playwright 跑"。Round-5 拆 review：每个有 reviewer 的 skill 都把 worker 与 reviewer 拆为独立 subagent step（spec §6.9 单 step 单 envelope + spec §6.11 model 表）；infra-diagnose 按 spec §6.11 单流程模型不引入 reviewer。

**Architecture:** β-lite skill 骨架由 6 类 file 组成（spec §6.3-6.6）；workflow.yaml v2（spec §6.8）声明 `default_dispatch / default_model / default_effort` + `metadata.event_kinds_emitted / artifact_kinds_produced` + per-step `dispatch / model / effort / validators / failure_modes`；inline phase 由 orchestrator 跑、subagent phase 由 engine `phase-dispatcher.ts` 通过 Agent tool `model` 参数显式 spawn（spec §6.9）。每个 skill 都用 P2 commit 6.b 落地的 Phase Dispatcher，不依赖 LLM 自己拉子 agent。

**Tech Stack:** Bun 1.3+ · TypeScript · `yaml` (workflow parser) · `gray-matter` (frontmatter) · `ajv` (artifact JSON schema validator) · `proper-lockfile` (event writer，已在 P2 落地)

---

## Pre-flight

- [ ] **0.1 主工作树提交本地改动**

```bash
git -C /Users/poco/Projects/kata status --porcelain
# 如有 tracked / untracked 改动：
git -C /Users/poco/Projects/kata add -A
git -C /Users/poco/Projects/kata commit -m "chore: 🧹 save pre-worktree local changes"
```

- [ ] **0.2 创建 detached worktree**

```bash
ROOT=/Users/poco/Projects/kata
W=$ROOT/.worktrees/p3-skill-migration
git -C $ROOT worktree add --detach $W main
mkdir -p $W/workspace/kata
ln -s $ROOT/workspace/kata/.kata $W/workspace/kata/.kata
cd $W
```

- [ ] **0.3 验证 P1 + P2 全部并入 main 并可用**

```bash
cd $W
test -f .claude/contracts/skill-manifest.yaml || { echo "P1 not merged"; exit 1; }
test -f .claude/contracts/schemas/blackboard-slots.json || { echo "P1#4.a not merged"; exit 1; }
test -f engine/src/runtime/event-validator.ts || { echo "P2#6.a not merged"; exit 1; }
test -f engine/src/runtime/phase-dispatcher.ts || { echo "P2#6.b not merged"; exit 1; }
test -f engine/src/runtime/staged-transaction.ts || { echo "P2#6.a not merged"; exit 1; }
test -f .claude/skills/_shared/case-qa.md || { echo "P1#5 _shared/case-qa.md missing"; exit 1; }
bun install
bun test
bun run check:skills
```

Expected: all green; `_shared/case-qa.md` 存在（P1#5 已建）；`skill-manifest.yaml` v2 schema 已成立；workflow v2 parser 可读 `default_dispatch / metadata / by_mode`（P1#4.a 已覆盖）。

如果 P1#4.a parser 不支持 `_by_mode` 后缀字段，先回到 P1 补丁修复，再做 P3。本 plan 假设 v2 parser 已支持 `blackboard_inputs_by_mode / blackboard_outputs_by_mode / validators_by_mode`。

- [ ] **0.3a 安装 ajv 依赖**

```bash
cd $W
bun add ajv ajv-formats
```

期望：`package.json` 和 `bun.lock` 更新；diff 仅含 `ajv` + `ajv-formats` 两条新增。这两个依赖在 P3 commit 7 内被 `engine/src/runtime/artifact-validator.ts` 使用。

- [ ] **0.4 任务 todo 注册**

```text
TaskCreate:
  #1 Commit 7 case-draft β-lite migration（含 fake-orchestrator smoke 验证）
  #2 Commit 8.1 defect-analyze 三合一（bug-file + conflict-analyze + diff-scan）
  #3 Commit 8.2 case-edit migration
  #4 Commit 8.3 case-hotfix migration（含 hotfix-archive-format.md 拆 80 行）
  #5 Commit 8.4 infra-diagnose migration
  #6 Commit 8.5 knowledge-curate migration
  #7 Commit 8.6 workspace-manage migration
  #8 Commit 8.7 playwright-automation migration（含 references 拆分 16→分类）
  #9 P3 总自审 + smoke events.jsonl 形态抽查
```

---

## File Structure（全 P3 写完后的目标态）

### 8 个 skill 目录骨架（统一）

```
.claude/skills/<skill-id>/
├── SKILL.md                                 # ≤100 行（defect-analyze ≤80，spec §6.12）
├── phases/
│   ├── §1-<step-id>.md                      # ≤150 行
│   ├── §2-<step-id>.md
│   └── …
├── reviewers/                               # 可选：纯 inline catalog skill 不创建（如 workspace-manage）
│   ├── spec-reviewer.md                     # ≤200 行
│   └── quality-reviewer.md                  # ≤200 行（仅 case-draft / defect-analyze / playwright-automation 有）
├── workers/                                 # 可选：纯 inline catalog skill 不创建（如 workspace-manage）
│   └── <role>.md                            # ≤200 行
├── rules/
│   └── <topic>.md                           # ≤80 行
└── fewshots/
    └── <scenario>.md                        # ≤100 行
```

注：reviewers/ 和 workers/ 是可选目录。spec §6.7 中 workspace-manage 无 reviewer / worker（纯 inline catalog 操作），不创建这两个子目录；其 shape test 必须显式断言不存在。**spec §6.11 中 infra-diagnose 是单流程模型，只有 workers/ssh-worker.md，不含 reviewers/ 子目录；其 shape test 必须显式断言 `reviewers/` 不存在。** 其余 6 个 skill（case-draft / case-edit / case-hotfix / defect-analyze / knowledge-curate / playwright-automation）至少含 reviewers/spec-reviewer.md 和 workers/<role>.md。

被删除的：
- `.claude/skills/<id>/references/**`（整目录删，内容按 6 类重分配）
- `.claude/skills/bug-file/`、`.claude/skills/conflict-analyze/`、`.claude/skills/diff-scan/`（合到 defect-analyze）

### workflow.yaml v2（每 skill 一份）

```
.claude/contracts/workflows/
├── case-draft.yaml                          # v2
├── case-edit.yaml                           # v2
├── case-hotfix.yaml                         # v2
├── defect-analyze.yaml                      # v2 + by_mode 扩展
├── infra-diagnose.yaml                      # v2
├── knowledge-curate.yaml                    # v2
├── workspace-manage.yaml                    # v2
└── playwright-automation.yaml               # v2 + per-phase model
```

被删除的：旧 `case-draft.yaml` v1（13 step）等同名文件直接覆写为 v2。

### 新增 artifact schemas

```
.claude/contracts/schemas/
├── event.json                               # P2 已建
├── artifact-archive.json                    # P3#7 新建
├── artifact-xmind.json                      # P3#7 新建
├── artifact-manifest.json                   # P3#7 新建
├── artifact-metadata.json                   # P3#7 新建
├── artifact-defect-report.json              # P3#8.1 新建
├── artifact-conflict-resolution-plan.json   # P3#8.1 新建
├── artifact-hotfix-case-bundle.json         # P3#8.3 新建
├── artifact-diag-report.json                # P3#8.4 新建
├── artifact-knowledge-entry.json            # P3#8.5 新建
├── artifact-workspace-render.json           # P3#8.6 新建
└── artifact-playwright-suite.json           # P3#8.7 新建
```

### Engine 代码增量

```
engine/src/runtime/
├── artifact-validator.ts                    # P3#7 新建（ajv 加载 schemas/artifact-*.json）
└── phase-dispatcher.ts                      # P2 已建，本 plan 不改

engine/src/skills/
├── workflow-schema.ts                       # P1 已建 v2，本 plan 不改
└── manifest-loader.ts                       # P1 已建，本 plan 不改

engine/tests/runtime/
├── artifact-validator.test.ts               # P3#7 新建
├── case-draft-events.smoke.test.ts          # P3#7 新建（fake-orchestrator smoke）
├── defect-analyze-events.smoke.test.ts      # P3#8.1 新建（mode-specific 路径）
└── playwright-automation-events.smoke.test.ts # P3#8.7 新建

engine/tests/skills/
└── workflow-v2-coverage.test.ts             # P3 合计补，确保 8 个 skill workflow 都通过 v2 lint
```

---

## Commit 7: `refactor: ✨ migrate case-draft to β-lite + E`

**目标:** case-draft 从 P1#4.b 留下的 v2 schema 13 step 中转态升 β-lite final 6 phase 结构（source-intake / atomize / draft / spec-review / quality-review / output）；engine 通过 P2 Phase Dispatcher emit events；fake-orchestrator smoke 验证 `events.jsonl` 形态正确（phase 序列 + 至少 4 个 artifact_written + 3 对 subagent_dispatched/completed，对应 draft / spec-review / quality-review 3 个 subagent step）。

**Files:**
- Create: `.claude/skills/case-draft/phases/§1-source-intake.md`
- Create: `.claude/skills/case-draft/phases/§2-atomize.md`
- Create: `.claude/skills/case-draft/phases/§3-draft.md`
- Create: `.claude/skills/case-draft/phases/§4-spec-review.md`
- Create: `.claude/skills/case-draft/phases/§5-quality-review.md`
- Create: `.claude/skills/case-draft/phases/§6-output.md`
- Create: `.claude/skills/case-draft/reviewers/spec-reviewer.md`（替换旧 `references/spec-reviewer-prompt.md`）
- Create: `.claude/skills/case-draft/reviewers/quality-reviewer.md`（替换旧 `references/quality-reviewer-prompt.md`）
- Create: `.claude/skills/case-draft/workers/case-worker.md`（替换旧 `references/worker-prompt.md`）
- Create: `.claude/skills/case-draft/fewshots/greenfield-prd.md`（重写自 `references/fewshots/case-format-sample.md`）
- Create: `.claude/skills/case-draft/fewshots/archive-format.md`（保留 `case-format-sample.xmind.md` 的映射对照）
- Modify: `.claude/skills/case-draft/SKILL.md`（73 → ≤100，重写）
- Modify: `.claude/skills/case-draft/rules/naming-convention.md`（保留，校验 ≤80 行）
- Delete: `.claude/skills/case-draft/references/**`（整目录）
- Delete: `.claude/skills/case-draft/rules/case-qa.md`（已在 P1#5 移到 `_shared/`，确认删除）
- Modify: `.claude/contracts/workflows/case-draft.yaml`（P1#4.b v2 schema 13 step → β-lite v2 6 phase）
- Modify: `.claude/contracts/skill-manifest.yaml`（更新 `case-draft.phases / workers / reviewers` facets 索引）
- Create: `.claude/contracts/schemas/artifact-archive.json`
- Create: `.claude/contracts/schemas/artifact-xmind.json`
- Create: `.claude/contracts/schemas/artifact-manifest.json`
- Create: `.claude/contracts/schemas/artifact-metadata.json`
- Create: `engine/src/runtime/artifact-validator.ts`
- Create: `engine/tests/runtime/artifact-validator.test.ts`
- Create: `engine/tests/runtime/case-draft-events.smoke.test.ts`

### Step 7.1 — Step 7.5: 写 phase 解析测试（红）

- [ ] **7.1 写 failing test 1：case-draft 6 phase 顺序**

新文件 `engine/tests/runtime/case-draft-phases.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test'
import { parseWorkflow } from '../../src/skills/workflow-schema'
import { readFileSync } from 'node:fs'

describe('case-draft workflow v2 phase index', () => {
  test('must contain exactly 6 phases in canonical order', () => {
    const wf = parseWorkflow(readFileSync('.claude/contracts/workflows/case-draft.yaml', 'utf8'))
    expect(wf.steps.map((s) => s.id)).toEqual([
      'source-intake',
      'atomize',
      'draft',
      'spec-review',
      'quality-review',
      'output',
    ])
  })

  test('§3-draft / §4-spec-review / §5-quality-review must be dispatch=subagent with correct model+effort', () => {
    const wf = parseWorkflow(readFileSync('.claude/contracts/workflows/case-draft.yaml', 'utf8'))
    const byId = Object.fromEntries(wf.steps.map((s) => [s.id, s]))
    expect(byId.draft.dispatch).toBe('subagent')
    expect(byId.draft.model).toBe('sonnet')
    expect(byId.draft.effort).toBe('high')
    expect(byId['spec-review'].dispatch).toBe('subagent')
    expect(byId['spec-review'].model).toBe('haiku')
    expect(byId['spec-review'].effort).toBe('low')
    expect(byId['quality-review'].dispatch).toBe('subagent')
    expect(byId['quality-review'].model).toBe('sonnet')
    expect(byId['quality-review'].effort).toBe('medium')
  })

  test('default_dispatch / default_model / default_effort must be set', () => {
    const wf = parseWorkflow(readFileSync('.claude/contracts/workflows/case-draft.yaml', 'utf8'))
    expect(wf.default_dispatch).toBe('inline')
    expect(wf.default_model).toBe('sonnet')
    expect(wf.default_effort).toBe('high')
  })

  test('metadata.event_kinds_emitted covers required minimal set', () => {
    const wf = parseWorkflow(readFileSync('.claude/contracts/workflows/case-draft.yaml', 'utf8'))
    const declared = new Set(wf.metadata?.event_kinds_emitted ?? [])
    for (const kind of [
      'phase_entered',
      'phase_exited',
      'decision_made',
      'artifact_written',
      'validator_failed',
      'blocked',
      'handoff_emitted',
    ]) {
      expect(declared.has(kind)).toBe(true)
    }
  })
})
```

- [ ] **7.2 跑测试确认 4 个 fail**

```bash
bun test engine/tests/runtime/case-draft-phases.test.ts
```

Expected: 4 failed (workflow 仍是 v1 schema，steps id 不对)。

- [ ] **7.3 写 failing test 2：artifact schema 存在**

新文件 `engine/tests/runtime/artifact-validator.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { validateArtifact } from '../../src/runtime/artifact-validator'

const SCHEMAS = [
  'artifact-archive.json',
  'artifact-xmind.json',
  'artifact-manifest.json',
  'artifact-metadata.json',
] as const

describe('artifact schemas', () => {
  for (const file of SCHEMAS) {
    test(`schema file ${file} exists`, () => {
      expect(existsSync(`.claude/contracts/schemas/${file}`)).toBe(true)
    })
  }

  test('validateArtifact returns ok for valid archive object', () => {
    const obj = {
      schema_version: 1,
      feature_id: '2026-05-001',
      title: 'sample feature',
      cases: [{ case_id: 'C001', title: 'login happy path', steps: [], priority: 'P0' }],
    }
    const r = validateArtifact('archive', obj)
    expect(r.ok).toBe(true)
  })

  test('validateArtifact rejects archive missing required feature_id', () => {
    const r = validateArtifact('archive', { schema_version: 1, title: 'no id', cases: [] })
    expect(r.ok).toBe(false)
    expect(r.errors?.[0].instancePath).toMatch(/feature_id|root/)
  })
})
```

- [ ] **7.4 跑测试确认 6 个 fail**

```bash
bun test engine/tests/runtime/artifact-validator.test.ts
```

Expected: 6 failed (schema 文件不存在 + validator 未导出)。

- [ ] **7.5 写 failing test 3：phase 文件长度上限**

新文件 `engine/tests/skills/case-draft-shape.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = '.claude/skills/case-draft'

describe('case-draft β-lite shape', () => {
  test('SKILL.md ≤ 100 lines', () => {
    const lines = readFileSync(join(BASE, 'SKILL.md'), 'utf8').split('\n').length
    expect(lines).toBeLessThanOrEqual(100)
  })

  test.each([
    'phases/§1-source-intake.md',
    'phases/§2-atomize.md',
    'phases/§3-draft.md',
    'phases/§4-spec-review.md',
    'phases/§5-quality-review.md',
    'phases/§6-output.md',
  ])('%s ≤ 150 lines', (rel) => {
    const lines = readFileSync(join(BASE, rel), 'utf8').split('\n').length
    expect(lines).toBeLessThanOrEqual(150)
  })

  test.each(['reviewers/spec-reviewer.md', 'reviewers/quality-reviewer.md'])(
    '%s ≤ 200 lines',
    (rel) => {
      const lines = readFileSync(join(BASE, rel), 'utf8').split('\n').length
      expect(lines).toBeLessThanOrEqual(200)
    },
  )

  test('workers/case-worker.md ≤ 200 lines', () => {
    const lines = readFileSync(join(BASE, 'workers/case-worker.md'), 'utf8').split('\n').length
    expect(lines).toBeLessThanOrEqual(200)
  })

  test.each(['rules/naming-convention.md'])('%s ≤ 80 lines', (rel) => {
    const lines = readFileSync(join(BASE, rel), 'utf8').split('\n').length
    expect(lines).toBeLessThanOrEqual(80)
  })

  test.each(['fewshots/greenfield-prd.md', 'fewshots/archive-format.md'])(
    '%s ≤ 100 lines',
    (rel) => {
      const lines = readFileSync(join(BASE, rel), 'utf8').split('\n').length
      expect(lines).toBeLessThanOrEqual(100)
    },
  )
})
```

- [ ] **7.6 跑测试确认全 fail**

```bash
bun test engine/tests/skills/case-draft-shape.test.ts
```

Expected: all fail（β-lite 文件未建，老 `references/**` 还在）。

### Step 7.7 — Step 7.10: 建 artifact schemas（绿）

- [ ] **7.7 创建 artifact-archive.json**

`.claude/contracts/schemas/artifact-archive.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kata.dev/schemas/artifact-archive.json",
  "title": "QA Test Case Archive",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version", "feature_id", "title", "cases"],
  "properties": {
    "schema_version": { "type": "integer", "const": 1 },
    "feature_id": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{3}$" },
    "title": { "type": "string", "minLength": 1, "maxLength": 200 },
    "module": { "type": "string" },
    "version": { "type": "string" },
    "cases": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["case_id", "title", "priority"],
        "additionalProperties": false,
        "properties": {
          "case_id": { "type": "string", "pattern": "^C\\d{3,}$" },
          "title": { "type": "string", "minLength": 1, "maxLength": 200 },
          "priority": { "enum": ["P0", "P1", "P2", "P3"] },
          "preconditions": { "type": "array", "items": { "type": "string" } },
          "steps": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["action", "expected"],
              "additionalProperties": false,
              "properties": {
                "action": { "type": "string" },
                "expected": { "type": "string" }
              }
            }
          },
          "requirement_atom_ids": { "type": "array", "items": { "type": "string" } }
        }
      }
    }
  }
}
```

- [ ] **7.8 创建 artifact-xmind.json**

`.claude/contracts/schemas/artifact-xmind.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kata.dev/schemas/artifact-xmind.json",
  "title": "XMind Topics Mapping",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version", "root_topic", "case_topics"],
  "properties": {
    "schema_version": { "type": "integer", "const": 1 },
    "root_topic": { "type": "string", "minLength": 1 },
    "case_topics": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["case_id", "topic_path"],
        "additionalProperties": false,
        "properties": {
          "case_id": { "type": "string", "pattern": "^C\\d{3,}$" },
          "topic_path": { "type": "array", "items": { "type": "string" }, "minItems": 1 }
        }
      }
    }
  }
}
```

- [ ] **7.9 创建 artifact-manifest.json**

`.claude/contracts/schemas/artifact-manifest.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kata.dev/schemas/artifact-manifest.json",
  "title": "Case Drafting Manifest",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version", "feature_id", "case_drafting"],
  "properties": {
    "schema_version": { "type": "integer", "const": 1 },
    "feature_id": { "type": "string" },
    "case_drafting": {
      "type": "object",
      "required": ["requirement_atoms"],
      "additionalProperties": false,
      "properties": {
        "requirement_atoms": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["id", "source_refs", "evidence_kind", "ambiguity_class", "confidence"],
            "additionalProperties": false,
            "properties": {
              "id": { "type": "string" },
              "source_refs": { "type": "array", "minItems": 1 },
              "evidence_kind": { "enum": ["spec", "code", "screenshot", "user", "history"] },
              "ambiguity_class": { "enum": ["clear", "interpretable", "ambiguous"] },
              "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
            }
          }
        }
      }
    },
    "automation": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "intents": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["intent_id", "automation_status"],
            "properties": {
              "intent_id": { "type": "string" },
              "automation_status": { "enum": ["ready", "deferred", "blocked"] }
            }
          }
        }
      }
    }
  }
}
```

- [ ] **7.10 创建 artifact-metadata.json**

`.claude/contracts/schemas/artifact-metadata.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kata.dev/schemas/artifact-metadata.json",
  "title": "Feature Metadata",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "title", "version"],
  "properties": {
    "id": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{3}$" },
    "title": { "type": "string", "minLength": 1 },
    "version": { "type": "string" },
    "customer": { "type": "string" },
    "module": { "type": "string" },
    "lanhu_prd_id": { "type": "string" },
    "created_at": { "type": "string", "format": "date-time" }
  }
}
```

### Step 7.11 — Step 7.13: 写 `artifact-validator.ts`（绿）

- [ ] **7.11 创建 `engine/src/runtime/artifact-validator.ts`**

```typescript
import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export type ArtifactKind =
  | 'archive'
  | 'xmind'
  | 'manifest'
  | 'metadata'
  | 'defect-report'
  | 'conflict-resolution-plan'
  | 'hotfix-case-bundle'
  | 'diag-report'
  | 'knowledge-entry'
  | 'workspace-render'
  | 'playwright-suite'

export interface ValidateResult {
  readonly ok: boolean
  readonly errors?: readonly ErrorObject[]
}

const SCHEMA_DIR = resolve(process.cwd(), '.claude/contracts/schemas')

const ajv = new Ajv({ allErrors: true, strict: true })
addFormats(ajv)

// Pre-load all artifact-*.json schemas so $ref between schemas (e.g.
// artifact-hotfix-case-bundle.json → artifact-archive.json#/properties/cases/items)
// can be resolved by ajv.addSchema before compile.
let loaded = false
function loadAllSchemas(): void {
  if (loaded) return
  const files = readdirSync(SCHEMA_DIR).filter((f) => f.startsWith('artifact-') && f.endsWith('.json'))
  for (const file of files) {
    const schema = JSON.parse(readFileSync(resolve(SCHEMA_DIR, file), 'utf8'))
    const id = schema.$id ?? file
    if (!ajv.getSchema(id)) ajv.addSchema(schema, id)
  }
  loaded = true
}

const cache = new Map<ArtifactKind, ValidateFunction>()

function loadValidator(kind: ArtifactKind): ValidateFunction {
  loadAllSchemas()
  const hit = cache.get(kind)
  if (hit) return hit
  const path = resolve(SCHEMA_DIR, `artifact-${kind}.json`)
  const schema = JSON.parse(readFileSync(path, 'utf8'))
  const id = schema.$id ?? `artifact-${kind}.json`
  const existing = ajv.getSchema(id)
  const validate = existing ?? ajv.compile(schema)
  cache.set(kind, validate)
  return validate
}

export function validateArtifact(kind: ArtifactKind, instance: unknown): ValidateResult {
  const validate = loadValidator(kind)
  const ok = validate(instance) === true
  return ok ? { ok: true } : { ok: false, errors: validate.errors ?? [] }
}
```

注：`loadAllSchemas` 解决跨 schema `$ref`（如 `artifact-hotfix-case-bundle.json` 引用 `artifact-archive.json#/properties/cases/items`）；必须在 compile 任一 validator 前完成 addSchema。

依赖：本 commit 引入 `ajv` + `ajv-formats`（P2 仅引入 `proper-lockfile`）。Pre-flight 增量：

```bash
bun add ajv ajv-formats
```

将 `package.json` + `bun.lock` 一并进入 commit 7 文件清单。

- [ ] **7.12 跑 artifact-validator 测试**

```bash
bun test engine/tests/runtime/artifact-validator.test.ts
```

Expected: 6/6 pass。

- [ ] **7.13 commit 中间态（schema + validator）**

```bash
git add .claude/contracts/schemas/artifact-archive.json \
        .claude/contracts/schemas/artifact-xmind.json \
        .claude/contracts/schemas/artifact-manifest.json \
        .claude/contracts/schemas/artifact-metadata.json \
        engine/src/runtime/artifact-validator.ts \
        engine/tests/runtime/artifact-validator.test.ts
# 注：本 step 不实际 commit，只暂存，最后随 commit 7 一起提交
git status --porcelain
```

注：我们一次 commit 整 commit 7；本步只是 staged 检查点。


### Step 7.14 — Step 7.16: 写新 SKILL.md（绿）

- [ ] **7.14 覆写 `.claude/skills/case-draft/SKILL.md`**

```markdown
---
name: case-draft
description: >
  用户提供 PRD、设计稿、Lanhu、Axure 或功能描述并要求生成 QA 测试用例时使用。
argument-hint: <lanhu-url | axure-url | prd-path>
user-invocable: true
model: sonnet
effort: high
paths:
  - .claude/skills/case-draft/**
  - .claude/skills/_shared/**
  - .claude/contracts/workflows/case-draft.yaml
  - .claude/contracts/schemas/event.json
  - .claude/contracts/schemas/artifact-archive.json
  - .claude/contracts/schemas/artifact-xmind.json
  - .claude/contracts/schemas/artifact-manifest.json
  - .claude/contracts/schemas/artifact-metadata.json
  - workspace/**
context: fork
agent: general-purpose
---

# case-draft

接收需求源（Lanhu / Axure / PRD / 截图 / 描述），按 6 phase 流程产出 archive.md / cases.xmind / metadata.yaml / manifest.json 四件套 QA 测试用例。

## When to trigger
- 用户给出 Lanhu / Axure URL 并要求生成测试用例
- 用户给出 PRD markdown / 截图 / fixture 路径要求生成测试用例
- 用户口述需求并要求转测试用例

## Must not trigger when
- 用户只是要做 archive / XMind / CSV 之间的格式转换 → 路由 `case-edit`
- 用户给出 ZenTao bug URL / bug ID → 路由 `case-hotfix`
- 用户要基于已有用例生成 Playwright 自动化 → 路由 `playwright-automation`

## Hard rules
- Lanhu / Axure URL 输入全程静默执行 §1-source-intake，禁止任何技能宣告/进度叙述
- featureDir 由 `bun engine/bin/kata features resolve` 引擎返回，模型不得自行拼接
- 每个 requirement atom 携带 `evidence_kind / ambiguity_class / confidence / source_refs[]`
- archive.md / cases.xmind 正文只放人类可读用例；SourceRef 标识只在结构化层
- 用例与证据通过 `case_id + requirement_atom_ids` 对账
- blocking pending 非零时只输出 confirmation-package.md / archive.draft.md / unresolved-summary.md；归零后才落 archive.md / cases.xmind
- 阻塞或 worker 失败时通过 BlockedEnvelope 回主 agent，不直接询问用户
- 表单类用例：先建立"表单字段基线"，缺源码 / DOM / 截图时阻塞，不得用历史用例补齐
- automation.intents[].automation_status = ready 的 AutomationIntent 移交 `playwright-automation`

## Phase index
按 `.claude/contracts/workflows/case-draft.yaml` 推进，逐 phase 加载对应文件：

| Phase | 文件 | 简介 |
|---|---|---|
| §1 source-intake | phases/§1-source-intake.md | 拉取需求源、模块识别、二次确认、历史上下文 |
| §2 atomize | phases/§2-atomize.md | 拆原子需求、歧义扫描、组装 confirmation-package、合并用户反馈、覆盖矩阵 |
| §3 draft | phases/§3-draft.md | 调度 case-worker subagent 产出 draft archive |
| §4 spec-review | phases/§4-spec-review.md | spec-reviewer（haiku/low）做机械合规 lint |
| §5 quality-review | phases/§5-quality-review.md | quality-reviewer（sonnet/medium）做内容质量审查 |
| §6 output | phases/§6-output.md | 落 4 件套、automation-handoff |

## Loaded by phase
| Phase | Reviewers | Workers | Rules | Fewshots |
|---|---|---|---|---|
| §1 | — | — | rules/naming-convention.md | — |
| §2 | — | — | _shared/source-ref-rules.md | — |
| §3 | — | workers/case-worker.md | _shared/case-qa.md | fewshots/greenfield-prd.md, fewshots/archive-format.md |
| §4 | reviewers/spec-reviewer.md | — | _shared/case-qa.md | — |
| §5 | reviewers/quality-reviewer.md | — | _shared/case-qa.md | — |
| §6 | — | — | _shared/case-qa.md | fewshots/archive-format.md |

## Output artifacts
| Kind | Path pattern | Schema |
|---|---|---|
| archive | `workspace/<project>/features/<feature>/archive.md` | `.claude/contracts/schemas/artifact-archive.json` |
| xmind | `workspace/<project>/features/<feature>/cases.xmind` | `.claude/contracts/schemas/artifact-xmind.json` |
| metadata | `workspace/<project>/features/<feature>/metadata.yaml` | `.claude/contracts/schemas/artifact-metadata.json` |
| manifest | `workspace/<project>/features/<feature>/manifest.json` | `.claude/contracts/schemas/artifact-manifest.json` |
```

行数预估 96 行（含 frontmatter 24 + body 72）。如超 100 行，先压缩 "Loaded by phase" 表（合 cell）。

- [ ] **7.15 跑 SKILL.md 行数测试**

```bash
bun test engine/tests/skills/case-draft-shape.test.ts -t "SKILL.md ≤ 100"
```

Expected: PASS。

- [ ] **7.16 扩展 `frontmatter-policy.ts` Claude allowlist + 跑 frontmatter 校验**

P3 commit 7 同步修改 `engine/src/skills/frontmatter-policy.ts`：

1. SKILL.md Claude allowlist 增 `argument-hint`（spec §6.1 line 281）
2. 新增 reviewer 文件 frontmatter allowlist：仅 `name` 单字段
3. 新增 worker 文件 frontmatter allowlist：仅 `name` 单字段
4. reviewer / worker frontmatter 必填 `name`（kebab-case，与文件名 stem 一致）；不允许其它字段（model/effort 由 workflow.yaml step 携带，遵循 spec §6.8 + §6.9 调度契约）

```bash
bun run check:skills 2>&1 | head -30
```

Expected: 不报 `argument-hint` 不在 allowlist；可能仍有其他 v1→v2 迁移项报错（phase 文件未建），属预期。

### Step 7.17 — Step 7.21: 写 6 个 phase 文件（绿）

- [ ] **7.17 创建 `phases/§1-source-intake.md`**

```markdown
# §1 Source Intake

## Goal
拉取 Lanhu / Axure / PRD 等需求源，确认 project + module，整理 sources + source_refs，标记可能的歧义区。

## Inputs (blackboard reads)
- `user_input`（必填）

## Outputs (blackboard writes)
- `sources`（必填，对象数组：{ kind, url, fetched_at, source_ref_id }）
- `source_refs`（必填，SourceRef ID → 证据指针的映射表）
- `project_module`（必填，{ project, module }）
- `historical_context`（可选，{ history_inferred, evidence_anchors }）

## Steps
1. 解析 `user_input` 中的 URL / 路径 / 文本，按格式分诊（lanhu / axure / prd-md / screenshot / fixture / free-text）
2. 调用 `bun engine/bin/kata features resolve --project <p> --module <m> --lanhu-page <id> --json`，取 featureDir 并写 `featureDir / featureId` 到 blackboard `project_module`
3. 对每个 URL 调用对应 plugin fetch（Lanhu / Axure），写本地缓存 `workspace/<project>/.kata/sources/<source_ref_id>.json`
4. 若 Lanhu 鉴权失败：`emit blocked` 并写 `confirmation-package.md` 草稿；不进入 §2
5. 若 module 模糊：`emit decision_made { topic: 'module_ambiguous' }`，询问用户消歧
6. 历史上下文：扫描 `workspace/<project>/features/` 找近似 feature，写 `historical_context.history_inferred`

## Hard rules
- featureDir 必须来自 `kata features resolve`，不得自行拼接
- 所有外部抓取产物落 `workspace/<project>/.kata/sources/<source_ref_id>.json`，不进 feature 目录
- Lanhu / Axure URL 输入全程静默，禁止技能宣告
- `historical_context` 仅作参考，不作为最终用例事实

## Failure modes & recovery
- `SOURCE_FETCH_BLOCKED`：emit `blocked` → 写 `archive.draft.md` 阻塞两行模板 → 不进 §2
- `LANHU_AUTH_REQUIRED`：emit `blocked` → 模板回复用户授权指南 → 不进 §2
- `MODULE_AMBIGUOUS`：emit `validator_failed { validator: 'project-module-resolver' }` → ask user → 重入 step 2
- `kata features resolve` 引擎错（exit ≠ 0）：emit `blocked { reason: 'engine_error' }`

## Events emitted
- `phase_entered`（自动）
- `decision_made { topic: 'mode_dispatch', value: <mode> }`
- `decision_made { topic: 'project_module', value: <p+m> }`
- `decision_made { topic: 'source_snapshot', payload: { source_ref_id, path, sha256 } }`（每源一条；source snapshot 不进 artifact_kinds_produced）
- `blocked` / `validator_failed`（失败时）
- `phase_exited`（自动）
```

预估 60 行内。

- [ ] **7.18 创建 `phases/§2-atomize.md`**

```markdown
# §2 Atomize

## Goal
把 sources + project_module + historical_context 拆成 requirement_atoms，扫歧义并组装 confirmation-package，合并用户反馈后产出 coverage_matrix。

## Inputs (blackboard reads)
- `sources`、`source_refs`、`project_module`、`historical_context`

## Outputs (blackboard writes)
- `requirement_atoms`（必填，每条带 evidence_kind / ambiguity_class / confidence / source_refs[]）
- `open_questions`（可选，blocking + non-blocking 二分）
- `confirmation_package_path`（仅当 blocking 非空时填）
- `coverage_matrix`（必填，{ atom_id → coverage_dimensions[] }）

## Steps
1. 从 `sources` 抽取候选原子需求；每条 atom = { id, statement, source_refs, evidence_kind, ambiguity_class, confidence }
2. 调用 spec validator 校验 atom 字段完整性；缺字段 emit `validator_failed`
3. 对每条 atom 跑 ambiguity-scan rule（`_shared/source-ref-rules.md` 中定义）
4. blocking ambiguities → 写 `workspace/<project>/features/<feature>/.process/confirmation-package.md`
5. blocking pending = 0 → 进入 step 6；> 0 → emit `blocked`，等用户反馈
6. 组装 coverage_matrix：按 (功能点 × 优先级 × 边界类型) 维度展开 atom

## Hard rules
- 每条 atom 必有 ≥1 个 source_ref，否则 emit `validator_failed`
- ambiguity_class ∈ { clear, interpretable, ambiguous }；ambiguous 必进 blocking
- coverage_matrix 必须 link 回 atom_id；不得引入未声明的 atom
- 不得在 §2 直接生成 archive.md / cases.xmind

## Failure modes & recovery
- `atom_missing_source_ref`：emit `validator_failed { validator: 'atom-schema' }` → fix 后重入
- `coverage_link_broken`：emit `validator_failed { validator: 'coverage-link' }` → fix 后重入
- `blocking_questions_open`：emit `blocked { reason: 'awaiting_user_confirmation' }` → 写 confirmation-package.md，phase 不退出

## Events emitted
- `phase_entered` / `phase_exited`（自动）
- `decision_made { topic: 'atom_extraction', value: { count: N } }`
- `artifact_written { kind: 'confirmation-package' }`（如有 blocking）
- `validator_failed` / `blocked`（按需）
```

预估 60 行内。

- [ ] **7.19 创建 `phases/§3-draft.md`**

```markdown
# §3 Draft

## Goal
通过 case-worker subagent 把 requirement_atoms + coverage_matrix 转 draft archive（archive.draft.md + cases.draft.xmind.md）。

## Inputs (blackboard reads)
- `requirement_atoms`、`coverage_matrix`、`source_refs`、`project_module`

## Outputs (blackboard writes)
- `draft_archive_path`（必填，draft archive.md 路径）
- `draft_xmind_path`（必填）
- `draft_case_index`（必填，[ { case_id, atom_id, title, priority } ]）

## Steps
1. Phase Dispatcher spawn case-worker subagent（model=sonnet, effort=high，由 workflow.yaml step.draft 显式声明）
2. worker envelope 协议（见 `workers/case-worker.md`）：input 包含 atoms / coverage / source_refs 三块；output 必须返回 draft archive 结构 + case_index
3. worker 完成 → engine emit `subagent_completed`；orchestrator 校验 case_id 全局唯一 + atom_id 全部映射到 case
4. 校验失败 → emit `validator_failed` → 重派 worker（最多重试 2 次）
5. 校验通过 → 写 `archive.draft.md` 到 `.process/`；emit `artifact_written`

## Hard rules
- case_id 全局唯一（per feature）
- 每条 case 必有 ≥1 个 `requirement_atom_ids`
- 表单字段必须先匹配 baseline；不得引入 baseline 不存在的字段
- draft archive 仅写 `.process/`，不写 feature 根
- worker 失败重试 ≤ 2；超出 emit `blocked { reason: 'worker_exhausted' }`

## Failure modes & recovery
- `worker_timeout`：emit `subagent_failed { reason: 'timeout' }` → 重派；2 次仍失败 → `blocked`
- `case_id_collision`：emit `validator_failed { validator: 'case-id-unique' }` → 重派 worker，提示去重
- `atom_unmapped`：emit `validator_failed { validator: 'atom-coverage' }` → 重派

## Events emitted
- `phase_entered` / `phase_exited`（自动）
- `subagent_dispatched` / `subagent_completed` / `subagent_failed`（engine 自动）
- `artifact_written { kind: 'archive', path: '.process/archive.draft.md' }`
- `validator_failed` / `blocked`（按需）
```

预估 50 行内。

- [ ] **7.20a 创建 `phases/§4-spec-review.md`**

```markdown
# §4 Spec Review

## Goal
spec-reviewer subagent 做机械合规 lint。Gate 不过禁止进入 §5。

## Inputs (blackboard reads)
- `draft_archive_path`、`draft_xmind_path`、`draft_case_index`、`coverage_matrix`、`source_refs`

## Outputs (blackboard writes)
- `spec_verdict`（必填，{ pass: boolean, violations: [...] }）
- `spec_review_artifact_path`（可选，verdict json 落 .process/）

## Steps
1. Phase Dispatcher spawn spec-reviewer subagent（workflow.yaml step 上 model=haiku, effort=low）
2. spec-reviewer 校验：archive schema、xmind schema、SourceRef 分层、case_id 唯一、atom 映射
3. emit `decision_made { topic: 'spec_verdict' }`；不过 → 回 §3 重派 worker（带 violations 反馈）

## Hard rules
- spec gate 不过禁止跳到 §5 quality-review
- review subagent 不得修改 draft archive；只输出 verdict + violations
- 循环（§3 ↔ §4）≤ 3 轮，超出 emit `blocked { reason: 'spec_review_exhausted' }`

## Failure modes & recovery
- `verdict_invalid`：emit `validator_failed { validator: 'review-envelope' }` → 重派 reviewer
- `spec_violation`：emit `decision_made { topic: 'spec_verdict', value: 'fail' }` → 回 §3
- `spec_loop_exhausted`：emit `blocked` → 等用户介入

## Events emitted
- `phase_entered` / `phase_exited`（自动）
- `subagent_dispatched` / `subagent_completed`（engine 自动）
- `decision_made { topic: 'spec_verdict' }`
- `validator_failed` / `blocked`（按需）
```

预估 35 行内。

- [ ] **7.20b 创建 `phases/§5-quality-review.md`**

```markdown
# §5 Quality Review

## Goal
quality-reviewer subagent 做内容质量审查。仅在 spec_verdict.pass===true 时进入；Gate 不过禁止进入 §6。

## Inputs (blackboard reads)
- `draft_archive_path`、`draft_xmind_path`、`draft_case_index`、`coverage_matrix`、`source_refs`、`spec_verdict`

## Outputs (blackboard writes)
- `quality_verdict`（必填，{ pass: boolean, violations: [...] }）
- `quality_review_artifact_path`（可选，verdict json 落 .process/）

## Steps
1. 前置 gate：spec_verdict.pass !== true → emit `validator_failed { validator: 'gate-precondition' }` → 回 §4
2. Phase Dispatcher spawn quality-reviewer subagent（workflow.yaml step 上 model=sonnet, effort=medium）
3. quality-reviewer 校验：标题可读性、步骤完整性、覆盖深度、表单字段一致性
4. emit `decision_made { topic: 'quality_verdict' }`；不过 → 回 §3 重派 worker

## Hard rules
- spec gate 未过禁止进入；quality gate 不过禁止进 §6
- review subagent 不得修改 draft archive
- 循环（§3 ↔ §5）≤ 3 轮，超出 emit `blocked { reason: 'quality_review_exhausted' }`

## Failure modes & recovery
- `verdict_invalid`：emit `validator_failed { validator: 'review-envelope' }` → 重派 reviewer
- `quality_violation`：emit `decision_made { topic: 'quality_verdict', value: 'fail' }` → 回 §3
- `gate_precondition_unmet`：emit `validator_failed { validator: 'gate-precondition' }` → 回 §4

## Events emitted
- `phase_entered` / `phase_exited`（自动）
- `subagent_dispatched` / `subagent_completed`（engine 自动）
- `decision_made { topic: 'quality_verdict' }`
- `validator_failed` / `blocked`（按需）
```

预估 35 行内。

- [ ] **7.21 创建 `phases/§6-output.md`**

```markdown
# §6 Output

## Goal
把通过双 review 的 draft 落 4 件套（archive.md / cases.xmind / metadata.yaml / manifest.json），并按 manifest.automation.intents 派发 handoff。

## Inputs (blackboard reads)
- `draft_archive_path`、`draft_xmind_path`、`draft_case_index`、`spec_verdict`、`quality_verdict`、`project_module`、`requirement_atoms`、`coverage_matrix`

## Outputs (blackboard writes)
- `archive_path`（必填）
- `xmind_path`（必填）
- `metadata_path`（必填）
- `manifest_path`（必填）
- `handoff_envelopes`（可选，要派发的 AutomationIntent 列表）

## Steps
1. 校验 spec_verdict.pass === true && quality_verdict.pass === true；任一 false → emit `validator_failed` → 不写 final
2. 把 draft archive.md / cases.xmind 复制到 featureDir 根（去掉 .draft 后缀）
3. 写 metadata.yaml（字段：id / title / module / version / customer / lanhu_prd_id / created_at）
4. 写 manifest.json（`case_drafting.requirement_atoms[]` + `automation.intents[]`）
5. 用 `artifact-validator.ts` 对 4 件套分别跑 schema 校验
6. 任一 schema 校验失败 → emit `validator_failed` → 回滚（删 final 文件）→ 回 §5 重 quality review（或 §4 → §3 依 violation 性质）
7. 全过 → emit `artifact_written` × 4 + `handoff_emitted`（如有 ready intent）→ phase_exited

## Hard rules
- spec gate + quality gate 任一未过禁止落 final
- artifact-validator 任一项失败必须回滚 final 文件
- handoff_envelopes 只挂 automation_status=ready 的 intent
- 不得在 §6 修改 atom / coverage / draft archive 内容

## Failure modes & recovery
- `review_gate_unmet`：emit `validator_failed { validator: 'gate-precondition' }` → 回 §4 spec-review 或 §5 quality-review（按 verdict 来源）
- `schema_invalid`：emit `validator_failed { validator: 'artifact-<kind>' }` → 回滚 → 回 §4
- `io_error`：emit `validator_failed { validator: 'io' }` → 重试 1 次 → 仍失败 emit `blocked`

## Events emitted
- `phase_entered` / `phase_exited`（自动）
- `artifact_written { kind: 'archive' | 'xmind' | 'metadata' | 'manifest' }`（4 条）
- `handoff_emitted { target: 'playwright-automation', envelope: {...} }`（每 ready intent 一条）
- `validator_failed` / `blocked`（按需）
```

预估 60 行内。


### Step 7.22 — Step 7.25: 写 reviewers / workers（绿）

**Reviewer / Worker frontmatter policy（贯穿全 P3）**

`reviewers/<role>.md` 与 `workers/<role>.md` 的 markdown 头部必须包含下列 frontmatter：

```yaml
---
name: <role-id>              # 必填，与文件名 stem 一致
---
```

**只允许 `name` 字段。** model / effort 由 workflow.yaml step 上的 `model / effort` 字段携带（P2 `decidePhase` fallback：step → workflow default → skillDefaults，符合 spec §6.8 + §6.9 调度契约）。每个 review step 一对一只引用 1 个 reviewer；多 reviewer 必须拆成多个 step（如 case-draft §4-spec-review + §5-quality-review）。

`frontmatter-policy.ts` 的扩展：reviewer / worker 文件 frontmatter allowlist = `{name}` 单字段。多余字段触发 `check:skills` 报错。

下方各 reviewer / worker 文件模板均按此 policy 写 frontmatter（只含 name），文中不再重复说明。

- [ ] **7.22 创建 `reviewers/spec-reviewer.md`**

从旧 `references/spec-reviewer-prompt.md`（172 行）改造：去掉 v1 workflow step 描述，按 spec §6.4 模板组织为 Role + Inputs + Lint checklist + Output JSON schema + Emit events 五段；≤200 行。

```markdown
---
name: spec-reviewer
---

# spec-reviewer (case-draft)

## Role
机械化 lint draft archive 是否符合 spec：archive schema、xmind schema、SourceRef 分层、case_id 唯一、atom 映射、blocking pending 处理。

## Envelope (input from engine)

```json
{
  "draft_archive_path": "...",
  "draft_xmind_path": "...",
  "draft_case_index": [{ "case_id": "C001", "atom_id": "A001", "title": "...", "priority": "P0" }],
  "coverage_matrix": {...},
  "source_refs": {...}
}
```

## Lint checklist
1. archive.draft.md 通过 `artifact-archive.json` schema
2. cases.draft.xmind.md 通过 `artifact-xmind.json` schema
3. 所有 case_id 全局唯一（per feature）
4. 每条 case 至少 1 个 `requirement_atom_ids`
5. 每条 atom 至少在 1 条 case 中被引用
6. archive.md 正文不含 SourceRef ID（SR-、csv:: 等），SourceRef 只在结构化层
7. blocking pending != 0 时 archive.md 必须仍是 .draft 后缀
8. 表单类 case 字段必须能在 source_refs.form_baseline 找到

## Output envelope
```json
{
  "pass": true,
  "violations": [{ "code": "...", "case_id": "...", "message": "..." }]
}
```

## Hard rules
- 不修改 draft archive
- 不引入新 atom / case
- 单次 review 输出严格 JSON 协议；多余文本作为 envelope 之外的 thinking 块

## Failure modes
- `envelope_invalid`：emit `validator_failed { validator: 'review-envelope' }`
- `schema_unreachable`：emit `validator_failed { validator: 'schema-load' }`

## Events emitted
- `decision_made { topic: 'spec_verdict', value: <pass|fail> }`
- `validator_failed`（按需）
```

预估 60 行内（spec/quality reviewer 都不放完整 lint 例子）。

- [ ] **7.23 创建 `reviewers/quality-reviewer.md`**

从旧 `references/quality-reviewer-prompt.md`（87 行）改造，按相同 5 段模板：

```markdown
---
name: quality-reviewer
---

# quality-reviewer (case-draft)

## Role
内容质量审查：标题可读性、步骤完整性、覆盖深度、表单字段一致性、用户视角友好度。

## Envelope (input)
```json
{
  "draft_archive_path": "...",
  "spec_verdict": { "pass": true, "violations": [] },
  "coverage_matrix": {...}
}
```

## Quality checklist
1. 每条 case 标题 1 行 ≤80 字，能独立看懂
2. 步骤数 ≥ 2，每步含 action + expected
3. 前置条件可执行（可读出来直接照做）
4. 表单类 case 字段命名与 source_refs.form_baseline 完全一致
5. 覆盖矩阵 (功能 × 优先级 × 边界) 至少 80% 命中
6. 高优 P0/P1 case 覆盖 happy + 1 个 error path
7. 无重复 case（按标题相似度 0.85 阈值）

## Output envelope
```json
{
  "pass": true,
  "violations": [{ "code": "...", "case_id": "...", "severity": "high|medium|low", "message": "..." }]
}
```

## Hard rules
- 内容判断不退化为机械 lint（spec-reviewer 已做）
- 不修改 draft archive
- 重复用例必须给出比对依据
- 覆盖率判断必须 reference coverage_matrix，不可主观

## Failure modes
- `coverage_calc_failed`：emit `validator_failed`
- `envelope_invalid`：emit `validator_failed`

## Events emitted
- `decision_made { topic: 'quality_verdict', value: <pass|fail> }`
- `validator_failed`（按需）
```

预估 55 行内。

- [ ] **7.24 创建 `workers/case-worker.md`**

从旧 `references/worker-prompt.md`（119 行）改造，按 spec §6.4 worker 模板（Envelope protocol + Hard rules + Failure semantics）：

```markdown
---
name: case-worker
---

# case-worker

## Role
单次产出 draft archive + draft xmind + case_index 三件。worker 是无状态 subagent，依赖 envelope 输入，不读外部环境。

## Envelope (input)

```json
{
  "requirement_atoms": [...],
  "coverage_matrix": {...},
  "source_refs": {...},
  "project_module": { "project": "kata", "module": "case-draft" },
  "form_baseline": {...},
  "historical_context": {...},
  "retry_violations": [...]
}
```

`retry_violations` 仅在第 2 / 3 次重派时存在；含上次 spec/quality reviewer 的 violations，worker 必须针对性修复。

## Output envelope
```json
{
  "draft_archive_md": "<full markdown body>",
  "draft_xmind_md": "<full markdown body>",
  "case_index": [{ "case_id": "C001", "atom_id": "A001", "title": "...", "priority": "P0" }],
  "decisions": [{ "topic": "atom_coverage_strategy", "value": "..." }]
}
```

## Hard rules
- 每条 atom 至少映射 1 条 case；高优 atom（confidence < 0.8）必须有 ≥1 P0/P1 case
- case_id 自增 C001 起；不得跳号
- 表单字段命名严格 = `form_baseline` 字段名，不得改大小写 / 加空格 / 翻译
- 不得读 envelope 之外的源；缺信息 → 在 `decisions` 中声明 `gap: ...`
- archive.md / xmind.md 正文禁止出现 SourceRef ID
- archive.md / xmind.md 行数差异 ≤ 10%（每条 case 应在两份产物中都有 entry）
- 单次 token 限额：本 envelope ≤ 50K input；超出 emit `worker_failed { reason: 'context_oversized' }`

## Failure semantics
- output 必须严格 JSON；多余文本 → engine 视为 `envelope_invalid`
- 缺字段 → engine 视为 `schema_mismatch`
- worker 不直接 emit events；engine 在 wrapper 层 emit `subagent_dispatched/completed/failed`

## When retry_violations 存在
1. 逐条解析 violations.code
2. 标注本次修复方案在 `decisions[].topic = 'fix_strategy'`
3. 修复后重新输出完整 draft archive + xmind + case_index（不可只 patch 局部）
```

预估 70 行内。

- [ ] **7.25 跑 reviewers / workers 长度测试**

```bash
bun test engine/tests/skills/case-draft-shape.test.ts -t "reviewers|workers"
```

Expected: PASS（3 个文件均 ≤200 行）。

### Step 7.26 — Step 7.27: 重写 workflow.yaml v2（绿）

- [ ] **7.26 覆写 `.claude/contracts/workflows/case-draft.yaml`**

```yaml
name: case-draft
version: 2
default_dispatch: inline
default_model: sonnet
default_effort: high

metadata:
  event_kinds_emitted:
    - phase_entered
    - phase_exited
    - decision_made
    - artifact_written
    - validator_failed
    - blocked
    - handoff_emitted
  artifact_kinds_produced:
    - archive
    - xmind
    - metadata
    - manifest

steps:
  - id: source-intake
    dispatch: inline
    blackboard_inputs: [user_input]
    blackboard_outputs: [sources, source_refs, project_module, historical_context]
    failure_modes:
      - source_fetch_blocked
      - lanhu_auth_required
      - module_ambiguous
      - engine_error

  - id: atomize
    dispatch: inline
    blackboard_inputs: [sources, source_refs, project_module, historical_context]
    blackboard_outputs: [requirement_atoms, open_questions, confirmation_package_path, coverage_matrix]
    validators: [atom-schema, coverage-link, source-ref-coverage]
    failure_modes:
      - atom_missing_source_ref
      - coverage_link_broken
      - blocking_questions_open

  - id: draft
    dispatch: subagent
    model: sonnet
    effort: high
    workers: [case-worker]
    blackboard_inputs: [requirement_atoms, coverage_matrix, source_refs, project_module]
    blackboard_outputs: [draft_archive_path, draft_xmind_path, draft_case_index]
    validators: [case-id-unique, atom-coverage]
    failure_modes:
      - worker_timeout
      - case_id_collision
      - atom_unmapped
      - schema_mismatch

  - id: spec-review
    dispatch: subagent
    model: haiku
    effort: low
    reviewers: [spec-reviewer]
    blackboard_inputs: [draft_archive_path, draft_xmind_path, draft_case_index, coverage_matrix, source_refs]
    blackboard_outputs: [spec_verdict, spec_review_artifact_path]
    validators: [archive-schema, xmind-schema, review-envelope]
    failure_modes:
      - verdict_invalid
      - spec_violation
      - spec_loop_exhausted

  - id: quality-review
    dispatch: subagent
    model: sonnet
    effort: medium
    reviewers: [quality-reviewer]
    blackboard_inputs: [draft_archive_path, draft_xmind_path, draft_case_index, coverage_matrix, source_refs, spec_verdict]
    blackboard_outputs: [quality_verdict, quality_review_artifact_path]
    validators: [review-envelope, gate-precondition]
    failure_modes:
      - verdict_invalid
      - quality_violation
      - quality_loop_exhausted
      - gate_precondition_unmet

  - id: output
    dispatch: inline
    blackboard_inputs: [draft_archive_path, draft_xmind_path, draft_case_index, spec_verdict, quality_verdict, project_module, requirement_atoms, coverage_matrix]
    blackboard_outputs: [archive_path, xmind_path, metadata_path, manifest_path, handoff_envelopes]
    validators: [artifact-archive, artifact-xmind, artifact-metadata, artifact-manifest, gate-precondition]
    failure_modes:
      - review_gate_unmet
      - schema_invalid
      - io_error
```

注：每个 review step 现在是一对一（1 step ↔ 1 reviewer），`model / effort` 直接写在 workflow step 上，由 P2 `decidePhase` 标准 fallback 链（step → workflow default → skillDefaults）取值，无需 reviewer/worker 文件 frontmatter 携带 model/effort。reviewer/worker frontmatter 只保留 `name` 字段。

- [ ] **7.27 跑 workflow v2 parser + phase 测试**

```bash
bun test engine/tests/runtime/case-draft-phases.test.ts
```

Expected: case-draft-phases.test.ts 4/4 pass。**不**在此跑 `bun run check:skills` ——本 step manifest 尚未更新（manifest 仍含旧 13 step 索引），check:skills 必报 case-draft 不一致；check:skills 移到 step 7.32 manifest 更新后跑。

### Step 7.28 — Step 7.29: rules / fewshots（绿）

- [ ] **7.28 修剪 `rules/naming-convention.md` ≤80 行**

读原文件，如超 80 行，按下列优先级删：
1. 删冗长例子，保留 1 个最完整例子
2. 折叠"客户缩写列表"为一行 reference（指向 `_shared/customer-codes.md`，若需要新建）
3. 删"历史命名兼容说明"

```bash
wc -l .claude/skills/case-draft/rules/naming-convention.md
# 如 > 80：手动 trim
bun test engine/tests/skills/case-draft-shape.test.ts -t "naming-convention"
```

- [ ] **7.29 新建 `fewshots/greenfield-prd.md` + `fewshots/archive-format.md`**

从旧 `references/fewshots/case-format-sample.md`（行数未知，约 80）拆 2 份：
- `greenfield-prd.md`：完整一份 PRD → atoms → archive.md 的端到端样例（不超 100 行；只 1 个 case 完整展开）
- `archive-format.md`：archive.md 与 cases.xmind 的字段映射对照（保留旧 `case-format-sample.xmind.md` 的 ASCII 树状示意）

```bash
# 删旧 references 目录前先拷贝出内容
mkdir -p .claude/skills/case-draft/fewshots
# greenfield-prd.md / archive-format.md 内容手动编辑（参考 spec §6.4 fewshot 模板）
bun test engine/tests/skills/case-draft-shape.test.ts -t "fewshots"
```

### Step 7.30 — Step 7.32: 清理 references/ + 建 _shared/source-ref-rules.md + manifest

- [ ] **7.30 创建 `.claude/skills/_shared/source-ref-rules.md`**

case-draft SKILL.md 在 step 7.14 已引用 `_shared/source-ref-rules.md`，文件必须在本 commit 提交前存在（避免 dangling reference 触发 `check:skills` 失败）。defect-analyze（commit 8.1）也复用同一份。

`.claude/skills/_shared/source-ref-rules.md`（≤80 行，跨 skill baseline）：

```markdown
# source-ref-rules

## SourceRef 通用约束（跨 skill 共享）

- ID 形态：`SR-<n>`（n 全 feature 自增正整数）
- 必填字段：kind / locator / anchor
- kind ∈ { file, url, log, screenshot, diff-hunk, lanhu, axure, csv-row, dom-element }
- locator 必须可机器解析（路径 + 行号 / URL + selector / hash）
- anchor 必须 ≤ 200 chars，能让审稿人在不打开原源时大致理解证据

## 分层约束

- 结构化层（manifest.json / blackboard）：SourceRef ID + locator
- 人类可读层（archive.md / cases.xmind / defect-report.md / conflict-resolution-plan.md）：可内联 `（证据：SR-N <locator>）`，不写 anchor 完整内容

## 跨 skill 校验

- 任何引用 SourceRef ID 的字段必须能在同一 feature manifest.json 的 source_refs 字典中找到
- 跨 feature 引用必须用绝对 URL，不可用 SR- 短 ID
```

- [ ] **7.31 删 `.claude/skills/case-draft/references/`**

```bash
git rm -rf .claude/skills/case-draft/references/
# 同步删 case-draft/rules/case-qa.md（已在 P1#5 移到 _shared/）
test -f .claude/skills/case-draft/rules/case-qa.md && git rm .claude/skills/case-draft/rules/case-qa.md
git status --porcelain | grep references
```

- [ ] **7.31b 更新 `.claude/contracts/skill-manifest.yaml` case-draft entry**

把 `case-draft` 在 manifest 中的 facets 改为：

```yaml
- id: case-draft
  user_invocable: true
  default_model: sonnet
  default_effort: high
  phases:
    - id: source-intake
      file: .claude/skills/case-draft/phases/§1-source-intake.md
    - id: atomize
      file: .claude/skills/case-draft/phases/§2-atomize.md
    - id: draft
      file: .claude/skills/case-draft/phases/§3-draft.md
      workers: [case-worker]
    - id: spec-review
      file: .claude/skills/case-draft/phases/§4-spec-review.md
      reviewers: [spec-reviewer]
    - id: quality-review
      file: .claude/skills/case-draft/phases/§5-quality-review.md
      reviewers: [quality-reviewer]
    - id: output
      file: .claude/skills/case-draft/phases/§6-output.md
  artifacts:
    - kind: archive
      schema: artifact-archive
    - kind: xmind
      schema: artifact-xmind
    - kind: metadata
      schema: artifact-metadata
    - kind: manifest
      schema: artifact-manifest
```

- [ ] **7.32 跑 manifest 一致性测试**

```bash
bun run check:skills 2>&1 | tee /tmp/check.log
grep -i "case-draft" /tmp/check.log
```

Expected: 不报 case-draft 任何 inconsistency（phase 文件存在、workers/reviewers 链接正确）。

### Step 7.33 — Step 7.34: 写 fake-orchestrator smoke test（红 → 绿）

- [ ] **7.33 写 failing test `case-draft-events.smoke.test.ts`**

`engine/tests/runtime/case-draft-events.smoke.test.ts`:

```typescript
import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runWorkflowFixture } from '../helpers/run-workflow-fixture'

describe('case-draft events.jsonl smoke', () => {
  let workspaceRoot: string

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'kata-case-draft-smoke-'))
  })

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true })
  })

  test('happy path emits required event kinds in order', async () => {
    const result = await runWorkflowFixture({
      workflow: 'case-draft',
      fixture: 'engine/tests/fixtures/case-draft-greenfield-prd.json',
      workspaceRoot,
    })

    expect(result.exitCode).toBe(0)
    const events = readFileSync(result.eventsPath, 'utf8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l))

    // 1) phase 顺序断言（canonical 6 phase）
    const enteredPhases = events
      .filter((e) => e.event_kind === 'phase_entered')
      .map((e) => e.phase)
    expect(enteredPhases).toEqual([
      'source-intake',
      'atomize',
      'draft',
      'spec-review',
      'quality-review',
      'output',
    ])

    // 2) 每对 entered/exited 必须按 seq 严格配对
    for (const phase of enteredPhases) {
      const entered = events.find((e) => e.event_kind === 'phase_entered' && e.phase === phase)
      const exited = events.find((e) => e.event_kind === 'phase_exited' && e.phase === phase)
      expect(exited).toBeDefined()
      expect(exited!.seq).toBeGreaterThan(entered!.seq)
    }

    // 3) 类别计数：3 subagent step (draft / spec-review / quality-review) 各 1 对
    const kinds = events.map((e) => e.event_kind)
    expect(kinds.filter((k) => k === 'phase_entered').length).toBe(6)
    expect(kinds.filter((k) => k === 'phase_exited').length).toBe(6)
    expect(kinds.filter((k) => k === 'subagent_dispatched').length).toBe(3)
    expect(kinds.filter((k) => k === 'subagent_completed').length).toBe(3)
    expect(kinds.filter((k) => k === 'artifact_written').length).toBeGreaterThanOrEqual(4)

    // 4) artifact_written kinds 在 manifest.artifact_kinds_produced 集合内
    const allowedKinds = new Set(['archive', 'xmind', 'metadata', 'manifest'])
    for (const e of events.filter((e) => e.event_kind === 'artifact_written')) {
      expect(allowedKinds.has(e.payload?.kind)).toBe(true)
    }

    // 5) subagent_dispatched payload model/effort 与 workflow.yaml step 上声明一致
    const dispatched = events.filter((e) => e.event_kind === 'subagent_dispatched')
    const byPhase = Object.fromEntries(dispatched.map((e) => [e.phase, e.payload]))
    expect(byPhase['draft']?.model).toBe('sonnet')
    expect(byPhase['draft']?.effort).toBe('high')
    expect(byPhase['spec-review']?.model).toBe('haiku')
    expect(byPhase['spec-review']?.effort).toBe('low')
    expect(byPhase['quality-review']?.model).toBe('sonnet')
    expect(byPhase['quality-review']?.effort).toBe('medium')
  })

  test('blocking pending path emits blocked, no final artifacts', async () => {
    const result = await runWorkflowFixture({
      workflow: 'case-draft',
      fixture: 'engine/tests/fixtures/case-draft-blocking-pending.json',
      workspaceRoot,
    })

    const events = readFileSync(result.eventsPath, 'utf8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l))

    expect(events.some((e) => e.event_kind === 'blocked')).toBe(true)
    expect(events.filter((e) => e.event_kind === 'artifact_written' && e.payload?.kind === 'archive').length).toBe(0)
  })
})
```

需要 helper `engine/tests/helpers/run-workflow-fixture.ts`：mock Phase Dispatcher subagent 返回 fixture 预设的 worker / reviewer output；不实跑真 LLM。`fixtures/case-draft-greenfield-prd.json` 含 sources + atoms + 预设 worker output + 双 reviewer pass verdict。

- [ ] **7.34 写 fixture + helper**

```bash
mkdir -p engine/tests/fixtures engine/tests/helpers
# fixtures/case-draft-greenfield-prd.json: 完整 happy path mock
# fixtures/case-draft-blocking-pending.json: blocking pending 路径 mock
# helpers/run-workflow-fixture.ts: 工厂函数 runWorkflowFixture({workflow, fixture, workspaceRoot})
# 内部行为：
#   1. 读 fixture，通过 P2 openSession 建 event journal session
#   2. 按 workflow.yaml 顺序执行 6 phase：
#      - inline phase：按 fixture 预设直接 session.emit('decision_made' / 'artifact_written' / 'blocked' / ...)
#      - subagent phase：调 decidePhase + buildDispatchEnvelope 拿 envelope；
#        再按 fixture 预设的 subagent_output 静态映射注入 blackboard，
#        并 session.emit('subagent_dispatched' / decision_made / artifact_written / 'subagent_completed')
#   3. 返回 { exitCode, eventsPath, finalBlackboard }
```

Helper 实现策略（fake orchestrator）：复用 P2 `decidePhase / buildDispatchEnvelope`（P2 line 1725-1790 已交付）+ P2 event-writer（通过 `openSession`），按 fixture 中预设的 subagent_output 静态映射注入 blackboard 并直接 `session.emit('subagent_dispatched' / 'subagent_completed')`。**不**调用任何 spawn 函数（P2 line 1161 明确 P2 仅做决策与 envelope 构造，真实 spawn 由 orchestrator 负责）；fake 不需要 mock spawn 接口。

```typescript
// engine/tests/helpers/run-workflow-fixture.ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { parseWorkflow } from '../../src/skills/workflow-schema'
import { decidePhase, buildDispatchEnvelope, type SkillDefaults } from '../../src/runtime/phase-dispatcher'
import { openSession } from '../../src/runtime/session'

export interface RunOpts {
  workflow: string
  fixture: string
  workspaceRoot: string
}

export interface RunResult {
  exitCode: number
  eventsPath: string
  finalBlackboard: Record<string, unknown>
}

function readSkillDefaults(skillId: string): SkillDefaults {
  const fm = matter(readFileSync(`.claude/skills/${skillId}/SKILL.md`, 'utf8'))
  return {
    model: (fm.data.model ?? 'sonnet') as SkillDefaults['model'],
    effort: (fm.data.effort ?? 'high') as SkillDefaults['effort'],
    agent: (fm.data.agent ?? 'general-purpose') as string,
  }
}

export async function runWorkflowFixture(opts: RunOpts): Promise<RunResult> {
  const fixture = JSON.parse(readFileSync(opts.fixture, 'utf8'))
  const wf = parseWorkflow(readFileSync(`.claude/contracts/workflows/${opts.workflow}.yaml`, 'utf8'))
  const skillDefaults = readSkillDefaults(opts.workflow)
  // P2 openSession signature (P2 plan line 743-765)
  const session = await openSession({
    root: opts.workspaceRoot,
    project: fixture.project ?? 'kata',
    featureId: fixture.feature_id,
    skillId: opts.workflow,
    skillVersion: '1.0.0',
    workflowId: `${opts.workflow}@1`,
    runId: fixture.run_id,
  })
  const bb: Record<string, unknown> = { ...(fixture.initial_blackboard ?? {}) }

  const ZERO_SHA = '0'.repeat(64) // satisfies P2 event-validator pattern ^sha256:[a-f0-9]{64}$

  async function emitArtifact(phase: string, art: { kind: string; path: string; slot?: string }): Promise<void> {
    // Fake orchestrator does NOT call P2 emitArtifactWritten (which writes real bytes + applyDelta
    // + notify projector). It directly emits the artifact_written event so smoke tests can verify
    // the event stream shape. Real artifact bytes / blackboard projection are covered by P2 unit
    // tests and P3 artifact-validator tests separately.
    await session.emit('artifact_written', {
      status: 'ok',
      phase,
      hashed_artifact_ref: `sha256:${ZERO_SHA}`, // 64-hex zeros — fake but schema-valid
      payload: { kind: art.kind, path: art.path },
      blackboard_delta: art.slot ? { [art.slot]: art.path } : undefined,
    })
    if (art.slot) bb[art.slot] = art.path
  }

  for (const step of wf.steps) {
    await session.emit('phase_entered', { phase: step.id })
    if (step.dispatch === 'subagent') {
      const decision = decidePhase({ workflow: wf, step, skillDefaults })
      const envelope = buildDispatchEnvelope(decision)
      await session.emit('subagent_dispatched', {
        phase: step.id,
        payload: { envelope, model: decision.model, effort: decision.effort },
      })
      const sub = fixture.subagent_outputs?.[step.id]
      if (!sub) throw new Error(`fixture missing subagent_outputs[${step.id}]`)
      Object.assign(bb, sub.blackboard_writes ?? {})
      for (const d of sub.decisions ?? []) await session.emit('decision_made', { phase: step.id, payload: d })
      for (const art of sub.artifacts ?? []) await emitArtifact(step.id, art)
      for (const vf of sub.validator_failed ?? []) await session.emit('validator_failed', { phase: step.id, status: 'failed', payload: vf })
      await session.emit('subagent_completed', { phase: step.id })
    } else {
      const inline = fixture.inline_outputs?.[step.id]
      if (inline) {
        Object.assign(bb, inline.blackboard_writes ?? {})
        for (const d of inline.decisions ?? []) await session.emit('decision_made', { phase: step.id, payload: d })
        for (const art of inline.artifacts ?? []) await emitArtifact(step.id, art)
        for (const blk of inline.blocked ?? []) await session.emit('blocked', { phase: step.id, status: 'failed', payload: blk })
        for (const vf of inline.validator_failed ?? []) await session.emit('validator_failed', { phase: step.id, status: 'failed', payload: vf })
        for (const ho of inline.handoff_emitted ?? []) await session.emit('handoff_emitted', { phase: step.id, payload: ho })
      }
    }
    await session.emit('phase_exited', { phase: step.id })
    if (fixture.stop_after_phase === step.id) break
  }

  await session.close()

  return {
    exitCode: 0,
    // P2 真实路径（P2 plan line 422/441/465/835/881/992/1014/1038/1053）：
    // <root>/workspace/<project>/features/<featureId>/events/<runId>.jsonl
    eventsPath: join(
      opts.workspaceRoot,
      'workspace',
      fixture.project ?? 'kata',
      'features',
      fixture.feature_id,
      'events',
      `${fixture.run_id}.jsonl`,
    ),
    finalBlackboard: bb,
  }
}
```

**Helper 关键设计：**
- 用 P2 真实接口 `openSession({ root, project, featureId, skillId, skillVersion, workflowId, runId? })`（P2 plan line 743-765）
- `decidePhase({ step, workflow, skillDefaults })`（P2 plan line 1707-1713）；`skillDefaults` 从 SKILL.md frontmatter `model / effort / agent` 用 `gray-matter` 解析
- **不**调用 P2 `emitArtifactWritten`：该函数需要真实 contentBytes + blackboardSlot + Blackboard 实例 + NotifyProjector（P2 line 1895-1907），适用于真实 skill 执行；fake orchestrator 直接 `session.emit('artifact_written', {...})`，仅生成 event 流
- artifact bytes / blackboard projection / notify projection 正确性由 P2 自身单测 + P3 artifact-validator 测试分别覆盖；smoke 只验 event 序列形态
- 事件文件路径按 P2 真实约定：`<workspaceRoot>/workspace/<project>/features/<featureId>/events/<runId>.jsonl`（P2 plan line 422/441/465 等测试实测）
- `session.close()` 释放 writer 锁；测试 afterEach 时 workspaceRoot 整目录 rm

**By-mode 支持：** fixture 通过 `inline_outputs.intake.blackboard_writes.mode = 'bug' | 'diff' | 'conflict'` 注入 mode；下游 step 的 by_mode 输出由 fixture 在该 mode 下的 `subagent_outputs` / `inline_outputs` 静态覆盖。helper 不解析 `*_by_mode` 字段。

- [ ] **7.35 实现 helper + 跑测试**

完成 helper 后：

```bash
bun test engine/tests/runtime/case-draft-events.smoke.test.ts
```

Expected: 2/2 pass。

### Step 7.36: 跑全局测试 + Commit

- [ ] **7.36 跑全测 + commit 7**

```bash
bun test
bun run check:skills
bun run check
```

Expected: all green。

```bash
git add .claude/skills/case-draft/ \
        .claude/skills/_shared/source-ref-rules.md \
        .claude/contracts/workflows/case-draft.yaml \
        .claude/contracts/skill-manifest.yaml \
        .claude/contracts/schemas/artifact-archive.json \
        .claude/contracts/schemas/artifact-xmind.json \
        .claude/contracts/schemas/artifact-manifest.json \
        .claude/contracts/schemas/artifact-metadata.json \
        .claude/contracts/schemas/blackboard-slots.json \
        engine/src/runtime/artifact-validator.ts \
        engine/src/skills/frontmatter-policy.ts \
        engine/tests/runtime/artifact-validator.test.ts \
        engine/tests/runtime/case-draft-events.smoke.test.ts \
        engine/tests/runtime/case-draft-phases.test.ts \
        engine/tests/skills/case-draft-shape.test.ts \
        engine/tests/fixtures/case-draft-*.json \
        engine/tests/helpers/run-workflow-fixture.ts \
        package.json bun.lock

git commit -m "refactor: ✨ migrate case-draft to β-lite + E backbone

- P1#4.b v2 schema 13 step → β-lite final 6 phase (source-intake / atomize / draft / spec-review / quality-review / output)
- new skill skeleton: phases/ reviewers/ workers/ rules/ fewshots/
- workflow.yaml v2: default_dispatch + per-step model/effort + metadata + by_mode-ready
- review step split into spec-review + quality-review (1 reviewer per step), model/effort on workflow.yaml step
- artifact-validator.ts with ajv addSchema cross-ref support + 4 artifact schemas
- new _shared/source-ref-rules.md (cross-skill SourceRef baseline)
- frontmatter-policy.ts extended: argument-hint added to SKILL allowlist; reviewer/worker allowlist = {name} only
- blackboard-slots.json registry updated with case-draft new slots
- engine emits 19 event_kinds via Phase Dispatcher decidePhase + envelope
- smoke test verifies phase_entered/exited sequence + per-phase artifact_written
"
```

注：commit 范围**只含本 commit 内新增 / 修改文件**；不带未声明文件。无关本任务的随手改动单独 commit。


## Commit 8.1: `refactor: ✨ migrate defect-analyze (merge bug-file + conflict-analyze + diff-scan)`

**目标:** 新建 `defect-analyze` β-lite skill，合并 `bug-file` + `conflict-analyze` + `diff-scan` 三个 v1 skill；workflow.yaml v2 使用 `by_mode` 扩展字段产出 mode-specific 输出（`bug` / `diff` → `defect-report.md`；`conflict` → `conflict-resolution-plan.md`）；删 3 个旧 skill 目录；smoke test 验证 3 种 mode 各自 events.jsonl 路径。

**Files:**
- Create: `.claude/skills/defect-analyze/SKILL.md`
- Create: `.claude/skills/defect-analyze/phases/§1-intake.md`
- Create: `.claude/skills/defect-analyze/phases/§2-classify.md`
- Create: `.claude/skills/defect-analyze/phases/§3-analyze.md`
- Create: `.claude/skills/defect-analyze/phases/§4-spec-review.md`
- Create: `.claude/skills/defect-analyze/phases/§5-quality-review.md`
- Create: `.claude/skills/defect-analyze/phases/§6-emit.md`
- Create: `.claude/skills/defect-analyze/reviewers/spec-reviewer.md`
- Create: `.claude/skills/defect-analyze/reviewers/quality-reviewer.md`
- Create: `.claude/skills/defect-analyze/workers/analyzer.md`
- Create: `.claude/skills/defect-analyze/rules/mode-dispatch.md`
- Create: `.claude/skills/defect-analyze/rules/defect-classify.md`
- Create: `.claude/skills/defect-analyze/rules/defect-format.md`
- Create: `.claude/skills/defect-analyze/fewshots/bug-mode.md`
- Create: `.claude/skills/defect-analyze/fewshots/conflict-mode.md`
- Create: `.claude/skills/defect-analyze/fewshots/diff-mode.md`
- Create: `.claude/contracts/workflows/defect-analyze.yaml`
- Create: `.claude/contracts/schemas/artifact-defect-report.json`
- Create: `.claude/contracts/schemas/artifact-conflict-resolution-plan.json`
- Modify: `.claude/contracts/skill-manifest.yaml`（新增 defect-analyze entry；删 bug-file / conflict-analyze / diff-scan 三 entry）
- Delete: `.claude/skills/bug-file/`
- Delete: `.claude/skills/conflict-analyze/`
- Delete: `.claude/skills/diff-scan/`
- Delete: `.claude/contracts/workflows/bug-file.yaml`（如 P1#4.b 已建则删）
- Delete: `.claude/contracts/workflows/conflict-analyze.yaml`（如 P1#4.b 已建则删）
- Delete: `.claude/contracts/workflows/diff-scan.yaml`（如 P1#4.b 已建则删）
- Create: `engine/tests/runtime/defect-analyze-events.smoke.test.ts`
- Create: `engine/tests/fixtures/defect-analyze-bug-mode.json`
- Create: `engine/tests/fixtures/defect-analyze-conflict-mode.json`
- Create: `engine/tests/fixtures/defect-analyze-diff-mode.json`
- Create: `engine/tests/skills/defect-analyze-shape.test.ts`

### Step 8.1.1 — Step 8.1.4: 写 failing tests（红）

- [ ] **8.1.1 写 `defect-analyze-shape.test.ts`（β-lite 文件长度上限）**

`engine/tests/skills/defect-analyze-shape.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = '.claude/skills/defect-analyze'

describe('defect-analyze β-lite shape', () => {
  test('SKILL.md ≤ 80 lines (spec §6.12 specific cap)', () => {
    expect(readFileSync(join(BASE, 'SKILL.md'), 'utf8').split('\n').length).toBeLessThanOrEqual(80)
  })

  test.each([
    'phases/§1-intake.md',
    'phases/§2-classify.md',
    'phases/§3-analyze.md',
    'phases/§4-spec-review.md',
    'phases/§5-quality-review.md',
    'phases/§6-emit.md',
  ])('%s ≤ 150 lines', (rel) => {
    expect(readFileSync(join(BASE, rel), 'utf8').split('\n').length).toBeLessThanOrEqual(150)
  })

  test.each(['reviewers/spec-reviewer.md', 'reviewers/quality-reviewer.md', 'workers/analyzer.md'])(
    '%s ≤ 200 lines',
    (rel) => {
      expect(readFileSync(join(BASE, rel), 'utf8').split('\n').length).toBeLessThanOrEqual(200)
    },
  )

  test.each(['rules/mode-dispatch.md', 'rules/defect-classify.md', 'rules/defect-format.md'])(
    '%s ≤ 80 lines',
    (rel) => {
      expect(readFileSync(join(BASE, rel), 'utf8').split('\n').length).toBeLessThanOrEqual(80)
    },
  )

  test.each(['fewshots/bug-mode.md', 'fewshots/conflict-mode.md', 'fewshots/diff-mode.md'])(
    '%s ≤ 100 lines',
    (rel) => {
      expect(readFileSync(join(BASE, rel), 'utf8').split('\n').length).toBeLessThanOrEqual(100)
    },
  )
})
```

- [ ] **8.1.2 写 workflow v2 + by_mode 测试**

`engine/tests/runtime/defect-analyze-phases.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test'
import { parseWorkflow } from '../../src/skills/workflow-schema'
import { readFileSync } from 'node:fs'

describe('defect-analyze workflow v2', () => {
  test('6 phases in canonical order', () => {
    const wf = parseWorkflow(readFileSync('.claude/contracts/workflows/defect-analyze.yaml', 'utf8'))
    expect(wf.steps.map((s) => s.id)).toEqual([
      'intake',
      'classify',
      'analyze',
      'spec-review',
      'quality-review',
      'emit',
    ])
  })

  test('§3-analyze is worker-only subagent step (model=sonnet, effort=high)', () => {
    const wf = parseWorkflow(readFileSync('.claude/contracts/workflows/defect-analyze.yaml', 'utf8'))
    const analyze = wf.steps.find((s) => s.id === 'analyze')
    expect(analyze?.dispatch).toBe('subagent')
    expect(analyze?.workers).toEqual(['analyzer'])
    expect(analyze?.reviewers ?? []).toEqual([])
    expect(analyze?.model).toBe('sonnet')
    expect(analyze?.effort).toBe('high')
  })

  test('§4-spec-review is reviewer-only subagent step (model=haiku, effort=low)', () => {
    const wf = parseWorkflow(readFileSync('.claude/contracts/workflows/defect-analyze.yaml', 'utf8'))
    const sr = wf.steps.find((s) => s.id === 'spec-review')
    expect(sr?.dispatch).toBe('subagent')
    expect(sr?.workers ?? []).toEqual([])
    expect(sr?.reviewers).toEqual(['spec-reviewer'])
    expect(sr?.model).toBe('haiku')
    expect(sr?.effort).toBe('low')
  })

  test('§5-quality-review is reviewer-only subagent step (model=sonnet, effort=medium)', () => {
    const wf = parseWorkflow(readFileSync('.claude/contracts/workflows/defect-analyze.yaml', 'utf8'))
    const qr = wf.steps.find((s) => s.id === 'quality-review')
    expect(qr?.dispatch).toBe('subagent')
    expect(qr?.workers ?? []).toEqual([])
    expect(qr?.reviewers).toEqual(['quality-reviewer'])
    expect(qr?.model).toBe('sonnet')
    expect(qr?.effort).toBe('medium')
  })

  test('§3-analyze has blackboard_outputs_by_mode for bug / diff / conflict', () => {
    const wf = parseWorkflow(readFileSync('.claude/contracts/workflows/defect-analyze.yaml', 'utf8'))
    const analyze = wf.steps.find((s) => s.id === 'analyze')
    const byMode = analyze?.blackboard_outputs_by_mode
    expect(byMode).toBeDefined()
    expect(Object.keys(byMode!).sort()).toEqual(['bug', 'conflict', 'diff'])
    expect(byMode!.conflict).toEqual(
      expect.arrayContaining(['side_a_intent', 'side_b_intent', 'resolution_plan', 'evidence_refs']),
    )
  })

  test('§6-emit is inline and produces different artifact per mode', () => {
    const wf = parseWorkflow(readFileSync('.claude/contracts/workflows/defect-analyze.yaml', 'utf8'))
    const emit = wf.steps.find((s) => s.id === 'emit')
    expect(emit?.dispatch).toBe('inline')
    expect(emit?.workers ?? []).toEqual([])
    expect(emit?.reviewers ?? []).toEqual([])
    expect(emit?.blackboard_outputs_by_mode?.bug).toContain('defect_report_path')
    expect(emit?.blackboard_outputs_by_mode?.conflict).toContain('conflict_resolution_plan_path')
  })

  test('artifact_kinds_produced includes both defect-report and conflict-resolution-plan', () => {
    const wf = parseWorkflow(readFileSync('.claude/contracts/workflows/defect-analyze.yaml', 'utf8'))
    expect(wf.metadata?.artifact_kinds_produced).toEqual(
      expect.arrayContaining(['defect-report', 'conflict-resolution-plan']),
    )
  })
})
```

- [ ] **8.1.3 写 artifact schema 测试**

补 `engine/tests/runtime/artifact-validator.test.ts` 增 2 个 describe：

```typescript
describe('defect-report schema', () => {
  test('rejects missing root_cause for bug mode', () => {
    const r = validateArtifact('defect-report', { schema_version: 1, mode: 'bug' })
    expect(r.ok).toBe(false)
  })

  test('accepts minimal valid bug defect-report', () => {
    const r = validateArtifact('defect-report', {
      schema_version: 1,
      mode: 'bug',
      severity: 'high',
      category: 'logic',
      scope: ['service-api'],
      root_cause: '...',
      evidence_refs: ['SR-1'],
      impacted_areas: ['login'],
    })
    expect(r.ok).toBe(true)
  })
})

describe('conflict-resolution-plan schema', () => {
  test('requires dual intent', () => {
    const r = validateArtifact('conflict-resolution-plan', {
      schema_version: 1,
      side_a_intent: 'A',
      resolution_plan: '...',
      evidence_refs: ['SR-1'],
    })
    expect(r.ok).toBe(false)
    expect(r.errors?.some((e) => e.instancePath.match(/side_b_intent/))).toBe(true)
  })

  test('accepts full plan', () => {
    const r = validateArtifact('conflict-resolution-plan', {
      schema_version: 1,
      side_a_intent: 'A wants X',
      side_b_intent: 'B wants Y',
      resolution_plan: 'merge X+Y by ...',
      evidence_refs: ['SR-1'],
    })
    expect(r.ok).toBe(true)
  })
})
```

- [ ] **8.1.4 写 smoke test**

`engine/tests/runtime/defect-analyze-events.smoke.test.ts`:

```typescript
import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runWorkflowFixture } from '../helpers/run-workflow-fixture'

describe('defect-analyze events.jsonl smoke (3 modes)', () => {
  let workspaceRoot: string

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'kata-defect-analyze-smoke-'))
  })

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true })
  })

  test.each([
    ['bug-mode', 'defect-report', ['root_cause', 'evidence_refs']],
    ['diff-mode', 'defect-report', ['root_cause', 'evidence_refs']],
    ['conflict-mode', 'conflict-resolution-plan', ['side_a_intent', 'side_b_intent', 'resolution_plan']],
  ])('%s emits correct artifact kind', async (mode, artifactKind, requiredSlots) => {
    const result = await runWorkflowFixture({
      workflow: 'defect-analyze',
      fixture: `engine/tests/fixtures/defect-analyze-${mode}.json`,
      workspaceRoot,
    })

    const events = readFileSync(result.eventsPath, 'utf8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l))

    // 1) phase 顺序断言（6 phase: 拆 reviewer 为独立 step）
    const enteredPhases = events
      .filter((e) => e.event_kind === 'phase_entered')
      .map((e) => e.phase)
    expect(enteredPhases).toEqual([
      'intake',
      'classify',
      'analyze',
      'spec-review',
      'quality-review',
      'emit',
    ])

    // 2) 3 subagent step dispatch（analyze + spec-review + quality-review）
    const dispatched = events.filter((e) => e.event_kind === 'subagent_dispatched')
    expect(dispatched.length).toBe(3)

    // 3) final artifact kind 与 mode 一致；spec/quality reviewer artifact 可选
    const written = events.filter((e) => e.event_kind === 'artifact_written')
    const finalKinds = written.map((e) => e.payload?.kind).filter((k) => k === artifactKind)
    expect(finalKinds.length).toBe(1)

    // 4) mode_dispatch + spec_verdict + quality_verdict decision 全部存在
    const decisions = events.filter((e) => e.event_kind === 'decision_made')
    expect(decisions.some((e) => e.payload?.topic === 'mode_dispatch')).toBe(true)
    expect(decisions.some((e) => e.payload?.topic === 'spec_verdict')).toBe(true)
    expect(decisions.some((e) => e.payload?.topic === 'quality_verdict')).toBe(true)

    // 5) by_mode 输出 slot 写入 final blackboard
    for (const slot of requiredSlots) {
      expect(result.finalBlackboard[slot]).toBeDefined()
    }

    // 6) mode-specific exclusion：conflict 不写 defect_report_path
    if (mode === 'conflict-mode') {
      expect(result.finalBlackboard.defect_report_path).toBeUndefined()
      expect(result.finalBlackboard.conflict_resolution_plan_path).toBeDefined()
    } else {
      expect(result.finalBlackboard.conflict_resolution_plan_path).toBeUndefined()
      expect(result.finalBlackboard.defect_report_path).toBeDefined()
    }
  })
})
```

- [ ] **8.1.5 跑全部 fail tests**

```bash
bun test engine/tests/skills/defect-analyze-shape.test.ts
bun test engine/tests/runtime/defect-analyze-phases.test.ts
bun test engine/tests/runtime/defect-analyze-events.smoke.test.ts
bun test engine/tests/runtime/artifact-validator.test.ts
```

Expected: 所有都 fail（skill 未建、workflow 未建、schema 未建）。

### Step 8.1.6 — Step 8.1.8: 创建 schemas（绿）

- [ ] **8.1.6 创建 `artifact-defect-report.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kata.dev/schemas/artifact-defect-report.json",
  "title": "Defect Report (bug | diff mode)",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version", "mode", "severity", "category", "scope", "root_cause", "evidence_refs", "impacted_areas"],
  "properties": {
    "schema_version": { "type": "integer", "const": 1 },
    "mode": { "enum": ["bug", "diff"] },
    "severity": { "enum": ["critical", "high", "medium", "low"] },
    "category": { "enum": ["logic", "data", "concurrency", "security", "performance", "ui", "config"] },
    "scope": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
    "root_cause": { "type": "string", "minLength": 10 },
    "evidence_refs": { "type": "array", "items": { "type": "string", "pattern": "^SR-" }, "minItems": 1 },
    "impacted_areas": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
    "reproduce_steps": { "type": "array", "items": { "type": "string" } },
    "actual_behavior": { "type": "string" },
    "expected_behavior": { "type": "string" }
  }
}
```

- [ ] **8.1.7 创建 `artifact-conflict-resolution-plan.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kata.dev/schemas/artifact-conflict-resolution-plan.json",
  "title": "Conflict Resolution Plan (conflict mode)",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version", "side_a_intent", "side_b_intent", "resolution_plan", "evidence_refs"],
  "properties": {
    "schema_version": { "type": "integer", "const": 1 },
    "side_a_intent": { "type": "string", "minLength": 10 },
    "side_b_intent": { "type": "string", "minLength": 10 },
    "resolution_plan": { "type": "string", "minLength": 20 },
    "evidence_refs": { "type": "array", "items": { "type": "string", "pattern": "^SR-" }, "minItems": 1 },
    "severity": { "enum": ["critical", "high", "medium", "low"] },
    "category": { "type": "string" },
    "scope": { "type": "array", "items": { "type": "string" } },
    "affected_files": { "type": "array", "items": { "type": "string" } }
  }
}
```

- [ ] **8.1.8 跑 artifact-validator 测试**

```bash
bun test engine/tests/runtime/artifact-validator.test.ts -t "defect-report|conflict-resolution-plan"
```

Expected: 4/4 pass。

### Step 8.1.9 — Step 8.1.13: 写 SKILL.md + 6 phases（绿）

- [ ] **8.1.9 创建 `defect-analyze/SKILL.md`**

按 spec §6.12 模板（≤80 行）。本 plan 直接使用 spec §6.12 中 SKILL.md 全文（line 564-626），仅替换 `argument-hint` 字段为 v2 allowlist 字段、补 `paths` 段 `artifact-conflict-resolution-plan.json`：

```markdown
---
name: defect-analyze
description: >
  用户提供 bug 现象、merge conflict 或 code diff 并要求分析缺陷时使用。
argument-hint: <bug-evidence | conflict-block | diff-path>
user-invocable: true
model: sonnet
effort: high
paths:
  - .claude/skills/defect-analyze/**
  - .claude/skills/_shared/**
  - .claude/contracts/workflows/defect-analyze.yaml
  - .claude/contracts/schemas/event.json
  - .claude/contracts/schemas/artifact-defect-report.json
  - .claude/contracts/schemas/artifact-conflict-resolution-plan.json
  - workspace/**
context: fork
agent: general-purpose
---

# defect-analyze

接收失败证据 / merge conflict / code diff 三种输入，分诊到对应 mode，分析后生成结构化缺陷报告。

## When to trigger
- 用户给出可复现 bug 现象（stack trace / 错误日志 / screenshot / HTTP 失败）
- 用户粘贴 merge conflict 标记
- 用户要求扫描一段 code diff 的潜在缺陷
- 用户给出仓库 diff / patch / 分支对供静态分析

## Must not trigger when
- 用户只提供 ZenTao bug URL / bug ID → 路由 `case-hotfix`
- 用户要求自动修复 bug（本 skill 只分析不修）
- 用户要求 SSH 排查 connectivity → 路由 `infra-diagnose`
- 用户要求一般性代码讲解且未指明 diff 目标

## Hard rules
- 必须先 §1-intake mode-dispatch，不可在 §3-analyze 之前跳过分诊
- 所有报告字段必须有 SourceRef ID 引用
- bug / diff mode 输出严格匹配 `artifact-defect-report.json`
- conflict mode 必须先陈述 side_a / side_b 双方意图再给 resolution_plan，输出严格匹配 `artifact-conflict-resolution-plan.json`
- 单次只产一份报告；多缺陷需用户拆多次调用
- 实际/预期/复现步骤/影响范围（bug mode）分项陈述不得合并
- 不得修改源仓库（`workspace/<project>/.kata/repos/**` 只读）

## Phase index
| Phase | 文件 |
|---|---|
| §1 intake | phases/§1-intake.md |
| §2 classify | phases/§2-classify.md |
| §3 analyze | phases/§3-analyze.md |
| §4 spec-review | phases/§4-spec-review.md |
| §5 quality-review | phases/§5-quality-review.md |
| §6 emit | phases/§6-emit.md |

## Loaded by phase
| Phase | Reviewers | Workers | Rules | Fewshots |
|---|---|---|---|---|
| §1 | — | — | rules/mode-dispatch.md | — |
| §2 | — | — | rules/defect-classify.md | — |
| §3 | — | workers/analyzer.md | rules/defect-format.md, _shared/source-ref-rules.md | fewshots/bug-mode.md, fewshots/conflict-mode.md, fewshots/diff-mode.md |
| §4 | reviewers/spec-reviewer.md | — | rules/defect-format.md | — |
| §5 | reviewers/quality-reviewer.md | — | rules/defect-format.md | — |
| §6 | — | — | rules/defect-format.md | — |

## Output artifacts
| Kind | Path | Schema |
|---|---|---|
| defect-report | `workspace/<project>/features/<feature>/defect-report.md` | `.claude/contracts/schemas/artifact-defect-report.json` |
| conflict-resolution-plan | `workspace/<project>/features/<feature>/conflict-resolution-plan.md` | `.claude/contracts/schemas/artifact-conflict-resolution-plan.json` |
```

预估 80 行（spec §6.12 line 564 明确 defect-analyze SKILL.md ≤80 行，紧守）。注：`_shared/source-ref-rules.md` 已在 Commit 7 step 7.30 创建；本 commit 8.1.18 仅校验存在。Round-5 拆 review：把原 §3-analyze 的 spec-reviewer 与原 §4-emit 的 quality-reviewer 各自独立为 §4-spec-review / §5-quality-review subagent step（spec §6.9 + §6.11：worker step 与 reviewer step 必须独立 envelope，model/effort 直接写在 workflow.yaml step）；原 §4-emit 改为 §6-emit（inline only）。

- [ ] **8.1.10 创建 `phases/§1-intake.md`**

```markdown
# §1 Intake

## Goal
分诊用户输入到 `bug` / `conflict` / `diff` 三种 mode 之一，记录证据源 SourceRef。

## Inputs (blackboard reads)
- `user_input`（必填）

## Outputs (blackboard writes)
- `mode`（必填，∈ { bug, diff, conflict }）
- `source_refs`（必填）
- `project_module`（必填）

## Steps
1. 扫描 `user_input` 文本（按 `rules/mode-dispatch.md` 表）：
   - 含 `<<<<<<< / ======= / >>>>>>>` 冲突标记 → mode=conflict
   - 含 stack trace / HTTP 失败 / screenshot / 错误日志 → mode=bug
   - 含 .diff / .patch 路径 / `git diff` 输出 → mode=diff
2. 多模匹配且无 dominant：emit `validator_failed { validator: 'mode-ambiguous' }`，ask user
3. 为每条证据生成 SourceRef ID，写 `source_refs` 表
4. 调用 `kata features resolve`（若需要 featureDir）取 project_module；非 feature-bound 场景可跳过

## Hard rules
- mode 一次性确定，§2 / §3 不得改 mode
- 缺证据 → emit `validator_failed`，不得自行假设 mode
- conflict mode 必须能定位冲突标记的文件路径与起止行号

## Failure modes & recovery
- `mode_ambiguous`：emit `validator_failed` → ask user 二选一
- `evidence_unreadable`：emit `blocked { reason: 'evidence_unreadable' }`

## Events emitted
- `phase_entered` / `phase_exited`（自动）
- `decision_made { topic: 'mode_dispatch', value: <mode> }`
- `validator_failed` / `blocked`（按需）
```

预估 40 行内。

- [ ] **8.1.11 创建 `phases/§2-classify.md`**

```markdown
# §2 Classify

## Goal
按 mode-specific 维度计算 severity / category / scope。

## Inputs (blackboard reads)
- `mode`、`user_input`、`source_refs`

## Outputs (blackboard writes)
- `severity` ∈ { critical, high, medium, low }（必填）
- `category` ∈ { logic, data, concurrency, security, performance, ui, config }（bug/diff）或自由字符串（conflict）
- `scope` 受影响模块 / 服务 / 文件 list（必填）

## Steps
1. 按 `rules/defect-classify.md` 矩阵：
   - bug：error 影响范围 + 用户可见性 → severity；error 类型 → category
   - diff：是否触及核心数据流 / 安全敏感 path → severity；diff 主导改动类型 → category
   - conflict：冲突文件数 + 是否影响主分支稳定 → severity；冲突来源域 → category
2. emit `decision_made { topic: 'classify' }` 携带 severity/category/scope

## Hard rules
- severity 必须有量化判据（影响范围 + 出错频次）
- conflict mode 也必须有 severity，按"会阻塞合并"判 high+
- scope 必须 ≥1 项

## Failure modes & recovery
- `classify_uncertain`：emit `validator_failed { validator: 'classify-schema' }` → 标 medium 默认 + 在 `analyze` 输出 caveat

## Events emitted
- `phase_entered` / `phase_exited`
- `decision_made { topic: 'classify' }`
- `validator_failed`（按需）
```

预估 35 行内。

- [ ] **8.1.12 创建 `phases/§3-analyze.md`**（含 mode-specific 分支）

```markdown
# §3 Analyze

## Goal
按 mode 分支调度 analyzer subagent，产出 mode-specific 分析结果。

## Inputs (blackboard reads)
- `mode`、`severity`、`category`、`scope`、`source_refs`、`user_input`

## Outputs (blackboard writes)

### mode = bug | diff
- `root_cause`（必填）
- `evidence_refs`（必填）
- `impacted_areas`（必填）
- `reproduce_steps`（可选）
- `actual_behavior` / `expected_behavior`（bug mode 必填，分项陈述）

### mode = conflict
- `side_a_intent`（必填）
- `side_b_intent`（必填）
- `resolution_plan`（必填）
- `evidence_refs`（必填）
- `affected_files`（可选）

## Steps
1. Phase Dispatcher spawn analyzer subagent（model=sonnet, effort=high）；envelope 携带 mode 字段
2. analyzer 按 mode 选 fewshot：
   - bug → `fewshots/bug-mode.md`
   - diff → `fewshots/diff-mode.md`
   - conflict → `fewshots/conflict-mode.md`（必含 dual-intent 段）
3. analyzer 写 `analyze_output_path`，下一 phase §4-spec-review 接力 lint

## Hard rules
- conflict mode 必须先陈述 side_a / side_b 再给 resolution_plan，顺序不可颠倒
- bug mode 实际 / 预期 / 复现步骤 / 影响范围分项陈述，不得合并段
- diff mode 报告必须可定位到 diff 中的 hunk + 周边代码 line
- 所有字段必有 ≥1 个 SourceRef 引用
- 不读 envelope 之外的源；缺信息 → `decisions[].gap`
- 仅 worker 调度，不在本 step 调 reviewer（reviewer 在 §4-spec-review 独立 step）

## Failure modes & recovery
- `worker_timeout`：emit `subagent_failed` → 重派 ≤2 次；超出 emit `blocked`
- `evidence_unanchored`：emit `validator_failed { validator: 'source-ref-coverage' }` → §4-spec-review reject 后回本 phase 重派

## Events emitted
- `phase_entered` / `phase_exited`
- `subagent_dispatched` / `subagent_completed` / `subagent_failed`
- `decision_made { topic: 'analyze' }`
- `validator_failed` / `blocked`
```

预估 55 行内。

- [ ] **8.1.13a 创建 `phases/§4-spec-review.md`**

```markdown
# §4 Spec Review

## Goal
spec-reviewer subagent（model=haiku, effort=low）按 mode validator 校验 §3-analyze 输出的 schema 与 SourceRef 锚点。

## Inputs (blackboard reads)
- `mode`、`analyze_output_path`、`source_refs`

## Outputs (blackboard writes)
- `spec_verdict` ∈ { pass, fail }
- `spec_violations[]`（fail 时必填）
- `spec_review_artifact_path`（reviewer 落 lint 报告）

## Steps
1. Phase Dispatcher spawn spec-reviewer（model=haiku, effort=low）；envelope = { mode, analyze_output, source_refs }
2. reviewer 按 `reviewers/spec-reviewer.md` 内 mode-specific checklist 跑 lint
3. fail → emit `validator_failed`，回 §3-analyze 重派（≤2 次）；超出 emit `blocked`
4. pass → 进入 §5-quality-review

## Hard rules
- 仅 reviewer step，不在本 step spawn worker
- reviewer 不得改 analyze 输出（read-only lint）
- conflict mode 必须额外跑 dual-intent 校验

## Failure modes & recovery
- `dual_intent_missing`（conflict mode）：emit `validator_failed { validator: 'dual-intent-coverage' }` → 回 §3
- `schema_mismatch`：emit `validator_failed { validator: 'mode-schema' }` → 回 §3
- `evidence_unanchored`：emit `validator_failed { validator: 'source-ref-coverage' }` → 回 §3

## Events emitted
- `phase_entered` / `phase_exited`
- `subagent_dispatched` / `subagent_completed`
- `decision_made { topic: 'spec_verdict' }`
- `artifact_written`（spec_review_artifact_path 落 lint 报告时；可选）
- `validator_failed` / `blocked`
```

预估 40 行内。

- [ ] **8.1.13b 创建 `phases/§5-quality-review.md`**

```markdown
# §5 Quality Review

## Goal
quality-reviewer subagent（model=sonnet, effort=medium）做内容质量审查：可读性、可执行性、SourceRef 引用可点击、reproduce_steps 真能复现。

## Inputs (blackboard reads)
- `mode`、`analyze_output_path`、`spec_verdict`、`source_refs`

## Outputs (blackboard writes)
- `quality_verdict` ∈ { pass, fail }
- `quality_violations[]`（fail 时必填）
- `quality_review_artifact_path`（reviewer 落 lint 报告）

## Steps
1. 前置条件：spec_verdict=pass，否则跳过本 phase（已在 §4 阻塞）
2. Phase Dispatcher spawn quality-reviewer（model=sonnet, effort=medium）
3. reviewer 按 `reviewers/quality-reviewer.md` 内 mode-specific quality checklist 评审
4. fail → emit `decision_made { topic: 'quality_verdict', value: 'fail' }`，回 §3-analyze 重派（≤2 次）
5. pass → 进入 §6-emit

## Hard rules
- 仅 reviewer step，不在本 step spawn worker
- quality gate 不过禁止 §6 落 final artifact
- reviewer 不得改 analyze 输出

## Failure modes & recovery
- `quality_violation`：emit `decision_made { topic: 'quality_verdict', value: 'fail' }` → 回 §3
- `reviewer_timeout`：emit `subagent_failed` → 重派 1 次 → 仍失败 `blocked`

## Events emitted
- `phase_entered` / `phase_exited`
- `subagent_dispatched` / `subagent_completed` / `subagent_failed`
- `decision_made { topic: 'quality_verdict' }`
- `artifact_written`（quality_review_artifact_path 落 lint 报告时；可选）
- `validator_failed` / `blocked`
```

预估 40 行内。

- [ ] **8.1.13 创建 `phases/§6-emit.md`**

```markdown
# §6 Emit

## Goal
落 mode-specific 报告文件（`defect-report.md` 或 `conflict-resolution-plan.md`）。本 phase 为 inline 装配 + artifact 落盘，不调用任何 reviewer（quality 在 §5 已通过）。

## Inputs (blackboard reads)
- `quality_verdict`（必须 = pass，否则 §5 已阻塞）
- mode = bug | diff: `mode, root_cause, evidence_refs, impacted_areas, severity, category, scope, reproduce_steps?, actual_behavior?, expected_behavior?`
- mode = conflict: `mode, side_a_intent, side_b_intent, resolution_plan, evidence_refs, severity, category, scope, affected_files?`

## Outputs (blackboard writes)
- mode = bug | diff: `defect_report_path`（必填）
- mode = conflict: `conflict_resolution_plan_path`（必填）

## Steps
1. 装配 mode-specific JSON instance
2. 用 `artifact-validator.ts` 跑 mode 对应 schema 校验
3. 写 markdown 报告到 featureDir（或 workspace 临时目录如非 feature-bound）
4. emit `artifact_written` × 1（mode 决定 kind）

## Hard rules
- 仅 inline，不在本 step spawn subagent
- bug / diff mode 写 `defect-report.md`；conflict mode 写 `conflict-resolution-plan.md`，不可混用
- markdown 正文不放 schema 字段名（`schema_version` 等）；schema 字段只在结构化层
- SourceRef 全部解引用到文件路径 / 行号 / URL，可点击或复制即跳转

## Failure modes & recovery
- `schema_invalid`：emit `validator_failed { validator: 'artifact-<kind>' }` → 回 §3
- `io_error`：emit `validator_failed` → 重试 1 次 → 仍失败 `blocked`

## Events emitted
- `phase_entered` / `phase_exited`
- `artifact_written { kind: 'defect-report' | 'conflict-resolution-plan' }`
- `validator_failed` / `blocked`（按需）
```

预估 40 行内。


### Step 8.1.14 — Step 8.1.16: 写 reviewers / workers / rules（绿）

- [ ] **8.1.14 创建 `reviewers/spec-reviewer.md` + `reviewers/quality-reviewer.md`**

`reviewers/spec-reviewer.md`（≤200 行）：

```markdown
---
name: spec-reviewer
---

# spec-reviewer (defect-analyze)

## Role
机械校验 §3-analyze 输出的 mode-specific schema 合规、字段完整、SourceRef 锚点正确。

## Envelope (input)

```json
{
  "mode": "bug | diff | conflict",
  "analyze_output": { ... },
  "source_refs": { ... }
}
```

## Lint checklist (by mode)

### bug / diff
1. `root_cause` ≥ 10 chars
2. `evidence_refs[]` 全部能在 `source_refs` 字典中找到
3. `impacted_areas[]` ≥ 1 项
4. bug mode 必须分项：`actual_behavior`、`expected_behavior`、`reproduce_steps[]`
5. category ∈ allowed enum

### conflict
1. `side_a_intent` + `side_b_intent` 都 ≥ 10 chars
2. `side_a` 不得等于 `side_b`（语义相同视为 fail）
3. `resolution_plan` ≥ 20 chars 且包含 ≥1 个引用 side_a / side_b
4. `evidence_refs[]` 全部能定位到冲突文件 + 行号

## Output envelope
```json
{
  "pass": true,
  "violations": [{ "code": "...", "field": "...", "message": "..." }]
}
```

## Hard rules
- 不改 analyze 输出
- 不引入新字段
- conflict 模式必须额外跑 dual-intent 校验，bug/diff 不跑

## Failure modes
- `envelope_invalid` / `schema_unreachable`：emit `validator_failed`

## Events emitted
- `decision_made { topic: 'spec_verdict', value: <pass|fail> }`
- `validator_failed`（按需）
```

预估 50 行内。

`reviewers/quality-reviewer.md`（≤200 行）：

```markdown
---
name: quality-reviewer
---

# quality-reviewer (defect-analyze)

## Role
内容质量审查：可读性、可执行性、SourceRef 引用是否可点击、reproduce_steps 是否真能复现。

## Envelope (input)

```json
{
  "mode": "bug | diff | conflict",
  "artifact_path": "...",
  "schema_instance": { ... }
}
```

## Quality checklist (by mode)

### bug
1. `root_cause` 一句话讲清楚（不只复述错误信息）
2. `reproduce_steps[]` 每步可执行，新人能照做复现
3. `impacted_areas` 命名能 grep 到代码（不是模糊"用户登录"，要是具体 module / route）

### diff
1. `root_cause` 必须引用 diff hunk 上下文（line N: ...）
2. `impacted_areas` 必须能 link 到 diff 中的具体 file:line

### conflict
1. dual-intent 必须各自能独立成段读懂（不依赖另一方上下文）
2. `resolution_plan` 必须给出可执行步骤（不是"应该想想"）
3. `affected_files` 必须列全冲突文件

## Output envelope
```json
{
  "pass": true,
  "violations": [{ "code": "...", "severity": "high|medium|low", "field": "...", "message": "..." }]
}
```

## Hard rules
- 不改 artifact
- 重复缺陷的判定 = 标题 + impacted_areas 完全重合
- SourceRef 必须实际 dereference 测试（spec-reviewer 测格式，quality-reviewer 测内容）

## Failure modes
- `dereference_failed`：emit `validator_failed`
- `envelope_invalid`：emit `validator_failed`

## Events emitted
- `decision_made { topic: 'quality_verdict' }`
- `validator_failed`（按需）
```

预估 55 行内。

- [ ] **8.1.15 创建 `workers/analyzer.md`**

```markdown
---
name: analyzer
---

# analyzer (defect-analyze)

## Role
单次 mode-specific 缺陷分析。无状态 subagent；只用 envelope 数据。

## Envelope (input)

```json
{
  "mode": "bug | diff | conflict",
  "severity": "high",
  "category": "logic",
  "scope": [...],
  "user_input": "...",
  "source_refs": {...},
  "retry_violations": [...]
}
```

## Output envelope

### mode = bug | diff
```json
{
  "root_cause": "...",
  "evidence_refs": ["SR-1", ...],
  "impacted_areas": [...],
  "reproduce_steps": [...],
  "actual_behavior": "...",
  "expected_behavior": "...",
  "decisions": [{ "topic": "...", "value": "..." }]
}
```

### mode = conflict
```json
{
  "side_a_intent": "...",
  "side_b_intent": "...",
  "resolution_plan": "...",
  "evidence_refs": ["SR-1", ...],
  "affected_files": [...],
  "decisions": [...]
}
```

## Hard rules
- mode 字段在 envelope 中已定，worker 不得改 mode
- bug mode：必须分项陈述 actual / expected / reproduce_steps / impacted_areas
- conflict mode：必须先写 side_a_intent + side_b_intent 再写 resolution_plan（顺序：JSON key 顺序与执行流程都先 intent 后 plan）
- 不读 envelope 之外的源；缺信息必须在 `decisions` 中写 `gap: ...`
- 所有 evidence_refs 必须能在 envelope.source_refs 字典中找到

## Failure semantics
- output 非严格 JSON → engine 视 `envelope_invalid`
- 缺必填字段 → engine 视 `schema_mismatch`
- worker 不直接 emit events

## When retry_violations 存在
1. 解析 violations[].code（如 `dual_intent_missing` / `evidence_unanchored`）
2. 重写完整 output；不可只补字段
```

预估 60 行内。

- [ ] **8.1.16 创建 3 个 rules 文件**

`rules/mode-dispatch.md`（≤80 行）：

```markdown
# mode-dispatch

## 输入特征矩阵

| 特征 | mode |
|---|---|
| 文本含 `<<<<<<< HEAD` / `=======` / `>>>>>>>` 三件套 | conflict |
| 含 stack trace（`at <fn> (file:line)`）| bug |
| 含 HTTP status ≥ 400 + 路径 + body | bug |
| 含 screenshot 路径 (png/jpg) + 描述错误现象 | bug |
| 含错误日志（`ERROR` / `Exception` / `panic`） | bug |
| 含 `.diff` / `.patch` 文件路径 | diff |
| 含 `git diff <ref>..<ref>` 输出 | diff |
| 含 PR / commit URL + "扫描"/"check" 关键词 | diff |

## 多特征 dominant 判定

1. 优先级：conflict 标记 > stack trace > diff hunk > 错误日志
2. 同优先级多命中 → emit `validator_failed { validator: 'mode-ambiguous' }`，ask user 二选一

（具体 Ambiguous 例移到 `fewshots/{bug,conflict,diff}-mode.md` 内，rules 文件只保留可校验项；spec §6.4。）
```

预估 30 行内。

`rules/defect-classify.md`（≤80 行）：

```markdown
# defect-classify

## severity 矩阵

| 影响范围 | 出错频次 | 用户可见 | severity |
|---|---|---|---|
| 主流程 / 核心服务 | 高 | 是 | critical |
| 主流程 / 核心服务 | 中 | 是 | high |
| 边缘流程 | 中 | 是 | medium |
| 边缘流程 | 低 | 否 | low |
| 内部工具 / dev-only | * | 否 | low |

## category 枚举

- `logic`：条件分支 / 边界 / 状态机错误
- `data`：数据模型 / 字段映射 / null safety
- `concurrency`：race / deadlock / async 顺序
- `security`：注入 / XSS / 鉴权失误
- `performance`：N+1 / 全表扫描 / 内存泄露
- `ui`：渲染 / 文案 / 可访问性
- `config`：环境变量 / 路径 / 权限错位

## conflict mode 特殊

- severity 至少 `medium`（任何 conflict 都阻塞合并）
- category 自由：例 "auth_token vs session_id 表示冲突"
- scope 必须列冲突文件路径全集
```

预估 30 行内。

`rules/defect-format.md`（≤80 行）：

```markdown
# defect-format

## SourceRef 格式

- ID 格式：`SR-<auto-increment>`，例 `SR-1` / `SR-12`
- 引用对象：{ kind, locator, anchor }
  - kind ∈ { file, url, log, screenshot, diff-hunk }
  - locator：路径 / URL / 行号 / hash
  - anchor：1 行 quote 或截图说明

## markdown 输出锚点

defect-report.md / conflict-resolution-plan.md 正文：

- 字段值后跟 `（证据：SR-3 file://...:42-50）` 内联引用
- 不放 schema 字段名（如不写 `schema_version: 1`）
- 不放 envelope JSON 原文（schema 字段只在结构化层）

## conflict 输出特殊

- side_a / side_b intent 段必须按"**意图 A** / **依据** / **意图 B** / **依据** / **解决方案**"顺序输出
- resolution_plan 必须明确 reference 回 side_a / side_b（用粗体 `**意图 A/B**` 反向锚），否则被 quality-reviewer reject
- 完整 markdown 模板与示例移到 `fewshots/conflict-mode.md`（spec §6.4：rules 只放可校验项，示例放 fewshots）
```

预估 25 行内。

### Step 8.1.17 — Step 8.1.18: 写 fewshots + 新建 `_shared/source-ref-rules.md`（绿）

- [ ] **8.1.17 创建 3 个 fewshots（≤100 行/个）**

- `fewshots/bug-mode.md`：完整 bug envelope → analyzer output → defect-report.md 端到端样例（最简：1 个 P0 logic bug）。Round-5 补：含 1 个 "merge 后跑挂了 + 无 conflict 标记 → mode=bug" 的 ambiguous 解析示例（从 rules/mode-dispatch.md 移过来）
- `fewshots/conflict-mode.md`：含 dual-intent 段的完整 conflict 样例，体现 side_a / side_b / resolution_plan 三段格式。Round-5 补：(a) "我看 PR 里有冲突 → 无标记仅描述 → 询问用户提供 conflict block 或 PR URL" ambiguous 处理示例（从 rules/mode-dispatch.md 移过来）；(b) 完整 markdown 输出模板（**意图 A** / **依据** / **意图 B** / **依据** / **解决方案**）（从 rules/defect-format.md 移过来）
- `fewshots/diff-mode.md`：1 个 PR diff hunk + 静态扫描发现 bug + impacted_areas 引用 diff line 的样例。Round-5 补：含 1 个 "「这段代码 bug 了」 + diff → mode=diff" ambiguous 解析示例（从 rules/mode-dispatch.md 移过来）

每个 fewshot 严格按 spec §6.4 模板：完整 input + expected output 对照；不替代 rules。rules 仅保留可校验项（pattern、enum、关系约束），具体示例与 ambiguous 处理示例全部落到 fewshots。

- [ ] **8.1.18 确认 `_shared/source-ref-rules.md` 已在 Commit 7 step 7.30 创建**

```bash
test -f .claude/skills/_shared/source-ref-rules.md || { echo "missing: should have been created in Commit 7 step 7.30"; exit 1; }
```

本 step 仅校验存在；defect-analyze 复用同一文件，不创建第二份。

### Step 8.1.19 — Step 8.1.20: workflow.yaml v2 with by_mode（绿）

- [ ] **8.1.19 创建 `.claude/contracts/workflows/defect-analyze.yaml`**

按 spec §6.12 终稿，行内补 `default_dispatch` + 完整 `event_kinds_emitted`：

```yaml
name: defect-analyze
version: 2
default_dispatch: inline
default_model: sonnet
default_effort: high

metadata:
  event_kinds_emitted:
    - phase_entered
    - phase_exited
    - decision_made
    - artifact_written
    - validator_failed
    - blocked
    - handoff_emitted
  artifact_kinds_produced:
    - defect-report
    - conflict-resolution-plan

steps:
  - id: intake
    dispatch: inline
    blackboard_inputs: [user_input]
    blackboard_outputs: [mode, source_refs, project_module]
    validators: [mode-dispatch]
    failure_modes:
      - mode_ambiguous
      - evidence_unreadable

  - id: classify
    dispatch: inline
    blackboard_inputs: [mode, user_input, source_refs]
    blackboard_outputs: [severity, category, scope]
    validators: [classify-schema]
    failure_modes:
      - classify_uncertain

  - id: analyze
    dispatch: subagent
    model: sonnet
    effort: high
    workers: [analyzer]
    blackboard_inputs: [mode, severity, category, scope, source_refs, user_input]
    blackboard_outputs: [analyze_output_path]
    blackboard_outputs_by_mode:
      bug:      [root_cause, evidence_refs, impacted_areas, reproduce_steps, actual_behavior, expected_behavior]
      diff:     [root_cause, evidence_refs, impacted_areas]
      conflict: [side_a_intent, side_b_intent, resolution_plan, evidence_refs, affected_files]
    failure_modes:
      - worker_timeout

  - id: spec-review
    dispatch: subagent
    model: haiku
    effort: low
    reviewers: [spec-reviewer]
    blackboard_inputs: [mode, analyze_output_path, source_refs]
    blackboard_outputs: [spec_verdict, spec_violations, spec_review_artifact_path]
    validators_by_mode:
      bug:      [analysis-schema, source-ref-coverage]
      diff:     [analysis-schema, source-ref-coverage, diff-hunk-anchored]
      conflict: [conflict-analysis-schema, dual-intent-coverage, source-ref-coverage]
    failure_modes:
      - dual_intent_missing
      - evidence_unanchored
      - schema_mismatch

  - id: quality-review
    dispatch: subagent
    model: sonnet
    effort: medium
    reviewers: [quality-reviewer]
    blackboard_inputs: [mode, analyze_output_path, spec_verdict, source_refs]
    blackboard_outputs: [quality_verdict, quality_violations, quality_review_artifact_path]
    validators: [quality-gate]
    failure_modes:
      - quality_violation
      - reviewer_timeout

  - id: emit
    dispatch: inline
    blackboard_inputs_by_mode:
      bug:      [mode, root_cause, evidence_refs, impacted_areas, severity, category, scope, reproduce_steps, actual_behavior, expected_behavior, quality_verdict]
      diff:     [mode, root_cause, evidence_refs, impacted_areas, severity, category, scope, quality_verdict]
      conflict: [mode, side_a_intent, side_b_intent, resolution_plan, evidence_refs, severity, category, scope, affected_files, quality_verdict]
    blackboard_outputs_by_mode:
      bug:      [defect_report_path]
      diff:     [defect_report_path]
      conflict: [conflict_resolution_plan_path]
    validators_by_mode:
      bug:      [artifact-defect-report, gate-precondition]
      diff:     [artifact-defect-report, gate-precondition]
      conflict: [artifact-conflict-resolution-plan, gate-precondition]
    failure_modes:
      - schema_invalid
      - io_error
```

- [ ] **8.1.20 跑 workflow / phase 测试**

```bash
bun test engine/tests/runtime/defect-analyze-phases.test.ts
bun run check:skills
```

Expected: 6/6 pass（phase 顺序 + analyze worker-only + spec-review reviewer-only haiku/low + quality-review reviewer-only sonnet/medium + emit inline + artifact_kinds）；`check:skills` 通过（manifest 还未更新会有警告，下一 step 修复）。

### Step 8.1.21 — Step 8.1.23: 更新 manifest + 删旧 skill + smoke（绿）

- [ ] **8.1.21 更新 `.claude/contracts/skill-manifest.yaml`**

新增 defect-analyze entry，删除 bug-file / conflict-analyze / diff-scan 三 entry：

```yaml
- id: defect-analyze
  user_invocable: true
  default_model: sonnet
  default_effort: high
  phases:
    - id: intake
      file: .claude/skills/defect-analyze/phases/§1-intake.md
    - id: classify
      file: .claude/skills/defect-analyze/phases/§2-classify.md
    - id: analyze
      file: .claude/skills/defect-analyze/phases/§3-analyze.md
      workers: [analyzer]
    - id: spec-review
      file: .claude/skills/defect-analyze/phases/§4-spec-review.md
      reviewers: [spec-reviewer]
    - id: quality-review
      file: .claude/skills/defect-analyze/phases/§5-quality-review.md
      reviewers: [quality-reviewer]
    - id: emit
      file: .claude/skills/defect-analyze/phases/§6-emit.md
  artifacts:
    - kind: defect-report
      schema: artifact-defect-report
    - kind: conflict-resolution-plan
      schema: artifact-conflict-resolution-plan
```

同时确保 `entries[]` 中 bug-file / conflict-analyze / diff-scan 全部删除。

- [ ] **8.1.22 删除 3 个旧 skill 目录 + 防御性删旧 workflow（如存在）**

```bash
git rm -rf .claude/skills/bug-file/
git rm -rf .claude/skills/conflict-analyze/
git rm -rf .claude/skills/diff-scan/
# 防御性删除：若历史上某 commit 建过这 3 个 workflow，本 step 一并清理
test -f .claude/contracts/workflows/bug-file.yaml && git rm .claude/contracts/workflows/bug-file.yaml
test -f .claude/contracts/workflows/conflict-analyze.yaml && git rm .claude/contracts/workflows/conflict-analyze.yaml
test -f .claude/contracts/workflows/diff-scan.yaml && git rm .claude/contracts/workflows/diff-scan.yaml
```

注：P1#4.b 没建 bug-file / conflict-analyze / diff-scan workflow（P1 plan 中 8 个 v2 workflow 列表为：case-draft / case-edit / case-hotfix / playwright-automation 4 个现有 + defect-analyze / infra-diagnose / knowledge-curate / workspace-manage 4 个新，不含 3 个待合并 skill）。上述 `git rm` 命令仅作防御性兜底。defect-analyze.yaml 已在 P1#4.b 建 v2 stub；本 commit 8.1.19 直接 overwrite。

- [ ] **8.1.23 跑 smoke + manifest + 全测**

```bash
bun test engine/tests/runtime/defect-analyze-events.smoke.test.ts
bun test engine/tests/skills/defect-analyze-shape.test.ts
bun test engine/tests/runtime/artifact-validator.test.ts
bun run check:skills
bun test
bun run check
```

Expected: all green。需注意：fixtures helper `runWorkflowFixture` 需支持 by_mode 字段（如 P3#7.34 实现的 helper 没考虑 mode-specific，需在本 step 补；mode 通过 fixture 中 `intake_mock.output.mode` 注入到 blackboard）。

### Step 8.1.24: Commit 8.1

- [ ] **8.1.24 Commit**

```bash
git add .claude/skills/defect-analyze/ \
        .claude/skills/_shared/source-ref-rules.md \
        .claude/contracts/workflows/defect-analyze.yaml \
        .claude/contracts/skill-manifest.yaml \
        .claude/contracts/schemas/artifact-defect-report.json \
        .claude/contracts/schemas/artifact-conflict-resolution-plan.json \
        engine/tests/runtime/defect-analyze-events.smoke.test.ts \
        engine/tests/runtime/defect-analyze-phases.test.ts \
        engine/tests/runtime/artifact-validator.test.ts \
        engine/tests/skills/defect-analyze-shape.test.ts \
        engine/tests/fixtures/defect-analyze-*.json

# rm 已通过 git rm 标记，直接 commit
git commit -m "refactor: ✨ migrate defect-analyze (merge bug-file + conflict-analyze + diff-scan)

- new β-lite skill: 6 phases (intake / classify / analyze / spec-review / quality-review / emit)
- analyze worker-only (sonnet/high); spec-review reviewer-only (haiku/low); quality-review reviewer-only (sonnet/medium); emit inline
- workflow v2 with by_mode extension (bug/diff/conflict)
- 2 new artifact schemas: defect-report, conflict-resolution-plan
- conflict mode preserves dual-intent + resolution_plan from old conflict-analyze
- delete 3 old skill dirs (bug-file, conflict-analyze, diff-scan)
- _shared/source-ref-rules.md (cross-skill SourceRef baseline)
- smoke test covers 3 mode paths
"
```


## Commit 8.2: `refactor: ✨ migrate case-edit to β-lite + E`

**目标:** case-edit 迁 β-lite 骨架（5 phase：parse / diff / apply / spec-review / emit）；workflow.yaml v2；engine emit events。Round-5 拆 review + Round-7 修 verdict flow：§3-apply（worker only）只产 modified content 不写回原文件；§4-spec-review（reviewer only, haiku/low）gate 校验；§5-emit（inline）pass 后 backup → 写回原文件 → emit artifact_written，符合 spec §6.8 reviewer gate 设计。

**Files:**
- Create: `.claude/skills/case-edit/phases/§1-parse.md`
- Create: `.claude/skills/case-edit/phases/§2-diff.md`
- Create: `.claude/skills/case-edit/phases/§3-apply.md`
- Create: `.claude/skills/case-edit/phases/§4-spec-review.md`
- Create: `.claude/skills/case-edit/phases/§5-emit.md`
- Create: `.claude/skills/case-edit/reviewers/spec-reviewer.md`
- Create: `.claude/skills/case-edit/workers/edit-worker.md`
- Create: `.claude/skills/case-edit/fewshots/archive-sync.md`（从 fewshots/case-format-sample.md 改造）
- Modify: `.claude/skills/case-edit/SKILL.md`（56 → ≤100 行）
- Delete: `.claude/skills/case-edit/references/**`
- Delete: `.claude/skills/case-edit/rules/case-qa.md`（P1#5 已移到 _shared/）
- Modify: `.claude/contracts/workflows/case-edit.yaml`（v1 → v2 5 phase）
- Modify: `.claude/contracts/skill-manifest.yaml`
- Create: `engine/tests/skills/case-edit-shape.test.ts`
- Create: `engine/tests/runtime/case-edit-phases.test.ts`

### Step 8.2.1 — Step 8.2.6: 写 + 实现 + 测试 + commit

- [ ] **8.2.1 写 failing shape + phase 测试**

`engine/tests/skills/case-edit-shape.test.ts`：与 case-draft-shape 同模式，校验 SKILL ≤100、5 phase ≤150、reviewers/workers ≤200、fewshots ≤100。

`engine/tests/runtime/case-edit-phases.test.ts`：

```typescript
test('5 phases in canonical order', () => {
  const wf = parseWorkflow(readFileSync('.claude/contracts/workflows/case-edit.yaml', 'utf8'))
  expect(wf.steps.map((s) => s.id)).toEqual(['parse', 'diff', 'apply', 'spec-review', 'emit'])
})

test('§5-emit is inline (write-back after spec-review pass)', () => {
  const wf = parseWorkflow(readFileSync('.claude/contracts/workflows/case-edit.yaml', 'utf8'))
  const emit = wf.steps.find((s) => s.id === 'emit')
  expect(emit?.dispatch).toBe('inline')
  expect(emit?.workers ?? []).toEqual([])
  expect(emit?.reviewers ?? []).toEqual([])
  expect(emit?.blackboard_inputs).toContain('spec_verdict')
})

test('§3-apply is worker-only subagent (sonnet/high)', () => {
  const wf = parseWorkflow(readFileSync('.claude/contracts/workflows/case-edit.yaml', 'utf8'))
  const apply = wf.steps.find((s) => s.id === 'apply')
  expect(apply?.dispatch).toBe('subagent')
  expect(apply?.workers).toEqual(['edit-worker'])
  expect(apply?.reviewers ?? []).toEqual([])
  expect(apply?.model).toBe('sonnet')
  expect(apply?.effort).toBe('high')
})

test('§4-spec-review is reviewer-only subagent (haiku/low)', () => {
  const wf = parseWorkflow(readFileSync('.claude/contracts/workflows/case-edit.yaml', 'utf8'))
  const sr = wf.steps.find((s) => s.id === 'spec-review')
  expect(sr?.dispatch).toBe('subagent')
  expect(sr?.workers ?? []).toEqual([])
  expect(sr?.reviewers).toEqual(['spec-reviewer'])
  expect(sr?.model).toBe('haiku')
  expect(sr?.effort).toBe('low')
})
```

跑：`bun test engine/tests/{runtime,skills}/case-edit-*` Expected: fail。

- [ ] **8.2.2 重写 SKILL.md（≤100 行）**

Frontmatter 同 case-draft 模板，body：

- When to trigger：用户给出 XMind/CSV/Archive MD 用例路径要求编辑/同步/标准化
- Must not trigger：用户给出 PRD/Lanhu/Axure 要新建用例（→ case-draft）；给 bug URL（→ case-hotfix）
- Hard rules：仅修改已有用例；不引入新 case_id；同步 archive ↔ xmind 时 case_id 全 1-1 映射；不动 source_refs 字典；blocking 处理与 case-draft 一致
- Phase index：§1-parse / §2-diff / §3-apply / §4-spec-review / §5-emit
- Loaded by phase：§1 rules/case-qa(_shared); §2 rules/case-qa(_shared); §3 workers/edit-worker + fewshots/archive-sync; §4 reviewers/spec-reviewer; §5 inline（无 reviewer/worker）
- Output artifacts: archive(modified) / xmind(modified) / manifest(updated)

- [ ] **8.2.3 写 5 phase 文件（≤150 行/个）**

`§1-parse.md`：

- Goal：读取用户指定 archive.md / cases.xmind / CSV，解析为结构化 cases + case_index
- Inputs：user_input（路径或 URL）、project_module（可选）
- Outputs：parsed_cases、parsed_case_index、source_archive_path、source_xmind_path
- Steps：1) 识别格式 2) 调用对应 parser（archive 用 marked + 表格 / xmind 用 xmind-js / csv 用 papaparse） 3) 校验 case_id 唯一 + 字段完整
- Hard rules：不修改源文件；缺字段不补全（交 §2 diff）
- Failure modes：file_not_found / format_unrecognized / parser_failed
- Events: phase_entered/exited + decision_made(format_dispatch) + validator_failed

`§2-diff.md`：

- Goal：解析用户编辑意图（diff / 描述 / mapping），生成结构化 edit_ops
- Inputs：parsed_cases、user_input（diff or 描述）、parsed_case_index
- Outputs：edit_ops（[{ op: 'modify'|'reorder'|'split'|'normalize', case_id, payload }]）、open_questions
- Steps：1) NLU 用户意图 2) 映射到 case_id 3) 生成 edit_ops 草案 4) ambiguity scan
- Hard rules：edit_op 必须指定 case_id；新增 case 不在本 skill 范围（emit blocked，建议路由 case-draft）
- Failure modes：intent_ambiguous / case_not_found / out_of_scope_add
- Events: phase_entered/exited + decision_made + blocked

`§3-apply.md`（worker-only step；不写回原文件）：

- Goal：调度 edit-worker subagent 应用 edit_ops，**输出结构化 modified content 到 blackboard，不写回原文件**（写回放 §5-emit gate 通过后）
- Inputs：parsed_cases、edit_ops、source_archive_path、source_xmind_path
- Outputs：modified_archive_content、modified_xmind_content、modified_manifest_content
- Steps：1) Phase Dispatcher spawn edit-worker (sonnet/high) 2) worker 应用 ops 生成 modified content 3) worker 输出至 blackboard，进入 §4-spec-review；4) 失败重派 ≤2 次
- Hard rules：**禁止写回原文件**；不引入新 case_id；保留所有 source_refs；本 step 不调 reviewer
- Failure modes：worker_timeout / case_id_collision
- Events: phase_entered/exited + subagent_dispatched/completed/failed

`§4-spec-review.md`（reviewer-only step）：

- Goal：spec-reviewer subagent（haiku/low）校验 §3-apply 的 modified content schema 一致、case_id 集合保留
- Inputs：modified_archive_content、modified_xmind_content、modified_manifest_content、parsed_case_index
- Outputs：spec_verdict ∈ {pass, fail}、spec_violations[]、spec_review_artifact_path
- Steps：1) Phase Dispatcher spawn spec-reviewer (haiku/low) 2) reviewer 跑 schema lint + case_id 集合 diff 3) fail → emit `validator_failed`，回 §3 重派（≤2 次）；超出 emit `blocked` 4) pass → 进入 §5-emit
- Hard rules：reviewer 不得改 modified content（read-only lint）；本 step 不调 worker；本 step 不写文件
- Failure modes：schema_mismatch / case_id_set_changed / reviewer_timeout
- Events: phase_entered/exited + subagent_dispatched/completed + decision_made(spec_verdict) + artifact_written(spec_review_artifact_path 可选) + validator_failed

`§5-emit.md`（inline only；backup + 写回 + emit artifact_written）：

- Goal：spec_verdict=pass 后 backup 原文件、写回 modified content、emit artifact_written
- Inputs：modified_archive_content、modified_xmind_content、modified_manifest_content、source_archive_path、source_xmind_path、spec_verdict
- Outputs：modified_archive_path、modified_xmind_path、modified_manifest_path
- Steps：1) 前置 spec_verdict=pass 2) backup `<file>.bak.<ts>` 3) 写回 archive/xmind/manifest 3 文件 4) 失败 → 回滚 backup 5) emit `artifact_written × 3`（kind = archive / xmind / manifest）
- Hard rules：仅 inline，不在本 step spawn subagent；写回失败必须回滚 backup；spec_verdict≠pass 禁止写回
- Failure modes：io_error / rollback_failed
- Events: phase_entered/exited + artifact_written × 3 + validator_failed / blocked（按需）

- [ ] **8.2.4 写 reviewers/workers/fewshots**

`reviewers/spec-reviewer.md`（同 case-draft spec-reviewer 模板，lint checklist 改为：edit_ops 应用后 archive/xmind/manifest schema 一致；case_id 集合与原文件相同（modify/reorder）或仅 split 引起的可控变化）。

`workers/edit-worker.md`：envelope 输入 parsed_cases + edit_ops，输出 modified content 三份；hard rule 同 case-worker（不读 envelope 外，无 op 类型时报错而非默认行为）。

`fewshots/archive-sync.md`：1 个典型 archive ↔ xmind 同步样例（含 reorder + normalize 两 op）。

- [ ] **8.2.5 重写 `workflows/case-edit.yaml`**

```yaml
name: case-edit
version: 2
default_dispatch: inline
default_model: sonnet
default_effort: high

metadata:
  event_kinds_emitted:
    - phase_entered
    - phase_exited
    - decision_made
    - artifact_written
    - validator_failed
    - blocked
  artifact_kinds_produced:
    - archive
    - xmind
    - manifest

steps:
  - id: parse
    dispatch: inline
    blackboard_inputs: [user_input]
    blackboard_outputs: [parsed_cases, parsed_case_index, source_archive_path, source_xmind_path]
    validators: [parser-schema]
    failure_modes: [file_not_found, format_unrecognized, parser_failed]

  - id: diff
    dispatch: inline
    blackboard_inputs: [parsed_cases, user_input, parsed_case_index]
    blackboard_outputs: [edit_ops, open_questions]
    validators: [edit-ops-schema]
    failure_modes: [intent_ambiguous, case_not_found, out_of_scope_add]

  - id: apply
    dispatch: subagent
    model: sonnet
    effort: high
    workers: [edit-worker]
    blackboard_inputs: [parsed_cases, edit_ops, source_archive_path, source_xmind_path]
    blackboard_outputs: [modified_archive_content, modified_xmind_content, modified_manifest_content]
    failure_modes: [worker_timeout, case_id_collision]

  - id: spec-review
    dispatch: subagent
    model: haiku
    effort: low
    reviewers: [spec-reviewer]
    blackboard_inputs: [modified_archive_content, modified_xmind_content, modified_manifest_content, parsed_case_index]
    blackboard_outputs: [spec_verdict, spec_violations, spec_review_artifact_path]
    validators: [case-id-preservation, archive-schema, xmind-schema, manifest-schema]
    failure_modes: [schema_mismatch, case_id_set_changed, reviewer_timeout]

  - id: emit
    dispatch: inline
    blackboard_inputs: [modified_archive_content, modified_xmind_content, modified_manifest_content, source_archive_path, source_xmind_path, spec_verdict]
    blackboard_outputs: [modified_archive_path, modified_xmind_path, modified_manifest_path]
    validators: [artifact-archive, artifact-xmind, artifact-manifest]
    failure_modes: [io_error, rollback_failed]
```

- [ ] **8.2.6 删 references + 旧 case-qa + 更新 manifest + 跑测试 + commit**

```bash
git rm -rf .claude/skills/case-edit/references/
test -f .claude/skills/case-edit/rules/case-qa.md && git rm .claude/skills/case-edit/rules/case-qa.md
# 更新 skill-manifest.yaml case-edit entry（同 case-draft 模式）
bun test engine/tests/{runtime,skills}/case-edit-*
bun run check:skills
bun test
git add .claude/skills/case-edit/ .claude/contracts/workflows/case-edit.yaml \
        .claude/contracts/skill-manifest.yaml engine/tests/{runtime,skills}/case-edit-*
git commit -m "refactor: ✨ migrate case-edit to β-lite + E backbone

- 5 phases (parse / diff / apply / spec-review / emit)
- apply worker-only (sonnet/high) produces modified content (no write-back); spec-review reviewer-only (haiku/low) gates; emit inline backs up + writes after spec_verdict=pass per spec §6.8 reviewer gate design
- workflow v2 with edit_ops contract
- delete references/, rules/case-qa.md (moved to _shared in P1#5)
- spec-reviewer enforces case_id preservation
"
```

---

## Commit 8.3: `refactor: ✨ migrate case-hotfix to β-lite + E`

**目标:** case-hotfix 迁 β-lite（5 phase：bug-parse / scope / draft / spec-review / output）；workflow.yaml v2；Round-5 拆 review：§3-draft（worker only, sonnet/high）+ §4-spec-review（reviewer only, haiku/low）符合 spec §6.9 + §6.11；§5-output inline 装配 final artifact。**额外硬要求：把 `references/hotfix-archive-format.md`（216 行）拆为 3 份避免规则丢失：`rules/hotfix-format.md`（命名 + case 内容 + SourceRef，≤80 行）+ `rules/hotfix-data-prep.md`（SQL / Spark / 数据准备边界 + 单用例约束 + frontmatter keywords + 输出位置，≤80 行）+ `fewshots/bug-to-hotfix.md`（端到端样例，≤100 行）**，spec §6.6 长度上限红线项。

**Files:**
- Create: `.claude/skills/case-hotfix/phases/§1-bug-parse.md`
- Create: `.claude/skills/case-hotfix/phases/§2-scope.md`
- Create: `.claude/skills/case-hotfix/phases/§3-draft.md`
- Create: `.claude/skills/case-hotfix/phases/§4-spec-review.md`
- Create: `.claude/skills/case-hotfix/phases/§5-output.md`
- Create: `.claude/skills/case-hotfix/reviewers/spec-reviewer.md`
- Create: `.claude/skills/case-hotfix/workers/hotfix-worker.md`
- Create: `.claude/skills/case-hotfix/rules/hotfix-format.md`（命名 + case 内容 + SourceRef，≤80 行）
- Create: `.claude/skills/case-hotfix/rules/hotfix-data-prep.md`（SQL/Spark 边界 + 单用例约束 + frontmatter keywords + 输出位置，≤80 行）
- Create: `.claude/skills/case-hotfix/fewshots/bug-to-hotfix.md`（≤100 行）
- Modify: `.claude/skills/case-hotfix/SKILL.md`（63 → ≤100 行）
- Delete: `.claude/skills/case-hotfix/references/hotfix-archive-format.md`
- Delete: `.claude/skills/case-hotfix/rules/case-qa.md`（P1#5 已移）
- Modify: `.claude/contracts/workflows/case-hotfix.yaml`（v1 → v2）
- Modify: `.claude/contracts/skill-manifest.yaml`
- Create: `.claude/contracts/schemas/artifact-hotfix-case-bundle.json`
- Create: `engine/tests/skills/case-hotfix-shape.test.ts`
- Create: `engine/tests/runtime/case-hotfix-phases.test.ts`

### Step 8.3.1 — Step 8.3.8

- [ ] **8.3.1 写 failing tests（shape + phases + artifact-hotfix-case-bundle schema）**

shape test 校验：SKILL ≤100、5 phase ≤150、reviewers/workers ≤200、`rules/hotfix-format.md` 与 `rules/hotfix-data-prep.md` 均 ≤80（红线）、`fewshots/bug-to-hotfix.md` ≤100。

phase test 校验：`['bug-parse', 'scope', 'draft', 'spec-review', 'output']` 顺序；`draft` 是 worker-only subagent（sonnet/high）；`spec-review` 是 reviewer-only subagent（haiku/low）；`output` inline；metadata.artifact_kinds_produced 含 `hotfix-case-bundle`。

artifact-validator test 增 `hotfix-case-bundle` 用例（required fields: bug_id, fix_commits, regression_cases）。

- [ ] **8.3.2 创建 `artifact-hotfix-case-bundle.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kata.dev/schemas/artifact-hotfix-case-bundle.json",
  "title": "Hotfix Case Bundle",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version", "bug_id", "fix_commits", "regression_cases", "regression_scope"],
  "properties": {
    "schema_version": { "type": "integer", "const": 1 },
    "bug_id": { "type": "string" },
    "bug_url": { "type": "string", "format": "uri" },
    "fix_commits": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
    "regression_cases": { "type": "array", "items": { "$ref": "artifact-archive.json#/properties/cases/items" }, "minItems": 1 },
    "regression_scope": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
    "evidence_refs": { "type": "array", "items": { "type": "string", "pattern": "^SR-" } }
  }
}
```

跑 schema test：`bun test engine/tests/runtime/artifact-validator.test.ts -t "hotfix-case-bundle"`。

- [ ] **8.3.3 重写 SKILL.md（≤100 行）**

When to trigger：用户给 ZenTao bug URL/bug-view URL/bug ID + 修复信息（commits / PR）。

Must not trigger：bug 描述无 commits / 修复记录 → 路由 `defect-analyze`；用户要分析 conflict → `defect-analyze`。

Hard rules：
- 必须有 fix_commits ≥1（缺则 emit `blocked { reason: 'fix_commits_missing' }`，提示用户提供 commits）
- regression_cases 必须 link 回 bug 现象（reproduction case 至少 1 个）
- regression_scope 必须 ≥1 个具体 module/route，不可"全功能回归"
- 输出 `hotfix-case-bundle` 单 artifact，不输出独立 archive

Phase index：§1-bug-parse / §2-scope / §3-draft / §4-spec-review / §5-output。

Loaded by phase 表：§3 workers/hotfix-worker + rules/hotfix-format + fewshots/bug-to-hotfix；§4 reviewers/spec-reviewer；§5 inline（无 reviewer/worker）。

Output artifact：hotfix-case-bundle → `workspace/<project>/features/<feature>/hotfix-case-bundle.md`。

- [ ] **8.3.4 写 5 个 phase 文件**

`§1-bug-parse.md`：

- Goal：从 ZenTao URL/ID 抓 bug 现象 + 状态 + 关联 commits/PR
- Inputs：user_input
- Outputs：bug_id、bug_url、bug_report（actual_behavior, severity, reporter, status）、fix_commits、fix_status
- Steps：1) 解析 user_input 提取 ZenTao ID/URL 2) 调 zentao plugin fetch bug 详情 3) 解析关联的 fix commits 4) 校验 fix_status ∈ resolved/closed；其它状态 emit `blocked { reason: 'bug_not_fixed' }`
- Hard rules：缺 fix_commits 必 block；不自行推断 fix scope
- Failure modes：zentao_fetch_failed / bug_not_resolved / fix_commits_missing

`§2-scope.md`：

- Goal：基于 fix_commits 解析改动范围，确定 regression_scope
- Inputs：fix_commits、bug_report、project_module
- Outputs：regression_scope、changed_files、changed_modules
- Steps：1) 对每条 commit 跑 `git show --stat`（read-only on `workspace/<project>/.kata/repos/**`）2) 聚合 changed_files → modules 3) 与 bug_report.module 取并集 4) 列出 regression_scope
- Hard rules：repos 只读；regression_scope ≥1 项；commit 不存在 emit `validator_failed`
- Failure modes：commit_not_found / scope_empty / repo_unreachable

`§3-draft.md`：

- Goal：spawn hotfix-worker 产出 regression_cases（覆盖 fix scope + reproduction case + boundary case）；worker-only step（spec-review 在 §4 独立）
- Inputs：bug_report、fix_commits、changed_files、regression_scope、project_module
- Outputs：draft_regression_cases、draft_case_index
- Steps：1) Phase Dispatcher spawn hotfix-worker (sonnet/high) 2) worker 按 rules/hotfix-format 生成 cases 3) worker 输出至 blackboard，进入 §4-spec-review
- Hard rules：必有 ≥1 reproduction case；覆盖 changed_files 关键路径；表单字段必匹配 source_refs.form_baseline；本 step 不调 reviewer
- Failure modes：worker_timeout / no_reproduction_case / scope_uncovered

`§4-spec-review.md`：

- Goal：spec-reviewer subagent（haiku/low）校验 §3-draft 输出 case_id 唯一 + 至少 1 reproduction case + regression_scope 覆盖率
- Inputs：draft_regression_cases、draft_case_index、regression_scope、changed_files
- Outputs：spec_verdict ∈ {pass, fail}、spec_violations[]、spec_review_artifact_path
- Steps：1) Phase Dispatcher spawn spec-reviewer (haiku/low) 2) reviewer 跑 lint：case-id-unique / reproduction-case-present / scope-coverage 3) fail → emit `validator_failed`，回 §3 重派（≤2 次）4) pass → 进入 §5-output
- Hard rules：reviewer 不得改 worker 输出（read-only lint）；本 step 不调 worker；spec_verdict=fail 禁止 §5 落 artifact
- Failure modes：case_id_collision / no_reproduction_case / scope_uncovered / reviewer_timeout
- Events: phase_entered/exited + subagent_dispatched/completed + decision_made(spec_verdict) + artifact_written(spec_review_artifact_path 可选) + validator_failed

`§5-output.md`：

- Goal：inline 装配 hotfix-case-bundle artifact 并落盘
- Inputs：bug_report、fix_commits、draft_regression_cases、regression_scope、source_refs、spec_verdict
- Outputs：hotfix_bundle_path
- Steps：1) 前置条件 spec_verdict=pass 2) 装配 schema instance 3) artifact-validator 跑 hotfix-case-bundle schema 4) 写 markdown 报告 5) emit handoff_emitted（如需 playwright-automation 跟进，挂 AutomationIntent）
- Hard rules：仅 inline，不在本 step spawn subagent；schema 不通过禁止落 final；handoff 仅对 automation_status=ready
- Failure modes：schema_invalid / io_error

- [ ] **8.3.5 写 reviewers / workers**

`reviewers/spec-reviewer.md`（≤200 行）：lint hotfix-case-bundle schema、case_id 唯一、reproduction case 存在、regression_scope 覆盖率 ≥1 changed_file。

`workers/hotfix-worker.md`（≤200 行）：envelope { bug_report, fix_commits, changed_files, regression_scope, retry_violations? }；输出 regression_cases + case_index + decisions[]；硬规则同 case-worker（无 envelope 外读取）。

- [ ] **8.3.6a 蒸馏 `rules/hotfix-format.md`（≤80 行）**

从旧 `references/hotfix-archive-format.md`（216 行）保留：
1. hotfix-case-bundle 字段命名规则（bug_id 格式、fix_commits 数组顺序、regression_scope 命名规范）
2. case 内容硬规则（reproduction case 必含原 bug actual_behavior 引用、覆盖 fix scope 的 case 必引用 fix_commits）
3. SourceRef 锚点规则（ZenTao bug URL + commits SHA + changed_files line range）

跑：`wc -l .claude/skills/case-hotfix/rules/hotfix-format.md` Expected: ≤80。

- [ ] **8.3.6b 蒸馏 `rules/hotfix-data-prep.md`（≤80 行）**

从旧 `references/hotfix-archive-format.md` 保留另一半关键规则（避免一刀切到 80 行丢失）：
1. SQL / Spark / 数据准备边界（hotfix 是否涉及 schema 变更、数据迁移）
2. 单用例约束（1 个 hotfix bundle = 1 bug = 1 fix scope，不得合并多 bug）
3. frontmatter keywords（hotfix-case-bundle markdown frontmatter 必填字段）
4. 输出位置（feature 根 vs `.process/`）

砍掉：完整端到端示例（→ fewshots/bug-to-hotfix.md）、历史命名变体兼容说明、长描述文字。

跑：`wc -l .claude/skills/case-hotfix/rules/hotfix-data-prep.md` Expected: ≤80。

- [ ] **8.3.7 写 `fewshots/bug-to-hotfix.md`（≤100 行）**

完整端到端样例：1 个真实 ZenTao bug（mock id）+ 1 fix commit + 3 regression cases (1 reproduction + 1 happy + 1 boundary)。从旧 hotfix-archive-format.md 中已有的示例段抽取压缩。

- [ ] **8.3.8 重写 workflow.yaml v2 + 删旧 + 更新 manifest + 测试 + commit**

`.claude/contracts/workflows/case-hotfix.yaml`：

```yaml
name: case-hotfix
version: 2
default_dispatch: inline
default_model: sonnet
default_effort: high

metadata:
  event_kinds_emitted:
    - phase_entered
    - phase_exited
    - decision_made
    - artifact_written
    - validator_failed
    - blocked
    - handoff_emitted
  artifact_kinds_produced:
    - hotfix-case-bundle

steps:
  - id: bug-parse
    dispatch: inline
    blackboard_inputs: [user_input]
    blackboard_outputs: [bug_id, bug_url, bug_report, fix_commits, fix_status, project_module]
    validators: [zentao-bug-schema]
    failure_modes: [zentao_fetch_failed, bug_not_resolved, fix_commits_missing]

  - id: scope
    dispatch: inline
    blackboard_inputs: [fix_commits, bug_report, project_module]
    blackboard_outputs: [regression_scope, changed_files, changed_modules]
    validators: [scope-schema]
    failure_modes: [commit_not_found, scope_empty, repo_unreachable]

  - id: draft
    dispatch: subagent
    model: sonnet
    effort: high
    workers: [hotfix-worker]
    blackboard_inputs: [bug_report, fix_commits, changed_files, regression_scope, project_module]
    blackboard_outputs: [draft_regression_cases, draft_case_index]
    failure_modes: [worker_timeout]

  - id: spec-review
    dispatch: subagent
    model: haiku
    effort: low
    reviewers: [spec-reviewer]
    blackboard_inputs: [draft_regression_cases, draft_case_index, regression_scope, changed_files]
    blackboard_outputs: [spec_verdict, spec_violations, spec_review_artifact_path]
    validators: [case-id-unique, reproduction-case-present, scope-coverage]
    failure_modes: [case_id_collision, no_reproduction_case, scope_uncovered, reviewer_timeout]

  - id: output
    dispatch: inline
    blackboard_inputs: [bug_report, fix_commits, draft_regression_cases, regression_scope, source_refs, spec_verdict]
    blackboard_outputs: [hotfix_bundle_path, handoff_envelopes]
    validators: [artifact-hotfix-case-bundle]
    failure_modes: [schema_invalid, io_error]
```

```bash
git rm .claude/skills/case-hotfix/references/hotfix-archive-format.md
git rm -rf .claude/skills/case-hotfix/references/   # 如还有其它（empty 后会自动 rm）
test -f .claude/skills/case-hotfix/rules/case-qa.md && git rm .claude/skills/case-hotfix/rules/case-qa.md
# manifest 更新（同 case-draft 模式，artifact = hotfix-case-bundle）
bun test engine/tests/{runtime,skills}/case-hotfix-*
bun test engine/tests/runtime/artifact-validator.test.ts -t "hotfix"
bun run check:skills
bun test
git add .claude/skills/case-hotfix/ .claude/contracts/workflows/case-hotfix.yaml \
        .claude/contracts/skill-manifest.yaml \
        .claude/contracts/schemas/artifact-hotfix-case-bundle.json \
        engine/tests/{runtime,skills}/case-hotfix-* \
        engine/tests/runtime/artifact-validator.test.ts
git commit -m "refactor: ✨ migrate case-hotfix to β-lite + E backbone

- 5 phases (bug-parse / scope / draft / spec-review / output)
- draft worker-only (sonnet/high); spec-review reviewer-only (haiku/low) per spec §6.9 + §6.11; output inline
- workflow v2 with separated subagent steps
- distill 216-line hotfix-archive-format.md into rules/hotfix-format.md (≤80) + rules/hotfix-data-prep.md (≤80) + fewshots/bug-to-hotfix.md (≤100)
- new artifact-hotfix-case-bundle.json schema
- delete references/, rules/case-qa.md
"
```

---

## Commit 8.4: `refactor: ✨ migrate infra-diagnose to β-lite + E`

**目标:** infra-diagnose 迁 β-lite（4 phase：probe / diagnose / remediate / kb-write）；workflow.yaml v2；新增 `artifact-diag-report.json`。Round-5：按 spec §6.11 "单流程无 review"，删 spec-reviewer 文件与所有引用；diagnose 是 worker-only subagent，其他 phase 全 inline。

**Files:**
- Create: `.claude/skills/infra-diagnose/phases/§1-probe.md`
- Create: `.claude/skills/infra-diagnose/phases/§2-diagnose.md`
- Create: `.claude/skills/infra-diagnose/phases/§3-remediate.md`
- Create: `.claude/skills/infra-diagnose/phases/§4-kb-write.md`
- Create: `.claude/skills/infra-diagnose/workers/ssh-worker.md`
- Create: `.claude/skills/infra-diagnose/rules/ssh-protocol.md`（从 references/ssh-protocol.md 蒸馏，≤80 行）
- Create: `.claude/skills/infra-diagnose/rules/knowledge-format.md`（从 references/knowledge-format.md 蒸馏，≤80 行）
- Create: `.claude/skills/infra-diagnose/fewshots/diag-playbook.md`（从 references/diagnostic-playbook.md 改造，≤100 行）
- Modify: `.claude/skills/infra-diagnose/SKILL.md`（54 → ≤100 行）
- Delete: `.claude/skills/infra-diagnose/references/**`
- Modify: `.claude/contracts/workflows/infra-diagnose.yaml`（v1 → v2）
- Modify: `.claude/contracts/skill-manifest.yaml`
- Create: `.claude/contracts/schemas/artifact-diag-report.json`
- Create: `engine/tests/skills/infra-diagnose-shape.test.ts`
- Create: `engine/tests/runtime/infra-diagnose-phases.test.ts`

### Step 8.4.1 — Step 8.4.6

- [ ] **8.4.1 写 failing shape + phase + schema 测试**

shape 校验 4 phase ≤150；2 rules ≤80；1 fewshot ≤100；**显式断言无 reviewers/ 目录**（spec §6.11：infra-diagnose 单流程无 review，仅 1 个 worker）。phase 测：`['probe', 'diagnose', 'remediate', 'kb-write']`；`diagnose` 是 worker-only subagent。artifact-validator 加 `diag-report` 用例。

```typescript
test('no reviewers/ directory (spec §6.11: single-stream skill)', () => {
  expect(existsSync('.claude/skills/infra-diagnose/reviewers')).toBe(false)
})

test('§2-diagnose is worker-only subagent (sonnet/high)', () => {
  const wf = parseWorkflow(readFileSync('.claude/contracts/workflows/infra-diagnose.yaml', 'utf8'))
  const d = wf.steps.find((s) => s.id === 'diagnose')
  expect(d?.dispatch).toBe('subagent')
  expect(d?.workers).toEqual(['ssh-worker'])
  expect(d?.reviewers ?? []).toEqual([])
})
```

- [ ] **8.4.2 创建 `artifact-diag-report.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kata.dev/schemas/artifact-diag-report.json",
  "title": "Infra Diagnostic Report",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version", "target_host", "symptoms", "diagnosis", "remediation_steps", "evidence_refs"],
  "properties": {
    "schema_version": { "type": "integer", "const": 1 },
    "target_host": { "type": "string" },
    "symptoms": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
    "diagnosis": { "type": "string", "minLength": 10 },
    "remediation_steps": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
    "evidence_refs": { "type": "array", "items": { "type": "string", "pattern": "^SR-" }, "minItems": 1 },
    "knowledge_entries": { "type": "array", "items": { "type": "string" } }
  }
}
```

- [ ] **8.4.3 重写 SKILL.md（≤100 行）**

When to trigger：用户要求 SSH 登录服务器排查数据源 / 服务器连通性故障；要求沉淀凭据 / 排查知识。

Must not trigger：用户只要分析 stack trace（→ defect-analyze）；只要查询业务规则（→ knowledge-curate）。

Hard rules：
- SSH 命令必须先 dry-run + risk classify；destructive 命令需用户明确同意
- 凭据写 `workspace/<project>/.kata/auth/<project>/`，不进 feature 目录
- 任何 remediation 改动必须 emit `artifact_written { kind: 'diag-report' }` 记录
- 沉淀知识时调用 knowledge-curate（emit handoff_emitted）

Phase index 表 + Loaded by phase 表 + Output artifact (diag-report)。

- [ ] **8.4.4 写 4 phase 文件**

`§1-probe.md`：探测连通性（ping / port / TCP handshake / DNS）；输出 connectivity_matrix；不读敏感 / destructive。

`§2-diagnose.md`：基于 connectivity_matrix + symptoms 决定 hypothesis；spawn ssh-worker (sonnet/high) 收集证据；产出 hypothesis_set。

`§3-remediate.md`：对每个 hypothesis 产 remediation_step；risk classify（low/medium/high）；destructive 操作 emit `decision_made { topic: 'remediation_risk' }` ask user before exec；执行后 verify。

`§4-kb-write.md`：产 diag-report.md + emit `handoff_emitted { target: 'knowledge-curate', envelope: {...} }` 沉淀知识。

- [ ] **8.4.5 写 workers / rules / fewshot（spec §6.11：无 reviewer）**

`workers/ssh-worker.md`：envelope { target_host, hypothesis, commands_proposed, retry_violations? }；输出 { evidence_collected, observations, risk_assessment }；硬规则：不执行 destructive 除非 envelope.execution_authorized=true；不读凭据外的源。worker 内置自检 checklist 替代 reviewer（spec §6.11 单流程模型）：diag-report schema 自检 + evidence_refs ≥1 + remediation_steps 可执行。

`rules/ssh-protocol.md`（≤80 行）：从旧 references/ssh-protocol.md 蒸馏；保留：连接 protocol 顺序、destructive 命令枚举、凭据写位置。

`rules/knowledge-format.md`（≤80 行）：从旧 references/knowledge-format.md 蒸馏；保留：knowledge entry 字段、关联 diag-report 引用规则。

`fewshots/diag-playbook.md`（≤100 行）：1 个完整 playbook 样例（DB 连通失败 → probe → ssh-worker 取证 → remediate → kb-write）。

- [ ] **8.4.6 重写 workflow.yaml v2 + 删 references + 测试 + commit**

```yaml
name: infra-diagnose
version: 2
default_dispatch: inline
default_model: sonnet
default_effort: high

metadata:
  event_kinds_emitted:
    - phase_entered
    - phase_exited
    - decision_made
    - artifact_written
    - validator_failed
    - blocked
    - handoff_emitted
  artifact_kinds_produced:
    - diag-report

steps:
  - id: probe
    dispatch: inline
    blackboard_inputs: [user_input]
    blackboard_outputs: [target_host, connectivity_matrix, symptoms, source_refs]
    validators: [probe-schema]
    failure_modes: [host_unreachable, probe_blocked]

  - id: diagnose
    dispatch: subagent
    model: sonnet
    effort: high
    workers: [ssh-worker]
    blackboard_inputs: [target_host, connectivity_matrix, symptoms]
    blackboard_outputs: [hypothesis_set, evidence_collected]
    validators: [hypothesis-schema]
    failure_modes: [worker_timeout, evidence_unanchored, ssh_auth_failed]

  - id: remediate
    dispatch: inline
    blackboard_inputs: [hypothesis_set, evidence_collected, target_host]
    blackboard_outputs: [remediation_steps, remediation_results]
    validators: [remediation-schema]
    failure_modes: [destructive_unauthorized, verification_failed]

  - id: kb-write
    dispatch: inline
    blackboard_inputs: [target_host, symptoms, hypothesis_set, remediation_steps, evidence_collected, source_refs]
    blackboard_outputs: [diag_report_path, knowledge_handoff_envelopes]
    validators: [artifact-diag-report]
    failure_modes: [schema_invalid, io_error]
```

```bash
git rm -rf .claude/skills/infra-diagnose/references/
bun test engine/tests/{runtime,skills}/infra-diagnose-*
bun test engine/tests/runtime/artifact-validator.test.ts -t "diag-report"
bun run check:skills
bun test
git add .claude/skills/infra-diagnose/ .claude/contracts/workflows/infra-diagnose.yaml \
        .claude/contracts/skill-manifest.yaml \
        .claude/contracts/schemas/artifact-diag-report.json \
        engine/tests/{runtime,skills}/infra-diagnose-* \
        engine/tests/runtime/artifact-validator.test.ts
git commit -m "refactor: ✨ migrate infra-diagnose to β-lite + E backbone

- 4 phases (probe / diagnose / remediate / kb-write); no reviewers (spec §6.11 single-stream)
- diagnose worker-only subagent (sonnet/high); other phases inline
- workflow v2; new artifact-diag-report.json
- distill ssh-protocol.md + knowledge-format.md to rules (≤80 each)
- diag-playbook fewshot (≤100)
- kb-write emits handoff_emitted to knowledge-curate
"
```


## Commit 8.5: `refactor: ✨ migrate knowledge-curate to β-lite + E`

**目标:** knowledge-curate 迁 β-lite（5 phase：parse / categorize / write / spec-review / emit）；workflow.yaml v2；新增 `artifact-knowledge-entry.json`。Round-5 拆 review + Round-6 修 verdict flow：§3-write（worker only, haiku/low）只产 entry_draft 不落盘；§4-spec-review（reviewer only, haiku/low）gate 校验；§5-emit（inline）pass 后落 `workspace/<project>/.kata/knowledge/<entry_id>.md` 并 emit artifact_written。

**Files:**
- Create: `.claude/skills/knowledge-curate/phases/§1-parse.md`
- Create: `.claude/skills/knowledge-curate/phases/§2-categorize.md`
- Create: `.claude/skills/knowledge-curate/phases/§3-write.md`
- Create: `.claude/skills/knowledge-curate/phases/§4-spec-review.md`
- Create: `.claude/skills/knowledge-curate/phases/§5-emit.md`
- Create: `.claude/skills/knowledge-curate/reviewers/spec-reviewer.md`
- Create: `.claude/skills/knowledge-curate/workers/kb-worker.md`
- Create: `.claude/skills/knowledge-curate/rules/knowledge-rules.md`（从 references/knowledge-rules.md 蒸馏，≤80）
- Create: `.claude/skills/knowledge-curate/fewshots/kb-entry-sample.md`（≤100）
- Modify: `.claude/skills/knowledge-curate/SKILL.md`（45 → ≤100 行）
- Delete: `.claude/skills/knowledge-curate/references/**`
- Modify: `.claude/contracts/workflows/knowledge-curate.yaml`（v1 → v2）
- Modify: `.claude/contracts/skill-manifest.yaml`
- Create: `.claude/contracts/schemas/artifact-knowledge-entry.json`
- Create: `engine/tests/skills/knowledge-curate-shape.test.ts`
- Create: `engine/tests/runtime/knowledge-curate-phases.test.ts`

### Step 8.5.1 — Step 8.5.6

- [ ] **8.5.1 写 failing shape + phase + schema test**

shape：SKILL ≤100、5 phase ≤150、reviewer/worker ≤200、rules ≤80、fewshot ≤100。phases：`['parse', 'categorize', 'write', 'spec-review', 'emit']`。worker step `write` 是 worker-only（haiku/low）；`spec-review` 是 reviewer-only（haiku/low）；`emit` inline 落盘。create / update path 经 §3 → §4 → §5；answer path 在 §2 决策后跳到 §5 inline emit kb_answer（不写 artifact）。

- [ ] **8.5.2 创建 `artifact-knowledge-entry.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kata.dev/schemas/artifact-knowledge-entry.json",
  "title": "Knowledge Base Entry",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version", "entry_id", "category", "title", "body", "evidence_refs"],
  "properties": {
    "schema_version": { "type": "integer", "const": 1 },
    "entry_id": { "type": "string", "pattern": "^KB-\\d+$" },
    "category": { "enum": ["term", "rule", "process", "incident", "config", "ops"] },
    "title": { "type": "string", "minLength": 1, "maxLength": 200 },
    "body": { "type": "string", "minLength": 20 },
    "evidence_refs": { "type": "array", "items": { "type": "string", "pattern": "^SR-" }, "minItems": 1 },
    "tags": { "type": "array", "items": { "type": "string" } },
    "related_entries": { "type": "array", "items": { "type": "string", "pattern": "^KB-\\d+$" } }
  }
}
```

- [ ] **8.5.3 重写 SKILL.md（≤100 行）**

When to trigger：用户要求记录/查询/维护项目业务知识/规则/术语，或询问"XX 是什么"（涉及项目特定业务概念）。

Must not trigger：用户要求新建 QA 用例（→ case-draft）；要求 bug 分析（→ defect-analyze）；要求 SSH 排查（→ infra-diagnose）。

Hard rules：
- entry_id 全局自增 `KB-<n>`；不得跳号 / 复用
- 每条 entry 必有 ≥1 SourceRef
- 查询前先在现有 KB 中搜，命中相似 entry 必引用 `related_entries`
- 不重复记录：标题 + body 命中相似度 0.85 阈值视为重复，需先 ask user 是否更新现有 entry

Phase index 表 + Loaded by phase 表 + Output artifact (knowledge-entry)。

Phase index：§1-parse / §2-categorize / §3-write / §4-spec-review / §5-emit。Loaded by phase：§3 workers/kb-worker + rules/knowledge-rules + fewshots/kb-entry-sample；§4 reviewers/spec-reviewer；§5 inline（无 reviewer/worker）。

- [ ] **8.5.4 写 5 phase 文件**

`§1-parse.md`：解析用户输入（描述 / 查询 / 文档片段）→ intent ∈ { create, query, update }；输出 user_input_parsed + intent + project_context。

`§2-categorize.md`：根据 intent + 内容判 category；查询场景做 KB 检索（fuzzy match 现有 entries）；输出 category + candidate_existing_entries + decision_path（create / update / answer）。**Phase Dispatcher 路由分支**：本 phase 输出 decision_path 后，Dispatcher 按值分流：(a) `create | update` → §3-write → §4-spec-review → §5-emit；(b) `answer` → 跳过 §3 / §4，直接进 §5-emit（§5 inline 写 kb_answer，不调 worker / reviewer，不 emit artifact_written）。本分支语义由 §3-write / §4-spec-review / §5-emit 的 Hard rules 共同约束；workflow.yaml 不需新增 `condition` 字段——分支判定由 §3-write 与 §4-spec-review 的入口 Hard rules（"decision_path=answer 时跳过本 step pass-through"）显式声明，由 Phase Dispatcher 与各 phase prompt 协作执行。

`§3-write.md`（worker-only step；不落盘；仅 decision_path ∈ {create, update} 进入）：

- decision_path = create：spawn kb-worker (haiku/low) 生成 entry_draft 结构化对象（title / body / category / tags / related_entries） → 进入 §4-spec-review；不落 final file
- decision_path = update：spawn kb-worker (haiku/low) 生成 changelog patch + 更新后的 entry_draft → 进入 §4-spec-review；不落 final file
- decision_path = answer：**本 step 不被进入**——Phase Dispatcher 在 §2-categorize 决策为 answer 时直接路由到 §5-emit，跳过 §3 / §4；§5 inline 写 kb_answer 到 blackboard（emit decision_made { topic: 'kb_answer' }，无 artifact_written）

Hard rules：本 step 仅 worker 调度，不在本 step 调 reviewer；**禁止在本 step 落 final file**（落盘在 §5-emit，必须经 §4-spec-review gate）；**Phase Dispatcher 路由约束：decision_path=answer 时跳过本 step**，本 phase 文件不依赖 answer path。

`§4-spec-review.md`（reviewer-only step，create/update path 必经）：

- Goal：spec-reviewer subagent（haiku/low）lint entry_draft schema、entry_id 唯一、evidence_refs ≥1、related_entries 全部存在于 KB index
- Inputs：entry_draft、decision_path、candidate_existing_entries
- Outputs：spec_verdict ∈ {pass, fail}、spec_violations[]、spec_review_artifact_path
- Steps：1) 前置：decision_path ∈ {create, update}；answer path 跳过本 phase（直接进 §5） 2) Phase Dispatcher spawn spec-reviewer (haiku/low) 3) reviewer 跑 schema lint 4) fail → emit `validator_failed`，回 §3 重派（≤2 次）；超出 emit `blocked` 5) pass → 进入 §5-emit
- Hard rules：reviewer 不得改 entry draft；本 step 不调 worker；本 step 不落 final file
- Failure modes：schema_mismatch / entry_id_collision / related_entries_unresolved / reviewer_timeout
- Events: phase_entered/exited + subagent_dispatched/completed + decision_made(spec_verdict) + artifact_written(spec_review_artifact_path 可选) + validator_failed

`§5-emit.md`（inline only；落 final file 或 answer）：

- Goal：根据 decision_path 与 spec_verdict 决定落盘行为
- Inputs：decision_path、entry_draft、spec_verdict、user_input_parsed
- Outputs：entry_id、entry_path、kb_answer
- Steps：1) decision_path = answer → 写 kb_answer 到 blackboard，emit `decision_made { topic: 'kb_answer' }`，不 emit artifact_written 2) decision_path ∈ {create, update}：a. 前置 spec_verdict=pass，否则 §4 已阻塞不会进 §5 b. 分配 entry_id（KB-<n> 自增） c. 写 markdown 到 `workspace/<project>/.kata/knowledge/<entry_id>.md` d. emit `artifact_written { kind: 'knowledge-entry' }`
- Hard rules：仅 inline，不在本 step spawn subagent；create/update path 必须前置 spec_verdict=pass；answer path 不得落 file
- Failure modes：schema_invalid / io_error / entry_id_collision
- Events: phase_entered/exited + decision_made(kb_answer 或 entry_emit) + artifact_written（create/update 时）+ validator_failed / blocked（按需）

- [ ] **8.5.5 写 reviewers / workers / rules / fewshot**

`reviewers/spec-reviewer.md`：lint entry schema、entry_id 唯一、evidence_refs ≥1、related_entries 全部存在于 KB index。

`workers/kb-worker.md`：envelope { intent, content_seed, category, candidate_existing, source_refs }；输出 { title, body, tags, related_entries, decisions[] }。

`rules/knowledge-rules.md`（≤80 行）：从旧 references/knowledge-rules.md 蒸馏；保留：entry 字段命名 + category 枚举 + 重复判定阈值 + 关联引用规则。

`fewshots/kb-entry-sample.md`（≤100 行）：1 个完整业务术语 entry 样例（含 SourceRef + tags + related_entries）。

- [ ] **8.5.6 重写 workflow.yaml v2 + smoke 计数断言 + 删 references + 测试 + commit**

补充 `engine/tests/runtime/knowledge-curate-phases.test.ts` 末尾 smoke 形态断言（不需独立 events.smoke.test，复用 phases test 的 fake-orchestrator 轻量 smoke）：

```typescript
test('create path emits 5 phase_entered + 2 subagent_dispatched (write + spec-review)', async () => {
  const result = await runWorkflowFixture({
    workflow: 'knowledge-curate',
    fixture: 'engine/tests/fixtures/knowledge-curate-create-path.json',
    workspaceRoot,
  })
  const events = readFileSync(result.eventsPath, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  const enteredPhases = events.filter((e) => e.event_kind === 'phase_entered').map((e) => e.phase)
  expect(enteredPhases).toEqual(['parse', 'categorize', 'write', 'spec-review', 'emit'])
  expect(events.filter((e) => e.event_kind === 'subagent_dispatched').length).toBe(2)
  expect(events.filter((e) => e.event_kind === 'artifact_written').length).toBe(1)
})

test('answer path skips §3 / §4 (3 phase_entered only)', async () => {
  const result = await runWorkflowFixture({
    workflow: 'knowledge-curate',
    fixture: 'engine/tests/fixtures/knowledge-curate-answer-path.json',
    workspaceRoot,
  })
  const events = readFileSync(result.eventsPath, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  const enteredPhases = events.filter((e) => e.event_kind === 'phase_entered').map((e) => e.phase)
  expect(enteredPhases).toEqual(['parse', 'categorize', 'emit'])
  expect(events.filter((e) => e.event_kind === 'subagent_dispatched').length).toBe(0)
  expect(events.filter((e) => e.event_kind === 'artifact_written').length).toBe(0)
  expect(events.some((e) => e.event_kind === 'decision_made' && e.payload?.topic === 'kb_answer')).toBe(true)
})
```

新建 2 个 fixture：`engine/tests/fixtures/knowledge-curate-create-path.json`（含 decision_path=create + 完整 entry_draft）、`engine/tests/fixtures/knowledge-curate-answer-path.json`（含 decision_path=answer + 简单 kb_answer 内容）。fake-orchestrator 需识别 decision_path 决策跳过 §3 / §4。

```yaml
name: knowledge-curate
version: 2
default_dispatch: inline
default_model: haiku
default_effort: low

metadata:
  event_kinds_emitted:
    - phase_entered
    - phase_exited
    - decision_made
    - artifact_written
    - validator_failed
    - blocked
  artifact_kinds_produced:
    - knowledge-entry

steps:
  - id: parse
    dispatch: inline
    blackboard_inputs: [user_input]
    blackboard_outputs: [intent, user_input_parsed, project_context, source_refs]
    validators: [intent-schema]
    failure_modes: [intent_ambiguous]

  - id: categorize
    dispatch: inline
    blackboard_inputs: [intent, user_input_parsed, project_context]
    blackboard_outputs: [category, candidate_existing_entries, decision_path]
    validators: [categorize-schema]
    failure_modes: [duplicate_threshold_exceeded]

  - id: write
    dispatch: subagent
    model: haiku
    effort: low
    workers: [kb-worker]
    blackboard_inputs: [intent, decision_path, category, candidate_existing_entries, source_refs, user_input_parsed]
    blackboard_outputs: [entry_draft]
    failure_modes: [worker_timeout]

  - id: spec-review
    dispatch: subagent
    model: haiku
    effort: low
    reviewers: [spec-reviewer]
    blackboard_inputs: [entry_draft, decision_path, candidate_existing_entries]
    blackboard_outputs: [spec_verdict, spec_violations, spec_review_artifact_path]
    validators: [knowledge-entry-schema, entry-id-unique, related-entries-resolved]
    failure_modes: [schema_mismatch, entry_id_collision, related_entries_unresolved, reviewer_timeout]

  - id: emit
    dispatch: inline
    blackboard_inputs: [decision_path, entry_draft, spec_verdict, user_input_parsed]
    blackboard_outputs: [entry_id, entry_path, kb_answer]
    validators: [artifact-knowledge-entry]
    failure_modes: [schema_invalid, io_error, entry_id_collision]
```

```bash
git rm -rf .claude/skills/knowledge-curate/references/
bun test engine/tests/{runtime,skills}/knowledge-curate-*
bun test engine/tests/runtime/artifact-validator.test.ts -t "knowledge-entry"
bun run check:skills
bun test
git add .claude/skills/knowledge-curate/ .claude/contracts/workflows/knowledge-curate.yaml \
        .claude/contracts/skill-manifest.yaml \
        .claude/contracts/schemas/artifact-knowledge-entry.json \
        engine/tests/{runtime,skills}/knowledge-curate-* \
        engine/tests/runtime/artifact-validator.test.ts
git commit -m "refactor: ✨ migrate knowledge-curate to β-lite + E backbone

- 5 phases (parse / categorize / write / spec-review / emit)
- write worker-only (haiku/low) produces entry_draft only; spec-review reviewer-only (haiku/low) gates; emit inline persists final file after spec_verdict=pass
- workflow v2; default_model=haiku, default_effort=low (I/O-dominant)
- new artifact-knowledge-entry.json
- decision_path: create / update / answer (answer path skips §4 spec-review and §5 emits kb_answer without artifact_written)
"
```

---

## Commit 8.6: `refactor: ✨ migrate workspace-manage to β-lite + E`

**目标:** workspace-manage 迁 β-lite（2 phase：inspect / render，无 reviewer/worker）；workflow.yaml v2；新增 `artifact-workspace-render.json`。

**Files:**
- Create: `.claude/skills/workspace-manage/phases/§1-inspect.md`
- Create: `.claude/skills/workspace-manage/phases/§2-render.md`
- Create: `.claude/skills/workspace-manage/rules/project-layout.md`（从 references/project-layout.md 蒸馏，≤80 行）
- Create: `.claude/skills/workspace-manage/fewshots/menu-sample.md`（≤100 行）
- Modify: `.claude/skills/workspace-manage/SKILL.md`（47 → ≤100 行）
- Delete: `.claude/skills/workspace-manage/references/**`
- Modify: `.claude/contracts/workflows/workspace-manage.yaml`（v1 → v2）
- Modify: `.claude/contracts/skill-manifest.yaml`
- Create: `.claude/contracts/schemas/artifact-workspace-render.json`
- Create: `engine/tests/skills/workspace-manage-shape.test.ts`
- Create: `engine/tests/runtime/workspace-manage-phases.test.ts`

注：spec §6.7 表中 workspace-manage 没 reviewer / worker；纯 inline 操作。

### Step 8.6.1 — Step 8.6.5

- [ ] **8.6.1 写 failing tests**

shape：SKILL ≤100、2 phase ≤150、rules ≤80、fewshot ≤100；**确认无 reviewers/ 与 workers/ 目录（test 应断言不存在）**。phases：`['inspect', 'render']`。

```typescript
test('no reviewers/ or workers/ directory', () => {
  expect(existsSync('.claude/skills/workspace-manage/reviewers')).toBe(false)
  expect(existsSync('.claude/skills/workspace-manage/workers')).toBe(false)
})
```

- [ ] **8.6.2 创建 `artifact-workspace-render.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kata.dev/schemas/artifact-workspace-render.json",
  "title": "Workspace Render Output",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version", "project", "rendered_at", "menu_items"],
  "properties": {
    "schema_version": { "type": "integer", "const": 1 },
    "project": { "type": "string" },
    "rendered_at": { "type": "string", "format": "date-time" },
    "menu_items": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["command", "skill", "summary"],
        "properties": {
          "command": { "type": "string", "pattern": "^/[a-z-]+$" },
          "skill": { "type": "string" },
          "summary": { "type": "string", "maxLength": 200 }
        }
      }
    },
    "feature_summary": {
      "type": "object",
      "properties": {
        "total_features": { "type": "integer" },
        "by_status": { "type": "object" }
      }
    }
  }
}
```

- [ ] **8.6.3 重写 SKILL.md（≤100 行）**

When to trigger：用户输入 `/workspace-manage` 或要求查看 kata 功能菜单 / 当前 workspace 状态。

Must not trigger：用户具体操作 feature / archive（→ 对应 case-* skill）。

Hard rules：
- 仅渲染（read-only），不创建 / 修改 feature
- menu_items 必须 = manifest.yaml entries 且 user_invocable=true 的全集
- 输出可选 markdown / JSON / 终端 ASCII；JSON 模式必通过 artifact schema

Phase index：§1-inspect / §2-render。Loaded by phase 表（仅 rules + fewshot）。Output artifact: workspace-render。

- [ ] **8.6.4 写 2 phase 文件**

`§1-inspect.md`：读 `skill-manifest.yaml`、扫 `workspace/<project>/features/` 计 features 数、读 `.kata/` runtime 状态；输出 inspection_report + project + skill_list + feature_summary。

`§2-render.md`：按用户请求格式（默认 markdown 终端样式）组装 menu_items 并落 `.claude/skills/workspace-manage/menu.md` 或 stdout；如用户请求 JSON 输出，落 artifact + emit `artifact_written { kind: 'workspace-render' }`。

- [ ] **8.6.5 重写 workflow.yaml v2 + rules/fewshot + 删 references + 测试 + commit**

```yaml
name: workspace-manage
version: 2
default_dispatch: inline
default_model: haiku
default_effort: low

metadata:
  event_kinds_emitted:
    - phase_entered
    - phase_exited
    - decision_made
    - artifact_written
    - validator_failed
    - blocked
  artifact_kinds_produced:
    - workspace-render

steps:
  - id: inspect
    dispatch: inline
    blackboard_inputs: [user_input]
    blackboard_outputs: [inspection_report, project, skill_list, feature_summary]
    validators: [inspect-schema]
    failure_modes: [manifest_unreadable]

  - id: render
    dispatch: inline
    blackboard_inputs: [inspection_report, project, skill_list, feature_summary, user_input]
    blackboard_outputs: [render_path, render_format]
    validators: [artifact-workspace-render]
    failure_modes: [schema_invalid, io_error]
```

`rules/project-layout.md`（≤80 行）：从旧 references/project-layout.md 蒸馏；保留 workspace 目录结构定义、约定字段命名、只读 / 可写边界。

`fewshots/menu-sample.md`（≤100 行）：1 个标准 menu 渲染样例（markdown + JSON 两份输出对照）。

```bash
git rm -rf .claude/skills/workspace-manage/references/
bun test engine/tests/{runtime,skills}/workspace-manage-*
bun test engine/tests/runtime/artifact-validator.test.ts -t "workspace-render"
bun run check:skills
bun test
git add .claude/skills/workspace-manage/ .claude/contracts/workflows/workspace-manage.yaml \
        .claude/contracts/skill-manifest.yaml \
        .claude/contracts/schemas/artifact-workspace-render.json \
        engine/tests/{runtime,skills}/workspace-manage-* \
        engine/tests/runtime/artifact-validator.test.ts
git commit -m "refactor: ✨ migrate workspace-manage to β-lite + E backbone

- 2 phases (inspect / render); no reviewers/workers (catalog only)
- workflow v2; default_model=haiku, default_effort=low
- new artifact-workspace-render.json
- menu_items derived from skill-manifest.yaml user_invocable entries
"
```

---

## Commit 8.7: `refactor: ✨ migrate playwright-automation to β-lite + E`

**目标:** playwright-automation 迁 β-lite（8 phase：preflight / probe / generate / spec-review / run / repair / quality / handoff）；workflow.yaml v2 with **per-phase model**（spec §6.10）；16 个旧 references 文件按 6 类重分配到 phases / workers / reviewers / rules / fewshots；新增 `artifact-playwright-suite.json`；**mock-runner smoke** 验证 events.jsonl 形态（不实跑 `bunx playwright test`；真实运行交付 CI-level test）。SKILL.md 与 §5-run phase 文件保留"真跑（不允许 mock）"硬规则用于生产场景，与本 P3 smoke 范围相互独立。Round-5 拆 review：§3-generate（worker only, sonnet/high）+ §4-spec-review（reviewer only, haiku/low）；其余 phase 顺移 +1。

**Files:**
- Create: `.claude/skills/playwright-automation/phases/§1-preflight.md`（≤150）
- Create: `.claude/skills/playwright-automation/phases/§2-probe.md`
- Create: `.claude/skills/playwright-automation/phases/§3-generate.md`
- Create: `.claude/skills/playwright-automation/phases/§4-spec-review.md`
- Create: `.claude/skills/playwright-automation/phases/§5-run.md`
- Create: `.claude/skills/playwright-automation/phases/§6-repair.md`
- Create: `.claude/skills/playwright-automation/phases/§7-quality.md`
- Create: `.claude/skills/playwright-automation/phases/§8-handoff.md`
- Create: `.claude/skills/playwright-automation/reviewers/spec-reviewer.md`（≤200，从 references/spec-reviewer-prompt.md）
- Create: `.claude/skills/playwright-automation/reviewers/quality-reviewer.md`（≤200，从 references/quality-reviewer-prompt.md + references/quality-gate.md）
- Create: `.claude/skills/playwright-automation/workers/playwright-worker.md`（≤200，从 references/worker-prompt.md + references/playwright-generate.md）
- Create: `.claude/skills/playwright-automation/rules/env-preflight.md`（≤80，env 变量枚举 + 缺失协议）
- Create: `.claude/skills/playwright-automation/rules/tool-denial.md`（≤80，工具拒绝哨兵 + 静默边界 + mtime 命令限制）
- Create: `.claude/skills/playwright-automation/rules/auth-session.md`（≤80，.auth/ session 复用规则）
- Create: `.claude/skills/playwright-automation/rules/evidence-dir.md`（≤80，run-id + traces / screenshots / video 落 evidence dir 规则）
- Create: `.claude/skills/playwright-automation/rules/case-feedback.md`（≤80，从 references/case-feedback.md 蒸馏）
- Create: `.claude/skills/playwright-automation/rules/execution-protocol.md`（≤80，从 references/execution-protocol.md + references/self-run.md 蒸馏）
- Create: `.claude/skills/playwright-automation/rules/repair-loop.md`（≤80，从 references/repair-loop.md + references/run-triage.md 蒸馏）
- Create: `.claude/skills/playwright-automation/fewshots/self-run-sample.md`（≤100）
- Create: `.claude/skills/playwright-automation/fewshots/probe-sample.md`（≤100，从 references/ui-probe.md）
- Modify: `.claude/skills/playwright-automation/SKILL.md`（81 → ≤100 行）
- Delete: `.claude/skills/playwright-automation/references/**`
- Modify: `.claude/contracts/workflows/playwright-automation.yaml`（v1 → v2 + per-phase model）
- Modify: `.claude/contracts/skill-manifest.yaml`
- Create: `.claude/contracts/schemas/artifact-playwright-suite.json`
- Create: `engine/tests/skills/playwright-automation-shape.test.ts`
- Create: `engine/tests/runtime/playwright-automation-phases.test.ts`
- Create: `engine/tests/runtime/playwright-automation-events.smoke.test.ts`
- Create: `engine/tests/fixtures/playwright-automation-happy.json`

注：16 个 references 重分配映射：
| 旧 reference | 新位置 |
|---|---|
| spec-reviewer-prompt.md | reviewers/spec-reviewer.md |
| quality-reviewer-prompt.md + quality-gate.md | reviewers/quality-reviewer.md（合并）|
| worker-prompt.md + playwright-generate.md | workers/playwright-worker.md（合并）|
| env-preflight.md | rules/env-preflight.md（蒸馏）|
| case-feedback.md | rules/case-feedback.md（蒸馏）|
| execution-protocol.md + self-run.md | rules/execution-protocol.md（合并蒸馏）|
| repair-loop.md + run-triage.md | rules/repair-loop.md（合并蒸馏）|
| ui-probe.md | fewshots/probe-sample.md + 嵌 §2-probe.md |
| ui-plan.md | 嵌 §1-preflight.md（lint plan-spec 一致性）|
| plan-reconcile.md | 嵌 §1-preflight.md（plan ↔ feature mapping）|
| handoff.md | 嵌 §8-handoff.md |
| case-normalize.md | 嵌 §3-generate.md（用例归一化协议）|

### Step 8.7.1 — Step 8.7.10

- [ ] **8.7.1 写 failing shape + phase + schema + smoke**

shape：SKILL ≤100、8 phase ≤150、2 reviewers + 1 worker ≤200、**7 rules** ≤80（env-preflight / tool-denial / auth-session / evidence-dir / case-feedback / execution-protocol / repair-loop）、2 fewshots ≤100。test.each 必须列出全部 7 个 rules 文件，逐一断言 ≤80 行。

phase test：`['preflight', 'probe', 'generate', 'spec-review', 'run', 'repair', 'quality', 'handoff']`；per-phase model 校验（spec §6.10 + Round-5 spec-review 拆分）：

```typescript
test('per-phase models match spec §6.10 + spec-review split', () => {
  const wf = parseWorkflow(readFileSync('.claude/contracts/workflows/playwright-automation.yaml', 'utf8'))
  const byId = Object.fromEntries(wf.steps.map((s) => [s.id, s]))

  // §3-generate is worker-only (no reviewer in same step)
  expect(byId['generate'].dispatch).toBe('subagent')
  expect(byId['generate'].model).toBe('sonnet')
  expect(byId['generate'].effort).toBe('high')
  expect(byId['generate'].workers).toEqual(['playwright-worker'])
  expect(byId['generate'].reviewers ?? []).toEqual([])

  // §4-spec-review is reviewer-only (haiku/low, runs after generate)
  expect(byId['spec-review'].dispatch).toBe('subagent')
  expect(byId['spec-review'].model).toBe('haiku')
  expect(byId['spec-review'].effort).toBe('low')
  expect(byId['spec-review'].workers ?? []).toEqual([])
  expect(byId['spec-review'].reviewers).toEqual(['spec-reviewer'])

  // §6-repair worker-only
  expect(byId['repair'].dispatch).toBe('subagent')
  expect(byId['repair'].model).toBe('sonnet')
  expect(byId['repair'].effort).toBe('high')
  expect(byId['repair'].workers).toEqual(['playwright-worker'])
  expect(byId['repair'].reviewers ?? []).toEqual([])

  // §7-quality reviewer-only (already split in v1 plan)
  expect(byId['quality'].dispatch).toBe('subagent')
  expect(byId['quality'].model).toBe('haiku')
  expect(byId['quality'].effort).toBe('low')
  expect(byId['quality'].workers ?? []).toEqual([])
  expect(byId['quality'].reviewers).toEqual(['quality-reviewer'])

  expect(byId['preflight'].dispatch).toBe('inline')
  expect(byId['probe'].dispatch).toBe('inline')
  expect(byId['run'].dispatch).toBe('inline')
  expect(byId['handoff'].dispatch).toBe('inline')
})
```

smoke：`playwright-automation-events.smoke.test.ts` 类似 case-draft smoke，校验 happy path 触发 8 phase_entered/exited + 4 subagent_dispatched（generate / spec-review / repair / quality）+ ≥1 artifact_written（playwright-suite）。

- [ ] **8.7.2 创建 `artifact-playwright-suite.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kata.dev/schemas/artifact-playwright-suite.json",
  "title": "Playwright Test Suite",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version", "feature_id", "spec_files", "fixtures", "run_status"],
  "properties": {
    "schema_version": { "type": "integer", "const": 1 },
    "feature_id": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{3}$" },
    "spec_files": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["path", "case_ids"],
        "properties": {
          "path": { "type": "string" },
          "case_ids": { "type": "array", "items": { "type": "string", "pattern": "^C\\d+$" }, "minItems": 1 }
        }
      }
    },
    "fixtures": {
      "type": "object",
      "properties": {
        "auth": { "type": "string" },
        "data": { "type": "array", "items": { "type": "string" } }
      }
    },
    "run_status": {
      "type": "object",
      "required": ["last_run_at", "passed", "failed", "skipped"],
      "properties": {
        "last_run_at": { "type": "string", "format": "date-time" },
        "passed": { "type": "integer", "minimum": 0 },
        "failed": { "type": "integer", "minimum": 0 },
        "skipped": { "type": "integer", "minimum": 0 },
        "trace_paths": { "type": "array", "items": { "type": "string" } }
      }
    },
    "quality_verdict": {
      "type": "object",
      "properties": {
        "pass": { "type": "boolean" },
        "violations": { "type": "array" }
      }
    }
  }
}
```

- [ ] **8.7.3 重写 SKILL.md（≤100 行）**

Frontmatter：context: fork / agent: general-purpose / argument-hint: `<archive-path | feature-id>` / model: sonnet / effort: high / paths 含 _shared/ + `workspace/**` + 4 个 schema。

Body：

- When to trigger：用户给 archive 路径或 feature ID 要求生成 / 修复 / 验证 Playwright UI 自动化
- Must not trigger：用户未生成 archive（→ case-draft）；要求 SSH 排查（→ infra-diagnose）；要求基于 bug ID 生成回归用例（→ case-hotfix）
- Hard rules（spec §6.7 + spec §6.10 共识）：
  - 环境参数缺失时按 SKILL 内置 env-preflight 协议确认后再发现 / 预检 / 浏览器操作
  - 生成前必须先 probe + plan-reconcile（archive ↔ UI 一致性）
  - run 必须真实跑（headed 或 headless），不得"假装跑过"
  - repair loop ≤3 轮；超出 emit `blocked { reason: 'repair_exhausted' }`
  - quality gate：必须有 trace artifacts；coverage ≥ archive case_ids 的 90%
  - handoff 前必须 emit `artifact_written { kind: 'playwright-suite' }` 记录最终状态
- Phase index 8 行表（Round-5：§4-spec-review 拆出）
- Loaded by phase 表（8 phase × {reviewer, worker, rules, fewshots}）
- Output artifact: playwright-suite

- [ ] **8.7.4 写 8 phase 文件**

`§1-preflight.md`（≤150）：

- Goal：环境确认（KATA_TARGET_ENV / browser path / auth session）+ archive parsing + plan-reconcile（archive case → UI 路径映射）
- Inputs：user_input、archive_path（必填）
- Outputs：env_config、target_env、archive_cases、plan_mapping
- Steps：1) 调 rules/env-preflight 协议询问缺失 env 2) 读 archive 解析 case_index 3) 跑 plan-reconcile：把每条 case 映射到 UI 路径（urls / selectors / 表单字段 baseline）
- Hard rules：env 缺失时 ask user；archive 无法解析 emit blocked；plan_mapping 必须覆盖所有 case_ids（缺 emit `validator_failed { validator: 'plan-coverage' }`）
- Failure modes：env_missing / archive_unparseable / plan_coverage_gap
- Events: phase_entered/exited + decision_made(env_select) + validator_failed + blocked

`§2-probe.md`（≤150）：

- Goal：登录目标环境，探测 UI selectors / 表单结构 / 关键交互
- Inputs：env_config、target_env、plan_mapping
- Outputs：ui_baseline（selectors + form fields + 关键 element snapshot）、probe_evidence
- Steps：1) 复用 `.auth/` 已有 session 或 ask user 登录 2) 按 plan_mapping 访问每个 url 3) 抓 DOM snapshot + form baseline → probe_evidence
- Hard rules：先扫 `.auth/<project>/session-<env>.json`；缺失才走登录流程；不得 destructive 操作（提交表单 / 删数据）
- Failure modes：auth_required / probe_blocked / element_not_found
- Events: phase_entered/exited + decision_made(session_reuse) + validator_failed

`§3-generate.md`（≤150，worker-only step）：

- Goal：spawn playwright-worker（sonnet/high）按 ui_baseline + archive_cases 生成 spec files；spec-review 在 §4 独立 step
- Inputs：archive_cases、ui_baseline、plan_mapping、env_config、retry_violations?
- Outputs：spec_files、fixtures、case_normalize_log
- Steps：1) Phase Dispatcher spawn playwright-worker 2) worker 按 `rules/case-feedback.md` 归一化 case（步骤标准化为 click/fill/expect）3) 生成 spec.ts + fixtures.ts
- Hard rules：每条 spec 必须 link case_id 注释；不引入 baseline 外字段；fixtures 用 envelope.fixtures_seed；本 step 不调 reviewer
- Failure modes：worker_timeout / selector_unresolvable / case_uncovered

`§4-spec-review.md`（≤150，reviewer-only step）：

- Goal：spec-reviewer subagent（haiku/low）lint §3-generate 输出
- Inputs：spec_files、fixtures、archive_cases、ui_baseline、case_normalize_log
- Outputs：spec_verdict ∈ {pass, fail}、spec_violations[]、spec_review_artifact_path
- Steps：1) Phase Dispatcher spawn spec-reviewer (haiku/low) 2) lint checklist：selectors 不空 / case_ids 全覆盖 / 不引用 baseline 外字段 / 每条 spec 有 case_id 注释 3) fail → emit `validator_failed`，回 §3 重派（≤2 次） 4) pass → 进入 §5-run
- Hard rules：reviewer 不得改 spec content；本 step 不调 worker
- Failure modes：selector_empty / case_uncovered / annotation_missing / reviewer_timeout
- Events: phase_entered/exited + subagent_dispatched/completed + decision_made(spec_verdict) + artifact_written(spec_review_artifact_path 可选) + validator_failed

`§5-run.md`（≤150）：

- Goal：实际跑 `bunx playwright test`（headed for debug / headless for ci），收集 results + traces
- Inputs：spec_files、fixtures、env_config、spec_verdict（必须 = pass，否则 §4 已阻塞）
- Outputs：run_status（passed / failed / skipped）、failure_artifacts（traces / screenshots / video）
- Steps：1) 前置校验 spec_verdict=pass 2) 起 playwright runner 3) collect json reporter 4) 失败 case → 抓 trace 落 `workspace/<project>/.kata/playwright-traces/<run_id>/<case_id>.zip`
- Hard rules：spec_verdict 不为 pass 不得启动 runner；真跑（不允许 mock）；失败必抓 trace；timeout 默认 30s 不可禁用
- Failure modes：spec_verdict_missing / runner_crash / no_browser / trace_collection_failed
- Events: phase_entered/exited + decision_made(headed_or_headless) + decision_made(trace_collected, payload: { case_id, trace_path }) × N（trace 不进 artifact_kinds_produced）

`§6-repair.md`（≤150，worker-only step）：

- Goal：spawn playwright-worker（sonnet/high）按 failure_artifacts 修 spec_files
- Inputs：spec_files、failure_artifacts、run_status、ui_baseline、retry_violations?
- Outputs：spec_files（patched）、repair_log、repair_attempt_count
- Steps：1) 按 `rules/repair-loop.md` 分类失败原因（selector_stale / fixture_drift / assertion_wrong / app_bug）2) selector_stale / fixture_drift → repair；assertion_wrong → 触发 case-feedback 上报 case-edit；app_bug → emit `handoff_emitted { target: 'defect-analyze' }` 3) 重跑 §5-run
- Hard rules：repair ≤3 轮；每轮必须新 commit-able patch；app_bug 不在本 skill 修复范围；本 step 不调 reviewer（quality 在 §7 独立 step）
- Failure modes：repair_exhausted / unmappable_failure
- Events: phase_entered/exited + subagent_dispatched/completed + decision_made(repair_classify) + handoff_emitted（按需）

`§7-quality.md`（≤150，reviewer-only step）：

- Goal：quality-reviewer（haiku/low）终审：coverage / trace 完整性 / 不读 baseline 外字段
- Inputs：spec_files、run_status、failure_artifacts、ui_baseline、archive_cases
- Outputs：quality_verdict、quality_violations
- Steps：1) coverage = covered_case_ids / archive_case_ids ≥ 0.9 2) trace 覆盖所有失败 case 3) spec 注释完整（每条 spec 有 case_id 注释）
- Hard rules：coverage <0.9 → emit `validator_failed`，回 §3；coverage gate 不过禁止 handoff；本 step 不调 worker
- Failure modes：coverage_gap / trace_missing / annotation_missing

`§8-handoff.md`（≤150）：

- Goal：装配 `artifact-playwright-suite` artifact 落盘，emit handoff（如有用户要求生成 PR 或 CI integration）
- Inputs：spec_files、fixtures、run_status、quality_verdict、archive_path
- Outputs：playwright_suite_path
- Steps：1) 装配 schema instance 2) artifact-validator 跑 schema 3) 写 `workspace/<project>/features/<feature>/playwright-suite.md` 4) emit `handoff_emitted` 如用户要求 CI / PR
- Hard rules：仅 inline，不在本 step spawn subagent；schema 不通过禁止 final；quality gate 必通过
- Failure modes：schema_invalid / io_error

- [ ] **8.7.5 写 reviewers / workers / rules / fewshots（重分配 16 references）**

按上表执行；每个新文件遵守长度上限。具体：

- `reviewers/spec-reviewer.md`（≤200）：合并旧 spec-reviewer-prompt.md 全部 lint checklist；§4-spec-review step 引用本 reviewer（lint §3-generate 输出）
- `reviewers/quality-reviewer.md`（≤200）：合并 quality-reviewer-prompt.md + quality-gate.md；保留 coverage 计算公式 + trace 完整性判定
- `workers/playwright-worker.md`（≤200）：合并 worker-prompt.md + playwright-generate.md；envelope 协议 + case → spec 映射 + repair patch 输出格式
- `rules/env-preflight.md`（≤80）：env 变量枚举 + 缺失协议
- `rules/tool-denial.md`（≤80）：工具拒绝哨兵（哪些命令不允许）+ 静默边界（什么阶段保持静默）+ mtime 命令限制
- `rules/auth-session.md`（≤80）：`.auth/<project>/session-<env>.json` 复用顺序 + 失效后 fallback 登录流程
- `rules/evidence-dir.md`（≤80）：`workspace/<project>/.kata/playwright-traces/<run_id>/` 命名 + traces / screenshots / video 落位约束
- `rules/case-feedback.md`（≤80）：case 异常时反馈 case-edit 的 envelope 协议
- `rules/execution-protocol.md`（≤80）：合并 execution-protocol.md + self-run.md；headed/headless 选择 + trace collection 约束
- `rules/repair-loop.md`（≤80）：合并 repair-loop.md + run-triage.md；4 类失败分类 + 各类 routing
- `fewshots/self-run-sample.md`（≤100）：端到端 happy path 样例（preflight → probe → generate → run → quality → handoff）
- `fewshots/probe-sample.md`（≤100，从 ui-probe.md）：1 个完整 probe 步骤 + ui_baseline 输出样例

- [ ] **8.7.6 重写 `workflows/playwright-automation.yaml` v2 + per-phase model**

```yaml
name: playwright-automation
version: 2
default_dispatch: inline
default_model: sonnet
default_effort: high

metadata:
  event_kinds_emitted:
    - phase_entered
    - phase_exited
    - decision_made
    - artifact_written
    - validator_failed
    - blocked
    - handoff_emitted
  artifact_kinds_produced:
    - playwright-suite

steps:
  - id: preflight
    dispatch: inline
    blackboard_inputs: [user_input, archive_path]
    blackboard_outputs: [env_config, target_env, archive_cases, plan_mapping]
    validators: [plan-coverage]
    failure_modes: [env_missing, archive_unparseable, plan_coverage_gap]

  - id: probe
    dispatch: inline
    blackboard_inputs: [env_config, target_env, plan_mapping]
    blackboard_outputs: [ui_baseline, probe_evidence]
    failure_modes: [auth_required, probe_blocked, element_not_found]

  - id: generate
    dispatch: subagent
    model: sonnet
    effort: high
    workers: [playwright-worker]
    blackboard_inputs: [archive_cases, ui_baseline, plan_mapping, env_config]
    blackboard_outputs: [spec_files, fixtures, case_normalize_log]
    failure_modes: [worker_timeout, selector_unresolvable, case_uncovered]

  - id: spec-review
    dispatch: subagent
    model: haiku
    effort: low
    reviewers: [spec-reviewer]
    blackboard_inputs: [spec_files, fixtures, archive_cases, ui_baseline, case_normalize_log]
    blackboard_outputs: [spec_verdict, spec_violations, spec_review_artifact_path]
    validators: [spec-schema, selector-resolvable, case-coverage]
    failure_modes: [selector_empty, case_uncovered, annotation_missing, reviewer_timeout]

  - id: run
    dispatch: inline
    blackboard_inputs: [spec_files, fixtures, env_config, spec_verdict]
    blackboard_outputs: [run_status, failure_artifacts]
    failure_modes: [runner_crash, no_browser, trace_collection_failed]

  - id: repair
    dispatch: subagent
    model: sonnet
    effort: high
    workers: [playwright-worker]
    blackboard_inputs: [spec_files, failure_artifacts, run_status, ui_baseline]
    blackboard_outputs: [spec_files, repair_log, repair_attempt_count]
    validators: [repair-patch-schema]
    failure_modes: [repair_exhausted, unmappable_failure]

  - id: quality
    dispatch: subagent
    model: haiku
    effort: low
    reviewers: [quality-reviewer]
    blackboard_inputs: [spec_files, run_status, failure_artifacts, ui_baseline, archive_cases]
    blackboard_outputs: [quality_verdict, quality_violations]
    validators: [quality-gate]
    failure_modes: [coverage_gap, trace_missing, annotation_missing]

  - id: handoff
    dispatch: inline
    blackboard_inputs: [spec_files, fixtures, run_status, quality_verdict, archive_path]
    blackboard_outputs: [playwright_suite_path, handoff_envelopes]
    validators: [artifact-playwright-suite]
    failure_modes: [schema_invalid, io_error]
```

- [ ] **8.7.7 删 references + 更新 manifest**

```bash
git rm -rf .claude/skills/playwright-automation/references/
# manifest 更新 8 phase 索引（preflight / probe / generate / spec-review / run / repair / quality / handoff）+ 1 artifact entry
```

- [ ] **8.7.8 写 mock-runner fake-orchestrator smoke test**

`engine/tests/runtime/playwright-automation-events.smoke.test.ts` + fixture `playwright-automation-happy.json`：mock 8 phase 全过路径，validate events.jsonl：
- phase_entered × 8 + phase_exited × 8（preflight / probe / generate / spec-review / run / repair / quality / handoff）
- subagent_dispatched = 4（generate + spec-review + repair + quality）
- decision_made(trace_collected) × N + artifact_written(playwright-suite) × 1（trace 不计 artifact_written）
- decision_made: env_select / spec_verdict / repair_classify / quality_verdict

注：smoke fixture 不实跑 `bunx playwright test`；§5-run 用 fixture 注入 run_status；真实 playwright 跑放后续单独 CI 任务（P6 metric snapshot 或独立 task）。

- [ ] **8.7.9 跑全测**

```bash
bun test engine/tests/{runtime,skills}/playwright-automation-*
bun test engine/tests/runtime/artifact-validator.test.ts -t "playwright-suite"
bun run check:skills
bun test
bun run check
```

Expected: all green。

- [ ] **8.7.10 Commit 8.7**

```bash
git add .claude/skills/playwright-automation/ \
        .claude/contracts/workflows/playwright-automation.yaml \
        .claude/contracts/skill-manifest.yaml \
        .claude/contracts/schemas/artifact-playwright-suite.json \
        engine/tests/{runtime,skills}/playwright-automation-* \
        engine/tests/fixtures/playwright-automation-*.json \
        engine/tests/runtime/artifact-validator.test.ts
git commit -m "refactor: ✨ migrate playwright-automation to β-lite + E backbone

- 8 phases (preflight / probe / generate / spec-review / run / repair / quality / handoff)
- per-phase model (spec §6.10 + Round-5 split): generate worker-only sonnet/high, spec-review reviewer-only haiku/low, repair worker-only sonnet/high, quality reviewer-only haiku/low
- workflow v2; 16 old references redistributed to phases/reviewers/workers/rules/fewshots
- new artifact-playwright-suite.json
- smoke test mocks runner (real playwright run kept for CI-level test)
- §6-repair classifies failures; app_bug routes to defect-analyze via handoff
"
```


---

## P3 总自审（Self-Review）

写完 8 个 commit 后，按下列 checklist 逐项核对：

### 1. 8 skill 全部覆盖

- [ ] case-draft（Commit 7）—— 6 phase（source-intake / atomize / draft / spec-review / quality-review / output）/ archive+xmind+metadata+manifest
- [ ] defect-analyze（Commit 8.1）—— 6 phase（intake / classify / analyze / spec-review / quality-review / emit）/ by_mode / defect-report+conflict-resolution-plan
- [ ] case-edit（Commit 8.2）—— 5 phase（parse / diff / apply / spec-review / emit）/ archive+xmind+manifest
- [ ] case-hotfix（Commit 8.3）—— 5 phase（bug-parse / scope / draft / spec-review / output）/ hotfix-case-bundle
- [ ] infra-diagnose（Commit 8.4）—— 4 phase（probe / diagnose / remediate / kb-write）/ no reviewers（spec §6.11 single-stream）/ diag-report
- [ ] knowledge-curate（Commit 8.5）—— 5 phase（parse / categorize / write / spec-review / emit）/ knowledge-entry
- [ ] workspace-manage（Commit 8.6）—— 2 phase（inspect / render）/ workspace-render
- [ ] playwright-automation（Commit 8.7）—— 8 phase（preflight / probe / generate / spec-review / run / repair / quality / handoff）/ playwright-suite

### 2. 旧 skill 全部清理

- [ ] `.claude/skills/bug-file/` 已删
- [ ] `.claude/skills/conflict-analyze/` 已删
- [ ] `.claude/skills/diff-scan/` 已删
- [ ] 每个迁移 skill 的 `references/` 整目录已删
- [ ] 每个迁移 skill 的 `rules/case-qa.md` 已确认 P1#5 移到 `_shared/`，重复项已删

### 3. spec §6 全部要求落地

- [ ] §6.1 frontmatter `argument-hint` 已加 Claude allowlist
- [ ] §6.1 字段不进 frontmatter 的（`event_kinds_emitted`、`artifact_kinds_produced`）全部下沉到 `workflow.yaml metadata`
- [ ] §6.2 SKILL.md 全 ≤100 行（lint enforced via shape test）
- [ ] §6.3 phase 文件全 ≤150 行
- [ ] §6.4 reviewer / worker / rule / fewshot 长度上限全 enforced
- [ ] §6.5 命名 kebab-case + `§N-<step-id>.md` 全合规
- [ ] §6.6 长度红线项：playwright-cli 392 已删（P1#5）；case-hotfix hotfix-archive-format 216 已拆 80+100；playwright-automation case-normalize 158 已合到 §3-generate；env-preflight 150 已蒸馏到 rules
- [ ] §6.7 8 skill 列表 1:1 落地（含 defect-analyze 合并 3 skill）
- [ ] §6.8 workflow.yaml v2 schema 全 8 份合规（default_dispatch / metadata / per-step 字段）
- [ ] §6.9 per-phase model 语义 enforced（subagent dispatch 必经 Phase Dispatcher）
- [ ] §6.10 playwright-automation 8 phase per-phase model 严格匹配 spec 表（含 Round-5 spec-review 拆分：generate=sonnet/high worker-only、spec-review=haiku/low reviewer-only、repair=sonnet/high worker-only、quality=haiku/low reviewer-only）
- [ ] §6.11 其它 6 skill default_model 严格匹配 spec 表（knowledge-curate=haiku / workspace-manage=haiku / 其它=sonnet）
- [ ] §6.12 defect-analyze 详细设计完整落地（6 phase = intake / classify / analyze / spec-review / quality-review / emit；analyze worker-only、spec-review reviewer-only haiku/low、quality-review reviewer-only sonnet/medium、emit inline；by_mode 字段 / 2 artifact schema / dual-intent 规则全保留）

### 4. P2 P1 衔接点

- [ ] `_shared/case-qa.md` 来自 P1#5（不重复创建）
- [ ] `_shared/source-ref-rules.md` 在 Commit 7 step 7.30 创建（避免 Commit 7 SKILL.md 引用悬空）；Commit 8.1 step 8.1.18 仅 assert exists（spec §6.12 引用）
- [ ] artifact-validator.ts 加 ajv + ajv-formats 到 package.json
- [ ] engine event-writer / phase-dispatcher / staged-transaction 全复用 P2 实现，本 plan 不改
- [ ] smoke test helper `run-workflow-fixture.ts`（P3#7.34）采用 fake orchestrator 模式：复用 P2 `decidePhase / buildDispatchEnvelope`，按 fixture 映射注入 subagent output；**不**引入 `__test_setSpawnHook`、不改 P2 phase-dispatcher
- [ ] workflow v2 parser（P1#4.a）支持 `default_dispatch / metadata / blackboard_*_by_mode / validators_by_mode` 子字段；每个 review step 一对一只引用 1 reviewer，`model / effort` 直接写在 workflow.yaml step 上，P2 `decidePhase` 标准 fallback 链取值（与 spec §6.8 + §6.9 严格一致）；reviewer/worker frontmatter 只含 `name`，无 model/effort

### 5. blackboard slot registry 一致性

- [ ] 所有 phase `blackboard_inputs / blackboard_outputs` 提到的 slot 全部在 `.claude/contracts/schemas/blackboard-slots.json` 注册（P1#4.a 引入）
- [ ] 新增 slot（按本 plan 出现的）：sources, source_refs, project_module, historical_context, requirement_atoms, open_questions, confirmation_package_path, coverage_matrix, draft_archive_path, draft_xmind_path, draft_case_index, spec_verdict, spec_violations, quality_verdict, spec_review_artifact_path, quality_review_artifact_path, archive_path, xmind_path, metadata_path, manifest_path, handoff_envelopes, mode, severity, category, scope, analyze_output_path, root_cause, evidence_refs, impacted_areas, reproduce_steps, actual_behavior, expected_behavior, side_a_intent, side_b_intent, resolution_plan, affected_files, defect_report_path, conflict_resolution_plan_path, parsed_cases, parsed_case_index, source_archive_path, source_xmind_path, edit_ops, modified_archive_content, modified_xmind_content, modified_manifest_content, modified_archive_path, modified_xmind_path, modified_manifest_path, bug_id, bug_url, bug_report, fix_commits, fix_status, regression_scope, changed_files, changed_modules, draft_regression_cases, hotfix_bundle_path, target_host, connectivity_matrix, symptoms, hypothesis_set, evidence_collected, remediation_steps, remediation_results, diag_report_path, knowledge_handoff_envelopes, intent, user_input_parsed, project_context, candidate_existing_entries, decision_path, entry_draft, entry_id, entry_path, kb_answer, inspection_report, project, skill_list, feature_summary, render_path, render_format, env_config, target_env, archive_cases, plan_mapping, ui_baseline, probe_evidence, spec_files, fixtures, case_normalize_log, run_status, failure_artifacts, repair_log, repair_attempt_count, quality_violations, playwright_suite_path
- [ ] 每次 commit 前跑 `bun run check:skills`，若发现 slot 未注册需在本 commit 内同步加入 `blackboard-slots.json`

### 6. event_kind 全覆盖

每个 skill 的 workflow.yaml metadata.event_kinds_emitted 至少含：phase_entered, phase_exited, decision_made, artifact_written, validator_failed, blocked。subagent phase 自动加 subagent_dispatched / subagent_completed / subagent_failed（engine 提供，不需 yaml 声明）。staged transaction 自动加 projection_failed（同上）。handoff_emitted 显式声明 skill：case-draft / defect-analyze / case-hotfix / infra-diagnose / playwright-automation（5 个；与 spec §6.12 line 663 defect-analyze 的示例 metadata 对齐）。

Fake-orchestrator smoke 抽查（不实跑真 LLM、不实跑 `bunx playwright test`，仅 event 流验证）：
- case-draft smoke：happy + blocking path（6 phase：source-intake / atomize / draft / spec-review / quality-review / output；3 subagent_dispatched）
- defect-analyze smoke：bug / diff / conflict 三 mode 路径（6 phase：intake / classify / analyze / spec-review / quality-review / emit；3 subagent_dispatched）
- playwright-automation smoke：mock runner（8 phase：preflight / probe / generate / spec-review / run / repair / quality / handoff；4 subagent_dispatched；§5-run 用 fixture 注入 run_status；真实 playwright 跑放 CI-level 任务）

其余 5 skill 不写完整 smoke（避免膨胀），但 `bun test` 全跑通保底；`workflow-v2-coverage.test.ts` 校验所有 8 个 workflow.yaml 通过 v2 parser + 顺序 / dispatch / metadata 字段合规。

### 7. 自审完成 → 准备 codex 审查

完成上述 6 项后：

1. `bun test`（全套绿）
2. `bun run check:skills`（manifest + workflow + slot + frontmatter 全过）
3. `bun run check`（lint 全过）
4. 记录 worktree HEAD SHA `git -C .worktrees/p3-skill-migration rev-parse HEAD`
5. 写 review log 占位 `docs/superpowers/reviews/2026-05-29-p3-skill-migration-codex-review.md`
6. 指派 codex-rescue (gpt-5.x@xhigh, effort=high) 全量审查本 plan：
   - 重点：8 skill 是否全覆盖、by_mode 字段在 P1#4.a parser 支持的假设、playwright-automation 8 phase per-phase model 匹配 spec §6.10 + Round-5 拆 spec-review、worker/reviewer 单 step 单 envelope 规则在 7 个含 reviewer 的 skill 全部落实（infra-diagnose 按 §6.11 单流程无 reviewer）、long-doc lint enforcement、commit 间依赖顺序（8.1 必须在 case-draft.yaml v2 之后但 manifest 删 bug-file/conflict-analyze/diff-scan entry 在 P1#3 之后）

---

## Execution Handoff

Plan 完成保存到 `docs/superpowers/plans/2026-05-29-p3-skill-migration.md`，两种执行选项：

**1. Subagent-Driven（recommended）**
- REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
- 每 commit (7 + 8.1 ... 8.7) 派 fresh implementer subagent；每 commit 后做 spec review + code quality review；通过后 commit 并更新 task list
- 适合：本 plan 8 个 commit 完全独立，子 agent 可并行（但建议串行，避免 manifest / slot registry 冲突）

**2. Inline Execution**
- REQUIRED SUB-SKILL: `superpowers:executing-plans`
- 在当前 session 串行跑 8 commit；每 commit 后 checkpoint review
- 适合：用户希望全程在 main session 跟进

**推荐顺序（无论哪种执行模式）：**

```
Commit 7 (case-draft)              ──► fake-orchestrator smoke + 验证 events.jsonl 形态
  │
Commit 8.1 (defect-analyze)        ──► fake-orchestrator smoke 跑 3 mode
  │
Commit 8.2 (case-edit)
  │
Commit 8.3 (case-hotfix)
  │
Commit 8.4 (infra-diagnose)
  │
Commit 8.5 (knowledge-curate)
  │
Commit 8.6 (workspace-manage)
  │
Commit 8.7 (playwright-automation) ──► mock-runner fake-orchestrator smoke
  │
P3 总自审 + codex 全量审查 ──► 合并回 main + push
```

合并步骤（worktree → main）：

```bash
ROOT=/Users/poco/Projects/kata
cd $ROOT
SHA=$(git -C .worktrees/p3-skill-migration rev-parse HEAD)
git merge --no-ff $SHA -m "merge: 🔀 P3 skill migration (8 commits)"
bun install
bun test
bun run check:skills
bun run check
# 全绿后：
git push origin main
git worktree remove .worktrees/p3-skill-migration
```

完成后 task list 更新：`#5 completed`、`#6 in_progress`（codex review P3 plan）。

