import { describe, expect, it } from "bun:test";
import { renderCsv } from "../../cli/lib/cases/render-csv.ts";
import type { CasesFile } from "../../cli/lib/cases/types.ts";

function file(cases: CasesFile["cases"], caseModuleId = "10812"): CasesFile {
  return {
    meta: { title: "需求名", case_module_id: caseModuleId },
    cases,
  };
}

describe("renderCsv", () => {
  it("renders the ZenTao module column and fixed import columns", () => {
    const csv = renderCsv(file([{ id: "C0001", title: "用例一", priority: "P0", steps: [] }]));
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("所属模块,用例标题,前置条件,步骤,预期,优先级,用例类型,适用阶段");
    expect(csv).toContain("需求名(#10812)");
    expect(csv).toContain("功能测试,功能测试阶段");
  });

  it("quotes fields containing commas, quotes and newlines", () => {
    const csv = renderCsv(
      file([
        {
          id: "C0001",
          title: 'a,"b"',
          priority: "P0",
          steps: [{ action: "x\ny", expected: "e" }],
        },
      ]),
    );
    expect(csv).toContain('"a,""b"""');
    expect(csv).toContain('"1. x\ny"');
  });

  it("rejects CSV export without a case module id", () => {
    expect(() => renderCsv(file([], ""))).toThrow("禅道模块 ID");
  });
});
