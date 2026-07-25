import { describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFeaturesResolve, runFeaturesResolveHotfix } from "../../cli/commands/features.ts";

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

describe("features resolve-hotfix", () => {
  const hotfix = { project: "dataAssets", bugId: "155381", yyyymm: "202607", title: "规则修复" };

  it("creates _hotfix/<yyyymm>-<bugId>-<title> with cases/, idempotent", () => {
    const root = repo();
    const r = runFeaturesResolveHotfix({ ...hotfix, root });
    expect(r.dirName).toBe("202607-155381-规则修复");
    expect(r.hotfixDir).toContain("_hotfix");
    expect(existsSync(join(r.hotfixDir, "cases"))).toBe(true);
    expect(r.created).toBe(true);
    expect(runFeaturesResolveHotfix({ ...hotfix, root }).created).toBe(false);
  });

  it("rejects invalid yyyymm", () => {
    const root = repo();
    expect(() => runFeaturesResolveHotfix({ ...hotfix, root, yyyymm: "2026-07" })).toThrow(
      /--yyyymm/,
    );
  });

  it("rejects titles with whitespace or 【】", () => {
    const root = repo();
    expect(() => runFeaturesResolveHotfix({ ...hotfix, root, title: "规则 修复" })).toThrow(
      /--title/,
    );
    expect(() => runFeaturesResolveHotfix({ ...hotfix, root, title: "【规则】修复" })).toThrow(
      /--title/,
    );
  });
});
