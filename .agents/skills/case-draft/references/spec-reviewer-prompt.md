# Spec Reviewer Prompt — case-draft

Run this reviewer in the main session only. It is a mechanical contract check after
`case-draft` artifacts are written and before quality review or output. Do not
judge prose quality, rewrite test cases, or ask the user questions from this
reviewer.

## Hard Rules Priority

- Load the active `SKILL.md` hard rules first. If a check below conflicts with a
  hard rule, record it in `out_of_scope` instead of `issues`.
- Lanhu/Axure error-fallback rules stay valid. `confirmation-package.md` and
  `unresolved-summary.md` may contain SourceRef, `SR-`, URL evidence, and search
  evidence when their own fallback contracts require it; do not apply the final
  presentation leak lint to those two files.
- Keep the review mechanical. If a concern needs product judgement, classify it
  as `out_of_scope` with the reason.

## SourceRef Layering Lint

Final presentation artifacts must not expose provenance tokens or evidence
locators. Check `archive.md`, `archive.draft.md`, and inspectable text inside
`cases.xmind` when those files exist.

Fail with `kind: "sourceref_leaked_in_md"` if final presentation text contains
any of these patterns:

- Literal `SourceRef` or `SourceRefs`.
- Any `SR-` identifier, for example `SR-LANHU-URL-001` or
  `SR-INTENT-CASE-001`.
- Any `csv::` locator.
- CSV evidence locator text only when it is clearly attached to provenance,
  source, or evidence context, for example `source: import.csv row 12`,
  `evidence from CSV row 12`, `from row #12`, or a CSV row id used as
  provenance. Do not flag ordinary product behavior text about CSV import/export,
  table row behavior, or user-visible rows.
- Canonical source refs matching the active SourceRef shape, including
  `prd.file:<id>#sha256:<hash>`, `lanhu.fixture:<id>#sha256:<hash>`,
  `knowledge.entry:<id>#sha256:<hash>`, `repo.line:<id>#sha256:<hash>`,
  `case.archive:<id>#sha256:<hash>`, `workspace.config:<id>#sha256:<hash>`, and
  `command.output:<id>#sha256:<hash>`. Do not flag generic checksum validation
  text or arbitrary `sha256:<hash>` strings unless they use an active SourceRef
  namespace or are explicitly labeled as provenance/source/evidence.

Evidence and fallback artifacts may carry refs according to their own contracts:
`manifest.json`, RequirementAtom@1 records, CaseEvidenceMap@1, CoverageMatrix@1,
`confirmation-package.md`, and `unresolved-summary.md` are not final
presentation files for this lint.

## Manifest And Evidence Completeness

Check `manifest.json` as FeatureManifest@2:

- `case_drafting.requirement_atoms` must be nonempty after normal atomization.
  If the active Lanhu/Axure blocked-source fallback hard rule requires
  `requirement_atoms: []`, put this check in `out_of_scope` for that fallback.
- Every lightweight `case_drafting.requirement_atoms[]` row must contain exactly
  the active lightweight keys `id` and singular `source_ref`.
- Do not require stale manifest fields such as `atom_id`, `case_title`,
  `priority`, or `source_refs[]` inside those lightweight rows. If those stale
  keys appear as machine fields in the lightweight manifest row, report
  `kind: "structural"`.

If full evidence records declare RequirementAtom@1, verify each record has the
required evidence fields for that contract: `id`, `title`, `subject`,
`source_refs[]`, `evidence_kind`, `ambiguity_class`, and `confidence`. The active
enum values are:

- `evidence_kind`: `product_confirmed`, `lanhu_observed`,
  `history_inferred`, `tester_assumption`
- `ambiguity_class`: `blocking_unknown`, `high_risk_pending`,
  `defaultable_unknown`, `automation_deferred`, `non_blocking_question`

Report `kind: "atom_missing"` when atoms are absent, empty, or missing required
evidence fields. Report `kind: "structural"` when enum values are outside the
active contract.

CaseEvidenceMap@1 is the case mapping contract: it uses `case_id`, optional
`coverage_matrix_ids`, and `requirement_atom_ids`. CoverageMatrix@1 rows are
coverage rows keyed by `id`; they use `requirement_atom_ids` and must not be
treated as cases or required to carry `case_id`.

Report `kind: "structural"` if a case mapping uses stale `requirement_id` as
the machine key, treats `case_title` or `priority` as the unique machine key, or
requires `case_id` on CoverageMatrix@1 rows.

## MD ↔ JSON caseId Reconciliation

Reconcile presentation artifacts against DraftCaseSet and CaseEvidenceMap@1 by
`case_id`, not by human-readable title. Use CoverageMatrix@1 only for coverage
tracing through `coverage_matrix_ids` and `requirement_atom_ids`.

- Every case shown in `archive.md`, `archive.draft.md`, or `cases.xmind` must map
  to a DraftCaseSet case or CaseEvidenceMap@1 record with the same `case_id`.
- Every presented DraftCaseSet or CaseEvidenceMap@1 case must have nonempty
  `requirement_atom_ids`, or nonempty `coverage_matrix_ids` that resolve to
  CoverageMatrix@1 `id` values whose rows have nonempty `requirement_atom_ids`.
- Every `coverage_matrix_ids[]` value must match a CoverageMatrix@1 row `id`.
- Every `requirement_atom_ids[]` value from DraftCaseSet, CaseEvidenceMap@1, or
  resolved CoverageMatrix@1 rows must match an atom id in FeatureManifest@2
  lightweight `requirement_atoms[]` or the full RequirementAtom@1 evidence set.
- `case_title` and `priority` are human-readable consistency checks only. They
  may help detect accidental swaps, but they are not unique keys and must not be
  used to prove coverage.

Report `kind: "caseid_mismatch"` for missing or duplicate `case_id` on presented
cases, missing DraftCaseSet/CaseEvidenceMap@1 records for presented cases,
unresolved `coverage_matrix_ids`, empty traced `requirement_atom_ids`, or atom
ids that do not exist.

## Blocking pending

Compute Blocking pending mechanically from atoms, mappings, unresolved summary,
and manifest status:

- `blocking_unknown` and `high_risk_pending` count as blocking pending for final
  case output.
- `defaultable_unknown` may pass only when the default basis is documented and no
  hard rule says the item must block.
- `automation_deferred` does not block human-readable case output, but it must
  not be handed off as ready automation.
- `non_blocking_question` may remain in notes or confirmation context, but must
  not be represented as blocking final coverage.

Report `kind: "blocking_pending"` when:

- `archive.md` or `cases.xmind` exists while blocking pending count is nonzero.
- `manifest.json#case_drafting.status` is `completed` while unresolved blocking
  or high-risk pending items remain.
- `manifest.json#case_drafting.status` is `blocked` or `in-progress` while final
  output artifacts are present.

Report `kind: "history_misclassified"` when `history_inferred` evidence is
presented as `product_confirmed`, or when history-only evidence is used to
confirm new product behavior without a product-confirmed or Lanhu-observed atom.

## Platform/Source Form Baseline Lint

When the user request, source-snapshot, or requirement atoms mention source code,
platform DOM/YAML, environment YAML, or screenshots as required references for
form-driven cases, mechanically check that final cases have corresponding
repo.line/workspace.config/screenshot evidence or an extracted form-field
baseline. Report `kind: "missing_form_baseline"` when form steps contain field
labels, options, buttons, or configuration items but no source/DOM baseline is
present. Report `kind: "unsupported_form_field"` when a step contains a field or
option explicitly absent from that baseline.

## Output Format

Return JSON only:

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

`spec_review_status` is `fail` when `issues` is nonempty. `spec_review_status` is
`pass` only when `issues` is an empty array.
