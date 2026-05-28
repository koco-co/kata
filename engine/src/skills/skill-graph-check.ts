import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";

export type SkillGraphCheckRule =
  | "SKILL_GRAPH_MISSING"
  | "SKILL_GRAPH_PARSE_ERROR"
  | "SKILL_GRAPH_ENTRY_MISSING"
  | "SKILL_GRAPH_UNEXPECTED_ENTRY"
  | "SKILL_GRAPH_FIELD_MISSING"
  | "SKILL_GRAPH_RELATED_UNKNOWN";

export interface SkillGraphCheckViolation {
  rule: SkillGraphCheckRule;
  path: string;
  message: string;
}

export interface SkillGraphCheckReport {
  passed: boolean;
  violations: SkillGraphCheckViolation[];
}

const GRAPH_PATH = "docs/skills/contracts/skill-graph.yaml";
const RUNTIME_SKILL_DIRS = [".claude/skills", ".agents/skills"] as const;

export function checkSkillGraph(root: string): SkillGraphCheckReport {
  const violations: SkillGraphCheckViolation[] = [];
  const runtimeSkills = collectRuntimeSkillNames(root);
  const runtimeSkillSet = new Set(runtimeSkills);
  const parsed = readSkillGraph(root, violations);
  if (parsed === undefined) return { passed: false, violations };

  const graph = readSkillGraphEntries(parsed, violations);
  if (!graph) return { passed: false, violations };

  validateSkillGraphCoverage(runtimeSkills, graph, violations);
  validateSkillGraphEntries(graph, runtimeSkillSet, violations);
  return { passed: violations.length === 0, violations };
}

function readSkillGraph(root: string, violations: SkillGraphCheckViolation[]): unknown {
  const graphPath = join(root, GRAPH_PATH);
  if (!existsSync(graphPath)) {
    pushSkillGraphViolation(violations, "SKILL_GRAPH_MISSING", "skill graph contract is required");
    return;
  }

  try {
    return YAML.parse(readFileSync(graphPath, "utf8"));
  } catch (error) {
    pushSkillGraphViolation(
      violations,
      "SKILL_GRAPH_PARSE_ERROR",
      `failed to parse skill graph: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function readSkillGraphEntries(
  parsed: unknown,
  violations: SkillGraphCheckViolation[],
): Record<string, unknown> | undefined {
  const skills =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as { skills?: unknown }).skills
      : undefined;

  if (!skills || typeof skills !== "object" || Array.isArray(skills)) {
    pushSkillGraphViolation(
      violations,
      "SKILL_GRAPH_PARSE_ERROR",
      "skill graph must declare a skills object",
    );
    return;
  }

  return skills as Record<string, unknown>;
}

function validateSkillGraphCoverage(
  runtimeSkills: string[],
  graph: Record<string, unknown>,
  violations: SkillGraphCheckViolation[],
): void {
  for (const skillName of runtimeSkills) {
    if (!(skillName in graph)) {
      pushSkillGraphViolation(
        violations,
        "SKILL_GRAPH_ENTRY_MISSING",
        `skill graph must include ${skillName}`,
      );
    }
  }
}

function validateSkillGraphEntries(
  graph: Record<string, unknown>,
  runtimeSkillSet: Set<string>,
  violations: SkillGraphCheckViolation[],
): void {
  for (const skillName of Object.keys(graph).sort()) {
    if (!runtimeSkillSet.has(skillName)) {
      pushSkillGraphViolation(
        violations,
        "SKILL_GRAPH_UNEXPECTED_ENTRY",
        `skill graph includes non-runtime skill ${skillName}`,
      );
      continue;
    }
    validateGraphEntry(skillName, graph[skillName], runtimeSkillSet, violations);
  }
}

function collectRuntimeSkillNames(root: string): string[] {
  const names = new Set<string>();
  for (const relativeDir of RUNTIME_SKILL_DIRS) {
    const dir = join(root, relativeDir);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) names.add(entry.name);
    }
  }
  return [...names].sort();
}

function validateGraphEntry(
  skillName: string,
  entry: unknown,
  runtimeSkillSet: Set<string>,
  violations: SkillGraphCheckViolation[],
): void {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    pushSkillGraphViolation(
      violations,
      "SKILL_GRAPH_FIELD_MISSING",
      `${skillName} entry must be an object`,
    );
    return;
  }

  const data = entry as Record<string, unknown>;
  validateGraphStringField(skillName, "user_entry", data.user_entry, violations);
  validateGraphListField(skillName, "consumes", data.consumes, violations);
  validateGraphListField(skillName, "produces", data.produces, violations);
  validateGraphRelated(skillName, data.related, runtimeSkillSet, violations);
}

function validateGraphStringField(
  skillName: string,
  field: string,
  value: unknown,
  violations: SkillGraphCheckViolation[],
): void {
  if (typeof value === "string" && value.trim() !== "") return;
  pushSkillGraphViolation(
    violations,
    "SKILL_GRAPH_FIELD_MISSING",
    `${skillName} ${field} is required`,
  );
}

function validateGraphListField(
  skillName: string,
  field: "consumes" | "produces",
  value: unknown,
  violations: SkillGraphCheckViolation[],
): void {
  if (Array.isArray(value) && value.some((item) => typeof item === "string" && item.trim())) {
    return;
  }
  pushSkillGraphViolation(
    violations,
    "SKILL_GRAPH_FIELD_MISSING",
    `${skillName} ${field} must contain at least one value`,
  );
}

function validateGraphRelated(
  skillName: string,
  related: unknown,
  runtimeSkillSet: Set<string>,
  violations: SkillGraphCheckViolation[],
): void {
  if (!Array.isArray(related)) {
    pushSkillGraphViolation(
      violations,
      "SKILL_GRAPH_FIELD_MISSING",
      `${skillName} related must be an array`,
    );
    return;
  }

  for (const relatedSkill of related) {
    if (typeof relatedSkill !== "string" || runtimeSkillSet.has(relatedSkill)) continue;
    pushSkillGraphViolation(
      violations,
      "SKILL_GRAPH_RELATED_UNKNOWN",
      `${skillName} related skill ${relatedSkill} is not a runtime skill`,
    );
  }
}

function pushSkillGraphViolation(
  violations: SkillGraphCheckViolation[],
  rule: SkillGraphCheckRule,
  message: string,
): void {
  violations.push({ rule, path: GRAPH_PATH, message });
}

export function formatSkillGraphCheckReport(report: SkillGraphCheckReport, root: string): string {
  if (report.passed) return "skill graph check passed";
  const lines = report.violations.map((violation) => {
    const rel = violation.path.startsWith(root)
      ? violation.path.slice(root.length + 1)
      : violation.path;
    return `${violation.rule}: ${rel}: ${violation.message}`;
  });
  return ["skill graph check failed", ...lines].join("\n");
}
