import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveAutomationFeature } from "../../cli/lib/automation-feature-resolver.ts";

function scaffold(requirementId = "12345"): { root: string; featureDir: string } {
  const root = mkdtempSync(join(tmpdir(), "kata-automation-feature-"));
  const featureDir = join(
    root,
    "workspace",
    "dataAssets",
    "features",
    "v6.4.11",
    "【v6411】【模块】测试需求",
  );
  mkdirSync(featureDir, { recursive: true });
  mkdirSync(join(featureDir, "cases"), { recursive: true });
  writeFileSync(join(root, "package.json"), "{}\n");
  writeFileSync(join(featureDir, "prd.md"), `---\nrequirement_id: ${requirementId}\n---\n`);
  writeFileSync(
    join(featureDir, "cases", "demo.yaml"),
    `meta:\n  title: demo\n  version: v6.4.11\n  feature_id: v6.4.11/demo\n  requirement_id: "${requirementId}"\n  case_module_id: ""\ncases:\n  - case_id: C0001\n    title: 验证示例\n    priority: P1\n    steps:\n      - action: 点击保存\n        expected: 保存成功\n`,
  );
  return { root, featureDir };
}

describe("automation feature resolver", () => {
  it("resolves a numeric requirement_id by scanning cases YAML", () => {
    const { root, featureDir } = scaffold();
    const result = resolveAutomationFeature("12345", "dataAssets", root);
    expect(result.dir).toBe(featureDir);
    expect(result.requirementId).toBe("12345");
  });

  it("rejects a cases YAML whose ID disagrees with prd.md", () => {
    const { root, featureDir } = scaffold("12345");
    writeFileSync(
      join(featureDir, "cases", "demo.yaml"),
      'meta:\n  title: demo\n  version: v6.4.11\n  feature_id: v6.4.11/demo\n  requirement_id: "99999"\n  case_module_id: ""\ncases:\n  - case_id: C0001\n    title: 验证示例\n    priority: P1\n    steps:\n      - action: 点击保存\n        expected: 保存成功\n',
    );
    expect(() => resolveAutomationFeature("99999", "dataAssets", root)).toThrow(/不一致/);
  });

  it("keeps direct feature directory selectors working", () => {
    const { root, featureDir } = scaffold();
    const result = resolveAutomationFeature(featureDir, "dataAssets", root);
    expect(result.dir).toBe(featureDir);
    expect(result.requirementId).toBeUndefined();
  });
});
