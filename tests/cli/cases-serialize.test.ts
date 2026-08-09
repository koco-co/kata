import { describe, expect, it } from "bun:test";
import { parseCasesYaml } from "../../cli/lib/cases/parse.ts";
import { serializeCasesYaml, setAutomationEnv } from "../../cli/lib/cases/serialize.ts";

const YAML = `meta:
  title: 需求名
  feature_id: stable-feature
  project_id: data-assets
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
    const serialized = serializeCasesYaml(parsed);
    expect(serialized).toContain("feature_id: stable-feature\n  project_id: data-assets\n");
    expect(serialized).toContain("automation_env: ltqc-dev");
  });

  it("serializes canonical automation fields in stable order", () => {
    const parsed = parseCasesYaml(
      YAML.replace(
        "    steps:",
        `    automation:
      effects:
        platform_write: true
      business_record:
        policy: required
      implementations:
        - executor: playwright-web-ui
          state: active
        - executor: request-api
          state: planned
    steps:`,
      ),
    );

    const serialized = serializeCasesYaml(parsed);
    expect(serialized).toContain(`automation:
      effects:
        platform_write: true
      business_record:
        policy: required
      implementations:
        - executor: playwright-web-ui
          state: active
        - executor: request-api
          state: planned`);
    expect(parseCasesYaml(serialized)).toEqual(parsed);
  });

  it("rewrites only meta.automation_env and preserves the rest of the document", () => {
    const updated = setAutomationEnv(YAML, "ltqc-lindorm-dev");
    expect(updated).toContain("automation_env: ltqc-lindorm-dev");
    expect(updated).toContain('case_module_id: "12345"');
    expect(updated).toContain("C0001");
    expect(setAutomationEnv(updated, "")).not.toContain("automation_env");
  });
});
