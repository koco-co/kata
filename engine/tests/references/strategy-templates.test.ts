import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../..");
const skillPath = resolve(repoRoot, ".claude/skills/case-draft/SKILL.md");
const sourceIntakePath = resolve(
  repoRoot,
  ".claude/skills/case-draft/references/source-intake-protocol.md",
);
const reviewGatesPath = resolve(
  repoRoot,
  ".claude/skills/case-draft/references/case-review-evidence-gates.md",
);
const oldSkillPath = resolve(repoRoot, ".claude/skills/obsolete-skill/SKILL.md");

describe("case-draft runtime references", () => {
  const skill = readFileSync(skillPath, "utf8");
  const sourceIntake = readFileSync(sourceIntakePath, "utf8");
  const reviewGates = readFileSync(reviewGatesPath, "utf8");

  test("projects the design-aligned product skill name", () => {
    expect(skill).toContain("name: case-draft");
    expect(skill).toContain("few-shot 只可作为格式参考");
    expect(existsSync(oldSkillPath)).toBe(false);
  });

  test("keeps source intake and evidence gates as references", () => {
    expect(sourceIntake).toContain("Lanhu URL 本身即为源输入");
    expect(sourceIntake).toContain("source_snapshot");
    expect(reviewGates).toContain("unsupported_claims");
    expect(reviewGates).toContain("blocking pending 非 0");
  });
});
