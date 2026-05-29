import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { runFeaturesNew } from "../../src/cli/features-new.ts";
import { loadFeatureMetadataValidator } from "@shared/schemas/loaders.ts";

describe("kata features new", () => {
  let scratch: string;

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "kata-feat-new-"));
    mkdirSync(join(scratch, "workspace/dataAssets/_shared/_meta"), { recursive: true });
    writeFileSync(
      join(scratch, "workspace/dataAssets/_shared/_meta/modules.yaml"),
      stringify({ enum: ["dq"] }),
    );
    writeFileSync(
      join(scratch, "workspace/dataAssets/_shared/_meta/customers.yaml"),
      stringify({ enum: ["standard"] }),
    );
    writeFileSync(
      join(scratch, "workspace/dataAssets/_shared/_meta/versions.yaml"),
      stringify({ enum: ["v6.4"] }),
    );
  });
  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  it("creates feature dir with metadata.yaml and manifest.json", async () => {
    await runFeaturesNew({
      project: "dataAssets",
      slug: "dq-test",
      displayName: "测试",
      modules: ["dq"],
      customers: ["standard"],
      versions: [],
      owners: ["koco"],
      inputs: ["prd"],
      workspaceRoot: join(scratch, "workspace"),
      now: new Date("2026-05-14T10:00:00Z"),
    });
    const featureDir = join(scratch, "workspace/dataAssets/features/2026-05-dq-test");
    expect(existsSync(featureDir)).toBe(true);
    const meta = parse(readFileSync(join(featureDir, "metadata.yaml"), "utf-8"));
    expect(meta.id).toBe("2026-05-dq-test");
    expect(meta.modules).toEqual(["dq"]);
    expect(loadFeatureMetadataValidator()(meta)).toBe(true);
    const manifest = JSON.parse(readFileSync(join(featureDir, "manifest.json"), "utf-8"));
    expect(manifest.schema).toBe("FeatureManifest@2");
    expect(manifest.feature_id).toBe("2026-05-dq-test");
    expect(existsSync(join(featureDir, "inputs/prd-attachments/.gitkeep"))).toBe(true);
    expect(existsSync(join(scratch, "workspace/dataAssets/features/INDEX.md"))).toBe(true);
  });

  it("refuses to overwrite existing feature", async () => {
    const ctx = {
      project: "dataAssets",
      slug: "dq-test",
      displayName: "x",
      modules: ["dq"],
      customers: ["standard"],
      versions: [],
      owners: ["koco"],
      inputs: ["prd"] as ("prd" | "lanhu" | "axure" | "manual" | "bug-hotfix")[],
      workspaceRoot: join(scratch, "workspace"),
      now: new Date("2026-05-14T10:00:00Z"),
    };
    await runFeaturesNew(ctx);
    await expect(runFeaturesNew(ctx)).rejects.toThrow(/already exists/i);
  });

  it("rejects invalid slug", async () => {
    await expect(
      runFeaturesNew({
        project: "dataAssets",
        slug: "BAD UPPER",
        displayName: "x",
        modules: ["dq"],
        customers: ["standard"],
        versions: [],
        owners: ["koco"],
        inputs: ["prd"],
        workspaceRoot: join(scratch, "workspace"),
        now: new Date("2026-05-14T10:00:00Z"),
      }),
    ).rejects.toThrow(/invalid slug/i);
  });

  it("rejects metadata enum values not declared in _shared/_meta", async () => {
    await expect(
      runFeaturesNew({
        project: "dataAssets",
        slug: "bad-module",
        displayName: "x",
        modules: ["unknown"],
        customers: ["standard"],
        versions: [],
        owners: ["koco"],
        inputs: ["prd"],
        workspaceRoot: join(scratch, "workspace"),
        now: new Date("2026-05-14T10:00:00Z"),
      }),
    ).rejects.toThrow(/module/i);
  });
});
