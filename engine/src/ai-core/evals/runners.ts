import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadAiCore } from "../load.ts";
import { repoRoot } from "../paths.ts";
import { hasRequiredMessages, sameRuleIds, throwGoldenParseError, unique } from "./fixtures.ts";
import { loadP0GoldenSuite, parseGoldenSuiteText } from "./golden-parser.ts";
import { checkGaCoreTriggerRouting } from "./p0-checks.ts";
import {
  gaCoreContractFailure,
  gaRuntimeContractFailure,
  runCaseCheck,
  runGaRuntimeCaseCheck,
  validateGaCoreFastSuite,
  validateGaRuntimeFastSuite,
} from "./runtime-checks.ts";
import type {
  EvalContext,
  GaCoreGoldenCase,
  GaCoreGoldenSuite,
  GaRuntimeGoldenCase,
  GaRuntimeGoldenSuite,
  P0GoldenCase,
  P0GoldenCaseResult,
  P0GoldenSummary,
} from "./types.ts";
import { GOLDEN_FILE, gaCoreRoot, gaRuntimeRoot, goldenIssue } from "./types.ts";

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
    return emptySubsetSummary("p0", options.subset, "evals.subset_empty", 0, 1);
  }
  const selectedCases =
    options.subset !== undefined
      ? suite.cases.filter((testCase) => testCase.subset === options.subset)
      : suite.cases;
  if (options.subset !== undefined && selectedCases.length === 0) {
    return emptySubsetSummary("p0", options.subset, "evals.subset_unknown", 0, 1);
  }
  const results = await Promise.all(
    selectedCases.map((testCase) => runP0GoldenCase(testCase, options)),
  );
  return summarizeP0Results("p0", options.subset, results);
}

function emptySubsetSummary(
  suite: "p0" | "ga-core" | "ga-runtime",
  subset: string | undefined,
  failureMode: string,
  triggerHitRate: number,
  triggerMissRate: number,
): P0GoldenSummary {
  return {
    suite,
    subset,
    pass: false,
    total: 0,
    passed: 0,
    failed: 1,
    telemetry: {
      trigger_hit_rate: triggerHitRate,
      trigger_miss_rate: triggerMissRate,
      trigger_route_attempts: 0,
      failure_modes: [failureMode],
    },
    results: [],
  };
}

function summarizeP0Results(
  suite: "p0",
  subset: string | undefined,
  results: P0GoldenCaseResult[],
): P0GoldenSummary {
  const passed = results.filter((result) => result.pass).length;
  const triggerResults = results.filter((result) => result.kind === "trigger-routing");
  const triggerPasses = triggerResults.filter((result) => result.actualStatus === "passed").length;
  const triggerTotal = triggerResults.length;
  const failureModes = unique(
    results.flatMap((result) => (result.pass ? [] : result.actualRuleIds)),
  );

  return {
    suite,
    subset,
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

export async function runGaCoreGoldenCase(
  testCase: GaCoreGoldenCase,
  options: EvalContext = {},
): Promise<P0GoldenCaseResult> {
  const root = options.root ?? repoRoot();
  const core = await loadAiCore({ root, coreRoot: join(root, ".ai/core") });
  const activeSkillIds = new Set(core.skills.map((skill) => skill.id));
  const skillIdsByName = skillIdsByNameFromCore(core);
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
  const skillIdsByName = skillIdsByNameFromCore(core);
  const contractMessages = validateGaCoreFastSuite(suite, skillIdsByName);
  if (contractMessages.length > 0) return gaCoreContractFailure(options.subset, contractMessages);

  const selectedCases = suite.cases.filter((testCase) => testCase.subset === options.subset);
  if (selectedCases.length === 0) {
    return emptySubsetSummary("ga-core", options.subset, "evals.subset_unknown", 0, 1);
  }
  const results = await Promise.all(
    selectedCases.map((testCase) => runGaCoreGoldenCase(testCase, options)),
  );
  return summarizeGaCoreResults(options.subset, results);
}

function skillIdsByNameFromCore(core: Awaited<ReturnType<typeof loadAiCore>>): Map<string, string> {
  return new Map(
    core.skills.map((skill) => {
      const parts = skill.path.split(/[\\/]/);
      return [parts[parts.length - 2] ?? skill.id, skill.id] as const;
    }),
  );
}

function summarizeGaCoreResults(
  subset: "fast-deterministic",
  results: P0GoldenCaseResult[],
): P0GoldenSummary {
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
    subset,
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

export async function runGaRuntimeGoldenCase(
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
