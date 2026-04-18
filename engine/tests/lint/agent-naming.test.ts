import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { lintAgentNaming } from "../../src/lint/agent-naming.ts";

const FIX = join(import.meta.dirname, "fixtures");

describe("lintAgentNaming (N1)", () => {
  test("flags subagent-* file basenames", () => {
    const r = lintAgentNaming(join(FIX, "agent-naming-bad"));
    expect(r.passed).toBe(false);
    expect(r.violations.length).toBe(2);
    expect(r.violations.every((v) => v.rule === "N1")).toBe(true);
  });

  test("passes legitimate agent names", () => {
    const r = lintAgentNaming(join(FIX, "agent-naming-good"));
    expect(r.passed).toBe(true);
    expect(r.violations.length).toBe(0);
  });
});
