import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import Ajv from "ajv";
import { contractPath } from "@shared/lib/paths.ts";

const schemaPath = contractPath("schemas", "FeatureMetadata.v1.schema.json");
const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
const ajv = new Ajv({ strict: false, validateSchema: false });
const validate = ajv.compile(schema);

describe("FeatureMetadata@1", () => {
  it("accepts a minimal valid metadata", () => {
    const ok = {
      schema: "FeatureMetadata@1",
      id: "2026-04-dq-json-config",
      display_name: "JSON 格式配置",
      status: "active",
      created_at: "2026-04-15",
      updated_at: "2026-05-10",
      modules: ["dq"],
      customers: ["standard"],
      versions: ["v6.4"],
      owners: ["koco"],
      inputs: [{ kind: "prd", ref: "prd.file:s-1#sha256:abc" }],
      relates_to: [],
      emits: { cases_xmind: true, archive: true, playwright_tests: true },
    };
    expect(validate(ok)).toBe(true);
  });

  it("rejects id mismatch with display_name format", () => {
    const bad = { schema: "FeatureMetadata@1", id: "INVALID UPPERCASE" };
    expect(validate(bad)).toBe(false);
  });

  it("rejects status outside enum", () => {
    const bad = {
      schema: "FeatureMetadata@1",
      id: "2026-04-x",
      display_name: "x",
      status: "wip",
      created_at: "2026-04-01",
      updated_at: "2026-04-01",
      modules: [],
      customers: [],
      versions: [],
      owners: [],
      inputs: [],
      relates_to: [],
      emits: {},
    };
    expect(validate(bad)).toBe(false);
  });
});
