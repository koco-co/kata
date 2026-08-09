import { lstatSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { writeFileAtomic } from "../atomic-writer.ts";
import { RUN_ID_RE } from "../run-id.ts";
import { AUTOMATION_ID_RE, EXECUTION_ID_RE } from "./run-layout.ts";

export interface AutomationHandoffCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly message: string;
}

export interface AutomationHandoffResult {
  readonly projectId: string;
  readonly logicalRunId: string;
  readonly logicalRunPath: string;
  readonly executorId: string;
  readonly executionId: string;
  readonly attempt: number;
  readonly attemptPath: string;
  readonly manifestCaseCount: number | null;
  readonly ok: boolean;
  readonly checks: readonly AutomationHandoffCheck[];
}

export interface AutomationPreAttemptFailureHandoff {
  readonly projectId: string;
  readonly logicalRunId: string;
  readonly logicalRunPath: string;
  readonly executorId: string;
  readonly executionId: string;
  readonly executionPath: string;
  readonly manifestCaseCount: number;
  readonly phase: "collection" | "preparation";
  readonly errorCode: string;
}

function isRealDirectory(path: string): boolean {
  try {
    return (
      !lstatSync(path).isSymbolicLink() &&
      statSync(path).isDirectory() &&
      realpathSync(path) === resolve(path)
    );
  } catch {
    return false;
  }
}

function assertSafeTarget(path: string): void {
  try {
    const target = lstatSync(path);
    if (target.isSymbolicLink()) {
      throw new Error(`automation handoff: handoff.md 不得是符号链接: ${path}`);
    }
    if (!target.isFile()) {
      throw new Error(`automation handoff: handoff.md 必须是普通文件: ${path}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
}

function assertSingleLine(value: string, field: string): void {
  if (value.length === 0 || value !== value.trim() || /[\r\n\0]/.test(value)) {
    throw new Error(`automation handoff: ${field} 必须是非空单行文本`);
  }
}

function code(value: string): string {
  return `\`${value.replaceAll("`", "\\`")}\``;
}

function assertHandoffIdentity(result: AutomationHandoffResult): void {
  if (!AUTOMATION_ID_RE.test(result.projectId)) {
    throw new Error("automation handoff: project_id 格式非法");
  }
  if (!RUN_ID_RE.test(result.logicalRunId)) {
    throw new Error("automation handoff: logical_run_id 格式非法");
  }
  if (!AUTOMATION_ID_RE.test(result.executorId)) {
    throw new Error("automation handoff: executor_id 格式非法");
  }
  if (!EXECUTION_ID_RE.test(result.executionId)) {
    throw new Error("automation handoff: execution_id 格式非法");
  }
  if (!Number.isSafeInteger(result.attempt) || result.attempt < 1) {
    throw new Error("automation handoff: attempt 必须是正整数");
  }
  if (
    result.manifestCaseCount !== null &&
    (!Number.isSafeInteger(result.manifestCaseCount) || result.manifestCaseCount < 0)
  ) {
    throw new Error("automation handoff: manifest case count 格式非法");
  }
  if (result.checks.length === 0) {
    throw new Error("automation handoff: checks 不得为空");
  }
  for (const check of result.checks) {
    assertSingleLine(check.name, "check name");
    assertSingleLine(check.message, "check message");
  }
}

function assertHandoffPaths(result: AutomationHandoffResult, repoRoot: string): string {
  const canonicalRepoRoot = resolve(repoRoot);
  if (!isRealDirectory(canonicalRepoRoot)) {
    throw new Error("automation handoff: repo root 路径缺失、不安全或经过符号链接");
  }
  const logicalRunPath = resolve(result.logicalRunPath);
  if (!isRealDirectory(logicalRunPath)) {
    throw new Error("automation handoff: logical run 路径缺失、不安全或经过符号链接");
  }
  if (
    logicalRunPath !==
      join(canonicalRepoRoot, "artifacts", "runs", result.projectId, result.logicalRunId) ||
    basename(logicalRunPath) !== result.logicalRunId ||
    basename(dirname(logicalRunPath)) !== result.projectId
  ) {
    throw new Error("automation handoff: logical run 路径与 identity 不一致");
  }
  const expectedAttemptPath = join(
    logicalRunPath,
    "executions",
    result.executorId,
    result.executionId,
    "attempts",
    String(result.attempt).padStart(3, "0"),
  );
  if (resolve(result.attemptPath) !== expectedAttemptPath || !isRealDirectory(result.attemptPath)) {
    throw new Error("automation handoff: attempt 路径越界、不安全或与 identity 不一致");
  }
  const target = join(logicalRunPath, "handoff.md");
  assertSafeTarget(target);
  return target;
}

function assertPreAttemptFailure(
  result: AutomationPreAttemptFailureHandoff,
  repoRoot: string,
): string {
  if (!AUTOMATION_ID_RE.test(result.projectId)) {
    throw new Error("automation handoff: project_id 格式非法");
  }
  if (!RUN_ID_RE.test(result.logicalRunId)) {
    throw new Error("automation handoff: logical_run_id 格式非法");
  }
  if (!AUTOMATION_ID_RE.test(result.executorId)) {
    throw new Error("automation handoff: executor_id 格式非法");
  }
  if (!EXECUTION_ID_RE.test(result.executionId)) {
    throw new Error("automation handoff: execution_id 格式非法");
  }
  if (!Number.isSafeInteger(result.manifestCaseCount) || result.manifestCaseCount < 1) {
    throw new Error("automation handoff: manifest case count 格式非法");
  }
  if (!/^[A-Z][A-Z0-9_]*$/.test(result.errorCode)) {
    throw new Error("automation handoff: error code 格式非法");
  }
  const canonicalRepoRoot = resolve(repoRoot);
  const logicalRunPath = resolve(result.logicalRunPath);
  const executionPath = resolve(result.executionPath);
  if (!isRealDirectory(canonicalRepoRoot) || !isRealDirectory(logicalRunPath)) {
    throw new Error("automation handoff: logical run 路径缺失或不安全");
  }
  if (
    logicalRunPath !==
    join(canonicalRepoRoot, "artifacts", "runs", result.projectId, result.logicalRunId)
  ) {
    throw new Error("automation handoff: logical run 路径与 identity 不一致");
  }
  if (
    executionPath !== join(logicalRunPath, "executions", result.executorId, result.executionId) ||
    !isRealDirectory(executionPath)
  ) {
    throw new Error("automation handoff: execution 路径越界、不安全或与 identity 不一致");
  }
  const target = join(logicalRunPath, "handoff.md");
  assertSafeTarget(target);
  return target;
}

/** Render a credential-free verification handoff from already validated identities and checks. */
export function renderAutomationHandoff(result: AutomationHandoffResult): string {
  assertHandoffIdentity(result);
  const lines = [
    "# Automation Verification Handoff",
    "",
    `Result: **${result.ok ? "VERIFIED" : "NOT VERIFIED"}**`,
    "",
    `- Project: ${code(result.projectId)}`,
    `- Logical run: ${code(result.logicalRunId)}`,
    `- Executor: ${code(result.executorId)}`,
    `- Execution: ${code(result.executionId)}`,
    `- Attempt: ${code(String(result.attempt).padStart(3, "0"))}`,
    `- Manifest case count: ${code(
      result.manifestCaseCount === null ? "unavailable" : String(result.manifestCaseCount),
    )}`,
    `- Attempt path: ${code(resolve(result.attemptPath))}`,
    "",
    "## Checks",
    "",
    ...result.checks.map(
      (check) => `- ${check.passed ? "PASS" : "FAIL"} ${code(check.name)}: ${check.message}`,
    ),
    "",
  ];
  return lines.join("\n");
}

/** Atomically replace the logical-run handoff; unsafe paths and write failures are fatal. */
export function writeAutomationHandoff(result: AutomationHandoffResult, repoRoot: string): string {
  assertHandoffIdentity(result);
  const target = assertHandoffPaths(result, repoRoot);
  writeFileAtomic(target, renderAutomationHandoff(result));
  return target;
}

/** Publish a credential-free NOT VERIFIED handoff when no attempt was allocated. */
export function writeAutomationPreAttemptFailureHandoff(
  result: AutomationPreAttemptFailureHandoff,
  repoRoot: string,
): string {
  const target = assertPreAttemptFailure(result, repoRoot);
  const content = [
    "# Automation Verification Handoff",
    "",
    "Result: **NOT VERIFIED**",
    "",
    `- Project: ${code(result.projectId)}`,
    `- Logical run: ${code(result.logicalRunId)}`,
    `- Executor: ${code(result.executorId)}`,
    `- Execution: ${code(result.executionId)}`,
    "- Attempt: `unavailable`",
    `- Manifest case count: ${code(String(result.manifestCaseCount))}`,
    "- Attempt path: `unavailable`",
    "",
    "## Checks",
    "",
    `- FAIL ${code(result.phase)}: ${code(result.errorCode)}`,
    "",
  ].join("\n");
  writeFileAtomic(target, content);
  return target;
}
