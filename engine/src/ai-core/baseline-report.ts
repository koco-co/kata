import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./paths.ts";
import type { AiCoreIssue, AiCoreResult } from "./types.ts";

const BASELINE_FAILURES_PATH = ".ai/core/evals/baseline-known-failures.json";
const ENVIRONMENT_DEPENDENT_CHECKS_PATH = ".ai/core/evals/environment-dependent-checks.json";

export type KnownBaselineFailure = {
  area: string;
  reason: string;
};

export type EnvironmentDependentCheck = {
  area: string;
  command: string;
  dependency: string;
  failure_signature: string;
  default_suite_policy: "not_run_by_default";
};

export type BaselineReadinessSummary = {
  deterministicFailures: KnownBaselineFailure[];
  environmentDependentChecks: EnvironmentDependentCheck[];
};

export class BaselineKnownFailuresError extends Error {
  readonly issues: AiCoreIssue[];

  constructor(message: string) {
    super(message);
    this.name = "BaselineKnownFailuresError";
    this.issues = [
      {
        code: "baseline.contract_invalid",
        severity: "error",
        path: BASELINE_FAILURES_PATH,
        message,
      },
    ];
  }
}

export class BaselineEnvironmentDependentChecksError extends Error {
  readonly issues: AiCoreIssue[];

  constructor(message: string) {
    super(message);
    this.name = "BaselineEnvironmentDependentChecksError";
    this.issues = [
      {
        code: "baseline.contract_invalid",
        severity: "error",
        path: ENVIRONMENT_DEPENDENT_CHECKS_PATH,
        message,
      },
    ];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireNonEmptyString(input: {
  value: unknown;
  path: string;
  label: string;
  error: new (message: string) => Error;
}): string {
  if (typeof input.value !== "string" || input.value.trim() === "") {
    throw new input.error(`${input.label} ${input.path} must be a non-empty string.`);
  }
  return input.value.trim();
}

function rejectUnknownFields(input: {
  record: Record<string, unknown>;
  allowed: readonly string[];
  path: string;
  label: string;
  error: new (message: string) => Error;
}): void {
  const allowed = new Set(input.allowed);
  for (const field of Object.keys(input.record)) {
    if (!allowed.has(field)) {
      throw new input.error(
        `${input.label} ${input.path} must not contain unknown field "${field}".`,
      );
    }
  }
}

function parseKnownBaselineFailures(raw: string): KnownBaselineFailure[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new BaselineKnownFailuresError(`Invalid baseline known failures contract. ${detail}`);
  }

  if (!isRecord(data)) {
    throw new BaselineKnownFailuresError(
      "Invalid baseline known failures contract. Expected object with schema_version 1 and known_failures array.",
    );
  }
  rejectUnknownFields({
    record: data,
    allowed: ["schema_version", "known_failures"],
    path: "top-level",
    label: "Invalid baseline known failures contract.",
    error: BaselineKnownFailuresError,
  });
  if (data.schema_version !== 1 || !Array.isArray(data.known_failures)) {
    throw new BaselineKnownFailuresError(
      "Invalid baseline known failures contract. Expected object with schema_version 1 and known_failures array.",
    );
  }

  const seenAreas = new Set<string>();
  return data.known_failures.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new BaselineKnownFailuresError(
        `Invalid baseline known failures contract. known_failures[${index}].area must be a non-empty string.`,
      );
    }
    rejectUnknownFields({
      record: entry,
      allowed: ["area", "reason"],
      path: `known_failures[${index}]`,
      label: "Invalid baseline known failures contract.",
      error: BaselineKnownFailuresError,
    });
    const area = requireNonEmptyString({
      value: entry.area,
      path: `known_failures[${index}].area`,
      label: "Invalid baseline known failures contract.",
      error: BaselineKnownFailuresError,
    });
    if (seenAreas.has(area)) {
      throw new BaselineKnownFailuresError(
        `Invalid baseline known failures contract. known_failures[${index}].area duplicates "${area}".`,
      );
    }
    seenAreas.add(area);
    return {
      area,
      reason: requireNonEmptyString({
        value: entry.reason,
        path: `known_failures[${index}].reason`,
        label: "Invalid baseline known failures contract.",
        error: BaselineKnownFailuresError,
      }),
    };
  });
}

function parseEnvironmentDependentChecks(raw: string): EnvironmentDependentCheck[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new BaselineEnvironmentDependentChecksError(
      `Invalid environment-dependent checks contract. ${detail}`,
    );
  }

  if (!isRecord(data)) {
    throw new BaselineEnvironmentDependentChecksError(
      "Invalid environment-dependent checks contract. Expected object with schema_version 1 and checks array.",
    );
  }
  rejectUnknownFields({
    record: data,
    allowed: ["schema_version", "checks"],
    path: "top-level",
    label: "Invalid environment-dependent checks contract.",
    error: BaselineEnvironmentDependentChecksError,
  });
  if (data.schema_version !== 1 || !Array.isArray(data.checks)) {
    throw new BaselineEnvironmentDependentChecksError(
      "Invalid environment-dependent checks contract. Expected object with schema_version 1 and checks array.",
    );
  }

  const seenAreas = new Set<string>();
  return data.checks.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new BaselineEnvironmentDependentChecksError(
        `Invalid environment-dependent checks contract. checks[${index}].area must be a non-empty string.`,
      );
    }
    rejectUnknownFields({
      record: entry,
      allowed: ["area", "command", "dependency", "failure_signature", "default_suite_policy"],
      path: `checks[${index}]`,
      label: "Invalid environment-dependent checks contract.",
      error: BaselineEnvironmentDependentChecksError,
    });
    const area = requireNonEmptyString({
      value: entry.area,
      path: `checks[${index}].area`,
      label: "Invalid environment-dependent checks contract.",
      error: BaselineEnvironmentDependentChecksError,
    });
    if (seenAreas.has(area)) {
      throw new BaselineEnvironmentDependentChecksError(
        `Invalid environment-dependent checks contract. checks[${index}].area duplicates "${area}".`,
      );
    }
    seenAreas.add(area);
    const defaultSuitePolicy = entry.default_suite_policy;
    if (defaultSuitePolicy !== "not_run_by_default") {
      throw new BaselineEnvironmentDependentChecksError(
        `Invalid environment-dependent checks contract. checks[${index}].default_suite_policy must be "not_run_by_default".`,
      );
    }
    return {
      area,
      command: requireNonEmptyString({
        value: entry.command,
        path: `checks[${index}].command`,
        label: "Invalid environment-dependent checks contract.",
        error: BaselineEnvironmentDependentChecksError,
      }),
      dependency: requireNonEmptyString({
        value: entry.dependency,
        path: `checks[${index}].dependency`,
        label: "Invalid environment-dependent checks contract.",
        error: BaselineEnvironmentDependentChecksError,
      }),
      failure_signature: requireNonEmptyString({
        value: entry.failure_signature,
        path: `checks[${index}].failure_signature`,
        label: "Invalid environment-dependent checks contract.",
        error: BaselineEnvironmentDependentChecksError,
      }),
      default_suite_policy: defaultSuitePolicy,
    };
  });
}

export function loadKnownBaselineFailures(root = repoRoot()): KnownBaselineFailure[] {
  const raw = readFileSync(join(root, BASELINE_FAILURES_PATH), "utf8");
  return parseKnownBaselineFailures(raw);
}

export function loadEnvironmentDependentChecks(root = repoRoot()): EnvironmentDependentCheck[] {
  const raw = readFileSync(join(root, ENVIRONMENT_DEPENDENT_CHECKS_PATH), "utf8");
  return parseEnvironmentDependentChecks(raw);
}

export function loadBaselineReadinessSummary(root = repoRoot()): BaselineReadinessSummary {
  return {
    deterministicFailures: loadKnownBaselineFailures(root),
    environmentDependentChecks: loadEnvironmentDependentChecks(root),
  };
}

export function summarizeBaselineDelta(
  input: { observedAreas: string[] },
  root = repoRoot(),
): AiCoreResult<null> {
  let failures: KnownBaselineFailure[];
  try {
    failures = loadKnownBaselineFailures(root);
  } catch (error) {
    if (error instanceof BaselineKnownFailuresError) {
      return { ok: false, value: null, issues: error.issues };
    }
    throw error;
  }

  const known = new Set(failures.map((failure) => failure.area));
  const issues: AiCoreIssue[] = [];
  for (const area of input.observedAreas) {
    if (!known.has(area)) {
      issues.push({
        code: "baseline.unknown_failure",
        severity: "error",
        message: "Observed full-suite failure is not listed as a known baseline failure.",
        path: area,
      });
    }
  }

  return { ok: issues.length === 0, value: null, issues };
}
