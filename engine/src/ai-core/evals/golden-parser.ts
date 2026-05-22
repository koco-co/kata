import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "../paths.ts";
import type { AiCoreIssue, AiCoreResult } from "../types.ts";
import { parseYamlContract, parseYamlRows, yamlIssues } from "../yaml-contract.ts";
import { throwGoldenParseError } from "./fixtures.ts";
import type {
  EvalContext,
  GaRuntimeGoldenCaseKind,
  GoldenNormalizeResult,
  GoldenSuite,
  GoldenSuiteId,
  P0GoldenCase,
  P0GoldenCaseKind,
  P0GoldenStatus,
  P0GoldenSuite,
  RawCase,
} from "./types.ts";
import {
  blockScalarIssue,
  CASE_FIELDS,
  EXPECTED_FIELDS,
  GA_RUNTIME_KINDS,
  GOLDEN_FILE,
  GOLDEN_TOP_LEVEL_FIELDS,
  goldenIssue,
  INPUT_FIELDS,
  p0Root,
  parseGoldenKeyValue,
} from "./types.ts";

type GoldenNormalizeContext = {
  normalized: string[];
  topLevel: string[];
  issues: AiCoreIssue[];
  path: string;
  sawCases: boolean;
  currentCase: boolean;
  activeSection?: "input" | "expected";
  activeList?: "rule_ids" | "required_messages";
  activeListHasItems: boolean;
  activeListLineNumber: number;
  seenSectionKeys: Set<"input" | "expected">;
};

export function normalizeGoldenRows(text: string, path: string): GoldenNormalizeResult {
  const context = createGoldenNormalizeContext(path);
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    normalizeGoldenLine(context, raw, index + 1);
  }
  closeGoldenActiveList(context);

  return {
    normalizedText: context.normalized.join("\n"),
    topLevelText: context.topLevel.join("\n"),
    sawCases: context.sawCases,
    issues: context.issues,
  };
}

function createGoldenNormalizeContext(path: string): GoldenNormalizeContext {
  return {
    normalized: [],
    topLevel: [],
    issues: [],
    path,
    sawCases: false,
    currentCase: false,
    activeListHasItems: false,
    activeListLineNumber: 0,
    seenSectionKeys: new Set<"input" | "expected">(),
  };
}

function normalizeGoldenLine(
  context: GoldenNormalizeContext,
  raw: string,
  lineNumber: number,
): void {
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.startsWith("#")) return;

  const leadingWhitespace = raw.match(/^\s*/)?.[0] ?? "";
  if (leadingWhitespace.includes("\t") || ![0, 2, 4, 6, 8].includes(leadingWhitespace.length)) {
    context.issues.push(
      goldenIssue(
        "yaml.unsupported_indentation",
        `Unsupported indentation at line ${lineNumber}.`,
        context.path,
      ),
    );
    return;
  }
  if (leadingWhitespace.length === 0) {
    normalizeTopLevelGoldenLine(context, raw, lineNumber);
  } else if (!context.sawCases) {
    context.issues.push(
      goldenIssue(
        "yaml.unsupported_nested_structure",
        `Golden case row appears before cases at line ${lineNumber}.`,
        context.path,
      ),
    );
  } else if (leadingWhitespace.length === 2) {
    normalizeGoldenCaseRow(context, raw, lineNumber);
  } else if (!context.currentCase) {
    context.issues.push(
      goldenIssue(
        "yaml.row_field_without_row",
        `Golden case field has no active row at line ${lineNumber}.`,
        context.path,
      ),
    );
  } else if (leadingWhitespace.length === 4) {
    normalizeGoldenCaseField(context, trimmed, lineNumber);
  } else if (leadingWhitespace.length === 6) {
    normalizeGoldenSectionField(context, trimmed, lineNumber);
  } else {
    normalizeGoldenExpectedListItem(context, raw, lineNumber);
  }
}

function closeGoldenActiveList(context: GoldenNormalizeContext): void {
  if (context.activeList && !context.activeListHasItems) {
    context.issues.push(
      goldenIssue(
        "evals.golden_empty_expected_list",
        `Golden expected list '${context.activeList}' must contain at least one item at line ${context.activeListLineNumber}.`,
        context.path,
      ),
    );
  }
  context.activeList = undefined;
  context.activeListHasItems = false;
  context.activeListLineNumber = 0;
}

function normalizeTopLevelGoldenLine(
  context: GoldenNormalizeContext,
  raw: string,
  lineNumber: number,
): void {
  closeGoldenActiveList(context);
  context.currentCase = false;
  context.activeSection = undefined;
  context.seenSectionKeys = new Set();
  const parsed = parseGoldenKeyValue(raw, lineNumber, context.path);
  if (!parsed.ok) {
    context.issues.push(parsed.issue);
    return;
  }
  if (!GOLDEN_TOP_LEVEL_FIELDS.has(parsed.key)) {
    context.issues.push(
      goldenIssue(
        "evals.golden_unknown_field",
        `Unknown p0 golden field: ${parsed.key}`,
        context.path,
      ),
    );
    return;
  }
  if (parsed.key === "cases" && parsed.value.length === 0) context.sawCases = true;
  const row = `${parsed.key}:${parsed.value.length > 0 ? ` ${parsed.value}` : ""}`;
  context.normalized.push(row);
  context.topLevel.push(row);
}

function normalizeGoldenCaseRow(
  context: GoldenNormalizeContext,
  raw: string,
  lineNumber: number,
): void {
  closeGoldenActiveList(context);
  const item = raw.match(/^ {2}-\s+(.+)$/);
  if (!item) {
    context.issues.push(
      goldenIssue(
        "yaml.malformed_row",
        `Golden case row must contain a key/value pair at line ${lineNumber}.`,
        context.path,
      ),
    );
    return;
  }
  const parsed = parseGoldenKeyValue(item[1], lineNumber, context.path);
  if (!parsed.ok) {
    context.issues.push(parsed.issue);
    return;
  }
  if (!CASE_FIELDS.has(parsed.key)) {
    context.issues.push(
      goldenIssue(
        "evals.golden_unknown_case_field",
        `Unknown p0 golden case field: ${parsed.key}`,
        context.path,
      ),
    );
    return;
  }
  context.currentCase = true;
  context.activeSection = undefined;
  context.seenSectionKeys = new Set();
  context.normalized.push(`  - ${parsed.key}:${parsed.value.length > 0 ? ` ${parsed.value}` : ""}`);
}

function normalizeGoldenCaseField(
  context: GoldenNormalizeContext,
  trimmed: string,
  lineNumber: number,
): void {
  closeGoldenActiveList(context);
  const parsed = parseGoldenKeyValue(trimmed, lineNumber, context.path);
  if (!parsed.ok) {
    context.issues.push(parsed.issue);
    return;
  }
  if (parsed.key === "input" || parsed.key === "expected") {
    openGoldenSection(context, parsed.key, parsed.value, lineNumber);
    return;
  }
  context.activeSection = undefined;
  if (!CASE_FIELDS.has(parsed.key)) {
    context.issues.push(
      goldenIssue(
        "evals.golden_unknown_case_field",
        `Unknown p0 golden case field: ${parsed.key}`,
        context.path,
      ),
    );
    return;
  }
  context.normalized.push(`    ${parsed.key}:${parsed.value.length > 0 ? ` ${parsed.value}` : ""}`);
}

function openGoldenSection(
  context: GoldenNormalizeContext,
  key: "input" | "expected",
  value: string,
  lineNumber: number,
): void {
  if (context.seenSectionKeys.has(key)) {
    context.issues.push(
      goldenIssue(
        "yaml.duplicate_key",
        `Duplicate golden section '${key}' at line ${lineNumber}.`,
        context.path,
      ),
    );
    context.activeSection = undefined;
    return;
  }
  context.seenSectionKeys.add(key);
  const blockScalar = blockScalarIssue(value, lineNumber, context.path);
  if (blockScalar) context.issues.push(blockScalar);
  if (value.length === 0) {
    context.activeSection = key;
    return;
  }
  if (!blockScalar) {
    context.issues.push(
      goldenIssue(
        "yaml.unsupported_section_value",
        `Golden section '${key}' must be a nested mapping at line ${lineNumber}.`,
        context.path,
      ),
    );
  }
  context.activeSection = undefined;
}

function normalizeGoldenSectionField(
  context: GoldenNormalizeContext,
  trimmed: string,
  lineNumber: number,
): void {
  closeGoldenActiveList(context);
  if (!context.activeSection) {
    context.issues.push(
      goldenIssue(
        "yaml.unsupported_nested_structure",
        `Golden nested field has no active section at line ${lineNumber}.`,
        context.path,
      ),
    );
    return;
  }
  const parsed = parseGoldenKeyValue(trimmed, lineNumber, context.path);
  if (!parsed.ok) {
    context.issues.push(parsed.issue);
    return;
  }
  if (context.activeSection === "input") {
    normalizeGoldenInputField(context, parsed.key, parsed.value);
  } else {
    normalizeGoldenExpectedField(context, parsed.key, parsed.value, lineNumber);
  }
}

function normalizeGoldenInputField(
  context: GoldenNormalizeContext,
  key: string,
  value: string,
): void {
  context.activeList = undefined;
  if (!INPUT_FIELDS.has(key)) {
    context.issues.push(
      goldenIssue(
        "evals.golden_unknown_input_field",
        `Unknown p0 golden input field: ${key}`,
        context.path,
      ),
    );
    return;
  }
  context.normalized.push(`    ${key}:${value.length > 0 ? ` ${value}` : ""}`);
}

function normalizeGoldenExpectedField(
  context: GoldenNormalizeContext,
  key: string,
  value: string,
  lineNumber: number,
): void {
  if (!EXPECTED_FIELDS.has(key)) {
    context.issues.push(
      goldenIssue(
        "evals.golden_unknown_expected_field",
        `Unknown p0 golden expected field: ${key}`,
        context.path,
      ),
    );
    return;
  }
  if (key === "rule_ids" || key === "required_messages") {
    openGoldenExpectedList(context, key, value, lineNumber);
    return;
  }
  const normalizedKey = key === "status" ? "expected_status" : key;
  context.normalized.push(`    ${normalizedKey}:${value.length > 0 ? ` ${value}` : ""}`);
}

function openGoldenExpectedList(
  context: GoldenNormalizeContext,
  key: "rule_ids" | "required_messages",
  value: string,
  lineNumber: number,
): void {
  if (value.length > 0) {
    context.issues.push(
      goldenIssue(
        "yaml.unsupported_inline_list_value",
        `Golden expected list '${key}' must use nested list items at line ${lineNumber}.`,
        context.path,
      ),
    );
    return;
  }
  context.activeList = key;
  context.activeListHasItems = false;
  context.activeListLineNumber = lineNumber;
  context.normalized.push(`    ${key}:`);
}

function normalizeGoldenExpectedListItem(
  context: GoldenNormalizeContext,
  raw: string,
  lineNumber: number,
): void {
  if (context.activeSection !== "expected" || !context.activeList) {
    context.issues.push(
      goldenIssue(
        "yaml.unsupported_nested_structure",
        `Unsupported nested structure at line ${lineNumber}.`,
        context.path,
      ),
    );
    return;
  }
  const item = raw.match(/^ {8}-\s+(.+)$/);
  if (!item) {
    context.issues.push(
      goldenIssue(
        "yaml.malformed_row",
        `Golden expected list item is malformed at line ${lineNumber}.`,
        context.path,
      ),
    );
    return;
  }
  context.activeListHasItems = true;
  context.normalized.push(`      - ${item[1].trim()}`);
}

export function splitGoldenList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split("\n").filter((item) => item.length > 0);
}

export function rawCaseFromRow(row: Record<string, string>): RawCase {
  return {
    id: row.id,
    subset: row.subset,
    kind: row.kind,
    input: row.fixture === undefined ? undefined : { fixture: row.fixture },
    expected: {
      status: row.expected_status,
      rule_ids: splitGoldenList(row.rule_ids),
      skill_id: row.skill_id,
      command_alias: row.command_alias,
      required_messages:
        row.required_messages === undefined ? undefined : splitGoldenList(row.required_messages),
    },
  };
}

export function validateGoldenCase(
  testCase: RawCase,
  suite: GoldenSuiteId,
  index: number,
  seenIds: Set<string>,
  path: string,
): AiCoreIssue[] {
  const issues: AiCoreIssue[] = [];
  const caseLabel = testCase.id && testCase.id.length > 0 ? testCase.id : `row ${index + 1}`;
  issues.push(...validateGoldenCaseId(testCase, index, seenIds, path));
  issues.push(...validateGoldenCaseRequiredFields(testCase, caseLabel, path));
  issues.push(...validateGoldenCaseExpectedStatus(testCase, caseLabel, path));
  issues.push(...validateGoldenCaseKind(testCase, suite, path));
  return issues;
}

function validateGoldenCaseId(
  testCase: RawCase,
  index: number,
  seenIds: Set<string>,
  path: string,
): AiCoreIssue[] {
  if (!testCase.id) {
    return [
      goldenIssue(
        "evals.golden_missing_case_id",
        `Missing golden case id at row ${index + 1}.`,
        path,
      ),
    ];
  }
  if (seenIds.has(testCase.id)) {
    return [
      goldenIssue(
        "evals.golden_duplicate_case_id",
        `Duplicate golden case id: ${testCase.id}`,
        path,
      ),
    ];
  }
  seenIds.add(testCase.id);
  return [];
}

function validateGoldenCaseRequiredFields(
  testCase: RawCase,
  caseLabel: string,
  path: string,
): AiCoreIssue[] {
  if (!testCase.subset || !testCase.kind || !testCase.input || !testCase.expected) {
    return [
      goldenIssue(
        "evals.golden_case_missing_required_field",
        `Invalid p0 golden case: missing required fields for ${caseLabel}`,
        path,
      ),
    ];
  }
  return [];
}

function validateGoldenCaseExpectedStatus(
  testCase: RawCase,
  caseLabel: string,
  path: string,
): AiCoreIssue[] {
  if (!testCase.expected?.status) {
    return [
      goldenIssue(
        "evals.golden_missing_expected_status",
        `Missing golden expected status for ${caseLabel}.`,
        path,
      ),
    ];
  }
  if (testCase.expected.status !== "passed" && testCase.expected.status !== "blocked") {
    return [
      goldenIssue(
        "evals.golden_invalid_expected_status",
        `Invalid p0 golden expected status for ${caseLabel}`,
        path,
      ),
    ];
  }
  return [];
}

function validateGoldenCaseKind(
  testCase: RawCase,
  suite: GoldenSuiteId,
  path: string,
): AiCoreIssue[] {
  if (!testCase.kind) return [];
  if (suite === "ga-runtime" && !isGaRuntimeCaseKind(testCase.kind)) {
    return [
      goldenIssue(
        "evals.golden_invalid_case_kind",
        `Invalid ga-runtime golden case kind: ${testCase.kind}`,
        path,
      ),
    ];
  }
  if (suite !== "ga-runtime" && !isP0CaseKind(testCase.kind)) {
    return [
      goldenIssue(
        "evals.golden_invalid_case_kind",
        `Invalid p0 golden case kind: ${testCase.kind}`,
        path,
      ),
    ];
  }
  return [];
}

export function p0CaseFromRaw(testCase: RawCase): P0GoldenCase {
  if (!testCase.id || !testCase.subset || !testCase.input) {
    throw new Error("Cannot build golden case from incomplete raw case");
  }
  return {
    id: testCase.id,
    suite: "p0",
    subset: testCase.subset,
    kind: testCase.kind as P0GoldenCaseKind,
    input: testCase.input,
    expected: {
      status: testCase.expected?.status as P0GoldenStatus,
      rule_ids: testCase.expected?.rule_ids ?? [],
      skill_id: testCase.expected?.skill_id,
      command_alias: testCase.expected?.command_alias,
      required_messages: testCase.expected?.required_messages,
    },
  };
}

export function parseGoldenSuiteText(text: string, path: string): AiCoreResult<GoldenSuite> {
  const normalized = normalizeGoldenRows(text, path);
  const topLevel = parseYamlContract(normalized.topLevelText, path);
  const rows = parseYamlRows(normalized.normalizedText, path, "cases");
  const issues = [...normalized.issues, ...yamlIssues(topLevel), ...rows.issues];
  const suiteValue = topLevel.scalars.get("suite");
  issues.push(...validateGoldenSuiteMetadata(suiteValue, normalized.sawCases, path));
  if (!rows.ok) return { ok: false, issues };
  if (normalized.sawCases && rows.value.length === 0) issues.push(emptyGoldenCasesIssue(path));

  const suite = suiteValue as GoldenSuiteId;
  const rawCases = rows.value.map(rawCaseFromRow);
  const seenIds = new Set<string>();
  for (const [index, testCase] of rawCases.entries()) {
    issues.push(...validateGoldenCase(testCase, suite, index, seenIds, path));
  }
  if (issues.length > 0) return { ok: false, issues };
  return buildGoldenSuite(suite, rawCases);
}

function validateGoldenSuiteMetadata(
  suiteValue: string | undefined,
  sawCases: boolean,
  path: string,
): AiCoreIssue[] {
  const issues: AiCoreIssue[] = [];
  if (suiteValue === undefined) {
    issues.push(
      goldenIssue(
        "evals.golden_missing_suite",
        `Invalid golden suite: missing suite in ${path}`,
        path,
      ),
    );
  } else if (suiteValue !== "p0" && suiteValue !== "ga-core" && suiteValue !== "ga-runtime") {
    issues.push(
      goldenIssue(
        "evals.golden_unsupported_suite",
        `Unsupported golden eval suite: ${String(suiteValue)}`,
        path,
      ),
    );
  }
  if (!sawCases) {
    issues.push(
      goldenIssue(
        "evals.golden_missing_cases",
        "Invalid p0 golden suite: missing cases section",
        path,
      ),
    );
  }
  return issues;
}

function emptyGoldenCasesIssue(path: string): AiCoreIssue {
  return goldenIssue(
    "evals.golden_empty_cases",
    "Invalid p0 golden suite: cases must not be empty",
    path,
  );
}

function buildGoldenSuite(suite: GoldenSuiteId, rawCases: RawCase[]): AiCoreResult<GoldenSuite> {
  if (suite === "ga-core") {
    return {
      ok: true,
      value: {
        suite,
        cases: rawCases.map((testCase) => ({
          ...p0CaseFromRaw(testCase),
          suite,
        })),
      },
      issues: [],
    };
  }
  if (suite === "ga-runtime") {
    return {
      ok: true,
      value: {
        suite,
        cases: rawCases.map((testCase) => ({
          ...p0CaseFromRaw(testCase),
          suite,
          kind: testCase.kind as GaRuntimeGoldenCaseKind,
        })),
      },
      issues: [],
    };
  }
  return {
    ok: true,
    value: {
      suite,
      cases: rawCases.map(p0CaseFromRaw),
    },
    issues: [],
  };
}

export function isP0CaseKind(value: string): value is P0GoldenCaseKind {
  return [
    "trigger-routing",
    "missing-evidence",
    "weak-assertion",
    "projection-drift",
    "plugin-permission",
    "source-ref-stale",
    "telemetry-privacy",
    "budget-refusal",
  ].includes(value);
}

export function isGaRuntimeCaseKind(value: string): value is GaRuntimeGoldenCaseKind {
  return GA_RUNTIME_KINDS.includes(value as GaRuntimeGoldenCaseKind);
}

export function loadP0GoldenSuite(options: EvalContext = {}): P0GoldenSuite {
  const root = options.root ?? repoRoot();
  const path = join(p0Root(root), GOLDEN_FILE);
  const result = parseGoldenSuiteText(readFileSync(path, "utf8"), path);
  if (!result.ok) throwGoldenParseError(path, result.issues);
  if (result.value?.suite !== "p0") {
    throwGoldenParseError(path, [
      goldenIssue(
        "evals.golden_suite_mismatch",
        `Expected p0 golden suite but got ${String(result.value?.suite)}.`,
        path,
      ),
    ]);
  }
  return result.value;
}
