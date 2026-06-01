import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { sharedSchemasPath } from "@shared/lib/paths.ts";
import Ajv from "ajv";

const schemaPath = sharedSchemasPath("FeatureMetadata.v1.schema.json");
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

  // ── 方案A: id 允许 CJK 人类标签约定 【v{版本}】[【...】]【{模块}】{描述} ──

  it("accepts a CJK human-label id", () => {
    const ok = {
      schema: "FeatureMetadata@1",
      id: "【v647】【数据质量】控制每个规则开关",
      display_name: "控制每个规则开关",
      status: "active",
      created_at: "2026-04-15",
      updated_at: "2026-05-10",
      modules: ["dq"],
      customers: ["standard"],
      versions: ["v6.4"],
      owners: ["koco"],
      inputs: [],
      relates_to: [],
      emits: { cases_xmind: true, archive: true, playwright_tests: true },
    };
    expect(validate(ok)).toBe(true);
  });

  it("still accepts a slug id", () => {
    const ok = {
      schema: "FeatureMetadata@1",
      id: "2026-04-dq-json-config",
      display_name: "x",
      status: "active",
      created_at: "2026-04-15",
      updated_at: "2026-05-10",
      modules: ["dq"],
      customers: ["standard"],
      versions: ["v6.4"],
      owners: ["koco"],
      inputs: [],
      relates_to: [],
      emits: {},
    };
    expect(validate(ok)).toBe(true);
  });

  it("rejects a CJK id missing the version bracket", () => {
    const bad = { schema: "FeatureMetadata@1", id: "【数据质量】控制每个规则开关" };
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
