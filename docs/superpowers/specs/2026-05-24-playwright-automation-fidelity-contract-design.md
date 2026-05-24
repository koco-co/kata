# playwright-automation 覆盖忠实度契约 — 设计

- 日期：2026-05-24
- 目标 Skill：`playwright-automation@1`
- 目标项目：`workspace/dataAssets`（契约级改动，对全项目生效）
- 状态：已与用户对齐，待复核

## 1. 背景与问题

`playwright-automation` skill 当前**允许**把业务流程用例降级成「进入页面看菜单/字段/元素是否可见」的 surface 契约测试。实证：`workspace/dataAssets/features/2099-01-lt-dq-main-flow` 的 9 个 spec（t01–t09）只做路由可达 + 可见性断言，源用例 `岚图主流程用例整理.md` 里写明的「新增元数据同步任务、离线任务、API 创建与发布」等端到端动作零覆盖；`_shared/pages/.../metadata-table-detail-page.ts` 里写好的 `createDeletableAsset` / `expectTableTagFlow` / `deleteDeletableAsset` 深操作函数从未被任何 spec 调用。

这些 surface 产物会被误当成「端到端完成」，根因在 skill 提示词里的三处降级逃生舱，而非单纯的进度问题：

1. **`ui-plan.md:20`**：`source_backed_bootstrap` 模式下把计划「收敛为最小 full runner：页面可达、项目上下文正确、核心入口/表单元素可见」。
2. **`case-normalize.md:87`**：对 P0 复杂 E2E「评估是否可简化为『进入页面验证 UI 元素存在』的契约测试」。
3. **`full.spec.ts` 命名/语义错位**：`full` 既被用作「全量聚合 runner」（对 smoke 子集），又被 bootstrap 模式塞进 surface 内容，加上 `PlaywrightAutomationHandoff@2` schema 把「以 full.spec.ts 全量通过为准」焊死，导致 surface 全绿被误读为业务流程已覆盖。

此外存在一处**死契约**：`case-normalize.md:89` 要求「排除用例必须记入 handoff 的 `remaining_risks` 字段」，但 `PlaywrightAutomationHandoff@2` 根本没有该字段且 `additionalProperties:false`，这条指令当前写不进去。

## 2. 目标

1. 把覆盖标准固定为**单一标准**：生成的 spec 必须忠实实现每条在范围内用例的步骤与预期，并真跑通——不存在 surface 中间态。
2. 跑不通的用例走**诚实阻塞/排除 + 原因**，绝不用可见性断言假装通过。
3. 用现有二阶段 review 机制**机械拦截** surface 漂移重现。
4. 修好 `remaining_risks` 死契约，让诚实排除有落点。

## 3. 范围决策（已与用户确认）

| 决策点 | 结论 |
|---|---|
| 覆盖深度模型 | **不引入深度档位（surface/crud/e2e）**。加档位等于把 surface 妥协制度化。单一标准 = 忠实于用例步骤/预期 + 跑通。 |
| `full.spec.ts` 改名 | **不改名**。它已焊死在 handoff schema 正则 + 多个 reference + lint gate + 每个 feature 已有产物里；`full` 语义保留为「全量聚合 runner」，忠实性靠忠实度审查保证，而非改名。 |
| 跑不通的用例 | **诚实阻塞/排除 + 原因**，写入 `handoff.excluded_cases`；绝不用 surface 假通过代替。不采用「任何一条跑不通即整 run failed」的最严判法。 |
| 忠实度执行方式 | **改提示词 + 在现有二阶段 review 加忠实度审查**（语义判断，归 quality-reviewer）；不写静态 TS lint gate（静态分析判不了断言是否匹配预期）。 |
| 本次范围 | **只动 skill 契约**。不重做 `2099-01-lt-dq-main-flow` 那个 feature（那是另一条独立工作）。 |

## 4. 设计

### 4.1 核心原则（写进 `skill.yaml` hard_rules + codex_override）

新增一条忠实度硬规则，语义为：

> 生成的 spec 必须把每条在范围内用例的 `steps.action` 实现为真实页面动作、把每条 `expected_visible_result` / `assertions` 断言为真实业务结果，并真跑通。禁止用导航 + 可见性断言（`toBeVisible`/`toContainText` 等）代替用例写明的业务动作与预期结果。无法忠实实现并跑通的用例，必须走诚实阻塞/排除 + 原因（写入 `handoff.excluded_cases`），不得用 surface 断言假通过。

同步删除/改写 `skill.yaml` 中任何「最小 full runner」式的友好措辞，并在 `codex_override.hard_rules` 镜像同一条。

### 4.2 堵掉三处降级逃生舱（prompt 改写）

| 文件 | 现状 | 改为 |
|---|---|---|
| `references/ui-plan.md:20` | bootstrap「收敛为最小 full runner：页面可达、核心入口/表单元素可见」 | 即便 bootstrap，也按用例 `steps`+`expected_visible_result` 规划忠实覆盖；live UI 撑不住的用例走 plan-reconcile 的 blocked/needs_user_decision 或诚实排除，**不降级为 surface**。 |
| `references/case-normalize.md:87` | 「P0 复杂 E2E → 评估是否可简化为契约测试」 | 删除「简化为契约测试」选项。改为：要么完整自动化，要么标 `blocked_by_*`/excluded + 原因，落 `handoff.excluded_cases`。 |
| `references/case-normalize.md:89` | 「记入 handoff 的 `remaining_risks` 字段」（指向不存在的字段） | 改指向新建的 `handoff.excluded_cases` 字段（见 §4.3）。 |
| `references/playwright-generate.md` | 无忠实度强制条款 | 新增：禁止用可见性断言代替用例 `expected_visible_result`；禁止丢弃用例的业务动作步骤；生成模式从用例 `steps` 逐条落动作。 |

### 4.3 唯一 schema 改动：`PlaywrightAutomationHandoff@2` 加 `excluded_cases`

在 `.ai/core/schemas/PlaywrightAutomationHandoff.v2.schema.json` 的 `required` 与 `properties` 中加入 **必填** `excluded_cases`（无排除时为空数组 `[]`）：

```json
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

- **设为必填空数组**：逼产出方主动声明「没有排除」而非忘记——honest-by-construction。
- `$id` 与 `schema` const 仍为 `PlaywrightAutomationHandoff@2`（只加字段，不 bump 版本）。
- 同时修好 §1 的死契约。
- **不动 `UiAutomationIntent@1`**：其 `cases[].steps`（含 `action` + `expected_visible_result`）+ `assertions` 本来就是忠实度的真值源，无需加任何字段。

### 4.4 忠实度门禁（走现有二阶段 review，不写 TS lint）

`references/quality-reviewer-prompt.md` 加新检查类 **`fidelity`**：逐条把生成 spec 的动作/断言对账源用例的 `steps` / `expected_visible_result`。判 **high**（必修）的情形：

- 用例含创建/导入/运行/下载等业务动作步骤，但 spec **只有**导航 + 可见性断言、零状态变更动作；
- spec 用 `toBeVisible`/`toContainText` 等代替了用例写明的 `expected_visible_result`。

high → 触发 repair 或转诚实排除（写 `handoff.excluded_cases`）。输出 schema 复用现有 `quality_review_status` + `issues[].category`（新增枚举值 `fidelity`）。

`references/quality-gate.md` 的 15 项 TS gate **不变**（用户选 review-based 执行）。`execution-protocol.md` 的二阶段 review 调度不变，忠实度只是 quality-reviewer 内新增一类检查。

### 4.5 投影与引擎

- 改完 `.ai/core/**` 后运行 `bun engine/bin/kata ai-core projection render`，同步到 `.claude/`、`.agents/` 投影目录。
- `kata handoff render`（引擎）需补 `excluded_cases` 的 JSON 产出与 `handoff.md` 渲染段落；现有 handoff 渲染逻辑须输出该必填字段（无则 `[]`）。

## 5. 文件改动清单

源契约（`.ai/core/`）：

1. `skills/playwright-automation/skill.yaml` — 加忠实度 hard_rule（含 codex_override 镜像），删「最小 full runner」措辞。
2. `skills/playwright-automation/references/ui-plan.md` — 改写 bootstrap 收敛条款。
3. `skills/playwright-automation/references/case-normalize.md` — 删「简化为契约测试」，`remaining_risks` 改指 `excluded_cases`。
4. `skills/playwright-automation/references/playwright-generate.md` — 加忠实度强制条款。
5. `skills/playwright-automation/references/quality-reviewer-prompt.md` — 加 `fidelity` 检查类与枚举值。
6. `schemas/PlaywrightAutomationHandoff.v2.schema.json` — 加必填 `excluded_cases`。

引擎与投影：

7. `kata handoff render` 相关引擎代码 — 产出/渲染 `excluded_cases`。
8. 运行 `bun engine/bin/kata ai-core projection render` — 重渲投影。

测试（改后即测）：

9. handoff schema 测试 — 断言 `excluded_cases` 必填、枚举有效、空数组合法。
10. `.ai/core/evals/workflows/playwright-automation` — 加 fidelity-review 行为 eval：给一个 surface 化 spec（仅可见性断言、源用例含业务动作），断言 quality-reviewer 判 `fail` 且含 `category: fidelity` 的 high issue。

## 6. 验收标准

1. 三处降级逃生舱措辞已删除/改写，grep 不到「最小 full runner」「简化为契约测试」式表述。
2. `PlaywrightAutomationHandoff@2` schema 含必填 `excluded_cases`；缺失时校验失败，空数组合法。
3. `case-normalize.md` 的 `remaining_risks` 指向 `excluded_cases`，不再指向不存在字段。
4. quality-reviewer 对 surface 化 spec 判 fail（含 `fidelity` high issue），eval 通过。
5. 投影已重渲，`.claude/` 与 `.agents/` 下对应文件与源一致。
6. `bun test` 相关用例全绿。

## 7. 非目标

- 不重做 `2099-01-lt-dq-main-flow` feature 的自动化（独立工作）。
- 不引入覆盖深度档位字段。
- 不改 `full.spec.ts` 命名。
- 不新增静态 TS lint gate。
- 不修 `UiAutomationIntent@1` 与 `case-normalize.md` 之间已存在的其他文档/schema 漂移（超范围）。
