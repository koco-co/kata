import { afterEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  mergeManifestIntoMetadata,
  readFeatureMeta,
  rewriteLegacyPath,
} from "@shared/lib/features/feature-meta.ts";
import { loadFeatureMetadataV2Validator } from "@shared/schemas/loaders.ts";
import { parse, stringify } from "yaml";

// ─── temp 目录惯例，与 layout.test.ts 一致 ───
let tempRoots: string[] = [];

function makeTempDir(): string {
  const d = mkdtempSync(join(tmpdir(), "kata-featmeta-"));
  tempRoots.push(d);
  return d;
}

afterEach(() => {
  for (const d of tempRoots) rmSync(d, { recursive: true, force: true });
  tempRoots = [];
});

// ─── seed helpers ───

function seedLegacyFeature(dir: string): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "metadata.yaml"),
    stringify({
      schema: "FeatureMetadata@1",
      id: "2026-04-dq-json-config",
      display_name: "JSON格式配置",
      status: "active",
      created_at: "2026-04-01",
      updated_at: "2026-04-01",
      modules: ["dq"],
      customers: [],
      versions: ["v6.4.10"],
      owners: [],
      inputs: [],
      relates_to: [],
      emits: { cases_xmind: true, archive: true, playwright_tests: true },
    }),
    "utf-8",
  );
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify({
      schema: "FeatureManifest@2",
      feature_id: "2026-04-dq-json-config",
      case_drafting: { status: "done", archive_path: "archive.md", xmind_path: "cases.xmind" },
      automation: { status: "ready", intents: [], last_run_status: "passed" },
      files: { archive: "archive.md", tests_root: "tests", latest_results: "results/run-1" },
    }),
    "utf-8",
  );
}

/** v2 合法 seed —— case_drafting/automation enum 用 manifest schema 合法值 */
function seedLegacyFeatureValid(dir: string): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "metadata.yaml"),
    stringify({
      schema: "FeatureMetadata@1",
      id: "2026-04-dq-json-config",
      display_name: "JSON格式配置",
      status: "active",
      created_at: "2026-04-01",
      updated_at: "2026-04-01",
      modules: ["dq"],
      customers: [],
      versions: ["v6.4.10"],
      owners: [],
      inputs: [],
      relates_to: [],
      emits: { cases_xmind: true, archive: true, playwright_tests: true },
    }),
    "utf-8",
  );
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify({
      schema: "FeatureManifest@2",
      feature_id: "2026-04-dq-json-config",
      case_drafting: {
        status: "completed",
        archive_path: "archive.md",
        xmind_path: "cases.xmind",
        requirement_atoms: [
          {
            id: "A-01",
            source_ref: "prd:1",
            ambiguity_class: "clear",
            confidence: "high",
          },
        ],
        coverage_matrix_path: "coverage.json",
      },
      automation: { status: "ready", intents: [], last_run_status: "passing" },
      files: { archive: "archive.md", tests_root: "tests", latest_results: "results/run-1" },
    }),
    "utf-8",
  );
}

// ─── tests ───

describe("mergeManifestIntoMetadata", () => {
  it("merges manifest sections into metadata.yaml@2 with path rewrite, removes manifest.json", () => {
    const dir = join(makeTempDir(), "feat");
    seedLegacyFeature(dir);
    const r = mergeManifestIntoMetadata(dir);
    expect(r.merged).toBe(true);
    expect(existsSync(join(dir, "manifest.json"))).toBe(false);
    const meta = parse(readFileSync(join(dir, "metadata.yaml"), "utf-8"));
    expect(meta.schema).toBe("FeatureMetadata@2");
    expect(meta.feature_id).toBe("2026-04-dq-json-config");
    expect(meta.case_drafting.archive_path).toBe("cases/archive.md");
    expect(meta.automation.last_run_status).toBe("passed");
    expect(meta.files.tests_root).toBe("automation/tests");
    expect(meta.files.latest_results).toBe("runs/run-1");
  });

  it("is idempotent: second merge is a no-op", () => {
    const dir = join(makeTempDir(), "feat");
    seedLegacyFeature(dir);
    mergeManifestIntoMetadata(dir);
    expect(mergeManifestIntoMetadata(dir).merged).toBe(false);
  });
});

describe("readFeatureMeta", () => {
  it("reads @2 directly and returns null when metadata.yaml missing", () => {
    const dir = join(makeTempDir(), "feat");
    seedLegacyFeature(dir);
    mergeManifestIntoMetadata(dir);
    const meta = readFeatureMeta(dir);
    expect(meta?.automation?.status).toBe("ready");
    expect(readFeatureMeta(join(dir, "nope"))).toBeNull();
  });
});

describe("FeatureMetadata@2 schema validation", () => {
  it("merge product passes v2 schema validator", () => {
    const dir = join(makeTempDir(), "feat");
    seedLegacyFeatureValid(dir);
    mergeManifestIntoMetadata(dir);
    const meta = parse(readFileSync(join(dir, "metadata.yaml"), "utf-8"));
    const validate = loadFeatureMetadataV2Validator();
    const ok = validate(meta);
    if (!ok) console.error("v2 schema errors:", validate.errors);
    expect(ok).toBe(true);
  });
});

describe("rewriteLegacyPath", () => {
  const cases: [string, string][] = [
    // results/ → runs/
    ["results", "runs"],
    ["results/run-1", "runs/run-1"],
    // tests/ → automation/tests/
    ["tests", "automation/tests"],
    ["tests/a.spec.ts", "automation/tests/a.spec.ts"],
    // scripts/ → automation/scripts/
    ["scripts/x.ts", "automation/scripts/x.ts"],
    // 用例产物文件 → cases/
    ["archive.md", "cases/archive.md"],
    ["archive.draft.md", "cases/archive.draft.md"],
    ["cases.xmind", "cases/cases.xmind"],
    // AUTOMATION-PLAN.md → automation/
    ["AUTOMATION-PLAN.md", "automation/AUTOMATION-PLAN.md"],
    // 不误伤
    ["testsuite/foo", "testsuite/foo"],
    ["my-archive.md", "my-archive.md"],
    ["results-old/x", "results-old/x"],
    // 幂等
    ["runs/run-1", "runs/run-1"],
    ["automation/tests", "automation/tests"],
    ["cases/archive.md", "cases/archive.md"],
    // 绝对路径原样
    ["/abs/path.md", "/abs/path.md"],
  ];

  it.each(cases)("rewriteLegacyPath(%j) → %j", (input, expected) => {
    expect(rewriteLegacyPath(input)).toBe(expected);
  });
});

describe("mergeManifestIntoMetadata – corrupt metadata guard", () => {
  it("throws on empty metadata.yaml and leaves manifest.json intact", () => {
    const dir = join(makeTempDir(), "feat");
    mkdirSync(dir, { recursive: true });
    // 空文件，parse 结果为 null
    writeFileSync(join(dir, "metadata.yaml"), "", "utf-8");
    writeFileSync(
      join(dir, "manifest.json"),
      JSON.stringify({ schema: "FeatureManifest@2" }),
      "utf-8",
    );
    expect(() => mergeManifestIntoMetadata(dir)).toThrow("invalid metadata.yaml");
    // manifest.json 应未被删除
    expect(existsSync(join(dir, "manifest.json"))).toBe(true);
  });

  it("throws when metadata.yaml has unexpected schema (e.g. @3)", () => {
    const dir = join(makeTempDir(), "feat");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "metadata.yaml"),
      stringify({ schema: "FeatureMetadata@3", id: "x" }),
      "utf-8",
    );
    writeFileSync(
      join(dir, "manifest.json"),
      JSON.stringify({ schema: "FeatureManifest@2" }),
      "utf-8",
    );
    expect(() => mergeManifestIntoMetadata(dir)).toThrow(
      "unexpected metadata schema: FeatureMetadata@3",
    );
  });
});
