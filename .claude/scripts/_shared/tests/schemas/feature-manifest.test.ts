import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { sharedSchemasPath } from "@shared/lib/paths.ts";
import Ajv from "ajv";

const schema = JSON.parse(
  readFileSync(sharedSchemasPath("FeatureManifest.v2.schema.json"), "utf-8"),
);
const validate = new Ajv({ strict: false, validateSchema: false }).compile(schema);

const baseManifest = {
  schema: "FeatureManifest@2",
  feature_id: "2026-04-dq-json-config",
  case_drafting: {
    status: "completed",
    archive_path: "archive.md",
    xmind_path: "cases.xmind",
    requirement_atoms: [
      {
        id: "RA-001",
        source_ref: "prd.file:s-1#sha256:abc",
        ambiguity_class: "confirmed",
        confidence: "high",
      },
    ],
    coverage_matrix_path: "archive.md#coverage-matrix",
  },
  automation: {
    status: "ready",
    intents: [
      {
        intent_id: "SR-INTENT-X",
        case_files: ["tests/cases/t01.ts"],
        automation_status: "ready",
      },
    ],
    last_handoff_path: null,
    last_run_status: "not-run",
  },
  files: {
    archive: "archive.md",
    xmind: "cases.xmind",
    tests_root: "tests/",
    latest_results: null,
  },
};

describe("FeatureManifest@2", () => {
  it("accepts a complete manifest", () => {
    expect(validate(baseManifest)).toBe(true);
  });

  it("rejects unknown automation.status", () => {
    const bad = { ...baseManifest, automation: { ...baseManifest.automation, status: "maybe" } };
    expect(validate(bad)).toBe(false);
  });

  it("rejects when case_drafting.status is enum miss", () => {
    const bad = {
      ...baseManifest,
      case_drafting: { ...baseManifest.case_drafting, status: "wip" },
    };
    expect(validate(bad)).toBe(false);
  });

  it("requires feature_id to match slug regex", () => {
    const bad = { ...baseManifest, feature_id: "BAD-ID" };
    expect(validate(bad)).toBe(false);
  });

  it("accepts completed case_drafting with empty requirement_atoms", () => {
    const ok = {
      ...baseManifest,
      case_drafting: { ...baseManifest.case_drafting, status: "completed", requirement_atoms: [] },
    };
    expect(validate(ok)).toBe(true);
  });

  it("accepts completed case_drafting with null coverage_matrix_path", () => {
    const ok = {
      ...baseManifest,
      case_drafting: {
        ...baseManifest.case_drafting,
        status: "completed",
        coverage_matrix_path: null,
      },
    };
    expect(validate(ok)).toBe(true);
  });

  it("rejects completed case_drafting with null archive_path", () => {
    const bad = {
      ...baseManifest,
      case_drafting: { ...baseManifest.case_drafting, status: "completed", archive_path: null },
    };
    expect(validate(bad)).toBe(false);
  });

  it("still accepts not-started case_drafting with empty atoms", () => {
    const ok = {
      ...baseManifest,
      case_drafting: {
        status: "not-started",
        archive_path: null,
        xmind_path: null,
        requirement_atoms: [],
        coverage_matrix_path: null,
      },
    };
    expect(validate(ok)).toBe(true);
  });

  it("accepts completed atom with only id/source_ref", () => {
    const ok = {
      ...baseManifest,
      case_drafting: {
        status: "completed",
        archive_path: "archive.md",
        xmind_path: "cases.xmind",
        coverage_matrix_path: null,
        requirement_atoms: [{ id: "RA-1", source_ref: `lanhu.fixture:f#sha256:${"a".repeat(64)}` }],
      },
    };
    expect(validate(ok)).toBe(true);
  });

  it("accepts completed atom carrying richer evidence fields", () => {
    const ok = {
      ...baseManifest,
      case_drafting: {
        status: "completed",
        archive_path: "archive.md",
        xmind_path: "cases.xmind",
        coverage_matrix_path: null,
        requirement_atoms: [
          { id: "RA-1", source_ref: "SR-001", evidence_kind: "history_case", description: "x" },
        ],
      },
    };
    expect(validate(ok)).toBe(true);
  });

  it("accepts completed atom with enrichment fields", () => {
    const ok = {
      ...baseManifest,
      case_drafting: {
        status: "completed",
        archive_path: "archive.md",
        xmind_path: "cases.xmind",
        coverage_matrix_path: "coverage-matrix.json",
        requirement_atoms: [
          {
            id: "RA-1",
            source_ref: `lanhu.fixture:f#sha256:${"a".repeat(64)}`,
            title: "登录",
            ambiguity_class: "confirmed",
            confidence: "high",
          },
        ],
      },
    };
    expect(validate(ok)).toBe(true);
  });
});
