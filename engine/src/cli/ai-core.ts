import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Command } from "commander";
import { auditLocalContext } from "../ai-core/context-audit.ts";
import type { P0GoldenSummary } from "../ai-core/evals.ts";
import { buildRuntimeImportRecords, RuntimeImportRecordError } from "../ai-core/import-runtime.ts";
import { rewriteProjectionInventoryFromLedgers } from "../ai-core/inventory-ledger.ts";
import { lintAiCore } from "../ai-core/lint.ts";
import { loadAiCore } from "../ai-core/load.ts";
import { auditAiCoreParserBoundaries } from "../ai-core/parser-boundary-audit.ts";
import { repoRoot } from "../ai-core/paths.ts";
import { diffLegacyProjection } from "../ai-core/projection-diff.ts";
import {
  parseProjectionInventory,
  scanRuntimeFiles,
  validateProjectionInventory,
} from "../ai-core/projection-inventory.ts";
import type { AiCoreIssue } from "../ai-core/types.ts";
import { validateAiCoreStrict } from "../ai-core/validate.ts";
import { isAiCoreConfigEnvName, resolveAiCoreConfig } from "../config/ai-core-config.ts";
import type { ProjectionRuntime } from "../runtime/projection-targets.ts";

function isProjectionRuntime(value: string): value is "all" | ProjectionRuntime {
  return value === "all" || value === "claude" || value === "codex";
}

function aiCoreRuntimeEnv(env: NodeJS.ProcessEnv): Record<string, string | undefined> {
  const scopedEnv: Record<string, string | undefined> = {};
  for (const [name, value] of Object.entries(env)) {
    if (isAiCoreConfigEnvName(name)) {
      scopedEnv[name] = value;
    }
  }
  return scopedEnv;
}

function failOnInvalidConfig(): boolean {
  const config = resolveAiCoreConfig({ env: aiCoreRuntimeEnv(process.env) });
  if (config.ok) return false;

  writeAiCoreIssues(config.issues);
  process.exitCode = 1;
  return true;
}

function writeAiCoreIssues(issues: AiCoreIssue[]): void {
  for (const issue of issues) {
    process.stderr.write(`${issue.code}: ${issue.path}: ${issue.message}\n`);
  }
}

function goldenSummaryIssues(
  summary: P0GoldenSummary,
  suite: "p0" | "ga-core" | "ga-runtime",
): AiCoreIssue[] {
  const failedResults = summary.results.filter((result) => !result.pass);
  const normalizedSuite = suite.replace(/-/g, "_");
  const issues = failedResults.flatMap((result) => [
    {
      code: `eval.${normalizedSuite}_failed`,
      severity: "error" as const,
      path: `.ai/core/evals/${suite}/golden.yaml#${result.id}`,
      message: [
        `${suite} golden eval failed: expected ${result.expectedStatus} [${result.expectedRuleIds.join(",")}]`,
        `but got ${result.actualStatus} [${result.actualRuleIds.join(",")}].`,
      ].join(" "),
    },
    ...result.issues,
  ]);

  if (!summary.pass && issues.length === 0) {
    issues.push({
      code: `eval.${normalizedSuite}_failed`,
      severity: "error",
      path: `.ai/core/evals/${suite}/golden.yaml`,
      message: `${suite} golden eval suite failed: ${summary.passed}/${summary.total} passed.`,
    });
  }

  return issues;
}

export function gateResultIssues(input: {
  name: string;
  path: string;
  result: { ok: boolean; issues: AiCoreIssue[] };
}): AiCoreIssue[] {
  if (input.result.ok || input.result.issues.length > 0) return input.result.issues;
  return [
    {
      code: "gate.check_failed",
      severity: "error",
      path: input.path,
      message: `${input.name} failed without reporting issues.`,
    },
  ];
}

function dedupeAiCoreIssues(issues: AiCoreIssue[]): AiCoreIssue[] {
  const seen = new Set<string>();
  const deduped: AiCoreIssue[] = [];
  for (const issue of issues) {
    const key = `${issue.code}\0${issue.path}\0${issue.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(issue);
  }
  return deduped;
}

function blockingAiCoreIssues(issues: AiCoreIssue[]): AiCoreIssue[] {
  return issues.filter((issue) => issue.severity === "error");
}

function deterministicBaselineFailureIssues(
  failures: Array<{ area: string; reason: string }>,
): AiCoreIssue[] {
  return failures.map((failure) => ({
    code: "baseline.deterministic_failure",
    severity: "error",
    path: `.ai/core/evals/baseline-known-failures.json#${failure.area}`,
    message: `Deterministic baseline failure remains documented: ${failure.reason}`,
  }));
}

function validateCurrentProjectionInventory(): {
  files: string[];
  inventory: ReturnType<typeof parseProjectionInventory>;
  issues: AiCoreIssue[];
  ok: boolean;
} {
  const root = repoRoot();
  const inventory = parseProjectionInventory(
    readFileSync(join(root, ".ai/core/runtimes/projection-inventory.yaml"), "utf8"),
  );
  const files = scanRuntimeFiles(root);
  const result = validateProjectionInventory({ files, inventory });
  return {
    files,
    inventory,
    issues: result.issues,
    ok: result.issues.every((issue) => issue.severity !== "error"),
  };
}

export function buildAiCoreCommand(): Command {
  const aiCore = new Command("ai-core").description("AI Core contract operations");

  // ai-core evals golden
  const evals = new Command("evals").description("AI Core evals");
  evals
    .command("golden")
    .description("Run deterministic golden eval suites")
    .requiredOption("--suite <suite>", "golden suite id")
    .option("--subset <subset>", "golden subset id")
    .option("--json", "emit JSON summary")
    .action(async (opts: { suite: string; subset?: string; json?: boolean }) => {
      if (opts.suite !== "p0" && opts.suite !== "ga-core" && opts.suite !== "ga-runtime") {
        process.stderr.write(`evals golden: unknown suite "${opts.suite}"\n`);
        process.exitCode = 1;
        return;
      }

      if (opts.subset !== undefined && opts.subset.trim().length === 0) {
        process.stderr.write("evals golden: subset must be non-empty\n");
        process.exitCode = 1;
        return;
      }
      const effectiveSubset =
        opts.suite === "ga-core" || opts.suite === "ga-runtime"
          ? (opts.subset ?? "fast-deterministic")
          : opts.subset;
      const {
        loadGaCoreGoldenSuite,
        loadGaRuntimeGoldenSuite,
        loadP0GoldenSuite,
        runGaCoreGoldenEvals,
        runGaRuntimeGoldenEvals,
        runP0GoldenEvals,
      } = await import("../ai-core/evals.ts");
      const suite =
        opts.suite === "p0"
          ? loadP0GoldenSuite()
          : opts.suite === "ga-core"
            ? loadGaCoreGoldenSuite()
            : loadGaRuntimeGoldenSuite();
      if (
        effectiveSubset !== undefined &&
        !suite.cases.some((testCase) => testCase.subset === effectiveSubset)
      ) {
        process.stderr.write(`evals golden: unknown subset "${effectiveSubset}"\n`);
        process.exitCode = 1;
        return;
      }

      const result =
        opts.suite === "p0"
          ? await runP0GoldenEvals({ suite: "p0", subset: effectiveSubset })
          : opts.suite === "ga-core"
            ? await runGaCoreGoldenEvals({ subset: effectiveSubset as "fast-deterministic" })
            : await runGaRuntimeGoldenEvals({ subset: effectiveSubset as "fast-deterministic" });

      if (opts.json === true) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        const subset = effectiveSubset !== undefined ? `subset: ${effectiveSubset}` : "subset: all";
        process.stdout.write(
          `${opts.suite} golden evals ${result.pass ? "passed" : "failed"}: ${result.passed}/${result.total} passed (${subset})\n`,
        );
        process.stdout.write(
          `telemetry: trigger_hit_rate=${result.telemetry.trigger_hit_rate.toFixed(2)} trigger_miss_rate=${result.telemetry.trigger_miss_rate.toFixed(2)} failure_modes=${result.telemetry.failure_modes.length === 0 ? "none" : result.telemetry.failure_modes.join(",")}\n`,
        );
      }

      if (!result.pass) {
        for (const testCase of result.results.filter((testCase) => !testCase.pass)) {
          process.stderr.write(
            `${testCase.id}: expected ${testCase.expectedStatus} [${testCase.expectedRuleIds.join(",")}] but got ${testCase.actualStatus} [${testCase.actualRuleIds.join(",")}]\n`,
          );
        }
        process.exitCode = 1;
      }
    });
  aiCore.addCommand(evals);

  // ai-core case-draft evals
  const caseDraft = new Command("case-draft").description("AI Core case-draft evals");
  caseDraft
    .command("evals")
    .description("Run deterministic sparse PRD case-draft evals")
    .option("--json", "emit JSON summary")
    .action(async (opts: { json?: boolean }) => {
      const { runCaseDraftWorkflowEvals } = await import("../ai-core/case-draft-evals.ts");
      const result = await runCaseDraftWorkflowEvals();
      if (opts.json === true) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        const passed = result.value?.passed ?? 0;
        const total = result.value?.total ?? 0;
        process.stdout.write(
          `case-draft sparse PRD evals ${result.ok ? "passed" : "failed"}: ${passed}/${total} passed\n`,
        );
      }
      if (!result.ok) {
        writeAiCoreIssues(result.issues);
        process.exitCode = 1;
      }
    });
  aiCore.addCommand(caseDraft);

  // ai-core schemas-compat-check
  aiCore
    .command("schemas-compat-check")
    .description("Run AI Core schema compatibility checks")
    .action(async () => {
      const { runSchemaCompatCheck } = await import("../ai-core/schema-compat.ts");
      const result = await runSchemaCompatCheck();
      if (!result.ok) {
        writeAiCoreIssues(result.issues);
        process.exitCode = 1;
        return;
      }
      process.stdout.write("schemas compat check passed\n");
    });

  // ai-core gate
  aiCore
    .command("gate")
    .description("Run AI Core release gates")
    .requiredOption("--scope <scope>", "release gate scope")
    .action(async (opts: { scope: string }) => {
      if (
        opts.scope !== "p0" &&
        opts.scope !== "ga-core-import" &&
        opts.scope !== "ga-core-runtime" &&
        opts.scope !== "ga-completion"
      ) {
        process.stderr.write(
          "Supported --scope values: p0, ga-core-import, ga-core-runtime, ga-completion\n",
        );
        process.exitCode = 1;
        return;
      }
      if (failOnInvalidConfig()) return;

      const core = await loadAiCore();
      const validation = await validateAiCoreStrict(core);
      const [{ checkProjection }, evalModule, { runSchemaCompatCheck }, lint] = await Promise.all([
        import("../ai-core/projection.ts"),
        import("../ai-core/evals.ts"),
        import("../ai-core/schema-compat.ts"),
        lintAiCore({ strict: true }),
      ]);

      if (opts.scope === "p0") {
        const [projection, evals] = await Promise.all([
          checkProjection({ runtime: "all" }),
          evalModule.runP0GoldenEvals({ suite: "p0", subset: "fast-deterministic" }),
        ]);
        const issues = [
          ...validation.issues,
          ...lint.issues,
          ...projection.issues,
          ...goldenSummaryIssues(evals, "p0"),
        ];

        const allBlockingIssues = blockingAiCoreIssues(issues);
        if (allBlockingIssues.length > 0) {
          writeAiCoreIssues(allBlockingIssues);
          process.exitCode = 1;
          return;
        }

        process.stdout.write("ai-core p0 gate passed\n");
        return;
      }

      if (opts.scope === "ga-core-runtime" || opts.scope === "ga-completion") {
        const [
          projection,
          schemaCompat,
          preflight,
          p0Evals,
          gaCoreEvals,
          gaRuntimeEvals,
          projectionLockModule,
          contractSchemaModule,
          docsModule,
          baselineModule,
        ] = await Promise.all([
          checkProjection({ runtime: "all" }),
          runSchemaCompatCheck(),
          import("../ai-core/preflight.ts").then((module) =>
            module.runAiCorePreflight({ runtime: "all" }),
          ),
          evalModule.runP0GoldenEvals({ suite: "p0", subset: "fast-deterministic" }),
          evalModule.runGaCoreGoldenEvals({ subset: "fast-deterministic" }),
          evalModule.runGaRuntimeGoldenEvals({ subset: "fast-deterministic" }),
          import("../ai-core/projection-lock.ts"),
          import("../ai-core/contract-schema.ts"),
          import("../ai-core/docs-renderer.ts"),
          import("../ai-core/baseline-report.ts"),
        ]);
        const contractSchemas =
          opts.scope === "ga-completion"
            ? await contractSchemaModule.validateAllAiCoreContracts({ root: core.root })
            : { ok: true, issues: [] };
        const docs =
          opts.scope === "ga-completion"
            ? await docsModule.checkDocsBlocks()
            : { ok: true, issues: [] };
        const caseDraftWorkflowEvals =
          opts.scope === "ga-completion"
            ? await import("../ai-core/case-draft-evals.ts").then((module) =>
                module.runCaseDraftWorkflowEvals(),
              )
            : { ok: true, issues: [], value: { passed: 0, total: 0 } };
        let deterministicBaselineFailures: Array<{ area: string; reason: string }> = [];
        let environmentDependentChecks: Array<{ area: string }> = [];
        const baselineIssues: AiCoreIssue[] = [];
        if (opts.scope === "ga-completion") {
          try {
            deterministicBaselineFailures = baselineModule.loadKnownBaselineFailures();
          } catch (error) {
            if (error instanceof baselineModule.BaselineKnownFailuresError) {
              baselineIssues.push(...error.issues);
            } else {
              baselineIssues.push({
                code: "baseline.contract_invalid",
                severity: "error",
                path: ".ai/core/evals/baseline-known-failures.json",
                message: error instanceof Error ? error.message : String(error),
              });
            }
          }
          try {
            environmentDependentChecks = baselineModule.loadEnvironmentDependentChecks();
          } catch (error) {
            if (error instanceof baselineModule.BaselineEnvironmentDependentChecksError) {
              baselineIssues.push(...error.issues);
            } else {
              baselineIssues.push({
                code: "baseline.contract_invalid",
                severity: "error",
                path: ".ai/core/evals/environment-dependent-checks.json",
                message: error instanceof Error ? error.message : String(error),
              });
            }
          }
        }
        const projectionInventory = validateCurrentProjectionInventory();
        const projectionLock = projectionLockModule.readProjectionLock(
          join(repoRoot(), ".ai/core/runtimes/projection-lock.json"),
        );
        const projectionLockCheck = projectionLock.ok
          ? projectionLockModule.checkProjectionLock({ lock: projectionLock.value! })
          : projectionLock;
        const localContext = auditLocalContext();
        const parserBoundary =
          opts.scope === "ga-completion" ? auditAiCoreParserBoundaries() : { ok: true, issues: [] };
        const issues = dedupeAiCoreIssues([
          ...validation.issues,
          ...lint.issues,
          ...gateResultIssues({
            name: "AI Core contract schema",
            path: ".ai/core",
            result: contractSchemas,
          }),
          ...gateResultIssues({
            name: "projection check",
            path: ".ai/core/runtimes",
            result: projection,
          }),
          ...gateResultIssues({
            name: "projection inventory",
            path: ".ai/core/runtimes/projection-inventory.yaml",
            result: projectionInventory,
          }),
          ...gateResultIssues({
            name: "projection lock",
            path: ".ai/core/runtimes/projection-lock.json",
            result: projectionLockCheck,
          }),
          ...gateResultIssues({
            name: "runtime preflight",
            path: ".ai/core/runtimes",
            result: preflight,
          }),
          ...gateResultIssues({
            name: "local context audit",
            path: ".ai/core/context/local-context.yaml",
            result: localContext,
          }),
          ...gateResultIssues({
            name: "parser boundary audit",
            path: "engine/src/ai-core",
            result: parserBoundary,
          }),
          ...gateResultIssues({
            name: "schema compatibility",
            path: ".ai/core/schemas",
            result: schemaCompat,
          }),
          ...gateResultIssues({ name: "generated docs blocks", path: "README.md", result: docs }),
          ...gateResultIssues({
            name: "case-draft sparse PRD evals",
            path: ".ai/core/evals/case-draft",
            result: caseDraftWorkflowEvals,
          }),
          ...baselineIssues,
          ...deterministicBaselineFailureIssues(deterministicBaselineFailures),
          ...goldenSummaryIssues(p0Evals, "p0"),
          ...goldenSummaryIssues(gaCoreEvals, "ga-core"),
          ...goldenSummaryIssues(gaRuntimeEvals, "ga-runtime"),
        ]);

        const allBlockingIssues = blockingAiCoreIssues(issues);
        if (allBlockingIssues.length > 0) {
          writeAiCoreIssues(allBlockingIssues);
          process.exitCode = 1;
          return;
        }

        process.stdout.write(`p0 golden evals: ${p0Evals.passed}/${p0Evals.total} passed\n`);
        process.stdout.write(
          `ga-core golden evals: ${gaCoreEvals.passed}/${gaCoreEvals.total} passed\n`,
        );
        process.stdout.write(
          `ga-runtime golden evals: ${gaRuntimeEvals.passed}/${gaRuntimeEvals.total} passed\n`,
        );
        if (opts.scope === "ga-completion") {
          process.stdout.write(
            `deterministic baseline failures: ${deterministicBaselineFailures.length}\n`,
          );
          process.stdout.write(
            `environment-dependent checks: ${environmentDependentChecks.length}\n`,
          );
          process.stdout.write(
            `case-draft sparse PRD evals: ${caseDraftWorkflowEvals.value?.passed ?? 0}/${caseDraftWorkflowEvals.value?.total ?? 0} passed\n`,
          );
          process.stdout.write(
            `baseline decision: ${deterministicBaselineFailures.length === 0 ? "no deterministic failures documented" : "deterministic failures remain documented"}\n`,
          );
          process.stdout.write("ai-core ga-completion gate passed\n");
          return;
        }
        process.stdout.write("ai-core ga-core-runtime gate passed\n");
        return;
      }

      const [projection, schemaCompat, p0Evals, gaCoreEvals] = await Promise.all([
        checkProjection({ runtime: "all" }),
        runSchemaCompatCheck(),
        evalModule.runP0GoldenEvals({ suite: "p0", subset: "fast-deterministic" }),
        evalModule.runGaCoreGoldenEvals({ subset: "fast-deterministic" }),
      ]);
      const projectionInventory = validateCurrentProjectionInventory();
      const issues = [
        ...validation.issues,
        ...lint.issues,
        ...projection.issues,
        ...projectionInventory.issues,
        ...schemaCompat.issues,
        ...goldenSummaryIssues(p0Evals, "p0"),
        ...goldenSummaryIssues(gaCoreEvals, "ga-core"),
      ];

      const allBlockingIssues = blockingAiCoreIssues(issues);
      if (allBlockingIssues.length > 0) {
        writeAiCoreIssues(allBlockingIssues);
        process.exitCode = 1;
        return;
      }

      process.stdout.write(`p0 golden evals: ${p0Evals.passed}/${p0Evals.total} passed\n`);
      process.stdout.write(
        `ga-core golden evals: ${gaCoreEvals.passed}/${gaCoreEvals.total} passed\n`,
      );
      process.stdout.write("ai-core ga-core-import gate passed\n");
    });

  // ai-core preflight
  aiCore
    .command("preflight")
    .description("Run AI Core runtime preflight checks")
    .option("--runtime <runtime>", "claude, codex, or all", "all")
    .action(async (opts: { runtime: string }) => {
      if (!isProjectionRuntime(opts.runtime)) {
        process.stderr.write(`ai-core preflight: unknown runtime "${opts.runtime}"\n`);
        process.exitCode = 1;
        return;
      }
      const { runAiCorePreflight } = await import("../ai-core/preflight.ts");
      const result = await runAiCorePreflight({ runtime: opts.runtime });
      if (!result.ok) {
        writeAiCoreIssues(result.issues);
        process.exitCode = 1;
        return;
      }
      process.stdout.write("ai-core preflight passed\n");
    });

  // ai-core baseline
  aiCore
    .command("baseline")
    .description("Report AI Core baseline readiness")
    .option("--json", "emit JSON")
    .action(async (opts: { json?: boolean }) => {
      const {
        BaselineEnvironmentDependentChecksError,
        BaselineKnownFailuresError,
        loadEnvironmentDependentChecks,
        loadKnownBaselineFailures,
      } = await import("../ai-core/baseline-report.ts");
      let deterministicFailures: Array<{ area: string; reason: string }> | undefined;
      let environmentDependentChecks:
        | Array<{
            area: string;
            command: string;
            dependency: string;
            failure_signature: string;
            default_suite_policy: "not_run_by_default";
          }>
        | undefined;
      const issues: AiCoreIssue[] = [];
      try {
        deterministicFailures = loadKnownBaselineFailures();
      } catch (error) {
        if (error instanceof BaselineKnownFailuresError) {
          issues.push(...error.issues);
        } else {
          issues.push({
            code: "baseline.contract_invalid",
            severity: "error",
            path: ".ai/core/evals/baseline-known-failures.json",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
      try {
        environmentDependentChecks = loadEnvironmentDependentChecks();
      } catch (error) {
        if (error instanceof BaselineEnvironmentDependentChecksError) {
          issues.push(...error.issues);
        } else {
          issues.push({
            code: "baseline.contract_invalid",
            severity: "error",
            path: ".ai/core/evals/environment-dependent-checks.json",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (deterministicFailures !== undefined) {
        issues.push(...deterministicBaselineFailureIssues(deterministicFailures));
      }

      if (opts.json === true) {
        const report: {
          deterministic_failures: Array<{ area: string; reason: string }>;
          environment_dependent_checks: Array<{
            area: string;
            command: string;
            dependency: string;
            failure_signature: string;
            default_suite_policy: "not_run_by_default";
          }>;
          issues?: AiCoreIssue[];
        } = {
          deterministic_failures: deterministicFailures ?? [],
          environment_dependent_checks: environmentDependentChecks ?? [],
        };
        if (issues.length > 0) report.issues = issues;
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      } else {
        process.stdout.write(
          `ai-core deterministic baseline failures: ${deterministicFailures?.length ?? "unavailable"}\n`,
        );
        process.stdout.write(
          `ai-core environment-dependent checks: ${environmentDependentChecks?.length ?? "unavailable"}\n`,
        );
      }

      if (issues.length > 0) {
        writeAiCoreIssues(issues);
        process.exitCode = 1;
      }
    });

  // ai-core lint
  aiCore
    .command("lint")
    .description(
      "AI Core contract operations: lint contracts, registries, and implementation roots",
    )
    .option("--strict", "fail on every blocking issue")
    .action(async (opts: { strict?: boolean }) => {
      if (failOnInvalidConfig()) return;
      const core = await loadAiCore();
      const validation = await validateAiCoreStrict(core);
      const lint = await lintAiCore({ strict: opts.strict === true });
      const issues = [...validation.issues, ...lint.issues];
      if (issues.some((issue) => issue.severity === "error")) {
        writeAiCoreIssues(issues);
        process.exitCode = 1;
        return;
      }
      process.stdout.write("ai-core lint passed\n");
    });

  // ai-core context audit
  aiCore
    .command("context")
    .description("AI Core context operations")
    .command("audit")
    .description("Audit local context for runtime policy overrides")
    .action(() => {
      const result = auditLocalContext();
      if (!result.ok) {
        writeAiCoreIssues(result.issues);
        process.exitCode = 1;
        return;
      }
      process.stdout.write("ai-core context audit passed\n");
    });

  // ai-core parser audit
  aiCore
    .command("parser")
    .description("AI Core parser operations")
    .command("audit")
    .description("Audit AI Core parser boundaries")
    .action(() => {
      const result = auditAiCoreParserBoundaries();
      if (!result.ok) {
        writeAiCoreIssues(result.issues);
        process.exitCode = 1;
        return;
      }
      process.stdout.write("ai-core parser boundary audit passed\n");
    });

  // ai-core docs (with render and check subcommands)
  const docs = new Command("docs").description("AI Core documentation blocks");
  docs
    .command("render")
    .description("Render AI Core generated documentation blocks")
    .option("--output-root <path>", "write documentation files under this root")
    .action(async (opts: { outputRoot?: string }) => {
      const { renderDocsBlocks } = await import("../ai-core/docs-renderer.ts");
      const result = await renderDocsBlocks({ outputRoot: opts.outputRoot });
      if (!result.ok) {
        writeAiCoreIssues(result.issues);
        process.exitCode = 1;
        return;
      }
      process.stdout.write("ai-core docs render passed\n");
    });
  docs
    .command("check")
    .description("Check AI Core generated documentation blocks")
    .option("--output-root <path>", "check documentation files under this root")
    .action(async (opts: { outputRoot?: string }) => {
      const { checkDocsBlocks } = await import("../ai-core/docs-renderer.ts");
      const result = await checkDocsBlocks({ outputRoot: opts.outputRoot });
      if (!result.ok) {
        writeAiCoreIssues(result.issues);
        process.exitCode = 1;
        return;
      }
      process.stdout.write("ai-core docs check passed\n");
    });
  aiCore.addCommand(docs);

  // ai-core projection (with render, check, inventory, lock, diff subcommands)
  const projection = new Command("projection").description("AI Core projection command group");
  projection
    .command("render")
    .description("Render AI Core projections")
    .option("--runtime <runtime>", "claude, codex, or all", "all")
    .option("--output-root <path>", "write projections under this root")
    .option("--prune", "delete runtime files classified as deleted")
    .action(async (opts: { runtime: string; outputRoot?: string; prune?: boolean }) => {
      if (!isProjectionRuntime(opts.runtime)) {
        process.stderr.write(`ai-core projection: unknown runtime "${opts.runtime}"\n`);
        process.exitCode = 1;
        return;
      }
      const { renderProjection } = await import("../ai-core/projection.ts");
      const result = await renderProjection({
        runtime: opts.runtime,
        outputRoot: opts.outputRoot,
        prune: opts.prune === true,
      });
      if (!result.ok) {
        writeAiCoreIssues(result.issues);
        process.exitCode = 1;
        return;
      }
      process.stdout.write(`ai-core projection render passed\n`);
    });

  projection
    .command("check")
    .description("Check AI Core projections")
    .option("--runtime <runtime>", "claude, codex, or all", "all")
    .option("--output-root <path>", "check projections under this root")
    .action(async (opts: { runtime: string; outputRoot?: string }) => {
      if (!isProjectionRuntime(opts.runtime)) {
        process.stderr.write(`ai-core projection: unknown runtime "${opts.runtime}"\n`);
        process.exitCode = 1;
        return;
      }
      const { checkProjection } = await import("../ai-core/projection.ts");
      const result = await checkProjection({ runtime: opts.runtime, outputRoot: opts.outputRoot });
      if (!result.ok) {
        writeAiCoreIssues(result.issues);
        process.exitCode = 1;
        return;
      }
      process.stdout.write(`ai-core projection check passed\n`);
    });

  projection
    .command("inventory")
    .description("Audit AI Core projection inventory classification")
    .option("--json", "emit JSON summary")
    .action((opts: { json?: boolean }) => {
      if (failOnInvalidConfig()) return;
      const result = validateCurrentProjectionInventory();
      if (opts.json === true) {
        process.stdout.write(
          `${JSON.stringify({ ok: result.ok, files: result.files, issues: result.issues }, null, 2)}\n`,
        );
      }
      if (!result.ok) {
        writeAiCoreIssues(result.issues);
        process.exitCode = 1;
        return;
      }
      if (opts.json !== true) process.stdout.write("ai-core projection inventory passed\n");
    });

  projection
    .command("inventory-rewrite")
    .description("Rewrite AI Core projection inventory from inventory ledgers")
    .action(() => {
      if (failOnInvalidConfig()) return;
      rewriteProjectionInventoryFromLedgers();
      process.stdout.write("ai-core projection inventory rewrite passed\n");
    });

  projection
    .command("lock")
    .description("Render or check the AI Core projection lock")
    .argument("<action>", "render or check")
    .action(async (action: string) => {
      if (action !== "render" && action !== "check") {
        process.stderr.write(`ai-core projection lock: unknown action "${action}"\n`);
        process.exitCode = 1;
        return;
      }
      const { checkProjectionLock, readProjectionLock, writeProjectionLock } = await import(
        "../ai-core/projection-lock.ts"
      );
      const lockPath = join(repoRoot(), ".ai/core/runtimes/projection-lock.json");
      if (action === "render") {
        writeProjectionLock(lockPath);
        process.stdout.write("ai-core projection lock render passed\n");
        return;
      }
      const lock = readProjectionLock(lockPath);
      if (!lock.ok) {
        writeAiCoreIssues(lock.issues);
        process.exitCode = 1;
        return;
      }
      const result = checkProjectionLock({ lock: lock.value! });
      if (!result.ok) {
        writeAiCoreIssues(result.issues);
        process.exitCode = 1;
        return;
      }
      process.stdout.write("ai-core projection lock check passed\n");
    });

  projection
    .command("diff")
    .description("Summarize legacy projection dispositions")
    .option("--runtime <runtime>", "claude, codex, or all", "all")
    .option("--json", "emit JSON report")
    .action(async (opts: { runtime: string; json?: boolean }) => {
      if (failOnInvalidConfig()) return;
      if (!isProjectionRuntime(opts.runtime)) {
        process.stderr.write(`ai-core projection diff: unknown runtime "${opts.runtime}"\n`);
        process.exitCode = 1;
        return;
      }
      const report = await diffLegacyProjection({ runtime: opts.runtime });
      if (opts.json === true) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
        return;
      }
      process.stdout.write(`ai-core projection diff: ${JSON.stringify(report)}\n`);
    });

  aiCore.addCommand(projection);

  // ai-core import records
  aiCore
    .command("import-records")
    .description("List AI Core runtime import records")
    .option("--json", "emit JSON records")
    .action(async (opts: { json?: boolean }) => {
      if (failOnInvalidConfig()) return;
      let records;
      try {
        records = await buildRuntimeImportRecords();
      } catch (error) {
        if (error instanceof RuntimeImportRecordError) {
          process.stderr.write(`${error.code}: ${error.message}\n`);
        } else {
          process.stderr.write(
            `ai_core.import_records_failed: .ai/core/imports/records: ${error instanceof Error ? error.message : String(error)}\n`,
          );
        }
        process.exitCode = 1;
        return;
      }
      if (opts.json === true) {
        process.stdout.write(`${JSON.stringify(records, null, 2)}\n`);
        return;
      }
      process.stdout.write(`ai-core import records: ${records.length}\n`);
    });

  // ai-core vendor
  const vendor = new Command("vendor").description("AI Core vendor operations");
  vendor
    .command("freeze")
    .description("Freeze a vendor skill into .ai/vendor-skills")
    .argument("<id>", "vendor skill id")
    .requiredOption("--source-dir <path>", "local installed vendor skill directory")
    .action(async (id: string, opts: { sourceDir: string }) => {
      if (id !== "playwright-cli") {
        process.stderr.write("Only playwright-cli is in the P0 kernel vendor scope\n");
        process.exitCode = 1;
        return;
      }
      const { freezeVendorSkill } = await import("../ai-core/vendor.ts");
      const result = await freezeVendorSkill({ id: "playwright-cli", sourceDir: opts.sourceDir });
      if (!result.ok) {
        writeAiCoreIssues(result.issues);
        process.exitCode = 1;
        return;
      }
      process.exitCode = 0;
      process.stdout.write("ai-core vendor freeze passed\n");
    });

  vendor
    .command("install")
    .description("Install a vendor skill into the isolated AI Core vendor cache")
    .argument("<id>", "vendor skill id")
    .action((id: string) => {
      if (id !== "playwright-cli") {
        process.stderr.write("Only playwright-cli is supported in the P0 kernel\n");
        process.exitCode = 1;
        return;
      }
      process.stdout.write(
        "Run upstream install into .ai/vendor-skills/playwright-cli/cache before freeze: npx skills add https://github.com/microsoft/playwright-cli --skill playwright-cli\n",
      );
    });
  aiCore.addCommand(vendor);

  // ai-core workflow maturity
  aiCore
    .command("workflow-maturity")
    .description("Audit workflow maturity levels")
    .option("--json", "emit JSON report")
    .action(async (opts: { json?: boolean }) => {
      if (failOnInvalidConfig()) return;
      const { auditWorkflowMaturity } = (await import(
        "../ai-core/workflow-maturity.ts"
      )) as typeof import("../ai-core/workflow-maturity.ts");
      const result = auditWorkflowMaturity();
      if (opts.json === true) {
        process.stdout.write(`${JSON.stringify(result.value, null, 2)}\n`);
      } else {
        process.stdout.write(`Active workflows: ${result.value?.activeWorkflows.length}\n`);
        if (result.ok) {
          process.stdout.write("All workflows meet required maturity levels\n");
        } else {
          writeAiCoreIssues(result.issues);
          process.exitCode = 1;
        }
      }
    });

  return aiCore;
}
