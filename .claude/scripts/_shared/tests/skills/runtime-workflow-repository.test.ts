import { describe, expect, test } from "bun:test";
import { repoRoot } from "@shared/lib/paths.ts";
import { checkRuntimeSkillSync } from "@shared/lib/skills/runtime-sync.ts";
import {
  checkRuntimeWorkflow,
  formatRuntimeWorkflowReport,
} from "@shared/lib/skills/runtime-workflow.ts";

describe("repository runtime workflow contract", () => {
  test("repository runtime files contain the current safe workflow", () => {
    const root = repoRoot();
    const report = checkRuntimeWorkflow(root);
    expect(formatRuntimeWorkflowReport(report, root)).toBe("runtime workflow passed");
    expect(report.passed).toBe(true);
  });

  test("runtime skill names remain synchronized after detach", () => {
    const report = checkRuntimeSkillSync(repoRoot());
    expect(report.passed).toBe(true);
  });
});
