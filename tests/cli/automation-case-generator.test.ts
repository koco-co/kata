import { describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
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
    `meta:\n  title: demo\n  version: v7.0.0\n  feature_id: demo\n  case_module_id: ""\ncases:\n  - case_id: C0001\n    title: 验证已存在脚本\n    priority: P1\n    steps:\n      - action: 点击【保存】按钮\n        expected: 保存成功\n    automation:\n      spec_file: c0001-existing-case.spec.ts\n  - case_id: C0002\n    title: 验证缺失脚本\n    priority: P1\n    steps:\n      - action: 点击【提交】按钮\n        expected: 提交成功\n    automation:\n      spec_file: c0002-missing-case.spec.ts\n`,
  );
  writeFileSync(
    join(feature, "automation", "tests", "cases", "c0001-existing-case.spec.ts"),
    "export {};\n",
  );
  writeFileSync(
    join(feature, "automation", "tests", "runners", "full.spec.ts"),
    'import "../cases/c0001-existing";\n',
  );
  return feature;
}

describe("automation case generator", () => {
  it("reports a missing implementation without creating a generic placeholder", () => {
    const feature = fixture();
    const result = generateAutomationScripts(feature);
    expect(result.created).toHaveLength(0);
    expect(result.unmapped).toEqual(["C0002:c0002-missing-case.spec.ts"]);
    expect(result.orphanScripts).toEqual([]);

    const generated = join(feature, "automation", "tests", "cases", "c0002-missing-case.spec.ts");
    expect(existsSync(generated)).toBe(false);
    expect(() => generateAutomationScripts(feature, { apply: true })).toThrow(
      /拒绝生成通用占位脚本/,
    );
    expect(existsSync(generated)).toBe(false);
  });
});
