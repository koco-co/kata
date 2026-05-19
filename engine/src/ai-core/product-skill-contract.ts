import type { AiCoreIssue, AiCoreResult } from "./types.ts";

export type SkillReference = {
  path: string;
  type: string; // "normative" | "informative"
  generatedFrom: string;
  loadPhases: string[];
  purpose: string;
  loadWhen: string;
};

export type SkillFewShot = {
  path: string;
  loadPhases: string[];
  purpose: string;
  loadWhen: string;
  maxTokens: number;
};

export type SkillSection = {
  id: string;
  loadWhen: string;
  summary: string;
};

export type SkillInput = {
  name: string;
  required: string;
  kind: string;
  schema: string;
};

export type SkillCommandAlias = {
  name: string;
  userInvocable: string;
  lifecycle: string;
  sinceVersion: string;
  reason: string;
  removeAfter: string;
};

export type ProductSkillProjectionContract = {
  name: string;
  summary: string;
  mustTriggerWhen: string[];
  mustNotTriggerWhen: string[];
  outputs: string[];
  allowedTools: string[];
  contextBudgetLines: string[];
  alwaysLoad: string[];
  routingSummary: string[];
  sections: SkillSection[];
  inputs: SkillInput[];
  commandAliases: SkillCommandAlias[];
  loadWhen: Array<{ path: string; condition: string }>;
  hardRules: string[];
  references: SkillReference[];
  fewShots: SkillFewShot[];
  evidencePolicy: Record<string, string | string[]>;
  failurePolicy: Record<string, string | string[]>;
  codexOverrides: {
    routingSummary: string[];
    hardRules: string[];
  };
};

type ProductSkillParserScope =
  | { kind: "map"; path: string[]; childIndent: number; seenKeys: Set<string> }
  | { kind: "list"; path: string[]; childIndent: number }
  | {
      kind: "row-field-list";
      path: string[];
      childIndent: number;
      field: string;
      value: Record<string, string | string[]>;
    }
  | { kind: "row-list"; path: string[]; childIndent: number }
  | {
      kind: "row";
      path: string[];
      childIndent: number;
      seenKeys: Set<string>;
      value: Record<string, string | string[]>;
    };

type ParsedKeyValue = { ok: true; key: string; value: string } | { ok: false; issue: AiCoreIssue };

type ParsedScalar = { ok: true; value: string } | { ok: false; issue: AiCoreIssue };

const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const PHASE_PATTERN = /^[a-z][a-z0-9_-]*$/;
const MAX_REFERENCE_PURPOSE_LENGTH = 160;
const DESCRIPTION_WORKFLOW_PATTERN =
  /(先|然后|步骤|执行顺序|workflow|读取|输出|禁止|必须|不得|工具|调用)/i;

function issue(code: string, message: string, path: string): AiCoreIssue {
  return { code, severity: "error", message, path };
}

function pathKey(path: string[]): string {
  return path.join(".");
}

function stringField(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function stringListField(value: string | string[] | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

function isSafeReferencePath(path: string): boolean {
  if (!path.startsWith("references/")) return false;
  if (path.includes("\\") || path.includes("\0")) return false;
  if (path.includes("../") || path.startsWith("../")) return false;
  return path !== "references/" && path !== "references";
}

function validateLoadPhases(phases: string[]): boolean {
  return phases.length > 0 && phases.every((phase) => PHASE_PATTERN.test(phase));
}

function validatePurpose(purpose: string): boolean {
  return purpose.length > 0 && purpose.length <= MAX_REFERENCE_PURPOSE_LENGTH;
}

function parseKeyValue(line: string, lineNumber: number, path: string): ParsedKeyValue {
  if (/^[&*!]/.test(line.trim())) {
    return {
      ok: false,
      issue: issue(
        "yaml.unsupported_node_modifier",
        `YAML anchors, aliases, and tags are unsupported at line ${lineNumber}.`,
        path,
      ),
    };
  }
  if (/^[[{]/.test(line.trim())) {
    return {
      ok: false,
      issue: issue(
        "yaml.unsupported_flow_collection",
        `Flow collection is unsupported at line ${lineNumber}.`,
        path,
      ),
    };
  }
  const separator = line.indexOf(":");
  if (separator === -1) {
    return {
      ok: false,
      issue: issue(
        "yaml.unsupported_indentation",
        `Malformed product skill row at line ${lineNumber}.`,
        path,
      ),
    };
  }
  const key = line.slice(0, separator).trim();
  if (!KEY_PATTERN.test(key)) {
    return {
      ok: false,
      issue: issue(
        "yaml.unsupported_indentation",
        `Invalid product skill key at line ${lineNumber}.`,
        path,
      ),
    };
  }
  return { ok: true, key, value: line.slice(separator + 1).trim() };
}

function parseScalar(value: string, lineNumber: number, path: string): ParsedScalar {
  if (/^[|>]/.test(value)) {
    return {
      ok: false,
      issue: issue(
        "yaml.unsupported_block_scalar",
        `Block scalar is unsupported at line ${lineNumber}.`,
        path,
      ),
    };
  }
  if (/^[[{]/.test(value)) {
    return {
      ok: false,
      issue: issue(
        "yaml.unsupported_flow_collection",
        `Flow collection is unsupported at line ${lineNumber}.`,
        path,
      ),
    };
  }
  if (value.startsWith("#") || /\s#/.test(value)) {
    return {
      ok: false,
      issue: issue(
        "yaml.unsupported_inline_comment",
        `Inline comments are unsupported at line ${lineNumber}.`,
        path,
      ),
    };
  }
  if (/^[&*!]/.test(value)) {
    return {
      ok: false,
      issue: issue(
        "yaml.unsupported_node_modifier",
        `YAML anchors, aliases, and tags are unsupported at line ${lineNumber}.`,
        path,
      ),
    };
  }
  const startsWithQuote = (value.startsWith('"') || value.startsWith("'")) && value.length >= 2;
  const endsWithQuote = (value.endsWith('"') || value.endsWith("'")) && value.length >= 2;
  if (!startsWithQuote && !endsWithQuote) return { ok: true, value };
  if (!startsWithQuote || !endsWithQuote) return { ok: true, value };
  const quote = value[0];
  if (value[value.length - 1] !== quote) {
    return {
      ok: false,
      issue: issue(
        "yaml.unsupported_node_modifier",
        `Mismatched quotes at line ${lineNumber}.`,
        path,
      ),
    };
  }
  return { ok: true, value: value.slice(1, -1) };
}

function parseScalarListItem(value: string, lineNumber: number, path: string): ParsedScalar {
  if (value.length === 0) {
    return {
      ok: false,
      issue: issue(
        "product_skill.missing_field",
        `Product skill scalar list item requires a value at line ${lineNumber}.`,
        path,
      ),
    };
  }
  const parsed = parseScalar(value, lineNumber, path);
  if (!parsed.ok) return parsed;
  const quote = value[0];
  const isQuoted = (quote === '"' || quote === "'") && value.endsWith(quote);
  if (!isQuoted && /:\s|:$/.test(value)) {
    return {
      ok: false,
      issue: issue(
        "product_skill.missing_field",
        `Product skill scalar list item must be a non-empty scalar at line ${lineNumber}.`,
        path,
      ),
    };
  }
  return parsed;
}

function addMapKey(
  scope: Extract<ProductSkillParserScope, { kind: "map" | "row" }>,
  key: string,
  lineNumber: number,
  path: string,
  issues: AiCoreIssue[],
): boolean {
  if (!scope.seenKeys.has(key)) {
    scope.seenKeys.add(key);
    return true;
  }
  issues.push(
    issue(
      "product_skill.duplicate_key",
      `Duplicate product skill key '${key}' at line ${lineNumber}.`,
      path,
    ),
  );
  return false;
}

function isContextBudgetPath(path: string[]): boolean {
  return path[0] === "context_budget";
}

function containerKindFor(path: string[]): ProductSkillParserScope["kind"] {
  const key = pathKey(path);
  if (
    key === "outputs" ||
    key === "allowed_tools" ||
    key === "description.must_trigger_when" ||
    key === "description.must_not_trigger_when" ||
    key === "context_budget.overflow_policy.order" ||
    key === "context_budget.overflow_policy.preserve" ||
    key === "body.always_load.routing_summary" ||
    key === "body.always_load.hard_rules" ||
    key === "body.hard_rules" ||
    key === "body.codex_override.routing_summary" ||
    key === "body.codex_override.hard_rules" ||
    key.startsWith("evidence.") ||
    key.startsWith("failure_policy.")
  ) {
    return "list";
  }
  if (
    key === "command_aliases" ||
    key === "body.load_when" ||
    key === "body.sections" ||
    key === "references" ||
    key === "few_shots"
  ) {
    return "row-list";
  }
  return "map";
}

function ensureInput(contract: ProductSkillProjectionContract, name: string): SkillInput {
  let input = contract.inputs.find((entry) => entry.name === name);
  if (input) return input;
  input = { name, required: "", kind: "", schema: "" };
  contract.inputs.push(input);
  return input;
}

function assignProjectionScalar(
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

function appendProjectionListValue(
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

function assignProjectionMapValue(
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

function finalizeScope(
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
    return;
  }

  if (pk === "references") {
    const refPath = stringField(v.path);
    const type = stringField(v.type);
    const loadWhen = stringField(v.load_when);
    const generatedFrom = stringField(v.generated_from);
    const loadPhases = stringListField(v.load_phases);
    const purpose = stringField(v.purpose);
    if (
      !refPath ||
      !type ||
      !loadWhen ||
      !validateLoadPhases(loadPhases) ||
      !validatePurpose(purpose) ||
      !isSafeReferencePath(refPath)
    ) {
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
      path: refPath,
      type,
      generatedFrom,
      loadPhases,
      purpose,
      loadWhen,
    });
    return;
  }

  if (pk === "command_aliases") {
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
    return;
  }

  if (pk === "few_shots") {
    const shotPath = stringField(v.path);
    const loadWhen = stringField(v.load_when);
    const maxTokens = stringField(v.max_tokens);
    const loadPhases = stringListField(v.load_phases);
    const purpose = stringField(v.purpose);
    if (
      !shotPath ||
      !loadWhen ||
      !maxTokens ||
      !validateLoadPhases(loadPhases) ||
      !validatePurpose(purpose) ||
      !isSafeReferencePath(shotPath)
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
    const mt = parseInt(maxTokens, 10);
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
    contract.fewShots.push({ path: shotPath, loadPhases, purpose, loadWhen, maxTokens: mt });
  }
}

function validateRequiredFields(
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

function validateDescriptionSummary(summary: string, path: string): AiCoreIssue[] {
  if (!DESCRIPTION_WORKFLOW_PATTERN.test(summary)) return [];
  return [
    issue(
      "product_skill.description_not_trigger_only",
      "Product skill description.summary must describe trigger semantics only, not workflow or loading instructions.",
      path,
    ),
  ];
}

export function parseProductSkillContract(
  text: string,
  path: string,
): AiCoreResult<ProductSkillProjectionContract> {
  const issues: AiCoreIssue[] = [];
  const seenRequired = new Set<string>();
  const contract: ProductSkillProjectionContract = {
    name: "",
    summary: "",
    mustTriggerWhen: [],
    mustNotTriggerWhen: [],
    outputs: [],
    allowedTools: [],
    contextBudgetLines: [],
    alwaysLoad: [],
    routingSummary: [],
    sections: [],
    inputs: [],
    commandAliases: [],
    loadWhen: [],
    hardRules: [],
    references: [],
    fewShots: [],
    evidencePolicy: {},
    failurePolicy: {},
    codexOverrides: { routingSummary: [], hardRules: [] },
  };
  const scopes: ProductSkillParserScope[] = [
    { kind: "map", path: [], childIndent: 0, seenKeys: new Set<string>() },
  ];

  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const lineNumber = index + 1;
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;

    const leadingWhitespace = raw.match(/^\s*/)?.[0] ?? "";
    const indent = leadingWhitespace.length;
    if (leadingWhitespace.includes("\t") || indent % 2 !== 0 || indent > 6) {
      issues.push(
        issue(
          "yaml.unsupported_indentation",
          `Unsupported indentation at line ${lineNumber}.`,
          path,
        ),
      );
      continue;
    }

    while (scopes.length > 1 && scopes[scopes.length - 1].childIndent > indent) {
      finalizeScope(scopes.pop() as ProductSkillParserScope, contract, path, issues);
    }

    const parent = scopes[scopes.length - 1];
    if (parent.childIndent !== indent) {
      issues.push(
        issue(
          "yaml.unsupported_indentation",
          `Unsupported indentation at line ${lineNumber}.`,
          path,
        ),
      );
      continue;
    }

    if (isContextBudgetPath(parent.path)) {
      contract.contextBudgetLines.push(raw.replace(/^ {2}/, ""));
    }

    const content = raw.slice(indent);
    if (content.startsWith("-")) {
      if (!content.startsWith("- ")) {
        issues.push(
          issue("yaml.unsupported_indentation", `Malformed list item at line ${lineNumber}.`, path),
        );
        continue;
      }
      if (parent.kind === "list") {
        const parsed = parseScalarListItem(content.slice(2).trim(), lineNumber, path);
        if (!parsed.ok) {
          issues.push(parsed.issue);
          continue;
        }
        appendProjectionListValue(contract, parent.path, parsed.value);
        continue;
      }
      if (parent.kind === "row-field-list") {
        const parsed = parseScalarListItem(content.slice(2).trim(), lineNumber, path);
        if (!parsed.ok) {
          issues.push(parsed.issue);
          continue;
        }
        const current = stringListField(parent.value[parent.field]);
        parent.value[parent.field] = [...current, parsed.value];
        continue;
      }
      if (parent.kind !== "row-list") {
        issues.push(
          issue(
            "yaml.unsupported_indentation",
            `List item has no active product skill list at line ${lineNumber}.`,
            path,
          ),
        );
        continue;
      }

      const rowPath = pathKey(parent.path);
      const parsed = parseKeyValue(content.slice(2), lineNumber, path);
      if (!parsed.ok) {
        const preserveYamlIssue =
          parsed.issue.code === "yaml.unsupported_flow_collection" ||
          parsed.issue.code === "yaml.unsupported_node_modifier";
        const rowIssue =
          rowPath === "body.load_when" && !preserveYamlIssue
            ? issue(
                "product_skill.invalid_load_when",
                `Malformed product skill load_when row at line ${lineNumber}.`,
                path,
              )
            : parsed.issue;
        issues.push(rowIssue);
        continue;
      }
      const scalar = parseScalar(parsed.value, lineNumber, path);
      if (!scalar.ok) {
        issues.push(scalar.issue);
        continue;
      }
      const row: Extract<ProductSkillParserScope, { kind: "row" }> = {
        kind: "row",
        path: parent.path,
        childIndent: indent + 2,
        seenKeys: new Set<string>(),
        value: {},
      };
      addMapKey(row, parsed.key, lineNumber, path, issues);
      if (scalar.value.length > 0) {
        row.value[parsed.key] = scalar.value;
      }
      // load_when rows must start with "path"
      if (rowPath === "body.load_when" && parsed.key !== "path") {
        issues.push(
          issue(
            "product_skill.invalid_load_when",
            `Product skill load_when row must start with path at line ${lineNumber}.`,
            path,
          ),
        );
      }
      scopes.push(row);
      continue;
    }

    const parsed = parseKeyValue(content, lineNumber, path);
    if (!parsed.ok) {
      issues.push(parsed.issue);
      continue;
    }

    if (parent.kind !== "map" && parent.kind !== "row") {
      issues.push(
        issue(
          "yaml.unsupported_indentation",
          `Product skill key/value has no active map at line ${lineNumber}.`,
          path,
        ),
      );
      continue;
    }
    if (!addMapKey(parent, parsed.key, lineNumber, path, issues)) continue;

    const fullPath = [...parent.path, parsed.key];
    if (parsed.value.length > 0) {
      const scalar = parseScalar(parsed.value, lineNumber, path);
      if (!scalar.ok) {
        issues.push(scalar.issue);
        continue;
      }
      if (parent.kind === "row") {
        parent.value[parsed.key] = scalar.value;
        continue;
      }
      assignProjectionScalar(contract, fullPath, scalar.value);
      assignProjectionMapValue(contract, fullPath, scalar.value);
      continue;
    }

    if (parent.kind === "row") {
      // allow empty values for row sub-keys that will be filled by nested lists
      if (parsed.key === "load_phases") {
        parent.value[parsed.key] = [];
        scopes.push({
          kind: "row-field-list",
          path: fullPath,
          childIndent: indent + 2,
          field: parsed.key,
          value: parent.value,
        });
        continue;
      }
      if (parsed.key === "guidance_steps") {
        continue;
      }
      issues.push(
        issue(
          "product_skill.invalid_load_when",
          `Product skill row field requires a scalar at line ${lineNumber}.`,
          path,
        ),
      );
      continue;
    }

    const kind = containerKindFor(fullPath);
    if (kind === "row") {
      issues.push(
        issue(
          "yaml.unsupported_indentation",
          `Unsupported product skill row container at line ${lineNumber}.`,
          path,
        ),
      );
      continue;
    }
    if (pathKey(fullPath) !== "body.load_when") seenRequired.add(pathKey(fullPath));
    scopes.push(
      kind === "map"
        ? { kind, path: fullPath, childIndent: indent + 2, seenKeys: new Set<string>() }
        : { kind, path: fullPath, childIndent: indent + 2 },
    );
  }

  while (scopes.length > 1) {
    finalizeScope(scopes.pop() as ProductSkillParserScope, contract, path, issues);
  }

  // Allow always_load to be a map (design format) — mark seenRequired for validation
  if (seenRequired.has("body.always_load") && contract.routingSummary.length > 0) {
    // body.always_load was parsed as a map (new format); mark sub-fields
    seenRequired.add("body.always_load.routing_summary");
  }

  issues.push(...validateRequiredFields(contract, seenRequired, path));
  issues.push(...validateDescriptionSummary(contract.summary, path));
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, value: contract, issues: [] };
}
