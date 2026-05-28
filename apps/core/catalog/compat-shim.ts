// apps/core/catalog/compat-shim.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";

export interface SkillContractsRead {
  readonly graph: Record<string, { consumes?: unknown; produces?: unknown }>;
  readonly routesRoot: string;
}

// Phase 1 shim: read from .claude/contracts. After commit 3 (skill-manifest)
// this shim's body is replaced to read manifest facets; the exported
// signature stays stable so apps/core/catalog/skills.ts does not change again.
export function readClaudeSkillContracts(contractsRoot: string): SkillContractsRead {
  return {
    graph: readSkillGraph(join(contractsRoot, "skill-graph.yaml")),
    routesRoot: join(contractsRoot, "routes"),
  };
}

function readSkillGraph(path: string): Record<string, { consumes?: unknown; produces?: unknown }> {
  if (!existsSync(path)) return {};
  const parsed = YAML.parse(readFileSync(path, "utf-8"));
  const skills =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as { skills?: unknown }).skills
      : undefined;
  return skills && typeof skills === "object" && !Array.isArray(skills)
    ? (skills as Record<string, { consumes?: unknown; produces?: unknown }>)
    : {};
}
