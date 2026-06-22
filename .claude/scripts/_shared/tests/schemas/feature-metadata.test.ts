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

// ── FeatureMetadata@2: completed 增强块放开后的行为(kata features lint 实际用此 schema) ──
const v2Schema = JSON.parse(
  readFileSync(sharedSchemasPath("FeatureMetadata.v2.schema.json"), "utf-8"),
);
const validateV2 = new Ajv({ strict: false, validateSchema: false }).compile(v2Schema);

const baseV2 = {
  schema: "FeatureMetadata@2",
  id: "【v647】【数据质量】控制每个规则开关",
  display_name: "x",
  status: "active",
  created_at: "2026-04-15",
  updated_at: "2026-05-10",
  modules: ["dq"],
  customers: ["standard"],
  versions: ["v6.4"],
  owners: [],
  inputs: [],
  relates_to: [],
  emits: {},
};

describe("FeatureMetadata@2 case_drafting", () => {
  it("accepts completed with null coverage_matrix_path and empty atoms", () => {
    const ok = {
      ...baseV2,
      case_drafting: {
        status: "completed",
        archive_path: "cases/archive.md",
        xmind_path: "cases/cases.xmind",
        requirement_atoms: [],
        coverage_matrix_path: null,
      },
    };
    expect(validateV2(ok)).toBe(true);
  });

  it("accepts completed atoms carrying richer fields", () => {
    const ok = {
      ...baseV2,
      case_drafting: {
        status: "completed",
        archive_path: "cases/archive.md",
        coverage_matrix_path: null,
        requirement_atoms: [
          {
            id: "RA-001",
            source_ref: "SR-003",
            evidence_kind: "requirement_text",
            ambiguity_class: "none",
            confidence: "high",
            description: "x",
          },
        ],
      },
    };
    expect(validateV2(ok)).toBe(true);
  });

  it("rejects completed with null archive_path", () => {
    const bad = {
      ...baseV2,
      case_drafting: {
        status: "completed",
        archive_path: null,
        coverage_matrix_path: null,
        requirement_atoms: [],
      },
    };
    expect(validateV2(bad)).toBe(false);
  });
});
