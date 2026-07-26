import { describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFeaturesResolve } from "../../cli/commands/features.ts";

function repo(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-fr-"));
  mkdirSync(join(root, "workspace", "dataAssets", "features"), { recursive: true });
  writeFileSync(join(root, "package.json"), "{}");
  return root;
}

const base = { project: "dataAssets", module: "数据质量", description: "测试需求" };

describe("features resolve", () => {
  it("throws when neither --feature-version nor --standing is given", () => {
    const root = repo();
    expect(() => runFeaturesResolve({ ...base, root })).toThrow(/缺 --feature-version/);
  });

  it("throws when --feature-version and --standing are both given", () => {
    const root = repo();
    expect(() =>
      runFeaturesResolve({ ...base, root, featureVersion: "v6.4.11", standing: true }),
    ).toThrow(/互斥/);
  });

  it("resolves an active feature dir with --feature-version", () => {
    const root = repo();
    const r = runFeaturesResolve({ ...base, root, featureVersion: "v6.4.11" });
    expect(r.zone).toBe("active");
    expect(r.featureDir).toContain("v6.4.11");
    expect(r.created).toBe(true);
    expect(existsSync(join(r.featureDir, "metadata.yaml"))).toBe(true);
  });

  it("resolves a standing feature dir with --standing", () => {
    const root = repo();
    const r = runFeaturesResolve({ ...base, root, standing: true });
    expect(r.zone).toBe("standing");
    expect(r.featureDir).toContain("_standing");
    expect(r.dirName).toMatch(/^【standing】/);
  });
});
