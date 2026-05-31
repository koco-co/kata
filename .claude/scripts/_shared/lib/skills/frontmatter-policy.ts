export type SkillRuntime = "claude" | "codex";

// SKILL.md frontmatter allowlist per runtime (spec §6.1 field table).
// Codex 现允许 `when_to_use` / `disable-model-invocation`。其它跨 runtime
// 字段（model/effort/paths/context/agent）仍由 `.agents/skills/<id>/agents/openai.yaml`
// 声明，不进 frontmatter。
const CODEX_SKILL_FRONTMATTER_FIELD_LIST = [
  "name",
  "description",
  "allowed-tools",
  "when_to_use",
  "disable-model-invocation",
] as const;
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
