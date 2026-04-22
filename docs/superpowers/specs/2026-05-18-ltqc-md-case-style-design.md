# LTQC MD Case Style Design

## Goal

Unify the LTQC LanTu test case Markdown output so it matches the currently accepted first-case visual style and remains stable for XMind conversion and future Playwright script generation.

## Approved Markdown Structure

Each online requirement case file uses this fixed hierarchy:

```md
## v6.4.3

### 14811 【数据资产】数据质量、元数据管理、数据标准适配

##### 【P0】验证「质量报告」中 Doris 3.x 数据源下载功能正常

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 成功进入「已配置报告」页面 |
```

## Formatting Rules

- `##` is reserved for version sections such as `v6.4.3`.
- `###` is reserved for requirement sections. It keeps the requirement id when the source list provides one; it does not add temporary ids when the source list has no id.
- `#####` is reserved for test case titles and keeps the priority prefix such as `【P0】`.
- Each test case contains exactly two content blocks before the next case:
  - `> 前置条件`
  - `> 用例步骤`
- Empty preconditions are rendered as `无` inside a fenced code block.
- Step tables use exactly three columns: `编号`, `步骤`, `预期`.
- The Markdown must not include source trace text such as `SourceRef`, CSV filenames, CSV row ids, standalone case type fields, or standalone priority fields.

## Compatibility

The existing XMind conversion behavior remains compatible with prior Markdown structures. The compact outline behavior for this LTQC file is controlled by the opt-in `--steps-as-notes` flag, so legacy Markdown-to-XMind conversion is not changed by this formatting cleanup.

## Verification

After implementation, check:

- All version sections from `v6.4.3` through `v6.4.10` are present.
- No `SourceRef` or `csv::` text remains.
- Every `#####` test case is followed by `> 前置条件` and `> 用例步骤`.
- Every step table has the header `| 编号 | 步骤 | 预期 |`.
- XMind generation succeeds from the Markdown through the CLI.

## JSON Companion Contract

### requirement_atoms[] active contract examples

Current `FeatureManifest@2` stores lightweight requirement atom rows in `manifest.json#case_drafting.requirement_atoms[]` with `id` and singular `source_ref`:

```json
{
  "id": "RA-001",
  "source_ref": "prd.file:section-1#sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}
```

This `RequirementAtom@1` example mirrors the current golden/contract vocabulary and is not an exhaustive schema. Guide-only fields such as `statement` or `scope_hint` may appear only where the active contract allows them; behavior fields such as `condition`, `action`, `expected_result`, `field_rules`, `state_rules`, `permissions`, and `data_dependencies` follow the active contract.

```json
{
  "schema_ref": "RequirementAtom@1",
  "id": "RA-001",
  "title": "质量报告支持 Doris 3.x 数据源下载",
  "source_refs": [
    "prd.file:section-1#sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  ],
  "subject": "质量报告",
  "evidence_kind": "product_confirmed",
  "ambiguity_class": "non_blocking_question",
  "confidence": "high",
  "condition": "存在 Doris 3.x 数据源质量报告",
  "action": "下载报告",
  "expected_result": "下载成功且文件内容可打开"
}
```

Allowed `evidence_kind` values are `product_confirmed | lanhu_observed | history_inferred | tester_assumption`.

Allowed `ambiguity_class` values are `blocking_unknown | high_risk_pending | defaultable_unknown | automation_deferred | non_blocking_question`.

### MD ↔ JSON 双向解析规则

- 解析方向 1（MD → JSON）：`### <id> <title>` 提取 `requirement_id`；同一 requirement 下的 `##### 【P*】<title>` 按首次出现顺序生成稳定 identity：`case_id = <requirement_id>#<case_ordinal>`；`case_ordinal` 从 `001`、`002` 递增补零，并提取 `priority` 与人读 `case_title`
- 解析方向 2（JSON → MD）：通过 `CaseEvidenceMap@1` / `CoverageMatrix@1` 风格的 `case_id` 与 `requirement_atom_ids[]` 建立 case 到 atom 的机器映射；`case_key` 只能作为内部同义词，除非 active contract 后续允许，否则不得输出；`case_title` 与 `priority` 只作为人读一致性校验，不作为唯一键
- 任一方向缺失 `case_id`、`requirement_atom_ids[]` 映射，或标题/优先级校验不一致，即视为契约破裂；spec reviewer 必须拦下
- 标题/优先级校验先做轻量归一化：去掉匹配 `^【P[0-9]+】` 的优先级前缀，裁剪首尾空白，折叠连续 ASCII/full-width 空白后再比较

Active `CaseEvidenceMap@1` style example:

```json
{
  "schema_ref": "CaseEvidenceMap@1",
  "case_id": "14811#001",
  "coverage_matrix_ids": ["CM-001"],
  "requirement_atom_ids": ["RA-001"],
  "assertions": ["质量报告中 Doris 3.x 数据源下载成功。"],
  "source_refs": [
    "prd.file:section-1#sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  ]
}
```

### SourceRef 归属

- Final presentation artifacts must stay clean: `archive.md`, case body content in `archive.draft.md`, and `cases.xmind` must not expose `SourceRef`, `SR-*`, canonical `source.type:...#sha256:...` strings, `csv::` prefixes, CSV filenames, or row numbers.
- Machine-readable provenance belongs in JSON/evidence contracts: lightweight `FeatureManifest@2` rows use singular `source_ref`; full `RequirementAtom@1`, `CaseEvidenceMap@1`, confirmation, and other evidence artifacts may use `source_refs[]` according to their own schemas.
- Evidence, confirmation, and fallback artifacts may carry SourceRefs when their contracts require them. Lanhu/Axure error-fallback `confirmation-package.md` / `unresolved-summary.md` keep the case-draft `skill.yaml` URL token table exception.
