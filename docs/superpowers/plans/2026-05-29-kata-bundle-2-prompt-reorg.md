# kata Skill-Bundle 迁移 · Plan 2: 提示词/结构重组（两个试点 skill）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `case-draft` 与 `playwright-automation` 两个试点 skill 的 `references/**` 重组为自包含 bundle 结构——编排步骤进 `phases/§N-<step>.md`、subagent 提示词进 `prompts/agent-<step>.md`、few-shot 进 `fewshots/`、跨阶段参考留 `references/`——并相应改写两个 SKILL.md 的「按需加载协议」表与路由摘要；同时把 Plan-1 延后的 thin-lint 长度上限 + `phases/` 命名规则 + 负向 fixture 补齐，并清理 Plan-1 残留（孤儿 `plugins/` cruft、失效 `contracts/` 文档引用）。**纯文档/结构 + 一处 lint .ts 扩展，零业务代码迁移**（可执行代码迁移见后续 Plan 3）。

**Architecture:** 当前两个 SKILL.md 已是 prompt 驱动编排（`## 按需加载协议` 表按 `step.id` 条件加载 reference）。本计划是**搬迁 + 改名 + 表重写**，不改变运行语义：用 `git mv` 把文件移到 `phases/`/`prompts/`/`fewshots/`，改写 SKILL.md 表内路径与所有 skill 内交叉引用，靠既有 thin-lint 规则（SK-PHASE-MISSING、SK-PROMPT-NAME）+ 新增规则验证结构。playwright 是线性流水线 → 12 个步骤规范进 `phases/`；case-draft 编排留在 SKILL.md 内联 → 无 `phases/`，只迁 prompts/fewshots。

**Tech Stack:** Bun 1.3、TypeScript、gray-matter、Biome。`git mv` 保留历史；UTF-8 `§` 文件名 git 原生支持。

**Spec:** `docs/superpowers/specs/2026-05-29-kata-skill-bundle-migration-design.md`（§3 布局、§5 phases/prompts 语义、§8 lint）。本计划承接 Plan-1（已落地 `b0138d41c`），覆盖 spec 中「试点 skill references→phases/prompts + 补 thin-lint 长度上限/负向 fixture」一段。

---

## Prerequisites: Worktree

按项目 worktree-first 规则，在隔离 detached worktree 内执行（在主工作树运行）：

```bash
ROOT=$(pwd)
W="$ROOT/.worktrees/bundle-2-prompt-reorg"
git worktree add --detach "$W" main
cd "$W"
```

> 注：本计划只搬迁 tracked 文档与改一处 lint `.ts`，不读 `workspace/` 业务源，无需 symlink `.kata`。
> 注：主工作树存在与本计划无关的未提交删除（2 个旧 spec）与孤儿 `plugins/` cruft；worktree 从 `main` 检出不受影响。孤儿 `plugins/` cruft 的清理见 Task 8（在主工作树执行，不入 worktree commit）。

---

## File Structure

**playwright-automation（`.claude/skills/playwright-automation/`）：**
- 新建 `phases/`：12 个步骤规范（§1–§12）由 `references/<step>.md` 搬入并改名为 `§N-<step>.md`。
- 新建 `prompts/`：`agent-worker.md`、`agent-spec-reviewer.md`、`agent-quality-reviewer.md`（由对应 `*-prompt.md` 搬入改名）。
- 保留 `references/`：`execution-protocol.md`、`cli-essentials.md`（跨阶段协议/速查，非单步规范、非 subagent 提示词）。
- 改写 `SKILL.md`（按需加载协议表 + 路由摘要 + 引用 `references/env-preflight.md` 的硬规则行）。

**case-draft（`.claude/skills/case-draft/`）：**
- 新建 `prompts/`：`agent-worker.md`、`agent-spec-reviewer.md`、`agent-quality-reviewer.md`。
- 新建 `fewshots/`：`case-format-sample.md`、`case-format-sample.xmind.md`（由 `references/fewshots/` 上移一层到 skill 根 `fewshots/`）。
- 保留 `rules/naming-convention.md`。
- 删空目录 `references/`（迁空后移除）。
- 改写 `SKILL.md`（按需加载协议表，含把 `.claude/skills/_shared/case-qa.md` 归一化为 `.claude/prompt/_shared/case-qa.md`）。

**共享层：**
- Modify: `.claude/scripts/_shared/lint/skill-structure.ts`（加长度上限 + SK-PHASE-NAME 规则）。
- Modify: `engine/tests/lint/skill-structure.test.ts`（加负向 fixture）。

**清理（Plan-1 残留）：**
- Delete（untracked）：主工作树孤儿 `plugins/`（`.DS_Store` + `lanhu/mcp-bridge/lanhu-mcp/{.git,.venv,__pycache__,*.egg-info}` 运行时 cruft）。
- Modify: `.claude/rules/routing-guard.md`（删失效 `.claude/contracts/**` 引用）。
- Delete: 各 skill 目录内 `.DS_Store`（若 tracked）。

**不动（划归 Plan 3 / Plan 4）：**
- `engine/src/**` 全部命令模块与业务代码、`_shared/lib` 分类搬迁、CLI 重指、历史类型债修复 → Plan 3。
- `engine/` 删除、`engine/bin/kata` 路径文档（SKILL.md 路由摘要里的 `bun engine/bin/kata features resolve`）→ Plan 4。
- 根 `/lib/playwright/`（workspace 生成 spec 的运行时共享库，`@pw/*` 别名）→ 保持现位，本计划不动。

---

## 验证约定

本计划不改 `engine/src/**`，故无 Plan-1 的 engine 双 type-check 负担。每个 Task 末尾「全绿回归」固定跑：

```bash
bun run type-check && bun run check:skills 2>&1 | tail -6 && bun test engine/tests/lint/skill-structure.test.ts 2>&1 | tail -5
```

- `type-check`（根 tsconfig include `.claude/scripts/_shared/**`）覆盖 lint `.ts`。
- `check:skills` 跑结构 lint；搬迁后 SKILL.md 引用的 `phases/§N-*.md` 必须存在（SK-PHASE-MISSING）、`prompts/*.md` 必须 `agent-*.md`（SK-PROMPT-NAME）。
- 结构 lint 单测含「真实 skills 全绿」断言，是搬迁正确性的硬证据。
- Task 9 merge 前再跑一次全量 `bun test --cwd engine`（基线 1353 pass / 0 fail）+ `bun run check`（biome）。

---

## Task 1: 建立基线（确认重组前全绿）

**Files:** 无改动（只读验证）

- [ ] **Step 1: 结构 lint 基线**

Run: `bun run check:skills 2>&1 | tail -6`
Expected: exit 0，含 `runtime skill sync passed`、`runtime detach passed`、`skill structure check passed`。

- [ ] **Step 2: lint 单测基线**

Run: `bun test engine/tests/lint/skill-structure.test.ts 2>&1 | tail -5`
Expected: 2 test pass（真实 skills 全绿 + fixture 负向）。

- [ ] **Step 3: type-check 基线**

Run: `bun run type-check`
Expected: exit 0。

- [ ] **Step 4: 全量引擎测试基线**

Run: `bun test --cwd engine 2>&1 | tail -4`
Expected: `1353 pass, 1 skip, 0 fail`（作为 Task 9 对照）。

- [ ] **Step 5: 确认无 phases/ prompts/ 残留**

Run: `find .claude/skills -type d \( -name phases -o -name prompts \); echo "exit=$?"`
Expected: 无输出（本计划首次创建这两类目录）。

---

## Task 2: playwright-automation —— references 拆分为 phases/ + prompts/

**Files:**
- Move: `references/{case-normalize,env-preflight,ui-plan,ui-probe,plan-reconcile,playwright-generate,self-run,run-triage,repair-loop,quality-gate,handoff,case-feedback}.md` → `phases/§N-<step>.md`
- Move: `references/{worker-prompt,spec-reviewer-prompt,quality-reviewer-prompt}.md` → `prompts/agent-{worker,spec-reviewer,quality-reviewer}.md`
- Keep: `references/{execution-protocol,cli-essentials}.md`
- Modify: `.claude/skills/playwright-automation/SKILL.md`

- [ ] **Step 1: 建目标目录并搬迁 12 个步骤规范 → phases/**

```bash
cd .claude/skills/playwright-automation
mkdir -p phases prompts
git mv references/case-normalize.md     phases/§1-case-normalize.md
git mv references/env-preflight.md      phases/§2-env-preflight.md
git mv references/ui-plan.md            phases/§3-ui-plan.md
git mv references/ui-probe.md           phases/§4-ui-probe.md
git mv references/plan-reconcile.md     phases/§5-plan-reconcile.md
git mv references/playwright-generate.md phases/§6-playwright-generate.md
git mv references/self-run.md           phases/§7-self-run.md
git mv references/run-triage.md         phases/§8-run-triage.md
git mv references/repair-loop.md        phases/§9-repair-loop.md
git mv references/quality-gate.md       phases/§10-quality-gate.md
git mv references/handoff.md            phases/§11-handoff.md
git mv references/case-feedback.md      phases/§12-case-feedback.md
cd "$W"
```
Expected: 12 文件入 `phases/`，命名 `§N-<step>.md`。

- [ ] **Step 2: 搬迁 3 个 subagent 提示词 → prompts/**

```bash
cd .claude/skills/playwright-automation
git mv references/worker-prompt.md            prompts/agent-worker.md
git mv references/spec-reviewer-prompt.md     prompts/agent-spec-reviewer.md
git mv references/quality-reviewer-prompt.md  prompts/agent-quality-reviewer.md
cd "$W"
```
Expected: 3 文件入 `prompts/`，命名 `agent-<role>.md`。`references/` 仅剩 `execution-protocol.md`、`cli-essentials.md`。

- [ ] **Step 3: 确认 references/ 残留正确**

Run: `ls .claude/skills/playwright-automation/references/`
Expected: 恰好 `cli-essentials.md`、`execution-protocol.md` 两项。

- [ ] **Step 4: 改写 SKILL.md「按需加载协议」表**

把 `.claude/skills/playwright-automation/SKILL.md` 第 46–63 行的整张表替换为（仅改路径列，其余文字不变）：

```markdown
| 阶段 | 条件 | 文件 | 类型 | 用途 |
| --- | --- | --- | --- | --- |
| case-normalize | `step.id == case-normalize` | phases/§1-case-normalize.md | 规范 | 将 MD、Archive、PRD、Lanhu、脚本或失败结果归一化为 UiAutomationIntent。 |
| env-preflight | `step.id == env-preflight` | phases/§2-env-preflight.md | 规范 | 校验 base URL、登录态、项目、数据源、权限与浏览器依赖。 |
| ui-plan | `step.id == ui-plan` | phases/§3-ui-plan.md | 规范 | 规划覆盖范围、可见断言、fixture、选择器策略和风险。 |
| ui-probe | `step.id == ui-probe` | phases/§4-ui-probe.md | 规范 | 通过真实浏览器收集页面、可访问性、截图、网络与 locator 证据。 |
| plan-reconcile | `step.id == plan-reconcile` | phases/§5-plan-reconcile.md | 规范 | 对账书面用例与真实 UI，输出继续、调整、提问或阻塞。 |
| playwright-generate | `step.id == playwright-generate` | phases/§6-playwright-generate.md | 规范 | 基于对账后的计划和 UI 证据生成或修复 Playwright 脚本。 |
| self-run | `step.id == self-run` | phases/§7-self-run.md | 规范 | 运行目标 spec 并记录命令、退出码、输出与报告路径。 |
| run-triage | `step.id == run-triage` | phases/§8-run-triage.md | 规范 | 将失败归类为产品、脚本、数据、权限、环境、未知或需用户决策。 |
| repair-loop | `step.id == repair-loop` | phases/§9-repair-loop.md | 规范 | 执行有限修复循环并保留每次修复证据。 |
| quality-gate | `step.id == quality-gate` | phases/§10-quality-gate.md | 规范 | 检查脚本结构、断言完整性、session 合规、manifest、handoff 双轨等 15 项质量门禁。 |
| handoff | `step.id == handoff` | phases/§11-handoff.md | 参考 | 输出通过、阻塞、部分完成或修复耗尽的最终交付报告。 |
| ui-probe, playwright-generate, self-run, repair-loop | `step.id in [ui-probe, playwright-generate, self-run, repair-loop]` | references/execution-protocol.md | 规范 | 阶段内 TodoWrite 编排、Worker 派发、二阶段 Review 协议；只在用户确认 env 且无 blocker 后生效。 |
| ui-probe, playwright-generate, self-run, repair-loop | `step.id in [ui-probe, playwright-generate, self-run, repair-loop]` | prompts/agent-worker.md | 规范 | Worker subagent prompt 模板与 status envelope schema。 |
| ui-probe, playwright-generate, self-run, repair-loop | `step.id in [ui-probe, playwright-generate, self-run, repair-loop]` | prompts/agent-spec-reviewer.md | 规范 | 阶段产物 spec 合规机械检查清单与输出 schema。 |
| playwright-generate, repair-loop | `step.id in [playwright-generate, repair-loop]` | prompts/agent-quality-reviewer.md | 规范 | 脚本内容质量审查（选择器、断言、复用度）。 |
| case-feedback | `step.id == case-feedback` | phases/§12-case-feedback.md | 规范 | 生成 case-corrections.md 与 case-corrections-summary.json，覆盖 8 类 category、3 级 confidence、跨轮去重。 |
```

- [ ] **Step 5: 改写 SKILL.md 路由摘要与硬规则内的旧路径**

在 `.claude/skills/playwright-automation/SKILL.md` 中：
- 第 25 行路由摘要把 `references/worker-prompt.md` → `prompts/agent-worker.md`、`references/spec-reviewer-prompt.md` → `prompts/agent-spec-reviewer.md`、`references/quality-reviewer-prompt.md` → `prompts/agent-quality-reviewer.md`；`references/execution-protocol.md` 保持不变。
- 第 67 行硬规则把 `references/env-preflight.md`（出现两处）→ `phases/§2-env-preflight.md`。

- [ ] **Step 6: 全仓库扫描 skill 内残留旧路径（交叉引用）**

```bash
grep -rn -E 'references/(case-normalize|env-preflight|ui-plan|ui-probe|plan-reconcile|playwright-generate|self-run|run-triage|repair-loop|quality-gate|handoff|case-feedback|worker-prompt|spec-reviewer-prompt|quality-reviewer-prompt)\.md' .claude/skills/playwright-automation; echo "exit=$?"
```
Expected: grep `exit=1`（无输出）。若 `phases/`/`references/` 内文件互相引用旧路径，逐一改为新路径后重跑至无输出。

- [ ] **Step 7: 全绿回归**

Run: `bun run type-check && bun run check:skills 2>&1 | tail -6 && bun test engine/tests/lint/skill-structure.test.ts 2>&1 | tail -5`
Expected: 全 exit 0；`skill structure check passed`（SK-PHASE-MISSING 确认 12 个 `phases/§N-*.md` 存在、SK-PROMPT-NAME 确认 3 个 `agent-*.md` 命名合规）。

- [ ] **Step 8: 提交**

```bash
git add -A
git commit -m "refactor: ✨ reorg playwright-automation references into phases and prompts"
```

---

## Task 3: case-draft —— prompts/ + fewshots/ 重组

> case-draft 的编排细节内联在 SKILL.md「按需加载协议」表与硬规则中，没有独立的步骤规范文件，故**不建 `phases/`**；只迁 subagent 提示词与 few-shot。

**Files:**
- Move: `references/{worker-prompt,spec-reviewer-prompt,quality-reviewer-prompt}.md` → `prompts/agent-{worker,spec-reviewer,quality-reviewer}.md`
- Move: `references/fewshots/{case-format-sample.md,case-format-sample.xmind.md}` → `fewshots/`
- Keep: `rules/naming-convention.md`
- Modify: `.claude/skills/case-draft/SKILL.md`

- [ ] **Step 1: 搬迁 3 个 subagent 提示词 → prompts/**

```bash
cd .claude/skills/case-draft
mkdir -p prompts fewshots
git mv references/worker-prompt.md           prompts/agent-worker.md
git mv references/spec-reviewer-prompt.md    prompts/agent-spec-reviewer.md
git mv references/quality-reviewer-prompt.md prompts/agent-quality-reviewer.md
cd "$W"
```
Expected: 3 文件入 `prompts/`。

- [ ] **Step 2: 上移 few-shot → skill 根 fewshots/**

```bash
cd .claude/skills/case-draft
git mv references/fewshots/case-format-sample.md       fewshots/case-format-sample.md
git mv references/fewshots/case-format-sample.xmind.md fewshots/case-format-sample.xmind.md
rmdir references/fewshots references 2>/dev/null || true
cd "$W"
```
Expected: 2 文件入 `fewshots/`；`references/` 与 `references/fewshots/` 迁空后移除（`rmdir` 仅删空目录，若非空说明有遗漏文件，需排查）。

- [ ] **Step 3: 改写 SKILL.md「按需加载协议」表**

把 `.claude/skills/case-draft/SKILL.md` 第 44–52 行整张表替换为（改路径列 + 把 `.claude/skills/_shared/case-qa.md` 归一化为 `.claude/prompt/_shared/case-qa.md`）：

```markdown
| 阶段 | 条件 | 文件 | 类型 | 用途 |
| --- | --- | --- | --- | --- |
| case-draft, case-review | `step.id in [case-draft, case-review]` | prompts/agent-spec-reviewer.md | 规范 | 机械复核 spec 合规、SourceRef 分层、`case_id` 对账与 blocking pending。 |
| case-draft, output | `step.id in [case-draft, output]` | prompts/agent-quality-reviewer.md | 规范 | 审查用例内容质量，包括步骤完整性、标题可读性、覆盖质量与表述一致性。 |
| historical-context, requirement-atomize, case-draft | `step.id in [historical-context, requirement-atomize, case-draft]` | prompts/agent-worker.md | 规范 | 在允许的阶段内派发 case-draft Worker 时，限定输入字段、写入范围、状态 envelope 与证据分层规则。 |
| case-draft, output | `step.id in [case-draft, output]` | fewshots/case-format-sample.md | few-shot | 用例级节点格式参照（含 DQ 子集），仅用于格式参考，不作需求事实来源。 |
| case-draft, output | `step.id in [case-draft, output]` | fewshots/case-format-sample.xmind.md | few-shot | XMind 用例 topic 与 md 用例的映射对照（ASCII 树状示意，非真 .xmind）。 |
| module-identify | `step.id == module-identify and feature_dir_is_new` | rules/naming-convention.md | 规则 | 新建 feature 目录时的命名格式与客户缩写列表。 |
| case-review, output | `step.id in [case-review, output]` | .claude/prompt/_shared/case-qa.md | 规则 | 交付前 Archive/XMind 自检维度：字段一致性、标题格式、前置条件可执行性、表单字段逐字匹配。 |
```

- [ ] **Step 4: 改写 SKILL.md 硬规则内的旧路径**

在 `.claude/skills/case-draft/SKILL.md` 中：
- 第 70 行 `references/fewshots/case-format-sample.md` → `fewshots/case-format-sample.md`；`.claude/prompt/_shared/output-artifacts.md` 保持不变。
- 第 71 行 `.claude/skills/_shared/case-qa.md` → `.claude/prompt/_shared/case-qa.md`，`references/fewshots/case-format-sample.md` → `fewshots/case-format-sample.md`。
- 第 25 行路由摘要 `worker-prompt / spec-reviewer-prompt / quality-reviewer-prompt` 文字描述保留（无路径），无需改。

- [ ] **Step 5: 扫描 skill 内残留旧路径**

```bash
grep -rn -E 'references/(worker-prompt|spec-reviewer-prompt|quality-reviewer-prompt|fewshots)|\.claude/skills/_shared/case-qa\.md' .claude/skills/case-draft; echo "exit=$?"
```
Expected: grep `exit=1`（无输出）。`prompts/`/`fewshots/` 内文件若互引旧路径，改新路径后重跑至无输出。

- [ ] **Step 6: 全绿回归**

Run: `bun run type-check && bun run check:skills 2>&1 | tail -6 && bun test engine/tests/lint/skill-structure.test.ts 2>&1 | tail -5`
Expected: 全 exit 0；`skill structure check passed`（case-draft 无 `phases/` 引用故无 SK-PHASE-MISSING；3 个 `prompts/agent-*.md` 合规）。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "refactor: ✨ reorg case-draft references into prompts and fewshots"
```

---

## Task 4: 归一化共享提示词引用（确认 symlink 模式）

> 共享提示词 `case-qa.md`、`output-artifacts.md` 已在 Plan-1 集中到 `.claude/prompt/_shared/`。Task 3 已把 case-draft 对 `.claude/skills/_shared/case-qa.md` 的引用归一化为 `.claude/prompt/_shared/case-qa.md`。本 Task 确认全仓库不再有指向旧 `.claude/skills/_shared/` 间接路径的活引用，并保留该 symlink 仅作向后兼容。

**Files:**
- 只读校验 + 视情况清理 `.claude/skills/_shared/case-qa.md`（Plan-1 建的兼容 symlink）

- [ ] **Step 1: 确认无活引用指向 `.claude/skills/_shared/case-qa.md`**

```bash
grep -rn "\.claude/skills/_shared/case-qa\.md" .claude --include="*.md" | grep -v "^.claude/skills/_shared/case-qa.md"; echo "exit=$?"
```
Expected: grep `exit=1`（除该 symlink 自身外，无文件再引用旧路径）。

- [ ] **Step 2: 移除已无引用的兼容 symlink**

若 Step 1 确认无活引用：
```bash
git rm .claude/skills/_shared/case-qa.md
rmdir .claude/skills/_shared 2>/dev/null || true
```
Expected: 删除兼容 symlink；`.claude/skills/_shared/` 若空则移除。若 Step 1 仍有引用（如其它未迁 skill 仍指旧路径），则**保留 symlink** 并在提交说明记录原因，不删。

- [ ] **Step 3: 确认两个 skill 对共享提示词的引用都走中心路径**

```bash
grep -rn "\.claude/prompt/_shared/" .claude/skills/case-draft .claude/skills/playwright-automation
```
Expected: case-draft 命中 `case-qa.md` 与 `output-artifacts.md` 的中心路径引用；playwright 若引用则同样为中心路径。

- [ ] **Step 4: 全绿回归**

Run: `bun run check:skills 2>&1 | tail -6 && bun test engine/tests/lint/skill-structure.test.ts 2>&1 | tail -5`
Expected: 全 exit 0。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "refactor: ✨ normalize shared-prompt refs to .claude/prompt/_shared"
```

---

## Task 5: 扩展 thin-lint —— 长度上限 + phases 命名规则

> 上限按**全仓库当前实际最大值留足余量**设定，避免误伤未迁的 6 个 skill（当前全局最长 reference = 216 行 `case-hotfix/hotfix-archive-format.md`）。本计划重组后各类目标最大值：phases≤199、prompts≤172、references≤216（未迁）、fewshots≤154、rules≤24。上限取整留余量，作「防膨胀」守卫而非强制拆分。

**Files:**
- Modify: `.claude/scripts/_shared/lint/skill-structure.ts`

- [ ] **Step 1: 加目录级长度上限常量**

在 `skill-structure.ts` 的 `const SKILL_MD_CAP = 100;`（约第 32 行）下方加入：

```typescript
// 目录级长度上限（行）——按当前全仓库最大值留足余量的防膨胀守卫，非强制拆分阈值
const DIR_LINE_CAPS: Record<string, number> = {
  phases: 260,
  prompts: 220,
  references: 260,
  fewshots: 200,
  rules: 120,
};
// phases 文件名规范：§<数字>-<kebab>.md
const PHASE_NAME_RE = /^§\d+-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
```

- [ ] **Step 2: 加目录扫描助手函数**

在 `referencedPhaseFiles` 函数（约第 50–56 行）下方加入：

```typescript
// 扫描 skill 子目录内 .md 文件，套用长度上限与（phases）命名规则
function lintSkillDir(
  skill: string,
  dir: string,
  sub: string,
  cap: number,
): StructureViolation[] {
  const out: StructureViolation[] = [];
  const target = join(dir, sub);
  if (!existsSync(target)) return out;
  for (const f of readdirSync(target).filter((x) => x.endsWith(".md"))) {
    const p = join(target, f);
    const n = readFileSync(p, "utf-8").split("\n").length;
    if (n > cap) {
      out.push({ rule: "SK-LEN-DIR", skill, path: p, message: `${sub}/${f} ${n} 行 > ${cap}` });
    }
    if (sub === "phases" && !PHASE_NAME_RE.test(f)) {
      out.push({ rule: "SK-PHASE-NAME", skill, path: p, message: `phases/${f} 不符 §N-<step>.md` });
    }
  }
  return out;
}
```

- [ ] **Step 3: 在主循环调用目录扫描**

在 `lintSkillStructure` 主循环中，`prompts` 命名检查块（约第 122–135 行）之后、`for` 循环体结束 `}` 之前，加入：

```typescript
    // 6 目录级长度上限 + phases 命名
    for (const [sub, cap] of Object.entries(DIR_LINE_CAPS)) {
      v.push(...lintSkillDir(skill, dir, sub, cap));
    }
```

- [ ] **Step 4: 全绿回归（确认所有现存 skill 在新上限下通过）**

Run: `bun run type-check && bun run check:skills 2>&1 | tail -8`
Expected: type-check exit 0；`skill structure check passed`（10 个 skill 的 phases/prompts/references/fewshots/rules 全在上限内、playwright 的 12 个 phases 命名合规）。若出现 `SK-LEN-DIR`，说明某文件超限——核对是否真需调高对应 cap（记录实际行数），不得为凑过而删内容。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: 🧩 add dir length caps and phases naming rule to skill-structure lint"
```

---

## Task 6: 补负向 fixture（验证新规则真生效）

> 现有测试已有 1 个负向 fixture（SK-NAME-DIR）。本 Task 为新增的 SK-PHASE-MISSING、SK-PHASE-NAME、SK-PROMPT-NAME、SK-LEN-DIR、SK-FM-WHITELIST 各补一个 fixture，确保规则不是死代码。

**Files:**
- Modify: `engine/tests/lint/skill-structure.test.ts`

- [ ] **Step 1: 在 describe 内、最后一个 `});` 之前插入 helper + 5 个负向 fixture 测试**

```typescript
  // 构造一个除指定缺陷外全合规的 fixture skill（name==dir 且在命令索引内）
  function makeFixtureSkill(extra: (skillDir: string) => void): string {
    const tmp = mkdtempSync(join(tmpdir(), "kata-skill-structure-"));
    writeFileSync(
      join(tmp, "CLAUDE.md"),
      "## 命令索引\n\n| Command | Skill | Summary |\n| --- | --- | --- |\n| /demo | demo | x |\n",
    );
    const skillDir = join(tmp, ".claude/skills/demo");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      "---\nname: demo\ndescription: demo skill\n---\n\n# demo\n",
    );
    extra(skillDir);
    return tmp;
  }

  test("flags SK-PHASE-MISSING when SKILL.md references a missing phase", () => {
    const tmp = makeFixtureSkill((skillDir) => {
      writeFileSync(
        join(skillDir, "SKILL.md"),
        "---\nname: demo\ndescription: demo skill\n---\n\n# demo\n\n见 phases/§9-missing.md。\n",
      );
    });
    try {
      const r = lintSkillStructure(tmp);
      expect(r.passed).toBe(false);
      expect(r.violations).toContainEqual(
        expect.objectContaining({ rule: "SK-PHASE-MISSING", skill: "demo" }),
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("flags SK-PHASE-NAME for a phases file not matching §N-<step>.md", () => {
    const tmp = makeFixtureSkill((skillDir) => {
      mkdirSync(join(skillDir, "phases"), { recursive: true });
      writeFileSync(join(skillDir, "phases", "bad-name.md"), "# x\n");
    });
    try {
      const r = lintSkillStructure(tmp);
      expect(r.passed).toBe(false);
      expect(r.violations).toContainEqual(
        expect.objectContaining({ rule: "SK-PHASE-NAME", skill: "demo" }),
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("flags SK-PROMPT-NAME for a prompts file not matching agent-*.md", () => {
    const tmp = makeFixtureSkill((skillDir) => {
      mkdirSync(join(skillDir, "prompts"), { recursive: true });
      writeFileSync(join(skillDir, "prompts", "helper.md"), "# x\n");
    });
    try {
      const r = lintSkillStructure(tmp);
      expect(r.passed).toBe(false);
      expect(r.violations).toContainEqual(
        expect.objectContaining({ rule: "SK-PROMPT-NAME", skill: "demo" }),
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("flags SK-LEN-DIR for an over-cap rules file", () => {
    const tmp = makeFixtureSkill((skillDir) => {
      mkdirSync(join(skillDir, "rules"), { recursive: true });
      writeFileSync(join(skillDir, "rules", "huge.md"), `${"x\n".repeat(130)}`);
    });
    try {
      const r = lintSkillStructure(tmp);
      expect(r.passed).toBe(false);
      expect(r.violations).toContainEqual(
        expect.objectContaining({ rule: "SK-LEN-DIR", skill: "demo" }),
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("flags SK-FM-WHITELIST for an unknown frontmatter key", () => {
    const tmp = makeFixtureSkill((skillDir) => {
      writeFileSync(
        join(skillDir, "SKILL.md"),
        "---\nname: demo\ndescription: demo skill\nbogus: 1\n---\n\n# demo\n",
      );
    });
    try {
      const r = lintSkillStructure(tmp);
      expect(r.passed).toBe(false);
      expect(r.violations).toContainEqual(
        expect.objectContaining({ rule: "SK-FM-WHITELIST", skill: "demo" }),
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
```

- [ ] **Step 2: 跑 lint 单测确认全部新 fixture 通过**

Run: `bun test engine/tests/lint/skill-structure.test.ts 2>&1 | tail -8`
Expected: 7 test pass（原 2 + 新 5），0 fail。

- [ ] **Step 3: 全绿回归**

Run: `bun run type-check && bun run check:skills 2>&1 | tail -4`
Expected: 全 exit 0。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "test: 🧪 add negative fixtures for new skill-structure rules"
```

---

## Task 7: Plan-1 文档 drift 清理 + `.agents` 占位同步评估

> Plan-1 删了 `.claude/contracts/`，但 `routing-guard.md` 仍引用 `.claude/contracts/**`。按 CLAUDE.md 硬规则，改 `.claude/**` 须同步评估 `.agents/**`；Phase-1 降级为「确认 `.agents/README.md` 仍准确描述占位状态」。

**Files:**
- Modify: `.claude/rules/routing-guard.md`（删失效 contracts 引用）
- 只读校验: `.agents/README.md`

- [ ] **Step 1: 定位失效 contracts 文档引用**

```bash
grep -rn "\.claude/contracts" .claude/rules .claude/skills CLAUDE.md AGENTS.md 2>/dev/null; echo "exit=$?"
```
Expected: 至少命中 `.claude/rules/routing-guard.md` 末行的 `.claude/contracts/**`。记录全部命中位置。

- [ ] **Step 2: 修正 routing-guard.md**

把 `.claude/rules/routing-guard.md` 中：
```text
- 详细输出契约、回退模板和回归约束见 `.agents/skills/**`、`.claude/skills/**`、`.claude/contracts/**` 与对应测试。
```
改为（删 `.claude/contracts/**`，因其已在 Plan-1 拆解）：
```text
- 详细输出契约、回退模板和回归约束见 `.agents/skills/**`、`.claude/skills/**` 与对应测试。
```
若 Step 1 命中其它文件的 contracts 引用，逐一改为指向 `.claude/scripts/_shared/schemas/`（schema 类）或删除（workflow/manifest 类，已删）。

- [ ] **Step 3: 确认无残留活引用**

```bash
grep -rn "\.claude/contracts" .claude CLAUDE.md AGENTS.md 2>/dev/null | grep -v "docs/superpowers"; echo "exit=$?"
```
Expected: grep `exit=1`（docs/superpowers 下的历史 plan/spec 记述允许保留，不在清理范围）。

- [ ] **Step 4: 确认 `.agents/README.md` 占位描述仍准确**

Run: `sed -n '1,40p' .agents/README.md`
Expected: 仍描述 Codex runtime 为 Phase-1 占位、Claude runtime 完整可用。本计划只改 `.claude/**` skill 文档结构与共享 lint，未改路由语义/交付契约/证据底线，Codex 侧占位描述无需变更——在提交说明记录此结论。

- [ ] **Step 5: 全绿回归 + 提交**

Run: `bun run check:skills 2>&1 | tail -4 && bun run check 2>&1 | tail -2`
Expected: 全 exit 0。

```bash
git add -A
git commit -m "docs: 📝 drop dissolved contracts refs and confirm agents placeholder"
```

---

## Task 8: 清理孤儿 cruft（tracked .DS_Store + 主树残留 plugins/）

> Plan-1 的 `git mv plugins/* .claude/plugins/` 把 tracked 文件搬走了，但留下 untracked 运行时 cruft（`.venv`、嵌套 `.git`、`__pycache__`、`.egg-info`、`.DS_Store`）于主工作树旧 `plugins/` 路径。该 cruft 为 untracked，不在 worktree 内出现，须在主工作树清理（非 commit）。

**Files:**
- Delete（worktree，若 tracked）：`.claude/skills/**/.DS_Store`
- Delete（主工作树，untracked）：`plugins/`（见 Task 9 Step 5 合并后执行）

- [ ] **Step 1: 检查是否有 tracked .DS_Store**

```bash
git ls-files | grep -i "\.DS_Store$"; echo "exit=$?"
```
Expected: 记录命中。若 `exit=1`（无 tracked .DS_Store），跳到 Step 3。

- [ ] **Step 2: 移除 tracked .DS_Store 并加 gitignore 守卫**

若 Step 1 有命中：
```bash
git ls-files | grep -i "\.DS_Store$" | xargs git rm --cached
grep -qxF ".DS_Store" .gitignore || printf "\n.DS_Store\n" >> .gitignore
```
Expected: 从索引移除 .DS_Store；`.gitignore` 含 `.DS_Store`。

- [ ] **Step 3: 全绿回归 + 提交（若有改动）**

Run: `bun run check:skills 2>&1 | tail -4`
Expected: exit 0。若 Step 2 有改动：
```bash
git add -A
git commit -m "chore: 🧹 untrack .DS_Store and ignore it"
```
若无 tracked .DS_Store，本 Task 无 worktree commit；主树 untracked `plugins/` 的清理在 Task 9 Step 5 合并后执行。

---

## Task 9: 合并前最终回归 + 合入 main + 清理

**Files:** 无改动（验证 + 合并 + 清理）

- [ ] **Step 1: worktree 内最终全绿**

Run: `bun run type-check && bun run check:skills 2>&1 | tail -6 && bun test --cwd engine 2>&1 | tail -4 && bun run check 2>&1 | tail -2`
Expected: 全 exit 0；引擎测试 `1353 pass, 1 skip, 0 fail`（基线不变——本计划未改 engine/src，新增 5 个 lint fixture 测试使 lint 文件内测试数增加，但全量计数以 Task 1 Step 4 基线 + 新增 fixture 数对账）；`skill structure check passed`；biome 无 error。

- [ ] **Step 2: 记录 worktree HEAD SHA**

Run: `git rev-parse HEAD`
Expected: 记录 SHA（供主工作树 merge）。

- [ ] **Step 3: 回主工作树合并**

```bash
cd "$ROOT"
git merge --no-ff <worktree-sha>
```
Expected: Task 2–8 的 commit 以 no-ff 合入 main。

- [ ] **Step 4: 主工作树最终确认**

Run: `bun run type-check && bun run check:skills 2>&1 | tail -6 && bun test --cwd engine 2>&1 | tail -4`
Expected: 全绿。

- [ ] **Step 5: 清理主树孤儿 cruft（untracked，合并后执行）**

```bash
git status --short | grep "^?? plugins/" && rm -rf plugins/ && echo "removed orphan plugins/ cruft" || echo "no orphan plugins/"
```
Expected: 若主树存在 untracked `plugins/`（Plan-1 残留运行时 cruft）则删除；`git status` 不再显示 `?? plugins/`。

> 注：主树另有 2 个与本计划无关的未提交 spec 删除（`2026-05-28-kata-arch-overhaul-design.md`、本初始 spec 在 disk 上的删除）——不在本计划处理范围，保持原状交由用户决定。

- [ ] **Step 6: 推送 + 清理 worktree**

```bash
git push origin main
git worktree remove .worktrees/bundle-2-prompt-reorg
```
Expected: 推送成功；worktree 移除。

---

## Self-Review（已执行）

**1. Spec 覆盖**：覆盖 spec「试点 skill references→phases/prompts」（Task 2 playwright、Task 3 case-draft）+「补 thin-lint 长度上限/负向 fixture」（Task 5、Task 6）+ 共享提示词 symlink/中心路径模式（Task 4）。范围边界：可执行代码迁移、`_shared/lib` 分类、CLI 重指、历史类型债 → Plan 3；engine 删除与 `engine/bin/kata` 路径文档 → Plan 4；根 `/lib/playwright/` 保持现位（用户确认）。Plan-1 残留 drift（contracts 文档、cruft）顺带清理（Task 7、8、9）。

**2. 占位扫描**：无 TBD/TODO。所有搬迁给精确 `git mv`；两张 SKILL.md 表给完整替换内容；lint 扩展与 fixture 给完整代码；条件步骤（Task 4 Step 2 删 symlink、Task 8 .DS_Store）带明确判据。

**3. 类型/命名一致**：新规则 `SK-LEN-DIR`、`SK-PHASE-NAME` 与 Task 6 fixture 断言的 rule 字符串一致；`DIR_LINE_CAPS` 键（phases/prompts/references/fewshots/rules）与 `lintSkillDir(sub)` 一致；`PHASE_NAME_RE` 与 SKILL.md 实际命名 `§N-<step>.md`（Task 2 产出）一致；phases 文件名 `§1-case-normalize.md`…`§12-case-feedback.md` 与 SKILL.md 表内引用逐一对应。

**4. 长度上限不误伤未迁 skill**：caps（phases 260/prompts 220/references 260/fewshots 200/rules 120）均高于全仓库当前实际最大值（reference 216、phases 199、prompts 172、fewshots 154、rules 24），Task 5 Step 4 显式回归确认 10 个 skill 全过。

**5. 验证完整**：每个改动 Task 末尾跑 type-check + check:skills + lint 单测；Task 9 merge 前后各跑全量 `bun test --cwd engine` + biome；结构 lint 的「真实 skills 全绿」单测是搬迁正确性硬证据。

---

## 后续 Plan（待本计划落地后再写）

- **Plan 3（可执行代码迁移）**：把 case-draft 专属 engine 模块（case-draft.ts、case-signal-analyzer.ts、test-case-flow.ts + 子目录、xmind-gen/、archive-gen.ts、cases/verify-layers.ts）与 case-draft-only lib（signal-probe、strategy-router、md-table、case-strategy-resolver）+ 测试迁入 `.claude/skills/case-draft/scripts/`+`tests/`；CLI 注册中心改从 skill 路径 import；**修复迁入模块携带的 pre-existing tsc 类型错误**（迁入即被根 type-check gate 覆盖：case-draft.ts:88/91、test-case-flow.ts:78/81、case-signal-analyzer.ts:311）；playwright 的 handoff-render.ts（`kata handoff render`）同理迁入并修 handoff-render.ts:46-76 类型错误；删 vestigial `context-builder.ts`。
- **Plan 4（删 engine）**：删 `engine/`、移除 workspace 成员、`_shared/cli` 收口共享命令、`engine/bin/kata` → `.claude/scripts/_shared/bin/kata` 路径文档同步（含 case-draft SKILL.md 路由摘要的 `bun engine/bin/kata features resolve`）。
- **Plan 5（其余 skill + defect-analyze 合并）**：迁其余 skill；11→8 合并 defect-analyze = bug-file + conflict-analyze + diff-scan。
