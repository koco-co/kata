export type ProjectionRuntime = "claude" | "codex";

export function skillProjectionPath(runtime: ProjectionRuntime, skillName: string): string {
  if (runtime === "claude") return `.claude/skills/${skillName}/SKILL.md`;
  return `.agents/skills/${skillName}/SKILL.md`;
}

export function skillReferencePath(
  runtime: ProjectionRuntime,
  skillName: string,
  fileName: string,
): string {
  if (runtime === "claude") return `.claude/skills/${skillName}/references/${fileName}`;
  return `.agents/skills/${skillName}/references/${fileName}`;
}
