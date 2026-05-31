// SKILL.md frontmatter allowlist for the Claude runtime.
const CLAUDE_SKILL_FRONTMATTER_FIELD_LIST = [
  "name",
  "description",
  "allowed-tools",
  "when_to_use",
  "user-invocable",
  "disable-model-invocation",
  "argument-hint",
  "model",
  "effort",
  "context",
  "agent",
] as const;

export const CLAUDE_SKILL_FRONTMATTER_FIELDS: ReadonlySet<string> = new Set(
  CLAUDE_SKILL_FRONTMATTER_FIELD_LIST,
);

export function findUnsupportedFrontmatterFields(
  frontmatter: Record<string, unknown>,
): string[] {
  return Object.keys(frontmatter)
    .filter((field) => !CLAUDE_SKILL_FRONTMATTER_FIELDS.has(field))
    .sort();
}
