import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFeaturesNew } from "@shared/cli/features-new.ts";
import { loadFeatureMetadataV2Validator } from "@shared/schemas/loaders.ts";
import { parse, stringify } from "yaml";

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

  it("creates feature dir with FeatureMetadata@2 in _standing (no versions specified)", async () => {
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
    // 无版本 → 落 _standing/
    const featureDir = join(scratch, "workspace/dataAssets/features/_standing/2026-05-dq-test");
    expect(existsSync(featureDir)).toBe(true);
    const meta = parse(readFileSync(join(featureDir, "metadata.yaml"), "utf-8"));
    expect(meta.id).toBe("2026-05-dq-test");
    expect(meta.schema).toBe("FeatureMetadata@2");
    expect(meta.modules).toEqual(["dq"]);
    expect(loadFeatureMetadataV2Validator()(meta)).toBe(true);
    // @2 不产 manifest.json
    expect(existsSync(join(featureDir, "manifest.json"))).toBe(false);
    // 三个区目录
    expect(existsSync(join(featureDir, "cases"))).toBe(true);
    expect(existsSync(join(featureDir, "automation"))).toBe(true);
    expect(existsSync(join(featureDir, "runs"))).toBe(true);
    // inputs 目录
    expect(existsSync(join(featureDir, "inputs/prd-attachments/.gitkeep"))).toBe(true);
    // INDEX.md 生成
    expect(existsSync(join(scratch, "workspace/dataAssets/features/INDEX.md"))).toBe(true);
  });

  it("creates feature dir under version layer when versions specified", async () => {
    await runFeaturesNew({
      project: "dataAssets",
      slug: "dq-test-v2",
      displayName: "测试V2",
      modules: ["dq"],
      customers: ["standard"],
      versions: ["v6.4"],
      owners: ["koco"],
      inputs: ["prd"],
      workspaceRoot: join(scratch, "workspace"),
      now: new Date("2026-05-14T10:00:00Z"),
    });
    // versions[0] = "v6.4" → 版本目录
    const featureDir = join(scratch, "workspace/dataAssets/features/v6.4/2026-05-dq-test-v2");
    expect(existsSync(featureDir)).toBe(true);
    const meta = parse(readFileSync(join(featureDir, "metadata.yaml"), "utf-8"));
    expect(meta.schema).toBe("FeatureMetadata@2");
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
