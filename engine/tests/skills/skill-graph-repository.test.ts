import { describe, expect, test } from "bun:test";
import { repoRoot } from "../../lib/paths.ts";
import {
  checkSkillGraph,
  formatSkillGraphCheckReport,
} from "../../src/skills/skill-graph-check.ts";

describe("repository skill graph", () => {
  test("skill graph covers every runtime skill", () => {
    const root = repoRoot();
    const report = checkSkillGraph(root);
    expect(formatSkillGraphCheckReport(report, root)).toBe("skill graph check passed");
  });
});
