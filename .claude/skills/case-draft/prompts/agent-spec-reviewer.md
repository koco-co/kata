# Spec Reviewer 提示词 — case-draft

## 目录

- 硬规则优先级
- SourceRef 分层 lint
- Manifest 与证据完整性
- MD ↔ JSON caseId 核对
- Blocking pending
- 平台/源码表单基线 lint
- 输出格式

仅在主会话运行本 reviewer。它是在 `case-draft` 产物落盘之后、质量审查或输出之前的一次机械契约检查。本 reviewer 不评判文字质量、不改写用例、不向用户提问。

## 硬规则优先级

- 先加载当前 `SKILL.md` 的硬规则。若下方某项检查与硬规则冲突，记入 `out_of_scope` 而非 `issues`。
- Lanhu/Axure error-fallback 规则依然有效。`confirmation-package.md` 与 `unresolved-summary.md` 在其自身 fallback 契约要求时可包含 SourceRef、`SR-`、URL 证据与检索证据；不要对这两个文件套用最终呈现层的泄漏 lint。
- 保持机械化审查。若某关注点需要产品判断，归为 `out_of_scope` 并写明理由。

## SourceRef 分层 lint

最终呈现产物不得暴露 provenance token 或证据定位符。检查存在的 `archive.md`、`archive.draft.md`，以及 `cases.xmind` 内可检阅的文本。

当最终呈现文本包含下列任一形态时，以 `kind: "sourceref_leaked_in_md"` 判 fail：

- 字面量 `SourceRef` 或 `SourceRefs`。
- 任何 `SR-` 标识符，例如 `SR-LANHU-URL-001` 或 `SR-INTENT-CASE-001`。
- 任何 `csv::` 定位符。
- CSV 证据定位文本，仅当它明确附着于 provenance、source 或 evidence 语境时，例如 `source: import.csv row 12`、`evidence from CSV row 12`、`from row #12`，或被当作 provenance 使用的 CSV 行号。不要误判关于 CSV 导入/导出、表格行行为、用户可见行的普通产品行为文本。
- 匹配当前 SourceRef 形态的规范 source ref，包括 `prd.file:<id>#sha256:<hash>`、`lanhu.fixture:<id>#sha256:<hash>`、`knowledge.entry:<id>#sha256:<hash>`、`repo.line:<id>#sha256:<hash>`、`case.archive:<id>#sha256:<hash>`、`workspace.config:<id>#sha256:<hash>` 与 `command.output:<id>#sha256:<hash>`。不要误判通用 checksum 校验文本或任意 `sha256:<hash>` 串，除非它们使用了当前 SourceRef 命名空间，或被明确标注为 provenance/source/evidence。

证据类与 fallback 产物可按其自身契约携带 ref：`manifest.json`、RequirementAtom@1 记录、CaseEvidenceMap@1、CoverageMatrix@1、`confirmation-package.md` 与 `unresolved-summary.md` 对本 lint 而言不属于最终呈现文件。

## Manifest 与证据完整性

将 `manifest.json` 按 FeatureManifest@2 检查：

- 正常 atomization 后 `case_drafting.requirement_atoms` 必须非空。若当前 Lanhu/Axure blocked-source fallback 硬规则要求 `requirement_atoms: []`，则在该 fallback 下把此项检查记入 `out_of_scope`。
- 每个轻量 `case_drafting.requirement_atoms[]` 行必须且仅包含当前轻量键 `id` 与单数 `source_ref`。
- 不要要求轻量行内出现 `atom_id`、`case_title`、`priority`、`source_refs[]` 等陈旧 manifest 字段。若这些陈旧键作为机器字段出现在轻量 manifest 行中，报 `kind: "structural"`。

若完整证据记录声明 RequirementAtom@1，逐条验证其具备该契约要求的证据字段：`id`、`title`、`subject`、`source_refs[]`、`evidence_kind`、`ambiguity_class` 与 `confidence`。当前 enum 值为：

- `evidence_kind`：`product_confirmed`、`lanhu_observed`、`history_inferred`、`tester_assumption`
- `ambiguity_class`：`blocking_unknown`、`high_risk_pending`、`defaultable_unknown`、`automation_deferred`、`non_blocking_question`

当 atom 缺失、为空或缺少必需证据字段时报 `kind: "atom_missing"`。当 enum 值超出当前契约时报 `kind: "structural"`。

CaseEvidenceMap@1 是用例映射契约：使用 `case_id`、可选 `coverage_matrix_ids` 与 `requirement_atom_ids`。CoverageMatrix@1 行是以 `id` 为键的覆盖行；它们使用 `requirement_atom_ids`，不得被当作用例，也不得被要求携带 `case_id`。

当用例映射把陈旧的 `requirement_id` 当机器键、把 `case_title` 或 `priority` 当唯一机器键，或要求 CoverageMatrix@1 行携带 `case_id` 时，报 `kind: "structural"`。

## MD ↔ JSON caseId 核对

按 `case_id`（而非人类可读标题）把呈现产物与 DraftCaseSet 和 CaseEvidenceMap@1 核对。CoverageMatrix@1 仅用于通过 `coverage_matrix_ids` 与 `requirement_atom_ids` 做覆盖追溯。

- `archive.md`、`archive.draft.md` 或 `cases.xmind` 中展示的每条用例，必须映射到具有相同 `case_id` 的 DraftCaseSet 用例或 CaseEvidenceMap@1 记录。
- 每条被呈现的 DraftCaseSet 或 CaseEvidenceMap@1 用例必须有非空 `requirement_atom_ids`，或有非空 `coverage_matrix_ids` 且能解析到 CoverageMatrix@1 的 `id`，而这些行的 `requirement_atom_ids` 非空。
- 每个 `coverage_matrix_ids[]` 值必须匹配某个 CoverageMatrix@1 行 `id`。
- 来自 DraftCaseSet、CaseEvidenceMap@1 或已解析 CoverageMatrix@1 行的每个 `requirement_atom_ids[]` 值，必须匹配 FeatureManifest@2 轻量 `requirement_atoms[]` 或完整 RequirementAtom@1 证据集中的某个 atom id。
- `case_title` 与 `priority` 仅作人类可读一致性检查。它们可帮助发现意外错位，但不是唯一键，不得用来证明覆盖。

当出现下列情况报 `kind: "caseid_mismatch"`：被呈现用例的 `case_id` 缺失或重复、被呈现用例缺少对应 DraftCaseSet/CaseEvidenceMap@1 记录、`coverage_matrix_ids` 无法解析、追溯到的 `requirement_atom_ids` 为空，或 atom id 不存在。

## Blocking pending

从 atoms、mappings、unresolved summary 与 manifest 状态机械计算 Blocking pending：

- `blocking_unknown` 与 `high_risk_pending` 计为最终用例输出的 blocking pending。
- `defaultable_unknown` 仅当默认依据已记录且无硬规则要求该项必须阻塞时才可通过。
- `automation_deferred` 不阻塞人类可读用例输出，但不得作为 ready automation 移交。
- `non_blocking_question` 可保留在 notes 或 confirmation 语境，但不得被表示为阻塞最终覆盖。

当下列情况发生时报 `kind: "blocking_pending"`：

- blocking pending 计数非零时却存在 `archive.md` 或 `cases.xmind`。
- 仍有未决的 blocking 或 high-risk pending 项时 `manifest.json#case_drafting.status` 却为 `completed`。
- 已存在最终输出产物时 `manifest.json#case_drafting.status` 却为 `blocked` 或 `in-progress`。

当 `history_inferred` 证据被呈现为 `product_confirmed`，或仅凭历史证据在没有 product-confirmed 或 Lanhu-observed atom 的情况下确认新产品行为时，报 `kind: "history_misclassified"`。

## 平台/源码表单基线 lint

当用户请求、source-snapshot 或 requirement atoms 提到源码、平台 DOM/YAML、环境 YAML 或截图作为表单类用例的必读参照时，机械检查最终用例是否具备对应的 repo.line/workspace.config/screenshot 证据或一份抽取出的表单字段基线。当表单步骤含字段 label、选项、按钮或配置项却无 source/DOM 基线时，报 `kind: "missing_form_baseline"`。当某步骤含明确不在该基线内的字段或选项时，报 `kind: "unsupported_form_field"`。

## 输出格式

只返回 JSON：

```json
{
  "spec_review_status": "pass | fail",
  "issues": [
    {
      "kind": "sourceref_leaked_in_md | atom_missing | caseid_mismatch | blocking_pending | history_misclassified | structural",
      "where": "artifact path and precise field or section",
      "fix_hint": "minimal mechanical fix"
    }
  ],
  "out_of_scope": [
    {
      "where": "check or artifact",
      "reason": "why the active hard rules or product judgement place it outside this mechanical review"
    }
  ]
}
```

`issues` 非空时 `spec_review_status` 为 `fail`。仅当 `issues` 为空数组时 `spec_review_status` 为 `pass`。
