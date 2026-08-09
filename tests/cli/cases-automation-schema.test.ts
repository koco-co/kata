import { describe, expect, it } from "bun:test";
import { validateCanonicalCases, validateCases } from "../../cli/lib/cases/schema.ts";
import type { CasesFile } from "../../cli/lib/cases/types.ts";

function validFile(): CasesFile {
  return {
    meta: {
      title: "自动化契约",
      feature_id: "automation-contract",
      project_id: "data-assets",
      case_module_id: "",
    },
    cases: [
      {
        id: "C0001",
        title: "验证新增规则",
        priority: "P0",
        steps: [{ action: "保存", expected: "创建成功" }],
        automation: {
          effects: { platform_write: true },
          business_record: { policy: "required" },
          implementations: [{ executor: "playwright-web-ui", state: "active" }],
        },
      },
    ],
  };
}

describe("canonical case automation schema", () => {
  it("accepts the canonical contract", () => {
    expect(validateCases(validFile())).toEqual([]);
  });

  it("reports malformed nested values in an in-memory CasesFile", () => {
    const file = validFile() as unknown as {
      cases: Array<{ automation: Record<string, unknown> }>;
    };
    file.cases[0].automation = {
      effects: { platform_write: "yes" },
      business_record: { policy: "not_applicable", reason: " " },
      implementations: [
        { executor: "playwright-web-ui", state: "active" },
        { executor: "playwright-web-ui", state: "planned" },
      ],
    };

    expect(validateCases(file as unknown as CasesFile)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("automation.effects.platform_write"),
        expect.stringContaining("automation.business_record.reason"),
        expect.stringContaining("automation.implementations executor 重复"),
      ]),
    );
  });

  it("reports unknown and legacy fields in an in-memory CasesFile", () => {
    const file = validFile() as unknown as {
      cases: Array<{ automation: Record<string, unknown> }>;
    };
    file.cases[0].automation.executor = "playwright";
    file.cases[0].automation.spec_file = "c0001-legacy.spec.ts";

    expect(validateCases(file as unknown as CasesFile)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("automation 不允许字段 executor"),
        expect.stringContaining("automation 不允许字段 spec_file"),
      ]),
    );
  });

  it("does not treat a null in-memory automation value as absent", () => {
    const file = validFile() as unknown as {
      cases: Array<{ automation: unknown }>;
    };
    file.cases[0].automation = null;

    expect(validateCases(file as unknown as CasesFile)).toContain(
      "用例 C0001 automation 必须是对象",
    );
  });
});

describe("canonical case identity schema", () => {
  it("rejects an invalid in-memory project identity", () => {
    const file = validFile() as unknown as { meta: { project_id: unknown } };
    file.meta.project_id = " data-assets ";

    expect(validateCases(file as unknown as CasesFile)).toContain(
      "meta.project_id 必须是小写英文 kebab 标识",
    );
  });

  it("requires project and feature identities only at the canonical boundary", () => {
    const file = validFile();
    delete file.meta.project_id;
    delete file.meta.feature_id;

    expect(validateCases(file)).toEqual([]);
    expect(validateCanonicalCases(file)).toEqual(
      expect.arrayContaining([
        "meta.project_id 缺失；canonical cases 必须声明不可变身份",
        "meta.feature_id 缺失；canonical cases 必须声明不可变身份",
      ]),
    );
  });
});
