# case-feedback

## 目录

- 读取时机
- 协议
- 8 类 category
- 3 级 confidence
- 服务器侧操作缺口
- case-corrections.md 结构
- sidecar summary json
- 跨轮去重
- 输出阈值
- 禁止

## 读取时机

进入 `case-feedback` 阶段时读本文；前序阶段未通过不提前进入，也不批量预读 `phases/**`。

## 协议

case-feedback 在 `run-triage` 之后、`handoff` 之前执行。输入：plan-reconcile 的 discrepancies、ui-probe 的 observed_facts、run-triage 的归类、ui-probe 发现的未覆盖场景。输出：两份工件，写入当前 run 目录 `workspace/<project>/features/<featureId>/results/<run-id>/`：

1. `case-corrections.md` — pending 清单（人类可读、可手改 status）。
2. `case-corrections-summary.json` — 结构化摘要，符合 `CaseCorrections@1` schema，供 handoff render 渲染使用。

本 step **只生成工件**；不得直接修改 `archive.md`、`cases.xmind` 或 `test-point-checklist.md`，所有回写由 `/case-edit apply-corrections` 完成。也不得修改任何 `.kata/repos/**` 源码。

## 8 类 category

| category | 触发证据 | 典型问题描述 |
|---|---|---|
| `ui_text_drift` | live UI 文案与 archive 描述不一致 | 菜单名/按钮名/字段名变了 |
| `business_rule` | run-triage 明确归类为 archive 描述错；或 probe 显示行为差异 | 前置条件错、步骤顺序错、预期错 |
| `ambiguous_step` | ui-probe 反复无法定位 | "配置好规则后..." 这类无法落地为操作的描述 |
| `dependency_missing` | probe 显式跳转到前置页或提示缺资源 | 用例未声明的必备前置（如先建规则集） |
| `unverifiable_assertion` | DOM 无可见元素承载预期 | 用例预期"数据正确"等不可 DOM 验证的内容 |
| `wrong_priority` | run-triage 标记 partial_automation；或 P0 实际无 E2E 价值 | P0/P1/P2 标错 |
| `duplicate` | 多 case 同 case_ref 或同语义不同文本 | 多条用例测同一点位 |
| `missing_coverage` | probe 命中 archive 完全未覆盖的入口 | 真实 UI 出现关键场景但用例没写 |

## 3 级 confidence

- `confidence: high` — 有 probe 截图 + locator 命中 + 文本/行为可机械比对。
- `confidence: medium` — 有 probe 证据但需主观判断（如"模糊步骤"是否应改）。
- `confidence: low` — 只根据失败原因推断，没有直接 UI 证据；照样产出，但默认建议人工先判定。

## 服务器侧操作缺口

有时 archive 用例明确要求在服务器、pod、容器或 `localhost:<port>` 上执行 `curl`、脚本、调度任务等非浏览器操作。这种情况下，不能只因为当前 Playwright UI 会话没有这条操作通道，就生成一条把原步骤改成"已由运维或测试数据准备流程完成"之类的语义降级 correction。要保留原步骤的语义，并在 handoff 或 case-corrections 里把缺口写成「需要确认具体执行通道」（SSH 主机、Kubernetes namespace/pod、Kuboard 入口、端口映射或可调用的 oracle）。只有用户确认这步服务器侧操作不需要、或产品流程已经变了，才可以提出改写 archive 的 proposed_change。

## case-corrections.md 结构

每个 run 一份，frontmatter + 若干 correction 段落：

```markdown
---
feature: <featureId>
run_id: <run-id>
generated_at: <ISO 8601>
generator: playwright-automation@1
status: pending
total: N
by_category:
  ui_text_drift: 4
  business_rule: 2
  ambiguous_step: 1
  dependency_missing: 1
  unverifiable_assertion: 0
  wrong_priority: 1
  duplicate: 0
  missing_coverage: 2
---

# Case Corrections — <featureId> / <run-id>

## C-001  ui_text_drift  ★★★ (confidence: high)

- **case_ref**: archive.md#L120 / cases.xmind 节点 `数据质量 > 概览 > P0-1`
- **category**: ui_text_drift
- **doc_claim**: "进入【概览】页面"
- **observed_ui**: 实际菜单文本为 "数据质量概览"
- **evidence**: SR-UI-PROBE-001 (screenshots/ui-probe-overview.png 第 14 行)
- **proposed_change**:
  ```diff
  - 进入【概览】页面
  + 进入【数据质量概览】页面
  ```
- **rationale**: live UI 与 archive 文案不一致；脚本已按 live UI 调整。
- **status**: pending
- **user_note**:
- **previously_rejected**:
```

字段约束：
- `case_ref` 必须同时给 archive.md 行号 + cases.xmind 节点路径。
- `evidence` 必须引用 ui-probe 截图、locator 路径或 run-triage source_ref；不得为空。
- `category` 取值受限于上述 8 类。
- `status` 默认 `pending`；只有 `approved` 才会被 `/case-edit apply-corrections` 落地。
- `previously_rejected` 由本 step 在跨轮去重时自动填充。

## sidecar summary json

同目录写 `case-corrections-summary.json`，必须符合 `CaseCorrections@1` schema。示例：

```json
{
  "schema": "CaseCorrections@1",
  "feature_id": "2026-04-dq-builtin-reasonability-field-calc-compare",
  "run_id": "20260520-1500-abcdef12",
  "generated_at": "2026-05-20T15:00:00Z",
  "generator": "playwright-automation@1",
  "status": "pending",
  "total": 9,
  "by_category": {
    "ui_text_drift": 4,
    "business_rule": 2,
    "ambiguous_step": 1,
    "dependency_missing": 1,
    "unverifiable_assertion": 0,
    "wrong_priority": 1,
    "duplicate": 0,
    "missing_coverage": 0
  },
  "corrections_md": "results/20260520-1500-abcdef12/case-corrections.md",
  "apply_command": "/case-edit apply-corrections workspace/dataAssets/features/2026-04-dq-builtin-reasonability-field-calc-compare 20260520-1500-abcdef12"
}
```

`by_category` 所有 8 个键必须全部出现，缺失类计 0。

## 跨轮去重

生成新 corrections 前，扫描该 feature 下所有历史 run-id：

1. 已 `applied` 的条目（来自历史 `case-corrections-applied.md`）：按三元组 `(case_ref, doc_claim, proposed_change)` **直接过滤**，不再生成。
2. 历史 `case-corrections.md` 里 `status: rejected` 的条目：按同一三元组**保留生成**，但在新条目里填上 `previously_rejected: <prev_run_id>` 提示。
3. 同一三元组若被 `rejected` 3 次或以上（统计全部历史 run）：视为终态噪音，新一轮直接过滤。

## 输出阈值

- 本轮若没有任何可生成的 correction，也要写 `case-corrections-summary.json`（total=0、status=pending），方便 handoff render 渲染「无反哺」段落。
- 单轮 corrections 超过 50 条时，按 confidence 从高到低截断到前 50 条；超出的部分写入同目录 `case-corrections-overflow.md` 仅作记录，不进 summary。

## 禁止

- 不得直接修改 archive.md、cases.xmind 或 test-point-checklist.md。
- 不得依据 archive/PRD 文字单方面判定 UI 错；必须有 ui-probe / run-triage 证据。
- 不得在 case-feedback step 调用 `/case-edit apply-corrections`（审批权在用户）。
- 不得为通过率而弱化 evidence 要求。
- 不得修改 `.kata/repos/{project}/**`。
