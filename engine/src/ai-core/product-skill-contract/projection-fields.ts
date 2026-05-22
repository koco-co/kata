import type { ProductSkillProjectionContract, SkillInput } from "./types.ts";
import { pathKey } from "./types.ts";

export function ensureInput(contract: ProductSkillProjectionContract, name: string): SkillInput {
  let input = contract.inputs.find((entry) => entry.name === name);
  if (input) return input;
  input = { name, required: "", kind: "", schema: "" };
  contract.inputs.push(input);
  return input;
}

export function assignProjectionScalar(
  contract: ProductSkillProjectionContract,
  path: string[],
  value: string,
): void {
  switch (pathKey(path)) {
    case "name":
      contract.name = value;
      return;
    case "description.summary":
      contract.summary = value;
      return;
    default:
      if (path.length >= 2 && path[0] === "inputs") {
        const input = ensureInput(contract, path[1]);
        if (path.length === 3) {
          if (path[2] === "required") input.required = value;
          else if (path[2] === "kind") input.kind = value;
          else if (path[2] === "schema") input.schema = value;
        }
      }
  }
}

export function appendProjectionListValue(
  contract: ProductSkillProjectionContract,
  path: string[],
  value: string,
): void {
  switch (pathKey(path)) {
    case "outputs":
      contract.outputs.push(value);
      return;
    case "allowed_tools":
      contract.allowedTools.push(value);
      return;
    case "description.must_trigger_when":
      contract.mustTriggerWhen.push(value);
      return;
    case "description.must_not_trigger_when":
      contract.mustNotTriggerWhen.push(value);
      return;
    case "body.always_load":
      contract.alwaysLoad.push(value);
      return;
    case "body.always_load.routing_summary":
      contract.routingSummary.push(value);
      return;
    case "body.always_load.hard_rules":
      contract.hardRules.push(value);
      return;
    case "body.hard_rules":
      contract.hardRules.push(value);
      return;
    case "body.codex_override.routing_summary":
      contract.codexOverrides.routingSummary.push(value);
      return;
    case "body.codex_override.hard_rules":
      contract.codexOverrides.hardRules.push(value);
      return;
    default: {
      const p0 = path[0];
      if (p0 === "evidence") {
        const k = path[1];
        const cur = contract.evidencePolicy[k];
        contract.evidencePolicy[k] = Array.isArray(cur) ? [...cur, value] : [value];
      } else if (p0 === "failure_policy") {
        const k = path[1];
        const cur = contract.failurePolicy[k];
        contract.failurePolicy[k] = Array.isArray(cur) ? [...cur, value] : [value];
      }
    }
  }
}

export function assignProjectionMapValue(
  contract: ProductSkillProjectionContract,
  path: string[],
  value: string,
): void {
  if (path[0] === "evidence" && path.length === 2) {
    contract.evidencePolicy[path[1]] = value;
    return;
  }
  if (path[0] === "failure_policy" && path.length === 2) {
    contract.failurePolicy[path[1]] = value;
  }
}
