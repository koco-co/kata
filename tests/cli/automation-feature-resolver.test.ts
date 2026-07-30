import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveAutomationFeature } from "../../cli/lib/automation/automation-feature-resolver.ts";

function scaffold(): { root: string; featureDir: string; featurePath: string } {
  const root = mkdtempSync(join(tmpdir(), "kata-automation-feature-"));
  const featurePath = "v6.4.11/【模块】测试需求";
  const featureDir = join(root, "workspace", "dataAssets", "features", featurePath);
  mkdirSync(join(featureDir, "cases"), { recursive: true });
  writeFileSync(join(root, "package.json"), "{}\n");
  return { root, featureDir, featurePath };
}

describe("automation feature resolver", () => {
  it("resolves the complete path below features/", () => {
    const { root, featureDir, featurePath } = scaffold();
    const result = resolveAutomationFeature(featurePath, "dataAssets", root);
    expect(result.dir).toBe(featureDir);
    expect(result.relativePath).toBe(featurePath);
  });

  it("keeps direct feature directory selectors working", () => {
    const { root, featureDir, featurePath } = scaffold();
    const result = resolveAutomationFeature(featureDir, "dataAssets", root);
    expect(result.dir).toBe(featureDir);
    expect(result.relativePath).toBe(featurePath);
  });

  it("rejects numeric requirement IDs and bare directory names", () => {
    const { root } = scaffold();
    expect(() => resolveAutomationFeature("12345", "dataAssets", root)).toThrow(/完整路径/);
    expect(() => resolveAutomationFeature("【模块】测试需求", "dataAssets", root)).toThrow(
      /完整路径/,
    );
  });
});
