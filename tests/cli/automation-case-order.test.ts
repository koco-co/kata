import { describe, expect, it } from "bun:test";
import { orderAutomationCases } from "../../runtime/automation/runner/case-order.ts";

const cases = [
  { caseId: "C0001", module: "one" },
  { caseId: "C0003", module: "three" },
  { caseId: "C0002", module: "two" },
] as const;

describe("automation case ordering", () => {
  it("preserves YAML order by default", () => {
    expect(orderAutomationCases(cases, false).map((item) => item.caseId)).toEqual([
      "C0001",
      "C0003",
      "C0002",
    ]);
  });

  it("sorts padded case IDs descending when enabled", () => {
    expect(orderAutomationCases(cases, true).map((item) => item.caseId)).toEqual([
      "C0003",
      "C0002",
      "C0001",
    ]);
  });
});
