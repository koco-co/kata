# Skill Orchestration with Subagent-Driven Stages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 `playwright-automation` 和 `case-draft` 两个工作流接入「阶段内 TodoWrite + Worker subagent + 二阶段 review」编排，并把 `SourceRef` 从 MD 用例剥离到 JSON 溯源层，全程不动现有路由防御硬规则。

**Architecture:** kata 用 `.ai/core/skills/{skill}/skill.yaml` + `references/*.md` 作为 single source of truth，通过 `kata ai-core projection render` 渲染到 `.claude/skills/`。本 plan 全部改动落在 `.ai/core/skills/{playwright-automation,case-draft}/**`，每次结构改动后跑渲染并通过 contract test 验证。新增 4 份 reference per skill（execution-protocol / worker-prompt / spec-reviewer-prompt / quality-reviewer-prompt）。

**Tech Stack:** Bun + TypeScript（engine/tests/ai-core 契约测试）；kata CLI（`engine/bin/kata`）；biome（lint/format）；handlebars（projection render）。

**Reference docs:**
- Spec: `docs/superpowers/specs/2026-05-18-skill-orchestration-subagent-design.md`
- MD 格式约束: `docs/superpowers/specs/2026-05-18-ltqc-md-case-style-design.md`
- SDD 三件套来源: `superpowers:writing-plans` + `superpowers:subagent-driven-development`

**Pre-flight checks before any task:**
- 当前分支干净或仅含本 plan 相关改动：`git status` 应无意外 modified
- bun 工作：`bun --version`
- engine CLI 工作：`engine/bin/kata --help` 列出 `ai-core / agents / cases ...`

---

## Phase 1 — playwright-automation

### Task 1: Contract test 占位 — 执行模式存在性

**Files:**
- Create: `engine/tests/ai-core/playwright-automation-orchestration.test.ts`

- [ ] **Step 1: Write the failing contract test**

```typescript
// engine/tests/ai-core/playwright-automation-orchestration.test.ts
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "../../..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const exists = (p: string) => existsSync(join(root, p));

describe("playwright-automation subagent orchestration surface", () => {
  it("declares the four new reference files in ai-core source", () => {
    expect(exists(".ai/core/skills/playwright-automation/references/execution-protocol.md")).toBe(true);
    expect(exists(".ai/core/skills/playwright-automation/references/worker-prompt.md")).toBe(true);
    expect(exists(".ai/core/skills/playwright-automation/references/spec-reviewer-prompt.md")).toBe(true);
    expect(exists(".ai/core/skills/playwright-automation/references/quality-reviewer-prompt.md")).toBe(true);
  });

  it("skill.yaml references list includes the four new files", () => {
    const yaml = read(".ai/core/skills/playwright-automation/skill.yaml");
    expect(yaml).toContain("path: references/execution-protocol.md");
    expect(yaml).toContain("path: references/worker-prompt.md");
    expect(yaml).toContain("path: references/spec-reviewer-prompt.md");
    expect(yaml).toContain("path: references/quality-reviewer-prompt.md");
  });

  it("skill.yaml routing_summary declares the orchestration mode entry", () => {
    const yaml = read(".ai/core/skills/playwright-automation/skill.yaml");
    expect(yaml).toContain("阶段内任务编排");
  });

  it("rendered .claude/skills SKILL.md exposes the same four references", () => {
    const md = read(".claude/skills/playwright-automation/SKILL.md");
    expect(md).toContain("execution-protocol.md");
    expect(md).toContain("worker-prompt.md");
    expect(md).toContain("spec-reviewer-prompt.md");
    expect(md).toContain("quality-reviewer-prompt.md");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test --cwd engine tests/ai-core/playwright-automation-orchestration.test.ts`

Expected: FAIL with `expected true to be true` style assertion failures on the four `exists(...)` checks (reference files not yet created).

- [ ] **Step 3: Commit the failing test**

```bash
git add engine/tests/ai-core/playwright-automation-orchestration.test.ts
git commit -m "test: add playwright-automation orchestration surface contract"
```

---

### Task 2: 新增 execution-protocol.md reference 源

**Files:**
- Create: `.ai/core/skills/playwright-automation/references/execution-protocol.md`
- Modify: `.ai/core/skills/playwright-automation/skill.yaml` (references 列表追加一项)

- [ ] **Step 1: Write execution-protocol.md (full content)**

Create `.ai/core/skills/playwright-automation/references/execution-protocol.md` with these required sections in this exact order. Each section's must-contain strings are listed below — the contract test in Task 7 will assert these.

```markdown
# Execution Protocol — Stage-Internal Task Orchestration

适用范围：用户已确认 env profile 且 env-preflight 全部探测无 blocker 后的全部阶段。

## 禁止派 Worker 的场景（hard gate）

- silent-mode（`/playwright-automation <title>` 不带环境）
- env-preflight 全阶段（含 tool_permission_denied、session expired、no_permission 路径）
- 任何输出 BLOCKED 模板前

禁止派 Worker 期间一律禁止 TodoWrite、禁止 Agent dispatch。

## 阶段调度表

| 阶段 | 调度 |
| --- | --- |
| case-normalize | 主会话 |
| env-preflight | 主会话 |
| ui-plan | 主会话 |
| ui-probe | Agent |
| plan-reconcile | 主会话 |
| playwright-generate | Agent |
| self-run | Agent |
| run-triage | 主会话 |
| repair-loop | Agent（每次修复一个 fresh subagent）|
| quality-gate | spec-reviewer + quality-reviewer 替代 |
| handoff | 主会话 |

## TodoWrite 编排

进入 Worker 编排可用窗口后：
1. 主 Skill 一次性创建 11 项 TodoWrite，对应上表阶段
2. 每阶段开始时把对应 todo 标 `in_progress`，完成后标 `completed`
3. Worker 不读 SKILL.md，不维护 TodoWrite

## Worker 派发协议

按 `references/worker-prompt.md` 模板构造 prompt。
重阶段使用 Agent tool，subagent_type=general-purpose；model 按任务复杂度选择：
- ui-probe / self-run → standard
- playwright-generate / repair-loop → strong

## 二阶段 Review 协议

每个重阶段产物落盘后：
1. spec-reviewer（主会话执行，按 `references/spec-reviewer-prompt.md`）
2. spec 通过 → quality-reviewer（Agent，按 `references/quality-reviewer-prompt.md`）
3. 任一 reviewer 不通过 → Worker 修复 → re-review

## Review Loop 上限

- spec review ≤ 3 次重试；超限进入 handoff，报 `failed_quality_gate`
- quality review ≤ 3 次重试；超限同上
- repair-loop 仍为 ≤ 3 次/spec（沿用现有硬规则，与 review loop 独立计数）
- locator 内部重试 ≤ 2 次（不变）

## Worker Status 处置

| Status | 主 Skill 动作 |
| --- | --- |
| DONE | 进入 spec review |
| DONE_WITH_CONCERNS | 记录到 manifest.json#stage_history；进入 spec review |
| NEEDS_CONTEXT | 主 Skill 补 context 重派 |
| BLOCKED | 查 kind → 找对应硬规则模板输出，不进入 review |

BlockedEnvelope JSON schema：

```json
{
  "status": "BLOCKED",
  "kind": "session_expired | tool_permission_denied | no_permission | ...",
  "evidence_paths": ["..."],
  "context": {}
}
```
```

Required must-contain strings for contract test:
- `禁止派 Worker 的场景`
- `阶段调度表`
- `TodoWrite 编排`
- `Worker 派发协议`
- `二阶段 Review 协议`
- `Review Loop 上限`
- `Worker Status 处置`
- `BlockedEnvelope`

- [ ] **Step 2: Append to skill.yaml references list**

Modify `.ai/core/skills/playwright-automation/skill.yaml`. Append after the existing `references/handoff.md` block (around line 186):

```yaml
  - path: references/execution-protocol.md
    type: normative
    load_phases:
      - ui-probe
      - playwright-generate
      - self-run
      - repair-loop
    purpose: 阶段内 TodoWrite 编排、Worker 派发、二阶段 Review 协议；只在用户确认 env 且无 blocker 后生效。
    load_when: step.id in [ui-probe, playwright-generate, self-run, repair-loop]
```

- [ ] **Step 3: Render projection**

Run: `engine/bin/kata ai-core projection render`

Expected: stdout reports `playwright-automation` rendered; no errors.

- [ ] **Step 4: Re-run Task 1 contract test**

Run: `bun test --cwd engine tests/ai-core/playwright-automation-orchestration.test.ts -t "execution-protocol"`

Expected: the `declares the four new reference files` and `references list includes` assertions pass for execution-protocol; the other three still FAIL.

- [ ] **Step 5: Commit**

```bash
git add .ai/core/skills/playwright-automation/references/execution-protocol.md \
        .ai/core/skills/playwright-automation/skill.yaml \
        .claude/skills/playwright-automation/
git commit -m "feat(playwright-automation): add execution-protocol reference"
```

---

### Task 3: 新增 worker-prompt.md reference 源

**Files:**
- Create: `.ai/core/skills/playwright-automation/references/worker-prompt.md`
- Modify: `.ai/core/skills/playwright-automation/skill.yaml`

- [ ] **Step 1: Write worker-prompt.md**

Create `.ai/core/skills/playwright-automation/references/worker-prompt.md`:

```markdown
# Worker Subagent Prompt Template

主 Skill 派发 Worker 时必须按本模板填充 prompt。Worker 永远不直接 reply 用户；所有阻塞通过 BlockedEnvelope 回传。

## 必备输入字段（prompt 上半部分）

- 阶段名（如 `ui-probe`）
- 子任务描述（一句话）
- 当前阶段 reference 摘要（不超过 200 字，由主 Skill 抽取）
- 已落地 artifact 列表（路径 + 摘要）
- env profile 文件名 + 已确认 base_url
- 当前 feature 目录绝对路径

## 必备约束（prompt 下半部分，逐字粘贴）

> 你不读 SKILL.md，不读硬规则，不维护 TodoWrite。
> 你完成子任务后必须以 JSON 形式回复一个 status envelope，不得追加散文。
> 你不直接 reply 用户。若遇阻塞，返回 BlockedEnvelope。
> 你不得修改本任务范围之外的文件。

## Status Envelope（出参）

返回 JSON，schema:

```json
{
  "status": "DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED",
  "artifacts_written": ["<absolute or repo-relative path>", ...],
  "concerns": "可空；DONE_WITH_CONCERNS 时必填",
  "needs_context": "可空；NEEDS_CONTEXT 时必填，简述缺什么",
  "blocked": null
}
```

BLOCKED 时 `blocked` 必填：

```json
{
  "status": "BLOCKED",
  "blocked": {
    "kind": "session_expired | tool_permission_denied | no_permission | missing_evidence | ...",
    "evidence_paths": [...],
    "context": {}
  }
}
```

## Reviewer 调用 Worker 修复的特殊形态

修复轮次的 prompt 在原 prompt 基础上追加：
- 上次 status envelope
- Reviewer issue list
- 明确指令：「修复这些 issue，不要扩大改动范围」
```

Required must-contain strings:
- `必备输入字段`
- `必备约束`
- `Status Envelope`
- `BlockedEnvelope`
- `Reviewer 调用 Worker 修复`

- [ ] **Step 2: Append to skill.yaml references list**

Append after the execution-protocol entry:

```yaml
  - path: references/worker-prompt.md
    type: normative
    load_phases:
      - ui-probe
      - playwright-generate
      - self-run
      - repair-loop
    purpose: Worker subagent prompt 模板与 status envelope schema。
    load_when: step.id in [ui-probe, playwright-generate, self-run, repair-loop]
```

- [ ] **Step 3: Render + test**

Run: `engine/bin/kata ai-core projection render && bun test --cwd engine tests/ai-core/playwright-automation-orchestration.test.ts`

Expected: 2/4 assertions in the first `it` block pass; 2 still FAIL.

- [ ] **Step 4: Commit**

```bash
git add .ai/core/skills/playwright-automation/references/worker-prompt.md \
        .ai/core/skills/playwright-automation/skill.yaml \
        .claude/skills/playwright-automation/
git commit -m "feat(playwright-automation): add worker-prompt reference"
```

---

### Task 4: 新增 spec-reviewer-prompt.md reference 源

**Files:**
- Create: `.ai/core/skills/playwright-automation/references/spec-reviewer-prompt.md`
- Modify: `.ai/core/skills/playwright-automation/skill.yaml`

- [ ] **Step 1: Write spec-reviewer-prompt.md**

Create `.ai/core/skills/playwright-automation/references/spec-reviewer-prompt.md`:

```markdown
# Spec Reviewer Prompt — playwright-automation

主会话执行（不派 subagent）。对当前阶段产物做机械契约检查。

## 硬规则优先

你的检查项不得违反 `SKILL.md` 中的硬规则。若检查项与硬规则冲突，记为 `out_of_scope` 而非 `issue`。

## 检查清单（机械）

按阶段勾选必跑的检查项：

### ui-probe 产物

- [ ] 至少一个 `results/<run-id>/playwright/ui-probe/` 证据目录存在
- [ ] 至少含 `probe.json`、`page.png` 或同等截图证据
- [ ] manifest.json#case_drafting.requirement_atoms 中所有 atom 在 probe 证据中能找到对应 selector

### playwright-generate 产物

- [ ] `tests/runners/smoke.spec.ts` 存在
- [ ] `tests/runners/full.spec.ts` 存在
- [ ] case 文件位于 `tests/cases/`
- [ ] 共享 page object 位于 `_shared/pages/`
- [ ] 没有 feature-local helper 目录

### self-run 产物

- [ ] `results/<run-id>/playwright/full/` 含 stdout、stderr、exit-code、report.html
- [ ] exit-code 是数字
- [ ] 失败 spec 列表与 exit-code 一致

### repair-loop 产物

- [ ] 每次修复有独立证据目录 `results/<run-id>/playwright/repair-<n>/`
- [ ] repair 次数 ≤ 3

## 输出格式（必须遵守）

返回 JSON：

```json
{
  "spec_review_status": "pass | fail",
  "issues": [
    { "kind": "missing | extra | wrong | structural", "where": "...", "fix_hint": "..." }
  ],
  "out_of_scope": [
    { "where": "...", "reason": "与硬规则 X 冲突" }
  ]
}
```

`spec_review_status=fail` 时 `issues` 必须非空。
```

Required must-contain strings:
- `硬规则优先`
- `out_of_scope`
- `检查清单`
- `ui-probe 产物`
- `playwright-generate 产物`
- `self-run 产物`
- `repair-loop 产物`
- `spec_review_status`

- [ ] **Step 2: Append to skill.yaml**

```yaml
  - path: references/spec-reviewer-prompt.md
    type: normative
    load_phases:
      - ui-probe
      - playwright-generate
      - self-run
      - repair-loop
    purpose: 阶段产物 spec 合规机械检查清单与输出 schema。
    load_when: step.id in [ui-probe, playwright-generate, self-run, repair-loop]
```

- [ ] **Step 3: Render + test**

Run: `engine/bin/kata ai-core projection render && bun test --cwd engine tests/ai-core/playwright-automation-orchestration.test.ts`

Expected: 3/4 first-block assertions pass; only quality-reviewer FAIL.

- [ ] **Step 4: Commit**

```bash
git add .ai/core/skills/playwright-automation/references/spec-reviewer-prompt.md \
        .ai/core/skills/playwright-automation/skill.yaml \
        .claude/skills/playwright-automation/
git commit -m "feat(playwright-automation): add spec-reviewer-prompt reference"
```

---

### Task 5: 新增 quality-reviewer-prompt.md reference 源

**Files:**
- Create: `.ai/core/skills/playwright-automation/references/quality-reviewer-prompt.md`
- Modify: `.ai/core/skills/playwright-automation/skill.yaml`

- [ ] **Step 1: Write quality-reviewer-prompt.md**

Create `.ai/core/skills/playwright-automation/references/quality-reviewer-prompt.md`:

```markdown
# Quality Reviewer Prompt — playwright-automation

派 fresh Agent 执行。审查 artifact 内容质量（不重复 spec reviewer 的结构检查）。

## 硬规则优先

你的检查项不得违反 `SKILL.md` 中的硬规则。若检查项与硬规则冲突，记为 `out_of_scope` 而非 `issue`。

## 检查项

### 选择器稳定性

- 禁止 `.nth(<number>)`、`text()` 模糊匹配、xpath
- 优先 `data-testid`、ARIA role + name、可见 label
- 同一 page object 中 selector 必须按业务命名分组

### 断言强度

- 禁止 `page.waitForTimeout(<ms>)` 类硬延时
- 禁止 `try/catch` 吞失败
- 禁止 `test.skip()` 掩盖未确认行为
- 每个断言必须有明确文案或语义注释

### 修复闭环

- repair-loop 中的修复不得在原 case 文件中添加 wider locator
- 修复不得绕过断言，必须解决根因

### Page Object 复用度

- 同一交互模式在两个 case 出现 → 必须抽到 `_shared/pages/`
- helper 不得 import 测试断言库

## 输出格式

返回 JSON：

```json
{
  "quality_review_status": "pass | fail",
  "issues": [
    {
      "severity": "high | medium | low",
      "category": "selector | assertion | repair | reuse",
      "where": "<file>:<line>",
      "evidence": "...",
      "fix_hint": "..."
    }
  ],
  "out_of_scope": [...]
}
```

high 必须修；medium/low 可标记后通过。
```

Required must-contain strings:
- `硬规则优先`
- `out_of_scope`
- `选择器稳定性`
- `断言强度`
- `修复闭环`
- `Page Object 复用度`
- `quality_review_status`

- [ ] **Step 2: Append to skill.yaml**

```yaml
  - path: references/quality-reviewer-prompt.md
    type: normative
    load_phases:
      - playwright-generate
      - repair-loop
    purpose: 脚本内容质量审查（选择器、断言、复用度）。
    load_when: step.id in [playwright-generate, repair-loop]
```

- [ ] **Step 3: Render + test**

Run: `engine/bin/kata ai-core projection render && bun test --cwd engine tests/ai-core/playwright-automation-orchestration.test.ts`

Expected: all 4 first-block assertions pass; second & third still FAIL (routing_summary entry + rendered SKILL.md content).

- [ ] **Step 4: Commit**

```bash
git add .ai/core/skills/playwright-automation/references/quality-reviewer-prompt.md \
        .ai/core/skills/playwright-automation/skill.yaml \
        .claude/skills/playwright-automation/
git commit -m "feat(playwright-automation): add quality-reviewer-prompt reference"
```

---

### Task 6: 在 skill.yaml routing_summary 加「阶段内任务编排」声明

**Files:**
- Modify: `.ai/core/skills/playwright-automation/skill.yaml` (body.always_load.routing_summary)

- [ ] **Step 1: Edit skill.yaml routing_summary**

Locate the `routing_summary` array under `body.always_load` (currently a single bullet). Append a second bullet:

```yaml
    routing_summary:
      - 统一处理 UI 自动化规划、真实页面探测、Playwright 生成、运行归因和修复闭环。
      - 阶段内任务编排：用户确认 env 且 env-preflight 无 blocker 后，按 references/execution-protocol.md 创建 TodoWrite 子任务、按 references/worker-prompt.md 派发 Worker、按 references/spec-reviewer-prompt.md 与 references/quality-reviewer-prompt.md 二阶段审查；silent-mode、env-preflight 全阶段、所有 BLOCKED 模板路径下禁止该协议。
```

- [ ] **Step 2: Render projection**

Run: `engine/bin/kata ai-core projection render`

Expected: `playwright-automation` rendered successfully; no errors.

- [ ] **Step 3: Run full orchestration contract test**

Run: `bun test --cwd engine tests/ai-core/playwright-automation-orchestration.test.ts`

Expected: ALL assertions PASS.

- [ ] **Step 4: Run baseline surface test (regression check)**

Run: `bun test --cwd engine tests/ai-core/playwright-automation-surface.test.ts`

Expected: all assertions still PASS — confirms no regression on existing routing surface.

- [ ] **Step 5: Commit**

```bash
git add .ai/core/skills/playwright-automation/skill.yaml \
        .claude/skills/playwright-automation/
git commit -m "feat(playwright-automation): declare stage-internal task orchestration in routing_summary"
```

---

### Task 7: 回归契约测试（硬规则未变动）

**Files:**
- Create: `engine/tests/ai-core/playwright-automation-hardrules-regression.test.ts`

- [ ] **Step 1: Capture current hard_rules sha256 as baseline**

Run:

```bash
bun -e "import {readFileSync} from 'node:fs'; import {parse} from 'yaml'; import {createHash} from 'node:crypto'; const y = parse(readFileSync('.ai/core/skills/playwright-automation/skill.yaml','utf8')); const hr = y.body.always_load.hard_rules.join('\n'); console.log('sha256', createHash('sha256').update(hr).digest('hex')); console.log('count', y.body.always_load.hard_rules.length);"
```

Run from repo root so the relative `.ai/core/...` path resolves. Record the printed sha256 and count. Substitute into the test below.

- [ ] **Step 2: Write regression contract test**

Create `engine/tests/ai-core/playwright-automation-hardrules-regression.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { parse } from "yaml";

const root = join(import.meta.dirname, "../../..");

describe("playwright-automation hard_rules regression", () => {
  // Baseline captured BEFORE this PR. If hard_rules need to change in this PR,
  // update this baseline in a SEPARATE commit with explicit justification.
  const BASELINE_SHA256 = "<PASTE_FROM_STEP_1>";
  const BASELINE_COUNT = <PASTE_FROM_STEP_1>;

  it("hard_rules array length is unchanged", () => {
    const yaml = parse(readFileSync(join(root, ".ai/core/skills/playwright-automation/skill.yaml"), "utf8")) as any;
    expect(yaml.body.always_load.hard_rules.length).toBe(BASELINE_COUNT);
  });

  it("hard_rules joined sha256 is unchanged", () => {
    const yaml = parse(readFileSync(join(root, ".ai/core/skills/playwright-automation/skill.yaml"), "utf8")) as any;
    const joined = yaml.body.always_load.hard_rules.join("\n");
    const sha = createHash("sha256").update(joined).digest("hex");
    expect(sha).toBe(BASELINE_SHA256);
  });
});
```

Replace `<PASTE_FROM_STEP_1>` with the captured values.

- [ ] **Step 3: Run regression test**

Run: `bun test --cwd engine tests/ai-core/playwright-automation-hardrules-regression.test.ts`

Expected: PASS (hard_rules unchanged in this Phase).

- [ ] **Step 4: Commit**

```bash
git add engine/tests/ai-core/playwright-automation-hardrules-regression.test.ts
git commit -m "test: pin playwright-automation hard_rules sha256 baseline"
```

---

### Task 8: 故意造错验证 — reviewer prompt 含必备 lint pattern

**Files:**
- Modify: `engine/tests/ai-core/playwright-automation-orchestration.test.ts`

- [ ] **Step 1: Append three injected-error contract assertions**

Open `engine/tests/ai-core/playwright-automation-orchestration.test.ts`. Inside the same `describe` block, append:

```typescript
  describe("reviewer prompts encode the three injected-error patterns", () => {
    const quality = read(".ai/core/skills/playwright-automation/references/quality-reviewer-prompt.md");
    const spec = read(".ai/core/skills/playwright-automation/references/spec-reviewer-prompt.md");

    it("quality-reviewer forbids .nth() weak selectors", () => {
      expect(quality).toContain(".nth(");
      expect(quality.toLowerCase()).toMatch(/禁止.*nth|nth.*禁止/);
    });

    it("spec-reviewer requires both smoke and full runners", () => {
      expect(spec).toContain("smoke.spec.ts");
      expect(spec).toContain("full.spec.ts");
    });

    it("quality-reviewer forbids waitForTimeout and try/catch fail-swallow", () => {
      expect(quality).toContain("waitForTimeout");
      expect(quality).toContain("try/catch");
    });
  });
```

- [ ] **Step 2: Run the new assertions**

Run: `bun test --cwd engine tests/ai-core/playwright-automation-orchestration.test.ts -t "reviewer prompts"`

Expected: PASS (the prompt files written in Task 4/5 already contain the strings).

- [ ] **Step 3: Commit**

```bash
git add engine/tests/ai-core/playwright-automation-orchestration.test.ts
git commit -m "test: assert reviewer prompts encode injected-error patterns"
```

---

### Task 9: Projection lock 与 CHANGELOG Phase 1 条目

**Files:**
- Modify: `.ai/core/runtimes/projection-lock.json`（renderer 输出）
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Render projection lock**

Run: `engine/bin/kata ai-core projection lock render`

Expected: stdout indicates `projection-lock.json` updated; `git status` shows the lock changed.

- [ ] **Step 2: Verify projection lock check passes**

Run: `engine/bin/kata ai-core projection lock check`

Expected: exit code 0, output `lock OK`.

- [ ] **Step 3: Run full ai-core suite to catch any drift**

Run: `bun run test:ai-core`

Expected: all tests pass.

- [ ] **Step 4: Add CHANGELOG entry**

Edit `CHANGELOG.md`. Under `## Unreleased`, add after the existing `### Changed` bullet a new `### Added` block:

```markdown
### Added

- New: `playwright-automation` skill 引入「阶段内任务编排」协议（execution-protocol / worker-prompt / spec-reviewer-prompt / quality-reviewer-prompt 四份 reference），在用户确认 env 且 env-preflight 无 blocker 后启用；TodoWrite 跟踪阶段推进、ui-probe/playwright-generate/self-run/repair-loop 重阶段派 fresh subagent、产物落盘后跑 spec→quality 二阶段审查。silent-mode、所有 BLOCKED 模板路径下该协议禁用。现有 19 条硬规则、silent-mode、env-preflight blocker 模板未变动（sha256 baseline 已 pin 在 `engine/tests/ai-core/playwright-automation-hardrules-regression.test.ts`）。详见 docs/superpowers/specs/2026-05-18-skill-orchestration-subagent-design.md Phase 1。
```

- [ ] **Step 5: Run full lint + ci scripts**

Run: `bun run lint && bun run lint:ai-core && bun run type-check`

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add .ai/core/runtimes/projection-lock.json CHANGELOG.md
git commit -m "chore: re-lock projection and log Phase 1 changelog entry"
```

---

## Phase 2 — case-draft + SourceRef 三层契约

### Task 10: 增补 ltqc-md-case-style-design.md 的 requirement_atoms schema

**Files:**
- Modify: `docs/superpowers/specs/2026-05-18-ltqc-md-case-style-design.md`

- [ ] **Step 1: Append new section to the spec**

At the end of `docs/superpowers/specs/2026-05-18-ltqc-md-case-style-design.md` (after the existing `## Verification` section), append:

```markdown
## JSON Companion Contract

### requirement_atoms[] schema

Each MD case (`##### 【P*】<title>` under `### <requirement_id> <requirement_title>`) corresponds to one or more atoms in `manifest.json#case_drafting.requirement_atoms[]`:

```json
{
  "atom_id": "RA-<NNN>",
  "requirement_id": "<MD ### 标题前的数字 ID，CSV 来源取 case_id>",
  "case_title": "<MD ##### 标题去掉【P*】前缀>",
  "priority": "P0 | P1 | P2 | P3",
  "evidence_kind": "prd.file | lanhu.fixture | csv.row | history | manual",
  "ambiguity_class": "confirmed | inferred | history_inferred | pending",
  "confidence": "high | medium | low",
  "source_refs": ["<SR-ID>", ...]
}
```

### MD ↔ JSON 双向解析规则

- 解析方向 1（MD → JSON）：`### <id> <title>` 提取 `requirement_id`；`##### 【P*】<title>` 提取 `priority` 与 `case_title`
- 解析方向 2（JSON → MD）：`requirement_id + case_title + priority` 三元组在 MD 中必须找到对应 `#####` 行
- 任一方向缺失即视为契约破裂；spec reviewer 必须拦下

### SourceRef 归属

- `archive.md` / `archive.draft.md` / `cases.xmind` 正文不得显式包含 `SourceRef`、`SR-<NNN>`、`csv::` 前缀、CSV 文件名或 CSV 行号
- 所有 SourceRef 在 `manifest.json#case_drafting.requirement_atoms[].source_refs[]` 内引用
- Lanhu/Axure error-fallback 路径下的 `confirmation-package.md` / `unresolved-summary.md` 豁免（按 case-draft skill.yaml 既有硬规则保留 URL token 表）
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-05-18-ltqc-md-case-style-design.md
git commit -m "docs: extend ltqc md-case spec with JSON companion contract"
```

---

### Task 11: case-draft orchestration contract test 占位

**Files:**
- Create: `engine/tests/ai-core/case-draft-orchestration.test.ts`

- [ ] **Step 1: Write the failing contract test**

```typescript
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const root = join(import.meta.dirname, "../../..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const exists = (p: string) => existsSync(join(root, p));

describe("case-draft subagent orchestration surface", () => {
  it("declares the four new reference files in ai-core source", () => {
    expect(exists(".ai/core/skills/case-draft/references/execution-protocol.md")).toBe(true);
    expect(exists(".ai/core/skills/case-draft/references/worker-prompt.md")).toBe(true);
    expect(exists(".ai/core/skills/case-draft/references/spec-reviewer-prompt.md")).toBe(true);
    expect(exists(".ai/core/skills/case-draft/references/quality-reviewer-prompt.md")).toBe(true);
  });

  it("skill.yaml references list includes the four new files", () => {
    const yaml = read(".ai/core/skills/case-draft/skill.yaml");
    expect(yaml).toContain("path: references/execution-protocol.md");
    expect(yaml).toContain("path: references/worker-prompt.md");
    expect(yaml).toContain("path: references/spec-reviewer-prompt.md");
    expect(yaml).toContain("path: references/quality-reviewer-prompt.md");
  });

  it("skill.yaml routing_summary declares the orchestration mode entry", () => {
    const yaml = read(".ai/core/skills/case-draft/skill.yaml");
    expect(yaml).toContain("阶段内任务编排");
  });

  it("hard_rules contain the new SourceRef layering rule", () => {
    const yaml = parse(read(".ai/core/skills/case-draft/skill.yaml")) as any;
    const joined = yaml.body.always_load.hard_rules.join("\n");
    expect(joined).toContain("requirement_atoms 中引用 SourceRef ID");
    expect(joined).toContain("不得显式包含 SourceRef");
    expect(joined).toContain("requirement_id + atom.case_title + atom.priority");
  });

  it("spec-reviewer prompt contains SourceRef layering lint patterns", () => {
    const prompt = read(".ai/core/skills/case-draft/references/spec-reviewer-prompt.md");
    expect(prompt).toContain("SourceRef");
    expect(prompt).toContain("SR-");
    expect(prompt).toContain("csv::");
    expect(prompt).toContain("requirement_atoms");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test --cwd engine tests/ai-core/case-draft-orchestration.test.ts`

Expected: FAIL on all five `it` blocks (no source files yet).

- [ ] **Step 3: Commit**

```bash
git add engine/tests/ai-core/case-draft-orchestration.test.ts
git commit -m "test: add case-draft orchestration contract"
```

---

### Task 12: 新增 case-draft execution-protocol.md

**Files:**
- Create: `.ai/core/skills/case-draft/references/execution-protocol.md`
- Modify: `.ai/core/skills/case-draft/skill.yaml`

- [ ] **Step 1: Write case-draft execution-protocol.md**

Create `.ai/core/skills/case-draft/references/execution-protocol.md`:

```markdown
# Execution Protocol — Stage-Internal Task Orchestration (case-draft)

适用范围：source-intake 与 module-identify 完成且不在 Lanhu/Axure error-fallback 路径下。

## 禁止派 Worker 的场景（hard gate）

- Lanhu/Axure URL only 或抓取失败 → 阻塞草稿路径（25 条硬规则全主会话）
- source-intake 抓取期间 silent-mode
- 任何 BlockedEnvelope 路径

## 阶段调度表

| 阶段 | 调度 |
| --- | --- |
| source-intake | 主会话 |
| module-identify | 主会话 |
| historical-context | Agent |
| requirement-atomize | Agent |
| ambiguity-scan | 主会话 |
| confirmation-package | 主会话 |
| product-feedback-merge | 主会话 |
| coverage-matrix | 主会话 |
| case-draft | Agent |
| case-review | spec-reviewer 替代 |
| output | quality-reviewer 替代 |
| automation-handoff | 主会话 |

## TodoWrite 编排

进入 Worker 编排可用窗口后：
1. 主 Skill 一次性创建 12 项 TodoWrite
2. 每阶段开始时把对应 todo 标 `in_progress`，完成后标 `completed`

## Worker 派发协议

按 `references/worker-prompt.md` 模板构造 prompt。重阶段使用 Agent tool，subagent_type=general-purpose。

## 二阶段 Review 协议

case-draft 阶段产物落盘后：
1. spec-reviewer（主会话，按 `references/spec-reviewer-prompt.md`）— 核心：MD/JSON SourceRef 分层、MD↔JSON caseId 对账、blocking pending 计数
2. spec 通过 → quality-reviewer（Agent，按 `references/quality-reviewer-prompt.md`）— 内容审查：用例步骤完整、case_title 表意

## Review Loop 上限

- spec review ≤ 3 次重试；超限进入 `output` 并报 `failed_quality_gate`
- quality review ≤ 3 次重试；超限同上

## Worker Status 处置

与 playwright-automation 一致；BLOCKED kind 包括：`missing_evidence`、`ambiguous_requirement`、`history_only`、`source_intake_failed`。
```

Required must-contain strings: `禁止派 Worker`, `阶段调度表`, `TodoWrite 编排`, `二阶段 Review 协议`, `Review Loop 上限`, `Worker Status 处置`.

- [ ] **Step 2: Append to case-draft skill.yaml references**

Locate the references list (similar structure to playwright-automation). Append after the last existing entry (`references/error-fallback-paths.md`):

```yaml
  - path: references/execution-protocol.md
    type: normative
    load_phases:
      - historical-context
      - requirement-atomize
      - case-draft
    purpose: 阶段内 TodoWrite 编排、Worker 派发、二阶段 Review 协议；只在非 error-fallback 路径下生效。
    load_when: step.id in [historical-context, requirement-atomize, case-draft]
```

- [ ] **Step 3: Render + partial test**

Run: `engine/bin/kata ai-core projection render && bun test --cwd engine tests/ai-core/case-draft-orchestration.test.ts -t "execution-protocol"`

Expected: the execution-protocol existence + skill.yaml inclusion assertions pass.

- [ ] **Step 4: Commit**

```bash
git add .ai/core/skills/case-draft/references/execution-protocol.md \
        .ai/core/skills/case-draft/skill.yaml \
        .claude/skills/case-draft/
git commit -m "feat(case-draft): add execution-protocol reference"
```

---

### Task 13: 新增 case-draft worker-prompt.md

**Files:**
- Create: `.ai/core/skills/case-draft/references/worker-prompt.md`
- Modify: `.ai/core/skills/case-draft/skill.yaml`

- [ ] **Step 1: Write worker-prompt.md**

Create `.ai/core/skills/case-draft/references/worker-prompt.md` with the same structural skeleton as the playwright-automation version (Task 3), adapted for case-draft. Required must-contain strings: `必备输入字段`, `必备约束`, `Status Envelope`, `BlockedEnvelope`, `requirement_atoms`. Full template body:

```markdown
# Worker Subagent Prompt Template (case-draft)

主 Skill 派发 Worker 时必须按本模板填充 prompt。Worker 永远不直接 reply 用户；所有阻塞通过 BlockedEnvelope 回传。

## 必备输入字段

- 阶段名（如 `requirement-atomize`、`case-draft`）
- 当前阶段 reference 摘要（不超过 200 字）
- 已落地 artifact 列表（路径 + 摘要）
- source_snapshot 路径（含 source_refs[]）
- 当前 feature 目录绝对路径

## 必备约束

> 你不读 SKILL.md，不读硬规则，不维护 TodoWrite。
> 你完成子任务后必须以 JSON 形式回复 status envelope，不得追加散文。
> 你不直接 reply 用户。若遇阻塞，返回 BlockedEnvelope。
> 你不得修改本任务范围之外的文件。
> archive.md / archive.draft.md / cases.xmind 中不得写入 SourceRef、SR-<NNN>、csv:: 前缀、CSV 文件名、CSV 行号；所有 SourceRef 引用必须写到 manifest.json#case_drafting.requirement_atoms[].source_refs[]。

## Status Envelope

同 playwright-automation 版本，BLOCKED kind 包括：`missing_evidence | ambiguous_requirement | history_only | source_intake_failed`.

## Reviewer 调用 Worker 修复的特殊形态

修复轮次 prompt 在原 prompt 基础上追加：
- 上次 status envelope
- Reviewer issue list
- 明确指令：「修复这些 issue，不要扩大改动范围」
- 如果 issue 类型是 `sourceref_leaked_in_md`，必须从 MD 删除 SourceRef 引用并把它写入对应 atom 的 `source_refs[]`
```

- [ ] **Step 2: Append to skill.yaml**

```yaml
  - path: references/worker-prompt.md
    type: normative
    load_phases:
      - historical-context
      - requirement-atomize
      - case-draft
    purpose: case-draft Worker subagent prompt 模板与 status envelope schema。
    load_when: step.id in [historical-context, requirement-atomize, case-draft]
```

- [ ] **Step 3: Render + test**

Run: `engine/bin/kata ai-core projection render && bun test --cwd engine tests/ai-core/case-draft-orchestration.test.ts`

Expected: 2/4 first-it assertions pass.

- [ ] **Step 4: Commit**

```bash
git add .ai/core/skills/case-draft/references/worker-prompt.md \
        .ai/core/skills/case-draft/skill.yaml \
        .claude/skills/case-draft/
git commit -m "feat(case-draft): add worker-prompt reference"
```

---

### Task 14: 新增 case-draft spec-reviewer-prompt.md（核心 SourceRef lint）

**Files:**
- Create: `.ai/core/skills/case-draft/references/spec-reviewer-prompt.md`
- Modify: `.ai/core/skills/case-draft/skill.yaml`

- [ ] **Step 1: Write spec-reviewer-prompt.md**

Create `.ai/core/skills/case-draft/references/spec-reviewer-prompt.md`:

```markdown
# Spec Reviewer Prompt — case-draft

主会话执行。对当前阶段产物做机械契约检查。

## 硬规则优先

你的检查项不得违反 `SKILL.md` 中的硬规则。若检查项与硬规则冲突，记为 `out_of_scope` 而非 `issue`。

## 检查清单（机械）

### SourceRef 分层 lint（核心）

对 `archive.md`、`archive.draft.md`、`cases.xmind` 应用正则匹配，命中即 `fail`：

- `/SourceRef/i`
- `/\bSR-[A-Z0-9-]+/`
- `/\bcsv::/`
- `/\bcsv_row[_-]?id\b/i`

例外：Lanhu/Axure error-fallback 路径下的 `confirmation-package.md` 与 `unresolved-summary.md` 不在本 lint 范围。

### manifest.json#case_drafting.requirement_atoms 完整性

- `requirement_atoms` 数组非空
- 每个 atom 含 `atom_id`、`requirement_id`、`case_title`、`priority`、`evidence_kind`、`ambiguity_class`、`confidence`、`source_refs`
- `source_refs` 数组非空
- `priority` 在 `["P0","P1","P2","P3"]` 内
- `evidence_kind` 在 `["prd.file","lanhu.fixture","csv.row","history","manual"]` 内
- `ambiguity_class` 在 `["confirmed","inferred","history_inferred","pending"]` 内

### MD ↔ JSON caseId 双向对账

- MD 中每个 `##### 【P*】<title>` 必须能在 atoms 中通过 `requirement_id + case_title + priority` 三元组找到至少一个 atom
- JSON 中每个 atom 必须能在 MD 中通过同三元组找到对应 `#####` 行
- 双向缺失即 `fail`

### Blocking pending 计数

- 若 manifest.json#case_drafting.status == "blocked" → `archive.md` 与 `cases.xmind` 必须不存在；只允许 `archive.draft.md` / `confirmation-package.md` / `unresolved-summary.md`
- 若 status == "completed" → blocking pending 计数必须为 0

### 历史推断标记

- atom.ambiguity_class == "history_inferred" 的条目必须在 `unresolved-summary.md` 中列出
- 不得把 history_inferred 当作 confirmed 写入 archive.md

## 输出格式

返回 JSON：

```json
{
  "spec_review_status": "pass | fail",
  "issues": [
    { "kind": "sourceref_leaked_in_md | atom_missing | caseid_mismatch | blocking_pending | history_misclassified | structural", "where": "<path>:<line> | <atom_id>", "fix_hint": "..." }
  ],
  "out_of_scope": [...]
}
```
```

Required must-contain strings: `SourceRef`, `SR-`, `csv::`, `requirement_atoms`, `MD ↔ JSON caseId`, `Blocking pending`, `spec_review_status`.

- [ ] **Step 2: Append to skill.yaml**

```yaml
  - path: references/spec-reviewer-prompt.md
    type: normative
    load_phases:
      - case-draft
    purpose: case-draft 阶段产物 spec 合规机械检查；SourceRef 分层 / caseId 对账 / blocking pending。
    load_when: step.id == case-draft
```

- [ ] **Step 3: Render + test**

Run: `engine/bin/kata ai-core projection render && bun test --cwd engine tests/ai-core/case-draft-orchestration.test.ts`

Expected: 3/4 first-it assertions pass; 5th `it` (spec-reviewer prompt patterns) now PASS.

- [ ] **Step 4: Commit**

```bash
git add .ai/core/skills/case-draft/references/spec-reviewer-prompt.md \
        .ai/core/skills/case-draft/skill.yaml \
        .claude/skills/case-draft/
git commit -m "feat(case-draft): add spec-reviewer-prompt with SourceRef layering lint"
```

---

### Task 15: 新增 case-draft quality-reviewer-prompt.md

**Files:**
- Create: `.ai/core/skills/case-draft/references/quality-reviewer-prompt.md`
- Modify: `.ai/core/skills/case-draft/skill.yaml`

- [ ] **Step 1: Write quality-reviewer-prompt.md**

Create `.ai/core/skills/case-draft/references/quality-reviewer-prompt.md`:

```markdown
# Quality Reviewer Prompt — case-draft

派 fresh Agent 执行。审查用例内容质量（不重复 spec reviewer 的结构检查）。

## 硬规则优先

你的检查项不得违反 `SKILL.md` 中的硬规则。若检查项与硬规则冲突，记为 `out_of_scope` 而非 `issue`。

## 检查项

### 用例步骤完整性

- 每个用例必须有 `> 前置条件` 与 `> 用例步骤` 两个 block
- 步骤表表头必须严格为 `| 编号 | 步骤 | 预期 |`
- 步骤 ≥ 1；预期 ≥ 1
- 空前置条件渲染为 `无` 包在 fenced code block 中

### case_title 表意

- 不允许 `测试1`、`case1`、`新增`、`修改` 等无信息标题
- 必须含被测对象、动作、期望（或 P 等级前缀）

### 覆盖矩阵

- atom 与 case 的映射应覆盖 `confirmed` 与 `inferred` 两类；history_inferred 不计入覆盖
- 同一 requirement 下至少有一个 P0 或 P1

### 表述一致性

- 同一对象名（如「数据源」「数据库」「数据表」）在同一 feature 内拼写一致
- 不得混用全角/半角括号
- 优先使用「」引用对象名

## 输出格式

返回 JSON：

```json
{
  "quality_review_status": "pass | fail",
  "issues": [
    { "severity": "high | medium | low", "category": "step | title | coverage | consistency", "where": "...", "evidence": "...", "fix_hint": "..." }
  ],
  "out_of_scope": [...]
}
```

high 必须修；medium/low 可通过。
```

Required must-contain strings: `用例步骤完整性`, `case_title`, `覆盖矩阵`, `表述一致性`, `quality_review_status`.

- [ ] **Step 2: Append to skill.yaml**

```yaml
  - path: references/quality-reviewer-prompt.md
    type: normative
    load_phases:
      - case-draft
    purpose: case-draft 用例内容质量审查；步骤、标题、覆盖、表述一致性。
    load_when: step.id == case-draft
```

- [ ] **Step 3: Render + test**

Run: `engine/bin/kata ai-core projection render && bun test --cwd engine tests/ai-core/case-draft-orchestration.test.ts`

Expected: 4/4 first-it assertions pass; spec-reviewer assertions pass.

- [ ] **Step 4: Commit**

```bash
git add .ai/core/skills/case-draft/references/quality-reviewer-prompt.md \
        .ai/core/skills/case-draft/skill.yaml \
        .claude/skills/case-draft/
git commit -m "feat(case-draft): add quality-reviewer-prompt reference"
```

---

### Task 16: 修改 case-draft skill.yaml — routing_summary + SourceRef 硬规则

**Files:**
- Modify: `.ai/core/skills/case-draft/skill.yaml`

- [ ] **Step 1: Locate the SourceRef hard_rule to replace**

Run:

```bash
grep -n "证据事实必须引用 SourceRef ID" .ai/core/skills/case-draft/skill.yaml
```

Note the line number(s). The original rule is short; you will replace it with the multi-line version.

- [ ] **Step 2: Edit skill.yaml hard_rule for SourceRef layering**

In `.ai/core/skills/case-draft/skill.yaml` `body.always_load.hard_rules`, replace the bullet exactly matching:

```yaml
      - 证据事实必须引用 SourceRef ID。
```

with:

```yaml
      - 证据事实必须在 manifest.json#case_drafting.requirement_atoms 中引用 SourceRef ID。archive.md 中每条 `##### 【P*】<title>` 用例必须对应至少一个 atom，atom 必须含 SourceRef、evidence_kind、ambiguity_class、confidence；`atom.requirement_id + atom.case_title + atom.priority` 三元组必须与 MD 标题双向解析一致。archive.md / archive.draft.md / cases.xmind 正文不得显式包含 `SourceRef`、`SR-<ID>`、`csv::` 前缀、CSV 文件名或 CSV 行号。Lanhu/Axure 阻塞草稿的 `confirmation-package.md` / `unresolved-summary.md` 在 error-fallback 路径下豁免，仍按现有硬规则保留 URL token 表与 SourceRef ID。
```

- [ ] **Step 3: Locate and edit routing_summary**

Find `routing_summary:` in `.ai/core/skills/case-draft/skill.yaml`. Append a new bullet (preserve existing bullets):

```yaml
      - 阶段内任务编排：source-intake 与 module-identify 完成且不在 Lanhu/Axure error-fallback 路径下时，按 references/execution-protocol.md 创建 TodoWrite、按 references/worker-prompt.md 派发 Worker、按 references/spec-reviewer-prompt.md 与 references/quality-reviewer-prompt.md 二阶段审查；Lanhu/Axure 阻塞草稿、source-intake 抓取静默期与所有 BlockedEnvelope 路径下禁用。
```

- [ ] **Step 4: Render projection**

Run: `engine/bin/kata ai-core projection render`

Expected: case-draft rendered; no errors.

- [ ] **Step 5: Run full orchestration contract test**

Run: `bun test --cwd engine tests/ai-core/case-draft-orchestration.test.ts`

Expected: ALL assertions PASS.

- [ ] **Step 6: Verify nothing else regressed in case-draft surface**

Run: `bun test --cwd engine tests/ai-core/case-draft-evals.test.ts`

Expected: PASS (no behavioral regression on existing evals).

- [ ] **Step 7: Commit**

```bash
git add .ai/core/skills/case-draft/skill.yaml \
        .claude/skills/case-draft/
git commit -m "feat(case-draft): declare orchestration mode and SourceRef MD/JSON layering"
```

---

### Task 17: case-draft 硬规则 sha256 baseline 重 pin

**Files:**
- Create: `engine/tests/ai-core/case-draft-hardrules-regression.test.ts`

- [ ] **Step 1: Capture new sha256 baseline**

Run from repo root:

```bash
bun -e "import {readFileSync} from 'node:fs'; import {parse} from 'yaml'; import {createHash} from 'node:crypto'; const y = parse(readFileSync('.ai/core/skills/case-draft/skill.yaml','utf8')); const hr = y.body.always_load.hard_rules.join('\n'); console.log('sha256', createHash('sha256').update(hr).digest('hex')); console.log('count', y.body.always_load.hard_rules.length);"
```

Record sha256 and count.

- [ ] **Step 2: Write regression test**

Create `engine/tests/ai-core/case-draft-hardrules-regression.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { parse } from "yaml";

const root = join(import.meta.dirname, "../../..");

describe("case-draft hard_rules regression", () => {
  // Baseline captured AFTER the SourceRef layering rule rewrite in Task 16.
  const BASELINE_SHA256 = "<PASTE_FROM_STEP_1>";
  const BASELINE_COUNT = <PASTE_FROM_STEP_1>;

  it("hard_rules array length is unchanged from the post-Task-16 baseline", () => {
    const yaml = parse(readFileSync(join(root, ".ai/core/skills/case-draft/skill.yaml"), "utf8")) as any;
    expect(yaml.body.always_load.hard_rules.length).toBe(BASELINE_COUNT);
  });

  it("hard_rules joined sha256 is unchanged from the post-Task-16 baseline", () => {
    const yaml = parse(readFileSync(join(root, ".ai/core/skills/case-draft/skill.yaml"), "utf8")) as any;
    const joined = yaml.body.always_load.hard_rules.join("\n");
    const sha = createHash("sha256").update(joined).digest("hex");
    expect(sha).toBe(BASELINE_SHA256);
  });
});
```

- [ ] **Step 3: Run regression test**

Run: `bun test --cwd engine tests/ai-core/case-draft-hardrules-regression.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add engine/tests/ai-core/case-draft-hardrules-regression.test.ts
git commit -m "test: pin case-draft hard_rules sha256 baseline post-Task-16"
```

---

### Task 18: workspace SourceRef lint 扩展（lint:cases）

**Files:**
- Modify: `engine/src/cli/cases-lint.ts` 或对应实现（具体路径在 Step 1 查找）

- [ ] **Step 1: Locate the cases lint implementation**

Run:

```bash
grep -rn "cases-lint\|cases lint" engine/src/cli/ engine/src/cases/ 2>/dev/null | head -10
```

Identify the file that holds the lint rule registration (likely `engine/src/cases/lint.ts` or `engine/src/cli/cases-lint.ts`).

- [ ] **Step 2: Add the SourceRef-in-MD lint rule**

Add a new lint rule that scans `workspace/*/features/*/archive.md`, `archive.draft.md`, `cases.xmind` and fails on any line matching `/SourceRef|\bSR-[A-Z0-9-]+|\bcsv::|\bcsv_row[_-]?id\b/i`.

Exception path: if the same feature directory contains `unresolved-summary.md`, exclude `confirmation-package.md` and `unresolved-summary.md` from the scan (error-fallback path).

Rule id: `case-md-sourceref-leak`. Default severity: `fail`.

The exact location depends on Step 1's discovery. Pattern:

```typescript
// In the rules list:
{
  id: "case-md-sourceref-leak",
  severity: "fail",
  scope: "workspace",
  scan: (featureDir) => {
    // exclude error-fallback feature dirs (those containing unresolved-summary.md)
    if (existsSync(join(featureDir, "unresolved-summary.md"))) {
      return { ok: true, hits: [] };
    }
    const targets = ["archive.md", "archive.draft.md"]; // cases.xmind is binary; lint via render check elsewhere
    const re = /SourceRef|\bSR-[A-Z0-9-]+|\bcsv::|\bcsv_row[_-]?id\b/i;
    const hits = targets.flatMap((f) => {
      const p = join(featureDir, f);
      if (!existsSync(p)) return [];
      return readFileSync(p, "utf8")
        .split("\n")
        .map((line, i) => ({ line, n: i + 1 }))
        .filter(({ line }) => re.test(line))
        .map(({ line, n }) => ({ file: f, line: n, snippet: line.trim() }));
    });
    return { ok: hits.length === 0, hits };
  },
}
```

Adjust to the actual rule-registry shape used in the discovered file.

- [ ] **Step 3: Write the lint rule unit test**

Create `engine/tests/cases/lint-sourceref-leak.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Adjust the import to match the discovered lint module
import { runCaseLintRule } from "../../src/cases/lint.ts"; // PLACEHOLDER — replace with real path

describe("case-md-sourceref-leak lint rule", () => {
  it("flags SourceRef strings in archive.md", () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-lint-"));
    writeFileSync(join(dir, "archive.md"), "## v6.4.3\n\nSee SourceRef SR-PRD-001 for evidence.");
    const result = runCaseLintRule("case-md-sourceref-leak", dir);
    expect(result.ok).toBe(false);
    expect(result.hits.length).toBeGreaterThanOrEqual(1);
    expect(result.hits[0].snippet).toContain("SourceRef");
  });

  it("does not flag clean archive.md", () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-lint-"));
    writeFileSync(join(dir, "archive.md"), "## v6.4.3\n\n### 14811 Some requirement\n\n##### 【P0】case title\n");
    const result = runCaseLintRule("case-md-sourceref-leak", dir);
    expect(result.ok).toBe(true);
    expect(result.hits.length).toBe(0);
  });

  it("skips error-fallback dirs (with unresolved-summary.md)", () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-lint-"));
    writeFileSync(join(dir, "archive.draft.md"), "Refers to SR-LANHU-URL-001");
    writeFileSync(join(dir, "unresolved-summary.md"), "## Blocking / Pending\n");
    const result = runCaseLintRule("case-md-sourceref-leak", dir);
    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 4: Run unit test**

Run: `bun test --cwd engine tests/cases/lint-sourceref-leak.test.ts`

Expected: PASS.

- [ ] **Step 5: Run full lint:cases against current workspace**

Run: `bun run lint:cases`

Expected: PASS (current archive.md files were verified clean during brainstorming).

If any feature unexpectedly fails, treat it as a pre-existing leak — investigate before continuing.

- [ ] **Step 6: Commit**

```bash
git add engine/src/cases/ engine/tests/cases/lint-sourceref-leak.test.ts
git commit -m "feat(cases-lint): add case-md-sourceref-leak rule for MD/JSON layering"
```

---

### Task 19: Phase 2 projection lock + CHANGELOG

**Files:**
- Modify: `.ai/core/runtimes/projection-lock.json`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Re-render projection lock**

Run: `engine/bin/kata ai-core projection lock render`

Expected: projection-lock.json updated.

- [ ] **Step 2: Verify projection lock check passes**

Run: `engine/bin/kata ai-core projection lock check`

Expected: exit code 0.

- [ ] **Step 3: Run full ai-core suite**

Run: `bun run test:ai-core`

Expected: all tests pass.

- [ ] **Step 4: Run full ci suite**

Run: `bun run ci`

Expected: every gate passes. If `lint:cases` fails on a historical feature, escalate to user — do not edit historical artifacts inside this Phase.

- [ ] **Step 5: Add CHANGELOG entry**

Edit `CHANGELOG.md`. Under `## Unreleased`, append another bullet under `### Added` (or create the block if absent):

```markdown
- New: `case-draft` skill 引入「阶段内任务编排」协议（execution-protocol / worker-prompt / spec-reviewer-prompt / quality-reviewer-prompt 四份 reference），在 source-intake/module-identify 完成且不在 Lanhu/Axure error-fallback 路径下启用。
- Changed: `case-draft` SourceRef 硬规则升级为 MD/JSON 三层契约 — `archive.md` / `archive.draft.md` / `cases.xmind` 正文禁止 `SourceRef` / `SR-<ID>` / `csv::` / CSV 行号；所有 SourceRef 引用集中在 `manifest.json#case_drafting.requirement_atoms[].source_refs[]`；Lanhu/Axure 阻塞草稿路径豁免（保留 URL token 表）。新增 `case-md-sourceref-leak` workspace lint 规则强制该契约。详见 docs/superpowers/specs/2026-05-18-skill-orchestration-subagent-design.md Phase 2。
```

- [ ] **Step 6: Commit**

```bash
git add .ai/core/runtimes/projection-lock.json CHANGELOG.md
git commit -m "chore: re-lock projection and log Phase 2 changelog entry"
```

---

## Final Verification (Phase 1 + Phase 2 done)

After Task 19:

- [ ] **Run full CI suite end-to-end**

```bash
bun run ci
```

Expected: every gate passes:
- biome lint
- lint:debris
- lint:agents
- lint:paths
- lint:ai-core
- lint:agents:codex
- lint:skills:codex
- type-check
- test (full engine suite)

- [ ] **Run cases lint specifically**

```bash
bun run lint:cases
```

Expected: PASS on all workspace features.

- [ ] **Inspect git log for the two-phase narrative**

```bash
git log --oneline main..HEAD
```

Expected: ~19 commits, each scoped narrowly; Phase 1 commits precede Phase 2 commits; commit messages use `feat(<skill>):` / `test:` / `chore:` / `docs:` prefixes.

- [ ] **Open PR with the spec + plan referenced in the body**

(Out of scope for the implementer subagent — leave for the controller after `superpowers:finishing-a-development-branch`.)

---

## Plan Self-Review (controller checklist)

The controller (you / the SDD orchestrator) verified before dispatching:

**Spec coverage** — every requirement in `2026-05-18-skill-orchestration-subagent-design.md` maps to a task:
- §2 Architecture (三角色 / 调度策略 / 边界) → Tasks 2–5, 12–15
- §3 Three-Layer Artifact Contract → Tasks 10, 14, 16, 18
- §4 New / Modified Files (12-file list) → Tasks 2–6, 9, 12–16, 18, 19
- §5 Hard-Rule Coexistence (Worker 禁用场景、BlockedEnvelope、review loop 上限、reviewer 不越界) → Tasks 2, 12（reference 内容）
- §6 Validation Plan → Tasks 1, 7, 8, 11, 17, 18, 19
- §7 Rollout Sequence (Phase 1 → Phase 2) → 任务分组 by Phase
- §8 Out of Scope → 未引入 engine/src/history-convert.ts 等改动

**Placeholder scan** — every step contains the actual content engineer needs; no TBD / TODO / "implement later". `<PASTE_FROM_STEP_1>` 是显式 placeholder，伴随明确的 capture 命令。

**Type consistency** — reference 内容引用的字段名跨任务一致：`atom_id` / `requirement_id` / `case_title` / `priority` / `evidence_kind` / `ambiguity_class` / `confidence` / `source_refs` 在 Tasks 10 / 11 / 14 / 16 出现拼写一致；status envelope 字段 `DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED` 跨 Tasks 3 / 13 一致。

**Bite-sized** — 每个 step 是单一动作（写文件 / 跑命令 / commit），大多 ≤ 5 分钟。reference 内容是 step 内 inlined 完整模板（不是 placeholder）。

**Frequent commits** — 19 个 task，每个 task 都有 commit step；Phase 1 完成（Task 9）即可独立验证；Phase 2 在 Phase 1 已合并基础上推进。
