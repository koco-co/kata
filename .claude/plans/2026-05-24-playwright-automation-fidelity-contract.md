# playwright-automation 覆盖忠实度契约 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 playwright-automation skill 的覆盖标准从「允许 surface 降级」改为「脚本忠实于用例步骤/预期并跑通，跑不通则诚实阻塞/排除 + 原因」。

**Architecture:** 三类改动——(1) prompt 改写堵掉降级逃生舱并加忠实度硬规则；(2) 唯一 schema 改动给 handoff 加必填 `excluded_cases` 作为诚实排除落点；(3) 在现有二阶段 review 的 quality-reviewer 加 `fidelity` 检查类做语义拦截。改后重渲投影并跑测。

**Tech Stack:** Bun ≥ 1.3、AJV 2020 JSON Schema、Handlebars 模板、`kata ai-core projection render`、bun:test。

**设计来源：** `docs/superpowers/specs/2026-05-24-playwright-automation-fidelity-contract-design.md`

---

## File Structure

源契约 `.ai/core/`：
- `schemas/PlaywrightAutomationHandoff.v2.schema.json` — 加必填 `excluded_cases`（诚实排除落点）。
- `skills/playwright-automation/skill.yaml` — 加忠实度 hard_rule（always_load + codex_override 镜像）。
- `skills/playwright-automation/references/ui-plan.md` — 改写 bootstrap「最小 full runner」降级条款。
- `skills/playwright-automation/references/case-normalize.md` — 删「简化为契约测试」，`remaining_risks` 改 `excluded_cases`。
- `skills/playwright-automation/references/playwright-generate.md` — 加「覆盖忠实度」强制节。
- `skills/playwright-automation/references/quality-reviewer-prompt.md` — 加 `fidelity` 检查类与枚举值。

引擎 `engine/`：
- `templates/handoff.md.hbs` — 渲染 `excluded_cases` 段落（`handoff-render.ts` 无需改，校验/渲染均由 schema + 模板驱动）。

测试 `engine/tests/`：
- `schemas/handoff-v2.test.ts` — 扩展：`excluded_cases` 必填/枚举/空数组。
- `cli/handoff-render.test.ts` — 扩展：渲染 excluded_cases 段。
- `ai-core/playwright-automation-hardrules-regression.test.ts` — 更新 SHA256 基线（加 1 条规则）。
- `ai-core/playwright-automation-fidelity-regression.test.ts` — 新建：断言逃生舱措辞已删、忠实度措辞已加。
- 其余构造 handoff.json 的 fixture — 补 `excluded_cases: []`。

---

## Task 0: Worktree 隔离

**Files:** 无（仅 git 操作）

- [ ] **Step 1: 从最新 main 建 worktree**

Run:
```bash
cd /Users/poco/Projects/kata
git worktree add .worktrees/pw-fidelity-contract -b feat/pw-fidelity-contract
cd .worktrees/pw-fidelity-contract
bun install
```
Expected: worktree 创建于 `.worktrees/pw-fidelity-contract`，依赖安装完成。

- [ ] **Step 2: 确认基线测试当前全绿**

Run: `bun test engine/tests/ai-core/playwright-automation-hardrules-regression.test.ts engine/tests/schemas/handoff-v2.test.ts engine/tests/cli/handoff-render.test.ts`
Expected: PASS（建立改动前的绿色基线）。

> 后续所有路径均相对 worktree 根 `/Users/poco/Projects/kata/.worktrees/pw-fidelity-contract/`。

---

## Task 1: handoff schema 加必填 `excluded_cases`

**Files:**
- Modify: `.ai/core/schemas/PlaywrightAutomationHandoff.v2.schema.json`
- Test: `engine/tests/schemas/handoff-v2.test.ts`

- [ ] **Step 1: 写失败测试**

在 `engine/tests/schemas/handoff-v2.test.ts` 的 `base` 对象里，把 `next_actions: [],` 之后补一行（使现有测试仍合法）：
```ts
  next_actions: [],
  excluded_cases: [],
```
并在 `describe` 块末尾（`requires source_refs.intent` 之后）追加：
```ts
  it("accepts excluded_cases as empty array", () => {
    expect(validate({ ...base, excluded_cases: [] })).toBe(true);
  });

  it("accepts a valid excluded case entry", () => {
    expect(
      validate({
        ...base,
        excluded_cases: [
          { case_id: "P0-3", reason_category: "data_prep", detail: "需后台任务完成" },
        ],
      }),
    ).toBe(true);
  });

  it("requires excluded_cases", () => {
    const { excluded_cases: _excluded, ...missing } = base;
    expect(validate(missing)).toBe(false);
  });

  it("rejects unknown excluded reason_category", () => {
    expect(
      validate({ ...base, excluded_cases: [{ case_id: "P0-3", reason_category: "whatever" }] }),
    ).toBe(false);
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `bun test engine/tests/schemas/handoff-v2.test.ts`
Expected: FAIL —「requires excluded_cases」与「rejects unknown excluded reason_category」失败（schema 尚无该字段）。

- [ ] **Step 3: 改 schema**

在 `.ai/core/schemas/PlaywrightAutomationHandoff.v2.schema.json` 的 `required` 数组末尾（`"next_actions"` 之后）加 `"excluded_cases"`：
```json
    "unresolved_blockers",
    "next_actions",
    "excluded_cases"
  ],
```
在 `properties` 中 `"next_actions": { ... }` 之后加：
```json
    "next_actions": { "type": "array", "items": { "type": "string" } },
    "excluded_cases": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["case_id", "reason_category"],
        "additionalProperties": false,
        "properties": {
          "case_id": { "type": "string", "minLength": 1 },
          "reason_category": {
            "type": "string",
            "enum": ["env", "data_prep", "external_system", "tenant_mismatch", "ui_missing"]
          },
          "evidence_path": { "type": "string" },
          "detail": { "type": "string" }
        }
      }
    }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `bun test engine/tests/schemas/handoff-v2.test.ts`
Expected: PASS（全部，含新增 4 条）。

- [ ] **Step 5: 修复其余受影响的 handoff fixture**

Run: `bun test engine/tests/schemas engine/tests/cli engine/tests/lint 2>&1 | grep -i "fail\|excluded_cases" | head`
对任何因缺 `excluded_cases` 而校验失败的 handoff.json fixture（已知候选：`engine/tests/cli/handoff-render.test.ts` 在 Task 2 处理；其余如 `loaders.test.ts`、`results-publish.test.ts`、`lint/handoff-double-track.test.ts` 若失败），在其 handoff 对象里补 `excluded_cases: [],`。
Expected: 定位全部失败 fixture；逐个补字段后该步无 schema 失败（handoff-render.test.ts 的失败留待 Task 2）。

- [ ] **Step 6: Commit**

```bash
git add .ai/core/schemas/PlaywrightAutomationHandoff.v2.schema.json engine/tests/schemas/handoff-v2.test.ts
git commit -m "feat: 🔒 add required excluded_cases to PlaywrightAutomationHandoff@2"
```

---

## Task 2: handoff.md 模板渲染 `excluded_cases`

**Files:**
- Modify: `engine/templates/handoff.md.hbs`
- Test: `engine/tests/cli/handoff-render.test.ts`

- [ ] **Step 1: 写失败测试**

在 `engine/tests/cli/handoff-render.test.ts` 的 fixture handoff.json 对象里，把 `next_actions: [],` 之后补：
```ts
        next_actions: [],
        excluded_cases: [
          { case_id: "P0-3", reason_category: "data_prep", detail: "需后台任务完成" },
        ],
```
并在文件末尾 `describe` 内追加测试：
```ts
  it("renders excluded cases section", async () => {
    await runHandoffRender({
      project: "dataAssets",
      featureId: "2026-04-x",
      runId: "20260510-1430-aaaaaaaa",
      workspaceRoot: scratch,
    });
    const md = readFileSync(
      join(scratch, "dataAssets/features/2026-04-x/results/20260510-1430-aaaaaaaa/handoff.md"),
      "utf-8",
    );
    expect(md).toContain("## Excluded Cases");
    expect(md).toContain("[data_prep] case=P0-3");
    expect(md).toContain("需后台任务完成");
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `bun test engine/tests/cli/handoff-render.test.ts`
Expected: FAIL —「renders excluded cases section」找不到 `## Excluded Cases`。

- [ ] **Step 3: 改模板**

在 `engine/templates/handoff.md.hbs` 的「## Unresolved Blockers」段（`{{/if}}` 结束）之后、「## Next Actions」之前插入：
```handlebars
## Excluded Cases
{{#if excluded_cases.length}}
{{#each excluded_cases}}
- [{{reason_category}}] case={{case_id}}{{#if detail}} — {{detail}}{{/if}}{{#if evidence_path}} (evidence={{evidence_path}}){{/if}}
{{/each}}
{{else}}
None.
{{/if}}

```

- [ ] **Step 4: 运行测试确认通过**

Run: `bun test engine/tests/cli/handoff-render.test.ts`
Expected: PASS（含原有渲染测试与新增 excluded cases 测试）。

- [ ] **Step 5: Commit**

```bash
git add engine/templates/handoff.md.hbs engine/tests/cli/handoff-render.test.ts
git commit -m "feat: 📝 render excluded_cases section in handoff.md"
```

---

## Task 3: skill.yaml 加忠实度 hard_rule + 更新回归基线

**Files:**
- Modify: `.ai/core/skills/playwright-automation/skill.yaml`
- Test: `engine/tests/ai-core/playwright-automation-hardrules-regression.test.ts`

- [ ] **Step 1: 在 always_load.hard_rules 末尾加忠实度规则**

在 `.ai/core/skills/playwright-automation/skill.yaml` 的 `always_load.hard_rules` 列表末尾（当前最后一条「Reference 按需加载…」之后）追加一条：
```yaml
      - 覆盖忠实度：生成的 spec 必须把每条在范围内用例的步骤实现为真实页面动作、把每条 expected_visible_result/assertions 断言为真实业务结果并真跑通；禁止用导航加可见性断言（toBeVisible/toContainText 等）代替用例写明的业务动作与预期结果，禁止把业务流程用例简化为「进入页面验证元素存在」的 surface 契约测试。无法忠实实现并跑通的用例走诚实阻塞/排除并把原因写入 handoff.excluded_cases（含 reason_category），不得用 surface 断言假通过。
```

- [ ] **Step 2: 在 codex_override.hard_rules 末尾镜像同一条**

在 `skill.yaml` 的 `codex_override.hard_rules` 列表末尾（最后一条「失败断言反映真实问题…」之后）追加：
```yaml
      - 覆盖忠实度：spec 忠实实现用例步骤与预期并跑通；禁止用可见性断言代替业务动作/预期结果，禁止简化为 surface 契约测试；无法忠实跑通的用例走诚实排除并记入 handoff.excluded_cases，不得 surface 假通过。
```

- [ ] **Step 3: 运行回归测试确认失败**

Run: `bun test engine/tests/ai-core/playwright-automation-hardrules-regression.test.ts`
Expected: FAIL —「hard_rules array length is unchanged」（14→15）与「hard_rules joined sha256 is unchanged」均失败。

- [ ] **Step 4: 计算并写入新基线**

Run（打印新 count 与 sha）：
```bash
bun -e '
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const { parseProductSkillContract } = await import("./engine/src/ai-core/product-skill-contract.ts");
const p = ".ai/core/skills/playwright-automation/skill.yaml";
const r = parseProductSkillContract(readFileSync(p, "utf8"), p);
if (!r.ok) throw new Error(r.issues.map(i=>i.code).join(","));
const hr = r.value.hardRules;
console.log("COUNT=" + hr.length);
console.log("SHA=" + createHash("sha256").update(hr.join("\n")).digest("hex"));
'
```
Expected: 打印 `COUNT=15` 与一个 64 位十六进制 `SHA=...`。

把 `engine/tests/ai-core/playwright-automation-hardrules-regression.test.ts` 里的两个基线常量改为上面打印的实际值，并在上方加一行注释说明本次基线变更原因：
```ts
  // Baseline updated 2026-05-24: 覆盖忠实度 hard_rule 新增（surface 降级逃生舱收口）。
  const BASELINE_SHA256 = "<粘贴上面打印的 SHA>";
  const BASELINE_COUNT = 15;
```

- [ ] **Step 5: 运行回归测试确认通过**

Run: `bun test engine/tests/ai-core/playwright-automation-hardrules-regression.test.ts`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add .ai/core/skills/playwright-automation/skill.yaml engine/tests/ai-core/playwright-automation-hardrules-regression.test.ts
git commit -m "feat: 🔒 add coverage-fidelity hard_rule to playwright-automation skill"
```

---

## Task 4: 改写 reference 逃生舱 + 加忠实度审查（含回归测试）

**Files:**
- Create: `engine/tests/ai-core/playwright-automation-fidelity-regression.test.ts`
- Modify: `.ai/core/skills/playwright-automation/references/ui-plan.md`
- Modify: `.ai/core/skills/playwright-automation/references/case-normalize.md`
- Modify: `.ai/core/skills/playwright-automation/references/playwright-generate.md`
- Modify: `.ai/core/skills/playwright-automation/references/quality-reviewer-prompt.md`

- [ ] **Step 1: 写失败回归测试**

新建 `engine/tests/ai-core/playwright-automation-fidelity-regression.test.ts`：
```ts
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "../../..");
const refDir = ".ai/core/skills/playwright-automation/references";
const read = (f: string) => readFileSync(join(root, refDir, f), "utf8");

describe("playwright-automation fidelity contract regression", () => {
  it("ui-plan.md removed the surface downgrade escape hatch", () => {
    expect(read("ui-plan.md")).not.toContain("最小 full runner");
  });

  it("case-normalize.md removed the simplify-to-contract-test option", () => {
    expect(read("case-normalize.md")).not.toContain(
      "简化为「进入页面验证 UI 元素存在」的契约测试",
    );
  });

  it("case-normalize.md points excluded cases at handoff.excluded_cases not remaining_risks", () => {
    const md = read("case-normalize.md");
    expect(md).toContain("excluded_cases");
    expect(md).not.toContain("remaining_risks");
  });

  it("playwright-generate.md mandates coverage fidelity", () => {
    expect(read("playwright-generate.md")).toContain("覆盖忠实度");
  });

  it("quality-reviewer-prompt.md adds the fidelity check category", () => {
    const md = read("quality-reviewer-prompt.md");
    expect(md).toContain("fidelity");
    expect(md).toContain("selector | assertion | repair | reuse | fidelity");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `bun test engine/tests/ai-core/playwright-automation-fidelity-regression.test.ts`
Expected: FAIL（5 条全失败，reference 尚未改）。

- [ ] **Step 3: 改 `ui-plan.md`**

把第 20 行那条（`4. ui-plan 必须声明 mode: source_backed_bootstrap …不能用弱断言凑通过。`）整条替换为：
```markdown
4. ui-plan 必须声明 `mode: source_backed_bootstrap`，并按用例步骤与预期规划忠实覆盖：每条在范围内用例的动作步骤都要落为真实页面动作，预期结果都要落为真实业务断言。即便 bootstrap，也不得把计划收敛为「页面可达 + 元素可见」的 surface runner。若真实 UI probe 不支持 PRD 中的深链路，应在 plan-reconcile 中判 `blocked`/`needs_user_decision`，或转诚实排除（记入 `handoff.excluded_cases` + `reason_category` + 原因）；不得降级为 surface 断言或用弱断言凑通过。
```

- [ ] **Step 4: 改 `case-normalize.md`**

(a) 第四步表格中 `**P0 级复杂 E2E**` 那一行整行替换为：
```markdown
| **P0 级复杂 E2E** | P0 case 涉及多步资源创建 + 状态轮询 + 条件分支 | 必须按用例步骤忠实自动化；不得简化为「进入页面验证元素存在」的 surface 契约测试。当前环境确实无法忠实实现并跑通时，标记 `blocked_by_*` 并记入 `handoff.excluded_cases`（含 `reason_category` + 原因） |
```
(b) 紧随表格的那句 `**排除的用例必须记入 handoff 的 remaining_risks 字段**，不得静默丢弃。` 替换为：
```markdown
**排除的用例必须记入 handoff 的 `excluded_cases` 字段**（每条含 `case_id` + `reason_category`（`env`/`data_prep`/`external_system`/`tenant_mismatch`/`ui_missing`）+ 原因；表格中 `offline_verification` 类归 `external_system`），不得静默丢弃，也不得用 surface 断言假通过代替。
```

- [ ] **Step 5: 改 `playwright-generate.md`**

在 `## 禁止` 节之后、`## 生成与调试协议` 之前插入新节：
```markdown
## 覆盖忠实度（强制）

生成的每条 spec 必须忠实于源用例：

- 用例的每个动作步骤（创建/导入/运行/下载/编辑/删除等）必须落为真实页面动作，不得丢弃；
- 用例写明的 `expected_visible_result`/预期结果必须断言为真实业务结果，禁止用 `toBeVisible`/`toContainText` 等可见性/存在性断言代替；
- 禁止把业务流程用例简化为「进入页面看菜单/字段/元素是否存在」的 surface 契约测试；
- 当前环境确实无法忠实实现并跑通的用例，走诚实阻塞/排除并记入 `handoff.excluded_cases`（含 `reason_category` + 原因），不得用 surface 断言假通过。

```

- [ ] **Step 6: 改 `quality-reviewer-prompt.md`**

(a) 在 `### 修复闭环` 节之前插入新检查节：
```markdown
### 覆盖忠实度（fidelity）

逐条把生成 spec 的动作/断言对账源用例的 `steps` 与 `expected_visible_result`/`assertions`：

- 用例含创建/导入/运行/下载等业务动作步骤，但 spec 只有导航 + 可见性断言、零状态变更动作 → high
- spec 用 `toBeVisible`/`toContainText` 等代替了用例写明的 `expected_visible_result` → high
- 业务流程用例被简化为「进页面看元素存在」的 surface 契约测试 → high

high 必修；当前环境确实无法忠实实现的用例应转诚实排除（记入 `handoff.excluded_cases`），不得用 surface 断言假通过。

```
(b) 把输出格式 JSON 中 `"category"` 行的枚举注释从 `"selector | assertion | repair | reuse"` 改为：
```json
      "category": "selector | assertion | repair | reuse | fidelity",
```

- [ ] **Step 7: 运行测试确认通过**

Run: `bun test engine/tests/ai-core/playwright-automation-fidelity-regression.test.ts`
Expected: PASS（5 条全通过）。

- [ ] **Step 8: Commit**

```bash
git add .ai/core/skills/playwright-automation/references/ui-plan.md \
        .ai/core/skills/playwright-automation/references/case-normalize.md \
        .ai/core/skills/playwright-automation/references/playwright-generate.md \
        .ai/core/skills/playwright-automation/references/quality-reviewer-prompt.md \
        engine/tests/ai-core/playwright-automation-fidelity-regression.test.ts
git commit -m "feat: 🔒 close surface-downgrade escape hatches, add fidelity review"
```

---

## Task 5: 重渲投影 + 漂移校验

**Files:**
- Modify（生成物）: `.claude/skills/playwright-automation/**`、`.agents/skills/playwright-automation/**`

- [ ] **Step 1: 重渲投影**

Run: `bun engine/bin/kata ai-core projection render`
Expected: 命令成功；`.claude/` 与 `.agents/` 下 playwright-automation 的 skill.yaml/references 随源更新。

- [ ] **Step 2: 漂移与契约测试**

Run: `bun test engine/tests/lint/agents-drift.test.ts engine/tests/ai-core/product-skill-contract.test.ts engine/tests/ai-core/workflow-contracts.test.ts`
Expected: PASS（投影与源一致；skill 契约解析通过）。

- [ ] **Step 3: Commit 投影产物**

```bash
git add .claude/skills/playwright-automation .agents/skills/playwright-automation
git commit -m "chore: 🤖 re-render projection for fidelity contract"
```

---

## Task 6: 全量验证

**Files:** 无（仅验证）

- [ ] **Step 1: AI Core 测试子集**

Run: `bun run test:ai-core`
Expected: PASS。

- [ ] **Step 2: handoff/schema/lint 相关测试**

Run: `bun test engine/tests/schemas engine/tests/cli/handoff-render.test.ts engine/tests/lint`
Expected: PASS。

- [ ] **Step 3: Lint**

Run: `bun run check`
Expected: 无 error（新增/修改文件通过 biome）。

- [ ] **Step 4: 全量测试**

Run: `bun test`
Expected: PASS（无回归）。

- [ ] **Step 5: 验收对照 spec §6**

逐条核对设计文档 §6 验收标准：逃生舱措辞已删（grep `最小 full runner`、`简化为「进入页面验证 UI 元素存在」的契约测试` 在 references 下无命中）；handoff schema 含必填 `excluded_cases`；`remaining_risks` 已改 `excluded_cases`；fidelity 回归测试通过；投影一致；`bun test` 全绿。
Expected: 全部满足。

- [ ] **Step 6: 收尾**

按 superpowers:finishing-a-development-branch 决定合并/PR：把 `feat/pw-fidelity-contract` 合回 main 并推送（遵循 `.ai/core/rules/git-workflow.md` 的 worktree 优先约定）。

---

## Self-Review 备注

- **Spec 覆盖**：spec §4.1→Task3；§4.2→Task4；§4.3→Task1；§4.4→Task4(quality-reviewer)；§4.5→Task5 + Task2(模板)；§5 文件清单全数落任务；§6 验收→Task6 Step5。
- **无 .ts 改动的 handoff render**：`handoff-render.ts` 校验走 `loadHandoffV2Validator()`（读 schema 文件），渲染走 `.hbs`，故只改 schema + 模板，无需改 render 代码——已在 File Structure 注明。
- **基线锁**：Task3 显式重算 SHA256 + count，避免 hardcode 失配（recompute 命令给全，非占位）。
- **必填字段连锁**：Task1 Step5 专门扫描并修补其余 handoff.json fixture，防止 `excluded_cases` 必填化连锁打挂无关测试。
- **类型一致**：`excluded_cases[].{case_id,reason_category,evidence_path,detail}` 与 `reason_category` 枚举在 schema/模板/测试/reference 各处一致。
