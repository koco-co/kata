import type { AiCoreIssue } from "../types.ts";
import type { ParsedKeyValue, ParsedScalar, ProductSkillParserScope } from "./types.ts";
import { issue, KEY_PATTERN, pathKey } from "./types.ts";

export function parseKeyValue(line: string, lineNumber: number, path: string): ParsedKeyValue {
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

export function parseScalar(value: string, lineNumber: number, path: string): ParsedScalar {
  const unsupported = unsupportedScalarIssue(value, lineNumber, path);
  if (unsupported) return { ok: false, issue: unsupported };
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

function unsupportedScalarIssue(
  value: string,
  lineNumber: number,
  path: string,
): AiCoreIssue | undefined {
  if (/^[|>]/.test(value)) {
    return issue(
      "yaml.unsupported_block_scalar",
      `Block scalar is unsupported at line ${lineNumber}.`,
      path,
    );
  }
  if (/^[[{]/.test(value)) {
    return issue(
      "yaml.unsupported_flow_collection",
      `Flow collection is unsupported at line ${lineNumber}.`,
      path,
    );
  }
  if (value.startsWith("#") || /\s#/.test(value)) {
    return issue(
      "yaml.unsupported_inline_comment",
      `Inline comments are unsupported at line ${lineNumber}.`,
      path,
    );
  }
  return /^[&*!]/.test(value)
    ? issue(
        "yaml.unsupported_node_modifier",
        `YAML anchors, aliases, and tags are unsupported at line ${lineNumber}.`,
        path,
      )
    : undefined;
}

export function parseScalarListItem(value: string, lineNumber: number, path: string): ParsedScalar {
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

export function addMapKey(
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

export function isContextBudgetPath(path: string[]): boolean {
  return path[0] === "context_budget";
}

export function containerKindFor(path: string[]): ProductSkillParserScope["kind"] {
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
