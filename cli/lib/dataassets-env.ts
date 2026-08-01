import { execFileSync, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { constants as osConstants } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { parse, stringify } from "yaml";
import { assertNoSymlinkPath } from "./features-layout.ts";
import { repoRoot as defaultRepoRoot } from "./workspace-locator.ts";

export const DATAASSETS_RESOLVED_ENV = "KATA_DATAASSETS_RESOLVED";
export const DATAASSETS_CONFIG_ENV = "KATA_DATAASSETS_CONFIG";

const ENV_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;
const PLACEHOLDER = "CHANGE_ME";
const ENV_DIR_MODE = 0o700;
const ENV_FILE_MODE = 0o600;
const PLATFORM_REQUEST_TIMEOUT_MS = 15_000;
const MAX_PLATFORM_RESPONSE_BYTES = 2 * 1024 * 1024;
const ENV_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SAFE_CHILD_ENV_KEYS = [
  "PATH",
  "HOME",
  "USER",
  "LOGNAME",
  "SHELL",
  "TMPDIR",
  "TMP",
  "TEMP",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TERM",
  "CI",
  "SystemRoot",
  "ComSpec",
  "PATHEXT",
  "KATA_RUN_PATH",
  "KATA_ACTIVE_PROJECT",
  "KATA_WORKSPACE_ROOT",
] as const;

export interface DataAssetsEnvConfig {
  readonly schema_version: 2;
  readonly url: string;
  readonly auth: { readonly cookie: string };
  readonly guard: { readonly expected_tenant: string };
  readonly projects: { readonly quality: string; readonly offline?: string };
  readonly datasources: Record<
    string,
    {
      readonly name: string;
      readonly database: string;
      readonly schema?: string;
      /** Whether this source must be registered in the offline project. */
      readonly requires_offline?: boolean;
    }
  >;
  readonly defaults: { readonly datasource: string };
  readonly safety: { readonly allow_write: boolean };
  readonly automation?: DataAssetsAutomationConfig;
}

/** Environment-specific automation defaults; secrets and platform identity stay outside this node. */
export interface DataAssetsAutomationConfig {
  readonly cases?: string;
  readonly table_batch_suffix?: string;
  readonly table_partition?: string;
  readonly result_strict?: boolean;
  readonly case_timeout_ms?: number;
  readonly result_timeout_ms?: number;
  readonly result_query_retry_timeout_ms?: number;
  readonly result_query_retry_interval_ms?: number;
  readonly table_option_timeout_ms?: number;
  readonly rule_set_save_prompt_close_timeout_ms?: number;
  readonly task_search_query?: string;
  readonly task_scan_max_pages?: number;
  readonly ruleset_scan_max_pages?: number;
  readonly spin_timeout_ms?: number;
  readonly import_form_timeout_ms?: number;
  readonly select_spin_timeout_ms?: number;
  readonly resource_group?: string;
  readonly execute_submit_wait_ms?: number;
  readonly doris_jdbc_url?: string;
  readonly doris_user?: string;
  readonly doris_password?: string;
  readonly doris_connect_timeout_ms?: number;
  readonly limited_env?: string;
  readonly probe_table?: string;
}

interface ApiEnvelope<T> {
  readonly code?: number;
  readonly data?: T;
  readonly message?: string;
}

interface NamedProject {
  readonly id?: number | string;
  readonly name?: string;
  readonly projectName?: string;
  readonly projectAlias?: string;
}

interface AssetsDatasource {
  readonly id?: number;
  readonly dataSourceName?: string;
  readonly dtCenterSourceName?: string;
  readonly name?: string;
  readonly dataSourceType?: number;
}

interface MetadataDatasource {
  readonly dataSourceId?: number;
  readonly dataSourceName?: string;
  readonly dataSourceType?: number;
}

interface BatchDatasource {
  readonly id?: number;
  readonly dataName?: string;
  readonly dataSourceType?: number;
  readonly type?: number;
}

export interface ResolvedDataAssetsEnv {
  readonly schemaVersion: 2;
  readonly env: string;
  readonly urls: {
    readonly baseUrl: string;
    readonly dataAssetsBaseUrl: string;
    readonly offlineBaseUrl: string;
    readonly portalBaseUrl: string;
  };
  readonly tenant: {
    readonly name: string;
    readonly id?: number;
    readonly userId?: number;
    readonly username?: string;
  };
  readonly projects: {
    readonly quality: { readonly id: number; readonly name: string };
    readonly offline?: { readonly id: number; readonly name: string };
  };
  readonly datasources: Record<
    string,
    {
      readonly name: string;
      readonly batch?: { readonly id: number; readonly name: string; readonly typeId: number };
      readonly metadata: { readonly id: number; readonly name: string; readonly typeId: number };
      readonly assets: { readonly id: number; readonly name: string; readonly typeId: number };
      readonly database: string;
      readonly schema: string;
      readonly requiresOffline: boolean;
    }
  >;
  readonly defaults: { readonly datasource: string };
  readonly safety: { readonly allowWrite: boolean };
  readonly automation?: DataAssetsAutomationConfig;
  /** Non-fatal platform compatibility diagnostics collected during resolution. */
  readonly warnings?: readonly string[];
}

export interface EnvFinding {
  readonly code: string;
  readonly severity: "error" | "warn";
  readonly path: string;
}

export interface DataAssetsEnvContext {
  readonly repoRoot?: string;
  readonly fetchImpl?: typeof fetch;
  readonly inheritEnv?: readonly string[];
}

function rootFrom(ctx?: DataAssetsEnvContext): string {
  if (ctx?.repoRoot) return resolve(ctx.repoRoot);
  const candidate = resolve(defaultRepoRoot());
  try {
    const commonDir = execFileSync("git", ["-C", candidate, "rev-parse", "--git-common-dir"], {
      encoding: "utf8",
    }).trim();
    const absoluteCommonDir = resolve(candidate, commonDir);
    if (basename(absoluteCommonDir) === ".git") return dirname(absoluteCommonDir);
  } catch {
    // Non-Git fixture or packaged usage: keep the module-derived repository root.
  }
  return candidate;
}

export function assertDataAssetsEnvName(name: string): string {
  const normalized = name
    .trim()
    .replace(/\.ya?ml$/i, "")
    .toLowerCase();
  if (!ENV_NAME_RE.test(normalized)) {
    throw new Error("invalid environment name: use lowercase letters, numbers, and hyphens only");
  }
  return normalized;
}

export function dataAssetsEnvDir(root = defaultRepoRoot()): string {
  return join(resolve(root), "config", "env");
}

export function dataAssetsEnvPath(name: string, root = defaultRepoRoot()): string {
  return join(dataAssetsEnvDir(root), `${assertDataAssetsEnvName(name)}.yaml`);
}

function mode(path: string): number {
  return lstatSync(path).mode & 0o777;
}

function assertNotSymlink(path: string, label: string): void {
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) {
    throw new Error(`${label} must not be a symbolic link: ${path}`);
  }
}

function assertContained(root: string, path: string): void {
  const rel = relative(resolve(root), resolve(path));
  if (rel === ".." || rel.startsWith(`..${sep}`))
    throw new Error("environment path escapes repository");
}

function isGitTracked(root: string, path: string): boolean {
  try {
    execFileSync("git", ["-C", root, "ls-files", "--error-unmatch", relative(root, path)], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function ensureEnvDir(root: string): string {
  const configDir = join(root, "config");
  assertNotSymlink(configDir, "config directory");
  if (!existsSync(configDir)) mkdirSync(configDir, { mode: ENV_DIR_MODE });
  const envDir = dataAssetsEnvDir(root);
  assertNotSymlink(envDir, "environment directory");
  if (!existsSync(envDir)) mkdirSync(envDir, { recursive: true, mode: ENV_DIR_MODE });
  chmodSync(envDir, ENV_DIR_MODE);
  return envDir;
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  const extra = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extra.length > 0) throw new Error(`${path} contains unsupported keys: ${extra.join(", ")}`);
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${path} is required`);
  return value.trim();
}

function requiredBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${path} must be boolean`);
  return value;
}

function optionalString(value: unknown, path: string): string | undefined {
  if (value === undefined) return undefined;
  return requiredString(value, path);
}

function optionalPositiveInteger(value: unknown, path: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${path} must be a positive integer`);
  }
  return value;
}

function optionalNonNegativeInteger(value: unknown, path: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${path} must be a non-negative integer`);
  }
  return value;
}

function parseAutomationConfig(value: unknown): DataAssetsAutomationConfig | undefined {
  if (value === undefined) return undefined;
  const automation = record(value, "automation");
  exactKeys(
    automation,
    [
      "cases",
      "table_batch_suffix",
      "table_partition",
      "result_strict",
      "case_timeout_ms",
      "result_timeout_ms",
      "result_query_retry_timeout_ms",
      "result_query_retry_interval_ms",
      "table_option_timeout_ms",
      "rule_set_save_prompt_close_timeout_ms",
      "task_search_query",
      "task_scan_max_pages",
      "ruleset_scan_max_pages",
      "spin_timeout_ms",
      "import_form_timeout_ms",
      "select_spin_timeout_ms",
      "resource_group",
      "execute_submit_wait_ms",
      "doris_jdbc_url",
      "doris_user",
      "doris_password",
      "doris_connect_timeout_ms",
      "limited_env",
      "probe_table",
    ],
    "automation",
  );
  const cases = optionalString(automation.cases, "automation.cases");
  const tableBatchSuffix = optionalString(
    automation.table_batch_suffix,
    "automation.table_batch_suffix",
  );
  if (tableBatchSuffix !== undefined && !/^[a-z]{8}$/.test(tableBatchSuffix)) {
    throw new Error("automation.table_batch_suffix must be 8 lowercase letters");
  }
  const tablePartition = optionalString(automation.table_partition, "automation.table_partition");
  if (tablePartition !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(tablePartition)) {
    throw new Error("automation.table_partition must be yyyy-MM-dd");
  }
  if (automation.result_strict !== undefined && typeof automation.result_strict !== "boolean") {
    throw new Error("automation.result_strict must be boolean");
  }
  const resourceGroup = optionalString(automation.resource_group, "automation.resource_group");
  return {
    ...(cases === undefined ? {} : { cases }),
    ...(tableBatchSuffix === undefined ? {} : { table_batch_suffix: tableBatchSuffix }),
    ...(tablePartition === undefined ? {} : { table_partition: tablePartition }),
    ...(automation.result_strict === undefined ? {} : { result_strict: automation.result_strict }),
    ...(optionalPositiveInteger(automation.case_timeout_ms, "automation.case_timeout_ms") ===
    undefined
      ? {}
      : { case_timeout_ms: automation.case_timeout_ms as number }),
    ...(optionalPositiveInteger(automation.result_timeout_ms, "automation.result_timeout_ms") ===
    undefined
      ? {}
      : { result_timeout_ms: automation.result_timeout_ms as number }),
    ...(optionalPositiveInteger(
      automation.result_query_retry_timeout_ms,
      "automation.result_query_retry_timeout_ms",
    ) === undefined
      ? {}
      : { result_query_retry_timeout_ms: automation.result_query_retry_timeout_ms as number }),
    ...(optionalPositiveInteger(
      automation.result_query_retry_interval_ms,
      "automation.result_query_retry_interval_ms",
    ) === undefined
      ? {}
      : { result_query_retry_interval_ms: automation.result_query_retry_interval_ms as number }),
    ...(optionalPositiveInteger(
      automation.table_option_timeout_ms,
      "automation.table_option_timeout_ms",
    ) === undefined
      ? {}
      : { table_option_timeout_ms: automation.table_option_timeout_ms as number }),
    ...(optionalPositiveInteger(
      automation.rule_set_save_prompt_close_timeout_ms,
      "automation.rule_set_save_prompt_close_timeout_ms",
    ) === undefined
      ? {}
      : {
          rule_set_save_prompt_close_timeout_ms:
            automation.rule_set_save_prompt_close_timeout_ms as number,
        }),
    ...(optionalString(automation.task_search_query, "automation.task_search_query") === undefined
      ? {}
      : { task_search_query: automation.task_search_query as string }),
    ...(optionalNonNegativeInteger(
      automation.task_scan_max_pages,
      "automation.task_scan_max_pages",
    ) === undefined
      ? {}
      : { task_scan_max_pages: automation.task_scan_max_pages as number }),
    ...(optionalNonNegativeInteger(
      automation.ruleset_scan_max_pages,
      "automation.ruleset_scan_max_pages",
    ) === undefined
      ? {}
      : { ruleset_scan_max_pages: automation.ruleset_scan_max_pages as number }),
    ...(optionalPositiveInteger(automation.spin_timeout_ms, "automation.spin_timeout_ms") ===
    undefined
      ? {}
      : { spin_timeout_ms: automation.spin_timeout_ms as number }),
    ...(optionalPositiveInteger(
      automation.import_form_timeout_ms,
      "automation.import_form_timeout_ms",
    ) === undefined
      ? {}
      : { import_form_timeout_ms: automation.import_form_timeout_ms as number }),
    ...(optionalPositiveInteger(
      automation.select_spin_timeout_ms,
      "automation.select_spin_timeout_ms",
    ) === undefined
      ? {}
      : { select_spin_timeout_ms: automation.select_spin_timeout_ms as number }),
    ...(resourceGroup === undefined ? {} : { resource_group: resourceGroup }),
    ...(optionalPositiveInteger(
      automation.execute_submit_wait_ms,
      "automation.execute_submit_wait_ms",
    ) === undefined
      ? {}
      : { execute_submit_wait_ms: automation.execute_submit_wait_ms as number }),
    ...(optionalString(automation.doris_jdbc_url, "automation.doris_jdbc_url") === undefined
      ? {}
      : { doris_jdbc_url: automation.doris_jdbc_url as string }),
    ...(optionalString(automation.doris_user, "automation.doris_user") === undefined
      ? {}
      : { doris_user: automation.doris_user as string }),
    ...(optionalString(automation.doris_password, "automation.doris_password") === undefined
      ? {}
      : { doris_password: automation.doris_password as string }),
    ...(optionalPositiveInteger(
      automation.doris_connect_timeout_ms,
      "automation.doris_connect_timeout_ms",
    ) === undefined
      ? {}
      : { doris_connect_timeout_ms: automation.doris_connect_timeout_ms as number }),
    ...(optionalString(automation.limited_env, "automation.limited_env") === undefined
      ? {}
      : { limited_env: automation.limited_env as string }),
    ...(optionalString(automation.probe_table, "automation.probe_table") === undefined
      ? {}
      : { probe_table: automation.probe_table as string }),
  };
}

function normalizeRootUrl(value: unknown): string {
  const raw = requiredString(value, "url");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("url must be a valid HTTP(S) platform root URL");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("url must be an HTTP(S) platform root URL without credentials");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error(
      "url must be the platform root; module paths, query strings, and fragments are derived",
    );
  }
  return url.origin;
}

function parseConfigText(text: string, path: string): DataAssetsEnvConfig {
  let raw: unknown;
  try {
    raw = parse(text);
  } catch {
    throw new Error(`invalid environment YAML: ${path}`);
  }
  const top = record(raw, "environment");
  exactKeys(
    top,
    [
      "schema_version",
      "url",
      "auth",
      "guard",
      "projects",
      "datasources",
      "defaults",
      "safety",
      "automation",
    ],
    "environment",
  );
  if (top.schema_version !== 2) throw new Error("schema_version must be 2");

  const auth = record(top.auth, "auth");
  const guard = record(top.guard, "guard");
  const projects = record(top.projects, "projects");
  const datasources = record(top.datasources, "datasources");
  const defaults = record(top.defaults, "defaults");
  const safety = record(top.safety, "safety");
  const automation = parseAutomationConfig(top.automation);
  exactKeys(auth, ["cookie"], "auth");
  exactKeys(guard, ["expected_tenant"], "guard");
  exactKeys(projects, ["quality", "offline"], "projects");
  exactKeys(defaults, ["datasource"], "defaults");
  exactKeys(safety, ["allow_write"], "safety");
  if (typeof auth.cookie !== "string") throw new Error("auth.cookie must be a string");
  if (auth.cookie.includes("\n") || auth.cookie.includes("\r")) {
    throw new Error("auth.cookie must be a single-line Cookie header");
  }
  if (typeof safety.allow_write !== "boolean")
    throw new Error("safety.allow_write must be boolean");

  const parsedDatasources: DataAssetsEnvConfig["datasources"] = {};
  for (const [key, value] of Object.entries(datasources)) {
    if (!ENV_NAME_RE.test(key)) throw new Error(`invalid datasource key: ${key}`);
    const datasource = record(value, `datasources.${key}`);
    exactKeys(datasource, ["name", "database", "schema", "requires_offline"], `datasources.${key}`);
    const database = requiredString(datasource.database, `datasources.${key}.database`);
    const schema =
      datasource.schema === undefined
        ? undefined
        : requiredString(datasource.schema, `datasources.${key}.schema`);
    if (schema === database) {
      throw new Error(`datasources.${key}.schema must be omitted when it equals database`);
    }
    parsedDatasources[key] = {
      name: requiredString(datasource.name, `datasources.${key}.name`),
      database,
      requires_offline:
        datasource.requires_offline === undefined
          ? true
          : requiredBoolean(datasource.requires_offline, `datasources.${key}.requires_offline`),
      ...(schema ? { schema } : {}),
    };
  }
  if (Object.keys(parsedDatasources).length === 0) throw new Error("datasources must not be empty");
  const defaultDatasource = requiredString(defaults.datasource, "defaults.datasource");
  if (!parsedDatasources[defaultDatasource]) {
    throw new Error(`defaults.datasource is not configured: ${defaultDatasource}`);
  }

  return {
    schema_version: 2,
    url: normalizeRootUrl(top.url),
    auth: { cookie: auth.cookie.trim() },
    guard: { expected_tenant: requiredString(guard.expected_tenant, "guard.expected_tenant") },
    projects: {
      quality: requiredString(projects.quality, "projects.quality"),
      ...(projects.offline === undefined
        ? {}
        : { offline: requiredString(projects.offline, "projects.offline") }),
    },
    datasources: parsedDatasources,
    defaults: { datasource: defaultDatasource },
    safety: { allow_write: safety.allow_write },
    ...(automation === undefined ? {} : { automation }),
  };
}

function assertSecureConfigPath(name: string, root: string): string {
  const envDir = dataAssetsEnvDir(root);
  assertNoSymlinkPath(root, envDir, "environment directory");
  const path = dataAssetsEnvPath(name, root);
  assertContained(root, path);
  if (!existsSync(envDir)) throw new Error(`environment directory not found: ${envDir}`);
  assertNotSymlink(envDir, "environment directory");
  if (mode(envDir) !== ENV_DIR_MODE)
    throw new Error(`environment directory permissions must be 0700: ${envDir}`);
  if (!existsSync(path)) throw new Error(`environment not found: ${name}`);
  assertNotSymlink(path, "environment file");
  if (!lstatSync(path).isFile()) throw new Error(`environment path is not a regular file: ${path}`);
  if (mode(path) !== ENV_FILE_MODE)
    throw new Error(`environment file permissions must be 0600: ${path}`);
  if (isGitTracked(root, path))
    throw new Error(`environment file must not be tracked by Git: ${path}`);
  return path;
}

export function readDataAssetsEnvConfig(
  name: string,
  ctx?: DataAssetsEnvContext,
): DataAssetsEnvConfig {
  const root = rootFrom(ctx);
  const path = assertSecureConfigPath(name, root);
  return parseConfigText(readFileSync(path, "utf8"), path);
}

function atomicWrite(path: string, config: DataAssetsEnvConfig): void {
  const temp = join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    writeFileSync(temp, stringify(config, { lineWidth: 0 }), {
      encoding: "utf8",
      mode: ENV_FILE_MODE,
      flag: "wx",
    });
    chmodSync(temp, ENV_FILE_MODE);
    renameSync(temp, path);
    chmodSync(path, ENV_FILE_MODE);
  } finally {
    if (existsSync(temp)) unlinkSync(temp);
  }
}

export function addDataAssetsEnv(
  name: string,
  url: string,
  ctx?: DataAssetsEnvContext,
): { name: string; path: string; created: true } {
  const root = rootFrom(ctx);
  const normalized = assertDataAssetsEnvName(name);
  const envDir = ensureEnvDir(root);
  const path = dataAssetsEnvPath(normalized, root);
  assertContained(envDir, path);
  if (existsSync(path)) throw new Error(`environment already exists: ${normalized}`);
  const config: DataAssetsEnvConfig = {
    schema_version: 2,
    url: normalizeRootUrl(url),
    auth: { cookie: "" },
    guard: { expected_tenant: PLACEHOLDER },
    projects: { quality: PLACEHOLDER },
    datasources: { sparkthrift: { name: PLACEHOLDER, database: PLACEHOLDER } },
    defaults: { datasource: "sparkthrift" },
    safety: { allow_write: false },
  };
  atomicWrite(path, config);
  return { name: normalized, path, created: true };
}

export function listDataAssetsEnvs(
  ctx?: DataAssetsEnvContext,
): Array<{ name: string; url?: string; cookieConfigured: boolean; valid: boolean }> {
  const root = rootFrom(ctx);
  const envDir = dataAssetsEnvDir(root);
  if (!existsSync(envDir) || lstatSync(envDir).isSymbolicLink()) return [];
  return readdirSync(envDir)
    .filter((file) => file.endsWith(".yaml"))
    .sort()
    .map((file) => {
      const name = file.replace(/\.yaml$/, "");
      try {
        const config = readDataAssetsEnvConfig(name, { repoRoot: root });
        return { name, url: config.url, cookieConfigured: config.auth.cookie !== "", valid: true };
      } catch {
        return { name, cookieConfigured: false, valid: false };
      }
    });
}

export function showDataAssetsEnv(
  name: string,
  ctx?: DataAssetsEnvContext,
): Record<string, unknown> {
  const config = readDataAssetsEnvConfig(name, ctx);
  return {
    ...config,
    auth: { cookie: config.auth.cookie ? "<redacted>" : "" },
  };
}

function cookieMap(cookie: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const item of cookie.split(";")) {
    const separator = item.indexOf("=");
    if (separator <= 0) continue;
    const key = item.slice(0, separator).trim();
    const raw = item.slice(separator + 1).trim();
    try {
      out.set(key, decodeURIComponent(raw));
    } catch {
      out.set(key, raw);
    }
  }
  return out;
}

function numberFromCookie(cookies: Map<string, string>, key: string): number | undefined {
  const value = Number(cookies.get(key));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function assertTenant(config: DataAssetsEnvConfig): Map<string, string> {
  if (!config.auth.cookie) throw new Error("cookie_missing");
  const cookies = cookieMap(config.auth.cookie);
  const actual = cookies.get("dt_tenant_name");
  if (!actual) throw new Error("tenant_unverifiable: cookie does not contain dt_tenant_name");
  if (actual !== config.guard.expected_tenant) throw new Error("tenant_mismatch");
  return cookies;
}

export function assertDataAssetsTenantCookie(config: DataAssetsEnvConfig): void {
  assertTenant(config);
}

async function readLimitedPlatformResponse<T>(
  response: Response,
  path: string,
): Promise<ApiEnvelope<T>> {
  const declared = response.headers.get("content-length");
  if (declared !== null) {
    const declaredBytes = Number(declared);
    if (Number.isFinite(declaredBytes) && declaredBytes > MAX_PLATFORM_RESPONSE_BYTES) {
      throw new Error(`platform_response_too_large: ${path}`);
    }
  }

  const reader = response.body?.getReader();
  let bytes: Uint8Array;
  if (!reader) {
    bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_PLATFORM_RESPONSE_BYTES) {
      throw new Error(`platform_response_too_large: ${path}`);
    }
  } else {
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_PLATFORM_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new Error(`platform_response_too_large: ${path}`);
      }
      chunks.push(value);
    }
    bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as ApiEnvelope<T>;
  } catch {
    throw new Error(`invalid_platform_response: ${path}`);
  }
}

class PlatformApiFailure extends Error {
  readonly path: string;
  readonly code: number | undefined;
  readonly apiMessage: string | undefined;

  constructor(path: string, code: number | undefined, apiMessage: string | undefined) {
    super(`authentication_or_api_failure: ${path}`);
    this.name = "PlatformApiFailure";
    this.path = path;
    this.code = code;
    this.apiMessage = apiMessage;
  }
}

async function post<T>(
  config: DataAssetsEnvConfig,
  path: string,
  body: unknown,
  fetchImpl: typeof fetch,
  projectId?: number,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PLATFORM_REQUEST_TIMEOUT_MS);
  try {
    let response: Response;
    try {
      response = await fetchImpl(`${config.url}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json;charset=UTF-8",
          "Accept-Language": "zh-CN",
          cookie: config.auth.cookie,
          ...(projectId ? { "X-Project-Id": String(projectId) } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      if (controller.signal.aborted) {
        throw new Error(`platform_timeout: ${path}`);
      }
      throw new Error(`platform_unreachable: ${path}`);
    }

    if (!response.ok) {
      throw new Error(`authentication_or_http_failure: ${path} returned HTTP ${response.status}`);
    }

    let envelope: ApiEnvelope<T>;
    try {
      envelope = await readLimitedPlatformResponse<T>(response, path);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`platform_timeout: ${path}`);
      }
      throw error;
    }
    if (envelope.code !== 1 || envelope.data === undefined || envelope.data === null) {
      throw new PlatformApiFailure(path, envelope.code, envelope.message);
    }
    return envelope.data;
  } finally {
    clearTimeout(timeout);
  }
}

function projectName(project: NamedProject): string {
  return project.name ?? project.projectName ?? "";
}

function exactOne<T>(items: readonly T[], predicate: (item: T) => boolean, label: string): T {
  const matches = items.filter(predicate);
  if (matches.length === 0) throw new Error(`${label}_not_found`);
  if (matches.length > 1) throw new Error(`${label}_ambiguous`);
  return matches[0];
}

function requiredId(value: unknown, label: string): number {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) throw new Error(`${label}_missing_id`);
  return id;
}

const ASSETS_DATASOURCE_PAGE_QUERY_PATH = "/dassets/v1/dataSource/pageQuery";
const ASSETS_DATASOURCE_PAGE_QUERY_CLASS_LOADING_MARKER =
  "NoClassDefFoundError: com/dtstack/metadata/controller/data/DataSourceController$1";

function canUseMetadataDatasourceInventory(error: unknown): boolean {
  return (
    error instanceof PlatformApiFailure &&
    error.path === ASSETS_DATASOURCE_PAGE_QUERY_PATH &&
    error.code === 1011 &&
    error.apiMessage?.includes(ASSETS_DATASOURCE_PAGE_QUERY_CLASS_LOADING_MARKER) === true
  );
}

async function fetchInventory(
  config: DataAssetsEnvConfig,
  fetchImpl: typeof fetch,
): Promise<{
  qualityProjects: NamedProject[];
  offlineProjects: NamedProject[];
  assetsDatasources: AssetsDatasource[];
  metadataDatasources: MetadataDatasource[];
  assetsInventoryFallback: boolean;
}> {
  const [qualityProjects, offlineProjects, metadataDatasources] = await Promise.all([
    post<NamedProject[]>(config, "/dassets/v1/valid/project/getProjects", {}, fetchImpl),
    post<NamedProject[]>(config, "/api/rdos/common/project/getProjects", {}, fetchImpl),
    post<MetadataDatasource[]>(
      config,
      "/dmetadata/v1/dataSource/listMetadataDataSource",
      { type: 0 },
      fetchImpl,
    ),
  ]);
  let assetsDatasources: AssetsDatasource[];
  let assetsInventoryFallback = false;
  try {
    const assetsPage = await post<{
      contentList?: AssetsDatasource[];
      records?: AssetsDatasource[];
    }>(config, ASSETS_DATASOURCE_PAGE_QUERY_PATH, { current: 1, size: 500, search: "" }, fetchImpl);
    assetsDatasources = assetsPage.contentList ?? assetsPage.records ?? [];
  } catch (error) {
    if (!canUseMetadataDatasourceInventory(error)) throw error;
    assetsInventoryFallback = true;
    assetsDatasources = metadataDatasources.map((item) => ({
      id: item.dataSourceId,
      dataSourceName: item.dataSourceName,
      dataSourceType: item.dataSourceType,
    }));
  }
  return {
    qualityProjects,
    offlineProjects,
    assetsDatasources,
    metadataDatasources,
    assetsInventoryFallback,
  };
}

export async function resolveDataAssetsEnv(
  name: string,
  ctx?: DataAssetsEnvContext & { config?: DataAssetsEnvConfig },
): Promise<ResolvedDataAssetsEnv> {
  const normalized = assertDataAssetsEnvName(name);
  const config = ctx?.config ?? readDataAssetsEnvConfig(normalized, ctx);
  const cookies = assertTenant(config);
  const fetchImpl = ctx?.fetchImpl ?? fetch;
  const inventory = await fetchInventory(config, fetchImpl);
  const quality = exactOne(
    inventory.qualityProjects,
    (project) => projectName(project) === config.projects.quality,
    "quality_project",
  );
  const needsOfflineProject = Object.values(config.datasources).some(
    (datasource) => datasource.requires_offline !== false,
  );
  const offline =
    needsOfflineProject && config.projects.offline
      ? exactOne(
          inventory.offlineProjects,
          (project) => projectName(project) === config.projects.offline,
          "offline_project",
        )
      : undefined;
  const offlineId = offline ? requiredId(offline.id, "offline_project") : undefined;
  const batchDatasources = offlineId
    ? await post<BatchDatasource[]>(
        config,
        "/api/rdos/batch/batchDataSource/list",
        { projectId: offlineId, syncTask: true },
        fetchImpl,
        offlineId,
      )
    : [];

  const resolvedDatasources: ResolvedDataAssetsEnv["datasources"] = {};
  for (const [key, expected] of Object.entries(config.datasources)) {
    const assets = exactOne(
      inventory.assetsDatasources,
      (item) => (item.dataSourceName ?? item.name ?? "") === expected.name,
      `datasource_${key}_assets`,
    );
    const centerName = assets.dtCenterSourceName ?? expected.name;
    const batch = batchDatasources.find((item) => item.dataName === centerName);
    if (expected.requires_offline !== false && !batch) {
      exactOne(batchDatasources, (item) => item.dataName === centerName, `datasource_${key}_batch`);
    }
    const metadata = exactOne(
      inventory.metadataDatasources,
      (item) => item.dataSourceName === expected.name,
      `datasource_${key}_metadata`,
    );
    resolvedDatasources[key] = {
      name: expected.name,
      ...(batch
        ? {
            batch: {
              id: requiredId(batch.id, `datasource_${key}_batch`),
              name: requiredString(batch.dataName, `datasource_${key}_batch.name`),
              typeId: requiredId(
                batch.dataSourceType ?? batch.type,
                `datasource_${key}_batch_type`,
              ),
            },
          }
        : {}),
      metadata: {
        id: requiredId(metadata.dataSourceId, `datasource_${key}_metadata`),
        name: requiredString(metadata.dataSourceName, `datasource_${key}_metadata.name`),
        typeId: requiredId(metadata.dataSourceType, `datasource_${key}_metadata_type`),
      },
      assets: {
        id: requiredId(assets.id, `datasource_${key}_assets`),
        name: requiredString(assets.dataSourceName ?? assets.name, `datasource_${key}_assets.name`),
        typeId: requiredId(
          assets.dataSourceType ?? metadata.dataSourceType,
          `datasource_${key}_assets_type`,
        ),
      },
      database: expected.database,
      schema: expected.schema ?? expected.database,
      requiresOffline: expected.requires_offline !== false,
    };
  }

  return {
    schemaVersion: 2,
    env: normalized,
    urls: {
      baseUrl: config.url,
      dataAssetsBaseUrl: `${config.url}/dataAssets`,
      offlineBaseUrl: `${config.url}/batch`,
      portalBaseUrl: `${config.url}/portal`,
    },
    tenant: {
      name: config.guard.expected_tenant,
      id: numberFromCookie(cookies, "dt_tenant_id"),
      userId: numberFromCookie(cookies, "dt_user_id"),
      username: cookies.get("dt_username"),
    },
    projects: {
      quality: { id: requiredId(quality.id, "quality_project"), name: config.projects.quality },
      ...(offlineId && config.projects.offline
        ? { offline: { id: offlineId, name: config.projects.offline } }
        : {}),
    },
    datasources: resolvedDatasources,
    defaults: config.defaults,
    safety: { allowWrite: config.safety.allow_write },
    ...(config.automation === undefined ? {} : { automation: config.automation }),
    ...(inventory.assetsInventoryFallback
      ? { warnings: ["assets_datasource_inventory_fallback"] }
      : {}),
  };
}

export async function discoverDataAssetsEnv(
  name: string,
  ctx?: DataAssetsEnvContext & { cookie?: string },
): Promise<Record<string, unknown>> {
  const stored = readDataAssetsEnvConfig(name, ctx);
  const config =
    ctx?.cookie === undefined
      ? stored
      : { ...stored, auth: { cookie: normalizeCookieInput(ctx.cookie) } };
  assertTenant(config);
  const fetchImpl = ctx?.fetchImpl ?? fetch;
  const inventory = await fetchInventory(config, fetchImpl);
  const needsOfflineProject = Object.values(config.datasources).some(
    (datasource) => datasource.requires_offline !== false,
  );
  const offline =
    needsOfflineProject && config.projects.offline
      ? exactOne(
          inventory.offlineProjects,
          (project) => projectName(project) === config.projects.offline,
          "offline_project",
        )
      : undefined;
  const offlineId = offline ? requiredId(offline.id, "offline_project") : undefined;
  const batch = offlineId
    ? await post<BatchDatasource[]>(
        config,
        "/api/rdos/batch/batchDataSource/list",
        { projectId: offlineId, syncTask: true },
        fetchImpl,
        offlineId,
      )
    : [];
  return {
    name: assertDataAssetsEnvName(name),
    tenant: config.guard.expected_tenant,
    qualityProjects: inventory.qualityProjects.map((item) => ({
      id: item.id,
      name: projectName(item),
    })),
    offlineProjects: inventory.offlineProjects.map((item) => ({
      id: item.id,
      name: projectName(item),
      alias: item.projectAlias,
    })),
    assetsDatasources: inventory.assetsDatasources.map((item) => ({
      id: item.id,
      name: item.dataSourceName ?? item.name,
      centerName: item.dtCenterSourceName,
      typeId: item.dataSourceType,
    })),
    metadataDatasources: inventory.metadataDatasources.map((item) => ({
      id: item.dataSourceId,
      name: item.dataSourceName,
      typeId: item.dataSourceType,
    })),
    batchDatasources: batch.map((item) => ({
      id: item.id,
      name: item.dataName,
      typeId: item.dataSourceType ?? item.type,
    })),
    ...(inventory.assetsInventoryFallback
      ? { warnings: ["assets_datasource_inventory_fallback"] }
      : {}),
  };
}

export async function diagnoseDataAssetsEnv(
  name: string,
  options?: DataAssetsEnvContext & { offline?: boolean },
): Promise<{ name: string; ok: boolean; online: boolean; findings: EnvFinding[] }> {
  const root = rootFrom(options);
  const normalized = assertDataAssetsEnvName(name);
  const path = dataAssetsEnvPath(normalized, root);
  const dir = dataAssetsEnvDir(root);
  const findings: EnvFinding[] = [];
  if (!existsSync(dir))
    findings.push({ code: "env_directory_missing", severity: "error", path: dir });
  else if (lstatSync(dir).isSymbolicLink())
    findings.push({ code: "env_directory_symlink", severity: "error", path: dir });
  else if (mode(dir) !== ENV_DIR_MODE)
    findings.push({ code: "env_directory_permissions", severity: "error", path: dir });
  if (!existsSync(path)) findings.push({ code: "env_file_missing", severity: "error", path });
  else if (lstatSync(path).isSymbolicLink())
    findings.push({ code: "env_file_symlink", severity: "error", path });
  else {
    if (mode(path) !== ENV_FILE_MODE)
      findings.push({ code: "env_file_permissions", severity: "error", path });
    if (isGitTracked(root, path))
      findings.push({ code: "env_file_tracked", severity: "error", path });
  }

  let config: DataAssetsEnvConfig | undefined;
  if (findings.every((item) => !item.code.endsWith("missing") && !item.code.endsWith("symlink"))) {
    try {
      config = parseConfigText(readFileSync(path, "utf8"), path);
      if (config.url.startsWith("http://")) {
        findings.push({
          code: "insecure_http_transport",
          severity: "warn",
          path: `${path}#url`,
        });
      }
      if (!config.auth.cookie)
        findings.push({ code: "cookie_missing", severity: "error", path: `${path}#auth.cookie` });
      if (
        JSON.stringify({
          guard: config.guard,
          projects: config.projects,
          datasources: config.datasources,
        }).includes(PLACEHOLDER)
      ) {
        findings.push({ code: "placeholder_value", severity: "error", path });
      }
    } catch {
      findings.push({ code: "schema_invalid", severity: "error", path });
    }
  }
  if (!options?.offline && config && findings.every((item) => item.severity !== "error")) {
    try {
      const resolved = await resolveDataAssetsEnv(normalized, { ...options, config });
      for (const warning of resolved.warnings ?? []) {
        findings.push({ code: warning, severity: "warn", path: `${path}#datasources` });
      }
    } catch (error) {
      findings.push({
        code: error instanceof Error ? error.message.split(":", 1)[0] : "online_validation_failed",
        severity: "error",
        path,
      });
    }
  }
  return {
    name: normalized,
    ok: findings.every((item) => item.severity !== "error"),
    online: options?.offline !== true,
    findings,
  };
}

export async function setDataAssetsCookie(
  name: string,
  cookie: string,
  ctx?: DataAssetsEnvContext,
): Promise<{ name: string; configured: true; verified: true }> {
  const normalized = assertDataAssetsEnvName(name);
  const cleanCookie = normalizeCookieInput(cookie);
  const root = rootFrom(ctx);
  const current = readDataAssetsEnvConfig(normalized, { repoRoot: root });
  const candidate: DataAssetsEnvConfig = { ...current, auth: { cookie: cleanCookie } };
  await resolveDataAssetsEnv(normalized, { ...ctx, repoRoot: root, config: candidate });
  atomicWrite(dataAssetsEnvPath(normalized, root), candidate);
  return { name: normalized, configured: true, verified: true };
}

function normalizeCookieInput(cookie: string): string {
  const cleanCookie = cookie.trim();
  if (!cleanCookie || cleanCookie.includes("\n") || cleanCookie.includes("\r")) {
    throw new Error("stdin must contain one non-empty Cookie header line");
  }
  return cleanCookie;
}

function nested(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function legacyString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function legacyToV2(raw: Record<string, unknown>, cookie: string): DataAssetsEnvConfig {
  const urls = nested(raw.urls);
  const auth = nested(raw.auth);
  const projects = nested(raw.projects);
  const quality = nested(projects.quality);
  const offline = nested(projects.offline);
  const runtime = nested(raw.runtime);
  const datasources: DataAssetsEnvConfig["datasources"] = {};
  for (const [key, value] of Object.entries(nested(raw.datasources))) {
    const source = nested(value);
    const assets = nested(source.assets);
    const metadata = nested(source.metadata);
    const batch = nested(source.batch);
    const sql = nested(source.sql);
    const database = legacyString(sql.database) || legacyString(batch.database);
    const schema = legacyString(sql.schema) || legacyString(batch.schema);
    datasources[key] = {
      name: legacyString(assets.name) || legacyString(metadata.name) || legacyString(batch.name),
      database,
      ...(schema && schema !== database ? { schema } : {}),
    };
  }
  return parseConfigText(
    stringify({
      schema_version: 2,
      url: legacyString(urls.base_url) || legacyString(raw.base_url),
      auth: { cookie: cookie || legacyString(auth.cookie) },
      guard: { expected_tenant: legacyString(auth.tenant_name) || legacyString(raw.tenant_name) },
      projects: {
        quality: legacyString(quality.name),
        ...(legacyString(offline.name) ? { offline: legacyString(offline.name) } : {}),
      },
      datasources,
      defaults: { datasource: legacyString(runtime.default_datasource) },
      safety: { allow_write: runtime.allow_write === true },
    }),
    "legacy profile",
  );
}

function readYamlRecord(path: string): Record<string, unknown> {
  if (lstatSync(path).isSymbolicLink()) {
    throw new Error(`legacy environment file must not be a symbolic link: ${path}`);
  }
  try {
    return record(parse(readFileSync(path, "utf8")), path);
  } catch {
    throw new Error(`invalid legacy environment YAML: ${path}`);
  }
}

function readLegacyCookie(
  root: string,
  name: string,
  base: Record<string, unknown>,
): { cookie: string; source?: string } {
  const localPath = join(
    root,
    "workspace",
    "dataAssets",
    "_shared",
    "env",
    ".local",
    `${name}.yaml`,
  );
  if (!existsSync(localPath)) return { cookie: legacyString(nested(base.auth).cookie) };
  assertNotSymlink(localPath, "legacy cookie file");
  if (mode(localPath) !== ENV_FILE_MODE)
    throw new Error(`legacy cookie file permissions must be 0600: ${localPath}`);
  return { cookie: legacyString(nested(readYamlRecord(localPath).auth).cookie), source: localPath };
}

export async function migrateDataAssetsEnvs(
  options?: DataAssetsEnvContext & { apply?: boolean },
): Promise<{
  applied: boolean;
  ok: boolean;
  profiles: Array<{ name: string; cookieConfigured: boolean; cookiePreserved: boolean }>;
  removedLegacyCookieFiles: string[];
  retainedLegacyCookieFiles: string[];
}> {
  const root = rootFrom(options);
  const legacyDir = join(root, "workspace", "dataAssets", "_shared", "env");
  assertNoSymlinkPath(root, legacyDir, "legacy DataAssets environment directory");
  if (!existsSync(legacyDir))
    throw new Error(`legacy DataAssets environment directory not found: ${legacyDir}`);
  const migrated: Array<{
    name: string;
    config: DataAssetsEnvConfig;
    cookieSource?: string;
    cookieHash: string;
  }> = [];
  for (const file of readdirSync(legacyDir)
    .filter((item) => item.endsWith(".yaml"))
    .sort()) {
    const name = assertDataAssetsEnvName(file.replace(/\.yaml$/, ""));
    const legacyPath = join(legacyDir, file);
    assertNoSymlinkPath(root, legacyPath, "legacy DataAssets environment file");
    const base = readYamlRecord(legacyPath);
    const { cookie, source } = readLegacyCookie(root, name, base);
    migrated.push({
      name,
      config: legacyToV2(base, cookie),
      cookieSource: source,
      cookieHash: createHash("sha256").update(cookie).digest("hex"),
    });
  }
  if (migrated.length === 0) throw new Error("no legacy DataAssets environments found");
  if (options?.apply) {
    ensureEnvDir(root);
    for (const item of migrated) atomicWrite(dataAssetsEnvPath(item.name, root), item.config);
  }

  const removedLegacyCookieFiles: string[] = [];
  const retainedLegacyCookieFiles: string[] = [];
  const profiles: Array<{ name: string; cookieConfigured: boolean; cookiePreserved: boolean }> = [];
  for (const item of migrated) {
    let cookiePreserved = true;
    if (options?.apply) {
      const written = readDataAssetsEnvConfig(item.name, { repoRoot: root });
      cookiePreserved =
        createHash("sha256").update(written.auth.cookie).digest("hex") === item.cookieHash;
      if (!cookiePreserved) throw new Error(`cookie hash verification failed for ${item.name}`);
      if (item.cookieSource && item.config.auth.cookie) {
        try {
          await resolveDataAssetsEnv(item.name, { ...options, repoRoot: root, config: written });
          unlinkSync(item.cookieSource);
          removedLegacyCookieFiles.push(item.cookieSource);
        } catch {
          retainedLegacyCookieFiles.push(item.cookieSource);
        }
      }
    } else if (item.cookieSource) {
      retainedLegacyCookieFiles.push(item.cookieSource);
    }
    profiles.push({
      name: item.name,
      cookieConfigured: item.config.auth.cookie !== "",
      cookiePreserved,
    });
  }
  return {
    applied: options?.apply === true,
    ok: options?.apply !== true || retainedLegacyCookieFiles.length === 0,
    profiles,
    removedLegacyCookieFiles,
    retainedLegacyCookieFiles,
  };
}

function selectDataAssetsChildBaseEnv(
  base: NodeJS.ProcessEnv,
  inheritEnv: readonly string[],
): NodeJS.ProcessEnv {
  const selected: NodeJS.ProcessEnv = {};
  const names = new Set<string>([...SAFE_CHILD_ENV_KEYS, ...inheritEnv]);
  for (const name of names) {
    if (!ENV_KEY_RE.test(name)) {
      throw new Error(`invalid inherited environment variable: ${name}`);
    }
    const value = base[name];
    if (value !== undefined) selected[name] = value;
  }
  return selected;
}

export function buildDataAssetsChildEnv(
  name: string,
  resolved: ResolvedDataAssetsEnv,
  ctx?: DataAssetsEnvContext,
  base: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const root = rootFrom(ctx);
  return {
    ...selectDataAssetsChildBaseEnv(base, ctx?.inheritEnv ?? []),
    [DATAASSETS_CONFIG_ENV]: dataAssetsEnvPath(name, root),
    [DATAASSETS_RESOLVED_ENV]: JSON.stringify(resolved),
    KATA_ACTIVE_PROJECT: "dataAssets",
  };
}

export async function runDataAssetsCommand(
  name: string,
  command: readonly string[],
  ctx?: DataAssetsEnvContext,
): Promise<number> {
  if (command.length === 0) throw new Error("kata env run requires a command after --");
  const normalized = assertDataAssetsEnvName(name);
  const resolved = await resolveDataAssetsEnv(normalized, ctx);
  const child = spawn(command[0], command.slice(1), {
    cwd: process.cwd(),
    env: buildDataAssetsChildEnv(normalized, resolved, ctx),
    stdio: "inherit",
  });
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGHUP"];
  const handlers = new Map<NodeJS.Signals, () => void>();
  for (const signal of signals) {
    const handler = (): void => {
      if (!child.killed) child.kill(signal);
    };
    handlers.set(signal, handler);
    process.on(signal, handler);
  }
  try {
    return await new Promise<number>((resolveExit, reject) => {
      child.once("error", () => reject(new Error(`failed to start command: ${command[0]}`)));
      child.once("exit", (code, signal) =>
        resolveExit(code ?? (signal ? 128 + (osConstants.signals[signal] ?? 1) : 1)),
      );
    });
  } finally {
    for (const [signal, handler] of handlers) process.off(signal, handler);
  }
}
