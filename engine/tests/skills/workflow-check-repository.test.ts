import { describe, expect, test } from "bun:test";
import { repoRoot } from "@shared/lib/paths.ts";
import { checkWorkflows, formatWorkflowCheckReport } from "../../src/skills/workflow-check.ts";

describe("repository workflow contract", () => {
  test("repository workflows pass consistency check", () => {
    const root = repoRoot();
    const report = checkWorkflows(root);
    expect(formatWorkflowCheckReport(report, root)).toBe("workflow check passed");
    expect(report.passed).toBe(true);
  });
});
