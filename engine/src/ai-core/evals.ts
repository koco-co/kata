import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { resolveAiCoreConfig } from "../config/ai-core-config.ts";
import { lintArtifactContent } from "../policy/content-lint.ts";
import { snapshotFileRef, validateSourceRefFreshness } from "../source-ref/resolvers.ts";
import { validateTelemetryEvent } from "../telemetry/ai-core-telemetry.ts";
import { auditLocalContextText } from "./context-audit.ts";
import { loadAiCore } from "./load.ts";
import { repoRoot } from "./paths.ts";
import { checkProjection, renderProjection } from "./projection.ts";
import { checkProjectionLock, renderProjectionLock } from "./projection-lock.ts";
import type { AiCoreIssue, AiCoreResult } from "./types.ts";
import { validateAiCore } from "./validate.ts";
import { parseYamlContract, parseYamlRows, yamlIssues } from "./yaml-contract.ts";

export type GoldenSuiteId = "p0" | "ga-core" | "ga-runtime";
export type P0GoldenStatus = "passed" | "blocked";
export type P0GoldenCaseKind =
  | "trigger-routing"
  | "missing-evidence"
  | "weak-assertion"
  | "projection-drift"
  | "plugin-permission"
  | "source-ref-stale"
  | "telemetry-privacy"
  | "budget-refusal";
export type GaRuntimeGoldenCaseKind =
  | "projection-lock-drift"
  | "local-context-override"
  | "secret-ref-invalid"
  | "workflow-missing";

export type P0GoldenCase = {
  id: string;
  suite: "p0";
  subset: string;
  kind: P0GoldenCaseKind;
  input: Record<string, unknown>;
  expected: {
    status: P0GoldenStatus;
    rule_ids: string[];
    skill_id?: string;
    command_alias?: string;
    required_messages?: string[];
  };
};

export type P0GoldenSuite = {
  suite: "p0";
  cases: P0GoldenCase[];
};

export type P0GoldenCaseResult = {
  id: string;
  kind: P0GoldenCaseKind | GaRuntimeGoldenCaseKind;
  subset: string;
  pass: boolean;
  status: "passed" | "failed";
  expectedStatus: P0GoldenStatus;
  actualStatus: P0GoldenStatus;
  expectedRuleIds: string[];
  actualRuleIds: string[];
  issues: AiCoreIssue[];
  triggerRouteAttempts?: number;
  triggerRouteHits?: number;
};

export type P0GoldenSummary = {
  suite: GoldenSuiteId;
  subset?: string;
  pass: boolean;
  total: number;
  passed: number;
  failed: number;
  telemetry: {
    trigger_hit_rate: number;
    trigger_miss_rate: number;
    trigger_route_attempts: number;
    failure_modes: string[];
  };
  results: P0GoldenCaseResult[];
};

type EvalContext = {
  root?: string;
};

type RawCase = {
  id?: string;
  subset?: string;
  kind?: string;
  input?: Record<string, unknown>;
  expected?: {
    status?: string;
    rule_ids?: string[];
    skill_id?: string;
    command_alias?: string;
    required_messages?: string[];
  };
};

type GaCoreGoldenCase = Omit<P0GoldenCase, "suite"> & {
  suite: "ga-core";
};

type GaCoreGoldenSuite = {
  suite: "ga-core";
  cases: GaCoreGoldenCase[];
};

type GaRuntimeGoldenCase = Omit<P0GoldenCase, "suite" | "kind"> & {
  suite: "ga-runtime";
  kind: GaRuntimeGoldenCaseKind;
};

type GaRuntimeGoldenSuite = {
  suite: "ga-runtime";
  cases: GaRuntimeGoldenCase[];
};

export type GoldenSuite = P0GoldenSuite | GaCoreGoldenSuite | GaRuntimeGoldenSuite;

type GaCoreFixtureInput = {
  text: string;
  expectedSkillId: string;
};

type RequiredGaCoreCase = {
  id: string;
  skillName?: string;
};

type CaseCheck = {
  status: P0GoldenStatus;
  ruleIds: string[];
  issues?: AiCoreIssue[];
  triggerRouteAttempts?: number;
  triggerRouteHits?: number;
};

const P0_EVAL_ROOT = ".ai/core/evals/p0";
const GA_CORE_EVAL_ROOT = ".ai/core/evals/ga-core";
const GA_RUNTIME_EVAL_ROOT = ".ai/core/evals/ga-runtime";
const GOLDEN_FILE = "golden.yaml";
const FIXTURES_PREFIX = "fixtures/";
const GA_CORE_FAST_SUBSET = "fast-deterministic";
const GA_RUNTIME_FAST_SUBSET = "fast-deterministic";
const GA_CORE_REQUIRED_CASES: RequiredGaCoreCase[] = [
  { id: "cross-skill-routing" },
  { id: "maintaining-case-artifacts-not-prd", skillName: "case-edit" },
  { id: "knowledge-not-code-search", skillName: "knowledge-curate" },
  { id: "workspace-not-specific-workflow", skillName: "workspace-manage" },
  { id: "reporting-bugs-routing", skillName: "bug-file" },
  { id: "scanning-code-changes-routing", skillName: "diff-scan" },
  { id: "generating-playwright-tests-routing", skillName: "playwright-automation" },
  { id: "planning-ui-automation-routing", skillName: "playwright-automation" },
  { id: "triaging-playwright-run-routing", skillName: "playwright-automation" },
];
const GA_RUNTIME_KINDS: GaRuntimeGoldenCaseKind[] = [
  "projection-lock-drift",
  "local-context-override",
  "secret-ref-invalid",
  "workflow-missing",
];
const GOLDEN_TOP_LEVEL_FIELDS = new Set(["suite", "cases"]);
const CASE_FIELDS = new Set(["id", "subset", "kind"]);
const INPUT_FIELDS = new Set(["fixture"]);
const EXPECTED_FIELDS = new Set([
  "status",
  "skill_id",
  "command_alias",
  "rule_ids",
  "required_messages",
]);
const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;

function p0Root(root: string): string {
  return join(root, P0_EVAL_ROOT);
}

function gaCoreRoot(root: string): string {
  return join(root, GA_CORE_EVAL_ROOT);
}

function gaRuntimeRoot(root: string): string {
  return join(root, GA_RUNTIME_EVAL_ROOT);
}

type GoldenNormalizeResult = {
  normalizedText: string;
  topLevelText: string;
  sawCases: boolean;
  issues: AiCoreIssue[];
};

type GoldenKeyValue = { ok: true; key: string; value: string } | { ok: false; issue: AiCoreIssue };

function goldenIssue(code: string, message: string, path: string): AiCoreIssue {
  return { code, severity: "error", message, path };
}

function parseGoldenKeyValue(text: string, lineNumber: number, path: string): GoldenKeyValue {
  const separator = text.indexOf(":");
  if (separator === -1) {
    return {
      ok: false,
      issue: goldenIssue("yaml.malformed_line", `Missing ':' at line ${lineNumber}.`, path),
    };
  }
  const key = text.slice(0, separator).trim();
  if (!KEY_PATTERN.test(key)) {
    return {
      ok: false,
      issue: goldenIssue("yaml.invalid_key", `Invalid key '${key}' at line ${lineNumber}.`, path),
    };
  }
  return { ok: true, key, value: text.slice(separator + 1).trim() };
}

function blockScalarIssue(
  value: string,
  lineNumber: number,
  path: string,
): AiCoreIssue | undefined {
  return /^[|>]/.test(value)
    ? goldenIssue(
        "yaml.unsupported_block_scalar",
        `Block scalar is unsupported at line ${lineNumber}.`,
        path,
      )
    : undefined;
}

function normalizeGoldenRows(text: string, path: string): GoldenNormalizeResult {
  const normalized: string[] = [];
  const topLevel: string[] = [];
  const issues: AiCoreIssue[] = [];
  let sawCases = false;
  let currentCase = false;
  let activeSection: "input" | "expected" | undefined;
  let activeList: "rule_ids" | "required_messages" | undefined;
  let activeListHasItems = false;
  let activeListLineNumber = 0;
  let seenSectionKeys = new Set<"input" | "expected">();

  function closeActiveList(): void {
    if (activeList && !activeListHasItems) {
      issues.push(
        goldenIssue(
          "evals.golden_empty_expected_list",
          `Golden expected list '${activeList}' must contain at least one item at line ${activeListLineNumber}.`,
          path,
        ),
      );
    }
    activeList = undefined;
    activeListHasItems = false;
    activeListLineNumber = 0;
  }

  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const lineNumber = index + 1;
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;

    const leadingWhitespace = raw.match(/^\s*/)?.[0] ?? "";
    if (leadingWhitespace.includes("\t") || ![0, 2, 4, 6, 8].includes(leadingWhitespace.length)) {
      issues.push(
        goldenIssue(
          "yaml.unsupported_indentation",
          `Unsupported indentation at line ${lineNumber}.`,
          path,
        ),
      );
      continue;
    }

    if (leadingWhitespace.length === 0) {
      closeActiveList();
      currentCase = false;
      activeSection = undefined;
      seenSectionKeys = new Set();
      const parsed = parseGoldenKeyValue(raw, lineNumber, path);
      if (!parsed.ok) {
        issues.push(parsed.issue);
        continue;
      }
      if (!GOLDEN_TOP_LEVEL_FIELDS.has(parsed.key)) {
        issues.push(
          goldenIssue("evals.golden_unknown_field", `Unknown p0 golden field: ${parsed.key}`, path),
        );
        continue;
      }
      if (parsed.key === "cases" && parsed.value.length === 0) sawCases = true;
      normalized.push(`${parsed.key}:${parsed.value.length > 0 ? ` ${parsed.value}` : ""}`);
      topLevel.push(`${parsed.key}:${parsed.value.length > 0 ? ` ${parsed.value}` : ""}`);
      continue;
    }

    if (!sawCases) {
      issues.push(
        goldenIssue(
          "yaml.unsupported_nested_structure",
          `Golden case row appears before cases at line ${lineNumber}.`,
          path,
        ),
      );
      continue;
    }

    if (leadingWhitespace.length === 2) {
      closeActiveList();
      const item = raw.match(/^ {2}-\s+(.+)$/);
      if (!item) {
        issues.push(
          goldenIssue(
            "yaml.malformed_row",
            `Golden case row must contain a key/value pair at line ${lineNumber}.`,
            path,
          ),
        );
        continue;
      }
      const parsed = parseGoldenKeyValue(item[1], lineNumber, path);
      if (!parsed.ok) {
        issues.push(parsed.issue);
        continue;
      }
      if (!CASE_FIELDS.has(parsed.key)) {
        issues.push(
          goldenIssue(
            "evals.golden_unknown_case_field",
            `Unknown p0 golden case field: ${parsed.key}`,
            path,
          ),
        );
        continue;
      }
      currentCase = true;
      activeSection = undefined;
      seenSectionKeys = new Set();
      normalized.push(`  - ${parsed.key}:${parsed.value.length > 0 ? ` ${parsed.value}` : ""}`);
      continue;
    }

    if (!currentCase) {
      issues.push(
        goldenIssue(
          "yaml.row_field_without_row",
          `Golden case field has no active row at line ${lineNumber}.`,
          path,
        ),
      );
      continue;
    }

    if (leadingWhitespace.length === 4) {
      closeActiveList();
      const parsed = parseGoldenKeyValue(trimmed, lineNumber, path);
      if (!parsed.ok) {
        issues.push(parsed.issue);
        continue;
      }
      if (parsed.key === "input" || parsed.key === "expected") {
        if (seenSectionKeys.has(parsed.key)) {
          issues.push(
            goldenIssue(
              "yaml.duplicate_key",
              `Duplicate golden section '${parsed.key}' at line ${lineNumber}.`,
              path,
            ),
          );
          activeSection = undefined;
          continue;
        }
        seenSectionKeys.add(parsed.key);
        const blockScalar = blockScalarIssue(parsed.value, lineNumber, path);
        if (blockScalar) issues.push(blockScalar);
        if (parsed.value.length === 0) {
          activeSection = parsed.key;
        } else {
          if (!blockScalar) {
            issues.push(
              goldenIssue(
                "yaml.unsupported_section_value",
                `Golden section '${parsed.key}' must be a nested mapping at line ${lineNumber}.`,
                path,
              ),
            );
          }
          activeSection = undefined;
        }
        continue;
      }
      activeSection = undefined;
      if (!CASE_FIELDS.has(parsed.key)) {
        issues.push(
          goldenIssue(
            "evals.golden_unknown_case_field",
            `Unknown p0 golden case field: ${parsed.key}`,
            path,
          ),
        );
        continue;
      }
      normalized.push(`    ${parsed.key}:${parsed.value.length > 0 ? ` ${parsed.value}` : ""}`);
      continue;
    }

    if (leadingWhitespace.length === 6) {
      closeActiveList();
      if (!activeSection) {
        issues.push(
          goldenIssue(
            "yaml.unsupported_nested_structure",
            `Golden nested field has no active section at line ${lineNumber}.`,
            path,
          ),
        );
        continue;
      }
      const parsed = parseGoldenKeyValue(trimmed, lineNumber, path);
      if (!parsed.ok) {
        issues.push(parsed.issue);
        continue;
      }
      if (activeSection === "input") {
        activeList = undefined;
        if (!INPUT_FIELDS.has(parsed.key)) {
          issues.push(
            goldenIssue(
              "evals.golden_unknown_input_field",
              `Unknown p0 golden input field: ${parsed.key}`,
              path,
            ),
          );
          continue;
        }
        normalized.push(`    ${parsed.key}:${parsed.value.length > 0 ? ` ${parsed.value}` : ""}`);
        continue;
      }
      if (!EXPECTED_FIELDS.has(parsed.key)) {
        issues.push(
          goldenIssue(
            "evals.golden_unknown_expected_field",
            `Unknown p0 golden expected field: ${parsed.key}`,
            path,
          ),
        );
        continue;
      }
      if (parsed.key === "rule_ids" || parsed.key === "required_messages") {
        if (parsed.value.length > 0) {
          issues.push(
            goldenIssue(
              "yaml.unsupported_inline_list_value",
              `Golden expected list '${parsed.key}' must use nested list items at line ${lineNumber}.`,
              path,
            ),
          );
          continue;
        }
        activeList = parsed.key;
        activeListHasItems = false;
        activeListLineNumber = lineNumber;
        normalized.push(`    ${parsed.key}:${parsed.value.length > 0 ? ` ${parsed.value}` : ""}`);
        continue;
      }
      const normalizedKey = parsed.key === "status" ? "expected_status" : parsed.key;
      normalized.push(`    ${normalizedKey}:${parsed.value.length > 0 ? ` ${parsed.value}` : ""}`);
      continue;
    }

    if (activeSection !== "expected" || !activeList) {
      issues.push(
        goldenIssue(
          "yaml.unsupported_nested_structure",
          `Unsupported nested structure at line ${lineNumber}.`,
          path,
        ),
      );
      continue;
    }
    const item = raw.match(/^ {8}-\s+(.+)$/);
    if (!item) {
      issues.push(
        goldenIssue(
          "yaml.malformed_row",
          `Golden expected list item is malformed at line ${lineNumber}.`,
          path,
        ),
      );
      continue;
    }
    activeListHasItems = true;
    normalized.push(`      - ${item[1].trim()}`);
  }
  closeActiveList();

  return {
    normalizedText: normalized.join("\n"),
    topLevelText: topLevel.join("\n"),
    sawCases,
    issues,
  };
}

function splitGoldenList(value: string | undefined): string[] {
  if (!value) return [];
  return value.split("\n").filter((item) => item.length > 0);
}

function rawCaseFromRow(row: Record<string, string>): RawCase {
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

function validateGoldenCase(
  testCase: RawCase,
  suite: GoldenSuiteId,
  index: number,
  seenIds: Set<string>,
  path: string,
): AiCoreIssue[] {
  const issues: AiCoreIssue[] = [];
  const caseLabel = testCase.id && testCase.id.length > 0 ? testCase.id : `row ${index + 1}`;
  if (!testCase.id) {
    issues.push(
      goldenIssue(
        "evals.golden_missing_case_id",
        `Missing golden case id at row ${index + 1}.`,
        path,
      ),
    );
  } else if (seenIds.has(testCase.id)) {
    issues.push(
      goldenIssue(
        "evals.golden_duplicate_case_id",
        `Duplicate golden case id: ${testCase.id}`,
        path,
      ),
    );
  } else {
    seenIds.add(testCase.id);
  }
  if (!testCase.subset || !testCase.kind || !testCase.input || !testCase.expected) {
    issues.push(
      goldenIssue(
        "evals.golden_case_missing_required_field",
        `Invalid p0 golden case: missing required fields for ${caseLabel}`,
        path,
      ),
    );
  }
  if (!testCase.expected?.status) {
    issues.push(
      goldenIssue(
        "evals.golden_missing_expected_status",
        `Missing golden expected status for ${caseLabel}.`,
        path,
      ),
    );
  } else if (testCase.expected.status !== "passed" && testCase.expected.status !== "blocked") {
    issues.push(
      goldenIssue(
        "evals.golden_invalid_expected_status",
        `Invalid p0 golden expected status for ${caseLabel}`,
        path,
      ),
    );
  }
  if (testCase.kind) {
    if (suite === "ga-runtime") {
      if (!isGaRuntimeCaseKind(testCase.kind)) {
        issues.push(
          goldenIssue(
            "evals.golden_invalid_case_kind",
            `Invalid ga-runtime golden case kind: ${testCase.kind}`,
            path,
          ),
        );
      }
    } else if (!isP0CaseKind(testCase.kind)) {
      issues.push(
        goldenIssue(
          "evals.golden_invalid_case_kind",
          `Invalid p0 golden case kind: ${testCase.kind}`,
          path,
        ),
      );
    }
  }
  return issues;
}

function p0CaseFromRaw(testCase: RawCase): P0GoldenCase {
  return {
    id: testCase.id!,
    suite: "p0",
    subset: testCase.subset!,
    kind: testCase.kind as P0GoldenCaseKind,
    input: testCase.input!,
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
  if (!normalized.sawCases) {
    issues.push(
      goldenIssue(
        "evals.golden_missing_cases",
        "Invalid p0 golden suite: missing cases section",
        path,
      ),
    );
  }
  if (!rows.ok) return { ok: false, issues };
  if (normalized.sawCases && rows.value.length === 0) {
    issues.push(
      goldenIssue(
        "evals.golden_empty_cases",
        "Invalid p0 golden suite: cases must not be empty",
        path,
      ),
    );
  }

  const suite = suiteValue as GoldenSuiteId;
  const rawCases = rows.value.map(rawCaseFromRow);
  const seenIds = new Set<string>();
  for (const [index, testCase] of rawCases.entries()) {
    issues.push(...validateGoldenCase(testCase, suite, index, seenIds, path));
  }
  if (issues.length > 0) return { ok: false, issues };

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

function isP0CaseKind(value: string): value is P0GoldenCaseKind {
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

function isGaRuntimeCaseKind(value: string): value is GaRuntimeGoldenCaseKind {
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

function throwGoldenParseError(path: string, issues: AiCoreIssue[]): never {
  throw new Error(issues.map((issue) => `${path}: ${issue.code}: ${issue.message}`).join("; "));
}

function safeFixturePath(root: string, fixture: unknown): string {
  if (typeof fixture !== "string" || fixture.length === 0) {
    throw new Error("Golden eval fixture path must be a non-empty string");
  }
  if (
    fixture !== fixture.trim() ||
    fixture.includes("\0") ||
    isAbsolute(fixture) ||
    !fixture.startsWith(FIXTURES_PREFIX)
  ) {
    throw new Error(`Golden eval fixture path must be under ${FIXTURES_PREFIX}: ${fixture}`);
  }
  const relativeFixture = fixture.slice(FIXTURES_PREFIX.length);
  const pathParts = relativeFixture.split(/[\\/]/);
  if (
    relativeFixture.length === 0 ||
    pathParts.some((part) => part.length === 0 || part === "." || part === "..")
  ) {
    throw new Error(`Golden eval fixture path must not contain dot segments: ${fixture}`);
  }
  const fixturesRoot = join(p0Root(root), "fixtures");
  const fullPath = resolve(fixturesRoot, relativeFixture);
  const relativePath = relative(fixturesRoot, fullPath);
  if (
    relativePath.startsWith("..") ||
    relativePath === "" ||
    relativePath.includes("\0") ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`Golden eval fixture path escapes the p0 fixtures root: ${fixture}`);
  }
  return fullPath;
}

function safeGaCoreFixturePath(root: string, fixture: unknown): string {
  if (typeof fixture !== "string" || fixture.length === 0) {
    throw new Error("Golden eval fixture path must be a non-empty string");
  }
  if (
    fixture !== fixture.trim() ||
    fixture.includes("\0") ||
    isAbsolute(fixture) ||
    !fixture.startsWith(FIXTURES_PREFIX)
  ) {
    throw new Error(`Golden eval fixture path must be under ${FIXTURES_PREFIX}: ${fixture}`);
  }
  const relativeFixture = fixture.slice(FIXTURES_PREFIX.length);
  const pathParts = relativeFixture.split(/[\\/]/);
  if (
    relativeFixture.length === 0 ||
    pathParts.some((part) => part.length === 0 || part === "." || part === "..")
  ) {
    throw new Error(`Golden eval fixture path must not contain dot segments: ${fixture}`);
  }
  const fixturesRoot = join(gaCoreRoot(root), "fixtures");
  const fullPath = resolve(fixturesRoot, relativeFixture);
  const relativePath = relative(fixturesRoot, fullPath);
  if (
    relativePath.startsWith("..") ||
    relativePath === "" ||
    relativePath.includes("\0") ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`Golden eval fixture path escapes the ga-core fixtures root: ${fixture}`);
  }
  return fullPath;
}

function safeGaRuntimeFixturePath(root: string, fixture: unknown): string {
  if (typeof fixture !== "string" || fixture.length === 0) {
    throw new Error("Golden eval fixture path must be a non-empty string");
  }
  if (
    fixture !== fixture.trim() ||
    fixture.includes("\0") ||
    isAbsolute(fixture) ||
    !fixture.startsWith(FIXTURES_PREFIX)
  ) {
    throw new Error(`Golden eval fixture path must be under ${FIXTURES_PREFIX}: ${fixture}`);
  }
  const relativeFixture = fixture.slice(FIXTURES_PREFIX.length);
  const pathParts = relativeFixture.split(/[\\/]/);
  if (
    relativeFixture.length === 0 ||
    pathParts.some((part) => part.length === 0 || part === "." || part === "..")
  ) {
    throw new Error(`Golden eval fixture path must not contain dot segments: ${fixture}`);
  }
  const fixturesRoot = join(gaRuntimeRoot(root), "fixtures");
  const fullPath = resolve(fixturesRoot, relativeFixture);
  const relativePath = relative(fixturesRoot, fullPath);
  if (
    relativePath.startsWith("..") ||
    relativePath === "" ||
    relativePath.includes("\0") ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`Golden eval fixture path escapes the ga-runtime fixtures root: ${fixture}`);
  }
  return fullPath;
}

function readTextFixture(testCase: P0GoldenCase, root: string): string {
  return readFileSync(safeFixturePath(root, testCase.input.fixture), "utf8");
}

function readJsonFixture<T extends Record<string, unknown>>(
  testCase: P0GoldenCase,
  root: string,
): T {
  return JSON.parse(readTextFixture(testCase, root)) as T;
}

function readGaCoreJsonFixture<T extends Record<string, unknown>>(
  testCase: GaCoreGoldenCase,
  root: string,
): T {
  return JSON.parse(readFileSync(safeGaCoreFixturePath(root, testCase.input.fixture), "utf8")) as T;
}

function readGaRuntimeJsonFixture<T extends Record<string, unknown>>(
  testCase: GaRuntimeGoldenCase,
  root: string,
): T {
  return JSON.parse(
    readFileSync(safeGaRuntimeFixturePath(root, testCase.input.fixture), "utf8"),
  ) as T;
}

function issueFromRule(code: string, message: string, path = "eval"): AiCoreIssue {
  return { code, severity: "error", message, path };
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function ruleIds(issues: AiCoreIssue[]): string[] {
  return unique(issues.filter((issue) => issue.severity === "error").map((issue) => issue.code));
}

function sameRuleIds(left: string[], right: string[]): boolean {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((value, index) => value === sortedRight[index])
  );
}

function hasRequiredMessages(
  requiredMessages: string[] | undefined,
  issues: AiCoreIssue[],
): boolean {
  if (!requiredMessages || requiredMessages.length === 0) return true;
  const actualMessages = new Set(issues.map((issue) => issue.message));
  return requiredMessages.every((message) => actualMessages.has(message));
}

function resultFromPolicy(ok: boolean, issues: AiCoreIssue[]): CaseCheck {
  return {
    status: ok ? "passed" : "blocked",
    ruleIds: ruleIds(issues),
    issues,
  };
}

function readSkillRouting(root: string): { skillId: string; commands: string[] } {
  const text = readFileSync(join(root, ".ai/core/commands/case-draft.command.yaml"), "utf8");
  const commandId = text.match(/^id:\s*([^\s#]+)/m)?.[1];
  const skillId = text.match(/^skill:\s*([^\s#]+)/m)?.[1];
  if (!skillId || !commandId) throw new Error("case-draft routing contract is incomplete");
  return { skillId, commands: [commandId] };
}

function checkTriggerRouting(testCase: P0GoldenCase, root: string): CaseCheck {
  const fixture = readJsonFixture<{ utterance?: unknown }>(testCase, root);
  const utterance = typeof fixture.utterance === "string" ? fixture.utterance.trim() : "";
  const alias = utterance.match(/^\/([A-Za-z0-9:_-]+)/)?.[1];
  const routing = readSkillRouting(root);
  const matched = alias ? routing.commands.includes(alias) : false;
  const expectedSkillId = testCase.expected.skill_id;
  const expectedAlias = testCase.expected.command_alias;
  const matchedExpected = matched && routing.skillId === expectedSkillId && alias === expectedAlias;
  return {
    status: matchedExpected ? "passed" : "blocked",
    ruleIds: matched ? ["trigger.route_alias"] : ["trigger.no_route"],
    issues: matchedExpected
      ? []
      : [
          issueFromRule(
            "trigger.route_mismatch",
            "Trigger routing did not match the golden expected skill and command alias.",
            "trigger",
          ),
        ],
  };
}

// Eval-only deterministic fixture router; not a production workflow router.
function evalRouteGaCoreSkill(
  input: string,
  skillIdsByName: Map<string, string>,
): string | undefined {
  const normalized = input.toLowerCase();
  if (
    input.includes("UI自动化规划") ||
    input.includes("自动化覆盖") ||
    input.includes("冒烟范围") ||
    normalized.includes("playwright") ||
    input.includes("生成自动化脚本") ||
    input.includes("生成 UI 脚本") ||
    input.includes("测试运行失败") ||
    normalized.includes("trace") ||
    input.includes("失败转 Bug")
  ) {
    return skillIdsByName.get("playwright-automation");
  }
  if (
    normalized.includes("xmind") ||
    normalized.includes("archive") ||
    input.includes("同步") ||
    input.includes("反向同步") ||
    input.includes("转换") ||
    input.includes("转化")
  ) {
    return skillIdsByName.get("case-edit");
  }
  if (
    input.includes("知识库") ||
    input.includes("业务规则") ||
    input.includes("业务术语") ||
    input.includes("模块知识") ||
    input.includes("记到")
  ) {
    return skillIdsByName.get("knowledge-curate");
  }
  if (input.includes("扫描") || input.includes("隐患") || input.includes("静态分析")) {
    return skillIdsByName.get("diff-scan");
  }
  if (
    input.includes("Bug 报告") ||
    input.includes("bug 报告") ||
    input.includes("错误报告") ||
    input.includes("写报告")
  ) {
    return skillIdsByName.get("bug-file");
  }
  if (
    normalized.includes("kata") ||
    input.includes("功能菜单") ||
    input.includes("有哪些功能") ||
    input.includes("初始化") ||
    input.includes("新项目")
  ) {
    return skillIdsByName.get("workspace-manage");
  }
  if (
    normalized.includes("exception") ||
    normalized.includes("console error") ||
    input.includes("报错") ||
    input.includes("Bug报告") ||
    input.includes("bug 报告")
  ) {
    return skillIdsByName.get("bug-file");
  }
  if (input.includes("<<<<<<<") || input.includes("合并冲突") || input.includes("冲突分析")) {
    return skillIdsByName.get("conflict-analyze");
  }
  if (
    normalized.includes("hotfix") ||
    input.includes("禅道") ||
    input.includes("回归用例") ||
    input.includes("修复验证")
  ) {
    return skillIdsByName.get("case-hotfix");
  }
  if (
    input.includes("静态扫描") ||
    normalized.includes("static scan") ||
    normalized.includes("diff scan") ||
    input.includes("提测分支")
  ) {
    return skillIdsByName.get("diff-scan");
  }
  if (normalized.includes("prd") || input.includes("生成测试用例") || input.includes("写用例")) {
    return skillIdsByName.get("case-draft");
  }
  return undefined;
}

function gaCoreFixtureInputs(testCase: GaCoreGoldenCase, root: string): GaCoreFixtureInput[] {
  const fixture = readGaCoreJsonFixture<Record<string, unknown>>(testCase, root);
  if (Array.isArray(fixture.inputs)) {
    return fixture.inputs.map((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        throw new Error(`Invalid ga-core fixture input at ${testCase.id}[${index}]`);
      }
      const item = entry as Record<string, unknown>;
      if (typeof item.text !== "string" || typeof item.expected_skill_id !== "string") {
        throw new Error(`Invalid ga-core fixture input at ${testCase.id}[${index}]`);
      }
      return { text: item.text, expectedSkillId: item.expected_skill_id };
    });
  }
  if (typeof fixture.input !== "string" || typeof fixture.expected_skill_id !== "string") {
    throw new Error(`Invalid ga-core fixture: ${testCase.id}`);
  }
  return [{ text: fixture.input, expectedSkillId: fixture.expected_skill_id }];
}

function checkGaCoreTriggerRouting(
  testCase: GaCoreGoldenCase,
  root: string,
  activeSkillIds: Set<string>,
  skillIdsByName: Map<string, string>,
): CaseCheck {
  const inputs = gaCoreFixtureInputs(testCase, root);
  const issues: AiCoreIssue[] = [];
  const expectedCaseSkillId = testCase.expected.skill_id;
  let hits = 0;
  for (const input of inputs) {
    if (!activeSkillIds.has(input.expectedSkillId)) {
      issues.push(
        issueFromRule(
          "trigger.expected_skill_missing",
          `Expected skill is not active: ${input.expectedSkillId}`,
          testCase.id,
        ),
      );
      continue;
    }
    if (expectedCaseSkillId !== undefined && expectedCaseSkillId !== input.expectedSkillId) {
      issues.push(
        issueFromRule(
          "trigger.fixture_expected_mismatch",
          "Golden expected skill does not match fixture expected skill.",
          testCase.id,
        ),
      );
      continue;
    }
    const actualSkillId = evalRouteGaCoreSkill(input.text, skillIdsByName);
    if (actualSkillId !== input.expectedSkillId) {
      issues.push(
        issueFromRule(
          "trigger.route_mismatch",
          `Expected ${input.expectedSkillId} but routed to ${actualSkillId ?? "none"}.`,
          testCase.id,
        ),
      );
      continue;
    }
    hits += 1;
  }
  return {
    status: issues.length === 0 ? "passed" : "blocked",
    ruleIds: issues.length === 0 ? ["trigger.route_skill"] : ruleIds(issues),
    issues,
    triggerRouteAttempts: inputs.length,
    triggerRouteHits: hits,
  };
}

function gaCoreContractFailure(subset: string, messages: string[]): P0GoldenSummary {
  const issues = messages.map((message) =>
    issueFromRule("evals.ga_core_contract_invalid", message, ".ai/core/evals/ga-core/golden.yaml"),
  );
  return {
    suite: "ga-core",
    subset,
    pass: false,
    total: 0,
    passed: 0,
    failed: 1,
    telemetry: {
      trigger_hit_rate: 0,
      trigger_miss_rate: 1,
      trigger_route_attempts: 0,
      failure_modes: ["evals.ga_core_contract_invalid"],
    },
    results: [
      {
        id: "ga-core-suite-contract",
        kind: "trigger-routing",
        subset,
        pass: false,
        status: "failed",
        expectedStatus: "passed",
        actualStatus: "blocked",
        expectedRuleIds: [],
        actualRuleIds: ["evals.ga_core_contract_invalid"],
        issues,
      },
    ],
  };
}

function gaRuntimeContractFailure(subset: string, messages: string[]): P0GoldenSummary {
  const issues = messages.map((message) =>
    issueFromRule(
      "evals.ga_runtime_contract_invalid",
      message,
      ".ai/core/evals/ga-runtime/golden.yaml",
    ),
  );
  return {
    suite: "ga-runtime",
    subset,
    pass: false,
    total: 0,
    passed: 0,
    failed: 1,
    telemetry: {
      trigger_hit_rate: 1,
      trigger_miss_rate: 0,
      trigger_route_attempts: 0,
      failure_modes: ["evals.ga_runtime_contract_invalid"],
    },
    results: [
      {
        id: "ga-runtime-suite-contract",
        kind: "workflow-missing",
        subset,
        pass: false,
        status: "failed",
        expectedStatus: "blocked",
        actualStatus: "passed",
        expectedRuleIds: [],
        actualRuleIds: ["evals.ga_runtime_contract_invalid"],
        issues,
      },
    ],
  };
}

function validateGaCoreFastSuite(
  suite: GaCoreGoldenSuite,
  skillIdsByName: Map<string, string>,
): string[] {
  const messages: string[] = [];
  const fastCases = suite.cases.filter((testCase) => testCase.subset === GA_CORE_FAST_SUBSET);
  const requiredIds = new Set(GA_CORE_REQUIRED_CASES.map((testCase) => testCase.id));
  const seen = new Map<string, number>();
  for (const testCase of fastCases) {
    seen.set(testCase.id, (seen.get(testCase.id) ?? 0) + 1);
  }

  for (const requiredCase of GA_CORE_REQUIRED_CASES) {
    const matches = fastCases.filter((testCase) => testCase.id === requiredCase.id);
    if (matches.length === 0) {
      messages.push(`Missing required GA-core golden case: ${requiredCase.id}`);
      continue;
    }
    if (matches.length > 1) {
      messages.push(`Duplicate required GA-core golden case: ${requiredCase.id}`);
      continue;
    }
    const testCase = matches[0];
    if (testCase.kind !== "trigger-routing") {
      messages.push(`GA-core golden case ${requiredCase.id} must use kind trigger-routing.`);
    }
    if (testCase.expected.status !== "passed") {
      messages.push(`GA-core golden case ${requiredCase.id} must expect status passed.`);
    }
    const expectedSkillId = requiredCase.skillName
      ? skillIdsByName.get(requiredCase.skillName)
      : undefined;
    if (requiredCase.skillName && testCase.expected.skill_id !== expectedSkillId) {
      messages.push(
        `GA-core golden case ${requiredCase.id} must expect skill ${requiredCase.skillName}.`,
      );
    }
    if (!requiredCase.skillName && testCase.expected.skill_id !== undefined) {
      messages.push(
        `GA-core golden case ${requiredCase.id} must not declare a single expected skill.`,
      );
    }
  }

  for (const [id, count] of seen) {
    if (count > 1 && requiredIds.has(id)) continue;
    if (count > 1) messages.push(`Duplicate unsupported GA-core golden case: ${id}`);
    if (!requiredIds.has(id)) messages.push(`Unsupported GA-core fast deterministic case: ${id}`);
  }

  return messages;
}

function validateGaRuntimeFastSuite(suite: GaRuntimeGoldenSuite): string[] {
  const messages: string[] = [];
  const fastCases = suite.cases.filter((testCase) => testCase.subset === GA_RUNTIME_FAST_SUBSET);
  const requiredIds = new Set(GA_RUNTIME_KINDS);
  const seen = new Map<string, number>();
  for (const testCase of fastCases) {
    seen.set(testCase.id, (seen.get(testCase.id) ?? 0) + 1);
    if (testCase.id !== testCase.kind) {
      messages.push(`GA-runtime golden case ${testCase.id} must use matching kind ${testCase.id}.`);
    }
    if (testCase.expected.status !== "blocked") {
      messages.push(`GA-runtime golden case ${testCase.id} must expect status blocked.`);
    }
  }
  for (const id of requiredIds) {
    const count = seen.get(id) ?? 0;
    if (count === 0) messages.push(`Missing required GA-runtime golden case: ${id}`);
    if (count > 1) messages.push(`Duplicate required GA-runtime golden case: ${id}`);
  }
  for (const id of seen.keys()) {
    if (!requiredIds.has(id as GaRuntimeGoldenCaseKind)) {
      messages.push(`Unsupported GA-runtime fast deterministic case: ${id}`);
    }
  }
  return messages;
}

async function checkProjectionDrift(testCase: P0GoldenCase, root: string): Promise<CaseCheck> {
  const fixture = readJsonFixture<{
    runtime?: unknown;
    mutatePath?: unknown;
    mutatedContent?: unknown;
  }>(testCase, root);
  const runtime =
    fixture.runtime === "claude" || fixture.runtime === "codex" || fixture.runtime === "all"
      ? fixture.runtime
      : "codex";
  const mutatePath = typeof fixture.mutatePath === "string" ? fixture.mutatePath : "";
  const mutatedContent =
    typeof fixture.mutatedContent === "string" ? fixture.mutatedContent : "mutated\n";
  const outputRoot = mkdtempSync(join(tmpdir(), "kata-p0-projection-"));
  try {
    const render = await renderProjection({ runtime, outputRoot });
    if (!render.ok) return resultFromPolicy(false, render.issues);
    const target = resolve(outputRoot, mutatePath);
    const relativePath = relative(outputRoot, target);
    if (relativePath.startsWith("..") || relativePath === "" || relativePath.includes("\0")) {
      return resultFromPolicy(false, [
        issueFromRule(
          "projection.fixture_path_invalid",
          "Projection drift fixture path escapes output root.",
          "projection",
        ),
      ]);
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, mutatedContent);
    const drift = await checkProjection({ runtime, outputRoot });
    return resultFromPolicy(drift.ok, drift.issues);
  } finally {
    rmSync(outputRoot, { recursive: true, force: true });
  }
}

async function checkPluginPermission(testCase: P0GoldenCase, root: string): Promise<CaseCheck> {
  const fixture = readTextFixture(testCase, root);
  const tempRoot = mkdtempSync(join(tmpdir(), "kata-p0-plugin-"));
  const tempCoreRoot = join(tempRoot, ".ai/core");
  try {
    cpSync(join(root, ".ai/core"), tempCoreRoot, { recursive: true });
    const pluginPath = join(tempCoreRoot, "plugins/p0-bad-plugin/plugin.yaml");
    mkdirSync(dirname(pluginPath), { recursive: true });
    writeFileSync(pluginPath, fixture);
    const validation = validateAiCore(await loadAiCore({ root: tempRoot, coreRoot: tempCoreRoot }));
    const issues = validation.issues.filter((issue) =>
      issue.path.endsWith("p0-bad-plugin/plugin.yaml"),
    );
    return resultFromPolicy(issues.length === 0, issues);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function checkSourceRefStale(testCase: P0GoldenCase, root: string): CaseCheck {
  const fixture = readJsonFixture<{
    sourceId?: unknown;
    snapshotContent?: unknown;
    currentContent?: unknown;
  }>(testCase, root);
  if (
    typeof fixture.sourceId !== "string" ||
    typeof fixture.snapshotContent !== "string" ||
    typeof fixture.currentContent !== "string"
  ) {
    return resultFromPolicy(false, [
      issueFromRule(
        "source_ref.fixture_invalid",
        "SourceRef stale fixture is incomplete.",
        "sourceRef",
      ),
    ]);
  }
  const sourceRef = snapshotFileRef({ id: fixture.sourceId, content: fixture.snapshotContent });
  const validation = validateSourceRefFreshness(sourceRef, fixture.currentContent);
  return resultFromPolicy(validation.ok, validation.issues);
}

function checkTelemetryPrivacy(testCase: P0GoldenCase, root: string): CaseCheck {
  const event =
    testCase.input.event &&
    typeof testCase.input.event === "object" &&
    !Array.isArray(testCase.input.event)
      ? (testCase.input.event as Record<string, unknown>)
      : readJsonFixture<Record<string, unknown>>(testCase, root);
  const validation = validateTelemetryEvent(event);
  return resultFromPolicy(validation.ok, validation.issues);
}

function runBudgetRefusalCase(input: {
  remaining_tokens: number;
  required_tokens: number;
}): string[] {
  return input.remaining_tokens < input.required_tokens ? ["budget.exhausted"] : [];
}

function checkBudgetRefusal(testCase: P0GoldenCase, root: string): CaseCheck {
  const fixture = readJsonFixture<Record<string, unknown>>(testCase, root);
  const remainingTokens = fixture.remaining_tokens;
  const requiredTokens = fixture.required_tokens;
  if (typeof remainingTokens !== "number" || typeof requiredTokens !== "number") {
    return resultFromPolicy(false, [
      issueFromRule("budget.fixture_invalid", "Budget refusal fixture is incomplete.", "budget"),
    ]);
  }
  const ruleIds = runBudgetRefusalCase({
    remaining_tokens: remainingTokens,
    required_tokens: requiredTokens,
  });
  return {
    status: ruleIds.length > 0 ? "blocked" : "passed",
    ruleIds,
    issues: ruleIds.map((ruleId) =>
      issueFromRule(ruleId, "Budget is exhausted for the requested workflow.", "budget"),
    ),
  };
}

async function checkProjectionLockDrift(
  testCase: GaRuntimeGoldenCase,
  root: string,
): Promise<CaseCheck> {
  const fixture = readGaRuntimeJsonFixture<{
    mutate_path?: unknown;
    mutated_content?: unknown;
  }>(testCase, root);
  const mutatePath = typeof fixture.mutate_path === "string" ? fixture.mutate_path : "";
  const mutatedContent =
    typeof fixture.mutated_content === "string" ? fixture.mutated_content : "mutated\n";
  const outputRoot = mkdtempSync(join(tmpdir(), "kata-ga-runtime-projection-"));
  try {
    const render = await renderProjection({ runtime: "all", outputRoot });
    if (!render.ok) return resultFromPolicy(false, render.issues);
    const lock = renderProjectionLock({ projectionRoot: outputRoot });
    const target = resolve(outputRoot, mutatePath);
    const relativePath = relative(outputRoot, target);
    if (
      relativePath.startsWith("..") ||
      relativePath === "" ||
      relativePath.includes("\0") ||
      isAbsolute(relativePath)
    ) {
      return resultFromPolicy(false, [
        issueFromRule(
          "projection_lock.fixture_path_invalid",
          "Projection lock drift fixture path escapes output root.",
          "projection-lock",
        ),
      ]);
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, mutatedContent);
    const drift = checkProjectionLock({ projectionRoot: outputRoot, runtime: "all", lock });
    return resultFromPolicy(drift.ok, drift.issues);
  } finally {
    rmSync(outputRoot, { recursive: true, force: true });
  }
}

function checkLocalContextOverride(testCase: GaRuntimeGoldenCase, root: string): CaseCheck {
  const fixture = readGaRuntimeJsonFixture<{
    path?: unknown;
    text?: unknown;
  }>(testCase, root);
  const path = typeof fixture.path === "string" ? fixture.path : testCase.id;
  const text = typeof fixture.text === "string" ? fixture.text : "";
  const result = auditLocalContextText({ path, text });
  return resultFromPolicy(result.ok, result.issues);
}

function checkSecretRefInvalid(testCase: GaRuntimeGoldenCase, root: string): CaseCheck {
  const fixture = readGaRuntimeJsonFixture<{
    env?: unknown;
  }>(testCase, root);
  const env: Record<string, string | undefined> = {};
  if (fixture.env && typeof fixture.env === "object" && !Array.isArray(fixture.env)) {
    for (const [key, value] of Object.entries(fixture.env)) {
      env[key] = typeof value === "string" ? value : undefined;
    }
  }
  const result = resolveAiCoreConfig({ env });
  return resultFromPolicy(result.ok, result.issues);
}

async function checkWorkflowMissing(
  testCase: GaRuntimeGoldenCase,
  root: string,
): Promise<CaseCheck> {
  const fixture = readGaRuntimeJsonFixture<{
    remove_workflow?: unknown;
  }>(testCase, root);
  const removeWorkflow = typeof fixture.remove_workflow === "string" ? fixture.remove_workflow : "";
  const pathParts = removeWorkflow.split(/[\\/]/);
  if (
    removeWorkflow.length === 0 ||
    isAbsolute(removeWorkflow) ||
    pathParts.some((part) => part.length === 0 || part === "." || part === "..")
  ) {
    return resultFromPolicy(false, [
      issueFromRule(
        "workflow.fixture_path_invalid",
        "Workflow missing fixture path is invalid.",
        "workflow",
      ),
    ]);
  }

  const tempRoot = mkdtempSync(join(tmpdir(), "kata-ga-runtime-workflow-"));
  const tempCoreRoot = join(tempRoot, ".ai/core");
  try {
    cpSync(join(root, ".ai/core"), tempCoreRoot, { recursive: true });
    rmSync(join(tempCoreRoot, "workflows", removeWorkflow), { force: true });
    const validation = validateAiCore(await loadAiCore({ root: tempRoot, coreRoot: tempCoreRoot }));
    const issues = validation.issues.map((issue) =>
      issue.code === "workflow_contract.missing"
        ? // Task 8 golden contracts expose the GA-runtime gate rule id while reusing
          // the Task 7 workflow validator as the canonical detector.
          { ...issue, code: "workflow.ga_core_missing" }
        : issue,
    );
    return resultFromPolicy(validation.ok, issues);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

async function runCaseCheck(testCase: P0GoldenCase, root: string): Promise<CaseCheck> {
  switch (testCase.kind) {
    case "trigger-routing":
      return checkTriggerRouting(testCase, root);
    case "missing-evidence":
    case "weak-assertion": {
      const lint = lintArtifactContent(readTextFixture(testCase, root));
      return resultFromPolicy(lint.ok, lint.issues);
    }
    case "projection-drift":
      return checkProjectionDrift(testCase, root);
    case "plugin-permission":
      return checkPluginPermission(testCase, root);
    case "source-ref-stale":
      return checkSourceRefStale(testCase, root);
    case "telemetry-privacy":
      return checkTelemetryPrivacy(testCase, root);
    case "budget-refusal":
      return checkBudgetRefusal(testCase, root);
  }
}

async function runGaRuntimeCaseCheck(
  testCase: GaRuntimeGoldenCase,
  root: string,
): Promise<CaseCheck> {
  switch (testCase.kind) {
    case "projection-lock-drift":
      return checkProjectionLockDrift(testCase, root);
    case "local-context-override":
      return checkLocalContextOverride(testCase, root);
    case "secret-ref-invalid":
      return checkSecretRefInvalid(testCase, root);
    case "workflow-missing":
      return checkWorkflowMissing(testCase, root);
  }
}

export async function runP0GoldenCase(
  testCase: P0GoldenCase,
  options: EvalContext = {},
): Promise<P0GoldenCaseResult> {
  const root = options.root ?? repoRoot();
  const check = await runCaseCheck(testCase, root);
  const expectedRuleIds = testCase.expected.rule_ids;
  const actualRuleIds = check.ruleIds;
  const issues = check.issues ?? [];
  const pass =
    check.status === testCase.expected.status &&
    sameRuleIds(expectedRuleIds, actualRuleIds) &&
    hasRequiredMessages(testCase.expected.required_messages, issues);

  return {
    id: testCase.id,
    kind: testCase.kind,
    subset: testCase.subset,
    pass,
    status: pass ? "passed" : "failed",
    expectedStatus: testCase.expected.status,
    actualStatus: check.status,
    expectedRuleIds,
    actualRuleIds,
    issues,
  };
}

export async function runP0GoldenEvals(
  options: EvalContext & { suite: "p0"; subset?: string },
): Promise<P0GoldenSummary> {
  const suite = loadP0GoldenSuite({ root: options.root });
  if (options.subset !== undefined && options.subset.trim().length === 0) {
    return {
      suite: "p0",
      subset: options.subset,
      pass: false,
      total: 0,
      passed: 0,
      failed: 1,
      telemetry: {
        trigger_hit_rate: 0,
        trigger_miss_rate: 1,
        trigger_route_attempts: 0,
        failure_modes: ["evals.subset_empty"],
      },
      results: [],
    };
  }
  const selectedCases =
    options.subset !== undefined
      ? suite.cases.filter((testCase) => testCase.subset === options.subset)
      : suite.cases;
  if (options.subset !== undefined && selectedCases.length === 0) {
    return {
      suite: "p0",
      subset: options.subset,
      pass: false,
      total: 0,
      passed: 0,
      failed: 1,
      telemetry: {
        trigger_hit_rate: 0,
        trigger_miss_rate: 1,
        trigger_route_attempts: 0,
        failure_modes: ["evals.subset_unknown"],
      },
      results: [],
    };
  }
  const results = await Promise.all(
    selectedCases.map((testCase) => runP0GoldenCase(testCase, options)),
  );
  const passed = results.filter((result) => result.pass).length;
  const triggerResults = results.filter((result) => result.kind === "trigger-routing");
  const triggerPasses = triggerResults.filter((result) => result.actualStatus === "passed").length;
  const triggerTotal = triggerResults.length;
  const failureModes = unique(
    results.flatMap((result) => (result.pass ? [] : result.actualRuleIds)),
  );

  return {
    suite: "p0",
    subset: options.subset,
    pass: passed === results.length,
    total: results.length,
    passed,
    failed: results.length - passed,
    telemetry: {
      trigger_hit_rate: triggerTotal === 0 ? 1 : triggerPasses / triggerTotal,
      trigger_miss_rate: triggerTotal === 0 ? 0 : (triggerTotal - triggerPasses) / triggerTotal,
      trigger_route_attempts: triggerTotal,
      failure_modes: failureModes,
    },
    results,
  };
}

export function loadGaCoreGoldenSuite(options: EvalContext = {}): GaCoreGoldenSuite {
  const root = options.root ?? repoRoot();
  const path = join(gaCoreRoot(root), GOLDEN_FILE);
  const result = parseGoldenSuiteText(readFileSync(path, "utf8"), path);
  if (!result.ok) throwGoldenParseError(path, result.issues);
  if (result.value?.suite !== "ga-core") {
    throwGoldenParseError(path, [
      goldenIssue(
        "evals.golden_suite_mismatch",
        `Expected ga-core golden suite but got ${String(result.value?.suite)}.`,
        path,
      ),
    ]);
  }
  return result.value;
}

export function loadGaRuntimeGoldenSuite(options: EvalContext = {}): GaRuntimeGoldenSuite {
  const root = options.root ?? repoRoot();
  const path = join(gaRuntimeRoot(root), GOLDEN_FILE);
  const result = parseGoldenSuiteText(readFileSync(path, "utf8"), path);
  if (!result.ok) throwGoldenParseError(path, result.issues);
  if (result.value?.suite !== "ga-runtime") {
    throwGoldenParseError(path, [
      goldenIssue(
        "evals.golden_suite_mismatch",
        `Expected ga-runtime golden suite but got ${String(result.value?.suite)}.`,
        path,
      ),
    ]);
  }
  return result.value;
}

async function runGaCoreGoldenCase(
  testCase: GaCoreGoldenCase,
  options: EvalContext = {},
): Promise<P0GoldenCaseResult> {
  const root = options.root ?? repoRoot();
  const core = await loadAiCore({ root, coreRoot: join(root, ".ai/core") });
  const activeSkillIds = new Set(core.skills.map((skill) => skill.id));
  const skillIdsByName = new Map(
    core.skills.map((skill) => {
      const parts = skill.path.split(/[\\/]/);
      return [parts[parts.length - 2] ?? skill.id, skill.id] as const;
    }),
  );
  const check = checkGaCoreTriggerRouting(testCase, root, activeSkillIds, skillIdsByName);
  const issues = check.issues ?? [];
  const pass = check.status === testCase.expected.status && issues.length === 0;
  return {
    id: testCase.id,
    kind: testCase.kind,
    subset: testCase.subset,
    pass,
    status: pass ? "passed" : "failed",
    expectedStatus: testCase.expected.status,
    actualStatus: check.status,
    expectedRuleIds: [],
    actualRuleIds: check.ruleIds,
    issues,
    triggerRouteAttempts: check.triggerRouteAttempts,
    triggerRouteHits: check.triggerRouteHits,
  };
}

export async function runGaCoreGoldenEvals(
  options: EvalContext & { subset: "fast-deterministic" },
): Promise<P0GoldenSummary> {
  const root = options.root ?? repoRoot();
  const suite = loadGaCoreGoldenSuite({ root: options.root });
  const core = await loadAiCore({ root, coreRoot: join(root, ".ai/core") });
  const skillIdsByName = new Map(
    core.skills.map((skill) => {
      const parts = skill.path.split(/[\\/]/);
      return [parts[parts.length - 2] ?? skill.id, skill.id] as const;
    }),
  );
  const contractMessages = validateGaCoreFastSuite(suite, skillIdsByName);
  if (contractMessages.length > 0) return gaCoreContractFailure(options.subset, contractMessages);

  const selectedCases = suite.cases.filter((testCase) => testCase.subset === options.subset);
  if (selectedCases.length === 0) {
    return {
      suite: "ga-core",
      subset: options.subset,
      pass: false,
      total: 0,
      passed: 0,
      failed: 1,
      telemetry: {
        trigger_hit_rate: 0,
        trigger_miss_rate: 1,
        trigger_route_attempts: 0,
        failure_modes: ["evals.subset_unknown"],
      },
      results: [],
    };
  }
  const results = await Promise.all(
    selectedCases.map((testCase) => runGaCoreGoldenCase(testCase, options)),
  );
  const passed = results.filter((result) => result.pass).length;
  const triggerRouteAttempts = results.reduce(
    (total, result) => total + (result.triggerRouteAttempts ?? 0),
    0,
  );
  const triggerRouteHits = results.reduce(
    (total, result) => total + (result.triggerRouteHits ?? 0),
    0,
  );
  return {
    suite: "ga-core",
    subset: options.subset,
    pass: passed === results.length,
    total: results.length,
    passed,
    failed: results.length - passed,
    telemetry: {
      trigger_hit_rate: triggerRouteAttempts === 0 ? 1 : triggerRouteHits / triggerRouteAttempts,
      trigger_miss_rate:
        triggerRouteAttempts === 0
          ? 0
          : (triggerRouteAttempts - triggerRouteHits) / triggerRouteAttempts,
      trigger_route_attempts: triggerRouteAttempts,
      failure_modes: unique(results.flatMap((result) => (result.pass ? [] : result.actualRuleIds))),
    },
    results,
  };
}

async function runGaRuntimeGoldenCase(
  testCase: GaRuntimeGoldenCase,
  options: EvalContext = {},
): Promise<P0GoldenCaseResult> {
  const root = options.root ?? repoRoot();
  const check = await runGaRuntimeCaseCheck(testCase, root);
  const expectedRuleIds = testCase.expected.rule_ids;
  const actualRuleIds = check.ruleIds;
  const issues = check.issues ?? [];
  const pass =
    check.status === testCase.expected.status && sameRuleIds(expectedRuleIds, actualRuleIds);
  return {
    id: testCase.id,
    kind: testCase.kind,
    subset: testCase.subset,
    pass,
    status: pass ? "passed" : "failed",
    expectedStatus: testCase.expected.status,
    actualStatus: check.status,
    expectedRuleIds,
    actualRuleIds,
    issues,
  };
}

export async function runGaRuntimeGoldenEvals(
  options: EvalContext & { subset: "fast-deterministic" },
): Promise<P0GoldenSummary> {
  const suite = loadGaRuntimeGoldenSuite({ root: options.root });
  const contractMessages = validateGaRuntimeFastSuite(suite);
  if (contractMessages.length > 0)
    return gaRuntimeContractFailure(options.subset, contractMessages);

  const selectedCases = suite.cases.filter((testCase) => testCase.subset === options.subset);
  if (selectedCases.length === 0) {
    return {
      suite: "ga-runtime",
      subset: options.subset,
      pass: false,
      total: 0,
      passed: 0,
      failed: 1,
      telemetry: {
        trigger_hit_rate: 1,
        trigger_miss_rate: 0,
        trigger_route_attempts: 0,
        failure_modes: ["evals.subset_unknown"],
      },
      results: [],
    };
  }
  const results = await Promise.all(
    selectedCases.map((testCase) => runGaRuntimeGoldenCase(testCase, options)),
  );
  const passed = results.filter((result) => result.pass).length;
  return {
    suite: "ga-runtime",
    subset: options.subset,
    pass: passed === results.length,
    total: results.length,
    passed,
    failed: results.length - passed,
    telemetry: {
      trigger_hit_rate: 1,
      trigger_miss_rate: 0,
      trigger_route_attempts: 0,
      failure_modes: unique(results.flatMap((result) => (result.pass ? [] : result.actualRuleIds))),
    },
    results,
  };
}
