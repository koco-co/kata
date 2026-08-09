import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { constants as osConstants } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { parse, stringify } from "yaml";
import {
  effectivePrivatePath,
  environmentsDir,
  privateFileRepoRoot,
  privateInstanceFiles,
} from "./config-paths.ts";
import { parseCookieHeader } from "./cookie-header.ts";
import { assertNoSymlinkPath } from "./features-layout.ts";
import { repoRoot as defaultRepoRoot, validateProjectName } from "./workspace-locator.ts";

export const ACTIVE_ENV_RESOLVED_ENV = "KATA_ACTIVE_ENV_RESOLVED";
export const ACTIVE_ENV_CONFIG_ENV = "KATA_ACTIVE_ENV_CONFIG";

/** Environment variable carrying versioned, non-secret platform context JSON. */
export const AUTOMATION_PLATFORM_CONTEXT_ENV = "AUTOMATION_PLATFORM_CONTEXT";

/** Environment variable carrying the platform Cookie header for one controlled child. */
export const AUTOMATION_AUTH_COOKIE_ENV = "AUTOMATION_AUTH_COOKIE";

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

export interface PlatformEnvConfig {
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

export interface ResolvedPlatformEnv {
  readonly schemaVersion: 2;
  readonly env: string;
  readonly urls: {
    readonly baseUrl: string;
    readonly assetsBaseUrl: string;
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
  /** Non-fatal platform compatibility diagnostics collected during resolution. */
  readonly warnings?: readonly string[];
}

export interface EnvFinding {
  readonly code: string;
  readonly severity: "error" | "warn";
  readonly path: string;
}

export interface PlatformEnvContext {
  readonly repoRoot?: string;
  readonly fetchImpl?: typeof fetch;
  readonly inheritEnv?: readonly string[];
  /** Explicit workspace project for commands that need project-scoped discovery. */
  readonly project?: string;
}

/** Dependencies used to resolve platform context for an automation executor child. */
export interface AutomationExecutorEnvContext {
  readonly repoRoot?: string;
  readonly fetchImpl?: typeof fetch;
  readonly config?: PlatformEnvConfig;
}

/** The complete environment overlay permitted for an automation executor child. */
export type AutomationExecutorEnvOverlay = Readonly<{
  [AUTOMATION_PLATFORM_CONTEXT_ENV]: string;
  [AUTOMATION_AUTH_COOKIE_ENV]: string;
}>;

function rootFrom(ctx?: PlatformEnvContext): string {
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

export function assertPlatformEnvName(name: string): string {
  const normalized = name
    .trim()
    .replace(/\.ya?ml$/i, "")
    .toLowerCase();
  if (!ENV_NAME_RE.test(normalized)) {
    throw new Error("invalid environment name: use lowercase letters, numbers, and hyphens only");
  }
  return normalized;
}

export function platformEnvDir(root = defaultRepoRoot()): string {
  return environmentsDir(root);
}

export function platformEnvPath(name: string, root = defaultRepoRoot()): string {
  return join(platformEnvDir(root), `${assertPlatformEnvName(name)}.yaml`);
}

export function effectivePlatformEnvPath(name: string, root: string): string {
  return effectivePrivatePath(`environments/${assertPlatformEnvName(name)}.yaml`, root);
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
  const envDir = platformEnvDir(root);
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

function parseConfigText(text: string, path: string): PlatformEnvConfig {
  let raw: unknown;
  try {
    raw = parse(text);
  } catch {
    throw new Error(`invalid environment YAML: ${path}`);
  }
  const top = record(raw, "environment");
  exactKeys(
    top,
    ["schema_version", "url", "auth", "guard", "projects", "datasources", "defaults", "safety"],
    "environment",
  );
  if (top.schema_version !== 2) throw new Error("schema_version must be 2");

  const auth = record(top.auth, "auth");
  const guard = record(top.guard, "guard");
  const projects = record(top.projects, "projects");
  const datasources = record(top.datasources, "datasources");
  const defaults = record(top.defaults, "defaults");
  const safety = record(top.safety, "safety");
  exactKeys(auth, ["cookie"], "auth");
  exactKeys(guard, ["expected_tenant"], "guard");
  exactKeys(projects, ["quality", "offline"], "projects");
  exactKeys(defaults, ["datasource"], "defaults");
  exactKeys(safety, ["allow_write"], "safety");
  if (typeof auth.cookie !== "string") throw new Error("auth.cookie must be a string");
  if (auth.cookie !== "") parseCookieHeader(auth.cookie);
  if (typeof safety.allow_write !== "boolean")
    throw new Error("safety.allow_write must be boolean");

  const parsedDatasources: PlatformEnvConfig["datasources"] = {};
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
    auth: { cookie: auth.cookie },
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
  };
}

function assertSecureConfigPath(name: string, root: string): string {
  const envDir = platformEnvDir(root);
  assertNoSymlinkPath(root, envDir, "environment directory");
  const path = platformEnvPath(name, root);
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

export function readPlatformEnvConfig(name: string, ctx?: PlatformEnvContext): PlatformEnvConfig {
  const requestedRoot = rootFrom(ctx);
  const effectivePath = effectivePlatformEnvPath(name, requestedRoot);
  const ownerRoot = privateFileRepoRoot(effectivePath, requestedRoot);
  const path = assertSecureConfigPath(name, ownerRoot);
  return parseConfigText(readFileSync(path, "utf8"), path);
}

function atomicWrite(path: string, config: PlatformEnvConfig): void {
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

export function addPlatformEnv(
  name: string,
  url: string,
  ctx?: PlatformEnvContext,
): { name: string; path: string; created: true } {
  const root = rootFrom(ctx);
  const normalized = assertPlatformEnvName(name);
  const existing = effectivePlatformEnvPath(normalized, root);
  if (existsSync(existing)) throw new Error(`environment already exists: ${normalized}`);
  const envDir = ensureEnvDir(root);
  const path = platformEnvPath(normalized, root);
  assertContained(envDir, path);
  const config: PlatformEnvConfig = {
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

export function listPlatformEnvs(
  ctx?: PlatformEnvContext,
): Array<{ name: string; url?: string; cookieConfigured: boolean; valid: boolean }> {
  const root = rootFrom(ctx);
  return privateInstanceFiles("environments", root)
    .map((path) => basename(path, ".yaml"))
    .map((name) => {
      try {
        const config = readPlatformEnvConfig(name, { repoRoot: root });
        return { name, url: config.url, cookieConfigured: config.auth.cookie !== "", valid: true };
      } catch {
        return { name, cookieConfigured: false, valid: false };
      }
    });
}

export function showPlatformEnv(name: string, ctx?: PlatformEnvContext): Record<string, unknown> {
  const config = readPlatformEnvConfig(name, ctx);
  return {
    ...config,
    auth: { cookie: config.auth.cookie ? "<redacted>" : "" },
  };
}

function cookieMap(cookie: string): Map<string, string> {
  return new Map(parseCookieHeader(cookie).map(({ name, value }) => [name, value]));
}

function numberFromCookie(cookies: Map<string, string>, key: string): number | undefined {
  const value = Number(cookies.get(key));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function assertTenant(config: PlatformEnvConfig): Map<string, string> {
  if (!config.auth.cookie) throw new Error("cookie_missing");
  const cookies = cookieMap(config.auth.cookie);
  const actual = cookies.get("dt_tenant_name");
  if (!actual) throw new Error("tenant_unverifiable: cookie does not contain dt_tenant_name");
  if (actual !== config.guard.expected_tenant) throw new Error("tenant_mismatch");
  return cookies;
}

export function assertPlatformEnvTenantCookie(config: PlatformEnvConfig): void {
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
  config: PlatformEnvConfig,
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
  config: PlatformEnvConfig,
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

export async function resolvePlatformEnv(
  name: string,
  ctx?: PlatformEnvContext & { config?: PlatformEnvConfig },
): Promise<ResolvedPlatformEnv> {
  const normalized = assertPlatformEnvName(name);
  const config = ctx?.config ?? readPlatformEnvConfig(normalized, ctx);
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

  const resolvedDatasources: ResolvedPlatformEnv["datasources"] = {};
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
      assetsBaseUrl: `${config.url}/dataAssets`,
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
    ...(inventory.assetsInventoryFallback
      ? { warnings: ["assets_datasource_inventory_fallback"] }
      : {}),
  };
}

export async function discoverPlatformEnv(
  name: string,
  ctx?: PlatformEnvContext & { cookie?: string },
): Promise<Record<string, unknown>> {
  const stored = readPlatformEnvConfig(name, ctx);
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
    name: assertPlatformEnvName(name),
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

export async function diagnosePlatformEnv(
  name: string,
  options?: PlatformEnvContext & { offline?: boolean },
): Promise<{ name: string; ok: boolean; online: boolean; findings: EnvFinding[] }> {
  const root = rootFrom(options);
  const normalized = assertPlatformEnvName(name);
  const path = effectivePlatformEnvPath(normalized, root);
  const ownerRoot = privateFileRepoRoot(path, root);
  const dir = dirname(path);
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
    if (isGitTracked(ownerRoot, path))
      findings.push({ code: "env_file_tracked", severity: "error", path });
  }

  let config: PlatformEnvConfig | undefined;
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
      const resolved = await resolvePlatformEnv(normalized, { ...options, config });
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

export async function setPlatformEnvCookie(
  name: string,
  cookie: string,
  ctx?: PlatformEnvContext,
): Promise<{ name: string; configured: true; verified: true }> {
  const normalized = assertPlatformEnvName(name);
  const cleanCookie = normalizeCookieInput(cookie);
  const root = rootFrom(ctx);
  const current = readPlatformEnvConfig(normalized, { repoRoot: root });
  const candidate: PlatformEnvConfig = { ...current, auth: { cookie: cleanCookie } };
  await resolvePlatformEnv(normalized, { ...ctx, repoRoot: root, config: candidate });
  const envDir = ensureEnvDir(root);
  const path = platformEnvPath(normalized, root);
  assertContained(envDir, path);
  atomicWrite(path, candidate);
  return { name: normalized, configured: true, verified: true };
}

function normalizeCookieInput(cookie: string): string {
  parseCookieHeader(cookie);
  return cookie;
}

function selectPlatformEnvChildBaseEnv(
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

function normalizeChildProject(project: string | undefined): string | undefined {
  if (project === undefined) return undefined;
  const normalized = project.trim();
  validateProjectName(normalized);
  return normalized;
}

function executorError(error: unknown, cookie: string): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(cookie === "" ? message : message.replaceAll(cookie, "<redacted>"));
}

/**
 * Resolves one private platform environment into an ephemeral executor-only overlay.
 * The returned platform context is versioned and non-secret; the Cookie header remains isolated.
 */
export async function resolveAutomationExecutorEnv(
  name: string,
  ctx?: AutomationExecutorEnvContext,
): Promise<AutomationExecutorEnvOverlay> {
  const normalized = assertPlatformEnvName(name);
  const config = ctx?.config ?? readPlatformEnvConfig(normalized, ctx);
  try {
    const resolved = await resolvePlatformEnv(normalized, { ...ctx, config });
    return {
      [AUTOMATION_PLATFORM_CONTEXT_ENV]: JSON.stringify(resolved),
      [AUTOMATION_AUTH_COOKIE_ENV]: config.auth.cookie,
    };
  } catch (error) {
    throw executorError(error, config.auth.cookie);
  }
}

export function buildPlatformEnvChildEnv(
  name: string,
  resolved: ResolvedPlatformEnv,
  ctx?: PlatformEnvContext,
  base: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const root = rootFrom(ctx);
  const project = normalizeChildProject(ctx?.project);
  return {
    ...selectPlatformEnvChildBaseEnv(base, ctx?.inheritEnv ?? []),
    [ACTIVE_ENV_CONFIG_ENV]: effectivePlatformEnvPath(name, root),
    [ACTIVE_ENV_RESOLVED_ENV]: JSON.stringify(resolved),
    ...(project === undefined ? {} : { KATA_ACTIVE_PROJECT: project }),
  };
}

export async function runPlatformEnvCommand(
  name: string,
  command: readonly string[],
  ctx?: PlatformEnvContext,
): Promise<number> {
  if (command.length === 0) throw new Error("kata env run requires a command after --");
  const normalized = assertPlatformEnvName(name);
  const resolved = await resolvePlatformEnv(normalized, ctx);
  const child = spawn(command[0], command.slice(1), {
    cwd: process.cwd(),
    env: buildPlatformEnvChildEnv(normalized, resolved, ctx),
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
