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

  it("keeps numbered action lines as separate table rows", () => {
    const detail = caseDetail({
      ...item,
      steps: [
        {
          action:
            "新增bigint类型文本框属性：\n1）属性类型为“文本框”，字段类型为“bigint”\n2）输入其他表单内容\n3）点击【确定】",
          expected: "列表中显示新建的属性，且字段值与步骤中列出的固定输入值一致",
        },
      ],
    });
    expect(detail).toContain("新增bigint类型文本框属性：");
    expect(detail).toContain("1） 属性类型为“文本框”，字段类型为“bigint”");
    expect(detail).toContain("2） 输入其他表单内容");
    expect(detail).toContain("3） 点击【确定】");
    const actionLineIndex = detail.split("\n").findIndex((line) => line.includes("新增bigint"));
    const expectedActionLines = detail
      .split("\n")
      .slice(actionLineIndex, actionLineIndex + 4)
      .join("\n");
    expect(expectedActionLines).not.toContain("1）属性类型为“文本框”，字段类型为“bigint” 2）");
  });
});
