import { describe, expect, test } from "bun:test";
import type { PathViolation } from "@shared/lint/types.ts";
import { isKnownSafe } from "../../src/cli/paths-audit.ts";

function violation(
  file: string,
  rule: PathViolation["rule"],
  matched = "workspace/{project}/tests/",
): PathViolation {
  return {
    file,
    rule,
    lineNumber: 1,
    matched,
    message: "fixture",
  };
}

describe("paths audit known-safe files", () => {
  test("skips runtime docs that intentionally mention workspace templates", () => {
    expect(isKnownSafe(violation("/repo/.agents/agents/regression-runner-agent.md", "P-S3"))).toBe(
      true,
    );
    expect(
      isKnownSafe(
        violation("/repo/.agents/skills/ui-plan/references/playwright-patterns.md", "P-S3"),
      ),
    ).toBe(true);
    expect(isKnownSafe(violation("/repo/.claude/rules/tests.md", "P-S3"))).toBe(true);
    expect(
      isKnownSafe(
        violation("/repo/docs/superpowers/plans/2026-04-29-claude-config-optimization.md", "P-S3"),
      ),
    ).toBe(true);
  });

  test("does not skip stale script invocations in runtime docs", () => {
    expect(
      isKnownSafe(
        violation(
          "/repo/.agents/skills/example/SKILL.md",
          "P-S2",
          "bun test ./.claude/scripts/__tests__",
        ),
      ),
    ).toBe(false);
  });
});
