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
    `meta:\n  title: demo\n  version: v7.0.0\n  feature_id: demo\ncases:\n  - id: C001\n    title: 验证已存在脚本\n    priority: P1\n    steps:\n      - action: 点击【保存】按钮\n        expected: 保存成功\n    automation:\n      spec_file: t01-existing.ts\n  - id: C002\n    title: 验证缺失脚本\n    priority: P1\n    steps:\n      - action: 点击【提交】按钮\n        expected: 提交成功\n    automation:\n      spec_file: t02-missing.ts\n`,
  );
  writeFileSync(join(feature, "automation", "tests", "cases", "t01-existing.ts"), "export {};\n");
  writeFileSync(
    join(feature, "automation", "tests", "runners", "full.spec.ts"),
    'import "../cases/t01-existing";\n',
  );
  return feature;
}

describe("automation case generator", () => {
  it("creates one executable script per missing spec_file and imports only new cases", () => {
    const feature = fixture();
    const result = generateAutomationScripts(feature, { apply: true });
    expect(result.created).toHaveLength(1);
    expect(result.orphanScripts).toEqual([]);

    const generated = join(feature, "automation", "tests", "cases", "t02-missing.ts");
    expect(existsSync(generated)).toBe(true);
    expect(readFileSync(generated, "utf8")).toContain("runGeneratedCase");
    expect(
      readFileSync(join(feature, "automation", "tests", "runners", "generated.spec.ts"), "utf8"),
    ).toContain("../cases/t02-missing.ts");
    expect(
      readFileSync(join(feature, "automation", "tests", "runners", "full.spec.ts"), "utf8"),
    ).toContain('./generated.spec"');
  });
});
