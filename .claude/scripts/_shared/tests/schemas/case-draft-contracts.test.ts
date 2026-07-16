import { describe, expect, it } from "bun:test";
import {
  loadCaseEvidenceMapValidator,
  loadFeatureSourceSnapshotV2Validator,
  loadWorkerStatusEnvelopeValidator,
} from "@shared/schemas/loaders.ts";

const SHA = "a".repeat(64);

describe("case-draft structured contracts", () => {
  it("accepts a source-dependent evidence policy including screenshots", () => {
    const validate = loadFeatureSourceSnapshotV2Validator();
    expect(
      validate({
        schema: "FeatureSourceSnapshot@2",
        feature_id: "2026-07-form-change",
        sources: [
          { source_ref: `design.screenshot:form.png#sha256:${SHA}`, path: "inputs/form.png" },
          { source_ref: `user.confirmation:scope-v1#sha256:${SHA}` },
        ],
        required_source_kinds: ["design.screenshot", "user.confirmation"],
        confirmed_source_repos: [],
      }),
    ).toBe(true);
  });

  it("requires traceability on every CaseEvidenceMap row", () => {
    const validate = loadCaseEvidenceMapValidator();
    expect(
      validate({
        schema_ref: "CaseEvidenceMap@1",
        case_id: "C-1",
        case_title: "【P0】Save form",
        requirement_atom_ids: ["RA-1"],
        coverage_matrix_ids: ["CM-1"],
      }),
    ).toBe(true);
    expect(
      validate({
        schema_ref: "CaseEvidenceMap@1",
        case_id: "C-1",
        case_title: "【P0】Save form",
        requirement_atom_ids: [],
        coverage_matrix_ids: [],
      }),
    ).toBe(false);
  });

  it("keeps missing_required_fact in the single Worker envelope enum", () => {
    const validate = loadWorkerStatusEnvelopeValidator();
    expect(
      validate({
        schema: "WorkerStatusEnvelope@1",
        status: "BLOCKED",
        artifacts_written: ["cases/unresolved-summary.md"],
        concerns: "",
        needs_context: "",
        blocked: {
          kind: "missing_required_fact",
          evidence_paths: [],
          context: { stage: "module-identify", reason: "missing prd_id" },
        },
      }),
    ).toBe(true);
  });
});
