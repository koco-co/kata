import { describe, expect, it } from "bun:test";
import { renderCsv } from "../../cli/lib/cases/render-csv.ts";
import type { CasesFile } from "../../cli/lib/cases/types.ts";

function file(
  cases: CasesFile["cases"],
  caseModuleId = "10812",
  requirementId?: string,
): CasesFile {
  return {
    meta: { title: "需求名", case_module_id: caseModuleId, requirement_id: requirementId },
    cases,
  };
}

function withRequirements(
  cases: CasesFile["cases"],
  requirements: { requirement_id: string; title: string; source: string; module_id?: string }[],
  caseModuleId = "10812",
): CasesFile {
  return {
    meta: { title: "需求名", case_module_id: caseModuleId, requirement_id: "15911" },
    requirements,
    cases,
  };
}

describe("renderCsv", () => {
  it("renders the module column with English brackets only and the requirement column", () => {
    const csv = renderCsv(
      file(
        [
          {
            id: "C0001",
            title: "用例一",
            priority: "P0",
            precondition: "1) 前置一\n2) 前置二",
            steps: [],
          },
        ],
        "10812",
        "15911",
      ),
    );
    expect(csv.startsWith("所属模块")).toBe(true);
    expect(csv).toContain("所属模块,相关需求,用例标题,前置条件,步骤,预期,优先级,用例类型,适用阶段");
    expect(csv).toContain("(#10812),(#15911)");
    expect(csv).not.toContain("需求名(#");
    expect(csv).not.toContain("（");
    expect(csv).toContain("1) 前置一<br>2) 前置二");
    expect(csv).toContain(",1,功能测试,功能测试阶段");
    expect(csv).toContain("功能测试,功能测试阶段");
  });

  it("uses the requirement module_id when the case belongs to a sub-requirement", () => {
    const csv = renderCsv(
      withRequirements(
        [
          { id: "C0001", title: "用例一", priority: "P0", requirement_id: "13184", steps: [] },
          { id: "C0002", title: "用例二", priority: "P1", requirement_id: "13185", steps: [] },
        ],
        [
          { requirement_id: "13184", title: "需求甲", source: "x", module_id: "20001" },
          { requirement_id: "13185", title: "需求乙", source: "x" },
        ],
      ),
    );
    expect(csv).toContain("(#20001),(#15911),用例一");
    expect(csv).toContain("(#10812),(#15911),用例二");
  });

  it("leaves the requirement column empty when meta.requirement_id is absent", () => {
    const csv = renderCsv(file([{ id: "C0001", title: "用例一", priority: "P0", steps: [] }]));
    expect(csv).toContain("(#10812),,用例一");
  });

  it("maps YAML priorities to ZenTao numeric priorities", () => {
    const csv = renderCsv(
      file([
        { id: "C0001", title: "用例一", priority: "P1", steps: [] },
        { id: "C0002", title: "用例二", priority: "P2", steps: [] },
      ]),
    );
    expect(csv).toContain(",2,功能测试,功能测试阶段");
    expect(csv).toContain(",3,功能测试,功能测试阶段");
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
