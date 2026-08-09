import { realpathSync } from "node:fs";
import { join } from "node:path";
import { writeJsonExclusiveAtomic } from "../atomic-writer.ts";
import {
  AUTOMATION_PLATFORM_CONTEXT_ENV,
  type AutomationExecutorEnvOverlay,
  assertPlatformEnvName,
  resolveAutomationExecutorEnv,
} from "../platform-env.ts";
import { writeAutomationPreAttemptFailureHandoff } from "./automation-handoff.ts";
import { selectAutomationExecution } from "./automation-selection.ts";
import { type ExecutionManifest, writeExecutionManifest } from "./execution-manifest.ts";
import {
  executeExecutorCommand,
  type MaterializedExecutorCommand,
  materializeExecutorCommand,
} from "./executor-command.ts";
import { discoverExecutors, type ExecutorDescriptor } from "./executor-registry.ts";
import { allocateAttempt, allocateExecution, allocateLogicalRun } from "./run-layout.ts";

export const AUTOMATION_ATTEMPT_PATH_ENV = "AUTOMATION_ATTEMPT_PATH";
export const AUTOMATION_ATTEMPT_NUMBER_ENV = "AUTOMATION_ATTEMPT_NUMBER";
export const AUTOMATION_WORKERS_ENV = "AUTOMATION_WORKERS";

export type AutomationExecutionErrorCode =
  | "AUTOMATION_ATTEMPT_ALLOCATION_FAILED"
  | "AUTOMATION_ENV_INVALID"
  | "AUTOMATION_ENV_REQUIRED"
  | "AUTOMATION_ENV_RESOLUTION_FAILED"
  | "AUTOMATION_EXECUTOR_UNAVAILABLE"
  | "AUTOMATION_PLATFORM_CONTEXT_INVALID"
  | "AUTOMATION_PREPARATION_FAILED"
  | "AUTOMATION_WORKERS_INVALID"
  | "PLATFORM_WRITE_FORBIDDEN";

/** A stable orchestration failure raised before an unsafe executor run starts. */
export class AutomationExecutionError extends Error {
  readonly exitCode = 1;

  constructor(
    readonly code: AutomationExecutionErrorCode,
    message: string,
  ) {
    super(`automation execution: ${message}`);
    this.name = "AutomationExecutionError";
  }
}

interface AutomationExecutionDependencies {
  readonly discoverExecutors?: (repoRoot: string) => readonly ExecutorDescriptor[];
  readonly executeCommand?: (command: MaterializedExecutorCommand) => Promise<number>;
  readonly resolveEnvironment?: (
    name: string,
    repoRoot: string,
  ) => Promise<AutomationExecutorEnvOverlay>;
}

interface BaseAutomationExecutionOptions {
  readonly repoRoot: string;
  readonly featureDir: string;
  readonly executorId?: string;
  readonly now?: Date;
  readonly dependencies?: AutomationExecutionDependencies;
}

export interface CollectAutomationExecutionOptions extends BaseAutomationExecutionOptions {
  readonly includePlanned?: boolean;
}

export interface RunAutomationExecutionOptions extends BaseAutomationExecutionOptions {
  readonly environmentName?: string;
  readonly workers?: number;
}

export interface AutomationExecutionResult {
  readonly logicalRunId: string;
  readonly logicalRunPath: string;
  readonly executionId: string;
  readonly executionPath: string;
  readonly manifestPath: string;
  readonly executorId: string;
  readonly exitCode: number;
  readonly attempt?: { readonly number: number; readonly path: string };
  readonly handoffPath?: string;
}

interface PreparedExecution {
  readonly repoRoot: string;
  readonly logicalRunId: string;
  readonly logicalRunPath: string;
  readonly executionId: string;
  readonly executionPath: string;
  readonly manifestPath: string;
  readonly manifest: ExecutionManifest;
  readonly descriptor: ExecutorDescriptor;
  readonly automationEnv?: string;
  readonly dependencies: Required<AutomationExecutionDependencies>;
}

function fail(code: AutomationExecutionErrorCode, message: string): never {
  throw new AutomationExecutionError(code, message);
}

function dependencies(
  overrides: AutomationExecutionDependencies | undefined,
): Required<AutomationExecutionDependencies> {
  return {
    discoverExecutors: overrides?.discoverExecutors ?? discoverExecutors,
    executeCommand: overrides?.executeCommand ?? executeExecutorCommand,
    resolveEnvironment:
      overrides?.resolveEnvironment ??
      ((name, repoRoot) => resolveAutomationExecutorEnv(name, { repoRoot })),
  };
}

function selectDescriptor(
  available: readonly ExecutorDescriptor[],
  executorId: string,
): ExecutorDescriptor {
  const matches = available.filter((descriptor) => descriptor.id === executorId);
  if (matches.length !== 1) {
    fail(
      "AUTOMATION_EXECUTOR_UNAVAILABLE",
      `executor 必须恰好发现一次；available=${
        available
          .map((descriptor) => descriptor.id)
          .sort()
          .join(",") || "(none)"
      }`,
    );
  }
  return matches[0] as ExecutorDescriptor;
}

function prepareExecution(
  options: BaseAutomationExecutionOptions,
  runType: "preflight" | "run",
  includePlanned = false,
): PreparedExecution {
  const repoRoot = realpathSync(options.repoRoot);
  const selected = selectAutomationExecution(options.featureDir, options.executorId, {
    includePlanned,
  });
  const activeDependencies = dependencies(options.dependencies);
  const descriptor = selectDescriptor(
    activeDependencies.discoverExecutors(repoRoot),
    selected.executorId,
  );
  const logicalRun = allocateLogicalRun({
    repoRoot,
    projectId: selected.projectId,
    type: runType,
    ...(options.now === undefined ? {} : { now: options.now }),
  });
  const execution = allocateExecution({
    logicalRunPath: logicalRun.path,
    executorId: selected.executorId,
  });
  const manifest: ExecutionManifest = {
    schema_version: 2,
    logical_run_id: logicalRun.id,
    execution_id: execution.id,
    project_id: selected.projectId,
    executor_id: selected.executorId,
    cases: selected.cases,
  };
  const manifestPath = writeExecutionManifest(execution.path, manifest);
  return {
    repoRoot,
    logicalRunId: logicalRun.id,
    logicalRunPath: logicalRun.path,
    executionId: execution.id,
    executionPath: execution.path,
    manifestPath,
    manifest,
    descriptor,
    ...(selected.automationEnv === undefined ? {} : { automationEnv: selected.automationEnv }),
    dependencies: activeDependencies,
  };
}

function statusPayload(
  prepared: PreparedExecution,
  phase: "collect" | "run",
  exitCode: number,
  startedAt: Date,
  finishedAt: Date,
  attempt?: number,
): Record<string, unknown> {
  return {
    schema_version: 1,
    phase,
    status: exitCode === 0 ? "command_passed" : "failed",
    exit_code: exitCode,
    logical_run_id: prepared.logicalRunId,
    execution_id: prepared.executionId,
    executor_id: prepared.descriptor.id,
    ...(attempt === undefined ? {} : { attempt }),
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
  };
}

async function executePhase(
  prepared: PreparedExecution,
  phase: "collect" | "run",
  statusPath: string,
  ephemeralEnv: Readonly<Record<string, string>> = {},
  attempt?: number,
): Promise<number> {
  const startedAt = new Date();
  let exitCode = 1;
  try {
    const command = materializeExecutorCommand({
      repoRoot: prepared.repoRoot,
      descriptor: prepared.descriptor,
      commandName: phase,
      executionManifest: prepared.manifestPath,
      ephemeralEnv,
    });
    exitCode = await prepared.dependencies.executeCommand(command);
    return exitCode;
  } finally {
    writeJsonExclusiveAtomic(
      statusPath,
      statusPayload(prepared, phase, exitCode, startedAt, new Date(), attempt),
    );
  }
}

function allowsPlatformWrite(overlay: AutomationExecutorEnvOverlay): boolean {
  let value: unknown;
  try {
    value = JSON.parse(overlay[AUTOMATION_PLATFORM_CONTEXT_ENV]);
  } catch {
    fail("AUTOMATION_PLATFORM_CONTEXT_INVALID", "platform context JSON 无效");
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail("AUTOMATION_PLATFORM_CONTEXT_INVALID", "platform context 必须是对象");
  }
  const context = value as Record<string, unknown>;
  const safety = context.safety;
  if (
    context.schemaVersion !== 2 ||
    typeof safety !== "object" ||
    safety === null ||
    Array.isArray(safety) ||
    typeof (safety as Record<string, unknown>).allowWrite !== "boolean"
  ) {
    fail("AUTOMATION_PLATFORM_CONTEXT_INVALID", "platform context safety 合同无效");
  }
  return (safety as { allowWrite: boolean }).allowWrite;
}

function validatedWorkers(workers: number | undefined): string | undefined {
  if (workers === undefined) return undefined;
  if (!Number.isSafeInteger(workers) || workers < 1) {
    fail("AUTOMATION_WORKERS_INVALID", "workers 必须是正整数");
  }
  return String(workers);
}

function result(
  prepared: PreparedExecution,
  exitCode: number,
  attempt?: { readonly number: number; readonly path: string },
  handoffPath?: string,
): AutomationExecutionResult {
  return {
    logicalRunId: prepared.logicalRunId,
    logicalRunPath: prepared.logicalRunPath,
    executionId: prepared.executionId,
    executionPath: prepared.executionPath,
    manifestPath: prepared.manifestPath,
    executorId: prepared.descriptor.id,
    exitCode,
    ...(attempt === undefined ? {} : { attempt }),
    ...(handoffPath === undefined ? {} : { handoffPath }),
  };
}

function preparationStatusPayload(
  prepared: PreparedExecution,
  status: "passed" | "failed",
  startedAt: Date,
  finishedAt: Date,
  errorCode?: AutomationExecutionErrorCode,
): Record<string, unknown> {
  return {
    schema_version: 1,
    phase: "prepare",
    status,
    logical_run_id: prepared.logicalRunId,
    execution_id: prepared.executionId,
    executor_id: prepared.descriptor.id,
    ...(errorCode === undefined ? {} : { error_code: errorCode }),
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
  };
}

function publishPreAttemptFailure(
  prepared: PreparedExecution,
  phase: "collection" | "preparation",
  errorCode: string,
): string {
  return writeAutomationPreAttemptFailureHandoff(
    {
      projectId: prepared.manifest.project_id,
      logicalRunId: prepared.logicalRunId,
      logicalRunPath: prepared.logicalRunPath,
      executorId: prepared.descriptor.id,
      executionId: prepared.executionId,
      executionPath: prepared.executionPath,
      manifestCaseCount: prepared.manifest.cases.length,
      phase,
      errorCode,
    },
    prepared.repoRoot,
  );
}

function normalizedPreparationError(error: unknown): AutomationExecutionError {
  if (error instanceof AutomationExecutionError) return error;
  return new AutomationExecutionError(
    "AUTOMATION_PREPARATION_FAILED",
    "preparation failed before an attempt was allocated",
  );
}

/** Allocate and run an executor's exact collection without loading platform credentials. */
export async function collectAutomationExecution(
  options: CollectAutomationExecutionOptions,
): Promise<AutomationExecutionResult> {
  const prepared = prepareExecution(options, "preflight", options.includePlanned === true);
  const exitCode = await executePhase(
    prepared,
    "collect",
    join(prepared.executionPath, "collection-status.json"),
  );
  return result(prepared, exitCode);
}

/** Collect and then execute one immutable manifest under a freshly allocated attempt. */
export async function runAutomationExecution(
  options: RunAutomationExecutionOptions,
): Promise<AutomationExecutionResult> {
  const prepared = prepareExecution(options, "run");
  const collectionExitCode = await executePhase(
    prepared,
    "collect",
    join(prepared.executionPath, "collection-status.json"),
  );
  if (collectionExitCode !== 0) {
    const handoffPath = publishPreAttemptFailure(
      prepared,
      "collection",
      "AUTOMATION_COLLECTION_FAILED",
    );
    return result(prepared, collectionExitCode, undefined, handoffPath);
  }

  const preparationStartedAt = new Date();
  let overlay: AutomationExecutorEnvOverlay;
  let workers: string | undefined;
  let attempt: { readonly number: number; readonly path: string };
  try {
    const requestedEnvironment = options.environmentName ?? prepared.automationEnv;
    if (requestedEnvironment === undefined) {
      fail("AUTOMATION_ENV_REQUIRED", "必须通过 --env 或 meta.automation_env 指定平台环境");
    }
    let environmentName: string;
    try {
      environmentName = assertPlatformEnvName(requestedEnvironment);
    } catch {
      fail("AUTOMATION_ENV_INVALID", "平台环境名无效");
    }
    try {
      overlay = await prepared.dependencies.resolveEnvironment(environmentName, prepared.repoRoot);
    } catch {
      fail("AUTOMATION_ENV_RESOLUTION_FAILED", "平台环境解析失败");
    }
    if (
      prepared.manifest.cases.some((selectedCase) => selectedCase.effects.platform_write) &&
      !allowsPlatformWrite(overlay)
    ) {
      fail(
        "PLATFORM_WRITE_FORBIDDEN",
        "execution requires platform writes but the environment does not allow them",
      );
    }
    workers = validatedWorkers(options.workers);
    try {
      attempt = allocateAttempt(prepared.executionPath);
    } catch {
      fail("AUTOMATION_ATTEMPT_ALLOCATION_FAILED", "attempt allocation failed");
    }
  } catch (error) {
    const failure = normalizedPreparationError(error);
    writeJsonExclusiveAtomic(
      join(prepared.executionPath, "preparation-status.json"),
      preparationStatusPayload(prepared, "failed", preparationStartedAt, new Date(), failure.code),
    );
    publishPreAttemptFailure(prepared, "preparation", failure.code);
    throw failure;
  }
  writeJsonExclusiveAtomic(
    join(prepared.executionPath, "preparation-status.json"),
    preparationStatusPayload(prepared, "passed", preparationStartedAt, new Date()),
  );
  const ephemeralEnv = {
    ...overlay,
    [AUTOMATION_ATTEMPT_PATH_ENV]: attempt.path,
    [AUTOMATION_ATTEMPT_NUMBER_ENV]: String(attempt.number),
    ...(workers === undefined ? {} : { [AUTOMATION_WORKERS_ENV]: workers }),
  };
  const exitCode = await executePhase(
    prepared,
    "run",
    join(attempt.path, "status.json"),
    ephemeralEnv,
    attempt.number,
  );
  return result(prepared, exitCode, attempt);
}
