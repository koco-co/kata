import { Command } from "commander";
import type { GoldenSuite, GoldenSuiteId, P0GoldenSummary } from "../../ai-core/evals/types.ts";

export function registerGoldenEvalsCommand(aiCore: Command): void {
  // ai-core evals golden
  const evals = new Command("evals").description("AI Core evals");
  evals
    .command("golden")
    .description("Run deterministic golden eval suites")
    .requiredOption("--suite <suite>", "golden suite id")
    .option("--subset <subset>", "golden subset id")
    .option("--json", "emit JSON summary")
    .action(runGoldenEvalsCommand);
  aiCore.addCommand(evals);
}

async function runGoldenEvalsCommand(opts: {
  suite: string;
  subset?: string;
  json?: boolean;
}): Promise<void> {
  if (!isGoldenSuiteId(opts.suite)) {
    process.stderr.write(`evals golden: unknown suite "${opts.suite}"\n`);
    process.exitCode = 1;
    return;
  }
  if (opts.subset !== undefined && opts.subset.trim().length === 0) {
    process.stderr.write("evals golden: subset must be non-empty\n");
    process.exitCode = 1;
    return;
  }

  const evalsModule = await import("../../ai-core/evals.ts");
  const effectiveSubset = defaultGoldenSubset(opts.suite, opts.subset);
  const suite = loadGoldenSuite(opts.suite, evalsModule);
  if (!hasGoldenSubset(suite, effectiveSubset)) {
    process.stderr.write(`evals golden: unknown subset "${effectiveSubset}"\n`);
    process.exitCode = 1;
    return;
  }

  const result = await runGoldenSuite(opts.suite, effectiveSubset, evalsModule);
  writeGoldenResult(opts, effectiveSubset, result);
  if (!result.pass) writeGoldenFailures(result);
}

function isGoldenSuiteId(suite: string): suite is GoldenSuiteId {
  return suite === "p0" || suite === "ga-core" || suite === "ga-runtime";
}

function defaultGoldenSubset(suite: GoldenSuiteId, subset: string | undefined): string | undefined {
  return suite === "ga-core" || suite === "ga-runtime" ? (subset ?? "fast-deterministic") : subset;
}

function loadGoldenSuite(
  suite: GoldenSuiteId,
  evalsModule: typeof import("../../ai-core/evals.ts"),
): GoldenSuite {
  if (suite === "p0") return evalsModule.loadP0GoldenSuite();
  if (suite === "ga-core") return evalsModule.loadGaCoreGoldenSuite();
  return evalsModule.loadGaRuntimeGoldenSuite();
}

function hasGoldenSubset(suite: GoldenSuite, subset: string | undefined): boolean {
  return subset === undefined || suite.cases.some((testCase) => testCase.subset === subset);
}

async function runGoldenSuite(
  suite: GoldenSuiteId,
  subset: string | undefined,
  evalsModule: typeof import("../../ai-core/evals.ts"),
): Promise<P0GoldenSummary> {
  if (suite === "p0") return evalsModule.runP0GoldenEvals({ suite: "p0", subset });
  if (suite === "ga-core") {
    return evalsModule.runGaCoreGoldenEvals({ subset: subset as "fast-deterministic" });
  }
  return evalsModule.runGaRuntimeGoldenEvals({ subset: subset as "fast-deterministic" });
}

function writeGoldenResult(
  opts: { suite: string; json?: boolean },
  effectiveSubset: string | undefined,
  result: P0GoldenSummary,
): void {
  if (opts.json === true) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  const subset = effectiveSubset !== undefined ? `subset: ${effectiveSubset}` : "subset: all";
  console.log(
    `${opts.suite} golden evals ${result.pass ? "passed" : "failed"}: ${result.passed}/${result.total} passed (${subset})`,
  );
  console.log(
    `telemetry: trigger_hit_rate=${result.telemetry.trigger_hit_rate.toFixed(2)} trigger_miss_rate=${result.telemetry.trigger_miss_rate.toFixed(2)} failure_modes=${result.telemetry.failure_modes.length === 0 ? "none" : result.telemetry.failure_modes.join(",")}`,
  );
}

function writeGoldenFailures(result: P0GoldenSummary): void {
  for (const testCase of result.results.filter((testCase) => !testCase.pass)) {
    process.stderr.write(
      `${testCase.id}: expected ${testCase.expectedStatus} [${testCase.expectedRuleIds.join(",")}] but got ${testCase.actualStatus} [${testCase.actualRuleIds.join(",")}]\n`,
    );
  }
  process.exitCode = 1;
}
