import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "@shared/lib/paths.ts";

function source(path: string): string {
  return readFileSync(join(repoRoot(), path), "utf8");
}

describe("P4-03 dead code cleanup", () => {
  test("removes obsolete stubs and unused helpers", () => {
    expect(source(".claude/skills/case-draft/scripts/discuss.ts")).not.toContain("runDiscussValidate");
    expect(source(".claude/scripts/_shared/lib/state.ts")).not.toContain("deleteWorkflowState");
    expect(source(".claude/scripts/_shared/cli/cases-validate.ts")).not.toContain("_textIncludes");
  });

  test("removes deprecated prdDir API and production calls", () => {
    expect(source(".claude/scripts/_shared/lib/paths.ts")).not.toMatch(/\bfunction prdDir\b/);
    expect(source(".claude/scripts/_shared/lib/enhanced-doc-store.ts")).not.toContain("prdDir");
  });

  test("does not self-fallback KATA_TARGET_ENV", () => {
    expect(source(".claude/skills/playwright-automation/scripts/run-tests-notify.ts")).not.toContain(
      "KATA_TARGET_ENV ?? process.env.KATA_TARGET_ENV",
    );
  });
});
