import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import { repoRoot } from "../../lib/paths.ts";

const schema = JSON.parse(
  readFileSync(join(repoRoot(), ".ai/core/schemas/FeatureManifest.v2.schema.json"), "utf-8"),
);
const validate = new Ajv({ strict: false, validateSchema: false }).compile(schema);

const baseManifest = {
  schema: "FeatureManifest@2",
  feature_id: "2026-04-dq-json-config",
  case_drafting: {
    status: "completed",
    archive_path: "archive.md",
    xmind_path: "cases.xmind",
    requirement_atoms: [{ id: "RA-001", source_ref: "prd.file:s-1#sha256:abc" }],
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
});
