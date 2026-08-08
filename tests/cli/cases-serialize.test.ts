import { describe, expect, it } from "bun:test";
import { parseCasesYaml } from "../../cli/lib/cases/parse.ts";
import { serializeCasesYaml, setAutomationEnv } from "../../cli/lib/cases/serialize.ts";

const YAML = `meta:
  title: 需求名
  feature_id: stable-feature
  case_module_id: "12345"
cases:
  - case_id: C0001
    title: 验证功能
    priority: P1
    steps:
      - action: 打开页面
        expected: 页面正常
`;

describe("cases serialize automation env", () => {
  it("serializes a non-empty automation_env", () => {
    const parsed = parseCasesYaml(
      YAML.replace(
        'case_module_id: "12345"',
        'case_module_id: "12345"\n  automation_env: ltqc-dev',
      ),
    );
    expect(serializeCasesYaml(parsed)).toContain("feature_id: stable-feature");
    expect(serializeCasesYaml(parsed)).toContain("automation_env: ltqc-dev");
  });

  it("rewrites only meta.automation_env and preserves the rest of the document", () => {
    const updated = setAutomationEnv(YAML, "ltqc-lindorm-dev");
    expect(updated).toContain("automation_env: ltqc-lindorm-dev");
    expect(updated).toContain('case_module_id: "12345"');
    expect(updated).toContain("C0001");
    expect(setAutomationEnv(updated, "")).not.toContain("automation_env");
  });
});
