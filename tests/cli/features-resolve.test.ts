import { describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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

function currentYyyyMm(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

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

  it("uses the requirement id in the label and never uses the Lanhu pageId", () => {
    const root = repo();
    const r = runFeaturesResolve({
      ...base,
      root,
      featureVersion: "v7.0.0",
      requirementId: "15911",
      lanhuPage: "7ef1d18e9bb04ca495903a55bc84a088",
    });
    expect(r.dirName).toContain("【15911】");
    expect(r.dirName).not.toContain("7ef1d18e9bb04ca495903a55bc84a088");
  });

  it("rejects a Lanhu pageId without an explicit requirement id", () => {
    const root = repo();
    expect(() =>
      runFeaturesResolve({
        ...base,
        root,
        featureVersion: "v7.0.0",
        lanhuPage: "7ef1d18e9bb04ca495903a55bc84a088",
      }),
    ).toThrow(/--requirement-id/);
  });

  it("rejects a non-numeric requirement id", () => {
    const root = repo();
    expect(() =>
      runFeaturesResolve({ ...base, root, featureVersion: "v7.0.0", requirementId: "page-15911" }),
    ).toThrow(/需求 ID/);
  });

  it("resolves a standing feature dir with --standing", () => {
    const root = repo();
    const r = runFeaturesResolve({ ...base, root, standing: true });
    expect(r.zone).toBe("standing");
    expect(r.featureDir).toContain("_standing");
    expect(r.dirName).toMatch(/^【standing】/);
  });

  it("dedupes the generated metadata id with -2/-3 suffixes", () => {
    const root = repo();
    const baseId = `${currentYyyyMm()}-ce-shi-xu-qiu`;
    // 另一个版本组里已存在同月同 slug 的需求(以及它的 -2)
    for (const [version, id] of [
      ["v6.4.10", baseId],
      ["v6.4.9", `${baseId}-2`],
    ] as const) {
      const dir = join(
        root,
        "workspace",
        "dataAssets",
        "features",
        version,
        "【v6410】【模块】测试需求",
      );
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "metadata.yaml"), `id: ${id}\n`);
    }
    const r = runFeaturesResolve({ ...base, root, featureVersion: "v6.4.11" });
    expect(r.featureId).toBe(`${baseId}-3`);
    expect(readMetaId(r.featureDir)).toBe(`${baseId}-3`);
  });

  it("lists features while skipping corrupt metadata.yaml instead of crashing", () => {
    const root = repo();
    const created = runFeaturesResolve({ ...base, root, featureVersion: "v6.4.11" });
    const bad = join(
      root,
      "workspace",
      "dataAssets",
      "features",
      "v6.4.10",
      "【v6410】【模块】坏目录",
    );
    mkdirSync(bad, { recursive: true });
    writeFileSync(join(bad, "metadata.yaml"), "id: [unclosed\n");

    const rows = runFeaturesList({ project: "dataAssets", root });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(created.featureId);
  });
});

function readMetaId(featureDir: string): string {
  const text = readFileSync(join(featureDir, "metadata.yaml"), "utf8");
  return /id:\s*(\S+)/.exec(text)?.[1] ?? "";
}
