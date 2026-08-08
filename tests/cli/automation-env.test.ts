import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveAutomationEnv } from "../../cli/lib/automation/automation-env.ts";

function feature(yaml: string): string {
  const featureDir = mkdtempSync(join(tmpdir(), "kata-automation-env-"));
  mkdirSync(join(featureDir, "cases"), { recursive: true });
  writeFileSync(join(featureDir, "cases", "需求.yaml"), yaml);
  return featureDir;
}

const YAML = `meta:
  title: 需求
  case_module_id: ""
  automation_env: ltqc-lindorm-dev
cases:
  - case_id: C0001
    title: 验证功能
    priority: P1
    steps:
      - action: 打开页面
        expected: 页面正常
`;

describe("resolveAutomationEnv", () => {
  it("prefers an explicit env", () => {
    expect(resolveAutomationEnv(feature(YAML), "other-dev")).toBe("other-dev");
  });

  it("falls back to meta.automation_env", () => {
    expect(resolveAutomationEnv(feature(YAML))).toBe("ltqc-lindorm-dev");
  });

  it("rejects missing YAML env without an explicit value", () => {
    const dir = feature(YAML.replace("\n  automation_env: ltqc-lindorm-dev", ""));
    expect(() => resolveAutomationEnv(dir)).toThrow(/meta\.automation_env/);
  });
});
