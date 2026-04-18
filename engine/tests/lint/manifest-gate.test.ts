import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stringify } from "yaml";
import { runFeaturesLint } from "../../src/cli/features-lint.ts";

describe("gate: manifest_present_and_valid", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "gate-manifest-"));
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("reports manifest_missing", async () => {
    const dir = join(scratch, "dataAssets/features/2026-04-x");
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
        modules: [],
        customers: [],
        versions: [],
        owners: [],
        inputs: [],
        relates_to: [],
        emits: {
          cases_xmind: true,
          archive: true,
          playwright_tests: true,
        },
      }),
    );
    const r = await runFeaturesLint({
      project: "dataAssets",
      workspaceRoot: scratch,
    });
    expect(r.violations.some((v) => v.rule === "manifest_missing")).toBe(true);
  });

  it("reports manifest_schema_invalid", async () => {
    const dir = join(scratch, "dataAssets/features/2026-04-x");
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
        modules: [],
        customers: [],
        versions: [],
        owners: [],
        inputs: [],
        relates_to: [],
        emits: {
          cases_xmind: true,
          archive: true,
          playwright_tests: true,
        },
      }),
    );
    writeFileSync(
      join(dir, "manifest.json"),
      JSON.stringify({
        schema: "FeatureManifest@2",
        feature_id: "2026-04-x",
      }),
    );
    const r = await runFeaturesLint({
      project: "dataAssets",
      workspaceRoot: scratch,
    });
    expect(r.violations.some((v) => v.rule === "manifest_schema_invalid")).toBe(true);
  });
});
