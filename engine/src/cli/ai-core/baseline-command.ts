import type { Command } from "commander";
import type { AiCoreIssue } from "../../ai-core/types.ts";
import { deterministicBaselineFailureIssues, writeAiCoreIssues } from "./helpers.ts";

type EnvironmentDependentCheck = {
  area: string;
  command: string;
  dependency: string;
  failure_signature: string;
  default_suite_policy: "not_run_by_default";
};

type BaselineReport = {
  deterministic_failures: Array<{ area: string; reason: string }>;
  environment_dependent_checks: EnvironmentDependentCheck[];
  issues?: AiCoreIssue[];
};

export function registerBaselineCommand(aiCore: Command): void {
  // ai-core baseline
  aiCore
    .command("baseline")
    .description("Report AI Core baseline readiness")
    .option("--json", "emit JSON")
    .action(runBaselineCommand);
}

async function runBaselineCommand(opts: { json?: boolean }): Promise<void> {
  const {
    BaselineEnvironmentDependentChecksError,
    BaselineKnownFailuresError,
    loadEnvironmentDependentChecks,
    loadKnownBaselineFailures,
  } = await import("../../ai-core/baseline-report.ts");
  let deterministicFailures: Array<{ area: string; reason: string }> | undefined;
  let environmentDependentChecks: EnvironmentDependentCheck[] | undefined;
  const issues: AiCoreIssue[] = [];

  try {
    deterministicFailures = loadKnownBaselineFailures();
  } catch (error) {
    if (error instanceof BaselineKnownFailuresError) {
      issues.push(...error.issues);
    } else {
      issues.push(baselineContractIssue(".ai/core/evals/baseline-known-failures.json", error));
    }
  }

  try {
    environmentDependentChecks = loadEnvironmentDependentChecks();
  } catch (error) {
    if (error instanceof BaselineEnvironmentDependentChecksError) {
      issues.push(...error.issues);
    } else {
      issues.push(baselineContractIssue(".ai/core/evals/environment-dependent-checks.json", error));
    }
  }

  if (deterministicFailures !== undefined) {
    issues.push(...deterministicBaselineFailureIssues(deterministicFailures));
  }

  writeBaselineReport(opts, deterministicFailures, environmentDependentChecks, issues);
  if (issues.length > 0) {
    writeAiCoreIssues(issues);
    process.exitCode = 1;
  }
}

function baselineContractIssue(path: string, error: unknown): AiCoreIssue {
  return {
    code: "baseline.contract_invalid",
    severity: "error",
    path,
    message: error instanceof Error ? error.message : String(error),
  };
}

function writeBaselineReport(
  opts: { json?: boolean },
  deterministicFailures: Array<{ area: string; reason: string }> | undefined,
  environmentDependentChecks: EnvironmentDependentCheck[] | undefined,
  issues: AiCoreIssue[],
): void {
  if (opts.json === true) {
    const report: BaselineReport = {
      deterministic_failures: deterministicFailures ?? [],
      environment_dependent_checks: environmentDependentChecks ?? [],
    };
    if (issues.length > 0) report.issues = issues;
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `ai-core deterministic baseline failures: ${deterministicFailures?.length ?? "unavailable"}\n`,
  );
  process.stdout.write(
    `ai-core environment-dependent checks: ${environmentDependentChecks?.length ?? "unavailable"}\n`,
  );
}
