import { describe, expect, it } from "bun:test";
import type { CaseItem } from "../../cli/lib/cases/types.ts";
import { caseDetail, caseListLabel } from "../../cli/lib/tui/case-view.ts";

const item: CaseItem = {
  id: "C0001",
  title: "验证xxx",
  priority: "P1",
  precondition: "1) 前置A\n2) 前置B\n3) 前置C",
  steps: [
    { action: "操作A", expected: "" },
    { action: "操作B", expected: "结果B" },
  ],
};

describe("TUI case view", () => {
  it("renders the paged list label without tags", () => {
    expect(caseListLabel(item)).toBe("【C0001】验证xxx");
  });

  it("renders precondition and steps as the detail format", () => {
    expect(caseDetail(item)).toBe(
      [
        "【Precondition】",
        "1) 前置A",
        "2) 前置B",
        "3) 前置C",
        "",
        "【Steps】",
        "",
        "┌─────┬────────┬──────────┐",
        "│ Num │ Action │ Expected │",
        "├─────┼────────┼──────────┤",
        "│ 1   │ 操作A  │          │",
        "├─────┼────────┼──────────┤",
        "│ 2   │ 操作B  │ 结果B    │",
        "└─────┴────────┴──────────┘",
      ].join("\n"),
    );
  });

  it("omits the precondition block when absent", () => {
    const detail = caseDetail({ ...item, precondition: undefined });
    expect(detail).not.toContain("【Precondition】");
    expect(detail).toContain("【Steps】");
  });
});
