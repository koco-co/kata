// apps/core/catalog/compat-shim.ts
import { dirname } from "node:path";
import { loadSkillManifest } from "kata-engine";

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

// Phase 1 shim: projects engine's skill-manifest into the 4-field shape the
// catalog needs. Signature is stable across manifest evolution.
export function readClaudeSkillContracts(contractsRoot: string): SkillContractsRead {
  // contractsRoot 形如 <root>/.claude/contracts；loadSkillManifest 期望 repo root。
  const root = dirname(dirname(contractsRoot));
  let manifest;
  try {
    manifest = loadSkillManifest(root);
  } catch {
    return { entries: {} };
  }
  const entries: SkillContractsRead["entries"] = {};
  for (const [id, entry] of Object.entries(manifest.skills)) {
    entries[id] = {
      consumes: entry.dataflow.consumes,
      produces: entry.dataflow.produces,
      mustTriggerWhen: entry.routing.must_trigger_when,
      mustNotTriggerWhen: entry.routing.must_not_trigger_when,
    };
  }
  return { entries };
}
