import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { CASE_ID_RE } from "../cases/naming.ts";
import { RUN_ID_RE } from "../run-id.ts";
import { writeAutomationHandoff } from "./automation-handoff.ts";
import {
  type ExecutionCase,
  type ExecutionManifest,
  readExecutionManifest,
} from "./execution-manifest.ts";
import {
  AUTOMATION_ID_RE,
  EXECUTION_ID_RE,
  executionDirectory,
  logicalRunDirectory,
} from "./run-layout.ts";

const ATTEMPT_ID_RE = /^[0-9]{3,}$/;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const EVIDENCE_FIELDS = new Set([
  "action",
  "case_id",
  "expected",
  "feature_id",
  "project_id",
  "schema_version",
  "screenshot",
  "sequence",
  "status",
  "target",
]);
const BUSINESS_RECORD_FIELDS = new Set([
  "case_id",
  "feature_id",
  "project_id",
  "record_id",
  "record_type",
  "schema_version",
  "ui_readback",
]);

export interface AutomationVerifyCheck {
  readonly name:
    | "manifest"
    | "collection"
    | "preparation"
    | "attempt-status"
    | "allure-results"
    | "evidence"
    | "business-records";
  readonly passed: boolean;
  readonly message: string;
}

export interface AutomationVerifyResult {
  readonly projectId: string;
  readonly logicalRunId: string;
  readonly logicalRunPath: string;
  readonly executorId: string;
  readonly executionId: string;
  readonly executionPath: string;
  readonly attempt: number;
  readonly attemptPath: string;
  readonly manifestCaseCount: number | null;
  readonly handoffPath: string;
  readonly ok: boolean;
  readonly checks: readonly AutomationVerifyCheck[];
}

interface VerifyOptions {
  readonly repoRoot: string;
  readonly projectId: string;
  readonly logicalRunId: string;
  readonly executorId?: string;
  readonly executionId?: string;
  readonly attempt?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: ReadonlySet<string>): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.size && keys.every((key) => expected.has(key));
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

function isRealFile(path: string): boolean {
  try {
    return (
      !lstatSync(path).isSymbolicLink() &&
      statSync(path).isFile() &&
      realpathSync(path) === resolve(path)
    );
  } catch {
    return false;
  }
}

function readJsonObject(path: string): Record<string, unknown> | undefined {
  if (!isRealFile(path)) return undefined;
  try {
    const value: unknown = JSON.parse(readFileSync(path, "utf8"));
    return isRecord(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function realChildDirectories(parent: string, pattern: RegExp): readonly string[] {
  if (!isRealDirectory(parent)) return [];
  return readdirSync(parent)
    .filter((name) => pattern.test(name) && isRealDirectory(join(parent, name)))
    .sort();
}

function selectExecutor(logicalRunPath: string, requested?: string): string {
  if (requested !== undefined && !AUTOMATION_ID_RE.test(requested)) {
    throw new Error("automation verify: executor_id 必须是小写 kebab 标识");
  }
  const available = realChildDirectories(join(logicalRunPath, "executions"), AUTOMATION_ID_RE);
  if (requested !== undefined) {
    if (!available.includes(requested))
      throw new Error("automation verify: executor execution 不存在");
    return requested;
  }
  if (available.length !== 1) {
    throw new Error(
      `automation verify: 必须显式指定 executor；available=${available.join(",") || "(none)"}`,
    );
  }
  return available[0] as string;
}

function selectExecution(logicalRunPath: string, executorId: string, requested?: string): string {
  if (requested !== undefined && !EXECUTION_ID_RE.test(requested)) {
    throw new Error("automation verify: execution_id 格式非法");
  }
  const parent = join(logicalRunPath, "executions", executorId);
  const available = [...realChildDirectories(parent, EXECUTION_ID_RE)].sort(
    (left, right) =>
      Number(left.slice("execution-".length)) - Number(right.slice("execution-".length)),
  );
  if (requested !== undefined) {
    if (!available.includes(requested)) throw new Error("automation verify: execution 不存在");
    return requested;
  }
  const latest = available.at(-1);
  if (latest === undefined) throw new Error("automation verify: execution 不存在");
  return latest;
}

function selectAttempt(executionPath: string, requested?: number): { id: string; number: number } {
  if (requested !== undefined && (!Number.isSafeInteger(requested) || requested < 1)) {
    throw new Error("automation verify: attempt 必须是正整数");
  }
  const available = [...realChildDirectories(join(executionPath, "attempts"), ATTEMPT_ID_RE)].sort(
    (left, right) => Number(left) - Number(right),
  );
  const id = requested === undefined ? available.at(-1) : String(requested).padStart(3, "0");
  if (id === undefined || !available.includes(id)) {
    throw new Error("automation verify: attempt 不存在");
  }
  return { id, number: Number(id) };
}

function passedCheck(name: AutomationVerifyCheck["name"], message: string): AutomationVerifyCheck {
  return { name, passed: true, message };
}

function failedCheck(name: AutomationVerifyCheck["name"], message: string): AutomationVerifyCheck {
  return { name, passed: false, message };
}

function verifyStatus(
  path: string,
  phase: "collect" | "run",
  manifest: ExecutionManifest,
  attempt?: number,
): string | undefined {
  const value = readJsonObject(path);
  if (value === undefined) return `${basename(path)} 缺失、不安全或不是合法 JSON`;
  const expectedKeys = new Set([
    "schema_version",
    "phase",
    "status",
    "exit_code",
    "logical_run_id",
    "execution_id",
    "executor_id",
    ...(attempt === undefined ? [] : ["attempt"]),
    "started_at",
    "finished_at",
  ]);
  if (!hasExactKeys(value, expectedKeys)) return `${basename(path)} 字段不符合 schema`;
  if (
    value.schema_version !== 1 ||
    value.phase !== phase ||
    value.status !== "command_passed" ||
    value.exit_code !== 0 ||
    value.logical_run_id !== manifest.logical_run_id ||
    value.execution_id !== manifest.execution_id ||
    value.executor_id !== manifest.executor_id ||
    (attempt !== undefined && value.attempt !== attempt) ||
    typeof value.started_at !== "string" ||
    typeof value.finished_at !== "string" ||
    Number.isNaN(Date.parse(value.started_at)) ||
    Number.isNaN(Date.parse(value.finished_at))
  ) {
    return `${basename(path)} 必须是同一 execution 的 command_passed/0`;
  }
  return undefined;
}

function verifyPreparationStatus(path: string, manifest: ExecutionManifest): string | undefined {
  const value = readJsonObject(path);
  if (value === undefined) return "preparation-status.json 缺失、不安全或不是合法 JSON";
  const expectedKeys = new Set([
    "schema_version",
    "phase",
    "status",
    "logical_run_id",
    "execution_id",
    "executor_id",
    "started_at",
    "finished_at",
  ]);
  if (!hasExactKeys(value, expectedKeys)) return "preparation-status.json 字段不符合 schema";
  if (
    value.schema_version !== 1 ||
    value.phase !== "prepare" ||
    value.status !== "passed" ||
    value.logical_run_id !== manifest.logical_run_id ||
    value.execution_id !== manifest.execution_id ||
    value.executor_id !== manifest.executor_id ||
    typeof value.started_at !== "string" ||
    typeof value.finished_at !== "string" ||
    Number.isNaN(Date.parse(value.started_at)) ||
    Number.isNaN(Date.parse(value.finished_at))
  ) {
    return "preparation-status.json 必须是同一 execution 的 passed 状态";
  }
  return undefined;
}

function canonicalKey(projectId: string, featureId: string, caseId: string): string {
  return `${projectId}/${featureId}/${caseId}`;
}

function allureCaseKey(value: Record<string, unknown>): string | undefined {
  if (value.status !== "passed" || !Array.isArray(value.labels)) return undefined;
  const labels = value.labels.filter(isRecord);
  const selected: Record<string, string> = {};
  for (const name of ["project_id", "feature_id", "case_id"] as const) {
    const values = labels.filter((label) => label.name === name).map((label) => label.value);
    if (values.length !== 1 || typeof values[0] !== "string") return undefined;
    selected[name] = values[0];
  }
  if (
    !AUTOMATION_ID_RE.test(selected.project_id as string) ||
    !AUTOMATION_ID_RE.test(selected.feature_id as string) ||
    !CASE_ID_RE.test(selected.case_id as string)
  ) {
    return undefined;
  }
  return canonicalKey(
    selected.project_id as string,
    selected.feature_id as string,
    selected.case_id as string,
  );
}

function verifyAllure(attemptPath: string, manifest: ExecutionManifest): string | undefined {
  const root = join(attemptPath, "allure-results");
  if (!isRealDirectory(root)) return "allure-results/ 缺失或不安全";
  const resultFiles = readdirSync(root)
    .filter((name) => name.endsWith("-result.json"))
    .sort();
  const expected = new Set(
    manifest.cases.map((item) => canonicalKey(manifest.project_id, item.feature_id, item.case_id)),
  );
  const actual: string[] = [];
  for (const name of resultFiles) {
    const value = readJsonObject(join(root, name));
    const key = value === undefined ? undefined : allureCaseKey(value);
    if (key === undefined) {
      return "Allure result 必须为 passed 且包含精确 canonical labels";
    }
    actual.push(key);
  }
  if (
    actual.length !== expected.size ||
    new Set(actual).size !== actual.length ||
    actual.some((key) => !expected.has(key))
  ) {
    return "Allure results 必须与 manifest cases 一一对应";
  }
  return undefined;
}

function nonEmptyTrimmed(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value === value.trim();
}

function validPng(path: string): boolean {
  if (!isRealFile(path)) return false;
  const value = readFileSync(path);
  return value.length >= PNG_SIGNATURE.length && value.subarray(0, 8).equals(PNG_SIGNATURE);
}

function validEvidenceCheckpoint(
  path: string,
  selectedCase: ExecutionCase,
  projectId: string,
): boolean {
  const value = readJsonObject(path);
  if (value === undefined || !hasExactKeys(value, EVIDENCE_FIELDS)) return false;
  const sequence = value.sequence;
  if (!Number.isSafeInteger(sequence) || (sequence as number) < 1) return false;
  const stem = `step-${String(sequence).padStart(3, "0")}`;
  const casePath = join(path, "..");
  return (
    basename(path) === `${stem}.json` &&
    value.schema_version === 1 &&
    value.project_id === projectId &&
    value.feature_id === selectedCase.feature_id &&
    value.case_id === selectedCase.case_id &&
    value.status === "passed" &&
    value.screenshot === `${stem}.png` &&
    nonEmptyTrimmed(value.action) &&
    nonEmptyTrimmed(value.expected) &&
    nonEmptyTrimmed(value.target) &&
    validPng(join(casePath, `${stem}.png`))
  );
}

function verifyEvidence(attemptPath: string, manifest: ExecutionManifest): string | undefined {
  const root = join(attemptPath, "evidence");
  if (!isRealDirectory(root)) return "evidence/ 缺失或不安全";
  const expected = new Set(
    manifest.cases.map((selectedCase) => `${selectedCase.feature_id}/${selectedCase.case_id}`),
  );
  const inventory = caseDirectoryInventory(root);
  if (typeof inventory === "string") return inventory;
  if (inventory.size !== expected.size || [...inventory].some((key) => !expected.has(key))) {
    const missing = [...expected].filter((key) => !inventory.has(key));
    const unexpected = [...inventory].filter((key) => !expected.has(key));
    return `evidence case directories 必须与 manifest cases 一一对应；missing=${missing.join(",") || "(none)"} unexpected=${unexpected.join(",") || "(none)"}`;
  }
  for (const selectedCase of manifest.cases) {
    const key = `${selectedCase.feature_id}/${selectedCase.case_id}`;
    const casePath = join(root, key);
    if (!isRealDirectory(casePath)) return `${key} evidence 缺失或不安全`;
    const checkpoints = readdirSync(casePath)
      .filter((name) => /^step-[0-9]{3,}\.json$/.test(name))
      .map((name) => join(casePath, name));
    if (
      !checkpoints.some((path) => validEvidenceCheckpoint(path, selectedCase, manifest.project_id))
    ) {
      return `${key} 缺少有效的成功 checkpoint 与截图`;
    }
  }
  return undefined;
}

function caseDirectoryInventory(root: string): ReadonlySet<string> | string {
  const result = new Set<string>();
  for (const featureId of readdirSync(root)) {
    const featurePath = join(root, featureId);
    if (!AUTOMATION_ID_RE.test(featureId) || !isRealDirectory(featurePath)) {
      return "evidence/ 包含非 canonical 或不安全的 feature 目录";
    }
    for (const caseId of readdirSync(featurePath)) {
      const casePath = join(featurePath, caseId);
      if (!CASE_ID_RE.test(caseId) || !isRealDirectory(casePath)) {
        return "evidence/ 包含非 canonical 或不安全的 case 目录";
      }
      result.add(`${featureId}/${caseId}`);
    }
  }
  return result;
}

function validBusinessRecord(
  path: string,
  selectedCase: ExecutionCase,
  projectId: string,
): boolean {
  const value = readJsonObject(path);
  return (
    value !== undefined &&
    hasExactKeys(value, BUSINESS_RECORD_FIELDS) &&
    value.schema_version === 1 &&
    value.project_id === projectId &&
    value.feature_id === selectedCase.feature_id &&
    value.case_id === selectedCase.case_id &&
    nonEmptyTrimmed(value.record_type) &&
    nonEmptyTrimmed(value.record_id) &&
    isRecord(value.ui_readback) &&
    Object.keys(value.ui_readback).length > 0
  );
}

function verifyBusinessRecords(
  attemptPath: string,
  manifest: ExecutionManifest,
): string | undefined {
  const root = join(attemptPath, "business-records");
  if (!isRealDirectory(root)) return "business-records/ 缺失或不安全";
  const expectedRecords = new Set(
    manifest.cases
      .filter((selectedCase) => selectedCase.business_record.policy === "required")
      .map((selectedCase) => `${selectedCase.feature_id}/${selectedCase.case_id}.json`),
  );
  const inventory = businessRecordInventory(root);
  if (typeof inventory === "string") return inventory;
  for (const selectedCase of manifest.cases) {
    const path = join(root, selectedCase.feature_id, `${selectedCase.case_id}.json`);
    if (selectedCase.business_record.policy === "not_applicable") {
      if (existsSync(path) || lstatExists(path)) {
        return `${selectedCase.feature_id}/${selectedCase.case_id} 为 not_applicable 但产生了记录`;
      }
      continue;
    }
    if (!validBusinessRecord(path, selectedCase, manifest.project_id)) {
      return `${selectedCase.feature_id}/${selectedCase.case_id} 缺少有效 UI readback business record`;
    }
  }
  if (
    inventory.size !== expectedRecords.size ||
    [...inventory].some((key) => !expectedRecords.has(key))
  ) {
    const missing = [...expectedRecords].filter((key) => !inventory.has(key));
    const unexpected = [...inventory].filter((key) => !expectedRecords.has(key));
    return `business records 必须与 manifest required policies 一一对应；missing=${missing.join(",") || "(none)"} unexpected=${unexpected.join(",") || "(none)"}`;
  }
  return undefined;
}

function businessRecordInventory(root: string): ReadonlySet<string> | string {
  const result = new Set<string>();
  for (const featureId of readdirSync(root)) {
    const featurePath = join(root, featureId);
    if (!AUTOMATION_ID_RE.test(featureId) || !isRealDirectory(featurePath)) {
      return "business-records/ 包含非 canonical 或不安全的 feature 目录";
    }
    for (const name of readdirSync(featurePath)) {
      const path = join(featurePath, name);
      const caseId = name.replace(/\.json$/, "");
      if (name !== `${caseId}.json` || !CASE_ID_RE.test(caseId) || !isRealFile(path)) {
        return "business-records/ 包含非 canonical 或不安全的 record 文件";
      }
      result.add(`${featureId}/${name}`);
    }
  }
  return result;
}

function lstatExists(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

function checked(
  name: AutomationVerifyCheck["name"],
  error: string | undefined,
  success: string,
): AutomationVerifyCheck {
  return error === undefined ? passedCheck(name, success) : failedCheck(name, error);
}

function publishHandoff(
  result: Omit<AutomationVerifyResult, "handoffPath">,
  repoRoot: string,
): AutomationVerifyResult {
  const handoffPath = writeAutomationHandoff(result, repoRoot);
  return { ...result, handoffPath };
}

/** Verify one immutable executor attempt against its manifest and durable evidence chain. */
export function verifyAutomationRun(options: VerifyOptions): AutomationVerifyResult {
  const repoRoot = realpathSync(options.repoRoot);
  if (!AUTOMATION_ID_RE.test(options.projectId)) {
    throw new Error("automation verify: project_id 必须是小写 kebab 标识");
  }
  if (!RUN_ID_RE.test(options.logicalRunId)) {
    throw new Error("automation verify: logical_run_id 格式非法");
  }
  const logicalRunPath = logicalRunDirectory({
    repoRoot,
    projectId: options.projectId,
    logicalRunId: options.logicalRunId,
  });
  if (!isRealDirectory(logicalRunPath))
    throw new Error("automation verify: logical run 不存在或不安全");
  const executorId = selectExecutor(logicalRunPath, options.executorId);
  const executionId = selectExecution(logicalRunPath, executorId, options.executionId);
  const executionPath = executionDirectory({
    repoRoot,
    projectId: options.projectId,
    logicalRunId: options.logicalRunId,
    executorId,
    executionId,
  });
  const selectedAttempt = selectAttempt(executionPath, options.attempt);
  const attemptPath = join(executionPath, "attempts", selectedAttempt.id);
  const manifestPath = join(executionPath, "execution-manifest.json");
  let manifest: ExecutionManifest;
  try {
    if (!isRealFile(manifestPath)) throw new Error("manifest path unsafe");
    manifest = readExecutionManifest(manifestPath);
  } catch {
    const checks = [failedCheck("manifest", "execution-manifest.json 缺失、不安全或无效")];
    return publishHandoff(
      {
        projectId: options.projectId,
        logicalRunId: options.logicalRunId,
        logicalRunPath,
        executorId,
        executionId,
        executionPath,
        attempt: selectedAttempt.number,
        attemptPath,
        manifestCaseCount: null,
        ok: false,
        checks,
      },
      repoRoot,
    );
  }
  const manifestError =
    manifest.project_id === options.projectId &&
    manifest.logical_run_id === options.logicalRunId &&
    manifest.executor_id === executorId &&
    manifest.execution_id === executionId
      ? undefined
      : "manifest identity 与 artifact 路径不一致";
  const collectionError = verifyStatus(
    join(executionPath, "collection-status.json"),
    "collect",
    manifest,
  );
  const preparationError = verifyPreparationStatus(
    join(executionPath, "preparation-status.json"),
    manifest,
  );
  const attemptStatusError = verifyStatus(
    join(attemptPath, "status.json"),
    "run",
    manifest,
    selectedAttempt.number,
  );
  const checks: AutomationVerifyCheck[] = [
    checked("manifest", manifestError, `${manifest.cases.length} 个 canonical cases`),
    checked("collection", collectionError, "exact collection command_passed/0"),
    checked("preparation", preparationError, "platform environment and safety gates passed"),
    checked("attempt-status", attemptStatusError, "run command_passed/0"),
    checked(
      "allure-results",
      verifyAllure(attemptPath, manifest),
      `${manifest.cases.length} 个 passed results 与 manifest 一一对应`,
    ),
    checked(
      "evidence",
      verifyEvidence(attemptPath, manifest),
      `${manifest.cases.length} 个 cases 均有成功 checkpoint`,
    ),
    checked(
      "business-records",
      verifyBusinessRecords(attemptPath, manifest),
      "required 与 not_applicable policies 均满足",
    ),
  ];
  return publishHandoff(
    {
      projectId: options.projectId,
      logicalRunId: options.logicalRunId,
      logicalRunPath,
      executorId,
      executionId,
      executionPath,
      attempt: selectedAttempt.number,
      attemptPath,
      manifestCaseCount: manifest.cases.length,
      ok: checks.every((check) => check.passed),
      checks,
    },
    repoRoot,
  );
}
