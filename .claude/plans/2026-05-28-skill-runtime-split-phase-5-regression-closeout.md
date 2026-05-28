# Skill 运行目录拆分第五阶段 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于当前 `skill-runtime-split-design` worktree 的已实现状态，完成 spec 最终架构的执行收口与回归验证；Phase 3B workflow 和 Phase 4b `.ai/**` 删除的源计划仍分别属于 Phase 3 / Phase 4 文档。

**Architecture:** Phase 5 是 closeout / regression index，不重新定义 Phase 3 的 Workflow+Blackboard 范围，也不重新定义 Phase 4 的 `.ai/**` 停用与删除范围。它只补当前 worktree 仍缺的 Phase 2B runtime native config、Router check、Skill Graph check，并在需要时按 Phase 3 / Phase 4 源计划执行 carryover。完成后，执行面只剩 `.claude/**` 与 `.agents/**` 两套独立维护的 runtime，编排契约集中在 `docs/skills/contracts/**`，检查器集中在 `engine/src/skills/**`。

**Tech Stack:** Bun >= 1.3、TypeScript、commander CLI、`yaml@2.x`、`bun test`、biome、git。

---

## Current State Evidence

This plan is based on the current worktree state observed on 2026-05-28:

| Requirement Area | Current Evidence | Phase 5 Decision |
| --- | --- | --- |
| Phase 1 sync contracts | `docs/skills/contracts/runtime-skill-sync.md`, `runtime-sync.ts`, `check:skills` exist | Do not reimplement; keep in regression matrix |
| Phase 2A runtime detach | `AGENTS.md` / `CLAUDE.md` are ordinary files; runtime generated markers removed | Do not reimplement; keep in regression matrix |
| Phase 2B runtime native config | `find .agents/skills -path '*/agents/openai.yaml'` prints nothing; Claude frontmatter still only uses Phase 1 whitelist except `playwright-cli` baseline | Implement in Phase 5 |
| Router contracts | only `case-draft.yaml` and `case-hotfix.yaml` exist under `docs/skills/contracts/routes`; `engine/src/skills/route-check.ts` is missing | Implement in Phase 5 |
| Skill graph | `docs/skills/contracts/skill-graph.yaml` and `engine/src/skills/skill-graph-check.ts` are missing | Implement in Phase 5 |
| Phase 3A workflow/blackboard | `case-draft.yaml`, `state-model.md`, `blackboard-state.json`, `workflow-check.ts` exist | Do not reimplement; extend to Phase 3B workflows |
| Phase 3B workflows | only `docs/skills/contracts/workflows/case-draft.yaml` exists | Execute Phase 3 plan's "Phase 3B Carryover"; do not redefine workflow ownership here |
| Phase 4a migration | schemas/rules/plugins moved to `docs/skills/contracts/**`; `kata ai-core` is deprecated no-op | Do not reimplement; use as deletion precondition |
| Phase 4b deletion | `.ai`, `engine/src/ai-core`, `engine/tests/ai-core`, `scripts/run-ai-core-lint.ts`, `docs/architecture/ai-core-architecture.md` are still present | Execute Phase 4 plan Task 10-11 only after confirming Phase 4b entry conditions |

## Stage Ownership

- Phase 3 owns Workflow + Blackboard 下沉：`docs/superpowers/plans/2026-05-27-skill-runtime-split-phase-3-workflow-blackboard.md` defines Phase 3A and Phase 3B carryover.
- Phase 4 owns `.ai/**` 停用和删除：`docs/superpowers/plans/2026-05-27-skill-runtime-split-phase-4-ai-core-removal.md` defines Phase 4a read-only/deprecated retention and Phase 4b physical deletion.
- Phase 5 owns final closeout: missing Phase 2B/Router/Graph implementation, execution coordination for documented carryover, and exact-evidence regression reporting.

## Scope Rules

- Do not rewrite Phase 1 / Phase 2A / Phase 3A / Phase 4a implementation unless a Phase 5 test proves a regression.
- Do not move Phase 3B or Phase 4b requirements into Phase 5 as new architecture. Re-open the Phase 3 / Phase 4 source plans before executing Task 5 or Task 6.
- Do not preserve AI Core compatibility. Phase 4b deletion remains Phase 4-owned work and is invoked here only because current worktree has not executed it.
- Do not claim full E2E, all cases, or main flow coverage. The final report must list exact commands, exit codes, passed / failed / skipped counts, and unverified scope.
- If an implementation task touches one runtime prompt under `.claude/**` or `.agents/**`, it must inspect and update the counterpart or write a concrete no-change reason in the final report.

## Files

**Create (Phase 5-owned):**

- `.agents/skills/<skill>/agents/openai.yaml` for each Codex runtime skill that should be implicit-callable.
- `docs/skills/contracts/routes/*.yaml` for every runtime skill that has user-entry semantics.
- `docs/skills/contracts/skill-graph.yaml`.
- `engine/src/skills/route-check.ts`.
- `engine/src/skills/skill-graph-check.ts`.
- `engine/tests/skills/route-check.test.ts`.
- `engine/tests/skills/route-check-repository.test.ts`.
- `engine/tests/skills/skill-graph-check.test.ts`.
- `engine/tests/skills/skill-graph-repository.test.ts`.
- `docs/skills/migrations/phase-5-regression-report.md`.

**Create (by executing Phase 3 source plan):**

- `docs/skills/contracts/workflows/case-edit.yaml`.
- `docs/skills/contracts/workflows/case-hotfix.yaml`.
- `docs/skills/contracts/workflows/playwright-automation.yaml`.
- `docs/skills/workflows/case-edit.md`.
- `docs/skills/workflows/case-hotfix.md`.
- `docs/skills/workflows/playwright-automation.md`.

**Modify:**

- `.claude/skills/*/SKILL.md` for Claude native `when_to_use` frontmatter where useful.
- `.agents/skills/*/SKILL.md` only when descriptions need to stay aligned with new Router contracts.
- `engine/src/skills/frontmatter-policy.ts`.
- `engine/src/skills/runtime-sync.ts`.
- `engine/src/cli/skill-audit.ts`.
- `engine/tests/cli/skills-sync-check.test.ts`.
- `engine/tests/skills/sync-check.test.ts`.

**Modify/Delete (by executing Phase 4 source plan):**

- `engine/src/cli/index.ts`.
- `engine/lib/paths.ts`.
- `package.json`.
- `.github/workflows/*.yml`.
- `README.md`, `README-EN.md`.
- `docs/architecture/kata-project-architecture.md`, `docs/ci-cd.md`.
- Any non-AI-Core source/test still importing `engine/src/ai-core/**`.
- `engine/src/result-types.ts` if non-AI-Core modules still import result types from `engine/src/ai-core/**`.
- `.ai/**`.
- `engine/src/ai-core/**`.
- `engine/tests/ai-core/**`.
- `scripts/run-ai-core-lint.ts`.
- `docs/architecture/ai-core-architecture.md`.

---

## Task 1: Current-State Pre-flight

**Files:**

- Verify only.

- [ ] **Step 1: Confirm current branch and dirty state**

Run:

```bash
git rev-parse --show-toplevel
git rev-parse --abbrev-ref HEAD
git status --short
```

Expected:

- top-level path ends with `.worktrees/skill-runtime-split-design`.
- branch is `codex/skill-runtime-split-design`.
- dirty state is allowed, but record it before edits.

- [ ] **Step 2: Record implemented and missing architecture pieces**

Run:

```bash
for p in .ai engine/src/ai-core engine/tests/ai-core scripts/run-ai-core-lint.ts docs/architecture/ai-core-architecture.md; do
  if [ -e "$p" ]; then echo "present $p"; else echo "missing $p"; fi
done
for p in engine/src/skills/route-check.ts engine/src/skills/skill-graph-check.ts docs/skills/contracts/skill-graph.yaml docs/skills/contracts/routes docs/skills/contracts/workflows docs/skills/blackboard/state-model.md docs/skills/contracts/schemas/blackboard-state.json; do
  if [ -e "$p" ]; then echo "present $p"; else echo "missing $p"; fi
done
find docs/skills/contracts/workflows -maxdepth 1 -type f -name '*.yaml' -print 2>/dev/null | sort
find docs/skills/contracts/routes -maxdepth 1 -type f -name '*.yaml' -print 2>/dev/null | sort
find .agents/skills -path '*/agents/openai.yaml' -print | sort
```

Expected current baseline before implementation:

```text
present .ai
present engine/src/ai-core
present engine/tests/ai-core
present scripts/run-ai-core-lint.ts
present docs/architecture/ai-core-architecture.md
missing engine/src/skills/route-check.ts
missing engine/src/skills/skill-graph-check.ts
missing docs/skills/contracts/skill-graph.yaml
present docs/skills/contracts/routes
present docs/skills/contracts/workflows
present docs/skills/blackboard/state-model.md
present docs/skills/contracts/schemas/blackboard-state.json
docs/skills/contracts/workflows/case-draft.yaml
docs/skills/contracts/routes/case-draft.yaml
docs/skills/contracts/routes/case-hotfix.yaml
```

If output differs, update this plan before continuing.

- [ ] **Step 3: Run current green baseline**

Run:

```bash
bun run check:skills
bun test engine/tests/skills/ engine/tests/cli/skills-sync-check.test.ts
bun test --cwd engine
bun run check
git diff --check
```

Expected:

- `check:skills` exit code `0`, currently with `runtime skill sync passed`, `runtime detach passed`, `workflow check passed`.
- skills tests exit code `0`.
- engine tests exit code `0`.
- `bun run check` exit code `0`, record warning / info counts.
- `git diff --check` exit code `0`.

---

## Task 2: Runtime Native Config Closure

This closes the Phase 2B gap left by Phase 2A and still visible in the current worktree.

**Files:**

- Create: `.agents/skills/*/agents/openai.yaml`.
- Modify: `.claude/skills/*/SKILL.md`.
- Modify: `engine/src/skills/frontmatter-policy.ts`.
- Modify: `engine/src/skills/runtime-sync.ts`.
- Modify: `engine/tests/skills/frontmatter-check.test.ts`.
- Modify: `engine/tests/skills/sync-check.test.ts`.

- [ ] **Step 1: Add failing tests for Claude native frontmatter, Codex openai.yaml, and retired decorative sections**

Extend `engine/tests/skills/frontmatter-check.test.ts` so Claude allows native skill fields:

```typescript
const CLAUDE_FIELDS = [
  "name",
  "description",
  "allowed-tools",
  "when_to_use",
  "model",
  "effort",
  "paths",
  "context",
  "agent",
];
```

Extend `engine/tests/skills/sync-check.test.ts` with tests that create temporary paired runtime skills and assert:

```typescript
test("requires Codex openai.yaml for non-vendor runtime skills", () => {
  const root = makeRoot();
  writeSkill(root, ".claude", "case-draft", {
    frontmatter: "name: case-draft\ndescription: d\nwhen_to_use: use for QA case drafting\n",
  });
  writeSkill(root, ".agents", "case-draft", {
    frontmatter: "name: case-draft\ndescription: d\n",
  });

  const report = checkRuntimeSkillSync(root);
  expect(report.violations.some((v) => v.rule === "CODEX_OPENAI_CONFIG_MISSING")).toBe(true);
});

test("allows Claude when_to_use but rejects it on Codex SKILL.md", () => {
  const root = makeRoot();
  writeSkill(root, ".claude", "case-edit", {
    frontmatter: "name: case-edit\ndescription: d\nwhen_to_use: use when editing existing test artifacts\n",
  });
  writeSkill(root, ".agents", "case-edit", {
    frontmatter: "name: case-edit\ndescription: d\nwhen_to_use: invalid on Codex\n",
  });
  writeCodexOpenAi(root, "case-edit");

  const report = checkRuntimeSkillSync(root);
  expect(report.violations.some((v) => v.rule === "UNSUPPORTED_FRONTMATTER")).toBe(true);
});

test("reports decorative runtime contract sections in SKILL.md", () => {
  // Any of `输出`, `输入`, `允许的工具`, `上下文预算`, `调用图`,
  // `证据策略`, `失败策略`, `*-worker@1`, or `*-prompt@1` must fail.
});
```

Use existing temp-root helper names in the file; if names differ, adapt the test without changing behavior.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
bun test engine/tests/skills/sync-check.test.ts
bun test engine/tests/skills/frontmatter-check.test.ts
```

Expected: FAIL because Codex `openai.yaml`, expanded Claude native frontmatter support, and retired decorative section checks are not implemented yet.

- [ ] **Step 3: Update frontmatter policy**

Modify `engine/src/skills/frontmatter-policy.ts`:

```typescript
const CLAUDE_ALLOWED_FIELDS = new Set([
  "name",
  "description",
  "allowed-tools",
  "when_to_use",
  "model",
  "effort",
  "paths",
  "context",
  "agent",
]);

const CODEX_ALLOWED_FIELDS = new Set(["name", "description", "allowed-tools"]);
```

If the current file uses a different structure, preserve the existing API and only change field sets.

- [ ] **Step 4: Require Codex openai.yaml**

Modify `engine/src/skills/runtime-sync.ts`:

- add violation rule `CODEX_OPENAI_CONFIG_MISSING`;
- skip the rule for vendor/helper skills only when explicitly declared in `runtime-sync-exceptions.yaml`;
- for each `.agents/skills/<skill>/SKILL.md`, require `.agents/skills/<skill>/agents/openai.yaml`;
- parse the file as YAML and require `policy.allow_implicit_invocation` to be a boolean.
- reject retired decorative runtime sections in `SKILL.md`: `输出`、`输入`、`允许的工具`、`上下文预算`、`调用图`、`证据策略`、`失败策略` and legacy `*-worker@1` / `*-prompt@1` call graph markers.

The minimal valid content is:

```yaml
policy:
  allow_implicit_invocation: true
```

- [ ] **Step 5: Add Codex config files**

Create these files:

```text
.agents/skills/bug-file/agents/openai.yaml
.agents/skills/case-draft/agents/openai.yaml
.agents/skills/case-edit/agents/openai.yaml
.agents/skills/case-hotfix/agents/openai.yaml
.agents/skills/conflict-analyze/agents/openai.yaml
.agents/skills/diff-scan/agents/openai.yaml
.agents/skills/infra-diagnose/agents/openai.yaml
.agents/skills/knowledge-curate/agents/openai.yaml
.agents/skills/playwright-automation/agents/openai.yaml
.agents/skills/playwright-cli/agents/openai.yaml
.agents/skills/workspace-manage/agents/openai.yaml
```

Use this content for user-facing skills:

```yaml
policy:
  allow_implicit_invocation: true
```

For `playwright-cli`, use:

```yaml
policy:
  allow_implicit_invocation: false
```

- [ ] **Step 6: Add Claude native frontmatter**

For every `.claude/skills/*/SKILL.md`, add concise native frontmatter immediately after `description`. Every skill needs `when_to_use`; high-risk or complex skills should also use `model` / `effort`; workflow-heavy skills may use `context: fork` + `agent`; path-triggered skills should use `paths`.

```yaml
---
name: case-draft
description: 用户提供 PRD、设计稿、Lanhu、Axure 或功能描述并要求生成 QA 用例。
when_to_use: 用户提供需求文档、设计源或功能描述并要求生成 QA 测试用例时使用。
model: sonnet
effort: high
context: fork
agent: general-purpose
paths:
  - "**/*.md"
  - "**/*.json"
  - "**/*.png"
---
```

Do not add Claude-only frontmatter to `.agents/skills/*/SKILL.md`.

- [ ] **Step 6.5: Remove retired decorative contract sections from runtime SKILL.md**

Remove these sections from both `.claude/skills/*/SKILL.md` and `.agents/skills/*/SKILL.md`:

```text
## 输出
## 输入
## 允许的工具
## 上下文预算
## 调用图
## 证据策略
## 失败策略
```

Do not remove normative references or hard rules that still belong in the runtime skill. Cross-skill relationships belong in `docs/skills/contracts/skill-graph.yaml`; workflow details belong in `docs/skills/contracts/workflows/*.yaml`; Codex tool and implicit invocation metadata belongs in `agents/openai.yaml`.

- [ ] **Step 7: Verify runtime native config**

Run:

```bash
bun test engine/tests/skills/sync-check.test.ts
bun test engine/tests/skills/frontmatter-check.test.ts
rg -n "^## 输出$|^## 输入$|^## 允许的工具$|^## 上下文预算$|^## 调用图$|^## 证据策略$|^## 失败策略$|core_tokens:|reference_tokens:|evidence_tokens:|overflow_policy:|source_refs_required:|stale_ref_policy:|下游 agents:|下游 prompts:|-worker@1|-prompt@1" .claude/skills/*/SKILL.md .agents/skills/*/SKILL.md
bun run check:skills
```

Expected:

- test exit code `0`;
- `rg` exit code `1`, no matches;
- `check:skills` exit code `0`.

---

## Task 3: Router Contract and Route Check

This closes the route-check gap deferred from Phase 1/2 and still missing in the current worktree.

**Files:**

- Create/Modify: `docs/skills/contracts/routes/*.yaml`.
- Create: `engine/src/skills/route-check.ts`.
- Create: `engine/tests/skills/route-check.test.ts`.
- Create: `engine/tests/skills/route-check-repository.test.ts`.
- Modify: `engine/src/cli/skill-audit.ts`.
- Modify: `engine/tests/cli/skills-sync-check.test.ts`.

- [ ] **Step 1: Add route contracts for all runtime skills**

Ensure `docs/skills/contracts/routes/` contains one YAML file per runtime skill directory:

```text
bug-file.yaml
case-draft.yaml
case-edit.yaml
case-hotfix.yaml
conflict-analyze.yaml
diff-scan.yaml
infra-diagnose.yaml
knowledge-curate.yaml
playwright-automation.yaml
playwright-cli.yaml
workspace-manage.yaml
```

Each file must include:

```yaml
skill: case-edit
entry: /case-edit
should_trigger:
  - "把这个已有 Archive 同步成 XMind"
should_not_trigger:
  - "根据这个 PRD 生成一套新测试用例"
clarify:
  - "帮我处理一下这个用例文件"
```

Use skill-specific examples; do not copy `case-edit` examples into every file.

- [ ] **Step 2: Add route-check tests**

Create `engine/tests/skills/route-check.test.ts` with fixture coverage for:

- passes when every runtime skill has a matching route YAML;
- fails with `ROUTE_CONTRACT_MISSING` when a runtime skill lacks a route file;
- fails with `ROUTE_SAMPLE_MISSING` when any of `should_trigger`, `should_not_trigger`, or `clarify` is empty;
- fails with `ROUTE_ENTRY_MISMATCH` when `entry` does not match `/${skill}`.

Create `engine/tests/skills/route-check-repository.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { repoRoot } from "../../lib/paths.ts";
import { checkRoutes, formatRouteCheckReport } from "../../src/skills/route-check.ts";

describe("repository route contracts", () => {
  test("route contracts cover every runtime skill", () => {
    const root = repoRoot();
    const report = checkRoutes(root);
    expect(formatRouteCheckReport(report, root)).toBe("route check passed");
  });
});
```

- [ ] **Step 3: Implement route-check**

Create `engine/src/skills/route-check.ts` exporting:

```typescript
export type RouteCheckRule =
  | "ROUTE_CONTRACT_MISSING"
  | "ROUTE_PARSE_ERROR"
  | "ROUTE_SKILL_MISMATCH"
  | "ROUTE_ENTRY_MISMATCH"
  | "ROUTE_SAMPLE_MISSING";

export interface RouteCheckReport {
  passed: boolean;
  violations: RouteCheckViolation[];
}

export function checkRoutes(root: string): RouteCheckReport;
export function formatRouteCheckReport(report: RouteCheckReport, root: string): string;
```

Implementation requirements:

- collect skill names from `.claude/skills` and `.agents/skills`;
- require `docs/skills/contracts/routes/<skill>.yaml` for each name;
- parse YAML with `yaml`;
- require `skill`, `entry`, `should_trigger`, `should_not_trigger`, and `clarify`;
- format pass as exactly `route check passed`.

- [ ] **Step 4: Wire route-check into `skills sync-check`**

Modify `engine/src/cli/skill-audit.ts` so `sync-check` runs:

```typescript
const routeReport = checkRoutes(root);
```

and includes:

```typescript
formatRouteCheckReport(routeReport, root)
```

in the printed report. Overall pass must require `routeReport.passed`.

Update `engine/tests/cli/skills-sync-check.test.ts` to assert:

```typescript
expect(result.stdout).toContain("route check passed");
```

- [ ] **Step 5: Verify Router**

Run:

```bash
bun test engine/tests/skills/route-check.test.ts engine/tests/skills/route-check-repository.test.ts engine/tests/cli/skills-sync-check.test.ts
bun run check:skills
```

Expected:

- tests exit code `0`;
- `check:skills` exit code `0`, output includes `route check passed`.

---

## Task 4: Skill Graph Contract and Check

This closes spec §11, which has no implementation in the current worktree.

**Files:**

- Create: `docs/skills/contracts/skill-graph.yaml`.
- Create: `engine/src/skills/skill-graph-check.ts`.
- Create: `engine/tests/skills/skill-graph-check.test.ts`.
- Create: `engine/tests/skills/skill-graph-repository.test.ts`.
- Modify: `engine/src/cli/skill-audit.ts`.
- Modify: `engine/tests/cli/skills-sync-check.test.ts`.

- [ ] **Step 1: Add skill graph contract**

Create `docs/skills/contracts/skill-graph.yaml` with entries for every runtime skill. Minimum structure:

```yaml
skills:
  case-draft:
    user_entry: /case-draft
    consumes: [prd-source, lanhu-source, axure-source, user-input]
    produces: [archive-md, xmind, metadata, manifest, source-refs]
    related: [case-edit, playwright-automation, knowledge-curate]
```

Every runtime skill must declare:

- `user_entry`;
- non-empty `consumes`;
- non-empty `produces`;
- `related` as an array, which may be empty for helper skills.

- [ ] **Step 2: Add skill graph tests**

Create `engine/tests/skills/skill-graph-check.test.ts` with fixture coverage for:

- pass when graph covers every runtime skill;
- `SKILL_GRAPH_MISSING` when the file is absent;
- `SKILL_GRAPH_ENTRY_MISSING` when a runtime skill is not listed;
- `SKILL_GRAPH_FIELD_MISSING` when `consumes` or `produces` is empty;
- `SKILL_GRAPH_RELATED_UNKNOWN` when `related` points to a missing skill.

Create `engine/tests/skills/skill-graph-repository.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { repoRoot } from "../../lib/paths.ts";
import {
  checkSkillGraph,
  formatSkillGraphCheckReport,
} from "../../src/skills/skill-graph-check.ts";

describe("repository skill graph", () => {
  test("skill graph covers every runtime skill", () => {
    const root = repoRoot();
    const report = checkSkillGraph(root);
    expect(formatSkillGraphCheckReport(report, root)).toBe("skill graph check passed");
  });
});
```

- [ ] **Step 3: Implement graph check**

Create `engine/src/skills/skill-graph-check.ts` exporting:

```typescript
export type SkillGraphCheckRule =
  | "SKILL_GRAPH_MISSING"
  | "SKILL_GRAPH_PARSE_ERROR"
  | "SKILL_GRAPH_ENTRY_MISSING"
  | "SKILL_GRAPH_UNEXPECTED_ENTRY"
  | "SKILL_GRAPH_FIELD_MISSING"
  | "SKILL_GRAPH_RELATED_UNKNOWN";

export function checkSkillGraph(root: string): SkillGraphCheckReport;
export function formatSkillGraphCheckReport(report: SkillGraphCheckReport, root: string): string;
```

Implementation requirements:

- collect runtime skill names from both runtime directories;
- parse `docs/skills/contracts/skill-graph.yaml`;
- require exact graph coverage for the runtime skill set;
- validate `related` targets exist;
- format pass as exactly `skill graph check passed`.

- [ ] **Step 4: Wire graph check into `skills sync-check`**

Modify `engine/src/cli/skill-audit.ts` so `sync-check` runs `checkSkillGraph(root)` and prints `formatSkillGraphCheckReport(...)`. Overall pass must require graph pass.

Update `engine/tests/cli/skills-sync-check.test.ts`:

```typescript
expect(result.stdout).toContain("skill graph check passed");
```

- [ ] **Step 5: Verify Graph**

Run:

```bash
bun test engine/tests/skills/skill-graph-check.test.ts engine/tests/skills/skill-graph-repository.test.ts engine/tests/cli/skills-sync-check.test.ts
bun run check:skills
```

Expected:

- tests exit code `0`;
- `check:skills` exit code `0`, output includes `skill graph check passed`.

---

## Task 5: Execute Phase 3B Carryover From Phase 3 Plan

This task does not define new Phase 5 workflow scope. It executes the Phase 3 source plan section:

`docs/superpowers/plans/2026-05-27-skill-runtime-split-phase-3-workflow-blackboard.md` → `Phase 3B Carryover — 剩余 Workflow YAML 下沉`

**Files:** Use the file list in the Phase 3B Carryover section.

- [ ] **Step 1: Re-open the Phase 3 source plan**

Run:

```bash
rg -n "Phase 3B Carryover|剩余 Workflow YAML 下沉|case-edit|case-hotfix|playwright-automation" docs/superpowers/plans/2026-05-27-skill-runtime-split-phase-3-workflow-blackboard.md
```

Expected: output shows the Phase 3B Carryover section and its workflow file list.

- [ ] **Step 2: Execute the Phase 3B steps from the source plan**

Implement only what the Phase 3B Carryover section specifies:

- workflow YAML + review docs for `case-edit`, `case-hotfix`, and `playwright-automation`;
- `## Workflow` references in both `.claude/**` and `.agents/**` skill files;
- no blackboard schema rewrite unless a workflow validation failure proves the schema is missing a required slot.

- [ ] **Step 3: Verify Phase 3B carryover**

Run:

```bash
bun test engine/tests/skills/workflow-schema.test.ts engine/tests/skills/workflow-check.test.ts engine/tests/skills/workflow-check-repository.test.ts engine/tests/skills/blackboard-schema.test.ts
bun run check:skills
```

Expected:

- tests exit code `0`;
- `check:skills` exit code `0`, output includes `workflow check passed`.

---

## Task 6: Execute Phase 4b From Phase 4 Plan

This task does not define new Phase 5 deletion scope. It executes the Phase 4 source plan tasks:

`docs/superpowers/plans/2026-05-27-skill-runtime-split-phase-4-ai-core-removal.md` → `Task 10: Phase 4b — 物理删除 .ai/**` and `Task 11: Phase 4b — 清理旧 projection 兼容代码与总回归`

**Files:** Use the file list in Phase 4 Task 10-11.

- [ ] **Step 1: Re-open the Phase 4 source plan**

Run:

```bash
rg -n "Task 10: Phase 4b|Task 11: Phase 4b|物理删除|旧 projection|SKILL \\+ Router \\+ Graph \\+ Workflow \\+ Blackboard" docs/superpowers/plans/2026-05-27-skill-runtime-split-phase-4-ai-core-removal.md
```

Expected: output shows Phase 4b physical deletion and old projection cleanup tasks.

- [ ] **Step 2: Confirm Phase 4b entry condition**

Confirm one of these before deleting files:

- Phase 4a has passed at least one PR cycle; record the PR/merge evidence.
- The user explicitly authorizes executing Phase 4b in this closeout branch; record the authorization in the final report.

- [ ] **Step 3: Execute Phase 4 Task 10 and Task 11**

Follow the exact deletion, rewrite, and verification steps in the Phase 4 source plan. Do not keep `.ai/**`, `kata ai-core`, projection commands, or compatibility fallback.

- [ ] **Step 4: Verify Phase 4b carryover**

Run the Phase 4 source plan verification commands and record exact evidence:

```bash
test ! -e .ai
test ! -e engine/src/ai-core
test ! -e engine/tests/ai-core
test ! -e scripts/run-ai-core-lint.ts
test ! -e docs/architecture/ai-core-architecture.md
bun run check:skills
bun test --cwd engine
bun run check
git diff --check
```

Expected:

- old paths do not exist;
- `check:skills`, engine tests, biome check, and diff whitespace check exit code `0`;
- final report records pass/fail/skipped counts and any unverified scope.

---

## Task 7: Entrypoint Rule Narrowing

**Files:**

- Modify: `AGENTS.md`.
- Modify: `CLAUDE.md`.
- Verify: README/docs/runtime skill files do not duplicate the entrypoint-only rule.

- [ ] **Step 1: Keep the cross-runtime edit rule only in entrypoint files**

Both `AGENTS.md` and `CLAUDE.md` must include this rule:

```markdown
修改 `.claude/**` 或 `.agents/**` 中任一 runtime 提示词、reference、script、workflow 或路由规则时，必须同步评估并修改另一套 agent 架构中的对应提示词；若确认另一侧无需变更，提交说明必须写明具体理由。
```

Do not copy this exact rule into README, architecture docs, or every skill file.

- [ ] **Step 2: Verify rule placement**

Run:

```bash
rg -n "修改 `.claude/\\*\\*` 或 `.agents/\\*\\*` 中任一 runtime 提示词" AGENTS.md CLAUDE.md
rg -n "修改 `.claude/\\*\\*` 或 `.agents/\\*\\*` 中任一 runtime 提示词" README.md README-EN.md docs .claude .agents
```

Expected:

- first command exits `0` and only hits `AGENTS.md` and `CLAUDE.md`;
- second command exits `1`, no output.

---

## Task 8: Final Regression and Reports

**Files:**

- Create: `docs/skills/migrations/phase-5-regression-report.md`.

- [ ] **Step 1: Create regression report**

Create `docs/skills/migrations/phase-5-regression-report.md`:

```markdown
# Phase 5 Regression Report

Date: 2026-05-28
Scope: final runtime split closeout based on current worktree gaps.

## Architecture Result

- Runtime prompts: `.claude/**` and `.agents/**`
- Codex native config: `.agents/skills/*/agents/openai.yaml`
- Shared contracts: `docs/skills/contracts/**`
- Validators: `engine/src/skills/**`
- Removed: `.ai/**`, AI Core source/tests, projection CLI, compatibility scripts

## Verification Summary

| Command | Exit code | Passed | Failed | Skipped | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| `bun run check:skills` |  |  |  |  |  |
| `bun test engine/tests/skills/ engine/tests/cli/skills-sync-check.test.ts` |  |  |  |  |  |
| `bun test engine/tests/plugin-loader.test.ts engine/tests/config.test.ts engine/tests/test-case-flow/case-draft-cli.test.ts engine/tests/plugins/plugin-utils.test.ts engine/tests/plugins/sandbox-runner.test.ts engine/tests/security-command-hardening.test.ts engine/tests/lib/paths.test.ts` |  |  |  |  |  |
| `bun test engine/tests/schemas/feature-manifest.test.ts engine/tests/schemas/feature-metadata.test.ts engine/tests/schemas/handoff-v2.test.ts engine/tests/schemas/source-ref-registry.test.ts engine/tests/schemas/loaders.test.ts engine/tests/schemas/source-snapshot.test.ts engine/tests/cli/handoff-render.test.ts engine/tests/lint/source-ref-registry.test.ts` |  |  |  |  |  |
| `bun test --cwd engine` |  |  |  |  |  |
| `bun run check` |  |  |  |  |  |
| `bun run type-check` |  |  |  |  |  |
| `git diff --check` |  |  |  |  |  |

## Unverified Scope

- Broader customer/product UI flows are not covered unless a command above explicitly runs them.
- Any command not listed above was not executed.
```

- [ ] **Step 2: Run final command matrix**

Run:

```bash
bun run check:skills
bun test engine/tests/skills/ engine/tests/cli/skills-sync-check.test.ts
bun test engine/tests/plugin-loader.test.ts engine/tests/config.test.ts engine/tests/test-case-flow/case-draft-cli.test.ts engine/tests/plugins/plugin-utils.test.ts engine/tests/plugins/sandbox-runner.test.ts engine/tests/security-command-hardening.test.ts engine/tests/lib/paths.test.ts
bun test engine/tests/schemas/feature-manifest.test.ts engine/tests/schemas/feature-metadata.test.ts engine/tests/schemas/handoff-v2.test.ts engine/tests/schemas/source-ref-registry.test.ts engine/tests/schemas/loaders.test.ts engine/tests/schemas/source-snapshot.test.ts engine/tests/cli/handoff-render.test.ts engine/tests/lint/source-ref-registry.test.ts
bun test --cwd engine
bun run check
bun run type-check
git diff --check
```

Expected:

- record exact command, exit code, passed / failed / skipped counts;
- if `bun run type-check` still fails due existing repo type debt, record the first error and do not claim type-check or CI passed.

- [ ] **Step 3: Verify final architecture drift**

Run:

```bash
test ! -e .ai
test ! -e engine/src/ai-core
test ! -e engine/tests/ai-core
test ! -e scripts/run-ai-core-lint.ts
rg -n "AI Core|ai-core|kata ai-core|lint:ai-core|test:ai-core|\.ai/|\.ai/core|projection|投影|历史兼容|保留待删除|deprecated compatibility|historical compatibility" README.md README-EN.md docs/architecture docs/ci-cd.md docs/skills/contracts docs/skills/blackboard docs/skills/workflows AGENTS.md CLAUDE.md .claude .agents engine/src engine/tests scripts package.json .github
```

Expected:

- all `test ! -e` commands exit `0`;
- `rg` exits `1` with no output for current architecture files.

- [ ] **Step 4: Fill report and check scope wording**

Run:

```bash
rg -n "\|  \||full E2E|all cases|main flow passed|全部通过|全量通过" docs/skills/migrations/phase-5-regression-report.md
git diff --check
```

Expected:

- first command exits `1`;
- `git diff --check` exits `0`.

---

## Self-Review Checklist

- [x] Phase 5 is based on the current worktree state, not an abstract final state.
- [x] Phase 1 / 2A / 3A / 4a completed work is not reimplemented.
- [x] Current missing route-check and skill-graph work is included.
- [x] Current missing Phase 3B workflows are referenced from the Phase 3 source plan, not redefined as new Phase 5 scope.
- [x] Current missing Phase 4b deletion is referenced from the Phase 4 source plan, not redefined as new Phase 5 scope.
- [x] Phase 2B runtime-native config is included because current Codex skills have no `agents/openai.yaml`, Claude frontmatter has not moved beyond the Phase 1 whitelist, and runtime `SKILL.md` still contains retired decorative contract sections.
- [x] Final regression requires exact evidence and does not claim broader E2E scope.
