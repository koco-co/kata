import type { AiCoreIssue, AiCoreResult } from "../types.ts";
import {
  appendProjectionListValue,
  assignProjectionMapValue,
  assignProjectionScalar,
} from "./projection-fields.ts";
import {
  addMapKey,
  containerKindFor,
  isContextBudgetPath,
  parseKeyValue,
  parseScalar,
  parseScalarListItem,
} from "./scalar-parser.ts";
import { finalizeScope, validateDescriptionSummary, validateRequiredFields } from "./scope.ts";
import type { ProductSkillParserScope, ProductSkillProjectionContract } from "./types.ts";
import { issue, pathKey, stringListField } from "./types.ts";

type ProductSkillParseContext = {
  contract: ProductSkillProjectionContract;
  issues: AiCoreIssue[];
  path: string;
  scopes: ProductSkillParserScope[];
  seenRequired: Set<string>;
};

export function parseProductSkillContract(
  text: string,
  path: string,
): AiCoreResult<ProductSkillProjectionContract> {
  const context = createProductSkillParseContext(path);
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    processProductSkillLine(context, raw, index + 1);
  }
  closeProductSkillScopes(context, 0, true);
  markAlwaysLoadRoutingSummary(context);

  context.issues.push(...validateRequiredFields(context.contract, context.seenRequired, path));
  context.issues.push(...validateDescriptionSummary(context.contract.summary, path));
  if (context.issues.length > 0) return { ok: false, issues: context.issues };
  return { ok: true, value: context.contract, issues: [] };
}

function createProductSkillParseContext(path: string): ProductSkillParseContext {
  return {
    path,
    issues: [],
    seenRequired: new Set<string>(),
    contract: {
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
    },
    scopes: [{ kind: "map", path: [], childIndent: 0, seenKeys: new Set<string>() }],
  };
}

function processProductSkillLine(
  context: ProductSkillParseContext,
  raw: string,
  lineNumber: number,
): void {
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.startsWith("#")) return;

  const leadingWhitespace = raw.match(/^\s*/)?.[0] ?? "";
  const indent = leadingWhitespace.length;
  if (leadingWhitespace.includes("\t") || indent % 2 !== 0 || indent > 6) {
    context.issues.push(unsupportedIndentation(lineNumber, context.path));
    return;
  }

  closeProductSkillScopes(context, indent);
  const parent = context.scopes[context.scopes.length - 1];
  if (parent.childIndent !== indent) {
    context.issues.push(unsupportedIndentation(lineNumber, context.path));
    return;
  }

  if (isContextBudgetPath(parent.path)) {
    context.contract.contextBudgetLines.push(raw.replace(/^ {2}/, ""));
  }

  const content = raw.slice(indent);
  if (content.startsWith("-")) {
    processProductSkillListItem(context, parent, content, indent, lineNumber);
    return;
  }
  processProductSkillKeyValue(context, parent, content, indent, lineNumber);
}

function closeProductSkillScopes(
  context: ProductSkillParseContext,
  indent: number,
  closeAll = false,
): void {
  while (context.scopes.length > 1 && (closeAll || context.scopes.at(-1)?.childIndent > indent)) {
    finalizeScope(
      context.scopes.pop() as ProductSkillParserScope,
      context.contract,
      context.path,
      context.issues,
    );
  }
}

function processProductSkillListItem(
  context: ProductSkillParseContext,
  parent: ProductSkillParserScope,
  content: string,
  indent: number,
  lineNumber: number,
): void {
  if (!content.startsWith("- ")) {
    context.issues.push(
      issue(
        "yaml.unsupported_indentation",
        `Malformed list item at line ${lineNumber}.`,
        context.path,
      ),
    );
    return;
  }
  if (parent.kind === "list") {
    appendScalarListItem(context, parent, content, lineNumber);
  } else if (parent.kind === "row-field-list") {
    appendRowFieldListItem(context, parent, content, lineNumber);
  } else if (parent.kind === "row-list") {
    openRowListItem(context, parent, content, indent, lineNumber);
  } else {
    context.issues.push(
      issue(
        "yaml.unsupported_indentation",
        `List item has no active product skill list at line ${lineNumber}.`,
        context.path,
      ),
    );
  }
}

function appendScalarListItem(
  context: ProductSkillParseContext,
  parent: Extract<ProductSkillParserScope, { kind: "list" }>,
  content: string,
  lineNumber: number,
): void {
  const parsed = parseScalarListItem(content.slice(2).trim(), lineNumber, context.path);
  if (!parsed.ok) {
    context.issues.push(parsed.issue);
    return;
  }
  appendProjectionListValue(context.contract, parent.path, parsed.value);
}

function appendRowFieldListItem(
  context: ProductSkillParseContext,
  parent: Extract<ProductSkillParserScope, { kind: "row-field-list" }>,
  content: string,
  lineNumber: number,
): void {
  const parsed = parseScalarListItem(content.slice(2).trim(), lineNumber, context.path);
  if (!parsed.ok) {
    context.issues.push(parsed.issue);
    return;
  }
  const current = stringListField(parent.value[parent.field]);
  parent.value[parent.field] = [...current, parsed.value];
}

function openRowListItem(
  context: ProductSkillParseContext,
  parent: Extract<ProductSkillParserScope, { kind: "row-list" }>,
  content: string,
  indent: number,
  lineNumber: number,
): void {
  const parsed = parseKeyValue(content.slice(2), lineNumber, context.path);
  if (!parsed.ok) {
    context.issues.push(rowListParseIssue(parsed.issue, parent.path, lineNumber, context.path));
    return;
  }
  const scalar = parseScalar(parsed.value, lineNumber, context.path);
  if (!scalar.ok) {
    context.issues.push(scalar.issue);
    return;
  }
  const row: Extract<ProductSkillParserScope, { kind: "row" }> = {
    kind: "row",
    path: parent.path,
    childIndent: indent + 2,
    seenKeys: new Set<string>(),
    value: {},
  };
  addMapKey(row, parsed.key, lineNumber, context.path, context.issues);
  if (scalar.value.length > 0) row.value[parsed.key] = scalar.value;
  validateLoadWhenRowStart(parent.path, parsed.key, lineNumber, context);
  context.scopes.push(row);
}

function processProductSkillKeyValue(
  context: ProductSkillParseContext,
  parent: ProductSkillParserScope,
  content: string,
  indent: number,
  lineNumber: number,
): void {
  const parsed = parseKeyValue(content, lineNumber, context.path);
  if (!parsed.ok) {
    context.issues.push(parsed.issue);
    return;
  }
  if (parent.kind !== "map" && parent.kind !== "row") {
    context.issues.push(
      issue(
        "yaml.unsupported_indentation",
        `Product skill key/value has no active map at line ${lineNumber}.`,
        context.path,
      ),
    );
    return;
  }
  if (!addMapKey(parent, parsed.key, lineNumber, context.path, context.issues)) return;
  const fullPath = [...parent.path, parsed.key];
  if (parsed.value.length > 0) {
    assignProductSkillScalar(context, parent, fullPath, parsed, lineNumber);
    return;
  }
  openProductSkillContainer(context, parent, fullPath, parsed.key, indent, lineNumber);
}

function assignProductSkillScalar(
  context: ProductSkillParseContext,
  parent: Extract<ProductSkillParserScope, { kind: "map" | "row" }>,
  fullPath: string[],
  parsed: { key: string; value: string },
  lineNumber: number,
): void {
  const scalar = parseScalar(parsed.value, lineNumber, context.path);
  if (!scalar.ok) {
    context.issues.push(scalar.issue);
    return;
  }
  if (parent.kind === "row") {
    parent.value[parsed.key] = scalar.value;
    return;
  }
  assignProjectionScalar(context.contract, fullPath, scalar.value);
  assignProjectionMapValue(context.contract, fullPath, scalar.value);
}

function openProductSkillContainer(
  context: ProductSkillParseContext,
  parent: Extract<ProductSkillParserScope, { kind: "map" | "row" }>,
  fullPath: string[],
  key: string,
  indent: number,
  lineNumber: number,
): void {
  if (parent.kind === "row") {
    openRowFieldContainer(context, parent, fullPath, key, indent, lineNumber);
    return;
  }
  const kind = containerKindFor(fullPath);
  if (kind === "row") {
    context.issues.push(
      issue(
        "yaml.unsupported_indentation",
        `Unsupported product skill row container at line ${lineNumber}.`,
        context.path,
      ),
    );
    return;
  }
  if (pathKey(fullPath) !== "body.load_when") context.seenRequired.add(pathKey(fullPath));
  context.scopes.push(
    kind === "map"
      ? { kind, path: fullPath, childIndent: indent + 2, seenKeys: new Set<string>() }
      : { kind, path: fullPath, childIndent: indent + 2 },
  );
}

function openRowFieldContainer(
  context: ProductSkillParseContext,
  parent: Extract<ProductSkillParserScope, { kind: "row" }>,
  fullPath: string[],
  key: string,
  indent: number,
  lineNumber: number,
): void {
  if (key === "load_phases") {
    parent.value[key] = [];
    context.scopes.push({
      kind: "row-field-list",
      path: fullPath,
      childIndent: indent + 2,
      field: key,
      value: parent.value,
    });
    return;
  }
  if (key !== "guidance_steps") {
    context.issues.push(
      issue(
        "product_skill.invalid_load_when",
        `Product skill row field requires a scalar at line ${lineNumber}.`,
        context.path,
      ),
    );
  }
}

function rowListParseIssue(
  parseIssue: AiCoreIssue,
  parentPath: string[],
  lineNumber: number,
  path: string,
): AiCoreIssue {
  const preserveYamlIssue =
    parseIssue.code === "yaml.unsupported_flow_collection" ||
    parseIssue.code === "yaml.unsupported_node_modifier";
  if (pathKey(parentPath) !== "body.load_when" || preserveYamlIssue) return parseIssue;
  return issue(
    "product_skill.invalid_load_when",
    `Malformed product skill load_when row at line ${lineNumber}.`,
    path,
  );
}

function validateLoadWhenRowStart(
  parentPath: string[],
  key: string,
  lineNumber: number,
  context: ProductSkillParseContext,
): void {
  if (pathKey(parentPath) !== "body.load_when" || key === "path") return;
  context.issues.push(
    issue(
      "product_skill.invalid_load_when",
      `Product skill load_when row must start with path at line ${lineNumber}.`,
      context.path,
    ),
  );
}

function unsupportedIndentation(lineNumber: number, path: string): AiCoreIssue {
  return issue(
    "yaml.unsupported_indentation",
    `Unsupported indentation at line ${lineNumber}.`,
    path,
  );
}

function markAlwaysLoadRoutingSummary(context: ProductSkillParseContext): void {
  if (context.seenRequired.has("body.always_load") && context.contract.routingSummary.length > 0) {
    context.seenRequired.add("body.always_load.routing_summary");
  }
}
