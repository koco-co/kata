import { describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateAutomationScripts } from "../../cli/lib/automation-case-generator.ts";

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-automation-generator-"));
  const feature = join(root, "workspace", "dataAssets", "features", "v7.0.0", "demo");
  mkdirSync(join(feature, "cases"), { recursive: true });
  mkdirSync(join(feature, "automation", "tests", "cases"), { recursive: true });
  mkdirSync(join(feature, "automation", "tests", "runners"), { recursive: true });
  writeFileSync(
    join(feature, "cases", "demo.yaml"),
    `meta:\n  title: demo\n  version: v7.0.0\n  feature_id: demo\ncases:\n  - case_id: C0001\n    title: 验证已存在脚本\n    priority: P1\n    steps:\n      - action: 点击【保存】按钮\n        expected: 保存成功\n    automation:\n      spec_file: c0001-验证已存在脚本.ts\n  - case_id: C0002\n    title: 验证缺失脚本\n    priority: P1\n    steps:\n      - action: 点击【提交】按钮\n        expected: 提交成功\n    automation:\n      spec_file: c0002-验证缺失脚本.ts\n`,
  );
  writeFileSync(
    join(feature, "automation", "tests", "cases", "c0001-验证已存在脚本.ts"),
    "export {};\n",
  );
  writeFileSync(
    join(feature, "automation", "tests", "runners", "full.spec.ts"),
    'import "../cases/c0001-existing";\n',
  );
  return feature;
}

describe("automation case generator", () => {
  it("creates a mapped-not-implemented script without treating it as implemented", () => {
    const feature = fixture();
    const result = generateAutomationScripts(feature, { apply: true });
    expect(result.created).toHaveLength(1);
    expect(result.orphanScripts).toEqual([]);

    const generated = join(feature, "automation", "tests", "cases", "c0002-验证缺失脚本.ts");
    expect(existsSync(generated)).toBe(true);
    expect(readFileSync(generated, "utf8")).toContain("runGeneratedCase");
    expect(
      readFileSync(join(feature, "automation", "tests", "runners", "generated.ts"), "utf8"),
    ).not.toContain("c0002-验证缺失脚本.ts");
    expect(
      readFileSync(join(feature, "automation", "tests", "runners", "full.spec.ts"), "utf8"),
    ).toContain('./generated"');
  });
});
