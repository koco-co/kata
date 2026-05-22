import { join } from "node:path";
import type { Command } from "commander";
import { auditLocalContext } from "../../ai-core/context-audit.ts";
import type { P0GoldenSummary } from "../../ai-core/evals/types.ts";
import { lintAiCore } from "../../ai-core/lint.ts";
import { loadAiCore } from "../../ai-core/load.ts";
import { auditAiCoreParserBoundaries } from "../../ai-core/parser-boundary-audit.ts";
import { repoRoot } from "../../ai-core/paths.ts";
import type { AiCoreIssue } from "../../ai-core/types.ts";
import { validateAiCoreStrict } from "../../ai-core/validate.ts";
import {
  blockingAiCoreIssues,
  dedupeAiCoreIssues,
  deterministicBaselineFailureIssues,
  failOnInvalidConfig,
  gateResultIssues,
  goldenSummaryIssues,
  validateCurrentProjectionInventory,
  writeAiCoreIssues,
} from "./helpers.ts";

type GateScope = "p0" | "ga-core-import" | "ga-core-runtime" | "ga-completion";
type BasicGateContext = Awaited<ReturnType<typeof loadBasicGateContext>>;
type RuntimeGateChecks = Awaited<ReturnType<typeof runRuntimeGateChecks>>;
type CompletionChecks = Awaited<ReturnType<typeof runCompletionChecks>>;

export function registerGateCommand(aiCore: Command): void {
  // ai-core gate
  aiCore
    .command("gate")
    .description("Run AI Core release gates")
    .requiredOption("--scope <scope>", "release gate scope")
    .action(runGateCommand);
}

async function runGateCommand(opts: { scope: string }): Promise<void> {
  const scope = parseGateScope(opts.scope);
  if (!scope) return;
  if (failOnInvalidConfig()) return;

  const context = await loadBasicGateContext();
  if (scope === "p0") {
    await runP0Gate(context);
  } else if (scope === "ga-core-import") {
    await runGaCoreImportGate(context);
  } else {
    await runRuntimeGate(context, scope);
  }
}

function parseGateScope(scope: string): GateScope | undefined {
  if (
    scope === "p0" ||
    scope === "ga-core-import" ||
    scope === "ga-core-runtime" ||
    scope === "ga-completion"
  ) {
    return scope;
  }
  process.stderr.write(
    "Supported --scope values: p0, ga-core-import, ga-core-runtime, ga-completion\n",
  );
  process.exitCode = 1;
  return undefined;
}

async function loadBasicGateContext() {
  const core = await loadAiCore();
  const validation = await validateAiCoreStrict(core);
  const [{ checkProjection }, evalModule, { runSchemaCompatCheck }, lint] = await Promise.all([
    import("../../ai-core/projection.ts"),
    import("../../ai-core/evals.ts"),
    import("../../ai-core/schema-compat.ts"),
    lintAiCore({ strict: true }),
  ]);
  return { core, validation, checkProjection, evalModule, runSchemaCompatCheck, lint };
}

async function runP0Gate(context: BasicGateContext): Promise<void> {
  const [projection, evals] = await Promise.all([
    context.checkProjection({ runtime: "all" }),
    context.evalModule.runP0GoldenEvals({ suite: "p0", subset: "fast-deterministic" }),
  ]);
  const issues = [
    ...context.validation.issues,
    ...context.lint.issues,
    ...projection.issues,
    ...goldenSummaryIssues(evals, "p0"),
  ];
  if (writeBlockingIssues(issues)) return;
  process.stdout.write("ai-core p0 gate passed\n");
}

async function runGaCoreImportGate(context: BasicGateContext): Promise<void> {
  const [projection, schemaCompat, p0Evals, gaCoreEvals] = await Promise.all([
    context.checkProjection({ runtime: "all" }),
    context.runSchemaCompatCheck(),
    context.evalModule.runP0GoldenEvals({ suite: "p0", subset: "fast-deterministic" }),
    context.evalModule.runGaCoreGoldenEvals({ subset: "fast-deterministic" }),
  ]);
  const projectionInventory = validateCurrentProjectionInventory();
  const issues = [
    ...context.validation.issues,
    ...context.lint.issues,
    ...projection.issues,
    ...projectionInventory.issues,
    ...schemaCompat.issues,
    ...goldenSummaryIssues(p0Evals, "p0"),
    ...goldenSummaryIssues(gaCoreEvals, "ga-core"),
  ];
  if (writeBlockingIssues(issues)) return;
  writeImportGateSummary(p0Evals, gaCoreEvals);
}

async function runRuntimeGate(context: BasicGateContext, scope: GateScope): Promise<void> {
  const runtimeChecks = await runRuntimeGateChecks(context);
  const completionChecks = await runCompletionChecks(context, runtimeChecks, scope);
  const issues = collectRuntimeGateIssues(context, runtimeChecks, completionChecks, scope);
  if (writeBlockingIssues(issues)) return;
  writeRuntimeGateSummary(runtimeChecks, completionChecks, scope);
}

async function runRuntimeGateChecks(context: BasicGateContext) {
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
    context.checkProjection({ runtime: "all" }),
    context.runSchemaCompatCheck(),
    import("../../ai-core/preflight.ts").then((module) =>
      module.runAiCorePreflight({ runtime: "all" }),
    ),
    context.evalModule.runP0GoldenEvals({ suite: "p0", subset: "fast-deterministic" }),
    context.evalModule.runGaCoreGoldenEvals({ subset: "fast-deterministic" }),
    context.evalModule.runGaRuntimeGoldenEvals({ subset: "fast-deterministic" }),
    import("../../ai-core/projection-lock.ts"),
    import("../../ai-core/contract-schema.ts"),
    import("../../ai-core/docs-renderer.ts"),
    import("../../ai-core/baseline-report.ts"),
  ]);
  return {
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
  };
}

async function runCompletionChecks(
  context: BasicGateContext,
  checks: RuntimeGateChecks,
  scope: GateScope,
) {
  const completed = scope === "ga-completion";
  const contractSchemas = completed
    ? await checks.contractSchemaModule.validateAllAiCoreContracts({ root: context.core.root })
    : { ok: true, issues: [] };
  const docs = completed ? await checks.docsModule.checkDocsBlocks() : { ok: true, issues: [] };
  const caseDraftWorkflowEvals = completed
    ? await import("../../ai-core/case-draft-evals.ts").then((module) =>
        module.runCaseDraftWorkflowEvals(),
      )
    : { ok: true, issues: [], value: { passed: 0, total: 0 } };
  const baseline = completed ? loadCompletionBaseline(checks.baselineModule) : emptyBaseline();
  return { contractSchemas, docs, caseDraftWorkflowEvals, baseline };
}

function collectRuntimeGateIssues(
  context: BasicGateContext,
  checks: RuntimeGateChecks,
  completion: CompletionChecks,
  scope: GateScope,
): AiCoreIssue[] {
  const projectionInventory = validateCurrentProjectionInventory();
  const projectionLockCheck = checkProjectionLock(checks);
  const parserBoundary = scope === "ga-completion" ? auditAiCoreParserBoundaries() : emptyResult();
  return dedupeAiCoreIssues([
    ...context.validation.issues,
    ...context.lint.issues,
    ...runtimeGateResultIssues(checks, completion, projectionInventory, projectionLockCheck),
    ...gateResultIssues({
      name: "local context audit",
      path: ".ai/core/context/local-context.yaml",
      result: auditLocalContext(),
    }),
    ...gateResultIssues({
      name: "parser boundary audit",
      path: "engine/src/ai-core",
      result: parserBoundary,
    }),
    ...completion.baseline.issues,
    ...deterministicBaselineFailureIssues(completion.baseline.deterministicFailures),
    ...goldenSummaryIssues(checks.p0Evals, "p0"),
    ...goldenSummaryIssues(checks.gaCoreEvals, "ga-core"),
    ...goldenSummaryIssues(checks.gaRuntimeEvals, "ga-runtime"),
  ]);
}

function runtimeGateResultIssues(
  checks: RuntimeGateChecks,
  completion: CompletionChecks,
  projectionInventory: ReturnType<typeof validateCurrentProjectionInventory>,
  projectionLockCheck: { ok: boolean; issues: AiCoreIssue[] },
): AiCoreIssue[] {
  return [
    ...gateResultIssues({
      name: "AI Core contract schema",
      path: ".ai/core",
      result: completion.contractSchemas,
    }),
    ...gateResultIssues({
      name: "projection check",
      path: ".ai/core/runtimes",
      result: checks.projection,
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
      result: checks.preflight,
    }),
    ...gateResultIssues({
      name: "schema compatibility",
      path: ".ai/core/schemas",
      result: checks.schemaCompat,
    }),
    ...gateResultIssues({
      name: "generated docs blocks",
      path: "README.md",
      result: completion.docs,
    }),
    ...gateResultIssues({
      name: "case-draft sparse PRD evals",
      path: ".ai/core/evals/case-draft",
      result: completion.caseDraftWorkflowEvals,
    }),
  ];
}

function checkProjectionLock(checks: RuntimeGateChecks): { ok: boolean; issues: AiCoreIssue[] } {
  const projectionLock = checks.projectionLockModule.readProjectionLock(
    join(repoRoot(), ".ai/core/runtimes/projection-lock.json"),
  );
  if (!projectionLock.ok || !projectionLock.value) return projectionLock;
  return checks.projectionLockModule.checkProjectionLock({ lock: projectionLock.value });
}

function loadCompletionBaseline(baselineModule: RuntimeGateChecks["baselineModule"]) {
  const baseline = emptyBaseline();
  try {
    baseline.deterministicFailures = baselineModule.loadKnownBaselineFailures();
  } catch (error) {
    baseline.issues.push(...baselineLoadIssues(error, baselineModule, "known"));
  }
  try {
    baseline.environmentDependentChecks = baselineModule.loadEnvironmentDependentChecks();
  } catch (error) {
    baseline.issues.push(...baselineLoadIssues(error, baselineModule, "environment"));
  }
  return baseline;
}

function baselineLoadIssues(
  error: unknown,
  module: RuntimeGateChecks["baselineModule"],
  kind: "known" | "environment",
): AiCoreIssue[] {
  if (kind === "known" && error instanceof module.BaselineKnownFailuresError) {
    return error.issues;
  }
  if (kind === "environment" && error instanceof module.BaselineEnvironmentDependentChecksError) {
    return error.issues;
  }
  const path =
    kind === "known"
      ? ".ai/core/evals/baseline-known-failures.json"
      : ".ai/core/evals/environment-dependent-checks.json";
  return [
    { code: "baseline.contract_invalid", severity: "error", path, message: errorMessage(error) },
  ];
}

function emptyBaseline() {
  return {
    deterministicFailures: [] as Array<{ area: string; reason: string }>,
    environmentDependentChecks: [] as Array<{ area: string }>,
    issues: [] as AiCoreIssue[],
  };
}

function emptyResult(): { ok: true; issues: AiCoreIssue[] } {
  return { ok: true, issues: [] };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function writeBlockingIssues(issues: AiCoreIssue[]): boolean {
  const allBlockingIssues = blockingAiCoreIssues(issues);
  if (allBlockingIssues.length === 0) return false;
  writeAiCoreIssues(allBlockingIssues);
  process.exitCode = 1;
  return true;
}

function writeImportGateSummary(p0Evals: P0GoldenSummary, gaCoreEvals: P0GoldenSummary): void {
  process.stdout.write(`p0 golden evals: ${p0Evals.passed}/${p0Evals.total} passed\n`);
  process.stdout.write(`ga-core golden evals: ${gaCoreEvals.passed}/${gaCoreEvals.total} passed\n`);
  process.stdout.write("ai-core ga-core-import gate passed\n");
}

function writeRuntimeGateSummary(
  checks: RuntimeGateChecks,
  completion: CompletionChecks,
  scope: GateScope,
): void {
  process.stdout.write(
    `p0 golden evals: ${checks.p0Evals.passed}/${checks.p0Evals.total} passed\n`,
  );
  process.stdout.write(
    `ga-core golden evals: ${checks.gaCoreEvals.passed}/${checks.gaCoreEvals.total} passed\n`,
  );
  process.stdout.write(
    `ga-runtime golden evals: ${checks.gaRuntimeEvals.passed}/${checks.gaRuntimeEvals.total} passed\n`,
  );
  if (scope !== "ga-completion") {
    process.stdout.write("ai-core ga-core-runtime gate passed\n");
    return;
  }
  writeCompletionSummary(completion);
}

function writeCompletionSummary(completion: CompletionChecks): void {
  process.stdout.write(
    `deterministic baseline failures: ${completion.baseline.deterministicFailures.length}\n`,
  );
  process.stdout.write(
    `environment-dependent checks: ${completion.baseline.environmentDependentChecks.length}\n`,
  );
  process.stdout.write(
    `case-draft sparse PRD evals: ${completion.caseDraftWorkflowEvals.value?.passed ?? 0}/${completion.caseDraftWorkflowEvals.value?.total ?? 0} passed\n`,
  );
  process.stdout.write(
    `baseline decision: ${completion.baseline.deterministicFailures.length === 0 ? "no deterministic failures documented" : "deterministic failures remain documented"}\n`,
  );
  process.stdout.write("ai-core ga-completion gate passed\n");
}
