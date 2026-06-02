# plan-reconcile

## 读取时机

进入 `plan-reconcile` 阶段时读本文；前序阶段未通过不提前进入，也不批量预读 `phases/**`。

## 协议

plan-reconcile 的输入是：ui-plan（文档用例规划）+ ui-probe（真实 UI 证据）。
输出是：继续 / 调整 / 提问 / 阻塞。

### 第一步：核对清单

把 ui-plan 里规划的断言点和 ui-probe 收集的页面证据逐条对照：

1. **页面路由**：计划中的 URL hash 是否匹配实际页面路由
2. **页面标题**：计划中的标题文本是否出现在页面 DOM 中
3. **菜单/导航**：计划中的侧边菜单项是否出现在实际 UI 中（文本、顺序、可见性）
4. **表单字段**：计划中的表单字段是否在 UI 中存在（input、select、button）
5. **按钮/操作**：计划中的按钮（新建、保存、删除）是否存在
6. **表格列**：计划中要验证的表格列头是否出现在实际表格中
7. **数据展示**：计划中要验证的数据值是否出现在页面中

### 第二步：核对状态判定

| 状态 | 条件 | 处理 |
|------|------|------|
| **aligned** | 所有计划断言点与 UI 完全匹配 | 直接进入 playwright-generate |
| **plan_adjusted** | 1-3 个差异且可以调整脚本（如菜单文本不同、字段顺序不同、URL hash 微调） | 按 observed UI 证据调整计划，然后进入 playwright-generate |
| **needs_user_decision** | 差异超过 3 个或涉及重大分歧（功能不存在、页面模块缺失、URL 结构完全不符） | 写入差异清单并升级给用户决策 |
| **blocked** | 关键功能缺失（页面 404、核心模块不可用、依赖的数据源不存在） | 输出 blocked 状态，进入 handoff |

遇到下面任一情况，就算 PRD 或 Lanhu 截图已有完整设计，也必须判 `blocked`、`blocked_by_ui_probe` 或 `needs_user_decision` 并进入 handoff：

- live UI 证据显示目标功能、菜单、规则类型或核心入口在当前环境没部署、不存在；
- ui-probe 耗尽 3 次探测预算，仍没确认核心 UI 事实。

判定之后，不得做以下任何一件事来绕过真实 UI 的缺失：

- 拿 `source_backed_bootstrap` 当理由继续进入 `playwright-generate`；
- 读取 `playwright-generate` reference；
- 检查或创建 tests、page object、runner；
- 生成「预自动化脚本」「可用性检测脚本」或弱断言脚本。

### 第三步：冲突裁决原则

文档用例和 live UI 证据冲突时：

1. **以 live UI 证据为准**。Archive MD 和 PRD 是需求文档，不是真实 UI 事实。
2. **断言跟着 live UI 写**。脚本永远跟着真实 UI 走。
3. **不直接改 archive.md**：plan-reconcile 阶段不动 archive 内容，而是把发现的差异写成结构化条目，记入本次 run 的 `case-corrections.md`；审批和写回交给 `/case-edit apply-corrections`，在 case-feedback step 之后处理。`case-corrections.md` 的字段定义见 `phases/§12-case-feedback.md`。
4. **不改 test-point-checklist.md**：测试点清单保持不变，免得和 case-draft 契约打架。
5. **保留差异记录**：在 reconciliation 输出里写明「文档说 X，UI 是 Y，已按 UI Y 调整脚本并入 corrections」。

### 第四步：输出

写入 `PlanReconciliation@1` schema，包含：

```yaml
status: aligned / plan_adjusted / needs_user_decision / blocked
discrepancies:
  - item: "菜单文本"
    doc_claim: "概览"
    observed_ui: "数据质量概览"
    resolution: plan_adjusted_by_live_ui
  - item: "URL hash"
    doc_claim: "#/dq/overview"
    observed_ui: "#/dq/overview?pid=9"
    resolution: plan_adjusted_by_live_ui
adjusted_plan:
  assertions:
    - target: "body 包含'数据质量概览'"
    - target: "URL 匹配 /#\\/dq\\/overview/"
final_assertion_count: N
probe_evidence_ref: SR-UI-PROBE-001
```

## 禁止

- 不得把用户文字（Archive MD 描述）当作真实 UI 事实。
- 不得弱化断言来换取通过。
- 不得修改 `workspace/{project}/.kata/repos/**`。
- 没看到 UI 证据，不得声称 `aligned`。
- 出现差异时，不得强行对齐到文档而盖掉 UI 的事实。
- 状态已是 `blocked` / `blocked_by_ui_probe` / `needs_user_decision` 时，不得再生成 Playwright 脚本或创建任何测试文件。
