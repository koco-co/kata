import { describe, expect, test } from "bun:test";
import { repoRoot } from "@shared/lib/paths.ts";
import { checkRuntimeDetach, formatRuntimeDetachReport } from "../../src/skills/runtime-detach.ts";
import { checkRuntimeSkillSync } from "../../src/skills/runtime-sync.ts";

describe("repository runtime detach contract", () => {
  test("repository runtime files are detached from retired source roots", () => {
    const root = repoRoot();
    const report = checkRuntimeDetach(root);
    expect(formatRuntimeDetachReport(report, root)).toBe("runtime detach passed");
    expect(report.passed).toBe(true);
  });

  test("runtime skill names remain synchronized after detach", () => {
    const report = checkRuntimeSkillSync(repoRoot());
    expect(report.passed).toBe(true);
  });
});
