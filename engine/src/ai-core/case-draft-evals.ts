import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { repoRoot } from "./paths.ts";
import type { AiCoreIssue, AiCoreResult } from "./types.ts";
import { parseYamlRows, parseYamlTopLevelScalars } from "./yaml-contract.ts";

export type CaseDraftEvalIssueCode =
  | "case_draft_eval.fixture_missing"
  | "case_draft_eval.blocking_output"
  | "case_draft_eval.unsupported_claim"
  | "case_draft_eval.deferred_handoff"
  | "case_draft_eval.project_inference";

export type CaseDraftWorkflowEvalCaseResult = {
  id: string;
  pass: boolean;
  fixture: string;
  expectedRuleIds: string[];
  actualRuleIds: CaseDraftEvalIssueCode[];
  issues: AiCoreIssue[];
};

export type CaseDraftWorkflowEvalSummary = {
  suite: "case-draft";
  total: number;
  passed: number;
  failed: number;
  results: CaseDraftWorkflowEvalCaseResult[];
};

export type CaseDraftFixtureOverride = {
  expected?: Record<string, unknown>;
  expected_rule_ids?: unknown;
};

export type CaseDraftWorkflowEvalOptions = {
  root?: string;
  fixtureOverrides?: Record<string, CaseDraftFixtureOverride>;
};

type CaseDraftGoldenCase = {
  id: string;
  fixture: string;
};

type CaseDraftFixture = {
  id?: unknown;
  input?: unknown;
  expected?: unknown;
  expected_rule_ids?: unknown;
};

const CASE_DRAFT_EVAL_ROOT = ".ai/core/evals/case-draft";
const GOLDEN_FILE = "golden.yaml";
const FIXTURES_PREFIX = "fixtures/";
const EXPECTED_CASE_COUNT = 8;
const ISSUE_CODES = new Set<CaseDraftEvalIssueCode>([
  "case_draft_eval.fixture_missing",
  "case_draft_eval.blocking_output",
  "case_draft_eval.unsupported_claim",
  "case_draft_eval.deferred_handoff",
  "case_draft_eval.project_inference",
]);
const EXPECTABLE_RULE_IDS = new Set<CaseDraftEvalIssueCode>([
  "case_draft_eval.blocking_output",
  "case_draft_eval.unsupported_claim",
  "case_draft_eval.deferred_handoff",
  "case_draft_eval.project_inference",
]);
const EXPECTED_RULE_IDS_KEY = "expected_rule_ids";
const SCENARIO_EXPECTED_FIELDS: Record<string, Record<string, "boolean" | "number" | "string">> = {
  "sparse-lanhu-only": {
    confirmation_package_generated: "boolean",
    has_blocking_unknown: "boolean",
    blocking_unknown_count: "number",
    draft_artifacts_generated: "boolean",
    final_archive_generated: "boolean",
    cases_xmind_generated: "boolean",
    final_case_artifacts_generated: "boolean",
    unsupported_claim_rate: "number",
  },
  "lanhu-plus-history": {
    confirmation_package_generated: "boolean",
    defaultable_inferred_atom_count: "number",
    confirmed_inferred_atom_count: "number",
    inferred_atoms_promoted_to_confirmed: "boolean",
    has_blocking_unknown: "boolean",
    unsupported_claim_rate: "number",
  },
  "conflicting-history": {
    confirmation_package_generated: "boolean",
    product_confirmation_question_count: "number",
    question_topic: "string",
    has_blocking_unknown: "boolean",
    final_archive_generated: "boolean",
    unsupported_claim_rate: "number",
  },
  "inferable-project": {
    inferred_project: "string",
    project_question_count: "number",
    confirmation_package_generated: "boolean",
    unsupported_claim_rate: "number",
  },
  "multi-candidate-project": {
    project_question_count: "number",
    project_question_focused: "boolean",
    project_question_text: "string",
    confirmation_package_generated: "boolean",
    unsupported_claim_rate: "number",
  },
  "non-blocking-pending": {
    has_non_blocking_pending: "boolean",
    blocking_unknown_count: "number",
    final_archive_generated: "boolean",
    cases_xmind_generated: "boolean",
    final_case_artifacts_generated: "boolean",
    pending_impact_text: "string",
    unsupported_claim_rate: "number",
  },
  "blocking-unknown": {
    has_blocking_unknown: "boolean",
    blocking_unknown_count: "number",
    draft_artifacts_generated: "boolean",
    unresolved_summary_generated: "boolean",
    final_archive_generated: "boolean",
    cases_xmind_generated: "boolean",
    final_case_artifacts_generated: "boolean",
    unsupported_claim_rate: "number",
  },
  "automation-deferred": {
    manual_cases_generated: "boolean",
    final_archive_generated: "boolean",
    cases_xmind_generated: "boolean",
    automation_deferred: "boolean",
    automation_status: "string",
    ready_automation_handoff_generated: "boolean",
    automation_handoff_ready: "boolean",
    ready_automation_intent_count: "number",
    unsupported_claim_rate: "number",
  },
};

function issue(
  code: CaseDraftEvalIssueCode,
  message: string,
  path = `${CASE_DRAFT_EVAL_ROOT}/${GOLDEN_FILE}`,
): AiCoreIssue {
  return { code, severity: "error", message, path };
}

function caseDraftEvalRoot(root: string): string {
  return join(root, CASE_DRAFT_EVAL_ROOT);
}

function stableRuleIds(issues: AiCoreIssue[]): CaseDraftEvalIssueCode[] {
  return [
    ...new Set(
      issues
        .map((item) => item.code)
        .filter((code): code is CaseDraftEvalIssueCode =>
          ISSUE_CODES.has(code as CaseDraftEvalIssueCode),
        ),
    ),
  ].sort();
}

function sameRuleIds(left: string[], right: string[]): boolean {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((value, index) => value === sortedRight[index])
  );
}

export function parseCaseDraftGoldenText(
  text: string,
  path: string,
): AiCoreResult<CaseDraftGoldenCase[]> {
  const topLevel = parseYamlTopLevelScalars(text, path);
  const rows = parseYamlRows(text, path, "cases");
  const issues: AiCoreIssue[] = [...topLevel.issues, ...rows.issues];
  const suite = topLevel.value?.suite;
  if (suite !== "case-draft") {
    issues.push(
      issue(
        "case_draft_eval.fixture_missing",
        `Case-draft golden suite must declare suite: case-draft, got ${String(suite)}.`,
        path,
      ),
    );
  }
  if (!text.match(/^cases:\s*$/m)) {
    issues.push(
      issue("case_draft_eval.fixture_missing", "Case-draft golden suite is missing cases.", path),
    );
  }
  if (!rows.ok) return { ok: false, issues };

  const cases = (rows.value ?? []).map((row) => ({
    id: row.id ?? "",
    fixture: row.fixture ?? row.input_fixture ?? "",
  }));
  const seen = new Set<string>();
  for (const [index, testCase] of cases.entries()) {
    if (testCase.id.length === 0) {
      issues.push(
        issue(
          "case_draft_eval.fixture_missing",
          `Case-draft golden case at row ${index + 1} is missing id.`,
          path,
        ),
      );
    } else if (seen.has(testCase.id)) {
      issues.push(
        issue(
          "case_draft_eval.fixture_missing",
          `Duplicate case-draft golden case id: ${testCase.id}.`,
          path,
        ),
      );
    }
    seen.add(testCase.id);
    if (testCase.fixture.length === 0) {
      issues.push(
        issue(
          "case_draft_eval.fixture_missing",
          `Case-draft golden case ${testCase.id || `row ${index + 1}`} is missing fixture.`,
          path,
        ),
      );
    }
  }
  if (cases.length !== EXPECTED_CASE_COUNT) {
    issues.push(
      issue(
        "case_draft_eval.fixture_missing",
        `Case-draft golden suite must declare exactly ${EXPECTED_CASE_COUNT} cases, got ${cases.length}.`,
        path,
      ),
    );
  }
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, value: cases, issues: [] };
}

function safeFixturePath(root: string, fixture: string): string | AiCoreIssue {
  if (
    fixture !== fixture.trim() ||
    fixture.includes("\0") ||
    isAbsolute(fixture) ||
    !fixture.startsWith(FIXTURES_PREFIX)
  ) {
    return issue(
      "case_draft_eval.fixture_missing",
      `Case-draft fixture path must stay under ${FIXTURES_PREFIX}: ${fixture}`,
    );
  }
  const relativeFixture = fixture.slice(FIXTURES_PREFIX.length);
  const pathParts = relativeFixture.split(/[\\/]/);
  if (
    relativeFixture.length === 0 ||
    pathParts.some((part) => part.length === 0 || part === "." || part === "..")
  ) {
    return issue(
      "case_draft_eval.fixture_missing",
      `Case-draft fixture path must not contain dot segments: ${fixture}`,
    );
  }
  const fixturesRoot = join(caseDraftEvalRoot(root), "fixtures");
  const fullPath = resolve(fixturesRoot, relativeFixture);
  const relativePath = relative(fixturesRoot, fullPath);
  if (
    relativePath.startsWith("..") ||
    relativePath === "" ||
    relativePath.includes("\0") ||
    isAbsolute(relativePath)
  ) {
    return issue(
      "case_draft_eval.fixture_missing",
      `Case-draft fixture path escapes fixtures root: ${fixture}`,
    );
  }
  return fullPath;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expectedRecord(fixture: CaseDraftFixture): Record<string, unknown> {
  return isRecord(fixture.expected) ? fixture.expected : {};
}

function boolField(expected: Record<string, unknown>, name: string): boolean | undefined {
  const value = expected[name];
  return typeof value === "boolean" ? value : undefined;
}

function numberField(expected: Record<string, unknown>, name: string): number | undefined {
  const value = expected[name];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringField(expected: Record<string, unknown>, name: string): string | undefined {
  const value = expected[name];
  return typeof value === "string" ? value : undefined;
}

function expectedRuleIds(fixture: CaseDraftFixture): string[] {
  return Array.isArray(fixture.expected_rule_ids)
    ? fixture.expected_rule_ids.filter(
        (item): item is CaseDraftEvalIssueCode =>
          typeof item === "string" && EXPECTABLE_RULE_IDS.has(item as CaseDraftEvalIssueCode),
      )
    : [];
}

function mergeFixtureOverride(
  fixture: CaseDraftFixture,
  override: CaseDraftFixtureOverride | undefined,
): CaseDraftFixture {
  if (!override) return fixture;
  const merged: CaseDraftFixture = {
    ...fixture,
    expected: {
      ...expectedRecord(fixture),
      ...(override.expected ?? {}),
    },
  };
  if (Object.hasOwn(override, EXPECTED_RULE_IDS_KEY)) {
    merged.expected_rule_ids = override.expected_rule_ids;
  }
  return merged;
}

function hasBlockingUnknown(id: string, expected: Record<string, unknown>): boolean {
  return (
    id === "blocking-unknown" ||
    boolField(expected, "has_blocking_unknown") === true ||
    boolField(expected, "blocking_unknown") === true ||
    (numberField(expected, "blocking_unknown_count") ?? 0) > 0
  );
}

function hasFinalOutput(expected: Record<string, unknown>): boolean {
  return (
    boolField(expected, "final_archive_generated") === true ||
    boolField(expected, "cases_xmind_generated") === true ||
    boolField(expected, "final_case_artifacts_generated") === true
  );
}

function hasDeferredAutomation(id: string, expected: Record<string, unknown>): boolean {
  return (
    id === "automation-deferred" ||
    boolField(expected, "automation_deferred") === true ||
    stringField(expected, "automation_status") === "deferred"
  );
}

function hasReadyAutomationHandoff(expected: Record<string, unknown>): boolean {
  return (
    boolField(expected, "ready_automation_handoff_generated") === true ||
    boolField(expected, "automation_handoff_ready") === true ||
    (numberField(expected, "ready_automation_intent_count") ?? 0) > 0 ||
    stringField(expected, "automation_status") === "ready"
  );
}

function projectQuestionCount(expected: Record<string, unknown>): number | undefined {
  return (
    numberField(expected, "project_question_count") ??
    numberField(expected, "project_clarification_question_count")
  );
}

function checkFixture(goldenCase: CaseDraftGoldenCase, fixture: CaseDraftFixture): AiCoreIssue[] {
  const expected = expectedRecord(fixture);
  const path = `${CASE_DRAFT_EVAL_ROOT}/fixtures/${goldenCase.id}.json`;
  const issues: AiCoreIssue[] = [];
  const unsupportedClaimRate = numberField(expected, "unsupported_claim_rate") ?? 0;
  const unsupportedClaimCount = numberField(expected, "unsupported_claim_count") ?? 0;

  if (hasBlockingUnknown(goldenCase.id, expected) && hasFinalOutput(expected)) {
    issues.push(
      issue(
        "case_draft_eval.blocking_output",
        "Blocking unknown cases must not claim final archive or final case artifacts.",
        `${path}#expected.final_archive_generated`,
      ),
    );
  }
  if (unsupportedClaimRate > 0 || unsupportedClaimCount > 0) {
    issues.push(
      issue(
        "case_draft_eval.unsupported_claim",
        "Sparse PRD evals must not include unsupported final claims.",
        `${path}#expected.unsupported_claim_rate`,
      ),
    );
  }
  if (hasDeferredAutomation(goldenCase.id, expected) && hasReadyAutomationHandoff(expected)) {
    issues.push(
      issue(
        "case_draft_eval.deferred_handoff",
        "Deferred automation cases must not claim a ready automation handoff.",
        `${path}#expected.automation_handoff_ready`,
      ),
    );
  }
  if (goldenCase.id === "inferable-project" && (projectQuestionCount(expected) ?? 0) !== 0) {
    issues.push(
      issue(
        "case_draft_eval.project_inference",
        "Inferable project cases must not ask the user to choose a project.",
        `${path}#expected.project_question_count`,
      ),
    );
  }
  if (goldenCase.id === "multi-candidate-project") {
    const focused = boolField(expected, "project_question_focused");
    if ((projectQuestionCount(expected) ?? 0) !== 1 || focused === false) {
      issues.push(
        issue(
          "case_draft_eval.project_inference",
          "Multi-candidate project cases must ask exactly one focused project question.",
          `${path}#expected.project_question_count`,
        ),
      );
    }
  }
  return issues;
}

function fixturePath(testCase: CaseDraftGoldenCase): string {
  return `${CASE_DRAFT_EVAL_ROOT}/${testCase.fixture}`;
}

function validateFieldType(value: unknown, type: "boolean" | "number" | "string"): boolean {
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === type;
}

function validateFixtureContract(
  goldenCase: CaseDraftGoldenCase,
  fixture: CaseDraftFixture,
): AiCoreIssue[] {
  const path = fixturePath(goldenCase);
  const issues: AiCoreIssue[] = [];

  if (typeof fixture.id !== "string" || fixture.id !== goldenCase.id) {
    issues.push(
      issue(
        "case_draft_eval.fixture_missing",
        `Case-draft fixture id must match golden case id ${goldenCase.id}.`,
        `${path}#id`,
      ),
    );
  }
  if (!isRecord(fixture.input)) {
    issues.push(
      issue(
        "case_draft_eval.fixture_missing",
        "Case-draft fixture input must be an object.",
        `${path}#input`,
      ),
    );
  }
  if (!isRecord(fixture.expected)) {
    issues.push(
      issue(
        "case_draft_eval.fixture_missing",
        "Case-draft fixture expected must be an object.",
        `${path}#expected`,
      ),
    );
  }
  if (!Array.isArray(fixture.expected_rule_ids)) {
    issues.push(
      issue(
        "case_draft_eval.fixture_missing",
        "Case-draft fixture expected_rule_ids must be an array.",
        `${path}#expected_rule_ids`,
      ),
    );
  } else {
    for (const [index, ruleId] of fixture.expected_rule_ids.entries()) {
      if (
        typeof ruleId !== "string" ||
        !EXPECTABLE_RULE_IDS.has(ruleId as CaseDraftEvalIssueCode)
      ) {
        issues.push(
          issue(
            "case_draft_eval.fixture_missing",
            `Case-draft fixture expected_rule_ids[${index}] must be an expectable case-draft business rule id.`,
            `${path}#expected_rule_ids[${index}]`,
          ),
        );
      }
    }
  }

  const expected = expectedRecord(fixture);
  const expectedFields = SCENARIO_EXPECTED_FIELDS[goldenCase.id];
  if (!expectedFields) {
    issues.push(
      issue(
        "case_draft_eval.fixture_missing",
        `Case-draft fixture has no required-field contract for scenario ${goldenCase.id}.`,
        `${path}#expected`,
      ),
    );
    return issues;
  }

  for (const [field, type] of Object.entries(expectedFields)) {
    if (!validateFieldType(expected[field], type)) {
      issues.push(
        issue(
          "case_draft_eval.fixture_missing",
          `Case-draft fixture expected.${field} must be a ${type}.`,
          `${path}#expected.${field}`,
        ),
      );
    }
  }

  return issues;
}

function compareExpectedRuleIds(
  testCase: CaseDraftGoldenCase,
  expectedIds: string[],
  actualIssues: AiCoreIssue[],
): AiCoreIssue[] {
  const actualIds = stableRuleIds(actualIssues);
  if (sameRuleIds(expectedIds, actualIds)) return [];
  const missingExpectedIds = expectedIds.filter(
    (id) => !actualIds.includes(id as CaseDraftEvalIssueCode),
  );
  return [
    ...actualIssues.filter((item) => !expectedIds.includes(item.code)),
    ...missingExpectedIds.map((id) =>
      issue(
        ISSUE_CODES.has(id as CaseDraftEvalIssueCode)
          ? (id as CaseDraftEvalIssueCode)
          : "case_draft_eval.unsupported_claim",
        `Expected case-draft eval rule id did not fire for ${testCase.id}: ${id}.`,
        `${CASE_DRAFT_EVAL_ROOT}/${GOLDEN_FILE}#${testCase.id}`,
      ),
    ),
  ];
}

function readFixture(testCase: CaseDraftGoldenCase, root: string): AiCoreResult<CaseDraftFixture> {
  const safePath = safeFixturePath(root, testCase.fixture);
  if (typeof safePath !== "string") return { ok: false, issues: [safePath] };
  if (!existsSync(safePath)) {
    return {
      ok: false,
      issues: [
        issue(
          "case_draft_eval.fixture_missing",
          `Missing case-draft eval fixture: ${testCase.fixture}`,
          safePath,
        ),
      ],
    };
  }
  try {
    const parsed = JSON.parse(readFileSync(safePath, "utf8")) as unknown;
    if (!isRecord(parsed)) {
      return {
        ok: false,
        issues: [
          issue(
            "case_draft_eval.fixture_missing",
            `Case-draft eval fixture must be a JSON object: ${testCase.fixture}`,
            safePath,
          ),
        ],
      };
    }
    return { ok: true, value: parsed, issues: [] };
  } catch (error) {
    return {
      ok: false,
      issues: [
        issue(
          "case_draft_eval.fixture_missing",
          error instanceof Error ? error.message : String(error),
          safePath,
        ),
      ],
    };
  }
}

export async function runCaseDraftWorkflowEvals(
  options: CaseDraftWorkflowEvalOptions = {},
): Promise<AiCoreResult<CaseDraftWorkflowEvalSummary>> {
  const root = options.root ?? repoRoot();
  const goldenPath = join(caseDraftEvalRoot(root), GOLDEN_FILE);
  if (!existsSync(goldenPath)) {
    return {
      ok: false,
      issues: [
        issue(
          "case_draft_eval.fixture_missing",
          "Missing case-draft eval golden suite.",
          goldenPath,
        ),
      ],
    };
  }

  const suite = parseCaseDraftGoldenText(readFileSync(goldenPath, "utf8"), goldenPath);
  if (!suite.ok) return { ok: false, issues: suite.issues };

  const results: CaseDraftWorkflowEvalCaseResult[] = [];
  const topLevelIssues: AiCoreIssue[] = [];
  for (const testCase of suite.value ?? []) {
    const fixtureResult = readFixture(testCase, root);
    if (!fixtureResult.ok || !fixtureResult.value) {
      const actualRuleIds = stableRuleIds(fixtureResult.issues);
      results.push({
        id: testCase.id,
        pass: false,
        fixture: testCase.fixture,
        expectedRuleIds: [],
        actualRuleIds,
        issues: fixtureResult.issues,
      });
      topLevelIssues.push(...fixtureResult.issues);
      continue;
    }
    const fixture = mergeFixtureOverride(
      fixtureResult.value,
      options.fixtureOverrides?.[testCase.id],
    );
    const expectedIds = expectedRuleIds(fixture);
    const contractIssues = validateFixtureContract(testCase, fixture);
    const actualIssues =
      contractIssues.length > 0 ? contractIssues : checkFixture(testCase, fixture);
    const mismatches =
      contractIssues.length > 0
        ? contractIssues
        : compareExpectedRuleIds(testCase, expectedIds, actualIssues);
    const actualRuleIds = stableRuleIds(actualIssues);
    results.push({
      id: testCase.id,
      pass: mismatches.length === 0,
      fixture: testCase.fixture,
      expectedRuleIds: expectedIds,
      actualRuleIds,
      issues: actualIssues,
    });
    topLevelIssues.push(...mismatches);
  }

  const passed = results.filter((result) => result.pass).length;
  const failed = results.length - passed;
  return {
    ok: failed === 0,
    value: {
      suite: "case-draft",
      total: results.length,
      passed,
      failed,
      results,
    },
    issues: topLevelIssues,
  };
}
