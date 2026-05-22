import { join } from "node:path";
import type { AiCoreIssue } from "../types.ts";

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

export type EvalContext = {
  root?: string;
};

export type RawCase = {
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

export type GaCoreGoldenCase = Omit<P0GoldenCase, "suite"> & {
  suite: "ga-core";
};

export type GaCoreGoldenSuite = {
  suite: "ga-core";
  cases: GaCoreGoldenCase[];
};

export type GaRuntimeGoldenCase = Omit<P0GoldenCase, "suite" | "kind"> & {
  suite: "ga-runtime";
  kind: GaRuntimeGoldenCaseKind;
};

export type GaRuntimeGoldenSuite = {
  suite: "ga-runtime";
  cases: GaRuntimeGoldenCase[];
};

export type GoldenSuite = P0GoldenSuite | GaCoreGoldenSuite | GaRuntimeGoldenSuite;

export type GaCoreFixtureInput = {
  text: string;
  expectedSkillId: string;
};

export type RequiredGaCoreCase = {
  id: string;
  skillName?: string;
};

export type CaseCheck = {
  status: P0GoldenStatus;
  ruleIds: string[];
  issues?: AiCoreIssue[];
  triggerRouteAttempts?: number;
  triggerRouteHits?: number;
};

export const P0_EVAL_ROOT = ".ai/core/evals/p0";
export const GA_CORE_EVAL_ROOT = ".ai/core/evals/ga-core";
export const GA_RUNTIME_EVAL_ROOT = ".ai/core/evals/ga-runtime";
export const GOLDEN_FILE = "golden.yaml";
export const FIXTURES_PREFIX = "fixtures/";
export const GA_CORE_FAST_SUBSET = "fast-deterministic";
export const GA_RUNTIME_FAST_SUBSET = "fast-deterministic";
export const GA_CORE_REQUIRED_CASES: RequiredGaCoreCase[] = [
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
export const GA_RUNTIME_KINDS: GaRuntimeGoldenCaseKind[] = [
  "projection-lock-drift",
  "local-context-override",
  "secret-ref-invalid",
  "workflow-missing",
];
export const GOLDEN_TOP_LEVEL_FIELDS = new Set(["suite", "cases"]);
export const CASE_FIELDS = new Set(["id", "subset", "kind"]);
export const INPUT_FIELDS = new Set(["fixture"]);
export const EXPECTED_FIELDS = new Set([
  "status",
  "skill_id",
  "command_alias",
  "rule_ids",
  "required_messages",
]);
export const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;

export function p0Root(root: string): string {
  return join(root, P0_EVAL_ROOT);
}

export function gaCoreRoot(root: string): string {
  return join(root, GA_CORE_EVAL_ROOT);
}

export function gaRuntimeRoot(root: string): string {
  return join(root, GA_RUNTIME_EVAL_ROOT);
}

export type GoldenNormalizeResult = {
  normalizedText: string;
  topLevelText: string;
  sawCases: boolean;
  issues: AiCoreIssue[];
};

export type GoldenKeyValue =
  | { ok: true; key: string; value: string }
  | { ok: false; issue: AiCoreIssue };

export function goldenIssue(code: string, message: string, path: string): AiCoreIssue {
  return { code, severity: "error", message, path };
}

export function parseGoldenKeyValue(
  text: string,
  lineNumber: number,
  path: string,
): GoldenKeyValue {
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

export function blockScalarIssue(
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
