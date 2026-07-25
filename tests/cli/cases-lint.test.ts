import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFeaturesLint } from "../../cli/lib/features-lint.ts";

function ws(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-fl-"));
  mkdirSync(join(root, "dataAssets", "features"), { recursive: true });
  return root;
}

function mkfeature(root: string, ...segments: string[]) {
  mkdirSync(join(root, "dataAssets", "features", ...segments), { recursive: true });
}

describe("features lint", () => {
  it("accepts hotfix dirs without metadata.yaml", () => {
    const root = ws();
    mkfeature(root, "_hotfix", "202604-123456-规则新增回显", "cases");
    const { violations } = runFeaturesLint({ project: "dataAssets", workspaceRoot: root });
    expect(violations).toHaveLength(0);
  });

  it("flags hotfix dirs not starting with yyyymm-", () => {
    const root = ws();
    mkfeature(root, "_hotfix", "随便起的名字", "cases");
    const { violations } = runFeaturesLint({ project: "dataAssets", workspaceRoot: root });
    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe("dir_name_invalid");
  });

  it("flags active feature dirs missing metadata.yaml", () => {
    const root = ws();
    mkfeature(root, "v7.0.0", "【v700】【客户】【模块】需求", "cases");
    const { violations } = runFeaturesLint({ project: "dataAssets", workspaceRoot: root });
    expect(violations.some((v) => v.rule === "metadata_missing")).toBe(true);
  });

  it("accepts active feature dirs with valid metadata", () => {
    const root = ws();
    const dir = join("v7.0.0", "【v700】【客户】【模块】需求");
    mkfeature(root, dir, "cases");
    writeFileSync(
      join(root, "dataAssets", "features", dir, "metadata.yaml"),
      "id: 202607-01-demo\n",
    );
    const { violations } = runFeaturesLint({ project: "dataAssets", workspaceRoot: root });
    expect(violations).toHaveLength(0);
  });
});
