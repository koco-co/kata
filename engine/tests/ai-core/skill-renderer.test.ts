import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderProductSkill } from "../../src/ai-core/skill-renderer.ts";

const BASE_SKILL = `id: codex-override-test@1
name: codex-override-test
kind: product-skill
schema_version: 1
skill_version: 1
status: active
description:
  summary: Trigger when verifying renderer runtime swap behavior.
  must_trigger_when:
    - Test setup requests rendering.
  must_not_trigger_when:
    - Test setup omits skill.yaml.
outputs:
  - artifact
allowed_tools:
  - read_file
context_budget:
  core_tokens: 100
evidence:
  required_source_refs:
    - test.fixture@1
  stale_ref_policy: block
failure_policy:
  missing_evidence: refuse_with_questions
body:
  always_load:
    routing_summary:
      - Default routing line.
    hard_rules:
      - Default hard rule.
  codex_override:
    routing_summary:
      - Codex routing line.
    hard_rules:
      - Codex-only rule.
`;

function setupSkillRoot(yaml: string): string {
  const root = mkdtempSync(join(tmpdir(), "kata-skill-renderer-"));
  writeFileSync(join(root, "skill.yaml"), yaml);
  mkdirSync(join(root, "references"), { recursive: true });
  return root;
}

describe("renderProductSkill runtime swap", () => {
  it("uses default routing_summary and hard_rules for claude runtime", () => {
    const root = setupSkillRoot(BASE_SKILL);
    try {
      const result = renderProductSkill({
        runtime: "claude",
        skillRoot: root,
        repoRelativeSkillRoot: ".ai/core/skills/codex-override-test",
        generatedHeader: "<!-- generated -->",
      });
      expect(result.ok).toBe(true);
      const content = result.value?.[0]?.content ?? "";
      expect(content).toContain("- Default routing line.");
      expect(content).toContain("- Default hard rule.");
      expect(content).not.toContain("Codex routing line.");
      expect(content).not.toContain("Codex-only rule.");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("uses codex_override blocks for codex runtime", () => {
    const root = setupSkillRoot(BASE_SKILL);
    try {
      const result = renderProductSkill({
        runtime: "codex",
        skillRoot: root,
        repoRelativeSkillRoot: ".ai/core/skills/codex-override-test",
        generatedHeader: "<!-- generated -->",
      });
      expect(result.ok).toBe(true);
      const content = result.value?.[0]?.content ?? "";
      expect(content).toContain("- Codex routing line.");
      expect(content).toContain("- Codex-only rule.");
      expect(content).not.toContain("Default routing line.");
      expect(content).not.toContain("Default hard rule.");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("falls back to default content when codex_override is absent", () => {
    const yamlNoOverride = BASE_SKILL.replace(
      / {2}codex_override:\n {4}routing_summary:\n {6}- Codex routing line\.\n {4}hard_rules:\n {6}- Codex-only rule\.\n/,
      "",
    );
    const root = setupSkillRoot(yamlNoOverride);
    try {
      const result = renderProductSkill({
        runtime: "codex",
        skillRoot: root,
        repoRelativeSkillRoot: ".ai/core/skills/codex-override-test",
        generatedHeader: "<!-- generated -->",
      });
      expect(result.ok).toBe(true);
      const content = result.value?.[0]?.content ?? "";
      expect(content).toContain("- Default routing line.");
      expect(content).toContain("- Default hard rule.");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
