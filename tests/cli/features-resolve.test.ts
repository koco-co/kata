import { describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFeaturesList, runFeaturesResolve } from "../../cli/commands/features.ts";

function repo(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-fr-"));
  mkdirSync(join(root, "workspace", "dataAssets", "features"), { recursive: true });
  writeFileSync(join(root, "package.json"), "{}");
  return root;
}

const base = { project: "dataAssets", module: "数据质量", description: "测试需求" };

describe("features resolve", () => {
  it("requires exactly one of --feature-version and --standing", () => {
    const root = repo();
    expect(() => runFeaturesResolve({ ...base, root })).toThrow(/缺 --feature-version/);
    expect(() =>
      runFeaturesResolve({ ...base, root, featureVersion: "v6.4.11", standing: true }),
    ).toThrow(/互斥/);
  });

  it("creates a canonical active path without metadata.yaml", () => {
    const root = repo();
    const result = runFeaturesResolve({
      ...base,
      root,
      featureVersion: "v7.0.0",
      customer: "泸州老窖",
      requirementId: "15911",
    });
    expect(result.zone).toBe("active");
    expect(result.relative_path).toBe("v7.0.0/【15911】【泸州老窖】【数据质量】测试需求");
    expect(result.feature_key).toBe(`dataAssets:${result.relative_path}`);
    expect(existsSync(join(result.featureDir, "metadata.yaml"))).toBe(false);
  });

  it("keeps a path without a top-level requirement id when none is verified", () => {
    const root = repo();
    const result = runFeaturesResolve({ ...base, root, featureVersion: "v7.0.0" });
    expect(result.dirName).toBe("【数据质量】测试需求");
  });

  it("rejects a non-numeric top-level requirement id", () => {
    const root = repo();
    expect(() =>
      runFeaturesResolve({ ...base, root, featureVersion: "v7.0.0", requirementId: "page-15911" }),
    ).toThrow(/需求 ID/);
  });

  it("rejects path separators in feature identity fields", () => {
    const root = repo();
    expect(() =>
      runFeaturesResolve({ ...base, root, featureVersion: "v7.0.0", description: "需求/越界" }),
    ).toThrow(/路径分隔符/);
    expect(() =>
      runFeaturesResolve({ ...base, root, featureVersion: "v7.0.0", module: "数据\\质量" }),
    ).toThrow(/路径分隔符/);
  });

  it("creates a standing path without duplicating a standing tag", () => {
    const root = repo();
    const result = runFeaturesResolve({ ...base, root, standing: true });
    expect(result.relative_path).toBe("_standing/【数据质量】测试需求");
  });

  it("derives version and latest run status from the filesystem", () => {
    const root = repo();
    const created = runFeaturesResolve({ ...base, root, featureVersion: "v6.4.11" });
    const oldRun = join(created.featureDir, "runs", "20260729-1200-run-01");
    const latestRun = join(created.featureDir, "runs", "20260730-1200-run-01");
    mkdirSync(oldRun, { recursive: true });
    mkdirSync(latestRun, { recursive: true });
    writeFileSync(join(oldRun, "status.json"), JSON.stringify({ status: "command_passed" }));
    writeFileSync(join(latestRun, "status.json"), JSON.stringify({ status: "failed" }));

    const rows = runFeaturesList({
      project: "dataAssets",
      root,
      version: "v6.4.11",
      lastRun: "failed",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.version).toBe("v6.4.11");
    expect(rows[0]?.last_run_status).toBe("failed");
  });
});
