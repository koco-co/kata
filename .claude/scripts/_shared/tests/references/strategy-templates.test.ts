import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../../../..");
const skillPath = resolve(repoRoot, ".claude/skills/case-draft/SKILL.md");
const specReviewerPath = resolve(
  repoRoot,
  ".claude/skills/case-draft/prompts/agent-spec-reviewer.md",
);
const qualityReviewerPath = resolve(
  repoRoot,
  ".claude/skills/case-draft/prompts/agent-quality-reviewer.md",
);
const workerPath = resolve(repoRoot, ".claude/skills/case-draft/prompts/agent-worker.md");
const sourceRefsPath = resolve(repoRoot, ".claude/skills/case-draft/references/source-refs.md");
const oldSkillPath = resolve(repoRoot, ".claude/skills/obsolete-skill/SKILL.md");

describe("case-draft runtime references", () => {
  const skill = readFileSync(skillPath, "utf8");
  const specReviewer = readFileSync(specReviewerPath, "utf8");
  const qualityReviewer = readFileSync(qualityReviewerPath, "utf8");
  const worker = readFileSync(workerPath, "utf8");
  const sourceRefs = readFileSync(sourceRefsPath, "utf8");

  test("projects the design-aligned product skill name", () => {
    expect(skill).toContain("name: case-draft");
    // few-shot 仅作格式参考、不作证据来源的不变量（措辞随提示词优化更新，语义不变）
    expect(skill).toContain("不作事实来源");
    expect(existsSync(oldSkillPath)).toBe(false);
  });

  test("keeps current reviewer references loadable", () => {
    expect(specReviewer).toContain("SourceRef");
    expect(specReviewer).toContain("blocking");
    expect(qualityReviewer).toContain("用例内容质量");
    expect(qualityReviewer).toContain("case_id");
  });

  test("keeps the cross-layer contracts unambiguous", () => {
    expect(skill).toContain("静默只约束用户可见消息");
    expect(skill).toContain("`case_id` 只表示测试用例 ID");
    expect(worker).toContain("WorkerStatusEnvelope@1");
    expect(worker).toContain(
      "`missing_evidence`、`ambiguous_requirement`、`history_only`、`missing_required_fact`",
    );
    expect(sourceRefs).toContain("<kind>:<id>#sha256:");
    expect(sourceRefs).not.toContain(
      "每个 requirement atom 的 `source_ref` 用 `<scheme>#<anchor>`",
    );
  });
});
