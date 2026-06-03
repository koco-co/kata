import { describe, expect, test } from "bun:test";
import { validateBugReport, validateConflictReport } from "@shared/lib/bug-report-validate.ts";

describe("validateBugReport", () => {
  test("accepts a valid minimal report", () => {
    expect(() =>
      validateBugReport({ title: "t", severity: "major", problem_type: "代码问题", summary: "s" }),
    ).not.toThrow();
  });
  test("rejects missing title", () => {
    expect(() =>
      validateBugReport({ severity: "major", problem_type: "代码问题", summary: "s" }),
    ).toThrow(/title required/);
  });
  test("rejects invalid severity", () => {
    expect(() =>
      validateBugReport({
        title: "t",
        severity: "blocker",
        problem_type: "代码问题",
        summary: "s",
      }),
    ).toThrow(/severity must be one of/);
  });
});

describe("validateConflictReport", () => {
  test("accepts a valid report", () => {
    expect(() =>
      validateConflictReport({
        title: "t",
        summary: {
          total_conflicts: 1,
          manual_required: 0,
          auto_resolvable: 1,
          files_affected: ["a"],
        },
        conflicts: [{ id: "c-1", file: "a", type: "逻辑冲突", description: "d" }],
      }),
    ).not.toThrow();
  });
  test("rejects conflict missing id", () => {
    expect(() =>
      validateConflictReport({
        title: "t",
        summary: { total_conflicts: 1, manual_required: 0, auto_resolvable: 1, files_affected: [] },
        conflicts: [{ file: "a", type: "逻辑冲突", description: "d" }],
      }),
    ).toThrow(/conflicts\[0\]\.id required/);
  });
});

describe("validateBugReport — extended optional fields", () => {
  test("passes through tenant/account/datasource/error_info/repro/expected/actual", () => {
    const r = validateBugReport({
      title: "t",
      summary: "s",
      problem_type: "代码问题",
      severity: "major",
      environment: {
        deploy_env: "http://x",
        tenant: "DT_demo",
        account: "a@b / pw",
        datasource: "无",
      },
      error_info: { curl: "curl ...", log: "NPE ..." },
      reproduction_steps: ["a", "b"],
      expected: "ok",
      actual: "fail",
      code_location: { snippet_lines: [{ no: 142, text: "x", error: true }] },
      fix_suggestions: [{ title: "fix", diff_lines: [{ sign: "+", text: "y" }] }],
    });
    expect(r.environment?.tenant).toBe("DT_demo");
    expect(r.error_info?.curl).toContain("curl");
    expect(r.reproduction_steps?.length).toBe(2);
    expect(r.code_location?.snippet_lines?.[0]?.error).toBe(true);
    expect(r.fix_suggestions?.[0]?.diff_lines?.[0]?.sign).toBe("+");
  });
});
