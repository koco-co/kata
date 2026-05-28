export type SkillRuntime = "claude" | "codex";

const CODEX_SKILL_FRONTMATTER_FIELD_LIST = ["name", "description", "allowed-tools"] as const;
const CLAUDE_SKILL_FRONTMATTER_FIELD_LIST = [
  "name",
  "description",
  "allowed-tools",
  "when_to_use",
  "user-invocable",
  "disable-model-invocation",
  "model",
  "effort",
  "paths",
  "context",
  "agent",
] as const;

export const CLAUDE_SKILL_FRONTMATTER_FIELDS: ReadonlySet<string> = new Set(
  CLAUDE_SKILL_FRONTMATTER_FIELD_LIST,
);

// Codex keeps allowed-tools as a transition baseline because
// .agents/skills/playwright-cli/SKILL.md already uses it. Phase 2 should move
// this capability to agents/openai.yaml.
export const CODEX_SKILL_FRONTMATTER_FIELDS: ReadonlySet<string> = new Set(
  CODEX_SKILL_FRONTMATTER_FIELD_LIST,
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
