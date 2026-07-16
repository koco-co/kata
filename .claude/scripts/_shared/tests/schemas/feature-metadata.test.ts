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
    const bad = {
      schema: "FeatureMetadata@1",
      id: "【数据质量】控制每个规则开关",
    };
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

describe("FeatureMetadata@2 automation intents", () => {
  it("accepts runner_files and an actionable failing status", () => {
    const ok = {
      ...baseV2,
      automation: {
        status: "ready",
        intents: [
          {
            intent_id: "SR-INTENT-EXAMPLE-001",
            case_files: ["automation/tests/cases/t01-example.ts"],
            runner_files: ["automation/tests/runners/full.spec.ts"],
            automation_status: "failing",
          },
        ],
      },
    };
    expect(validateV2(ok)).toBe(true);
  });
});

// ── FeatureMetadata@2: 富需求环境字段放开后的行为 ──
//   root.requirement_context 是自由 object，承接 feature 专属字段(如 starrocks_version)，
//   不污染全局 schema 表面；case_drafting.source_refs 同样放开为自由对象数组。
describe("FeatureMetadata@2 requirement_context & source_refs", () => {
  it("accepts a free-form requirement_context bag with feature-specific keys", () => {
    const ok = {
      ...baseV2,
      requirement_context: {
        customer_platform_version: "6.0",
        dev_branch: "6.0_浙商证券定制化分支",
        starrocks_version: "3.3.18",
        lanhu_page_id: "f2e6ada9fe694ad6b91b8874c0d0e97f",
        zentao_story_id: "16035",
        requirement_name: "【数据质量】支持starrocks 3.x数据源",
        xmind_root_version: "6.0_浙商证券",
      },
    };
    expect(validateV2(ok)).toBe(true);
  });

  it("accepts case_drafting.source_refs alongside requirement_atoms", () => {
    const ok = {
      ...baseV2,
      case_drafting: {
        status: "completed",
        archive_path: "cases/archive.md",
        coverage_matrix_path: null,
        source_refs: [
          {
            id: "SR-001",
            kind: "history_case",
            path: "workspace/dataAssets/features/.../cases/archive.md",
            note: "主参考模板",
          },
          {
            id: "SR-003",
            kind: "requirement_text",
            path: null,
            note: "需求描述",
          },
        ],
        requirement_atoms: [{ id: "RA-001", source_ref: "SR-003" }],
      },
    };
    expect(validateV2(ok)).toBe(true);
  });

  it("still rejects an unknown top-level property (schema stays closed)", () => {
    const bad = { ...baseV2, totally_unknown_root_field: "x" };
    expect(validateV2(bad)).toBe(false);
  });
});
