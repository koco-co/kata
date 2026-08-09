import { existsSync, lstatSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { writeJsonExclusiveAtomic } from "../atomic-writer.ts";
import { CASE_ID_RE } from "../cases/naming.ts";
import { RUN_ID_RE } from "../run-id.ts";
import { AUTOMATION_ID_RE, EXECUTION_ID_RE } from "./run-layout.ts";

export type BusinessRecordPolicy =
  | { readonly policy: "required" }
  | { readonly policy: "not_applicable"; readonly reason: string };

export interface ExecutionEffects {
  readonly platform_write: boolean;
}

export interface ExecutionCase {
  readonly feature_id: string;
  readonly case_id: string;
  readonly title: string;
  readonly effects: ExecutionEffects;
  readonly business_record: BusinessRecordPolicy;
}

export interface ExecutionManifest {
  readonly schema_version: 2;
  readonly logical_run_id: string;
  readonly execution_id: string;
  readonly project_id: string;
  readonly executor_id: string;
  readonly cases: readonly ExecutionCase[];
}

function fail(path: string, reason: string): never {
  throw new Error(`execution manifest ${path}: ${reason}`);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(path, "必须是对象");
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  const unexpected = Object.keys(value).find((key) => !allowed.includes(key));
  if (unexpected) fail(path, `不允许字段 ${unexpected}`);
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim() || value !== value.trim()) {
    fail(path, "必须是无首尾空白的非空字符串");
  }
  return value;
}

function stableId(value: unknown, path: string): string {
  const parsed = requiredString(value, path);
  if (!AUTOMATION_ID_RE.test(parsed)) fail(path, "必须是小写英文 kebab 标识");
  return parsed;
}

function parseBusinessRecord(value: unknown, path: string): BusinessRecordPolicy {
  const item = record(value, path);
  if (item.policy === "required") {
    exactKeys(item, ["policy"], path);
    return { policy: "required" };
  }
  if (item.policy === "not_applicable") {
    exactKeys(item, ["policy", "reason"], path);
    return {
      policy: "not_applicable",
      reason: requiredString(item.reason, `${path}.reason`),
    };
  }
  fail(`${path}.policy`, "必须是 required 或 not_applicable");
}

function parseEffects(value: unknown, path: string): ExecutionEffects {
  const item = record(value, path);
  exactKeys(item, ["platform_write"], path);
  if (typeof item.platform_write !== "boolean") {
    fail(`${path}.platform_write`, "必须是布尔值");
  }
  return { platform_write: item.platform_write };
}

function parseCase(value: unknown, index: number): ExecutionCase {
  const path = `cases[${index}]`;
  const item = record(value, path);
  exactKeys(item, ["feature_id", "case_id", "title", "effects", "business_record"], path);
  const caseId = requiredString(item.case_id, `${path}.case_id`);
  if (!CASE_ID_RE.test(caseId)) fail(`${path}.case_id`, "必须匹配 C0001 格式");
  return {
    feature_id: stableId(item.feature_id, `${path}.feature_id`),
    case_id: caseId,
    title: requiredString(item.title, `${path}.title`),
    effects: parseEffects(item.effects, `${path}.effects`),
    business_record: parseBusinessRecord(item.business_record, `${path}.business_record`),
  };
}

/** Parse and validate the versioned, secret-free executor input contract. */
export function parseExecutionManifest(value: unknown): ExecutionManifest {
  const manifest = record(value, "root");
  exactKeys(
    manifest,
    ["schema_version", "logical_run_id", "execution_id", "project_id", "executor_id", "cases"],
    "root",
  );
  if (manifest.schema_version !== 2) fail("schema_version", "仅支持 2");
  const logicalRunId = requiredString(manifest.logical_run_id, "logical_run_id");
  if (!RUN_ID_RE.test(logicalRunId)) fail("logical_run_id", "格式非法");
  const executionId = requiredString(manifest.execution_id, "execution_id");
  if (!EXECUTION_ID_RE.test(executionId)) fail("execution_id", "格式非法");
  const projectId = stableId(manifest.project_id, "project_id");
  const executorId = stableId(manifest.executor_id, "executor_id");
  if (!Array.isArray(manifest.cases) || manifest.cases.length === 0) {
    fail("cases", "必须是非空数组");
  }
  const cases = manifest.cases.map(parseCase);
  const identities = new Set<string>();
  for (const item of cases) {
    const identity = `${projectId}/${item.feature_id}/${item.case_id}`;
    if (identities.has(identity)) fail("cases", `重复用例 ${identity}`);
    identities.add(identity);
  }
  return {
    schema_version: 2,
    logical_run_id: logicalRunId,
    execution_id: executionId,
    project_id: projectId,
    executor_id: executorId,
    cases,
  };
}

/** Publish the immutable execution manifest at the execution root. */
export function writeExecutionManifest(executionPath: string, manifest: ExecutionManifest): string {
  const parsed = parseExecutionManifest(manifest);
  const root = resolve(executionPath);
  if (basename(root) !== parsed.execution_id) {
    throw new Error(`execution manifest execution_id 与目录不一致: ${root}`);
  }
  if (basename(dirname(root)) !== parsed.executor_id) {
    throw new Error(`execution manifest executor_id 与目录不一致: ${root}`);
  }
  if (!existsSync(root) || !lstatSync(root).isDirectory() || lstatSync(root).isSymbolicLink()) {
    throw new Error(`execution manifest 目录不存在或不安全: ${root}`);
  }
  const path = join(root, "execution-manifest.json");
  writeJsonExclusiveAtomic(path, parsed);
  return path;
}

/** Read and validate an execution manifest before using it. */
export function readExecutionManifest(path: string): ExecutionManifest {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`execution manifest JSON 无效: ${path}: ${(error as Error).message}`);
  }
  return parseExecutionManifest(value);
}
