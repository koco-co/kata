// apps/core/catalog/compat-shim.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";

export interface SkillContractsRead {
  readonly entries: Record<
    string,
    {
      consumes: string[];
      produces: string[];
      mustTriggerWhen: string[];
      mustNotTriggerWhen: string[];
    }
  >;
}

// Phase 1 shim: reads .claude/contracts/skill-manifest.yaml.
// Public signature is stable — apps/core/catalog/skills.ts maps `entries[id]`
// straight onto SkillSummary fields.
export function readClaudeSkillContracts(contractsRoot: string): SkillContractsRead {
  const path = join(contractsRoot, "skill-manifest.yaml");
  if (!existsSync(path)) return { entries: {} };
  const parsed = YAML.parse(readFileSync(path, "utf-8")) as {
    skills?: Record<string, unknown>;
  } | null;
  const skills = (parsed?.skills ?? {}) as Record<string, ManifestSkillEntry>;
  const entries: SkillContractsRead["entries"] = {};
  for (const [id, raw] of Object.entries(skills)) {
    entries[id] = {
      consumes: arr(raw?.dataflow?.consumes),
      produces: arr(raw?.dataflow?.produces),
      mustTriggerWhen: arr(raw?.routing?.must_trigger_when),
      mustNotTriggerWhen: arr(raw?.routing?.must_not_trigger_when),
    };
  }
  return { entries };
}

interface ManifestSkillEntry {
  dataflow?: {
    consumes?: unknown;
    produces?: unknown;
  };
  routing?: {
    must_trigger_when?: unknown;
    must_not_trigger_when?: unknown;
  };
}

function arr(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}
