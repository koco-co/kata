import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { lintOwnerSkillDup } from "@shared/lint/owner-skill-dup.ts";

const FIX = join(import.meta.dirname, "fixtures");

describe("lintOwnerSkillDup (E1-OWNER)", () => {
  test("flags duplicate owner_skill in agent file", () => {
    const r = lintOwnerSkillDup(join(FIX, "lint-cases-bad"));
    expect(r.violations.length).toBeGreaterThanOrEqual(1);
    expect(r.violations[0]?.rule).toBe("E1-OWNER");
  });

  test("passes clean agent files", () => {
    const r = lintOwnerSkillDup(join(FIX, "lint-cases-good"));
    expect(r.passed).toBe(true);
  });
});
