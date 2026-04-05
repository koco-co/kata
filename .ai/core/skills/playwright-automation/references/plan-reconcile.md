# plan-reconcile

## 读取时机

仅当当前 workflow step id 等于 `plan-reconcile` 时读取。不得批量读取 `references/**`。

## 协议

plan-reconcile 的输入是：ui-plan（文档用例规划）+ ui-probe（真实 UI 证据）。
输出是：继续/调整/提问/阻塞。

### 第一步：对账清单

逐条比较 ui-plan 中规划的断言点与 ui-probe 收集的页面证据：

1. **页面路由**：计划中的 URL hash 是否匹配实际页面路由
2. **页面标题**：计划中的标题文本是否出现在页面 DOM 中
3. **菜单/导航**：计划中的侧边菜单项是否出现在实际 UI 中（文本、顺序、可见性）
4. **表单字段**：计划中的表单字段是否在 UI 中存在（input、select、button）
5. **按钮/操作**：计划中的按钮（新建、保存、删除）是否存在
6. **表格列**：计划中要验证的表格列头是否出现在实际表格中
7. **数据展示**：计划中要验证的数据值是否出现在页面中

### 第二步：对账状态判定

| 状态 | 条件 | 处理 |
|------|------|------|
| **aligned** | 所有计划断言点与 UI 完全匹配 | 直接进入 playwright-generate |
| **plan_adjusted** | 1-3 个差异且可以调整脚本（如菜单文本不同、字段顺序不同、URL hash 微调） | 按 observed UI 证据调整计划，然后进入 playwright-generate |
| **needs_user_decision** | 差异超过 3 个或涉及重大分歧（功能不存在、页面模块缺失、URL 结构完全不符） | 写入差异清单并升级给用户决策 |
| **blocked** | 关键功能缺失（页面 404、核心模块不可用、依赖的数据源不存在） | 输出 blocked 状态，进入 handoff |

若 live UI 证据显示目标功能、菜单、规则类型或核心入口在当前环境未部署/不存在，或 ui-probe 因 3 次探测预算耗尽而未确认核心 UI 事实，即使 PRD 或 Lanhu 截图已有完整设计，也必须判定为 `blocked`、`blocked_by_ui_probe` 或 `needs_user_decision` 并进入 handoff；不得以 `source_backed_bootstrap` 为理由继续进入 `playwright-generate`，不得读取 `playwright-generate` reference，不得检查/创建 tests、page object 或 runner，不得生成“预自动化脚本”“可用性检测脚本”或弱断言脚本绕过真实 UI 缺失。

### 第三步：冲突裁决原则

当文档用例与 live UI 证据冲突时：

1. **以 live UI 证据为准**。Archive MD 和 PRD 是需求文档，不是真实 UI 事实。
2. **调整文档（不修改 archive.md）**：在脚本中基于 live UI 证据编写断言，而不是基于文档文字。
3. **保留差异记录**：在 reconciliation 输出中写明 "文档说 X，UI 是 Y，已按 UI Y 调整"。
4. **不修改 archive.md 或 test-point-checklist.md**：文档是历史记录，调整的是脚本行为。

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
- 不得修改 `.kata/repos/{project}/**`。
- 不得在未见 UI 证据的情况下声称 "aligned"。
- 不得在出现差异时强行保持一致（覆盖 UI 的事实）。
- 不得在 `blocked` / `blocked_by_ui_probe` / `needs_user_decision` 状态后继续生成 Playwright 脚本或创建任何测试文件。
