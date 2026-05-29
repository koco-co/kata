import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../..");
const skillPath = resolve(repoRoot, ".claude/skills/case-draft/SKILL.md");
const specReviewerPath = resolve(
  repoRoot,
  ".claude/skills/case-draft/prompts/agent-spec-reviewer.md",
);
const qualityReviewerPath = resolve(
  repoRoot,
  ".claude/skills/case-draft/prompts/agent-quality-reviewer.md",
);
const oldSkillPath = resolve(repoRoot, ".claude/skills/obsolete-skill/SKILL.md");

describe("case-draft runtime references", () => {
  const skill = readFileSync(skillPath, "utf8");
  const specReviewer = readFileSync(specReviewerPath, "utf8");
  const qualityReviewer = readFileSync(qualityReviewerPath, "utf8");

  test("projects the design-aligned product skill name", () => {
    expect(skill).toContain("name: case-draft");
    expect(skill).toContain("few-shot 只可作为格式参考");
    expect(existsSync(oldSkillPath)).toBe(false);
  });

  test("keeps current reviewer references loadable", () => {
    expect(specReviewer).toContain("SourceRef");
    expect(specReviewer).toContain("blocking");
    expect(qualityReviewer).toContain("用例内容质量");
    expect(qualityReviewer).toContain("case_id");
  });
});
