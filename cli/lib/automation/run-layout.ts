import { existsSync, lstatSync, mkdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { generateRunId, RUN_ID_RE, type RunType } from "../run-id.ts";

const STABLE_ID_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const EXECUTION_ID_RE = /^execution-\d{2,}$/;

interface LogicalRunIdentity {
  repoRoot: string;
  projectId: string;
  logicalRunId: string;
}

interface ExecutionIdentity extends LogicalRunIdentity {
  executorId: string;
  executionId: string;
}

function assertStableId(value: string, field: "project_id" | "executor_id"): void {
  if (!STABLE_ID_RE.test(value)) {
    throw new Error(`${field} 必须是小写英文 kebab 标识: ${value}`);
  }
}

function assertLogicalRunId(value: string): void {
  if (!RUN_ID_RE.test(value)) throw new Error(`logical_run_id 非法: ${value}`);
}

function assertExecutionId(value: string): void {
  if (!EXECUTION_ID_RE.test(value)) throw new Error(`execution_id 非法: ${value}`);
}

function assertNoSymlinkChain(root: string, target: string): void {
  const absoluteRoot = resolve(root);
  if (existsSync(absoluteRoot) && lstatSync(absoluteRoot).isSymbolicLink()) {
    throw new Error(`自动化产物路径不得经过符号链接: ${absoluteRoot}`);
  }
  let current = resolve(target);
  const chain: string[] = [];
  while (current !== absoluteRoot) {
    if (!current.startsWith(`${absoluteRoot}/`)) {
      throw new Error(`自动化产物路径越界: ${target}`);
    }
    chain.push(current);
    current = dirname(current);
  }
  for (const path of chain.reverse()) {
    if (existsSync(path) && lstatSync(path).isSymbolicLink()) {
      throw new Error(`自动化产物路径不得经过符号链接: ${path}`);
    }
  }
}

function allocateSequentialDirectory(
  parent: string,
  prefix: string,
  width: number,
): {
  id: string;
  path: string;
} {
  mkdirSync(parent, { recursive: true });
  for (let sequence = 1; ; sequence += 1) {
    const id = `${prefix}${String(sequence).padStart(width, "0")}`;
    const path = join(parent, id);
    try {
      mkdirSync(path);
      return { id, path };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") continue;
      throw error;
    }
  }
}

export function logicalRunDirectory(identity: LogicalRunIdentity): string {
  assertStableId(identity.projectId, "project_id");
  assertLogicalRunId(identity.logicalRunId);
  return join(
    resolve(identity.repoRoot),
    "artifacts",
    "runs",
    identity.projectId,
    identity.logicalRunId,
  );
}

export function executionDirectory(identity: ExecutionIdentity): string {
  assertStableId(identity.executorId, "executor_id");
  assertExecutionId(identity.executionId);
  return join(
    logicalRunDirectory(identity),
    "executions",
    identity.executorId,
    identity.executionId,
  );
}

export function attemptDirectory(identity: ExecutionIdentity & { attempt: number }): string {
  if (!Number.isSafeInteger(identity.attempt) || identity.attempt < 1) {
    throw new Error(`attempt 必须是正整数: ${identity.attempt}`);
  }
  return join(executionDirectory(identity), "attempts", String(identity.attempt).padStart(3, "0"));
}

export function allocateLogicalRun(options: {
  repoRoot: string;
  projectId: string;
  type: RunType;
  now?: Date;
}): { id: string; path: string } {
  assertStableId(options.projectId, "project_id");
  const root = resolve(options.repoRoot);
  const runs = join(root, "artifacts", "runs", options.projectId);
  assertNoSymlinkChain(root, runs);
  const id = generateRunId({ type: options.type, runsDir: runs, now: options.now });
  return { id, path: join(runs, id) };
}

export function allocateExecution(options: { logicalRunPath: string; executorId: string }): {
  id: string;
  path: string;
} {
  assertStableId(options.executorId, "executor_id");
  const logicalRunPath = resolve(options.logicalRunPath);
  if (!RUN_ID_RE.test(basename(logicalRunPath))) {
    throw new Error(`logical_run_id 非法: ${basename(logicalRunPath)}`);
  }
  const artifactsRoot = resolve(logicalRunPath, "../../../..");
  const parent = join(logicalRunPath, "executions", options.executorId);
  assertNoSymlinkChain(artifactsRoot, parent);
  return allocateSequentialDirectory(parent, "execution-", 2);
}

export function allocateAttempt(executionPath: string): { number: number; path: string } {
  const resolvedExecution = resolve(executionPath);
  assertExecutionId(basename(resolvedExecution));
  const artifactsRoot = resolve(resolvedExecution, "../../../../../..");
  const parent = join(resolvedExecution, "attempts");
  assertNoSymlinkChain(artifactsRoot, parent);
  const allocated = allocateSequentialDirectory(parent, "", 3);
  return { number: Number(allocated.id), path: allocated.path };
}
