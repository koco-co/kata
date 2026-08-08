import type { SpawnOptions } from "node:child_process";
import { locateProjectRoot } from "../workspace-locator.ts";
import { executeExecutorCommand, materializeExecutorCommand } from "./executor-command.ts";
import { discoverExecutors, type ExecutorDescriptor } from "./executor-registry.ts";

const EXECUTOR_ID_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** Lifecycle commands that never receive an execution manifest. */
export type ExecutorEnvironmentLifecycle = "setup" | "doctor";

/** Stable selection failures for setup and doctor. */
export type ExecutorLifecycleErrorCode =
  | "EXECUTOR_LIFECYCLE_NONE_AVAILABLE"
  | "EXECUTOR_LIFECYCLE_AMBIGUOUS"
  | "EXECUTOR_LIFECYCLE_UNKNOWN"
  | "EXECUTOR_LIFECYCLE_ID_INVALID";

/** A stable executor selection failure suitable for CLI reporting. */
export class ExecutorLifecycleError extends Error {
  readonly exitCode = 1;

  constructor(
    readonly code: ExecutorLifecycleErrorCode,
    message: string,
  ) {
    super(`executor lifecycle: ${message}`);
    this.name = "ExecutorLifecycleError";
  }
}

/** Inputs for one setup or doctor invocation. */
export interface RunExecutorLifecycleOptions {
  readonly executorId?: string;
  readonly repoRoot?: string;
  readonly baseEnv?: NodeJS.ProcessEnv;
  readonly stdio?: SpawnOptions["stdio"];
}

/** Redacted result of one setup or doctor child process. */
export interface ExecutorLifecycleResult {
  readonly executorId: string;
  readonly lifecycle: ExecutorEnvironmentLifecycle;
  readonly exitCode: number;
}

function availableExecutorIds(executors: readonly ExecutorDescriptor[]): readonly string[] {
  return [...new Set(executors.map((executor) => executor.id))].sort();
}

function availableLabel(ids: readonly string[]): string {
  return ids.length === 0 ? "(none)" : ids.join(",");
}

/** Return whether a user-supplied ID matches the descriptor registry identity grammar. */
export function isLifecycleExecutorId(value: string | undefined): value is string {
  return value !== undefined && EXECUTOR_ID_RE.test(value);
}

/** Select exactly one discovered executor without an implicit bulk fallback. */
export function selectLifecycleExecutor(
  executors: readonly ExecutorDescriptor[],
  requestedId?: string,
): ExecutorDescriptor {
  const availableIds = availableExecutorIds(executors);
  const available = availableLabel(availableIds);
  if (requestedId !== undefined) {
    if (!isLifecycleExecutorId(requestedId)) {
      throw new ExecutorLifecycleError(
        "EXECUTOR_LIFECYCLE_ID_INVALID",
        `--executor 必须是小写 kebab ID；available=${available}`,
      );
    }
    const selected = executors.find((executor) => executor.id === requestedId);
    if (selected) return selected;
    throw new ExecutorLifecycleError(
      "EXECUTOR_LIFECYCLE_UNKNOWN",
      `指定 executor 不可用；available=${available}`,
    );
  }
  if (executors.length === 0) {
    throw new ExecutorLifecycleError(
      "EXECUTOR_LIFECYCLE_NONE_AVAILABLE",
      `未发现 executor；available=${available}`,
    );
  }
  if (executors.length !== 1) {
    throw new ExecutorLifecycleError(
      "EXECUTOR_LIFECYCLE_AMBIGUOUS",
      `发现多个 executor，必须传 --executor <id>；available=${available}`,
    );
  }
  return executors[0] as ExecutorDescriptor;
}

/** Discover, select, materialize, and execute one setup or doctor lifecycle. */
export async function runExecutorLifecycle(
  lifecycle: ExecutorEnvironmentLifecycle,
  options: RunExecutorLifecycleOptions = {},
): Promise<ExecutorLifecycleResult> {
  const repoRoot = options.repoRoot ?? locateProjectRoot();
  const descriptor = selectLifecycleExecutor(discoverExecutors(repoRoot), options.executorId);
  const command = materializeExecutorCommand({
    repoRoot,
    descriptor,
    commandName: lifecycle,
  });
  const exitCode = await executeExecutorCommand(command, {
    ...(options.baseEnv === undefined ? {} : { baseEnv: options.baseEnv }),
    ...(options.stdio === undefined ? {} : { stdio: options.stdio }),
  });
  return { executorId: descriptor.id, lifecycle, exitCode };
}
