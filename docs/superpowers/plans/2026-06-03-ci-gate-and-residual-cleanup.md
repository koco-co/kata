# CI 安全网 + 残留清理 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在已合并的 runtime-cleanup 之上接通 CI 安全网、清漏网死代码、把 type-check 修绿当硬闸门、把 biome 正确性规则提到 error，并纠正说谎文档。

**Architecture:** 五批顺序执行（B0 preflight → B1 删死代码 → B2 闸门质量 → B3 接 CI → B4 文档，B4 可并行）。每批在 detached worktree 内分任务 commit，每任务跑相关验证命令。最终以 `bun run ci` 端到端绿收口。

**Tech Stack:** Bun 1.3 + TypeScript、biome 2.4、GitHub Actions、commander CLI、kata 自研 CLI。

**关联：** spec `docs/superpowers/specs/2026-06-03-ci-gate-and-residual-cleanup-design.md`（已提交 810679386）；承接 `docs/audit/2026-06-02-runtime-audit.md`（D/A/B/C 已合并）。

---

## ⚠️ 已核实的当前基线（执行前必读，覆盖 spec 里的旧数）

spec 里写的 `bun test 1398 pass` 是 **runtime-cleanup 合并前**的过时数。合并删了大批测试后，且并行会话改 `project-workflow-rules.md` 弄红了一个契约测试，**当前 HEAD 实测真实基线为：**

| 闸门 | 当前（B0 前） | B0 修复后应为 |
|---|---|---|
| `bun test` | **1231 pass / 1 skip / 1 fail** | 1232 pass / 1 skip / 0 fail |
| `bun run check:skills` | 🔴 **FAIL**（runtime detach 契约） | ✅ PASS |
| `bun run type-check` | 198 errors | 198（B0 不动类型） |
| `bun run check`（biome） | exit 0，153 warnings | 不变 |

**那 1 个 fail = `repository runtime detach contract`**：`runtime-detach.ts:54` 要求 `project-workflow-rules.md` 精确含子串 `` | `refactor` | `✨` | ``（单空格），但并行会话把 commit 表做了列对齐，emoji 列变成双空格，导致失配。B0 修它。

**后续批次的 `bun test` 绝对数全部重锚到 1232（B0 后）**，不是 spec 草稿里基于 1398 的数：B1 删 45 个用例 → 1187；B3 给 lint:agents 加 1 个测试 → +1。每个删除/加测试任务**先在 worktree 捕获当前真实总数再做加减**，不要硬背绝对值。

---

## 文件结构总览

| 路径 | 动作 | 职责 |
|---|---|---|
| `.claude/rules/project-workflow-rules.md` | modify | B0：commit 表 emoji 列改回单空格，恢复 runtime-detach 子串契约 |
| `.claude/scripts/_shared/lib/progress-store.ts` | delete | 632-line bottom-layer progress engine store; zero repo-wide consumers after cli/progress.ts was removed in the prior B batch; type-clean but dead. |
| `.claude/scripts/_shared/lib/progress-types.ts` | delete | 88-line shared types for the progress engine; only imported by progress-store.ts and its test, both deleted in this task. |
| `.claude/scripts/_shared/tests/lib/progress-store.test.ts` | delete | 789-line test; sole importer of the two deleted lib files; carries all 16 of the type errors B1 removes; contributes 40 passing test cases. |
| `.claude/scripts/_shared/lint/path-treatment.ts` | modify | Remove the line-43 EXCLUDED_PATH_FRAGMENTS allowlist entry that exempted the now-deleted progress-store.test.ts from the P-S3 path-lint rule. (Edit in Task 1, same commit as the progress-store deletion.) |
| `.claude/scripts/_shared/lib/features/paths.ts` | delete | 16-line dead duplicate of lib/paths.ts feature-path helpers; behavior diverges (ignores KATA_WORKSPACE_ROOT override); zero consumers outside its own test. |
| `.claude/scripts/_shared/tests/features/paths.test.ts` | delete | 28-line test; sole consumer of lib/features/paths.ts; contributes 5 passing test cases. Sibling files run-id.test.ts/slug.test.ts/slug-derive.test.ts in the same dir do NOT depend on paths.ts and stay. |
| `tsconfig.json` | modify | Add the two intentionally-malformed fixture directories to the exclude array so tsc stops type-checking ~132 deliberately-broken fixture files, while keeping all real .test.ts files (which live outside the fixtures/ subdirs) in the program. |
| `.claude/scripts/_shared/cli/index.ts` | modify | Fix two production type errors: (1) line 79 action callback returning Promise<Command> instead of void\|Promise<void>; make it async and await without returning the value. (2) line 132 writing internal _hidden field not on Command's public typing; narrow-cast to expose _hidden (behavior-identical to commander's own addCommand(cmd,{hidden:true})). |
| `.claude/scripts/_shared/cli/repo-sync.ts` | modify | Fix line 195: the ternary's non-undefined branch reads projects[project].repo_profiles which TS still widens to Record<...>\|undefined; tighten the guard so the assigned value is provably Record<...> (no undefined). |
| `.claude/skills/knowledge-curate/scripts/knowledge-curate/write.ts` | modify | Fix line 204: snapshotName (string\|null) passed into buildAuditRecord's snapshot:string param; coerce with `snapshotName ?? ""` matching the existing empty-string "no backup" sentinel used for empty hashes. |
| `.claude/scripts/_shared/tests/xmind/gen.test.ts` | modify | Fix 11 errors: readContentJson null contentFile (line 35), and possibly-undefined navigation nodes rootTopic/root/l1/l2/l3/l4SubGroup/caseNode (lines 312,315,428,430,432,434,436,440,441,442,445). |
| `.claude/scripts/_shared/tests/xmind/patch.test.ts` | modify | Fix 7 errors: readContentJson null contentFile (line 64), possibly-undefined match (lines 117-120), SheetNode\|undefined passed to findByTitle (line 229), and possibly-undefined caseNode (line 231). |
| `.claude/scripts/_shared/tests/history-convert.test.ts` | modify | Fix 6 errors: possibly-undefined result (lines 110,111,112,126) and converted (lines 428,454) from Array.find. |
| `.claude/scripts/_shared/tests/case-signal-analyzer.test.ts` | modify | Fix 6 errors: type runCli return so stdout/stderr are string (covers lines 68,71,94,162,164) and cast knowledge.level to string at line 86. |
| `.claude/scripts/_shared/tests/writer-context-builder.test.ts` | modify | Fix 5 errors: possibly-undefined out.knowledge.core access at lines 449,453,657,658. |
| `.claude/scripts/_shared/tests/test-case-flow/project-resolver.test.ts` | modify | Fix 4 errors: union return of resolveProject not narrowable; cast to correct branch at lines 7,12,21,29. |
| `.claude/scripts/_shared/tests/format-report-locator.test.ts` | modify | Fix 1 error: possibly-undefined fc01Issue at line 107. |
| `.claude/scripts/_shared/tests/search-filter.test.ts` | modify | Fix 1 error: possibly-undefined suiteA at line 199. |
| `.claude/scripts/_shared/tests/large-file-split.test.ts` | modify | Fix 1 error: node.name typed unknown after 'name' in node; cast for ts.isIdentifier/.text at line 61. |
| `.claude/scripts/_shared/tests/lib/create-project.test.ts` | modify | Fix 1 error: literal '_shared/rules' not in gitkeep_dirs element type at line 158; widen includes arg via cast. |
| `.claude/scripts/_shared/tests/lib/env.test.ts` | modify | Fix 1 error: process.env key narrowed to undefined after delete at line 140; cast actual to string\|undefined. |
| `.claude/scripts/_shared/tests/lib/knowledge.test.ts` | modify | Fix 1 error: confidenceGate called with 1 arg at line 330; pass explicit false. |
| `.claude/scripts/_shared/tests/cases/case-extract.test.ts` | modify | Remove unused import specifier `mkdirSync` from the node:fs import (line 2). |
| `.claude/scripts/_shared/tests/lib/paths.test.ts` | modify | Remove unused import specifier `afterEach` from the bun:test import (line 1). |
| `.claude/scripts/_shared/tests/archive-gen.test.ts` | modify | Remove 21 unused `stderr` destructuring bindings via codemod; formatter reflows shortened run([...]) calls. |
| `.claude/scripts/_shared/tests/search-filter.test.ts` | modify | Remove 12 unused `stderr` destructuring bindings via codemod. |
| `.claude/scripts/_shared/tests/source-analyze.test.ts` | modify | Remove 14 unused `stderr` destructuring bindings via codemod. |
| `.claude/scripts/_shared/tests/writer-context-builder.test.ts` | modify | Remove 2 unused `stderr` destructuring bindings via codemod. |
| `.claude/scripts/_shared/tests/format-report-locator.test.ts` | modify | Remove 1 unused `stderr` destructuring binding via codemod. |
| `.claude/scripts/_shared/tests/knowledge-curate.test.ts` | modify | Remove 1 unused `stdout` destructuring binding (line 846) via codemod. |
| `.claude/scripts/_shared/tests/xmind/gen.test.ts` | modify | Remove 9 unused `stderr` destructuring bindings via codemod. |
| `.claude/scripts/_shared/tests/xmind/patch.test.ts` | modify | Remove 10 unused `stderr` destructuring bindings via codemod. |
| `.claude/scripts/_shared/lint/agent-shape.ts` | modify | Delete unused `opts: Record<string, unknown> = {}` parameter from lintAgentShape (line 20). |
| `.claude/scripts/_shared/lint/skill-shape.ts` | modify | Delete unused `opts: Record<string, unknown> = {}` parameter from lintSkillShape (line 19). |
| `.claude/scripts/_shared/lint/skill-frontmatter.ts` | modify | Delete unused `opts` param (line 10); fix noImplicitAnyLet on `let parsed` (line 14); fix noAssignInExpressions while→for (line 51). |
| `.claude/scripts/_shared/lib/codemod/node-test-to-bun-test.ts` | modify | Fix 2 noAssignInExpressions (lines 116, 146): while((m=pattern.exec)) → for-loop. |
| `.claude/scripts/_shared/lib/codemod/strip-matcher-message.ts` | modify | Fix noAssignInExpressions (line 116): while((m=re.exec)) → for-loop. |
| `.claude/scripts/_shared/lib/enhanced-doc-store.ts` | modify | Fix 2 noAssignInExpressions (lines 58, 244): while((m=re.exec)) → for-loop. |
| `.claude/scripts/_shared/lint/skill-structure.ts` | modify | Fix noAssignInExpressions (line 63): while((m=re.exec)) → for-loop. |
| `.claude/skills/case-draft/scripts/lib/signal-probe.ts` | modify | Fix noAssignInExpressions (line 217): while((anchorMatch=anchorPattern.exec)) → for-loop. |
| `.claude/skills/case-draft/scripts/source-analyze.ts` | modify | Fix noImplicitAnyLet on `let stat` (line 55) via ReturnType<typeof statSync>. |
| `.claude/skills/defect-analyze/scripts/defect-report.ts` | modify | Fix 2 noImplicitAnyLet on `let report` (lines 77, 97) via ReturnType<typeof validate*>. |
| `.claude/skills/defect-analyze/scripts/scan-report.ts` | modify | Fix noImplicitAnyLet on `let diffOut` (line 85) via ReturnType<typeof fetchAndDiff>. |
| `biome.json` | modify | Promote noUnusedVariables, noUnusedImports, noUnsafeOptionalChaining, noImplicitAnyLet, noAssignInExpressions, noRedeclare, noFallthroughSwitchClause from warn to error; keep noNonNullAssertion/noExplicitAny/noTemplateCurlyInString as warn. |
| `.github/workflows/ci.yml` | create | New top-level CI gate: on push(main)+pull_request, ubuntu-latest, checkout@v4 + setup-bun@v2 (bun-version 1.3.x) + bun install + bun run ci. Runs the full lint/type-check/test/check:skills chain that no existing workflow runs. |
| `.claude/scripts/_shared/cli/agents-audit.ts` | modify | Add existsSync guard so `kata agents audit` errors (exit 1) when the agents dir is missing instead of silently passing with scanned=0 (vacuous gate). |
| `.claude/scripts/_shared/tests/cli/agent-runtime-cli.test.ts` | modify | Replace the existing test that asserts `agents audit` exits 0 (now false) with two tests: errors on missing dir; passes against a populated fixture dir via KATA_WORKSPACE_ROOT/cwd. |
| `package.json` | modify | Remove `bun run lint:agents && ` from the `ci` script chain since the project has no .claude/agents/ and the guarded audit would now hard-fail the chain. Keep the lint:agents* scripts themselves for manual/adapter use. |
| `.github/workflows/features-index.yml` | modify | Change bare `kata features index --all` run step (not on PATH in GitHub runner) to `bunx kata features index --all`. |
| `.github/workflows/features-lint.yml` | modify | Change bare `kata features lint --all --exit-code` run step to `bunx kata features lint --all --exit-code`. |
| `.github/workflows/schema-check.yml` | modify | Remove the duplicated identical path glob line and add a `pull_request` trigger alongside `push`. |
| `/Users/poco/Projects/kata/CHANGELOG.md` | modify | Replace the fictional `## Unreleased` section (lines 3-21) with a truthful `## 4.0.0-alpha.1 (2026-06-03)` section that matches package.json version 4.0.0-alpha.1, README version badge, and the real work (single .claude/** runtime, multi-runtime adapters, README/docs rewrite, ~14k-line runtime dead-code cleanup). Lines 23-39 (3.0.0-alpha.1 and 2.0.0 sections) stay untouched. |
| `/Users/poco/Projects/kata/assets/diagrams/kata-project-overview.svg` | modify | Full SVG replacement: same 1280x620 viewBox/style so it renders identically in README.md:126 and README-EN.md:126 at the unchanged path. New labels match reality: .claude/** runtime (skills/ 8 skills triggered by SKILL.md frontmatter + scripts/_shared kata CLI + plugins/ lanhu/notify/zentao + rules/), adapter dirs (.agents + .codex-plugin symlink+plugin.json for Codex, .reasonix, .hermes via external_dirs), quality gate bun run ci. All stale labels removed. |

---

## 批次 B0 · Preflight：修复 runtime-detach 契约（当前 main 红，必须先修）

> 这不是 spec 原定范围，是审计 plan 阶段发现的并行会话回归。它让 `check:skills` 红、`bun test` 多 1 fail，且会卡死 B3 的 `bun run ci`。必须最先修。

### Task B0: 恢复 commit 表 emoji 列单空格以满足 runtime-detach 子串契约

**Files:** Modify `.claude/rules/project-workflow-rules.md`（commit type/emoji 表，约 29-42 行）

Context（已核实）：`.claude/scripts/_shared/lib/skills/runtime-detach.ts:54` 的 `DETAIL_RULE_FILES` 对 `project-workflow-rules.md` 要求 `requiredPhrases` 含精确子串 `` | `refactor` | `✨` | ``（emoji 后单空格再竖线）。当前文件第 33 行是 `` | `refactor` | `✨`  | ``（双空格），`body.includes()` 失配 → `checkRuntimeDetach` 报 `RUNTIME_SYNC_RULE_MISSING` → `check:skills` 退出 1、`repository runtime detach contract` 测试 fail。修复=把整张表的 emoji 列改回单空格（顺带消除复发风险）。

1. - [ ] **Step 1: 把 commit 表替换为单空格版本。** 将 `.claude/rules/project-workflow-rules.md` 第 29-42 行整块替换为（注意每格单空格）：

```markdown
| Type | Emoji |
| --- | --- |
| `feat` | `🧩` |
| `fix` | `🩹` |
| `refactor` | `✨` |
| `docs` | `📝` |
| `test` | `🧪` |
| `chore` | `🧹` |
| `style` | `🎨` |
| `build` | `🏗️` |
| `ci` | `👷` |
| `perf` | `⚡` |
| `revert` | `⏪` |
| `merge` | `🔀` |
```

2. - [ ] **Step 2: 验证 detach 契约恢复。**

```bash
cd /Users/poco/Projects/kata && bun run check:skills; echo "exit=$?"
```
Expected: 三行 `runtime skill sync passed` / `runtime detach passed` / `skill structure check passed`，exit=0。

3. - [ ] **Step 3: 验证 bun test 回到 0 fail（建立后续批次的干净基线）。**

```bash
cd /Users/poco/Projects/kata && bun test 2>&1 | grep -E "pass$|fail$|skip$|Ran [0-9]+ test" | tail -4
```
Expected: `1232 pass` / `1 skip` / `0 fail`（`repository runtime detach contract` 不再出现在失败里）。**记下这个 1232 作为后续基线。**

4. - [ ] **Step 4: 提交。**

```bash
cd /Users/poco/Projects/kata && git add -A && git commit -m "fix: 🩹 restore commit-table emoji spacing for runtime-detach contract"
```

> 推荐后续（非本批）：让 `runtime-detach.ts` 的表行校验对空白不敏感（normalize 后再 includes），从根上防止列对齐再次踩雷——记入 Tier 5 待办，不在本计划。

---

## 批次 B1 · Tier 2 删漏网死代码

### Task: Delete the progress-store island and clean its lint allowlist entry

**Files:** Delete `.claude/scripts/_shared/lib/progress-store.ts`; Delete `.claude/scripts/_shared/lib/progress-types.ts`; Delete `.claude/scripts/_shared/tests/lib/progress-store.test.ts`; Modify `.claude/scripts/_shared/lint/path-treatment.ts` (line 43)

Context (verified, do not re-derive): `progress-store.ts` (632 lines) and `progress-types.ts` (88 lines) have ZERO consumers repo-wide. The only `import` of either is inside `tests/lib/progress-store.test.ts` (its import block at lines 12-26 pulls 14 symbols from `@shared/lib/progress-store.ts` and `type { Session }` from `@shared/lib/progress-types.ts`). There is NO `api.ts` barrel re-exporting them. The full-repo grep (including `workspace/`, `.agents/`, `.reasonix/`, `.hermes/`, `.codex-plugin/`, `.claude/plugins/`) found no other references — the remaining hits are this test file, the two files themselves, and the design spec markdown (which is the plan source, not touched). `dead-code-cleanup.test.ts` and `large-file-split.test.ts` do NOT reference these files. This test file contributes exactly 40 passing test cases and all 16 of the type errors B1 removes.

The lint allowlist line: `path-treatment.ts:43` exempts `.claude/scripts/_shared/tests/lib/progress-store.test.ts` from the P-S3 rule. It is load-bearing today ONLY because line 66 of the test contains the literal `workspace/dataAssets/prds/x.md`, which matches the P-S3 regex `/workspace\/[^/\s]+\/(prds|archive|xmind|tests)\//g`. Deleting the test removes that match, so the allowlist line becomes dead debris and MUST be removed in the same commit (a stale allowlist entry pointing at a non-existent file is exactly the kind of residue this cleanup targets).

1. - [ ] **Step 1: Delete the three island files.**
```bash
cd /Users/poco/Projects/kata
git rm .claude/scripts/_shared/lib/progress-store.ts \
       .claude/scripts/_shared/lib/progress-types.ts \
       .claude/scripts/_shared/tests/lib/progress-store.test.ts
```
Expected output (three lines):
```
rm '.claude/scripts/_shared/lib/progress-store.ts'
rm '.claude/scripts/_shared/lib/progress-types.ts'
rm '.claude/scripts/_shared/tests/lib/progress-store.test.ts'
```

2. - [ ] **Step 2: Remove the now-dead lint allowlist line.** Apply this exact edit to `.claude/scripts/_shared/lint/path-treatment.ts` (deletes only line 43; lines 41-42 and 44 stay):
```diff
   ".claude/scripts/_shared/tests/lib/signal-probe.test.ts",
   ".claude/scripts/_shared/tests/lib/paths.test.ts",
-  ".claude/scripts/_shared/tests/lib/progress-store.test.ts",
   ".claude/scripts/_shared/tests/plan.test.ts",
```

3. - [ ] **Step 3: Verify lint:paths still passes (the P-S3 source of the allowlist need is gone).**
```bash
cd /Users/poco/Projects/kata && bun run lint:paths; echo "exit=$?"
```
Expected: exit=0 (no P-S3 violation surfaces, because the only file matching the regex via these symbols — the deleted test — is gone, and the allowlist no longer references a missing file).

4. - [ ] **Step 4: Verify type errors dropped by exactly 16 (198 → 182).**
```bash
cd /Users/poco/Projects/kata && bun run type-check 2>&1 | grep -cE "error TS"
```
Expected output: `182`

5. - [ ] **Step 5: Verify no new test failures and the 16-error suite is gone.** Run the lib test directory plus the runtime-detach contract.
```bash
cd /Users/poco/Projects/kata && bun test 2>&1 | grep -E "pass$|fail$|skip$|Ran [0-9]+ test" | tail -5
```
Expected (anchored to the post-B0 1232-pass baseline, minus the 40 deleted progress-store cases = 1192 pass): `1192 pass`, `1 skip`, `0 fail` (plus a `Ran 1192 tests across ...` line). NOTE: the `repository runtime detach contract` failure was already fixed by batch B0 (which runs before B1), so this run should show `0 fail`. If it still fails, B0 was not applied — stop and run B0 first; do not attribute it to B1. The progress-store test file (40 cases) must no longer appear in the run.

6. - [ ] **Step 6: Verify biome adds no new warnings.**
```bash
cd /Users/poco/Projects/kata && bun run check 2>&1 | grep -iE "Found [0-9]+ warning"; echo "exit=$?"
```
Expected: exit=0; the `Found N warnings` total is UNCHANGED from baseline (the deleted files contributed 0 biome warnings — verified). Confirm no `progress-store`/`progress-types` path appears in the output.

7. - [ ] **Step 7: Verify the runtime-sync/structure contracts still pass.**
```bash
cd /Users/poco/Projects/kata && bun run check:skills; echo "exit=$?"
```
Expected: exit=0 (B1 touches no SKILL.md frontmatter, no CLAUDE.md, no rules — the runtime-detach substring contract is unaffected by deleting lib/test files).

8. - [ ] **Step 8: Commit.**
```bash
cd /Users/poco/Projects/kata && git add -A && git commit -m "chore: 🧹 delete dead progress-store island and stale path-lint allowlist"
```

---

### Task: Delete the dead features/paths.ts duplicate and its test

**Files:** Delete `.claude/scripts/_shared/lib/features/paths.ts`; Delete `.claude/scripts/_shared/tests/features/paths.test.ts`

Context (verified, do not re-derive): `lib/features/paths.ts` (16 lines: exports `workspaceRoot`, `featuresRoot`, `featureDir`, `sharedRoot`, `kataRoot`, `resultsDir`) is a dead duplicate of helpers in the kept `lib/paths.ts`; its behavior diverges (it does not honor the `KATA_WORKSPACE_ROOT` override), making it a latent correctness trap. Its ONLY consumer repo-wide is `tests/features/paths.test.ts` (5 test cases; its import block at lines 2-8 pulls `featureDir, featuresRoot, kataRoot, resultsDir, sharedRoot` from `@shared/lib/features/paths.ts`). The sibling files in `lib/features/` (`run-id.ts`, `slug.ts`) and in `tests/features/` (`run-id.test.ts`, `slug.test.ts`, `slug-derive.test.ts`) do NOT import `paths.ts` — verified — so both directories survive with their remaining files and are NOT orphaned. There is NO lint allowlist or INDEX/manifest entry for these files (only `progress-store.test.ts` had an allowlist entry; the wider grep found no `features/paths` reference outside the file pair and the spec md). This deletion removes 0 type errors (these files are type-clean) and 5 passing test cases.

1. - [ ] **Step 1: Delete the dead duplicate and its test.**
```bash
cd /Users/poco/Projects/kata
git rm .claude/scripts/_shared/lib/features/paths.ts \
       .claude/scripts/_shared/tests/features/paths.test.ts
```
Expected output (two lines):
```
rm '.claude/scripts/_shared/lib/features/paths.ts'
rm '.claude/scripts/_shared/tests/features/paths.test.ts'
```

2. - [ ] **Step 2: Confirm the sibling files survive (directories not orphaned).**
```bash
cd /Users/poco/Projects/kata && ls .claude/scripts/_shared/lib/features/ .claude/scripts/_shared/tests/features/
```
Expected: `lib/features/` lists `run-id.ts` and `slug.ts` (no `paths.ts`); `tests/features/` lists `run-id.test.ts`, `slug-derive.test.ts`, `slug.test.ts` (no `paths.test.ts`).

3. - [ ] **Step 3: Verify type-check is unchanged at 182 (these files carried 0 errors).**
```bash
cd /Users/poco/Projects/kata && bun run type-check 2>&1 | grep -cE "error TS"
```
Expected output: `182`

4. - [ ] **Step 4: Verify no new test failures; 5 more cases removed.**
```bash
cd /Users/poco/Projects/kata && bun test 2>&1 | grep -E "pass$|fail$|skip$|Ran [0-9]+ test" | tail -5
```
Expected (1192 from prior task minus the 5 deleted features/paths cases = 1187): `1187 pass`, `1 skip`, `0 fail`. (B0 already fixed the runtime-detach failure, so this is a clean 0 fail.) The `tests/features/paths.test.ts` cases must no longer appear.

5. - [ ] **Step 5: Verify biome and lint:paths still clean (no allowlist touched here).**
```bash
cd /Users/poco/Projects/kata && bun run check 2>&1 | grep -iE "Found [0-9]+ warning" && bun run lint:paths; echo "exit=$?"
```
Expected: biome `Found N warnings` unchanged from baseline; `lint:paths` exit=0.

6. - [ ] **Step 6: Commit.**
```bash
cd /Users/poco/Projects/kata && git add -A && git commit -m "chore: 🧹 delete dead features/paths duplicate and its test"
```

**本批 crossRefs（后续批次须一致）：** Post-B1 baselines that B2/B3 MUST inherit and not regress: bun run type-check = 182 errors (was 198; B1 removed exactly the 16 errors in progress-store.test.ts — B2a starts from 182 and drives to 0). bun test = 1187 pass / 1 skip after both B1 tasks (1232 post-B0 baseline minus 45 deleted cases: 40 from progress-store.test.ts + 5 from tests/features/paths.test.ts). biome `Found N warnings` total is UNCHANGED by B1 (deletion targets contributed 0 warnings) — B2b still has the full warning set to burn down. The lint:paths allowlist in path-treatment.ts no longer contains a progress-store entry; lines 41-42 (signal-probe.test.ts, paths.test.ts) and line 44 onward (plan.test.ts, ...) are retained. The kept feature-path helpers live in lib/paths.ts (honors KATA_WORKSPACE_ROOT) and lib/features/{run-id.ts,slug.ts}; do NOT recreate lib/features/paths.ts.

**本批 risks：** 1) PRE-EXISTING UNRELATED TEST FAILURE in this environment's main: `repository runtime detach contract > repository runtime files are detached from retired source roots` fails because checkRuntimeDetach reports `RUNTIME_SYNC_RULE_MISSING` for `.claude/rules/project-workflow-rules.md` missing the phrase `| `refactor` | `✨` |` (a markdown-table substring contract in runtime-detach.ts). This is NOT caused by B1 and B1 touches none of those files. Do NOT write "0 fail" as an absolute claim if main already shows 1 fail — the honest gate is "no NEW failures, 0 progress-store/features-paths failures". The spec's 1398 pass figure was measured pre-cleanup-merge and is stale; the real post-B0 baseline is 1232 pass / 1 skip / 0 fail. Capture the exact pre-B1 total in the worktree BEFORE deleting, then subtract 45. 2) The path-treatment.ts allowlist line removal is REQUIRED, not optional: the deleted test's line-66 string `workspace/dataAssets/prds/x.md` was the only reason that file matched P-S3; leaving the allowlist line would be stale debris referencing a missing file. Remove it in the SAME commit as the test deletion (Task 1) so lint:paths and any debris invariant stay green. 3) Do NOT delete the sibling files in lib/features/ or tests/features/ — only the `paths.*` pair is dead; run-id and slug files are live and independently tested. 4) bun test is slow (~60-90s) and one run showed a lower count under parallel/partial state; run a full `bun test` (not a subset) for the pass-count assertions, and capture the exact pre-deletion totals in the worktree first to compute the expected post-deletion numbers precisely (subtract 40 then 5). 5) Use `git rm` (not plain rm) so the staging area reflects deletions cleanly before commit.

---

## 批次 B2a-prod · Tier 3 排除 fixture 噪音 + 修 4 个生产类型错误

### Task: Exclude intentionally-malformed fixtures from tsconfig

This is a config-only change (no runtime behavior). The "test" is the verification command + expected error-count drop. Verified baseline: `bun run type-check` (tsc --noEmit) emits 198 `error TS` lines; of those, exactly 120 are in `tests/codemod/fixtures/` and 12 are in `tests/lint/fixtures/` (both dirs contain deliberately-broken transformation/lint samples). Real test files (`*.test.ts`) live directly in `tests/codemod/` and `tests/lint/`, OUTSIDE the `fixtures/` subdirectories, so a `fixtures/**` glob excludes only the malformed samples and keeps every real test in the program.

**Files:** Modify `tsconfig.json` (line 15, the `exclude` array).

- [ ] **Step 1: Confirm the baseline error count and fixture distribution before editing.**

```
Run: bun run type-check 2>&1 | grep -c "error TS"
Expected output: 198

Run: bun run type-check 2>&1 | grep "error TS" | grep -c "tests/codemod/fixtures/"
Expected output: 120

Run: bun run type-check 2>&1 | grep "error TS" | grep -c "tests/lint/fixtures/"
Expected output: 12
```

- [ ] **Step 2: Edit `tsconfig.json` exclude array.** Replace the single-line `exclude` (currently line 15) verbatim.

BEFORE (exact current line 15):
```json
  "exclude": ["node_modules", "workspace"]
```

AFTER:
```json
  "exclude": [
    "node_modules",
    "workspace",
    ".claude/scripts/_shared/tests/codemod/fixtures/**",
    ".claude/scripts/_shared/tests/lint/fixtures/**"
  ]
```

Why this is correct and does NOT exclude real tests: tsc's `exclude` filters files matched by `include`. The two added globs end in `fixtures/**`, scoping strictly to the `fixtures/` subdirectory under each test dir. Directory listing confirms the malformed samples are isolated inside `tests/codemod/fixtures/` and `tests/lint/fixtures/`, while real specs (`fix-truthy-corruption.test.ts`, `node-test-to-bun-test.test.ts`, `path-treatment.test.ts`, etc.) sit one level up and stay in the program. The `**/*.fixture.ts` files in those dirs are the only thing removed.

- [ ] **Step 3: Verify the error count dropped by exactly 132 (120 + 12).** Note B1 (which deletes `tests/lib/progress-store.test.ts`, removing 16 errors) is a separate prior task; whether or not B1 has landed, this task's own delta is −132.

```
Run: bun run type-check 2>&1 | grep -c "error TS"
Expected output if B1 has NOT yet landed: 66   (198 − 132)
Expected output if B1 HAS already landed:  50   (182 − 132)
```

The remaining errors are: 4 production source errors + 46 real-test null-safety errors (+ 16 progress-store.test errors only if B1 has not yet run). None are fixture noise.

- [ ] **Step 4: Confirm no real test was excluded (tests still execute and pass).**

```
Run: bun test 2>&1 | tail -5
Expected: "... pass", "0 fail" (after B0+B1 this is 1187 pass / 1 skip / 0 fail; excluding fixtures does not change the test-case count, only the type-check count)
```

- [ ] **Step 5: Commit.**

```
Run: git add tsconfig.json && git commit -m "build: 🏗️ exclude intentionally-malformed fixtures from type-check"
```

---

### Task: Fix the 4 production type errors

This task fixes the only 4 type errors in shipped (non-test, non-fixture) source. Each fix is behavior-preserving; the verification is the dropping `error TS` count plus a green `bun test`. No TDD red-test is needed because none of these change runtime behavior — they only make the existing, test-covered behavior type-correct. Exact current tsc errors (verified):

```
.claude/scripts/_shared/cli/index.ts(79,13): error TS2345: Argument of type '(_opts: unknown, _command: Command) => Promise<Command>' is not assignable to parameter of type '(this: Command, ...args: any[]) => void | Promise<void>'.
.claude/scripts/_shared/cli/index.ts(132,13): error TS2339: Property '_hidden' does not exist on type 'Command'.
.claude/scripts/_shared/cli/repo-sync.ts(195,5): error TS2322: Type 'Record<string, { repos: { path: string; branch: string; }[]; }> | undefined' is not assignable to type 'Record<string, { repos: { path: string; branch: string; }[]; }>'.
.claude/skills/knowledge-curate/scripts/knowledge-curate/write.ts(204,7): error TS2322: Type 'string | null' is not assignable to type 'string'.
```

**Files:** Modify `.claude/scripts/_shared/cli/index.ts` (lines 79-83 and 130-134), `.claude/scripts/_shared/cli/repo-sync.ts` (lines 189-198), `.claude/skills/knowledge-curate/scripts/knowledge-curate/write.ts` (lines 191-209).

- [ ] **Step 1: Fix `cli/index.ts:79` — action callback return type.** The `.action()` callback returns `managingProjectKnowledge.parseAsync([...])` which is `Promise<Command>`, but commander 14's `.action(fn: (this, ...args) => void | Promise<void>)` requires the resolved value to be `void`. Commander only AWAITS the returned promise (lib/command.js:1604 via `_chainOrCall`) and discards its resolved value, so making the callback `async` and `await`ing instead of `return`ing is byte-for-byte behavior-identical: the sub-CLI still runs to completion before the action resolves.

Replace the `.action(...)` block (exact current lines 79-83):
```ts
    .action((_opts: unknown, _command: Command) => {
      // Commander's parseAsync requires argv[0] and argv[1] as program path placeholders
      const args = process.argv.slice(2).filter((a) => a !== "knowledge-keeper");
      return managingProjectKnowledge.parseAsync(["node", "kata", ...args]);
    }),
```

With:
```ts
    .action(async (_opts: unknown, _command: Command) => {
      // Commander's parseAsync requires argv[0] and argv[1] as program path placeholders
      const args = process.argv.slice(2).filter((a) => a !== "knowledge-keeper");
      await managingProjectKnowledge.parseAsync(["node", "kata", ...args]);
    }),
```

- [ ] **Step 2: Fix `cli/index.ts:132` — internal `_hidden` not on public typing.** Commander 14's public `Command` type no longer exposes `_hidden`, but the field still exists at runtime (lib/command.js:76 inits `this._hidden = false`). Commander's own `addCommand(cmd, { hidden: true })` does exactly `cmd._hidden = true` (lib/command.js:296). So a narrow cast to the internal field is identical runtime behavior to the supported public path, with zero rewrite of the ~30 existing `addCommand` calls. Prefer this targeted cast over rewriting every registration (which would risk behavior drift across 30 sites).

Replace the loop body (exact current lines 130-134):
```ts
for (const command of kata.commands) {
  if (!publicV2Commands.has(command.name())) {
    command._hidden = true;
  }
}
```

With:
```ts
for (const command of kata.commands) {
  if (!publicV2Commands.has(command.name())) {
    // commander 14 keeps the hidden flag on the internal `_hidden` field
    // (public path `addCommand(cmd, { hidden: true })` sets the same field);
    // narrow-cast to write it without rewriting every addCommand call.
    (command as Command & { _hidden: boolean })._hidden = true;
  }
}
```

- [ ] **Step 3: Fix `cli/repo-sync.ts:195` — `Record<...> | undefined` not assignable to `Record<...>`.** The current assignment uses a `&&` ternary whose truthy branch is `projects[project].repo_profiles`. Even though `project && projects?.[project]?.repo_profiles` is truthy-checked in the condition, TS does not narrow the SEPARATE indexed read `projects[project].repo_profiles` in the consequent (the optional-chained check and the plain index access are different expressions), so the consequent stays `Record<...> | undefined` and the union flows into `profiles: Record<...>`. The safe fix introduces a single narrowed local so the read TS sees is provably non-undefined.

Replace the assignment block (exact current lines 189-198):
```ts
    const projects = raw.projects as
      | Record<
          string,
          { repo_profiles?: Record<string, { repos: Array<{ path: string; branch: string }> }> }
        >
      | undefined;
    profiles =
      project && projects?.[project]?.repo_profiles
        ? projects[project].repo_profiles
        : ((raw.repo_profiles ?? {}) as typeof profiles);
```

With:
```ts
    const projects = raw.projects as
      | Record<
          string,
          { repo_profiles?: Record<string, { repos: Array<{ path: string; branch: string }> }> }
        >
      | undefined;
    const projectProfiles = project ? projects?.[project]?.repo_profiles : undefined;
    profiles = projectProfiles ?? ((raw.repo_profiles ?? {}) as typeof profiles);
```

Why behavior-preserving: `projectProfiles` is exactly `projects[project].repo_profiles` when `project` is set and that nested value exists, else `undefined` — identical to the old condition. `projectProfiles ?? (raw.repo_profiles ?? {})` falls back to `raw.repo_profiles` (then `{}`) in precisely the same cases the old ternary's `:` branch did (project missing, or its `repo_profiles` absent). `??` (not `||`) preserves the original semantics since `repo_profiles`/`raw.repo_profiles` are objects, never falsy-but-present. The result type narrows to `Record<...>` because both `??` operands are non-undefined.

- [ ] **Step 4: Fix `write.ts:204` — `string | null` not assignable to `string`.** At write.ts:76, `snapshotName` is `string | null` (it is `null` when `plan.beforeContent` is empty — a brand-new file with no prior content to back up). It is passed via `appendWriteAudit(..., snapshotName: string | null)` (param at line 194) into `buildAuditRecord({ snapshot: snapshotName })`, whose `snapshot` param is typed `string` (knowledge-guard.ts:236; `AuditRecord.snapshot` is `string` at knowledge-guard.ts:37). The audit record already uses the empty string `""` as its "absent" sentinel for empty before/after hashes (knowledge-guard.ts:246-247), so coercing the null case to `""` is behavior-preserving: a new-file write logs an empty snapshot string meaning "no backup taken", and downstream `readSnapshot(record.snapshot)` (maintenance.ts:111) is only reached after `validateRollbackRecord` and never on a write-with-no-prior-content record. Prefer this coercion over widening `AuditRecord.snapshot`/`buildAuditRecord` to `string | null`, which would cascade a new error into `readSnapshot(project, record.snapshot)` at maintenance.ts:111.

Edit `appendWriteAudit` (exact current lines 196-209 contain the `buildAuditRecord` call). Change ONLY the `snapshot` line inside the `buildAuditRecord({...})` at line 204.

Replace (exact current line 204):
```ts
      snapshot: snapshotName,
```

With:
```ts
      snapshot: snapshotName ?? "",
```

Note: do NOT touch line 223 (`snapshot: snapshotName` inside `writeCommittedWrite` → `writeJson(value: unknown)`); that sink accepts `null` and is not part of the type error. Only line 204 (the `buildAuditRecord` argument) needs the coercion.

- [ ] **Step 5: Verify the production error count dropped to 0 of the 4.** First confirm none of the 4 named errors remain:

```
Run: bun run type-check 2>&1 | grep -E "cli/index\.ts\(79|cli/index\.ts\(132|cli/repo-sync\.ts\(195|knowledge-curate/scripts/knowledge-curate/write\.ts\(204"
Expected output: (no output — all 4 production errors gone)
```

Then confirm the total dropped by 4 from this task's starting point:

```
Run: bun run type-check 2>&1 | grep -c "error TS"
Expected output if B1 already landed (and tsconfig task done): 46   (50 − 4)
Expected output if B1 not yet landed (only tsconfig task done): 62   (66 − 4)
```

The 46 (or 62) remaining are all real-test null-safety errors, addressed by the separate B2a-tests batch; this task owns only the 4 production fixes.

- [ ] **Step 6: Confirm runtime behavior unchanged — full test suite green.**

```
Run: bun test 2>&1 | tail -5
Expected: "0 fail" (after B0+B1: 1187 pass / 1 skip / 0 fail)
```

- [ ] **Step 7: Confirm no new biome warnings introduced by the edits.**

```
Run: bun run check 2>&1 | tail -3
Expected: exit 0 (warning count not increased above the 153 baseline)
```

- [ ] **Step 8: Commit.**

```
Run: git add .claude/scripts/_shared/cli/index.ts .claude/scripts/_shared/cli/repo-sync.ts .claude/skills/knowledge-curate/scripts/knowledge-curate/write.ts && git commit -m "fix: 🩹 resolve 4 production type errors for type-check gate"
```

**本批 crossRefs（后续批次须一致）：** DEPENDENCY ORDER (from spec section "批次依赖顺序"): B1 (deletes .claude/scripts/_shared/lib/progress-store.ts, lib/progress-types.ts, tests/lib/progress-store.test.ts, lib/features/paths.ts, tests/features/paths.test.ts — removing 16 type errors) lands BEFORE this B2a-prod batch. If B1 lands first, type-check count entering this batch = 182; after tsconfig exclusion = 50; after 4 prod fixes = 46. If running this batch standalone before B1, entering = 198; after exclusion = 66; after prod fixes = 62. The remaining ~46 errors are real-test null-safety, owned by the sibling B2a-tests batch (NOT this one) — do not attempt them here.  EXACT verified baselines this batch relied on (keep consistent): `bun run type-check 2>&1 | grep -c "error TS"` = 198 at HEAD; codemod/fixtures = 120 errors, lint/fixtures = 12 errors, progress-store.test = 16 errors. `bun test` = 1187 pass / 1 skip / 0 fail after B0+B1 (the pre-cleanup 1398 figure is stale). `bun run check` exit 0 with 153 warnings.  tsconfig.json final exclude array (downstream batches B2b/B3 must not revert): ["node_modules", "workspace", ".claude/scripts/_shared/tests/codemod/fixtures/**", ".claude/scripts/_shared/tests/lint/fixtures/**"].  Type contracts touched/relied on: commander@14.0.3 — Command class has NO public `_hidden` (internal field set by addCommand(cmd,{hidden:true}) per lib/command.js:296); `.action()` signature `(this, ...args) => void | Promise<void>`. knowledge-guard.ts: `AuditRecord.snapshot: string` (line 37) and `buildAuditRecord` param `snapshot: string` (line 236) are UNCHANGED by this batch — the write.ts fix coerces at the call site (`snapshotName ?? ""`) rather than widening these types, so B3/any future knowledge-curate work can keep `snapshot: string`. buildAuditRecord is defined in lib/knowledge-guard.ts and re-exported via lib/knowledge.ts.  B3 (接 CI) requires type-check = 0 error; this batch only gets it to 46/62 — the sibling test-fix batch must complete before B3 can run `bun run ci` green.

**本批 risks：** 1. tsconfig glob scoping: the `fixtures/**` globs MUST keep the `/fixtures/` segment. A broader glob like `tests/codemod/**` would wrongly exclude the real `*.test.ts` specs sitting directly in `codemod/`/`lint/`, silently dropping them from type-checking (and they'd still run under `bun test` but lose type coverage). Verified: real specs are one level above the fixtures/ subdir, so the given globs are correct.  2. cli/index.ts:79 — do NOT just add `void` before the call or `as` cast the result; making the callback `async` + `await` is required so the returned promise is `Promise<void>` AND the sub-CLI still completes before the action resolves. Confirmed commander awaits but discards the resolved value (lib/command.js:1604), so behavior is identical. If a reviewer "simplifies" by dropping the await, the knowledge-keeper alias would fire-and-forget the sub-CLI — a real regression.  3. cli/index.ts:132 — the cast `(command as Command & { _hidden: boolean })` writes commander's documented-internal field; this is identical to commander's own `{ hidden: true }` path. Do NOT instead rewrite the 30 `addCommand(...)` calls to pass `{ hidden: true }` — that is invasive, easy to get wrong per-command, and the loop-based approach must stay because it keys off `publicV2Commands` membership at the end.  4. write.ts:204 — `snapshotName ?? ""` (nullish), NOT `|| ""`. They behave the same here (snapshotName is only ever a non-empty string or null), but `??` is the precise intent. Critical: only line 204 changes; line 223 (`writeJson` sink, accepts null) must be left untouched or you'd be making a no-op edit that could mask the real fix.  5. repo-sync.ts:195 — must introduce the narrowed `projectProfiles` local; do not "fix" by casting the whole expression `as Record<...>` (a blunt cast would suppress the error but lose the real fallback to `raw.repo_profiles`). The `??` chain preserves the original `:` branch semantics exactly. Use `??` not `||`.  6. Counts shift by 16 depending on whether B1 has landed. The taskMarkdown gives both expected numbers per step — executor must check which scenario applies (does `tests/lib/progress-store.test.ts` still exist?) and use the matching expected value, not treat a 66/62 as a failure when B1 simply hasn't run yet.  7. Per project rules: all work happens in a detached worktree (`git worktree add --detach .worktrees/<slug> main`), symlink `.kata` so source/session reads resolve; run `bun run check` (lint) in addition to `bun test` after each task (per-task lint discipline from memory). Commit titles are English-only, type lowercase: `build: 🏗️ ...` for tsconfig, `fix: 🩹 ...` for the source fixes."

---

## 批次 B2a-tests · Tier 3 修真实测试文件的空安全错误到 0

## Batch B2a-tests — null-safety / type-error fixes in real test files

PRECONDITION (must already be true before this batch starts):
- B1 has deleted `.claude/scripts/_shared/tests/lib/progress-store.test.ts` (and the progress-store/paths source).
- B2a step 1 (the tsconfig exclude of `tests/codemod/fixtures/**` and `tests/lint/fixtures/**`) has been applied. After both, `bun run type-check 2>&1 | grep -c "error TS"` is **49** (45 in these real test files + 4 production source). This batch fixes the 45 test-file errors. The 4 production errors are a sibling task, NOT in this batch — so the FINAL "0 errors" verification depends on the production-fix task also being merged. Each per-file task below verifies only its own file's drop; the last task here verifies the test-file subset is at 0.

EXACT BASELINE (verified): 45 distinct `error TS` lines across 12 real test files. Per-file: gen 11, patch 7, history-convert 6, case-signal-analyzer 6, writer-context-builder 5, project-resolver 4, format-report-locator 1, search-filter 1, large-file-split 1, create-project 1, env 1, knowledge 1.

All paths below are relative to repo root `/Users/poco/Projects/kata`. Run all commands from repo root.

---

### Task: fix null-safety type errors in tests/xmind/gen.test.ts

**Files:** Modify `.claude/scripts/_shared/tests/xmind/gen.test.ts` (lines 30-37, 307-317, 423-445)

This file has 11 errors. Two root causes: (a) the shared `readContentJson` helper does `contentFile.async(...)` where `zip.file(...)` returns `JSZipObject | null` (line 35 TS18047); (b) navigation nodes are typed possibly-undefined from optional-chaining + array index (lines 312,315,428,430,432,434,436,440,441,442,445 TS18048). Fix by capturing into guarded consts. The `expect(...).toBeTruthy()` calls already assert these at runtime, so a `throw` on null/undefined keeps intent identical while satisfying the type checker.

1. - [ ] **Step 1: Guard the null `contentFile` in `readContentJson` (fixes line 35).** Current code (lines 30-37):

```ts
async function readContentJson(xmindPath: string): Promise<unknown> {
  const buffer = readFileSync(xmindPath);
  const zip = await JSZip.loadAsync(buffer);
  const contentFile = zip.file("content.json");
  expect(contentFile).toBeTruthy();
  const str = await contentFile.async("string");
  return JSON.parse(str);
}
```

Replace with:

```ts
async function readContentJson(xmindPath: string): Promise<unknown> {
  const buffer = readFileSync(xmindPath);
  const zip = await JSZip.loadAsync(buffer);
  const contentFile = zip.file("content.json");
  expect(contentFile).toBeTruthy();
  if (!contentFile) throw new Error("content.json missing from xmind archive");
  const str = await contentFile.async("string");
  return JSON.parse(str);
}
```

2. - [ ] **Step 2: Guard `rootTopic` in the "full hierarchy" test (fixes lines 312, 315).** Current code (lines 307-309):

```ts
    const sheets = (await readContentJson(output)) as Sheet[];
    const rootTopic = sheets[0]?.rootTopic;
    expect(rootTopic).toBeTruthy();
```

Replace with:

```ts
    const sheets = (await readContentJson(output)) as Sheet[];
    const rootTopic = sheets[0]?.rootTopic;
    expect(rootTopic).toBeTruthy();
    if (!rootTopic) throw new Error("rootTopic missing");
```

3. - [ ] **Step 3: Guard the chained nav nodes in the `<br>` sanitization test (fixes lines 428, 430, 432, 434, 436, 440, 441, 442, 445).** Current code (lines 423-445):

```ts
    const sheets = (await readContentJson(output)) as Sheet[];
    const root = sheets[0]?.rootTopic;
    expect(root).toBeTruthy();

    // Navigate to the case node: root → L1 → L2 → L3 → L4(sub_group) → case
    const l1 = root.children?.attached?.[0];
    expect(l1).toBeTruthy();
    const l2 = l1.children?.attached?.[0];
    expect(l2).toBeTruthy();
    const l3 = l2.children?.attached?.[0];
    expect(l3).toBeTruthy();
    const l4SubGroup = l3.children?.attached?.[0];
    expect(l4SubGroup).toBeTruthy();
    const caseNode = l4SubGroup.children?.attached?.[0];
    expect(caseNode).toBeTruthy();

    // Preconditions should have <br> converted to \n
    expect(caseNode.notes?.plain?.content).toBeTruthy();
    expect(!caseNode.notes?.plain.content.includes("<br")).toBeTruthy();
    expect(caseNode.notes?.plain.content.includes("\n")).toBeTruthy();

    // Step nodes
    const stepNodes = caseNode.children?.attached ?? [];
```

Replace with:

```ts
    const sheets = (await readContentJson(output)) as Sheet[];
    const root = sheets[0]?.rootTopic;
    expect(root).toBeTruthy();
    if (!root) throw new Error("root missing");

    // Navigate to the case node: root → L1 → L2 → L3 → L4(sub_group) → case
    const l1 = root.children?.attached?.[0];
    expect(l1).toBeTruthy();
    if (!l1) throw new Error("l1 missing");
    const l2 = l1.children?.attached?.[0];
    expect(l2).toBeTruthy();
    if (!l2) throw new Error("l2 missing");
    const l3 = l2.children?.attached?.[0];
    expect(l3).toBeTruthy();
    if (!l3) throw new Error("l3 missing");
    const l4SubGroup = l3.children?.attached?.[0];
    expect(l4SubGroup).toBeTruthy();
    if (!l4SubGroup) throw new Error("l4SubGroup missing");
    const caseNode = l4SubGroup.children?.attached?.[0];
    expect(caseNode).toBeTruthy();
    if (!caseNode) throw new Error("caseNode missing");

    // Preconditions should have <br> converted to \n
    expect(caseNode.notes?.plain?.content).toBeTruthy();
    expect(!caseNode.notes?.plain.content.includes("<br")).toBeTruthy();
    expect(caseNode.notes?.plain.content.includes("\n")).toBeTruthy();

    // Step nodes
    const stepNodes = caseNode.children?.attached ?? [];
```

4. - [ ] **Step 4: Verify this file is error-free.**
   Run: `bun run type-check 2>&1 | grep -c "tests/xmind/gen.test.ts"`
   Expected output: `0`

5. - [ ] **Step 5: Verify the test still passes.**
   Run: `bun test .claude/scripts/_shared/tests/xmind/gen.test.ts`
   Expected output: ends with `0 fail` (all tests in the file pass).

6. - [ ] **Step 6: Commit.**
   Run: `git add .claude/scripts/_shared/tests/xmind/gen.test.ts && git commit -m "test: 🧪 fix null-safety type errors in xmind gen test"`

---

### Task: fix null-safety type errors in tests/xmind/patch.test.ts

**Files:** Modify `.claude/scripts/_shared/tests/xmind/patch.test.ts` (lines 57-66, 115-120, 227-231)

7 errors: null `contentFile` in `readContentJson` (line 64 TS18047), possibly-undefined `match` from `Array.find` (lines 117-120 TS18048), `SheetNode | undefined` passed where `SheetNode` required (line 229 TS2345), possibly-undefined `caseNode` (line 231 TS18048).

1. - [ ] **Step 1: Guard null `contentFile` in `readContentJson` (fixes line 64).** Current code (lines 57-66):

```ts
async function readContentJson(
  xmindPath: string,
): Promise<{ rootTopic?: { title?: string; children?: { attached?: unknown[] } } }[]> {
  const buffer = readFileSync(xmindPath);
  const zip = await JSZip.loadAsync(buffer);
  const contentFile = zip.file("content.json");
  expect(contentFile).toBeTruthy();
  const str = await contentFile.async("string");
  return JSON.parse(str);
}
```

Replace with:

```ts
async function readContentJson(
  xmindPath: string,
): Promise<{ rootTopic?: { title?: string; children?: { attached?: unknown[] } } }[]> {
  const buffer = readFileSync(xmindPath);
  const zip = await JSZip.loadAsync(buffer);
  const contentFile = zip.file("content.json");
  expect(contentFile).toBeTruthy();
  if (!contentFile) throw new Error("content.json missing from xmind archive");
  const str = await contentFile.async("string");
  return JSON.parse(str);
}
```

2. - [ ] **Step 2: Guard `match` after `results.find` (fixes lines 117, 118, 119, 120).** Current code (lines 115-120):

```ts
    const match = results.find((r) => r.title === "验证默认加载列表页");
    expect(match).toBeTruthy();
    expect(match.file).toBe(xmindPath);
    expect(match.priority).toBe("P0");
    expect(Array.isArray(match.tree_path)).toBeTruthy();
    expect(match.tree_path.includes("验证默认加载列表页")).toBeTruthy();
```

Replace with:

```ts
    const match = results.find((r) => r.title === "验证默认加载列表页");
    expect(match).toBeTruthy();
    if (!match) throw new Error("match not found");
    expect(match.file).toBe(xmindPath);
    expect(match.priority).toBe("P0");
    expect(Array.isArray(match.tree_path)).toBeTruthy();
    expect(match.tree_path.includes("验证默认加载列表页")).toBeTruthy();
```

3. - [ ] **Step 3: Guard `rootTopic` before `findByTitle` and guard `caseNode` (fixes lines 229, 231).** Current code (lines 227-231):

```ts
    const rootTopic = (sheets[0] as { rootTopic?: SheetNode }).rootTopic;
    expect(rootTopic).toBeTruthy();
    const caseNode = findByTitle(rootTopic, "验证默认加载列表页");
    expect(caseNode).toBeTruthy();
    expect(caseNode.markers?.some((m) => m.markerId === "priority-3")).toBeTruthy();
```

Replace with:

```ts
    const rootTopic = (sheets[0] as { rootTopic?: SheetNode }).rootTopic;
    expect(rootTopic).toBeTruthy();
    if (!rootTopic) throw new Error("rootTopic missing");
    const caseNode = findByTitle(rootTopic, "验证默认加载列表页");
    expect(caseNode).toBeTruthy();
    if (!caseNode) throw new Error("caseNode not found");
    expect(caseNode.markers?.some((m) => m.markerId === "priority-3")).toBeTruthy();
```

4. - [ ] **Step 4: Verify this file is error-free.**
   Run: `bun run type-check 2>&1 | grep -c "tests/xmind/patch.test.ts"`
   Expected output: `0`

5. - [ ] **Step 5: Verify the test still passes.**
   Run: `bun test .claude/scripts/_shared/tests/xmind/patch.test.ts`
   Expected output: ends with `0 fail`.

6. - [ ] **Step 6: Commit.**
   Run: `git add .claude/scripts/_shared/tests/xmind/patch.test.ts && git commit -m "test: 🧪 fix null-safety type errors in xmind patch test"`

---

### Task: fix null-safety type errors in tests/history-convert.test.ts

**Files:** Modify `.claude/scripts/_shared/tests/history-convert.test.ts` (lines 108-112, 123-126, 425-428, 451-454)

6 errors, all possibly-undefined results of `Array.find` (TS18048): `result` (108→used 110,111,112) and (123→used 126), `converted` (425→used 428) and (451→used 454).

1. - [ ] **Step 1: Guard `result` in the first conversion test (fixes lines 110, 111, 112).** Current code (lines 108-112):

```ts
    const result = out.files.find((f) => f.input === FIXTURE_CSV);
    expect(result).toBeTruthy();
    expect(result.status).toBe("converted");
    expect(result.output.endsWith(".md")).toBeTruthy();
    expect(existsSync(result.output)).toBeTruthy();
```

Replace with:

```ts
    const result = out.files.find((f) => f.input === FIXTURE_CSV);
    expect(result).toBeTruthy();
    if (!result) throw new Error("result not found");
    expect(result.status).toBe("converted");
    expect(result.output.endsWith(".md")).toBeTruthy();
    expect(existsSync(result.output)).toBeTruthy();
```

2. - [ ] **Step 2: Guard `result` in the markdown-content test (fixes line 126).** Current code (lines 123-126):

```ts
    const result = out.files.find((f) => f.input === FIXTURE_CSV);
    expect(result && result.status === "converted").toBeTruthy();

    const content = readFileSync(result.output, "utf8");
```

Replace with:

```ts
    const result = out.files.find((f) => f.input === FIXTURE_CSV);
    expect(result && result.status === "converted").toBeTruthy();
    if (!result) throw new Error("result not found");

    const content = readFileSync(result.output, "utf8");
```

3. - [ ] **Step 3: Guard `converted` in the first `--filter` test (fixes line 428).** Current code (lines 425-428):

```ts
    const converted = out.files.find((f) => f.status === "converted");
    expect(converted).toBeTruthy();

    const content = readFileSync(converted.output, "utf8");
```

Replace with:

```ts
    const converted = out.files.find((f) => f.status === "converted");
    expect(converted).toBeTruthy();
    if (!converted) throw new Error("converted file not found");

    const content = readFileSync(converted.output, "utf8");
```

4. - [ ] **Step 4: Guard `converted` in the second `--filter` test (fixes line 454).** Current code (lines 451-454):

```ts
    const converted = out.files.find((f) => f.status === "converted");
    expect(converted).toBeTruthy();

    const content = readFileSync(converted.output, "utf8");
    expect(content).toContain("验证订单列表加载");
```

Replace with:

```ts
    const converted = out.files.find((f) => f.status === "converted");
    expect(converted).toBeTruthy();
    if (!converted) throw new Error("converted file not found");

    const content = readFileSync(converted.output, "utf8");
    expect(content).toContain("验证订单列表加载");
```

5. - [ ] **Step 5: Verify this file is error-free.**
   Run: `bun run type-check 2>&1 | grep -c "tests/history-convert.test.ts"`
   Expected output: `0`

6. - [ ] **Step 6: Verify the test still passes.**
   Run: `bun test .claude/scripts/_shared/tests/history-convert.test.ts`
   Expected output: ends with `0 fail`.

7. - [ ] **Step 7: Commit.**
   Run: `git add .claude/scripts/_shared/tests/history-convert.test.ts && git commit -m "test: 🧪 fix null-safety type errors in history convert test"`

---

### Task: fix null-safety type errors in tests/case-signal-analyzer.test.ts

**Files:** Modify `.claude/scripts/_shared/tests/case-signal-analyzer.test.ts` (lines 41-46, 86)

6 errors. Root cause for 5 of them (lines 68,71,94,162,164): `runCli` returns `ReturnType<typeof spawnSync>`, whose `stdout`/`stderr` are `string | NonSharedBuffer` (the `encoding: "utf8"` option isn't statically narrowed), and `JSON.parse(...)` requires `string`. Fix once by giving `runCli` an explicit return type with `stdout`/`stderr` typed `string`. The 6th error (line 86 TS2769): `knowledge.level` is `unknown` passed to `toContain(expected: string)` — fix with a cast. Both `stdout` and `stderr` are decoded strings at runtime because of `encoding: "utf8"`, so the typed return matches reality.

1. - [ ] **Step 1: Give `runCli` an explicit string-typed return (fixes lines 68, 71, 94, 162, 164).** Current code (lines 41-46):

```ts
function runCli(args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync(KATA_CLI, ["case-signal-analyzer", ...args], {
    encoding: "utf8",
    cwd: repoRoot,
  });
}
```

Replace with:

```ts
function runCli(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const r = spawnSync(KATA_CLI, ["case-signal-analyzer", ...args], {
    encoding: "utf8",
    cwd: repoRoot,
  });
  return {
    status: r.status,
    stdout: String(r.stdout ?? ""),
    stderr: String(r.stderr ?? ""),
  };
}
```

2. - [ ] **Step 2: Cast `knowledge.level` for `toContain` (fixes line 86).** Current code (line 86):

```ts
    expect(["missing", "weak"]).toContain(knowledge.level);
```

Replace with:

```ts
    expect(["missing", "weak"]).toContain(knowledge.level as string);
```

3. - [ ] **Step 3: Verify this file is error-free.**
   Run: `bun run type-check 2>&1 | grep -c "tests/case-signal-analyzer.test.ts"`
   Expected output: `0`

4. - [ ] **Step 4: Verify the test still passes.**
   Run: `bun test .claude/scripts/_shared/tests/case-signal-analyzer.test.ts`
   Expected output: ends with `0 fail`.

5. - [ ] **Step 5: Commit.**
   Run: `git add .claude/scripts/_shared/tests/case-signal-analyzer.test.ts && git commit -m "test: 🧪 fix type errors in case signal analyzer test"`

---

### Task: fix null-safety type errors in tests/writer-context-builder.test.ts

**Files:** Modify `.claude/scripts/_shared/tests/writer-context-builder.test.ts` (lines 447, 655)

5 errors, all `out.knowledge.core` possibly-undefined (TS18048): lines 449 (x2 cols 14,58), 453, 657, 658. `core` is typed `{...} | undefined` and only guarded by `expect(out.knowledge.core).toBeTruthy()`. Add a `throw` after each guard.

1. - [ ] **Step 1: Guard `out.knowledge.core` in the first test (fixes lines 449, 453).** Current code (line 447):

```ts
    expect(out.knowledge.core).toBeTruthy();
    expect(
      typeof out.knowledge.core.overview === "string" && out.knowledge.core.overview.length > 0,
```

Replace with:

```ts
    expect(out.knowledge.core).toBeTruthy();
    if (!out.knowledge.core) throw new Error("knowledge.core missing");
    expect(
      typeof out.knowledge.core.overview === "string" && out.knowledge.core.overview.length > 0,
```

   (This single guard inserted right after line 447 narrows `core` for both line 449 and line 453, since they are in the same block with no reassignment between them.)

2. - [ ] **Step 2: Guard `out.knowledge.core` in the 8192-char test (fixes lines 657, 658).** Current code (line 655):

```ts
    expect(out.knowledge.core).toBeTruthy();
    expect(
      out.knowledge.core.overview.length <= 8192,
```

Replace with:

```ts
    expect(out.knowledge.core).toBeTruthy();
    if (!out.knowledge.core) throw new Error("knowledge.core missing");
    expect(
      out.knowledge.core.overview.length <= 8192,
```

3. - [ ] **Step 3: Verify this file is error-free.**
   Run: `bun run type-check 2>&1 | grep -c "tests/writer-context-builder.test.ts"`
   Expected output: `0`

4. - [ ] **Step 4: Verify the test still passes.**
   Run: `bun test .claude/scripts/_shared/tests/writer-context-builder.test.ts`
   Expected output: ends with `0 fail`.

5. - [ ] **Step 5: Commit.**
   Run: `git add .claude/scripts/_shared/tests/writer-context-builder.test.ts && git commit -m "test: 🧪 fix null-safety type errors in writer context builder test"`

---

### Task: fix null-safety type errors in tests/test-case-flow/project-resolver.test.ts

**Files:** Modify `.claude/scripts/_shared/tests/test-case-flow/project-resolver.test.ts` (lines 6-7, 11-12, 16-21, 25-29)

4 errors (TS2339): `resolveProject` returns the non-discriminated union `{ project: string } | { status: string; candidates?: string[]; reason?: string }` (verified at `.claude/skills/case-draft/scripts/test-case-flow/project-resolver.ts:12`). TS cannot narrow which branch by property access alone, so `result.project` (lines 7,12,21) and `result.status` (line 29) error. The union has no shared discriminant, so cast each access to the branch the test asserts. Keeps intent: the test already knows which branch each input produces.

1. - [ ] **Step 1: Cast to the `{ project }` branch in the explicit-name test (fixes line 7).** Current code (lines 6-7):

```ts
    const result = resolveProject({ explicitProject: "demo", workspaceProjects: ["a"] });
    expect(result.project).toBe("demo");
```

Replace with:

```ts
    const result = resolveProject({ explicitProject: "demo", workspaceProjects: ["a"] });
    expect((result as { project: string }).project).toBe("demo");
```

2. - [ ] **Step 2: Cast in the single-workspace test (fixes line 12).** Current code (lines 11-12):

```ts
    const result = resolveProject({ explicitProject: "auto", workspaceProjects: ["only"] });
    expect(result.project).toBe("only");
```

Replace with:

```ts
    const result = resolveProject({ explicitProject: "auto", workspaceProjects: ["only"] });
    expect((result as { project: string }).project).toBe("only");
```

3. - [ ] **Step 3: Cast in the Lanhu-alias test (fixes line 21).** Current code (lines 16-21):

```ts
    const result = resolveProject({
      explicitProject: "auto",
      lanhuProjectNames: ["资产"],
      repoProfiles: [{ project: "assets", aliases: ["资产"] }],
    });
    expect(result.project).toBe("assets");
```

Replace with:

```ts
    const result = resolveProject({
      explicitProject: "auto",
      lanhuProjectNames: ["资产"],
      repoProfiles: [{ project: "assets", aliases: ["资产"] }],
    });
    expect((result as { project: string }).project).toBe("assets");
```

4. - [ ] **Step 4: Cast to the status branch in the multiple-candidates test (fixes line 29).** Current code (lines 25-29):

```ts
    const result = resolveProject({
      explicitProject: "auto",
      workspaceProjects: ["a", "b"],
    });
    expect(result.status).toBe("needs_user_selection");
```

Replace with:

```ts
    const result = resolveProject({
      explicitProject: "auto",
      workspaceProjects: ["a", "b"],
    });
    expect((result as { status: string }).status).toBe("needs_user_selection");
```

5. - [ ] **Step 5: Verify this file is error-free.**
   Run: `bun run type-check 2>&1 | grep -c "tests/test-case-flow/project-resolver.test.ts"`
   Expected output: `0`

6. - [ ] **Step 6: Verify the test still passes.**
   Run: `bun test .claude/scripts/_shared/tests/test-case-flow/project-resolver.test.ts`
   Expected output: ends with `0 fail`.

7. - [ ] **Step 7: Commit.**
   Run: `git add .claude/scripts/_shared/tests/test-case-flow/project-resolver.test.ts && git commit -m "test: 🧪 fix union narrowing type errors in project resolver test"`

---

### Task: fix null-safety type errors in tests/format-report-locator.test.ts

**Files:** Modify `.claude/scripts/_shared/tests/format-report-locator.test.ts` (lines 103-107)

1 error: `fc01Issue` possibly-undefined from `Array.find` (line 107, TS18048).

1. - [ ] **Step 1: Guard `fc01Issue` (fixes line 107).** Current code (lines 103-107):

```ts
    const fc01Issue = enriched.issues.find(
      (i) => i.rule === "FC01" && i.case_title === "验证新增功能",
    );
    expect(fc01Issue).toBeTruthy();
    expect(fc01Issue.location.line > 0).toBeTruthy();
```

Replace with:

```ts
    const fc01Issue = enriched.issues.find(
      (i) => i.rule === "FC01" && i.case_title === "验证新增功能",
    );
    expect(fc01Issue).toBeTruthy();
    if (!fc01Issue) throw new Error("fc01Issue not found");
    expect(fc01Issue.location.line > 0).toBeTruthy();
```

2. - [ ] **Step 2: Verify this file is error-free.**
   Run: `bun run type-check 2>&1 | grep -c "tests/format-report-locator.test.ts"`
   Expected output: `0`

3. - [ ] **Step 3: Verify the test still passes.**
   Run: `bun test .claude/scripts/_shared/tests/format-report-locator.test.ts`
   Expected output: ends with `0 fail`.

4. - [ ] **Step 4: Commit.**
   Run: `git add .claude/scripts/_shared/tests/format-report-locator.test.ts && git commit -m "test: 🧪 fix null-safety type error in format report locator test"`

---

### Task: fix null-safety type errors in tests/search-filter.test.ts

**Files:** Modify `.claude/scripts/_shared/tests/search-filter.test.ts` (lines 197-199)

1 error: `suiteA` possibly-undefined from `Array.find` (line 199, TS18048).

1. - [ ] **Step 1: Guard `suiteA` (fixes line 199).** Current code (lines 197-199):

```ts
    const suiteA = results.find((r) => r.suite_name === "套件A");
    expect(suiteA).toBeTruthy();
    expect(suiteA.case_count).toBe(10);
```

Replace with:

```ts
    const suiteA = results.find((r) => r.suite_name === "套件A");
    expect(suiteA).toBeTruthy();
    if (!suiteA) throw new Error("suiteA not found");
    expect(suiteA.case_count).toBe(10);
```

2. - [ ] **Step 2: Verify this file is error-free.**
   Run: `bun run type-check 2>&1 | grep -c "tests/search-filter.test.ts"`
   Expected output: `0`

3. - [ ] **Step 3: Verify the test still passes.**
   Run: `bun test .claude/scripts/_shared/tests/search-filter.test.ts`
   Expected output: ends with `0 fail`.

4. - [ ] **Step 4: Commit.**
   Run: `git add .claude/scripts/_shared/tests/search-filter.test.ts && git commit -m "test: 🧪 fix null-safety type error in search filter test"`

---

### Task: fix null-safety type errors in tests/large-file-split.test.ts

**Files:** Modify `.claude/scripts/_shared/tests/large-file-split.test.ts` (lines 60-62)

1 error (line 61 col 54, TS2345): inside the local `functionName` helper, `"name" in node && node.name` narrows `node` to `ts.Node & Record<"name", unknown>`, so `node.name` has type `unknown` (`{}` after truthiness), which is not assignable to `ts.Node` for `ts.isIdentifier(...)` (and `.text` access on line 62). Cast `node.name` to `ts.Node` once via a local const.

1. - [ ] **Step 1: Cast `node.name` to `ts.Node` (fixes line 61, also covers `.text` on line 62).** Current code (lines 60-63):

```ts
function functionName(node: ts.Node, sourceFile: ts.SourceFile): string {
  if ("name" in node && node.name && ts.isIdentifier(node.name)) {
    return node.name.text;
  }
```

Replace with:

```ts
function functionName(node: ts.Node, sourceFile: ts.SourceFile): string {
  if ("name" in node && node.name) {
    const nameNode = node.name as ts.Node;
    if (ts.isIdentifier(nameNode)) {
      return nameNode.text;
    }
  }
```

2. - [ ] **Step 2: Verify this file is error-free.**
   Run: `bun run type-check 2>&1 | grep -c "tests/large-file-split.test.ts"`
   Expected output: `0`

3. - [ ] **Step 3: Verify the test still passes.**
   Run: `bun test .claude/scripts/_shared/tests/large-file-split.test.ts`
   Expected output: ends with `0 fail`.

4. - [ ] **Step 4: Commit.**
   Run: `git add .claude/scripts/_shared/tests/large-file-split.test.ts && git commit -m "test: 🧪 fix ts node typing in large file split test"`

---

### Task: fix null-safety type errors in tests/lib/create-project.test.ts

**Files:** Modify `.claude/scripts/_shared/tests/lib/create-project.test.ts` (line 158)

1 error (TS2345): `SKELETON_SPEC.gitkeep_dirs.includes("_shared/rules")` — `gitkeep_dirs` has a narrow literal element type that does not include `"_shared/rules"`, so `.includes` rejects the literal. The test's intent is "`_shared/rules` is NOT in gitkeep_dirs" (asserting `!...includes(...)`), so a wider-type comparison is correct. Cast the array to `readonly string[]` for the `includes` call.

1. - [ ] **Step 1: Widen the `includes` receiver (fixes line 158).** Current code (line 158):

```ts
    expect(!SKELETON_SPEC.gitkeep_dirs.includes("_shared/rules")).toBeTruthy();
```

Replace with:

```ts
    expect(!(SKELETON_SPEC.gitkeep_dirs as readonly string[]).includes("_shared/rules")).toBeTruthy();
```

2. - [ ] **Step 2: Verify this file is error-free.**
   Run: `bun run type-check 2>&1 | grep -c "tests/lib/create-project.test.ts"`
   Expected output: `0`

3. - [ ] **Step 3: Verify the test still passes.**
   Run: `bun test .claude/scripts/_shared/tests/lib/create-project.test.ts`
   Expected output: ends with `0 fail`.

4. - [ ] **Step 4: Commit.**
   Run: `git add .claude/scripts/_shared/tests/lib/create-project.test.ts && git commit -m "test: 🧪 fix includes literal type error in create project test"`

---

### Task: fix null-safety type errors in tests/lib/env.test.ts

**Files:** Modify `.claude/scripts/_shared/tests/lib/env.test.ts` (line 140)

1 error (TS2769): line 137 does `delete process.env.INIT_TEST_KEY_NEW`, which narrows that property to `undefined` for the rest of the block; TS does NOT reset this narrowing across the `initEnv(envPath)` call (the index-signature property stays narrowed). So on line 140 `expect(process.env.INIT_TEST_KEY_NEW)` is typed `undefined`, and `.toBe("newval")` resolves the `(expected: undefined)` overload — rejecting the `"newval"` string. VERIFIED FIX (tested in isolation): casting the actual read to `string | undefined` widens it back so the correct `(expected: string|undefined)` overload is chosen. Keeps intent identical — at runtime the env var is set by `initEnv`.

1. - [ ] **Step 1: Cast the actual read to its real type (fixes line 140).** Current code (line 140):

```ts
    expect(process.env.INIT_TEST_KEY_NEW).toBe("newval");
```

Replace with:

```ts
    expect(process.env.INIT_TEST_KEY_NEW as string | undefined).toBe("newval");
```

2. - [ ] **Step 2: Verify this file is error-free.**
   Run: `bun run type-check 2>&1 | grep -c "tests/lib/env.test.ts"`
   Expected output: `0`

3. - [ ] **Step 3: Verify the test still passes.**
   Run: `bun test .claude/scripts/_shared/tests/lib/env.test.ts`
   Expected output: ends with `0 fail`.

4. - [ ] **Step 4: Commit.**
   Run: `git add .claude/scripts/_shared/tests/lib/env.test.ts && git commit -m "test: 🧪 fix process env narrowing type error in env test"`

---

### Task: fix null-safety type errors in tests/lib/knowledge.test.ts

**Files:** Modify `.claude/scripts/_shared/tests/lib/knowledge.test.ts` (line 330)

1 error (TS2554): `confidenceGate` is declared with 2 required params (`confidence: string, confirmed: boolean` — verified at `.claude/scripts/_shared/lib/knowledge.ts:277`). Line 330 calls it with 1 arg. The test ("rejects low always (even with --confirmed)") asserts both unconfirmed and confirmed low are rejected. The 1-arg call clearly meant "unconfirmed" — pass explicit `false`. Keeps intent: line 330 tests low+unconfirmed, line 331 tests low+confirmed.

1. - [ ] **Step 1: Pass explicit `false` (fixes line 330).** Current code (lines 330-331):

```ts
    expect(confidenceGate("low").allowed).toBe(false);
    expect(confidenceGate("low", true).allowed).toBe(false);
```

Replace with:

```ts
    expect(confidenceGate("low", false).allowed).toBe(false);
    expect(confidenceGate("low", true).allowed).toBe(false);
```

2. - [ ] **Step 2: Verify this file is error-free.**
   Run: `bun run type-check 2>&1 | grep -c "tests/lib/knowledge.test.ts"`
   Expected output: `0`

3. - [ ] **Step 3: Verify the test still passes.**
   Run: `bun test .claude/scripts/_shared/tests/lib/knowledge.test.ts`
   Expected output: ends with `0 fail`.

4. - [ ] **Step 4: Commit.**
   Run: `git add .claude/scripts/_shared/tests/lib/knowledge.test.ts && git commit -m "test: 🧪 fix confidenceGate arg count in knowledge test"`

---

### Task: verify all real test-file type errors are resolved

**Files:** none (verification only)

1. - [ ] **Step 1: Confirm zero type errors remain in real test files (this batch's scope).**
   Run: `bun run type-check 2>&1 | grep "error TS" | grep -vE "codemod/fixtures/|tests/lint/fixtures/|progress-store" | grep "test" | wc -l`
   Expected output: `0`

2. - [ ] **Step 2: Confirm total remaining errors are ONLY the 4 production-source errors (sibling task, not this batch).**
   Run: `bun run type-check 2>&1 | grep -c "error TS"`
   Expected output: `4`
   (These 4 are `cli/index.ts:79`, `cli/index.ts:132`, `cli/repo-sync.ts:195`, `knowledge-curate/.../write.ts:204` — fixed in the B2a-prod sibling task. If that task is already merged, expect `0`.)

3. - [ ] **Step 3: Run the full test suite to confirm no behavioral regression across all 12 touched files.**
   Run: `bun test`
   Expected output: ends with `0 fail` (pass count 1397 after B1 deleted progress-store.test.ts; 1 skip).

4. - [ ] **Step 4: Run lint to confirm the guard/cast edits introduced no biome regressions.**
   Run: `bun run check`
   Expected output: exit code 0 (no NEW warnings beyond the pre-existing baseline — the `if (!x) throw` guards and `as` casts use no banned constructs; `as` casts are `noExplicitAny`/`noNonNullAssertion`-neutral).

**本批 crossRefs（后续批次须一致）：** After B2a-tests + the B2a-prod sibling task (4 production errors) are both merged, `bun run type-check` = 0 errors — this is the hard gate B3 depends on (B3 chains `bun run ci` which runs type-check). The final "0 errors" assertion is split: this batch drives the TEST subset to 0 (45 errors across 12 files); the 4 production-source errors are a SEPARATE sibling task and MUST be merged before `bun run type-check` truly hits 0. Verified ground-truth: after B1 delete + tsconfig fixture-exclude, baseline is 49 errors (45 test + 4 prod). The runCli helper return-type change in case-signal-analyzer.test.ts establishes `{ status: number | null; stdout: string; stderr: string }` — any later batch touching that file must keep stdout/stderr typed string. project-resolver.ts return type is a NON-discriminated union `{ project: string } | { status: string; candidates?: string[]; reason?: string }` (no shared `status`/`project` discriminant) — tests cast per-branch; if a later refactor makes it a discriminated union the casts become removable. confidenceGate signature is `(confidence: string, confirmed: boolean)` — 2 required args. Commit type used throughout: `test: 🧪` (test-only edits), matching the mandated type/emoji map.

**本批 risks：** 1. ESTIMATE CORRECTION: spec/prompt estimated ~48 test errors across 6 files; the REAL set is exactly 45 errors across 12 files (gen 11 not 12; patch 7; history-convert 6; case-signal-analyzer 6; writer-context-builder 5; project-resolver 4; PLUS 6 more files with 1 error each: format-report-locator, search-filter, large-file-split, lib/create-project, lib/env, lib/knowledge). Do not skip the 6 single-error files — they are real and the prompt's "~48" did not enumerate them. 2. The `if (!x) throw new Error(...)` guard pattern is preferred over scattering `!` non-null assertions because biome's noNonNullAssertion is still `warn` in this batch (B2b keeps it warn) — adding `!` operators would ADD warnings; the throw-guards add none. The few `as` casts used (knowledge.level as string, project-resolver branch casts, gitkeep_dirs as readonly string[], process.env as string|undefined, ts.Node cast) are type-assertion casts, NOT `any` — they do not trip noExplicitAny or noNonNullAssertion. 3. env.test.ts:140 is subtle: the error comes from `delete` narrowing the property to `undefined`, and TS does NOT reset it across the intervening `initEnv()` call. I VERIFIED in isolation that casting the read (`as string | undefined`) is the working fix, while a `let`-reassign or annotated-`const` does NOT work. Do not substitute a different fix here. 4. case-signal-analyzer.test.ts: only `JSON.parse(result.stdout)` lines errored (stdout needs string); the `result.stderr` lines 126/142/168 did NOT error because toContain/toMatch accept the union — but typing the helper return as string is still correct and fixes all stdout sites at once. Use `String(r.stdout ?? "")` to guarantee string at runtime regardless of spawnSync's union. 5. The two xmind files share an identical bug in their LOCAL `readContentJson` helpers (gen:35, patch:64) — both need the same `if (!contentFile) throw` guard; they are separate functions in separate files, fix both. 6. ORDERING: every per-file `grep -c "<file>"` verification is independent and can run in any order. But the FINAL "total = 4" / "= 0" check depends on whether the B2a-prod sibling task has merged — state this honestly, do not claim 0 prematurely. Per project rules, run `bun test` AND `bun run check` after the edits (changed code => must test + lint). 7. Line numbers will SHIFT within a file as you insert guard lines top-to-bottom. Apply edits within each file in the order given (the code blocks anchor on surrounding context, not raw line numbers, so exact-string Edit is safe), and re-run that file's `grep -c` before committing.

---

## 批次 B2b · Tier 3 清 biome 未用告警并把正确性规则提到 error

## Batch B2b — clean biome correctness warnings, then promote rules to error

> Depends on B1 (deletes progress-store + features/paths). B2b can run after B2a or before it (independent of type-check). Work in the detached worktree. After EVERY task run `bun run check` (the project's `biome check .` whole-repo lint+format gate) and `bun test`.
>
> **Verified ground-truth baseline (measured at HEAD, biome 2.4.15):** `bun run check` = exit 0 with **149 warnings**: 70 noUnusedVariables, 44 noNonNullAssertion, 16 noExplicitAny, 8 noAssignInExpressions, 6 useTemplate, 5 noImplicitAnyLet, 3 noUnusedFunctionParameters, 2 noUnusedImports, 1 noTemplateCurlyInString. (Spec's "153/47/noRedeclare=1" was a stale count — current truth is the list here. There are **0** noRedeclare / noFallthroughSwitchClause / noUnsafeOptionalChaining warnings.)
> **Rule category prefixes (exact, for biome.json):** noImplicitAnyLet, noAssignInExpressions, noRedeclare, noFallthroughSwitchClause are under `suspicious`; noUnsafeOptionalChaining, noUnusedVariables, noUnusedImports under `correctness`; noNonNullAssertion under `style`.
> All 70 unused vars are destructured bindings: **69× `stderr`** + **1× `stdout`** (knowledge-curate.test.ts:846). Fixtures (`*.fixture.ts`) are already excluded by biome.json line 60, so none appear here.

---

### Task: B2b-1 Remove the two unused import specifiers (manual — biome marks these "Unsafe fix")

**Files:** Modify `.claude/scripts/_shared/tests/cases/case-extract.test.ts` (line 2); Modify `.claude/scripts/_shared/tests/lib/paths.test.ts` (line 1)

> NOTE: `bun run check:fix` (safe `biome check --fix`) will NOT remove these — both are multi-specifier imports and biome classifies partial-specifier removal as an **Unsafe fix** ("Several of these imports are unused"). Verified by probe. Do the edits manually. Only ONE specifier is unused in each file (the others are used 2–66 times).

1. - [ ] **Step 1: Drop `mkdirSync` from the node:fs import in case-extract.test.ts.** Current line 2 is `import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";`. Replace with:
```ts
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
```

2. - [ ] **Step 2: Drop `afterEach` from the bun:test import in paths.test.ts.** Current line 1 is `import { afterEach, describe, expect, it, test } from "bun:test";`. Replace with:
```ts
import { describe, expect, it, test } from "bun:test";
```

3. - [ ] **Step 3: Verify no unused-imports remain.**
   - Run: `bunx --bun @biomejs/biome check . --reporter=json --max-diagnostics=400 2>/dev/null | bun -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log("unusedImports:", r.diagnostics.filter(d=>d.category==="lint/correctness/noUnusedImports").length)'`
   - Expected output: `unusedImports: 0`

4. - [ ] **Step 4: Run targeted tests + full lint.**
   - Run: `bun test .claude/scripts/_shared/tests/cases/case-extract.test.ts .claude/scripts/_shared/tests/lib/paths.test.ts`
   - Expected: exit 0, 0 fail.
   - Run: `bun run check` — Expected: exit 0 (warning total drops from 149 to 147).

5. - [ ] **Step 5: Commit.**
   - Run: `git add -A && git commit -m "refactor: ✨ drop unused import specifiers in two test files"`

---

### Task: B2b-2 Remove 70 unused destructured bindings via deterministic codemod (then reflow)

**Files:** Modify (via codemod) `.claude/scripts/_shared/tests/archive-gen.test.ts`, `search-filter.test.ts`, `source-analyze.test.ts`, `writer-context-builder.test.ts`, `format-report-locator.test.ts`, `knowledge-curate.test.ts`, `xmind/gen.test.ts`, `xmind/patch.test.ts`

> WHY a codemod, not Edit-per-line: there are 70 bindings and many destructure lines are textually identical (`const { code, stdout, stderr } = run([`). A naive replace-all is UNSAFE — e.g. archive-gen.test.ts has 22 `stderr` destructures but only 21 are unused (line 470 uses `stdout + stderr`). Biome does NOT auto-fix unused destructured bindings (verified: neither safe `--fix` nor `--fix --unsafe` touches them). The codemod below keys off biome's JSON `{line,column}` spans (exact identifier position) and removes only flagged bindings, bottom-up so positions stay valid. **Validated end-to-end on copies of all 8 real files: 70→0 unused vars, used `stderr` untouched.**
>
> After the codemod, shortened multi-line `run([...])` calls now fit within lineWidth 100, so biome's formatter wants to reflow them onto one line. `bun run check` includes the formatter, so the codemod MUST be followed by a safe formatter pass (`biome check --write`). The reflow is behavior-preserving (identical call args). Verified clean afterward.

1. - [ ] **Step 1: Create the throwaway codemod script** at `/tmp/b2b-unusedvars-codemod.ts` (NOT committed — it lives in /tmp):
```ts
import { readFileSync, writeFileSync } from "node:fs";
const report = JSON.parse(readFileSync(process.argv[2], "utf8"));
const diags = (report.diagnostics ?? []).filter(
  (d: any) => d.category === "lint/correctness/noUnusedVariables",
);
const byPath = new Map<string, { line: number; col: number }[]>();
for (const d of diags) {
  const p = d.location.path;
  if (!byPath.has(p)) byPath.set(p, []);
  byPath.get(p)!.push({ line: d.location.start.line, col: d.location.start.column });
}
for (const [p, spans] of byPath) {
  const lines = readFileSync(p, "utf8").split("\n");
  spans.sort((a, b) => b.line - a.line || b.col - a.col); // bottom-up, right-to-left
  for (const { line, col } of spans) {
    const idx = line - 1;
    const text = lines[idx];
    const start = col - 1;
    const m = /^[A-Za-z0-9_$]+/.exec(text.slice(start));
    if (!m) throw new Error(`no identifier at ${p}:${line}:${col} -> ${text}`);
    const end = start + m[0].length;
    let before = text.slice(0, start);
    let after = text.slice(end);
    if (/,\s*$/.test(before)) {
      before = before.replace(/,\s*$/, ""); // last binding: drop preceding comma
    } else if (/^\s*,/.test(after)) {
      after = after.replace(/^\s*,\s*/, ""); // first/middle binding: drop following comma+spaces
    }
    lines[idx] = before + after;
  }
  writeFileSync(p, lines.join("\n"));
}
console.log(`patched ${byPath.size} files, ${diags.length} bindings`);
```

2. - [ ] **Step 2: Generate the biome JSON report from the repo root, then run the codemod.** Run from the worktree root (so report paths are repo-relative and the codemod resolves them against cwd):
```bash
bunx --bun @biomejs/biome check . --reporter=json --max-diagnostics=400 > /tmp/b2b-report.json 2>/dev/null
bun run /tmp/b2b-unusedvars-codemod.ts /tmp/b2b-report.json
```
   - Expected output: `patched 8 files, 70 bindings`

3. - [ ] **Step 3: Reflow with the safe formatter (this is what makes `bun run check` clean).**
   - Run: `bunx --bun @biomejs/biome check . --write --max-diagnostics=400`
   - Expected: reports `Fixed N files` (≈5 reflowed); only the safe formatter fix is applied (no unsafe rules run). Spot-check that a multi-line call collapsed, e.g. archive-gen.test.ts line ~217 is now `const { code, stdout } = run(["search", "--query", "质量问题台账", "--dir", archiveDir]);`.

4. - [ ] **Step 4: Verify zero unused vars remain and lint is clean.**
   - Run: `bunx --bun @biomejs/biome check . --reporter=json --max-diagnostics=400 2>/dev/null | bun -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log("unusedVars:", r.diagnostics.filter(d=>d.category==="lint/correctness/noUnusedVariables").length)'`
   - Expected output: `unusedVars: 0`
   - Run: `bun run check` — Expected: exit 0, warning total now ≈77 (147 − 70).

5. - [ ] **Step 5: Run the affected tests (reflow must not change behavior).**
   - Run: `bun test .claude/scripts/_shared/tests/archive-gen.test.ts .claude/scripts/_shared/tests/search-filter.test.ts .claude/scripts/_shared/tests/source-analyze.test.ts .claude/scripts/_shared/tests/writer-context-builder.test.ts .claude/scripts/_shared/tests/format-report-locator.test.ts .claude/scripts/_shared/tests/knowledge-curate.test.ts .claude/scripts/_shared/tests/xmind/gen.test.ts .claude/scripts/_shared/tests/xmind/patch.test.ts`
   - Expected: exit 0, 0 fail. (The removed bindings were never read; `run()` still returns the full `{stdout, stderr, code}` object.)

6. - [ ] **Step 6: Confirm /tmp codemod is not staged, then commit.**
   - Run: `git status --short` — Expected: only the 8 test files under `.claude/scripts/_shared/tests/` modified.
   - Run: `git add -A && git commit -m "refactor: ✨ drop unused stderr/stdout destructuring in tests"`

---

### Task: B2b-3 Delete three unused linter `opts` parameters

**Files:** Modify `.claude/scripts/_shared/lint/agent-shape.ts` (line 20); Modify `.claude/scripts/_shared/lint/skill-shape.ts` (line 19); Modify `.claude/scripts/_shared/lint/skill-frontmatter.ts` (line 10)

> Verified: no caller passes `opts` — `agents-audit.ts` calls `lintAgentShape(scanDir)`, `skill-audit.ts` calls `lintSkillShape(join(...))` and `lintAgentFrontmatter(join(...), knownSkillSet)`, and all test callers pass at most 2 args. The param is purely vestigial dead code → delete it (biome's own fix would rename to `_opts`, but deletion is cleaner and safe since zero callers pass it). The body never references `opts`.

1. - [ ] **Step 1: Delete the `opts` param in agent-shape.ts line 20.** Replace:
```ts
export function lintAgentShape(scanPath: string, opts: Record<string, unknown> = {}): AgentReport {
```
   with:
```ts
export function lintAgentShape(scanPath: string): AgentReport {
```

2. - [ ] **Step 2: Delete the `opts` param in skill-shape.ts line 19.** Replace:
```ts
export function lintSkillShape(skillDir: string, opts: Record<string, unknown> = {}): SkillReport {
```
   with:
```ts
export function lintSkillShape(skillDir: string): SkillReport {
```

3. - [ ] **Step 3: Delete the `opts` param in skill-frontmatter.ts lines 7-11.** Replace:
```ts
export function lintAgentFrontmatter(
  filePath: string,
  knownSkills: Set<string>,
  opts: Record<string, unknown> = {},
): SkillReport {
```
   with:
```ts
export function lintAgentFrontmatter(
  filePath: string,
  knownSkills: Set<string>,
): SkillReport {
```

4. - [ ] **Step 4: Verify no unused params remain + run lint tests.**
   - Run: `bunx --bun @biomejs/biome check . --reporter=json --max-diagnostics=400 2>/dev/null | bun -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log("unusedParams:", r.diagnostics.filter(d=>d.category==="lint/correctness/noUnusedFunctionParameters").length)'`
   - Expected output: `unusedParams: 0`
   - Run: `bun test .claude/scripts/_shared/tests/lint/agent-shape.test.ts .claude/scripts/_shared/tests/lint/skill-shape.test.ts .claude/scripts/_shared/tests/lint/skill-frontmatter.test.ts`
   - Expected: exit 0, 0 fail.
   - Run: `bun run check` — Expected: exit 0.

5. - [ ] **Step 5: Commit.**
   - Run: `git add -A && git commit -m "refactor: ✨ remove unused opts param from three linter fns"`

---

### Task: B2b-4 Fix the 5 noImplicitAnyLet warnings (type the deferred `let`)

**Files:** Modify `.claude/scripts/_shared/lint/skill-frontmatter.ts` (line 14); Modify `.claude/skills/case-draft/scripts/source-analyze.ts` (line 55); Modify `.claude/skills/defect-analyze/scripts/defect-report.ts` (lines 77, 97); Modify `.claude/skills/defect-analyze/scripts/scan-report.ts` (line 85)

> Each is a `let x;` declared before a `try { x = fn(); }`. Annotate with `ReturnType<typeof fn>` (or the imported type) — no new imports needed. Validated: `ReturnType<typeof statSync>` / `<typeof validateBugReport>` / `<typeof fetchAndDiff>` clears noImplicitAnyLet (biome exit 0) and typechecks. These rule warnings live under `lint/suspicious/noImplicitAnyLet`.

1. - [ ] **Step 1: skill-frontmatter.ts line 14** — `let parsed;` → annotate with the gray-matter return type. `matter` is `import matter from "gray-matter"`. Replace:
```ts
  let parsed;
```
   with:
```ts
  let parsed: ReturnType<typeof matter>;
```

2. - [ ] **Step 2: source-analyze.ts line 55** — `let stat;` (before `stat = statSync(fullPath)`; `statSync` imported from node:fs at line 8). Replace:
```ts
      let stat;
```
   with:
```ts
      let stat: ReturnType<typeof statSync>;
```

3. - [ ] **Step 3: defect-report.ts line 77** — `let report;` (before `report = validateBugReport(...)`; imported at line 12). Replace the FIRST occurrence (line 77, inside the render-bug action):
```ts
        let report;
        try {
          report = validateBugReport(loadJson(opts.json));
```
   with:
```ts
        let report: ReturnType<typeof validateBugReport>;
        try {
          report = validateBugReport(loadJson(opts.json));
```

4. - [ ] **Step 4: defect-report.ts line 97** — second `let report;` (before `report = validateConflictReport(...)`, inside the render-conflict action). Replace:
```ts
        let report;
        try {
          report = validateConflictReport(loadJson(opts.json));
```
   with:
```ts
        let report: ReturnType<typeof validateConflictReport>;
        try {
          report = validateConflictReport(loadJson(opts.json));
```

5. - [ ] **Step 5: scan-report.ts line 85** — `let diffOut;` (before `diffOut = fetchAndDiff(...)`; imported at line 15). Replace:
```ts
  let diffOut;
```
   with:
```ts
  let diffOut: ReturnType<typeof fetchAndDiff>;
```

6. - [ ] **Step 6: Verify + test.**
   - Run: `bunx --bun @biomejs/biome check . --reporter=json --max-diagnostics=400 2>/dev/null | bun -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log("implicitAnyLet:", r.diagnostics.filter(d=>d.category==="lint/suspicious/noImplicitAnyLet").length)'`
   - Expected output: `implicitAnyLet: 0`
   - Run: `bun test .claude/scripts/_shared/tests/lint .claude/scripts/_shared/tests/source-analyze.test.ts` and any defect-analyze tests — Expected: 0 fail.
   - Run: `bun run check` — Expected: exit 0.

7. - [ ] **Step 7: Commit.**
   - Run: `git add -A && git commit -m "refactor: ✨ annotate deferred let bindings to clear implicit-any"`

---

### Task: B2b-5 Fix the 8 noAssignInExpressions warnings (while→for regex-exec loops)

**Files:** Modify `.claude/scripts/_shared/lib/codemod/node-test-to-bun-test.ts` (lines 116, 146); Modify `.claude/scripts/_shared/lib/codemod/strip-matcher-message.ts` (line 116); Modify `.claude/scripts/_shared/lib/enhanced-doc-store.ts` (lines 58, 244); Modify `.claude/scripts/_shared/lint/skill-structure.ts` (line 63); Modify `.claude/scripts/_shared/lint/skill-frontmatter.ts` (line 51); Modify `.claude/skills/case-draft/scripts/lib/signal-probe.ts` (line 217)

> All 8 are the same idiom: `let m: RegExpExecArray | null;` followed by `while ((m = re.exec(x)) !== null) { ... }`. The assignment-in-condition triggers `lint/suspicious/noAssignInExpressions`. Convert to a `for` loop that hoists the assignment out of a boolean expression: `for (let m = re.exec(x); m !== null; m = re.exec(x)) { ... }`. Validated: clears the rule (biome exit 0) and preserves behavior. **Delete the now-redundant standalone `let m: RegExpExecArray | null;` line** that preceded each loop.

1. - [ ] **Step 1: node-test-to-bun-test.ts lines 115-116 (replaceAssertThrows).** Replace:
```ts
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(input)) !== null) {
```
   with:
```ts
  for (let m = pattern.exec(input); m !== null; m = pattern.exec(input)) {
```

2. - [ ] **Step 2: node-test-to-bun-test.ts lines 145-146 (replaceAssertWithParen).** Replace:
```ts
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(input)) !== null) {
```
   with:
```ts
  for (let m = pattern.exec(input); m !== null; m = pattern.exec(input)) {
```
   > Both occurrences are textually identical — use Edit with `replace_all` disabled and disambiguate by including the surrounding unique line, or apply Step 1 then Step 2 to the remaining single occurrence. After Step 1 the first is already changed, so Step 2's pattern is then unique.

3. - [ ] **Step 3: strip-matcher-message.ts lines 114-116.** Current:
```ts
  let m: RegExpExecArray | null;
  let lastIndex = 0;
  while ((m = re.exec(source)) !== null) {
```
   Replace with:
```ts
  let lastIndex = 0;
  for (let m = re.exec(source); m !== null; m = re.exec(source)) {
```

4. - [ ] **Step 4: enhanced-doc-store.ts lines 57-58 (parseSections).** Replace:
```ts
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
```
   with:
```ts
  for (let m = re.exec(block); m !== null; m = re.exec(block)) {
```

5. - [ ] **Step 5: enhanced-doc-store.ts lines 243-244 (the pending-items loop).** Replace:
```ts
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
```
   with:
```ts
  for (let m = re.exec(block); m !== null; m = re.exec(block)) {
```
   > Same disambiguation note as Step 2 — after Step 4 this occurrence is unique.

6. - [ ] **Step 6: skill-structure.ts lines 62-63 (referencedPhaseFiles).** Replace:
```ts
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) out.add(m[1]);
```
   with:
```ts
  for (let m = re.exec(body); m !== null; m = re.exec(body)) out.add(m[1]);
```

7. - [ ] **Step 7: skill-frontmatter.ts lines 49-51 (A4 reference scan).** Current:
```ts
    let m: RegExpExecArray | null;
    const refRe = new RegExp(REF_LINK_REGEX.source, "g");
    while ((m = refRe.exec(parsed.content)) !== null) {
```
   Replace with:
```ts
    const refRe = new RegExp(REF_LINK_REGEX.source, "g");
    for (let m = refRe.exec(parsed.content); m !== null; m = refRe.exec(parsed.content)) {
```

8. - [ ] **Step 8: signal-probe.ts lines 216-217.** Replace:
```ts
  let anchorMatch: RegExpExecArray | null;
  while ((anchorMatch = anchorPattern.exec(content)) !== null) {
```
   with:
```ts
  for (
    let anchorMatch = anchorPattern.exec(content);
    anchorMatch !== null;
    anchorMatch = anchorPattern.exec(content)
  ) {
```

9. - [ ] **Step 9: Verify + test.**
   - Run: `bunx --bun @biomejs/biome check . --reporter=json --max-diagnostics=400 2>/dev/null | bun -e 'const r=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log("assignInExpr:", r.diagnostics.filter(d=>d.category==="lint/suspicious/noAssignInExpressions").length)'`
   - Expected output: `assignInExpr: 0`
   - Run: `bun test .claude/scripts/_shared/tests/codemod .claude/scripts/_shared/tests/enhanced-doc-store.test.ts .claude/scripts/_shared/tests/lint` (and any signal-probe / source-analyze tests)
   - Expected: 0 fail. (These loops back well-tested codemods/linters; behavior is identical.)
   - Run: `bun run check` — Expected: exit 0.

10. - [ ] **Step 10: Commit.**
   - Run: `git add -A && git commit -m "refactor: ✨ convert regex-exec while loops to for to drop assign-in-expr"`

---

### Task: B2b-6 Promote correctness/suspicious rules from warn to error in biome.json

**Files:** Modify `biome.json` (lines 25-40, the `linter.rules` block)

> PREREQUISITE — all of B2b-1..B2b-5 done and `bun run check` exit 0 with zero warnings for: noUnusedVariables, noUnusedImports, noImplicitAnyLet, noAssignInExpressions. The rules noUnsafeOptionalChaining, noRedeclare, noFallthroughSwitchClause already have **0** warnings at baseline (verified) — safe to promote with no fixes. Promotion turns these into errors so `bun run check` returns non-zero on any regression. **Keep as warn** (separate burn-down, per spec): noNonNullAssertion (44), noExplicitAny (16), noTemplateCurlyInString (1), and the existing complexity/noUselessStringRaw.

1. - [ ] **Step 1: Edit `biome.json`.** Current `correctness`, `style`, and `suspicious` blocks (lines 25-40):
```json
      "correctness": {
        "noUnusedVariables": "warn",
        "noUnusedImports": "warn",
        "noUnsafeOptionalChaining": "warn"
      },
      "style": {
        "noNonNullAssertion": "warn"
      },
      "suspicious": {
        "noExplicitAny": "warn",
        "noImplicitAnyLet": "warn",
        "noAssignInExpressions": "warn",
        "noTemplateCurlyInString": "warn",
        "noRedeclare": "warn",
        "noFallthroughSwitchClause": "warn"
      },
```
   Replace with (noUnusedVariables / noUnusedImports / noUnsafeOptionalChaining / noImplicitAnyLet / noAssignInExpressions / noRedeclare / noFallthroughSwitchClause → `error`; noNonNullAssertion / noExplicitAny / noTemplateCurlyInString stay `warn`):
```json
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error",
        "noUnsafeOptionalChaining": "error"
      },
      "style": {
        "noNonNullAssertion": "warn"
      },
      "suspicious": {
        "noExplicitAny": "warn",
        "noImplicitAnyLet": "error",
        "noAssignInExpressions": "error",
        "noTemplateCurlyInString": "warn",
        "noRedeclare": "error",
        "noFallthroughSwitchClause": "error"
      },
```

2. - [ ] **Step 2: Verify `bun run check` is still green after promotion.**
   - Run: `bun run check`
   - Expected: exit 0. Remaining warnings only from noNonNullAssertion (44) + noExplicitAny (16) + noTemplateCurlyInString (1) + noUselessStringRaw — i.e. `Found 61 warnings` (and 6 infos). ZERO errors.

3. - [ ] **Step 3: Prove a regression now FAILS (deliberate, then revert).** Temporarily reintroduce an unused binding to confirm the gate bites:
   - Run: `printf '\nconst { code: _c, stderr: _unusedRegressionProbe } = { code: 0, stderr: "" };\nconsole.log(_c);\n' >> .claude/scripts/_shared/lint/skill-structure.ts && bun run check; echo "EXIT=$?"`
   - Expected: biome reports `lint/correctness/noUnusedVariables` as an **error** (`_unusedRegressionProbe` unused) and `EXIT=1` (non-zero).
   - Revert the probe: `git checkout -- .claude/scripts/_shared/lint/skill-structure.ts`
   - Run: `bun run check; echo "EXIT=$?"` — Expected: `EXIT=0`.

4. - [ ] **Step 4: Final batch verification.**
   - Run: `bun test` — Expected: ~1188 pass / 0 fail (post-B0+B1 1187, plus 1 new agents-audit test added in this task; key constraint is 0 fail).
   - Run: `bun run check:skills` — Expected: exit 0 (runtime-detach contract intact; B2b touched no CLAUDE.md/rules text).

5. - [ ] **Step 5: Commit.**
   - Run: `git add biome.json && git commit -m "build: 🏗️ promote biome correctness rules from warn to error"`

**本批 crossRefs（后续批次须一致）：** biome 2.4.15 (devDep "@biomejs/biome": "^2.4.15"). `bun run check` = `biome check .` (whole repo, lint+format); `bun run check:fix` = `biome check --fix .` (SAFE only — does NOT remove the 2 multi-specifier unused imports nor any unused destructured var, so those are manual/codemod). biome.json files.includes already excludes `!!**/*.fixture.ts` (line 60) and `!!workspace` — promotion does not touch fixtures. Rule category prefixes that B3/biome.json must match exactly: correctness/{noUnusedVariables,noUnusedImports,noUnsafeOptionalChaining}, style/noNonNullAssertion, suspicious/{noExplicitAny,noImplicitAnyLet,noAssignInExpressions,noTemplateCurlyInString,noRedeclare,noFallthroughSwitchClause}. After B2b, `bun run check` exit 0 with ~61 warnings remaining (noNonNullAssertion 44 + noExplicitAny 16 + noTemplateCurlyInString 1) — those stay warn for a later burn-down batch and B3 must NOT expect them gone. Helper functions referenced: lintAgentShape (agent-shape.ts), lintSkillShape (skill-shape.ts), lintAgentFrontmatter (skill-frontmatter.ts) — none take opts after this batch; callers in cli/agents-audit.ts and cli/skill-audit.ts already omit opts (no change needed). The `run()`/`runGen()`/`runEdit()`/`runProjectKnowledge()` test helpers still return full {stdout,stderr,code} objects — only the destructuring patterns shrink.

**本批 risks：** 1. SPEC BASELINE DRIFT: spec said 153 warnings / noNonNullAssertion 47 / noRedeclare 1 / noImplicitAnyLet under style. ACTUAL measured truth: 149 warnings, noNonNullAssertion 44, noRedeclare 0, noFallthroughSwitchClause 0, noUnsafeOptionalChaining 0, noImplicitAnyLet under `suspicious` (5). Promoting noRedeclare/noFallthroughSwitchClause/noUnsafeOptionalChaining is safe precisely because they have 0 warnings now — but if B1 or B2a (run before B2b) reintroduce any, re-measure before B2b-6. ALWAYS re-run the JSON-count probe at the start of B2b to get live numbers; counts above are HEAD-time. 2. CODEMOD ORDERING (B2b-2): the codemod MUST run from the worktree root (same cwd biome's JSON report was generated in) because it resolves `d.location.path` against process.cwd(). It sorts spans bottom-up AND right-to-left per line so multiple bindings on one line stay valid. Do NOT hand-edit these 70 lines — many are textually identical and a naive replace-all WILL corrupt the ~1 used `stderr` per file (archive-gen.test.ts:470 uses stdout+stderr). 3. FORMATTER REFLOW (B2b-2 Step 3): skipping the `biome check --write` reflow leaves `bun run check` RED with `format` diagnostics (shortened multi-line run([...]) calls now fit on one line). The reflow is behavior-preserving; still run `bun test` after. 4. DUPLICATE-LINE EDITS (B2b-5 Steps 2 & 5): node-test-to-bun-test.ts and enhanced-doc-store.ts each have two identical `while ((m = ...exec...))` blocks. Apply the first edit, which makes the second occurrence unique, then apply the second. Delete the standalone `let m: RegExpExecArray | null;` line each time (it becomes redundant — the `for` re-declares m). Do NOT leave a dangling `let m;`. 5. biome check:fix is SAFE-only — it will NOT do the unused-import removal (Unsafe), the useTemplate (Unsafe), or the param-underscore (Unsafe). Never substitute `check:fix` for the manual edits in B2b-1/B2b-3; only B2b-2 Step 3 uses `--write` and that is for formatting reflow, which is safe. 6. The 6 useTemplate + 1 noTemplateCurlyInString + 16 noExplicitAny + 44 noNonNullAssertion warnings are explicitly OUT of scope for B2b — do not touch them; they remain warn and `bun run check` stays exit 0 with them present. 7. Throwaway codemod at /tmp/b2b-unusedvars-codemod.ts must NOT be committed (lint:debris check-debug-files would flag a stray script in-repo). Keep it in /tmp; `git status --short` before committing B2b-2.

---

## 批次 B3 · Tier 1 接通 CI 安全网

## B3 — Wire up the CI safety net (Tier 1)

> Depends on B2 making `bun run type-check` = 0 error. Do NOT start B3 until `bun run ci` passes the type-check step locally. Verify the precondition first (Task 1, Step 1).

---

### Task: Add the full CI gate workflow (.github/workflows/ci.yml)

**Files:** Create `.github/workflows/ci.yml`

- [ ] **Step 1: Confirm the B2 precondition — `bun run ci` is green end-to-end (run from repo root /Users/poco/Projects/kata).**

Run:
```
bun run ci
```
Expected output: the chain runs `lint → lint:debris → lint:agents → lint:paths → check:skills → lint:skills:codex/reasonix/hermes → type-check → test → test:plugins → test:tools` and exits 0. The final `bun test` summary must show `0 fail`, and `tsc --noEmit` (the `type-check` step) must print nothing and exit 0. If `bun run ci` does NOT exit 0, STOP — B2 is not complete; do not proceed with B3.

> Note: at this point `lint:agents` is still in the `ci` chain and still passes vacuously (scanned=0). Task 3 below adds the guard and removes it from the chain; that is why Task 3 must land before re-running `bun run ci` as the final gate.

- [ ] **Step 2: Create the CI workflow file.**

There is no `.bun-version` and no `packageManager`/`bun-version` field in `package.json` (verified), and CLAUDE.md requires Bun >= 1.3. Pin to `1.3.x`. Style matches the existing workflows: `actions/checkout@v4` + `oven-sh/setup-bun@v2` + `bun install`.

Create `.github/workflows/ci.yml` with EXACTLY this content:
```yaml
name: ci

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.x
      - run: bun install
      - run: bun run ci
```

- [ ] **Step 3: Lint the new workflow does not break repo invariants (YAML is not type-checked/tested, so verify the debris/stale-path lint still passes).**

Run:
```
bun run lint:debris
```
Expected output: the three lint scripts (`check-debug-files.ts`, `check-stale-paths.ts`, `check-runtime-artifacts.ts`) each run and exit 0; combined exit code 0.

- [ ] **Step 4: Commit.**

Run:
```
git add .github/workflows/ci.yml && git commit -m "ci: 👷 add full ci gate workflow running bun run ci"
```
Expected output: one file changed, one insertion commit created.

---

### Task: Repoint the two bare-`kata` workflows to `bunx kata`

**Files:** Modify `.github/workflows/features-index.yml` (line 19), Modify `.github/workflows/features-lint.yml` (line 18)

> Why: a bare `kata ...` run step is not on PATH in a GitHub `run:` step. The repo ships a `bin` entry (`package.json` "bin": {"kata": ".claude/scripts/_shared/bin/kata"}) which `bun install` symlinks to `node_modules/.bin/kata` (verified locally). `bunx kata` resolves that local symlink (verified: `bunx kata` runs the local CLI, exit 0) — it is the smallest change that matches the existing `setup-bun@v2` + `bun install` style, no extra `GITHUB_PATH` step needed.

- [ ] **Step 1: Fix `features-index.yml` run step.**

In `.github/workflows/features-index.yml`, replace the run step:
```yaml
      - run: kata features index --all
```
with:
```yaml
      - run: bunx kata features index --all
```

- [ ] **Step 2: Fix `features-lint.yml` run step.**

In `.github/workflows/features-lint.yml`, replace the run step:
```yaml
      - run: kata features lint --all --exit-code
```
with:
```yaml
      - run: bunx kata features lint --all --exit-code
```

- [ ] **Step 3: Verify `bunx kata` resolves the local bin and the subcommands exist (run from repo root).**

Run:
```
bunx kata features --help 2>&1 | grep -E "index|lint"
```
Expected output: lines for the `index` and `lint [featureId]` subcommands print (confirming `bunx kata features index`/`lint` are valid invocations). Exit 0.

- [ ] **Step 4: Commit.**

Run:
```
git add .github/workflows/features-index.yml .github/workflows/features-lint.yml && git commit -m "ci: 👷 invoke kata via bunx in features workflows"
```
Expected output: two files changed commit created.

---

### Task: Fix schema-check.yml (dedup path glob + add pull_request trigger)

**Files:** Modify `.github/workflows/schema-check.yml` (lines 3-7)

> The file currently lists the identical path glob `'.claude/scripts/_shared/schemas/**'` twice (lines 6 and 7) and only triggers on `push`. The schema tests are also run by the new `ci.yml` on every PR, but keep schema-check.yml as a fast path-scoped check; just dedup and add `pull_request` so schema-only PRs get the targeted run.

- [ ] **Step 1: Replace the `on:` block.**

In `.github/workflows/schema-check.yml`, replace:
```yaml
on:
  push:
    paths:
      - '.claude/scripts/_shared/schemas/**'
      - '.claude/scripts/_shared/schemas/**'
```
with:
```yaml
on:
  push:
    paths:
      - '.claude/scripts/_shared/schemas/**'
  pull_request:
    paths:
      - '.claude/scripts/_shared/schemas/**'
```

- [ ] **Step 2: Verify the schema tests this workflow runs still pass.**

Run:
```
bun test .claude/scripts/_shared/tests/schemas/
```
Expected output: all schema tests pass, `0 fail`, exit 0.

- [ ] **Step 3: Commit.**

Run:
```
git add .github/workflows/schema-check.yml && git commit -m "ci: 👷 dedup schema-check path glob and add pull_request trigger"
```
Expected output: one file changed commit created.

---

### Task: Guard the agents audit against a missing dir + drop lint:agents from ci (TDD — behavior change)

**Files:** Modify `.claude/scripts/_shared/cli/agents-audit.ts` (lines 15-29), Modify `.claude/scripts/_shared/tests/cli/agent-runtime-cli.test.ts` (lines 4-16), Modify `package.json` (line 34, the `ci` script)

> Verified current behavior: `.claude/agents/` does NOT exist; `bun .claude/scripts/_shared/bin/kata agents audit --exit-code --severity fail-only` prints `[agents audit] scanned=0 violations=0` and exits 0 — a vacuous gate. The existing test `agent-runtime-cli.test.ts:5-9` asserts `agents audit` exits 0, which becomes false after the guard, so it MUST be rewritten in the same task.
> The fixture dir `.claude/scripts/_shared/tests/lint/fixtures/agents-good/` exists (contains `good-agent.md`) and is used for the "populated dir passes" case. `agentsDir(root)` joins `<root>/.claude/agents`, and `repoRoot()` honors the `KATA_WORKSPACE_ROOT` override only inside `repoRoot`'s own logic — for the test we point `scanDir` at the fixture by passing `cwd`/`env` is not enough since `agentsDir` always appends `.claude/agents`. So the guard test for the passing case uses a temp dir layout. See Step 2 for the exact approach.

- [ ] **Step 1: Write the failing test (RED). Replace the entire body of `agent-runtime-cli.test.ts`.**

The new tests: (a) `agents audit` errors (non-zero exit) when the agents dir is missing — this is the real repo state, so just spawn the CLI as-is and assert non-zero + a clear message; (b) `skills audit` still exits 0 (unchanged); (c) the audit prints a "missing" diagnostic. Replace lines 1-16 with:
```ts
import { describe, expect, test } from "bun:test";
import { spawnKataCli } from "../cli-runner.ts";

describe("agent runtime CLI commands", () => {
  test("agents audit errors when the agents dir is missing", () => {
    // The repo intentionally has no .claude/agents/ dir; the audit must not
    // pass vacuously (scanned=0). It must surface a non-zero exit + a clear message.
    const result = spawnKataCli(["agents", "audit", "--exit-code"]);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("agents dir not found");
  });

  test("agents audit without --exit-code still reports the missing dir but exits 0", () => {
    const result = spawnKataCli(["agents", "audit"]);
    expect(result.status).toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("agents dir not found");
  });

  test("skills audit runs without error", () => {
    const result = spawnKataCli(["skills", "audit"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[skills audit]");
  });
});
```

Run:
```
bun test .claude/scripts/_shared/tests/cli/agent-runtime-cli.test.ts
```
Expected output (RED): the two `agents audit` tests FAIL — current CLI prints `scanned=0 violations=0`, exits 0, and never prints "agents dir not found". `skills audit` test passes.

- [ ] **Step 2: Implement the guard in `agents-audit.ts` (GREEN).**

Replace the import line (line 1) and the `.action(...)` body. First, change the import to add `existsSync`:
```ts
import { existsSync } from "node:fs";
import { agentsDir, repoRoot } from "@shared/lib/paths.ts";
```
Then replace the `.action((opts: ...) => { ... })` block (lines 15-29) with:
```ts
    .action((opts: { exitCode: boolean; severity: string }) => {
      const scanDir = agentsDir();
      // 目标目录缺失时报错而非静默通过（scanned=0 = 空门）。
      if (!existsSync(scanDir)) {
        const rel = scanDir.replace(repoRoot(), ".");
        console.log(`[agents audit] agents dir not found: ${rel}`);
        if (opts.exitCode) process.exit(1);
        return;
      }
      const shape = lintAgentShape(scanDir);
      const naming = lintAgentNaming(scanDir);
      const all = [...shape.violations, ...naming.violations];
      for (const v of all) {
        const rel = v.file.replace(repoRoot(), ".");
        const detail = v.lineCount ? `(${v.lineCount} lines)` : v.matched ? `[${v.matched}]` : "";
        console.log(`${rel}: [${v.rule}] ${detail} ${v.message}`);
      }
      console.log(`\n[agents audit] scanned=${shape.agents} violations=${all.length}`);
      const exitableViolations =
        opts.severity === "fail-only" ? all.filter((v) => v.severity !== "warn") : all;
      if (opts.exitCode && exitableViolations.length > 0) process.exit(1);
    });
```

Run:
```
bun test .claude/scripts/_shared/tests/cli/agent-runtime-cli.test.ts
```
Expected output (GREEN): all 3 tests pass, `0 fail`, exit 0.

- [ ] **Step 3: Remove `lint:agents` from the `ci` script in `package.json` (the project has no `.claude/agents/`, so the now-guarded audit would hard-fail the chain).**

In `package.json`, the `ci` script (line 34) currently is:
```json
    "ci": "bun run lint && bun run lint:debris && bun run lint:agents && bun run lint:paths && bun run check:skills && bun run lint:skills:codex && bun run lint:skills:reasonix && bun run lint:skills:hermes && bun run type-check && bun run test && bun run test:plugins && bun run test:tools",
```
Change it to (remove only `bun run lint:agents && `):
```json
    "ci": "bun run lint && bun run lint:debris && bun run lint:paths && bun run check:skills && bun run lint:skills:codex && bun run lint:skills:reasonix && bun run lint:skills:hermes && bun run type-check && bun run test && bun run test:plugins && bun run test:tools",
```
Leave the `lint:agents`, `lint:agents:claude` script entries (lines 37-38) unchanged — they stay available for manual / adapter use.

- [ ] **Step 4: Verify the audit no longer passes vacuously and is out of the ci chain.**

Run:
```
bun run lint:agents; echo "EXIT=$?"
```
Expected output: prints `[agents audit] agents dir not found: ./.claude/agents` and `EXIT=1` (the guarded audit now fails — which is why it was removed from the `ci` chain).

Run:
```
grep -c "lint:agents &&" package.json
```
Expected output: `0` (no occurrence of `lint:agents &&` remains — the `ci` chain no longer references it).

- [ ] **Step 5: Lint the changed TS files.**

Run:
```
bun run check
```
Expected output: biome exits 0 (no NEW errors/warnings introduced by the added `existsSync` import / guard).

- [ ] **Step 6: Commit.**

Run:
```
git add .claude/scripts/_shared/cli/agents-audit.ts .claude/scripts/_shared/tests/cli/agent-runtime-cli.test.ts package.json && git commit -m "fix: 🩹 fail agents audit on missing dir and drop lint:agents from ci"
```
Expected output: three files changed commit created.

---

### Task: Final end-to-end gate verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full ci chain locally (must be green end-to-end now that lint:agents is removed and type-check is fixed by B2).**

Run:
```
bun run ci
```
Expected output: every step (`lint → lint:debris → lint:paths → check:skills → lint:skills:codex → lint:skills:reasonix → lint:skills:hermes → type-check → test → test:plugins → test:tools`) runs and the whole chain exits 0. `tsc --noEmit` prints nothing; `bun test` summary shows `0 fail`. There must be NO `lint:agents` step in the run.

- [ ] **Step 2: Confirm `bun test` baseline holds.**

Run:
```
bun test 2>&1 | tail -5
```
Expected output: summary line showing `0 fail` (pass count ~1188 = post-B0+B1 1187 plus the 1 new agents-audit test added in this batch). Exit 0.

> No commit in this task — it is the merge gate. After B4 lands (parallel), re-run `bun run ci` on the merged HEAD per the spec's "合并前在 worktree + 合并后在 main 双跑" rule.

**本批 crossRefs（后续批次须一致）：** HARD DEPENDENCY: B3's final `bun run ci` gate (and ci.yml's `bun run ci` step) is GREEN only after B2 makes `tsc --noEmit` = 0 error. Do not run/claim the B3 end-to-end gate before B2 is merged into the same worktree. — The `ci` script in package.json line 34 is the single source of truth for what ci.yml runs; B3 removes `lint:agents` from it. If any later batch re-adds steps to `ci`, ci.yml needs no edit (it just calls `bun run ci`). — `bun-version: 1.3.x` in ci.yml is the chosen pin (Bun >= 1.3 per CLAUDE.md; local is 1.3.8; no .bun-version / packageManager field exists to override it). If the project later adds a `.bun-version` or `packageManager` pin, align ci.yml to it. — `agentsDir()` = `<repoRoot()>/.claude/agents` (paths.ts:272); `repoRoot()` is no-arg (paths.ts:6). The guard uses `existsSync` from `node:fs`. — DECISION POINT for the user (spec B3 item 2): the guard + removal assumes the project has NO agents to audit. If the intent is instead for `agents audit` to target the adapter agent dirs (root `.agents`/`.codex-plugin`/`.reasonix`/`.hermes` all exist), do NOT remove `lint:agents` from ci — instead repoint `agentsDir()` (or pass a `--scan-dir`/runtime option) at the adapter agent dir and keep the gate. Confirm with the user before executing this task. — The existing test `agent-runtime-cli.test.ts:5-9` (asserts `agents audit` exits 0) is INTENTIONALLY rewritten by this batch; any other test or doc that assumes `agents audit` exits 0 with scanned=0 must be updated to match the new error-on-missing-dir contract. — features-index.yml / features-lint.yml now call `bunx kata ...`; this relies on `bun install` creating `node_modules/.bin/kata` from package.json `bin` (verified symlink exists). If `bin` is renamed/removed, these steps break.

**本批 risks：** 1) ORDERING: ci.yml's `bun run ci` and Task 5's gate are RED until B2 lands. Task 1 Step 1 explicitly gates on this — do not skip it. If executed before B2, the workflow file is fine but local verification will fail at the type-check step. 2) The guard task changes runtime BEHAVIOR (agents audit now errors on missing dir) — it is TDD with a RED step that must actually fail first. The existing test asserting exit 0 MUST be rewritten in the same commit or `bun test` goes red. 3) Removing `lint:agents` from `ci` is REQUIRED alongside the guard: if you add the guard but leave `lint:agents` in the chain, `bun run ci` immediately fails at that step because `.claude/agents/` is absent. Do both in one commit (Task 4). 4) `bunx kata` in CI fetches from `node_modules/.bin/kata` (local symlink from package.json `bin`), NOT from the npm registry — confirmed it resolves the local CLI. It requires `bun install` to have run first (both workflows already do). 5) schema-check.yml dedup is cosmetic but the added `pull_request` trigger means schema PRs now run both schema-check.yml and ci.yml's schema tests — acceptable (spec allows the overlap); do not delete schema-check.yml. 6) YAML files are not covered by `tsc`/`bun test`/`biome`; the only automated guard touching them is `lint:debris` (stale-path) and `check:skills` — run `bun run lint:debris` after editing workflows. 7) Per project rules: all edits happen in a detached worktree; symlink `.kata` if needed; the pre-existing dirty `.vscode/settings.json` in main is unrelated — do NOT scoop it into a B3 commit. 8) Commit messages use the exact type/emoji mapping: ci 👷, fix 🩹 (used above); titles English-only.

---

## 批次 B4 · Tier 4 纠正说谎文档（CHANGELOG + 架构 SVG）

### Task: rewrite CHANGELOG Unreleased to 4.0.0-alpha.1

**Files:** Modify `/Users/poco/Projects/kata/CHANGELOG.md` (lines 3-21 only; lines 23-39 unchanged)

Context — the current top of `CHANGELOG.md` (lines 1-21) reads VERBATIM:

```markdown
# Changelog

## Unreleased

### Breaking

- Removed the retired generated runtime source and its CLI/test/lint compatibility surface.
- Claude Code maintains `.claude/**` as the single runtime implementation.

### Added

- Added Router contracts under runtime `contracts/routes/*.yaml`.
- Added runtime `contracts/skill-graph.yaml` as the skill graph.
- Added workflow contracts for case-draft, case-edit, case-hotfix, and playwright-automation.
- Added Blackboard schema and state model under runtime `contracts/**`.
- Added `bun run check:skills` coverage for runtime sync, runtime detach, route, skill graph, and workflow checks.

### Changed

- Project architecture now follows `SKILL + Router + Graph + Workflow + Blackboard`.
- `CLAUDE.md` is the hand-maintained public entrypoint for the Claude Code runtime.
```

The bullets about `contracts/routes/*.yaml`, `contracts/skill-graph.yaml`, the Blackboard schema, the `SKILL + Router + Graph + Workflow + Blackboard` tagline, and the `check:skills` route/graph/workflow/blackboard coverage claim describe subsystems that DO NOT EXIST in this repo (no `contracts/` dir; `check:skills` only does runtime sync/detach/structure — see `package.json` line 29). They must be deleted.

- [ ] **Step 1: Verify the stale section is exactly as quoted before editing**

  Run:
  ```bash
  sed -n '1,21p' /Users/poco/Projects/kata/CHANGELOG.md
  ```
  Expected output: identical to the verbatim block quoted above (21 lines, ending with the `CLAUDE.md` is the hand-maintained... bullet). If it differs, STOP and re-read the file before editing.

- [ ] **Step 2: Replace lines 3-21 with the truthful 4.0.0-alpha.1 section**

  Use Edit on `/Users/poco/Projects/kata/CHANGELOG.md`. Match this exact `old_string` (lines 3-21, i.e. everything from `## Unreleased` up to and including the `CLAUDE.md` bullet, leaving line 1 `# Changelog` and the blank line 2 in place, and leaving the `## 3.0.0-alpha.1` section at old line 23 untouched):

  old_string:
  ```
  ## Unreleased

  ### Breaking

  - Removed the retired generated runtime source and its CLI/test/lint compatibility surface.
  - Claude Code maintains `.claude/**` as the single runtime implementation.

  ### Added

  - Added Router contracts under runtime `contracts/routes/*.yaml`.
  - Added runtime `contracts/skill-graph.yaml` as the skill graph.
  - Added workflow contracts for case-draft, case-edit, case-hotfix, and playwright-automation.
  - Added Blackboard schema and state model under runtime `contracts/**`.
  - Added `bun run check:skills` coverage for runtime sync, runtime detach, route, skill graph, and workflow checks.

  ### Changed

  - Project architecture now follows `SKILL + Router + Graph + Workflow + Blackboard`.
  - `CLAUDE.md` is the hand-maintained public entrypoint for the Claude Code runtime.
  ```

  new_string:
  ```
  ## 4.0.0-alpha.1 (2026-06-03)

  ### Breaking

  - Removed the retired generated runtime source and its CLI/test/lint compatibility surface.
  - Collapsed the project to a single first-class runtime: `.claude/**` is the only hand-maintained runtime implementation.

  ### Added

  - Multi-runtime adapters that expose the 8 business skills with zero body copies: OpenAI Codex via `.agents/skills/` whole-dir symlinks plus `.codex-plugin/plugin.json`, Reasonix (DeepSeek) via `.reasonix/skills/` whole-dir symlinks, and Hermes via `.hermes/skills/` with `external_dirs` in `~/.hermes/config.yaml`.
  - Session bootstraps `using-kata-codex` / `using-kata-reasonix` / `using-kata-hermes` for per-runtime tool-name mapping.

  ### Changed

  - Architecture is now a single `.claude/**` runtime: `skills/` (8 business skills triggered by `SKILL.md` frontmatter), `scripts/_shared/**` (the kata CLI, lib, schemas, and lint), `plugins/` (lanhu / zentao / notify), and `rules/`. Routing is a prompt-level table in `CLAUDE.md`.
  - Rewrote `README.md`, `README-EN.md`, and `docs/**` to describe the `.claude/**` single runtime plus adapter directories.

  ### Removed

  - Cleaned up ~14k lines of dead runtime code; see `docs/audit/2026-06-02-runtime-audit.md` for the full audit and batch breakdown.
  ```

- [ ] **Step 3: Verify the result and that older sections are intact**

  Run:
  ```bash
  sed -n '1,30p' /Users/poco/Projects/kata/CHANGELOG.md && echo "---FORBIDDEN-LABELS---" && grep -nE 'contracts/routes|contracts/skill-graph|Blackboard|SKILL \+ Router \+ Graph|Unreleased' /Users/poco/Projects/kata/CHANGELOG.md || echo "NONE-FOUND"
  ```
  Expected: the new section header is `## 4.0.0-alpha.1 (2026-06-03)`; line `## 3.0.0-alpha.1 (2026-04-29)` still present; the FORBIDDEN-LABELS grep prints `NONE-FOUND` (no matches for the removed terms, including the literal `## Unreleased`).

- [ ] **Step 4: Run lint:debris stale-path invariant**

  Run:
  ```bash
  bun run lint:debris
  ```
  Expected: exit 0; final line `✓ F2: no dangling references to docs/refactor/` (the CHANGELOG references `docs/audit/2026-06-02-runtime-audit.md`, NOT `docs/refactor/`, so the invariant passes). Note: `lint:debris` does not parse CHANGELOG content beyond the `docs/refactor/` ban; the truthfulness of the new section is verified by Step 3's grep, not by this command.

- [ ] **Step 5: Commit**

  Run:
  ```bash
  git add CHANGELOG.md && git commit -m "docs: 📝 rewrite changelog top section to 4.0.0-alpha.1"
  ```

### Task: redraw kata-project-overview.svg

**Files:** Modify `/Users/poco/Projects/kata/assets/diagrams/kata-project-overview.svg` (full file replacement; current file is 76 lines)

Context — the SVG is referenced at the SAME unchanged path by both `README.md:126` and `README-EN.md:126` as `![Kata project architecture](./assets/diagrams/kata-project-overview.svg)`. Do NOT touch those README lines or rename the file. The current SVG carries stale labels that name nonexistent subsystems: `Kata SKILL + Router + Graph + Workflow + Blackboard` (title), `agents/openai.yaml`, `skill-manifest.yaml`, `manifest.routing.*`, `workflows/*.yaml`, `Blackboard: schema + review docs`, `README, AGENTS.md`, `Engine` / `kata CLI` (engine is gone — CLI now lives under `.claude/scripts/_shared`), and the footer `bun test --cwd engine`. The replacement must keep the same `width="1280" height="620" viewBox="0 0 1280 620"` and the same minimal flat style so it renders at identical size in both READMEs.

- [ ] **Step 1: Replace the entire SVG file**

  Use Write on `/Users/poco/Projects/kata/assets/diagrams/kata-project-overview.svg` with this EXACT content:

  ```svg
  <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="620" viewBox="0 0 1280 620" role="img" aria-labelledby="title desc">
    <title id="title">Kata project architecture</title>
    <desc id="desc">Kata maintains one first-class .claude runtime (skills, kata CLI, plugins, rules) and exposes the same skills to Codex, Reasonix, and Hermes through adapter directories. A single bun run ci quality gate guards it, and workspace artifacts are produced from read-only evidence sources.</desc>
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569"/>
      </marker>
      <style>
        text { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #0f172a; }
        .title { font-size: 30px; font-weight: 700; }
        .label { font-size: 19px; font-weight: 700; }
        .body { font-size: 14px; fill: #334155; }
        .box { fill: #f8fafc; stroke: #64748b; stroke-width: 2; rx: 8; }
        .runtime { fill: #ecfeff; stroke: #0891b2; }
        .adapter { fill: #f0fdf4; stroke: #16a34a; }
        .gate { fill: #fff7ed; stroke: #ea580c; }
        .workspace { fill: #fef2f2; stroke: #dc2626; }
        .line { stroke: #475569; stroke-width: 2.5; fill: none; marker-end: url(#arrow); }
      </style>
    </defs>

    <rect x="0" y="0" width="1280" height="620" fill="#ffffff"/>
    <text x="640" y="56" text-anchor="middle" class="title">Kata: one .claude runtime, many agent runtimes</text>

    <rect x="60" y="110" width="230" height="120" class="box"/>
    <text x="175" y="146" text-anchor="middle" class="label">Entrypoints</text>
    <text x="175" y="176" text-anchor="middle" class="body">README, CLAUDE.md</text>
    <text x="175" y="198" text-anchor="middle" class="body">slash commands</text>
    <text x="175" y="220" text-anchor="middle" class="body">prompt-level routing</text>

    <rect x="370" y="95" width="320" height="270" class="box runtime"/>
    <text x="530" y="132" text-anchor="middle" class="label">.claude/** runtime (first-class)</text>
    <text x="530" y="166" text-anchor="middle" class="body">skills/ — 8 skills, SKILL.md frontmatter triggers</text>
    <text x="530" y="194" text-anchor="middle" class="body">scripts/_shared/** — kata CLI, lib, schemas, lint</text>
    <text x="530" y="222" text-anchor="middle" class="body">plugins/ — lanhu / notify / zentao</text>
    <text x="530" y="250" text-anchor="middle" class="body">rules/ — project workflow rules</text>
    <text x="530" y="290" text-anchor="middle" class="body">hooks/ — write and command guards</text>
    <text x="530" y="332" text-anchor="middle" class="body">single source of truth for all runtimes</text>

    <rect x="770" y="95" width="450" height="125" class="box adapter"/>
    <text x="995" y="132" text-anchor="middle" class="label">Adapter directories (zero body copies)</text>
    <text x="995" y="162" text-anchor="middle" class="body">.agents + .codex-plugin/plugin.json — Codex (symlink)</text>
    <text x="995" y="186" text-anchor="middle" class="body">.reasonix — Reasonix / DeepSeek (symlink)</text>
    <text x="995" y="210" text-anchor="middle" class="body">.hermes — Hermes (external_dirs)</text>

    <rect x="770" y="245" width="450" height="120" class="box gate"/>
    <text x="995" y="282" text-anchor="middle" class="label">Quality gate</text>
    <text x="995" y="312" text-anchor="middle" class="body">bun run ci</text>
    <text x="995" y="336" text-anchor="middle" class="body">lint + debris + paths + check:skills</text>
    <text x="995" y="358" text-anchor="middle" class="body">+ type-check + test + test:plugins + test:tools</text>

    <rect x="370" y="440" width="320" height="110" class="box workspace"/>
    <text x="530" y="476" text-anchor="middle" class="label">workspace/{project}</text>
    <text x="530" y="506" text-anchor="middle" class="body">Archive MD, XMind, CSV, reports</text>
    <text x="530" y="528" text-anchor="middle" class="body">Playwright scripts, run evidence</text>

    <rect x="770" y="440" width="450" height="110" class="box"/>
    <text x="995" y="476" text-anchor="middle" class="label">Evidence sources</text>
    <text x="995" y="506" text-anchor="middle" class="body">Lanhu, ZenTao, SourceRef</text>
    <text x="995" y="528" text-anchor="middle" class="body">workspace/{project}/.kata/repos/** (read-only)</text>

    <path d="M290 170 L370 200" class="line"/>
    <path d="M690 150 L770 155" class="line"/>
    <path d="M690 300 L770 300" class="line"/>
    <path d="M530 365 L530 440" class="line"/>
    <path d="M995 550 L600 500" class="line"/>
  </svg>
  ```

- [ ] **Step 2: Verify it is valid XML**

  Run:
  ```bash
  bunx --bun xml-formatter --help >/dev/null 2>&1; python3 -c "import xml.dom.minidom,sys; xml.dom.minidom.parse('/Users/poco/Projects/kata/assets/diagrams/kata-project-overview.svg'); print('SVG-VALID-XML')"
  ```
  Expected: prints `SVG-VALID-XML` (the `python3` parse succeeds — confirms well-formed XML). If it raises an exception, the SVG is malformed; fix before continuing.

- [ ] **Step 3: Verify NO removed labels survive in the new SVG**

  Run:
  ```bash
  grep -nE 'SKILL \+ Router|Blackboard|skill-manifest|manifest\.routing|workflows/\*\.yaml|agents/openai\.yaml|AGENTS\.md|--cwd engine|Codex Runtime|Claude Runtime|Shared Contracts' /Users/poco/Projects/kata/assets/diagrams/kata-project-overview.svg && echo "STALE-LABEL-FOUND" || echo "NO-STALE-LABELS"
  ```
  Expected: prints `NO-STALE-LABELS` (grep finds zero matches, so the `&&` branch is skipped and the `||` branch runs).

- [ ] **Step 4: Verify the README image references are unchanged**

  Run:
  ```bash
  grep -n 'assets/diagrams/kata-project-overview.svg' /Users/poco/Projects/kata/README.md /Users/poco/Projects/kata/README-EN.md
  ```
  Expected exactly two lines:
  ```
  /Users/poco/Projects/kata/README.md:126:![Kata project architecture](./assets/diagrams/kata-project-overview.svg)
  /Users/poco/Projects/kata/README-EN.md:126:![Kata project architecture](./assets/diagrams/kata-project-overview.svg)
  ```
  (Path and filename must be unchanged. Do NOT edit these README lines.)

- [ ] **Step 5: Run lint:debris stale-path invariant**

  Run:
  ```bash
  bun run lint:debris
  ```
  Expected: exit 0; final line `✓ F2: no dangling references to docs/refactor/`. The SVG introduces no `docs/refactor/` references, so the invariant passes.

- [ ] **Step 6: Commit**

  Run:
  ```bash
  git add assets/diagrams/kata-project-overview.svg && git commit -m "docs: 📝 redraw architecture diagram for single .claude runtime"
  ```

**本批 crossRefs（后续批次须一致）：** Version string `4.0.0-alpha.1` MUST match package.json:3 and the README version badge (README.md:17 / README-EN.md:17 `version-4.0.0--alpha.1`) — do not invent a different version. The CHANGELOG `## 3.0.0-alpha.1 (2026-04-29)` and `## 2.0.0 (2026-04-01)` sections (old lines 23-39) stay byte-for-byte unchanged. The SVG is referenced at the unchanged path by README.md:126 AND README-EN.md:126; both READMEs already describe the .claude/** single-runtime + adapter-dirs model (README.md:128-153, README-EN.md:128-155) — the SVG labels must stay consistent with that prose (8 business skills under .claude/skills/; Codex via .agents + .codex-plugin/plugin.json symlink; Reasonix via .reasonix symlink; Hermes via .hermes external_dirs; plugins lanhu/notify/zentao). The audit doc path `docs/audit/2026-06-02-runtime-audit.md` referenced in the new CHANGELOG Removed bullet exists (verified). This batch is independent of B1/B2/B3 and can land in any order; it touches ONLY CHANGELOG.md and the SVG.

**本批 risks：** 1. DO NOT touch CLAUDE.md or .claude/rules/** in this batch — the runtime-detach substring contract (`check:skills`, enforced by `.claude/scripts/_shared/.../runtime-detach.ts`) validates specific substrings in those files; editing them risks breaking `check:skills`. B4 is scoped to CHANGELOG.md + SVG only, which sidesteps this entirely. 2. `lint:debris` (check-stale-paths.ts) ONLY bans the literal `docs/refactor/`; it does NOT validate CHANGELOG truthfulness or SVG label content — so the real verification that the lying labels are gone is the explicit grep steps (CHANGELOG Step 3, SVG Step 3), not lint:debris. Do not skip those greps. 3. The CHANGELOG `old_string` for the Edit spans from `## Unreleased` through the final `CLAUDE.md`-entrypoint bullet (old lines 3-21); line 1 `# Changelog` and blank line 2 are left in place, and the `## 3.0.0-alpha.1` header at old line 23 must NOT be included in the match. 4. Commit messages must follow the convention `type: emoji description` with English title — both tasks use `docs: 📝 ...`; the 📝 emoji is mandatory for docs. 5. No bun test / type-check / check needed for this batch: both changed files are docs/asset (`.md` and `.svg`), and the project testing rule exempts pure doc changes — but you MUST still run `bun run lint:debris` (it is fast and is the project's stale-path invariant), the XML-validity check, and the grep verifications. 6. Keep the SVG ASCII-only and avoid characters that need XML escaping inside text (the provided content uses none); if you re-flow any line, ensure `&`/`<`/`>` are not introduced unescaped or the XML-validity check in Step 2 will fail.

---

## 最终验证门（全部批次合并前在 worktree、合并后在 main 双跑）

```bash
cd /Users/poco/Projects/kata && bun run ci; echo "exit=$?"
```

逐项目标：
- `bun run ci` 端到端 exit=0（B0 修绿 check:skills、B2 修绿 type-check 后，`&&` 链首次能从头跑到尾）。
- `bun test`：约 1188 pass（1232 −45 B1 +1 B3 lint:agents 测试）/ 1 skip / 0 fail——以 worktree 内实测为准。
- `bun run type-check`：**0 error**。
- `bun run check`：exit 0，且 B2b 提到 error 的规则可在回归时 fail。
- `bun run check:skills`：三项 pass。

汇报时写清确切命令、退出码、pass/fail/skip 数与未验证范围。

## 执行顺序与依赖

1. **B0** → 修红 main（必须最先）。
2. **B1** → 删死代码（依赖 B0 的干净基线）。
3. **B2a-prod → B2a-tests → B2b** → type-check 到 0 + biome 提 error（B2a 依赖 B1 删掉 progress-store.test 的 16 错）。
4. **B3** → 接 CI（依赖 B2 把 type-check 修绿，否则 `bun run ci` 仍在 type-check 断）。
5. **B4** → 文档（独立，可与任意批并行）。

按项目规则：detached worktree 内分任务 commit，每任务跑相关验证，全绿后记 HEAD SHA → 回主工作树 `git merge --no-ff` → 复验 → `git push origin main` → `git worktree remove`。
