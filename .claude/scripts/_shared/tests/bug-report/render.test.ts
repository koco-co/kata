import { describe, expect, test } from "bun:test";
import { renderBugReport, renderConflictReport } from "@shared/lib/bug-report-render.ts";
import { validateBugReport, validateConflictReport } from "@shared/lib/bug-report-validate.ts";
import bugFixture from "./bug-report.fixture.json";
import conflictFixture from "./conflict-report.fixture.json";

describe("renderBugReport", () => {
  // simple / full 是完整 HTML 文档
  for (const variant of ["simple", "full"] as const) {
    test(`renders ${variant} as a full HTML document with no unresolved handlebars`, () => {
      const html = renderBugReport(validateBugReport(bugFixture), variant);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain(bugFixture.title);
      expect(html).not.toContain("{{");
    });
  }

  // zentao 是禅道富文本兼容片段：裸 <table>，无 DOCTYPE
  test("renders zentao as a ZenTao rich-text fragment (no DOCTYPE) with no unresolved handlebars", () => {
    const html = renderBugReport(validateBugReport(bugFixture), "zentao");
    expect(html).toContain("<table");
    expect(html).not.toContain("<!DOCTYPE html>");
    expect(html).toContain(bugFixture.title);
    expect(html).not.toContain("{{");
  });

  // severityClass 由 severity 计算注入（minor -> low）；simple 模版真实把它渲染进 badge class
  test("injects computed severityClass (minor -> low) into the rendered badge", () => {
    const html = renderBugReport(validateBugReport({ ...bugFixture, severity: "minor" }), "simple");
    expect(html).toContain("badge severity-low");
    expect(html).not.toContain("{{");
  });
});

describe("renderConflictReport", () => {
  test("renders conflict report with no unresolved handlebars", () => {
    const html = renderConflictReport(validateConflictReport(conflictFixture));
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain(conflictFixture.title);
    expect(html).toContain(conflictFixture.manual_decision_list[0].description);
    expect(html).not.toContain("{{");
  });
});
