import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFeaturesLint, type Violation } from "@shared/cli/features-lint.ts";
import { stringify } from "yaml";

describe("kata features lint", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "kata-feat-lint-"));
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  // ── @1 fixtures（legacy-flat，保留原有行为）────────────────────────────────

  function seedOk() {
    // legacy-flat 布局：直接放在 features/ 下
    const dir = join(scratch, "dataAssets/features/2026-04-x");
    mkdirSync(join(scratch, "dataAssets/_shared/_meta"), { recursive: true });
    writeFileSync(
      join(scratch, "dataAssets/_shared/_meta/modules.yaml"),
      stringify({ enum: ["dq"] }),
    );
    writeFileSync(
      join(scratch, "dataAssets/_shared/_meta/customers.yaml"),
      stringify({ enum: ["standard"] }),
    );
    writeFileSync(
      join(scratch, "dataAssets/_shared/_meta/versions.yaml"),
      stringify({ enum: ["v6.4"] }),
    );
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "metadata.yaml"),
      stringify({
        schema: "FeatureMetadata@1",
        id: "2026-04-x",
        display_name: "X",
        status: "active",
        created_at: "2026-04-01",
        updated_at: "2026-04-01",
        modules: ["dq"],
        customers: ["standard"],
        versions: ["v6.4"],
        owners: ["koco"],
        inputs: [],
        relates_to: [],
        emits: { cases_xmind: true, archive: true, playwright_tests: true },
      }),
    );
    writeFileSync(
      join(dir, "manifest.json"),
      JSON.stringify({
        schema: "FeatureManifest@2",
        feature_id: "2026-04-x",
        case_drafting: { status: "not-started" },
        automation: { status: "not-started", intents: [], last_run_status: "not-run" },
        files: {},
      }),
    );
  }

  it("passes for valid @1 feature (legacy-flat)", async () => {
    seedOk();
    const r = await runFeaturesLint({ project: "dataAssets", workspaceRoot: scratch });
    expect(r.violations).toHaveLength(0);
  });

  it("reports missing metadata.yaml", async () => {
    mkdirSync(join(scratch, "dataAssets/features/2026-04-missing"), { recursive: true });
    const r = await runFeaturesLint({ project: "dataAssets", workspaceRoot: scratch });
    expect(r.violations.some((v: any) => v.rule === "metadata_missing")).toBe(true);
  });

  it("reports module not in enum", async () => {
    seedOk();
    const meta = join(scratch, "dataAssets/features/2026-04-x/metadata.yaml");
    writeFileSync(
      meta,
      stringify({
        schema: "FeatureMetadata@1",
        id: "2026-04-x",
        display_name: "X",
        status: "active",
        created_at: "2026-04-01",
        updated_at: "2026-04-01",
        modules: ["nope"],
        customers: ["standard"],
        versions: ["v6.4"],
        owners: ["koco"],
        inputs: [],
        relates_to: [],
        emits: { cases_xmind: true, archive: true, playwright_tests: true },
      }),
    );
    const r = await runFeaturesLint({ project: "dataAssets", workspaceRoot: scratch });
    expect(r.violations.some((v: any) => v.rule === "module_not_in_enum")).toBe(true);
  });

  it("reports id mismatch with dir name", async () => {
    seedOk();
    const meta = join(scratch, "dataAssets/features/2026-04-x/metadata.yaml");
    writeFileSync(
      meta,
      stringify({
        schema: "FeatureMetadata@1",
        id: "2026-04-WRONG",
        display_name: "X",
        status: "active",
        created_at: "2026-04-01",
        updated_at: "2026-04-01",
        modules: ["dq"],
        customers: ["standard"],
        versions: ["v6.4"],
        owners: ["koco"],
        inputs: [],
        relates_to: [],
        emits: { cases_xmind: true, archive: true, playwright_tests: true },
      }),
    );
    const r = await runFeaturesLint({ project: "dataAssets", workspaceRoot: scratch });
    expect(r.violations.some((v: any) => v.rule === "id_dir_mismatch")).toBe(true);
  });

  // ── 方案A: CJK 目录名是人类标签, slug feature_id 才是机器主键 ──

  function seedCjk(opts: { dirName: string; metaId: string; featureId: string; module?: string }) {
    const dir = join(scratch, "dataAssets/features", opts.dirName);
    mkdirSync(join(scratch, "dataAssets/_shared/_meta"), { recursive: true });
    writeFileSync(
      join(scratch, "dataAssets/_shared/_meta/modules.yaml"),
      stringify({ enum: ["dq"] }),
    );
    writeFileSync(
      join(scratch, "dataAssets/_shared/_meta/customers.yaml"),
      stringify({ enum: ["standard"] }),
    );
    writeFileSync(
      join(scratch, "dataAssets/_shared/_meta/versions.yaml"),
      stringify({ enum: ["v6.4"] }),
    );
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "metadata.yaml"),
      stringify({
        schema: "FeatureMetadata@1",
        id: opts.metaId,
        display_name: "X",
        status: "active",
        created_at: "2026-04-01",
        updated_at: "2026-04-01",
        modules: [opts.module ?? "dq"],
        customers: ["standard"],
        versions: ["v6.4"],
        owners: ["koco"],
        inputs: [],
        relates_to: [],
        emits: { cases_xmind: true, archive: true, playwright_tests: true },
      }),
    );
    writeFileSync(
      join(dir, "manifest.json"),
      JSON.stringify({
        schema: "FeatureManifest@2",
        feature_id: opts.featureId,
        case_drafting: { status: "not-started" },
        automation: { status: "not-started", intents: [], last_run_status: "not-run" },
        files: {},
      }),
    );
  }

  it("accepts a CJK dir name as a valid human label (no dir_name_invalid)", async () => {
    seedCjk({
      dirName: "【v647】【数据质量】控制每个规则开关",
      metaId: "【v647】【数据质量】控制每个规则开关",
      featureId: "2026-04-dq-per-rule-toggle",
    });
    const r = await runFeaturesLint({ project: "dataAssets", workspaceRoot: scratch });
    expect(r.violations.some((v: any) => v.rule === "dir_name_invalid")).toBe(false);
  });

  it("does not flag id_dir_mismatch for a CJK dir whose metadata.id differs from the dir name", async () => {
    seedCjk({
      dirName: "【v6410】【岚图汽车】【数据质量】完整性JSONKey范围校验",
      metaId: "【v647】【通用配置】完整性JSONKey范围校验",
      featureId: "2026-04-dq-builtin-completeness-json-key-range",
    });
    const r = await runFeaturesLint({ project: "dataAssets", workspaceRoot: scratch });
    expect(r.violations.some((v: any) => v.rule === "id_dir_mismatch")).toBe(false);
  });

  it("does not flag manifest_id_mismatch for a CJK dir whose slug feature_id differs from the dir name", async () => {
    seedCjk({
      dirName: "【v647】【数据质量】控制每个规则开关",
      metaId: "【v647】【数据质量】控制每个规则开关",
      featureId: "2026-04-dq-per-rule-toggle",
    });
    const r = await runFeaturesLint({ project: "dataAssets", workspaceRoot: scratch });
    expect(r.violations.some((v: any) => v.rule === "manifest_id_mismatch")).toBe(false);
  });

  it("still validates schema/enum content for CJK dirs (module not in enum is reported)", async () => {
    seedCjk({
      dirName: "【v647】【数据质量】控制每个规则开关",
      metaId: "【v647】【数据质量】控制每个规则开关",
      featureId: "2026-04-dq-per-rule-toggle",
      module: "nope",
    });
    const r = await runFeaturesLint({ project: "dataAssets", workspaceRoot: scratch });
    expect(r.violations.some((v: any) => v.rule === "module_not_in_enum")).toBe(true);
  });

  it("a clean CJK feature yields zero violations", async () => {
    seedCjk({
      dirName: "【v647】【数据质量】控制每个规则开关",
      metaId: "【v647】【数据质量】控制每个规则开关",
      featureId: "2026-04-dq-per-rule-toggle",
    });
    const r = await runFeaturesLint({ project: "dataAssets", workspaceRoot: scratch });
    expect(r.violations).toHaveLength(0);
  });

  it("still flags a non-slug non-CJK garbage dir name as dir_name_invalid", async () => {
    mkdirSync(join(scratch, "dataAssets/features/Not_A_Valid_Name"), { recursive: true });
    const r = await runFeaturesLint({ project: "dataAssets", workspaceRoot: scratch });
    expect(r.violations.some((v: any) => v.rule === "dir_name_invalid")).toBe(true);
  });

  // ── @2 fixture（版本层目录，新规则）────────────────────────────────────────

  function seedV2(opts: {
    group: string;
    dirName: string;
    id?: string;
    module?: string;
    withManifest?: boolean;
  }) {
    const dir = join(scratch, "dataAssets/features", opts.group, opts.dirName);
    mkdirSync(join(scratch, "dataAssets/_shared/_meta"), { recursive: true });
    writeFileSync(
      join(scratch, "dataAssets/_shared/_meta/modules.yaml"),
      stringify({ enum: ["dq"] }),
    );
    writeFileSync(
      join(scratch, "dataAssets/_shared/_meta/customers.yaml"),
      stringify({ enum: ["standard"] }),
    );
    writeFileSync(
      join(scratch, "dataAssets/_shared/_meta/versions.yaml"),
      stringify({ enum: ["v6.4.10"] }),
    );
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "metadata.yaml"),
      stringify({
        schema: "FeatureMetadata@2",
        id: opts.id ?? opts.dirName,
        display_name: "X",
        status: "active",
        created_at: "2026-04-01",
        updated_at: "2026-04-01",
        modules: [opts.module ?? "dq"],
        customers: ["standard"],
        versions: ["v6.4.10"],
        owners: ["koco"],
        inputs: [],
        relates_to: [],
        emits: { cases_xmind: true, archive: true, playwright_tests: true },
        case_drafting: { status: "not-started" },
        automation: { status: "not-started", intents: [], last_run_status: "not-run" },
        files: {},
      }),
    );
    if (opts.withManifest) {
      writeFileSync(
        join(dir, "manifest.json"),
        JSON.stringify({
          schema: "FeatureManifest@2",
          feature_id: opts.dirName,
          case_drafting: { status: "not-started" },
          automation: { status: "not-started", intents: [], last_run_status: "not-run" },
          files: {},
        }),
      );
    }
  }

  it("passes for a clean FeatureMetadata@2 feature (no manifest.json needed)", async () => {
    seedV2({ group: "v6.4.10", dirName: "2026-04-dq-v2" });
    const r = await runFeaturesLint({ project: "dataAssets", workspaceRoot: scratch });
    expect(r.violations).toHaveLength(0);
  });

  it("reports manifest_residual when @2 feature still has manifest.json", async () => {
    seedV2({ group: "v6.4.10", dirName: "2026-04-dq-v2", withManifest: true });
    const r = await runFeaturesLint({ project: "dataAssets", workspaceRoot: scratch });
    expect(r.violations.some((v: Violation) => v.rule === "manifest_residual")).toBe(true);
  });

  it("does not require manifest.json for @2 feature (no manifest_missing violation)", async () => {
    seedV2({ group: "v6.4.10", dirName: "2026-04-dq-v2" });
    const r = await runFeaturesLint({ project: "dataAssets", workspaceRoot: scratch });
    expect(r.violations.some((v: Violation) => v.rule === "manifest_missing")).toBe(false);
  });

  it("validates enum on @2 feature (module not in enum is reported)", async () => {
    seedV2({ group: "v6.4.10", dirName: "2026-04-dq-v2-bad", module: "nope" });
    const r = await runFeaturesLint({ project: "dataAssets", workspaceRoot: scratch });
    expect(r.violations.some((v: Violation) => v.rule === "module_not_in_enum")).toBe(true);
  });
});
