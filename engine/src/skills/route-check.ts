import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";

export type RouteCheckRule =
  | "ROUTE_CONTRACT_MISSING"
  | "ROUTE_PARSE_ERROR"
  | "ROUTE_SKILL_MISMATCH"
  | "ROUTE_ENTRY_MISMATCH"
  | "ROUTE_SAMPLE_MISSING";

export interface RouteCheckViolation {
  rule: RouteCheckRule;
  path: string;
  message: string;
}

export interface RouteCheckReport {
  passed: boolean;
  violations: RouteCheckViolation[];
}

const ROUTES_DIR = "docs/skills/contracts/routes";
const RUNTIME_SKILL_DIRS = [".claude/skills", ".agents/skills"] as const;
const SAMPLE_FIELDS = ["should_trigger", "should_not_trigger", "clarify"] as const;

export function checkRoutes(root: string): RouteCheckReport {
  const violations: RouteCheckViolation[] = [];
  const skillNames = collectRuntimeSkillNames(root);

  for (const skillName of skillNames) {
    const relativePath = join(ROUTES_DIR, `${skillName}.yaml`);
    const routePath = join(root, relativePath);
    if (!existsSync(routePath)) {
      violations.push({
        rule: "ROUTE_CONTRACT_MISSING",
        path: relativePath,
        message: `route contract is required for skill '${skillName}'`,
      });
      continue;
    }

    let route: unknown;
    try {
      route = YAML.parse(readFileSync(routePath, "utf8"));
    } catch (error) {
      violations.push({
        rule: "ROUTE_PARSE_ERROR",
        path: relativePath,
        message: `failed to parse route yaml: ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }

    validateRouteContract(route, skillName, relativePath, violations);
  }

  return { passed: violations.length === 0, violations };
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

function validateRouteContract(
  route: unknown,
  skillName: string,
  relativePath: string,
  violations: RouteCheckViolation[],
): void {
  if (!route || typeof route !== "object" || Array.isArray(route)) {
    violations.push({
      rule: "ROUTE_PARSE_ERROR",
      path: relativePath,
      message: "route contract must be an object",
    });
    return;
  }

  const data = route as Record<string, unknown>;
  if (data.skill !== skillName) {
    violations.push({
      rule: "ROUTE_SKILL_MISMATCH",
      path: relativePath,
      message: `skill must be ${skillName}`,
    });
  }

  if (data.entry !== `/${skillName}`) {
    violations.push({
      rule: "ROUTE_ENTRY_MISMATCH",
      path: relativePath,
      message: `entry must be /${skillName}`,
    });
  }

  for (const field of SAMPLE_FIELDS) {
    const value = data[field];
    if (!Array.isArray(value) || !value.some((item) => typeof item === "string" && item.trim())) {
      violations.push({
        rule: "ROUTE_SAMPLE_MISSING",
        path: relativePath,
        message: `${field} must contain at least one sample`,
      });
    }
  }
}

export function formatRouteCheckReport(report: RouteCheckReport, root: string): string {
  if (report.passed) return "route check passed";
  const lines = report.violations.map((violation) => {
    const rel = violation.path.startsWith(root)
      ? violation.path.slice(root.length + 1)
      : violation.path;
    return `${violation.rule}: ${rel}: ${violation.message}`;
  });
  return ["route check failed", ...lines].join("\n");
}
