import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFeaturesLint } from "@shared/cli/features-lint.ts";
import { stringify } from "yaml";

describe("kata features lint", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "kata-feat-lint-"));
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  function seedOk() {
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

  it("passes for valid feature", async () => {
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
});
