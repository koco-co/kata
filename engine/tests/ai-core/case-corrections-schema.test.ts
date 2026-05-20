import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = join(import.meta.dirname, "../../..");
const schemaPath = ".ai/core/schemas/CaseCorrections.v1.schema.json";

function loadSchema(): unknown {
  return JSON.parse(readFileSync(join(root, schemaPath), "utf8"));
}

describe("CaseCorrections@1 schema", () => {
  it("is registered in registry.yaml", () => {
    const registry = readFileSync(join(root, ".ai/core/schemas/registry.yaml"), "utf8");
    expect(registry).toContain("id: CaseCorrections@1");
    expect(registry).toContain(`path: ${schemaPath}`);
  });

  it("has $id CaseCorrections@1 and strict additionalProperties", () => {
    const schema = loadSchema() as Record<string, unknown>;
    expect(schema.$id).toBe("CaseCorrections@1");
    expect(schema.additionalProperties).toBe(false);
  });

  it("validates a minimal valid summary", () => {
    const ajv = new Ajv({ strict: false, validateSchema: false });
    addFormats(ajv);
    const validate = ajv.compile(loadSchema() as object);
    const ok = validate({
      schema: "CaseCorrections@1",
      feature_id: "2026-04-dq-builtin-reasonability-field-calc-compare",
      run_id: "20260520-1500-abcdef12",
      generated_at: "2026-05-20T15:00:00Z",
      generator: "playwright-automation@1",
      status: "pending",
      total: 2,
      by_category: {
        ui_text_drift: 1,
        business_rule: 1,
        ambiguous_step: 0,
        dependency_missing: 0,
        unverifiable_assertion: 0,
        wrong_priority: 0,
        duplicate: 0,
        missing_coverage: 0,
      },
      corrections_md: "results/20260520-1500-abcdef12/case-corrections.md",
      apply_command:
        "/case-edit apply-corrections workspace/dataAssets/features/2026-04-dq-builtin-reasonability-field-calc-compare 20260520-1500-abcdef12",
    });
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
  });

  it("rejects unknown category in by_category", () => {
    const ajv = new Ajv({ strict: false, validateSchema: false });
    addFormats(ajv);
    const validate = ajv.compile(loadSchema() as object);
    const ok = validate({
      schema: "CaseCorrections@1",
      feature_id: "2026-04-dq-builtin-reasonability-field-calc-compare",
      run_id: "20260520-1500-abcdef12",
      generated_at: "2026-05-20T15:00:00Z",
      generator: "playwright-automation@1",
      status: "pending",
      total: 1,
      by_category: { unknown_bucket: 1 },
      corrections_md: "results/20260520-1500-abcdef12/case-corrections.md",
      apply_command: "/case-edit apply-corrections x y",
    });
    expect(ok).toBe(false);
  });

  it("rejects status outside the allowed enum", () => {
    const ajv = new Ajv({ strict: false, validateSchema: false });
    addFormats(ajv);
    const validate = ajv.compile(loadSchema() as object);
    const ok = validate({
      schema: "CaseCorrections@1",
      feature_id: "2026-04-dq-builtin-reasonability-field-calc-compare",
      run_id: "20260520-1500-abcdef12",
      generated_at: "2026-05-20T15:00:00Z",
      generator: "playwright-automation@1",
      status: "draft",
      total: 0,
      by_category: {
        ui_text_drift: 0,
        business_rule: 0,
        ambiguous_step: 0,
        dependency_missing: 0,
        unverifiable_assertion: 0,
        wrong_priority: 0,
        duplicate: 0,
        missing_coverage: 0,
      },
      corrections_md: "results/x/case-corrections.md",
      apply_command: "/case-edit apply-corrections x y",
    });
    expect(ok).toBe(false);
  });
});
