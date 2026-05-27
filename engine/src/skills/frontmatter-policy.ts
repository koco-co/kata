export type SkillRuntime = "claude" | "codex";

// Phase 1 only accepts fields supported by the current repository baseline and
// verified evidence. Any new field must land with an official source reference.
const CURRENT_SKILL_FRONTMATTER_FIELDS = ["name", "description", "allowed-tools"] as const;

export const CLAUDE_SKILL_FRONTMATTER_FIELDS: ReadonlySet<string> = new Set(
  CURRENT_SKILL_FRONTMATTER_FIELDS,
);

// Codex keeps allowed-tools as a transition baseline because
// .agents/skills/playwright-cli/SKILL.md already uses it. Phase 2 should move
// this capability to agents/openai.yaml.
export const CODEX_SKILL_FRONTMATTER_FIELDS: ReadonlySet<string> = new Set(
  CURRENT_SKILL_FRONTMATTER_FIELDS,
);

export function findUnsupportedFrontmatterFields(
  runtime: SkillRuntime,
  frontmatter: Record<string, unknown>,
): string[] {
  const allowedFields =
    runtime === "claude" ? CLAUDE_SKILL_FRONTMATTER_FIELDS : CODEX_SKILL_FRONTMATTER_FIELDS;

  return Object.keys(frontmatter)
    .filter((field) => !allowedFields.has(field))
    .sort();
}
