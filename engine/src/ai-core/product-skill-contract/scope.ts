import type { AiCoreIssue } from "../types.ts";
import type { ProductSkillParserScope, ProductSkillProjectionContract } from "./types.ts";
import {
  DESCRIPTION_WORKFLOW_PATTERN,
  isSafeReferencePath,
  issue,
  pathKey,
  stringField,
  stringListField,
  validateLoadPhases,
  validatePurpose,
} from "./types.ts";

export function finalizeScope(
  scope: ProductSkillParserScope,
  contract: ProductSkillProjectionContract,
  path: string,
  issues: AiCoreIssue[],
): void {
  if (scope.kind !== "row") return;
  const pk = pathKey(scope.path);
  const v = scope.value;

  if (pk === "body.load_when") {
    issues.push(
      issue(
        "product_skill.legacy_load_when_blocked",
        "Product skill body.load_when is no longer an active loading source; use top-level references or few_shots.",
        path,
      ),
    );
    return;
  }

  if (pk === "body.sections") {
    finalizeSectionRow(v, contract, path, issues);
    return;
  }

  if (pk === "references") {
    finalizeReferenceRow(v, contract, path, issues);
    return;
  }

  if (pk === "command_aliases") {
    finalizeCommandAliasRow(v, contract, path, issues);
    return;
  }

  if (pk === "few_shots") {
    finalizeFewShotRow(v, contract, path, issues);
  }
}

function finalizeSectionRow(
  v: Record<string, unknown>,
  contract: ProductSkillProjectionContract,
  path: string,
  issues: AiCoreIssue[],
): void {
  const id = stringField(v.id);
  const loadWhen = stringField(v.load_when);
  const summary = stringField(v.summary);
  if (!id || !loadWhen || !summary) {
    issues.push(
      issue(
        "product_skill.invalid_section",
        "Product skill section requires id, load_when, and summary.",
        path,
      ),
    );
    return;
  }
  contract.sections.push({ id, loadWhen, summary });
}

function finalizeReferenceRow(
  v: Record<string, unknown>,
  contract: ProductSkillProjectionContract,
  path: string,
  issues: AiCoreIssue[],
): void {
  const row = referenceRow(v);
  if (!validReferenceLike(row.refPath, row.loadPhases, row.purpose) || !row.type || !row.loadWhen) {
    issues.push(
      issue(
        "product_skill.invalid_reference",
        "Product skill reference requires safe path, type, load_phases, purpose, and load_when.",
        path,
      ),
    );
    return;
  }
  contract.references.push({
    path: row.refPath,
    type: row.type,
    generatedFrom: row.generatedFrom,
    loadPhases: row.loadPhases,
    purpose: row.purpose,
    loadWhen: row.loadWhen,
  });
}

function referenceRow(v: Record<string, unknown>) {
  return {
    refPath: stringField(v.path),
    type: stringField(v.type),
    loadWhen: stringField(v.load_when),
    generatedFrom: stringField(v.generated_from),
    loadPhases: stringListField(v.load_phases),
    purpose: stringField(v.purpose),
  };
}

function finalizeCommandAliasRow(
  v: Record<string, unknown>,
  contract: ProductSkillProjectionContract,
  path: string,
  issues: AiCoreIssue[],
): void {
  const name = stringField(v.name);
  if (!name) {
    issues.push(
      issue(
        "product_skill.invalid_command_alias",
        "Product skill command_alias requires name.",
        path,
      ),
    );
    return;
  }
  contract.commandAliases.push({
    name,
    userInvocable: stringField(v.user_invocable),
    lifecycle: stringField(v.lifecycle),
    sinceVersion: stringField(v.since_version),
    reason: stringField(v.reason),
    removeAfter: stringField(v.remove_after),
  });
}

function finalizeFewShotRow(
  v: Record<string, unknown>,
  contract: ProductSkillProjectionContract,
  path: string,
  issues: AiCoreIssue[],
): void {
  const row = fewShotRow(v);
  if (
    !validReferenceLike(row.shotPath, row.loadPhases, row.purpose) ||
    !row.loadWhen ||
    !row.maxTokens
  ) {
    issues.push(
      issue(
        "product_skill.invalid_few_shot",
        "Product skill few_shot requires safe path, load_phases, purpose, load_when, and max_tokens.",
        path,
      ),
    );
    return;
  }
  const mt = parseInt(row.maxTokens, 10);
  if (Number.isNaN(mt) || mt < 1) {
    issues.push(
      issue(
        "product_skill.invalid_few_shot",
        "Product skill few_shot max_tokens must be a positive integer.",
        path,
      ),
    );
    return;
  }
  contract.fewShots.push({
    path: row.shotPath,
    loadPhases: row.loadPhases,
    purpose: row.purpose,
    loadWhen: row.loadWhen,
    maxTokens: mt,
  });
}

function fewShotRow(v: Record<string, unknown>) {
  return {
    shotPath: stringField(v.path),
    loadWhen: stringField(v.load_when),
    maxTokens: stringField(v.max_tokens),
    loadPhases: stringListField(v.load_phases),
    purpose: stringField(v.purpose),
  };
}

function validReferenceLike(refPath: string, loadPhases: string[], purpose: string): boolean {
  return Boolean(
    refPath &&
      validateLoadPhases(loadPhases) &&
      validatePurpose(purpose) &&
      isSafeReferencePath(refPath),
  );
}

export function validateRequiredFields(
  contract: ProductSkillProjectionContract,
  seenRequired: Set<string>,
  path: string,
): AiCoreIssue[] {
  const hasBodyHardRules =
    seenRequired.has("body.hard_rules") || seenRequired.has("body.always_load.hard_rules");
  const _hasEvidence = seenRequired.has("evidence");
  const missing = [
    ["name", contract.name],
    ["description.summary", contract.summary],
    ["description.must_trigger_when", seenRequired.has("description.must_trigger_when")],
    ["description.must_not_trigger_when", seenRequired.has("description.must_not_trigger_when")],
    ["outputs", seenRequired.has("outputs")],
    ["allowed_tools", seenRequired.has("allowed_tools")],
    ["context_budget", contract.contextBudgetLines.length > 0],
    ["body.always_load", seenRequired.has("body.always_load")],
    ["body.hard_rules", hasBodyHardRules],
    ["evidence", seenRequired.has("evidence")],
    ["failure_policy", seenRequired.has("failure_policy")],
  ].filter(([, present]) => !present);

  return missing.map(([field]) =>
    issue(
      "product_skill.missing_field",
      `Product skill contract is missing required field '${field}'.`,
      path,
    ),
  );
}

export function validateDescriptionSummary(summary: string, path: string): AiCoreIssue[] {
  if (!DESCRIPTION_WORKFLOW_PATTERN.test(summary)) return [];
  return [
    issue(
      "product_skill.description_not_trigger_only",
      "Product skill description.summary must describe trigger semantics only, not workflow or loading instructions.",
      path,
    ),
  ];
}
