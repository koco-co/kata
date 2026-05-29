import { describe, expect, test } from "bun:test";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "../../lib/paths.ts";

describe("shared case-qa", () => {
  const root = repoRoot();

  test("_shared/case-qa.md exists and is non-empty", () => {
    const p = join(root, ".claude/skills/_shared/case-qa.md");
    expect(existsSync(p)).toBe(true);
    expect(statSync(p).size).toBeGreaterThan(0);
  });

  test("case-draft / case-edit / case-hotfix have no private rules/case-qa.md", () => {
    for (const id of ["case-draft", "case-edit", "case-hotfix"]) {
      const p = join(root, `.claude/skills/${id}/rules/case-qa.md`);
      expect(existsSync(p)).toBe(false);
    }
  });

  test("playwright-cli skill dir is removed from both runtimes", () => {
    for (const runtime of [".claude", ".agents"]) {
      expect(existsSync(join(root, runtime, "skills/playwright-cli"))).toBe(false);
    }
  });

  test("playwright-automation references/cli-essentials.md exists and is non-empty", () => {
    const p = join(root, ".claude/skills/playwright-automation/references/cli-essentials.md");
    expect(existsSync(p)).toBe(true);
    expect(statSync(p).size).toBeGreaterThan(0);
  });
});
