import type { AiCoreIssue, AiCoreResult } from "./types.ts";

export type YamlContract = {
  path: string;
  scalars: Map<string, string | true>;
  lists: Map<string, string[]>;
  issues: AiCoreIssue[];
};

export type TopLevelYamlFields = Record<string, string | true>;

type ParsedYamlScalar = { ok: true; value: string } | { ok: false; code: string; message: string };

const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;

function issue(code: string, message: string, path: string): AiCoreIssue {
  return { code, severity: "error", message, path };
}

export function parseYamlContract(text: string, path: string): YamlContract {
  const scalars = new Map<string, string | true>();
  const lists = new Map<string, string[]>();
  const issues: AiCoreIssue[] = [];
  let activeList: string | undefined;

  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const lineNumber = index + 1;
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;

    const listItem = raw.match(/^ {2}-(?:\s+(.*)|\s*)$/);
    if (listItem) {
      if (!activeList) {
        issues.push(
          issue(
            "yaml.list_without_key",
            `List item has no active key at line ${lineNumber}.`,
            path,
          ),
        );
        continue;
      }
      const value = (listItem[1] ?? "").trim();
      if (value.length === 0) {
        issues.push(
          issue(
            "yaml.empty_list_item",
            `List item must contain a string at line ${lineNumber}.`,
            path,
          ),
        );
        continue;
      }
      const parsedValue = parseYamlScalar(value, lineNumber);
      if (!parsedValue.ok) {
        const code =
          parsedValue.code === "yaml.unsupported_inline_mapping"
            ? "yaml.unsupported_mapping_list_item"
            : parsedValue.code;
        const message =
          parsedValue.code === "yaml.unsupported_inline_mapping"
            ? `Mapping list item is unsupported at line ${lineNumber}.`
            : parsedValue.message;
        issues.push(issue(code, message, path));
        continue;
      }
      lists.get(activeList)?.push(parsedValue.value);
      continue;
    }

    if (/^\s/.test(raw)) {
      const leadingWhitespace = raw.match(/^\s*/)?.[0] ?? "";
      if (
        leadingWhitespace.includes("\t") ||
        leadingWhitespace.length === 1 ||
        leadingWhitespace.length >= 3
      ) {
        issues.push(
          issue(
            "yaml.unsupported_indentation",
            `Unsupported indentation at line ${lineNumber}.`,
            path,
          ),
        );
        continue;
      }
      issues.push(
        issue(
          "yaml.unsupported_nested_structure",
          `Unsupported nested structure at line ${lineNumber}.`,
          path,
        ),
      );
      continue;
    }

    activeList = undefined;
    const separator = raw.indexOf(":");
    if (separator === -1) {
      issues.push(issue("yaml.malformed_line", `Missing ':' at line ${lineNumber}.`, path));
      continue;
    }

    const key = raw.slice(0, separator).trim();
    const value = raw.slice(separator + 1).trim();
    if (!KEY_PATTERN.test(key)) {
      issues.push(issue("yaml.invalid_key", `Invalid key '${key}' at line ${lineNumber}.`, path));
      continue;
    }
    if (scalars.has(key) || lists.has(key)) {
      issues.push(
        issue("yaml.duplicate_key", `Duplicate key '${key}' at line ${lineNumber}.`, path),
      );
      continue;
    }
    if (value.length === 0) {
      activeList = key;
      lists.set(key, []);
      continue;
    }
    if (value === "[]") {
      lists.set(key, []);
      continue;
    }

    const parsedValue = parseYamlScalar(value, lineNumber);
    if (!parsedValue.ok) {
      issues.push(issue(parsedValue.code, parsedValue.message, path));
      continue;
    }
    scalars.set(key, parsedValue.value);
  }

  return { path, scalars, lists, issues };
}

export function parseYamlRows(
  text: string,
  path: string,
  listKey: string,
): AiCoreResult<Array<Record<string, string>>> {
  const rows: Array<Record<string, string>> = [];
  const issues: AiCoreIssue[] = [];
  let activeTopLevelList: string | undefined;
  let currentRow: Record<string, string> | undefined;
  let currentRowKeys = new Set<string>();
  let activeNestedList: string | undefined;
  const topLevelKeys = new Set<string>();

  function pushCurrentRow(): void {
    if (!currentRow) return;
    rows.push(currentRow);
  }

  function assignCurrentRowValue(key: string, value: string, lineNumber: number): void {
    if (!currentRow) {
      issues.push(
        issue(
          "yaml.row_field_without_row",
          `Row field has no active row at line ${lineNumber}.`,
          path,
        ),
      );
      return;
    }
    if (currentRowKeys.has(key)) {
      issues.push(
        issue("yaml.duplicate_key", `Duplicate row key '${key}' at line ${lineNumber}.`, path),
      );
      return;
    }
    currentRowKeys.add(key);
    currentRow[key] = value;
  }

  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const lineNumber = index + 1;
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;

    const leadingWhitespace = raw.match(/^\s*/)?.[0] ?? "";
    if (leadingWhitespace.includes("\t") || ![0, 2, 4, 6].includes(leadingWhitespace.length)) {
      issues.push(
        issue(
          "yaml.unsupported_indentation",
          `Unsupported indentation at line ${lineNumber}.`,
          path,
        ),
      );
      continue;
    }

    if (leadingWhitespace.length === 0) {
      const parsed = parseKeyValueLine(raw, lineNumber, path);
      if (!parsed.ok) {
        issues.push(parsed.issue);
        continue;
      }
      pushCurrentRow();
      currentRow = undefined;
      currentRowKeys = new Set<string>();
      activeNestedList = undefined;
      if (topLevelKeys.has(parsed.key)) {
        issues.push(
          issue("yaml.duplicate_key", `Duplicate key '${parsed.key}' at line ${lineNumber}.`, path),
        );
        activeTopLevelList = undefined;
        continue;
      }
      topLevelKeys.add(parsed.key);
      if (parsed.key === listKey) {
        if (parsed.value === "") {
          activeTopLevelList = parsed.key;
          continue;
        }
        if (parsed.value === "[]") {
          activeTopLevelList = undefined;
          continue;
        }
        const parsedValue = parseYamlScalar(parsed.value, lineNumber);
        if (!parsedValue.ok) issues.push(issue(parsedValue.code, parsedValue.message, path));
        else
          issues.push(
            issue(
              "yaml.expected_row_list",
              `Expected '${listKey}' to be a row list at line ${lineNumber}.`,
              path,
            ),
          );
        continue;
      }
      activeTopLevelList = undefined;
      if (parsed.value.length === 0) continue;
      const parsedValue = parseYamlScalar(parsed.value, lineNumber);
      if (!parsedValue.ok) issues.push(issue(parsedValue.code, parsedValue.message, path));
      continue;
    }

    if (activeTopLevelList !== listKey) {
      issues.push(
        issue(
          "yaml.unsupported_nested_structure",
          `Unsupported nested structure at line ${lineNumber}.`,
          path,
        ),
      );
      continue;
    }

    if (leadingWhitespace.length === 2) {
      const listItem = raw.match(/^ {2}-\s+(.+)$/);
      if (!listItem) {
        issues.push(
          issue(
            "yaml.malformed_row",
            `Row list item must contain a key/value pair at line ${lineNumber}.`,
            path,
          ),
        );
        continue;
      }
      pushCurrentRow();
      currentRow = {};
      currentRowKeys = new Set<string>();
      activeNestedList = undefined;
      const parsed = parseKeyValueLine(listItem[1], lineNumber, path);
      if (!parsed.ok) {
        issues.push(parsed.issue);
        continue;
      }
      if (parsed.value.length === 0) {
        assignCurrentRowValue(parsed.key, "", lineNumber);
        activeNestedList = parsed.key;
        continue;
      }
      const parsedValue = parseYamlScalar(parsed.value, lineNumber);
      if (!parsedValue.ok) {
        issues.push(issue(parsedValue.code, parsedValue.message, path));
        continue;
      }
      assignCurrentRowValue(parsed.key, parsedValue.value, lineNumber);
      continue;
    }

    if (!currentRow) {
      issues.push(
        issue(
          "yaml.row_field_without_row",
          `Row field has no active row at line ${lineNumber}.`,
          path,
        ),
      );
      continue;
    }

    if (leadingWhitespace.length === 4) {
      const parsed = parseKeyValueLine(trimmed, lineNumber, path);
      if (!parsed.ok) {
        issues.push(parsed.issue);
        continue;
      }
      if (parsed.value.length === 0) {
        if (currentRowKeys.has(parsed.key)) {
          issues.push(
            issue(
              "yaml.duplicate_key",
              `Duplicate row key '${parsed.key}' at line ${lineNumber}.`,
              path,
            ),
          );
          continue;
        }
        currentRowKeys.add(parsed.key);
        currentRow[parsed.key] = "";
        activeNestedList = parsed.key;
        continue;
      }
      activeNestedList = undefined;
      const parsedValue = parseYamlScalar(parsed.value, lineNumber);
      if (!parsedValue.ok) {
        issues.push(issue(parsedValue.code, parsedValue.message, path));
        continue;
      }
      assignCurrentRowValue(parsed.key, parsedValue.value, lineNumber);
      continue;
    }

    const nestedItem = raw.match(/^ {6}-\s+(.+)$/);
    if (!activeNestedList || !nestedItem) {
      issues.push(
        issue(
          "yaml.unsupported_nested_structure",
          `Unsupported nested structure at line ${lineNumber}.`,
          path,
        ),
      );
      continue;
    }
    const parsedValue = parseYamlScalar(nestedItem[1].trim(), lineNumber);
    if (!parsedValue.ok) {
      issues.push(issue(parsedValue.code, parsedValue.message, path));
      continue;
    }
    currentRow[activeNestedList] = appendNestedListValue(
      currentRow[activeNestedList],
      parsedValue.value,
    );
  }

  pushCurrentRow();
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, value: rows, issues: [] };
}

export function parseYamlTopLevelScalars(
  text: string,
  path: string,
): AiCoreResult<Record<string, string>> {
  const values: Record<string, string> = {};
  const issues: AiCoreIssue[] = [];
  const seen = new Set<string>();
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const lineNumber = index + 1;
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
    if (/^\s/.test(raw)) continue;
    const parsed = parseKeyValueLine(raw, lineNumber, path);
    if (!parsed.ok) {
      issues.push(parsed.issue);
      continue;
    }
    if (seen.has(parsed.key)) {
      issues.push(
        issue("yaml.duplicate_key", `Duplicate key '${parsed.key}' at line ${lineNumber}.`, path),
      );
      continue;
    }
    seen.add(parsed.key);
    if (parsed.value.length === 0 || parsed.value === "[]") continue;
    const parsedValue = parseYamlScalar(parsed.value, lineNumber);
    if (!parsedValue.ok) {
      issues.push(issue(parsedValue.code, parsedValue.message, path));
      continue;
    }
    values[parsed.key] = parsedValue.value;
  }
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, value: values, issues: [] };
}

function appendNestedListValue(current: string | undefined, value: string): string {
  return current && current.length > 0 ? `${current}\n${value}` : value;
}

function parseKeyValueLine(
  line: string,
  lineNumber: number,
  path: string,
): { ok: true; key: string; value: string } | { ok: false; issue: AiCoreIssue } {
  const separator = line.indexOf(":");
  if (separator === -1) {
    return {
      ok: false,
      issue: issue("yaml.malformed_line", `Missing ':' at line ${lineNumber}.`, path),
    };
  }
  const key = line.slice(0, separator).trim();
  if (!KEY_PATTERN.test(key)) {
    return {
      ok: false,
      issue: issue("yaml.invalid_key", `Invalid key '${key}' at line ${lineNumber}.`, path),
    };
  }
  return { ok: true, key, value: line.slice(separator + 1).trim() };
}

function parseYamlScalar(value: string, lineNumber: number): ParsedYamlScalar {
  if (/^[|>]/.test(value)) {
    return {
      ok: false,
      code: "yaml.unsupported_block_scalar",
      message: `Block scalar is unsupported at line ${lineNumber}.`,
    };
  }
  if (/^[[{]/.test(value)) {
    return {
      ok: false,
      code: "yaml.unsupported_flow_collection",
      message: `Flow collection is unsupported at line ${lineNumber}.`,
    };
  }

  const startsWithQuote = value.startsWith('"') || value.startsWith("'");
  const endsWithQuote = value.endsWith('"') || value.endsWith("'");
  if (startsWithQuote || endsWithQuote) {
    const quote = value[0];
    if ((quote !== '"' && quote !== "'") || value.length < 2 || !value.endsWith(quote)) {
      return {
        ok: false,
        code: "yaml.malformed_quoted_scalar",
        message: `Malformed quoted scalar at line ${lineNumber}.`,
      };
    }
    return { ok: true, value: value.slice(1, -1) };
  }

  if (hasUnquotedInlineMapping(value)) {
    return {
      ok: false,
      code: "yaml.unsupported_inline_mapping",
      message: `Inline mapping syntax is unsupported at line ${lineNumber}.`,
    };
  }
  if (/\s#/.test(value)) {
    return {
      ok: false,
      code: "yaml.unsupported_inline_comment",
      message: `Inline comments are unsupported at line ${lineNumber}.`,
    };
  }
  if (/^[&*!]/.test(value)) {
    return {
      ok: false,
      code: "yaml.unsupported_node_modifier",
      message: `YAML anchors, aliases, and tags are unsupported at line ${lineNumber}.`,
    };
  }

  return { ok: true, value };
}

function hasUnquotedInlineMapping(value: string): boolean {
  return /:\s/.test(value);
}

// Compatibility facade for legacy top-level checks: extracts top-level scalar
// values and list markers from richer contracts, intentionally ignoring valid
// nested contract bodies while still rejecting malformed indentation and
// unsupported top-level scalar syntax.
export function parseTopLevelYamlFieldsCompat(
  text: string,
  path = "inline.yaml",
): TopLevelYamlFields {
  const fields: TopLevelYamlFields = {};
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const lineNumber = index + 1;
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;

    if (/^\s/.test(raw)) {
      const leadingWhitespace = raw.match(/^\s*/)?.[0] ?? "";
      if (leadingWhitespace.includes("\t") || leadingWhitespace.length % 2 !== 0) {
        throwYamlError(
          "yaml.unsupported_indentation",
          `Unsupported indentation at line ${lineNumber}.`,
          path,
        );
      }
      continue;
    }

    const separator = raw.indexOf(":");
    if (separator === -1) {
      throwYamlError("yaml.malformed_line", `Missing ':' at line ${lineNumber}.`, path);
    }

    const key = raw.slice(0, separator).trim();
    const value = raw.slice(separator + 1).trim();
    if (!KEY_PATTERN.test(key)) {
      throwYamlError("yaml.invalid_key", `Invalid key '${key}' at line ${lineNumber}.`, path);
    }
    if (Object.hasOwn(fields, key)) {
      throwYamlError("yaml.duplicate_key", `Duplicate key '${key}' at line ${lineNumber}.`, path);
    }
    if (value.length === 0) {
      fields[key] = true;
      continue;
    }

    const parsedValue = parseYamlScalar(value, lineNumber);
    if (!parsedValue.ok) {
      throwYamlError(parsedValue.code, parsedValue.message, path);
    }
    fields[key] = parsedValue.value;
  }
  return fields;
}

function throwYamlError(code: string, message: string, path: string): never {
  throw new Error(`${code}: ${message} (${path})`);
}

export function yamlIssues(contract: YamlContract): AiCoreIssue[] {
  return contract.issues;
}

function assertNoYamlIssues(contract: YamlContract): void {
  if (contract.issues.length === 0) return;
  throw new Error(
    contract.issues.map((issue) => `${issue.code}: ${issue.message} (${issue.path})`).join("; "),
  );
}

export function readRequiredScalar(contract: YamlContract, key: string): string {
  assertNoYamlIssues(contract);
  const value = contract.scalars.get(key);
  if (typeof value === "string") return value;
  throw new Error(`Missing required scalar ${key} in ${contract.path}`);
}

export function readOptionalScalar(contract: YamlContract, key: string): string | undefined {
  assertNoYamlIssues(contract);
  const value = contract.scalars.get(key);
  return typeof value === "string" ? value : undefined;
}

export function readRequiredStringList(contract: YamlContract, key: string): string[] {
  assertNoYamlIssues(contract);
  const value = contract.lists.get(key);
  if (value) return value;
  throw new Error(`Missing required list ${key} in ${contract.path}`);
}

export function readOptionalStringList(contract: YamlContract, key: string): string[] {
  assertNoYamlIssues(contract);
  return contract.lists.get(key) ?? [];
}
