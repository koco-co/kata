import { describe, expect, it } from "bun:test";
import { validateHandoffEnvelope } from "../../src/policy/schema-guard.ts";

const VALID_SOURCE_REF = `prd.file:demo#sha256:${"a".repeat(64)}`;

describe("SchemaGuard P0 slice", () => {
  it("requires provenance in HandoffEnvelope", () => {
    const result = validateHandoffEnvelope({ artifacts: [] });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("provenance_missing");
  });

  it("requires artifacts to be an array", () => {
    const result = validateHandoffEnvelope({
      schema_version: 1,
      from_agent: "writer",
      to_agent: "orchestrator",
      status: "done",
      summary: "Generated cases",
      artifacts: {},
      issues: [],
      provenance: { sourceRefs: [VALID_SOURCE_REF] },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("artifacts_missing");
  });

  it("rejects previous non-schema guard-shaped envelopes", () => {
    const result = validateHandoffEnvelope({
      sender: "writer",
      receiver: "orchestrator",
      status: "ok",
      summary: "Generated cases",
      provenance: { sourceRefs: [VALID_SOURCE_REF] },
      artifacts: [],
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("schema_version_missing");
    expect(result.issues.map((issue) => issue.code)).toContain("from_agent_missing");
    expect(result.issues.map((issue) => issue.code)).toContain("to_agent_missing");
    expect(result.issues.map((issue) => issue.code)).toContain("status_invalid");
    expect(result.issues.map((issue) => issue.code)).toContain("issues_missing");
    expect(result.issues.map((issue) => issue.code)).toContain("additional_property");
  });

  it("requires schema envelope fields", () => {
    const result = validateHandoffEnvelope({ artifacts: [], issues: [] });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("schema_version_missing");
    expect(result.issues.map((issue) => issue.code)).toContain("from_agent_missing");
    expect(result.issues.map((issue) => issue.code)).toContain("to_agent_missing");
    expect(result.issues.map((issue) => issue.code)).toContain("status_missing");
    expect(result.issues.map((issue) => issue.code)).toContain("summary_missing");
  });

  it("rejects invalid handoff status values", () => {
    const result = validateHandoffEnvelope({
      schema_version: 1,
      from_agent: "writer",
      to_agent: "orchestrator",
      status: "ok",
      summary: "Generated cases",
      artifacts: [],
      issues: [],
      provenance: { sourceRefs: [VALID_SOURCE_REF] },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("status_invalid");
  });

  it("rejects invalid artifact and issue item shapes", () => {
    const result = validateHandoffEnvelope({
      schema_version: 1,
      from_agent: "writer",
      to_agent: "orchestrator",
      status: "done_with_concerns",
      summary: "Generated cases",
      artifacts: [{ path: "workspace/demo/features/cases.md", extra: true }],
      issues: [{ severity: "info", message: "Needs review", code: "x" }],
      provenance: { sourceRefs: [VALID_SOURCE_REF] },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("artifact_invalid");
    expect(result.issues.map((issue) => issue.code)).toContain("issue_invalid");
  });

  it("requires non-empty SourceRef provenance", () => {
    const result = validateHandoffEnvelope({
      schema_version: 1,
      from_agent: "writer",
      to_agent: "orchestrator",
      status: "done",
      summary: "Generated cases",
      artifacts: [],
      issues: [],
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("provenance_missing");

    const emptyRefs = validateHandoffEnvelope({
      schema_version: 1,
      from_agent: "writer",
      to_agent: "orchestrator",
      status: "done",
      summary: "Generated cases",
      artifacts: [],
      issues: [],
      provenance: { sourceRefs: [] },
    });

    expect(emptyRefs.ok).toBe(false);
    expect(emptyRefs.issues.map((issue) => issue.code)).toContain("provenance_invalid");
  });

  it("allows schema-valid HandoffEnvelope", () => {
    const envelope = {
      schema_version: 1,
      from_agent: "writer",
      to_agent: "orchestrator",
      status: "done_with_concerns",
      summary: "Generated cases",
      artifacts: [{ path: "workspace/demo/features/cases.md", kind: "archive" }],
      issues: [{ severity: "warning", message: "Reviewed with limited source context." }],
      provenance: { sourceRefs: [VALID_SOURCE_REF] },
    };
    const result = validateHandoffEnvelope(envelope);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(envelope);
    expect(result.issues).toEqual([]);
  });
});
