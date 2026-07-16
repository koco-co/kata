# Spec Reviewer 提示词 — case-draft

仅在主会话运行。本 reviewer 在 `case-draft` 产物落盘之后、质量审查或输出之前做一次机械检查：只查结构、字段和引用是否正确，不评判文字质量、不改写用例、不向用户提问。

## 硬规则优先

- 先加载当前 `SKILL.md` 的硬规则。下方某项检查与硬规则冲突时，记入 `out_of_scope`，不计 `issues`。
- Lanhu/Axure error-fallback 规则依然有效：`cases/confirmation-package.md` 与 `cases/unresolved-summary.md` 按 fallback 约定本身就允许包含 SourceRef、`SR-`、URL 与检索记录，不要对这两个文件套用交付正文的泄漏检查。
- 只做机械检查。需要产品判断的关注点，归入 `out_of_scope` 并写明理由。

## 机械检查交给命令（SourceRef 分层 / Manifest 字段 / 计数核对）

SourceRef 是否泄漏进交付正文、metadata requirement atoms / CaseEvidenceMap@1 / CoverageMatrix@1 字段是否完整、枚举是否越界、`case_count` 与实际用例数是否一致——这些机械判定一律以 `kata cases lint`、`kata cases validate`、`kata cases verify` 的 exit-code 为准。Reviewer 不重复执行命令已覆盖的逐字符检查，只补语义判断：

- `evidence_kind` 误标——把 `history_inferred` 当 `product_confirmed`，或缺 product-confirmed / lanhu-observed atom 时仅凭历史线索确认新行为，报 `kind: "history_misclassified"`。
- `history_only` 误判——新增产品行为只挂历史证据、无产品/平台确认，同样按 `history_misclassified` 处理。
- `ambiguity_class` 误判——把实为 `blocking_unknown` / `high_risk_pending` 的未决项降级成可放行类，报 `kind: "blocking_pending"`。

## MD ↔ JSON caseId 核对

用 Archive 隐藏标记中的 `case_id` 关联 CaseEvidenceMap@1；`prd_id` 只表示需求 ID。CoverageMatrix@1 只通过 `coverage_matrix_ids` 与 `requirement_atom_ids` 做覆盖追溯。

- `cases/archive.md` / `archive.draft.md` 的每条 `#####` 用例必须有唯一 `<!-- case_id: ... -->`，并能在 `.process/case-evidence-map.json` 找到同 ID 记录；XMind 从同一 Archive 生成。
- 每条展示的用例必须有非空 `requirement_atom_ids`；或者有非空 `coverage_matrix_ids`，且能解析到 CoverageMatrix@1 的行、该行的 `requirement_atom_ids` 非空。
- 每个 `coverage_matrix_ids[]` 值必须能匹配某个 CoverageMatrix@1 行 `id`。
- CaseEvidenceMap@1 或已解析 CoverageMatrix@1 行的每个 `requirement_atom_ids[]` 值，必须能在 metadata requirement atoms 中找到对应 atom。
- `case_title` 与 `priority` 只作人类可读的一致性参考：可辅助发现错位，但不是唯一键，不得用来证明覆盖。

出现下列情况报 `kind: "caseid_mismatch"`：用例 `case_id` 缺失或重复、找不到对应 CaseEvidenceMap@1 记录、`coverage_matrix_ids` 解析不到、追溯到的 `requirement_atom_ids` 为空，或 atom id 不存在。

## Blocking pending

从 atoms、mappings、unresolved summary 与 manifest 状态机械计算 blocking pending：

- `blocking_unknown` 与 `high_risk_pending` 计入 blocking pending，阻塞最终用例输出。
- `defaultable_unknown` 仅在默认依据已记录、且没有硬规则要求阻塞时放行。
- `automation_deferred` 不阻塞人类可读的用例输出，但不得作为 ready automation 移交。
- `non_blocking_question` 可以留在 notes 或确认类产物里，但不得按阻塞项呈现。

出现下列情况报 `kind: "blocking_pending"`：

- blocking pending 计数非零，却已生成 `cases/archive.md` 或 `cases/cases.xmind`。
- 仍有未决的 blocking 或 high-risk 项，`metadata.yaml#case_drafting.status` 却是 `completed`。
- 最终产物已存在，`status` 却还是 `blocked` 或 `in-progress`。

`evidence_kind` / `history_only` 误标按上方「机械检查交给命令」一节的语义判断处理（`history_misclassified`）。

## 表单基线 / 菜单文案核对

**无条件触发**（不再要求 atoms 先声明 DOM 为必读）：只要最终用例步骤里出现表单字段填写（字段 label、下拉选项、按钮、配置项，形如 `- 字段:`、`- 统计函数:`、点击「…」），或出现左导航/菜单路径、页面与向导步骤名，就核对它们是否有目标环境证据支撑——目标环境 `sites/<host>/dom-*.md` 摘要、repo.line/workspace.config/screenshot，或抽取出的表单字段基线：

- 表单步骤有字段/选项/按钮却无基线 → 报 `kind: "missing_form_baseline"`；用到明确不在基线内的字段或选项 → 报 `kind: "unsupported_form_field"`。
- 步骤/预期里的菜单名、左导航、向导步骤、按钮文案，在目标环境 DOM 证据里找不到逐字一致的项，或明显沿用 fewshot/历史用例（岚图）的菜单名而非当前环境 DOM → 报 `kind: "nav_menu_unverified"`。

## 外部事实字段语义核对

`case_count` 与实际用例数由命令门兜底。这里只补命令查不到的语义判断：`suite_name`、`prd_id`、`prd_version` 等外部事实若无 SourceRef 或用户确认依据 → 报 `kind: "unconfirmed_external_fact"`。`case_id` 是内部用例主键，不按外部事实审查。

## 输出格式

只返回 JSON：

```json
{
  "spec_review_status": "pass | fail",
  "issues": [
    {
      "kind": "sourceref_leaked_in_md | atom_missing | caseid_mismatch | blocking_pending | history_misclassified | structural | unconfirmed_external_fact | missing_form_baseline | unsupported_form_field | nav_menu_unverified",
      "where": "产物路径 + 精确到字段或小节",
      "fix_hint": "最小的机械修复建议"
    }
  ],
  "out_of_scope": [
    {
      "where": "检查项或产物",
      "reason": "为什么硬规则或产品判断把它排除在本次机械检查之外"
    }
  ]
}
```

`issues` 非空时 `spec_review_status` 为 `fail`；只有 `issues` 为空数组时才是 `pass`。
