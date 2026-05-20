import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse } from "yaml";

export type RuntimeEnv = Record<string, string | undefined>;

export interface DataAssetsDatasourceProfile {
  readonly enabled: boolean;
  readonly uiLabel: string;
  readonly preconditionType: "SparkThrift" | "Doris" | string;
  readonly aliases: readonly string[];
  readonly batch: {
    readonly id: number;
    readonly name: string;
    readonly typeId: number;
    readonly database: string;
    readonly schema: string;
    readonly clusterName?: string;
  };
  readonly metadata: { readonly id: number; readonly name: string; readonly typeId: number };
  readonly assets: { readonly id: number; readonly name: string };
  readonly ui?: { readonly sourceTypeId?: number };
  readonly sql: { readonly database: string; readonly schema: string; readonly warehouseUri?: string };
}

export interface DataAssetsRuntimeOptions {
  readonly defaultDatasource: string;
  readonly activeDatasources: readonly string[];
  readonly tablePrefix: string;
  readonly skipPreconditions: boolean;
  readonly cleanup: boolean;
  readonly allowWrite?: boolean;
  readonly timeouts: {
    readonly projectApiMs: number;
    readonly preconditionRequestMs: number;
    readonly metadataSyncMs: number;
  };
  readonly playwright: {
    readonly headless: boolean;
    readonly workers: number;
    readonly fullyParallel: boolean;
    readonly stepCapture: string;
  };
}

export interface DataAssetsEnvProfile {
  readonly schemaVersion: 1;
  readonly project: "dataAssets";
  readonly env: string;
  readonly urls: {
    readonly baseUrl: string;
    readonly dataAssetsBaseUrl: string;
    readonly offlineBaseUrl: string;
    readonly portalBaseUrl?: string;
  };
  readonly auth: {
    readonly sessionPath: string;
    readonly tenantId?: number;
    readonly tenantName?: string;
    readonly userId?: number;
    readonly username?: string;
  };
  readonly projects: {
    readonly quality: { readonly id: number; readonly name: string };
    readonly offline: { readonly id: number; readonly name: string };
    readonly owner?: { readonly id: number };
    readonly engines: readonly string[];
  };
  readonly datasources: Record<string, DataAssetsDatasourceProfile>;
  readonly runtime: DataAssetsRuntimeOptions;
}

export interface LoadDataAssetsProfileOptions {
  readonly repoRoot?: string;
  readonly workspaceRoot?: string;
}

const DEFAULT_ENV = "ltqc-local";
const ENV_ALIASES: Record<string, string> = {
  customltem: "ltqc-test",
  ltqc: "ltqc-local",
  prod: "ltqc-prod",
};

function normalizeEnvName(envName: string): string {
  const trimmed = envName.trim();
  const withoutExtension = trimmed.replace(/\.ya?ml$/i, "");
  return ENV_ALIASES[withoutExtension.toLowerCase()] ?? withoutExtension;
}

function camelKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase());
}

function camelize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelize);
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) out[camelKey(key)] = camelize(nested);
  return out;
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${path} is required`);
  return value;
}

function requiredNumber(value: unknown, path: string): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) throw new Error(`${path} is required`);
  return num;
}

function readDotEnvFile(path: string): RuntimeEnv {
  if (!existsSync(path)) return {};
  const out: RuntimeEnv = {};
  for (const line of readFileSync(path, "utf8").split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    out[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return out;
}

function parseSessionFacts(sessionPath: string): Partial<DataAssetsEnvProfile["auth"]> {
  if (!existsSync(sessionPath)) return {};
  const raw = JSON.parse(readFileSync(sessionPath, "utf8")) as {
    cookies?: Array<{ name?: string; value?: string }>;
  };
  const cookies = new Map((raw.cookies ?? []).map((cookie) => [cookie.name ?? "", cookie.value ?? ""]));
  return {
    tenantId: cookies.get("dt_tenant_id") ? Number(cookies.get("dt_tenant_id")) : undefined,
    tenantName: cookies.get("dt_tenant_name") || undefined,
    userId: cookies.get("dt_user_id") ? Number(cookies.get("dt_user_id")) : undefined,
    username: cookies.get("dt_username") || undefined,
  };
}

function workspaceRoot(opts?: LoadDataAssetsProfileOptions): string {
  return opts?.workspaceRoot ?? join(process.cwd(), "workspace", "dataAssets");
}

function repoRoot(opts?: LoadDataAssetsProfileOptions): string {
  return opts?.repoRoot ?? process.cwd();
}

function resolveProfilePath(path: string, opts?: LoadDataAssetsProfileOptions): string {
  if (path.startsWith("/")) return path;
  if (path.startsWith(".auth/") || path.startsWith(".kata/") || path.startsWith("workspace/")) {
    return resolve(repoRoot(opts), path);
  }
  return resolve(workspaceRoot(opts), path);
}

export function resolveDataAssetsEnvName(env: RuntimeEnv = process.env): string {
  const rawEnvName = env.KATA_DATAASSETS_ENV ?? env.ACTIVE_ENV ?? DEFAULT_ENV;
  return normalizeEnvName(rawEnvName);
}

export function loadDataAssetsEnvProfile(
  envName = resolveDataAssetsEnvName(),
  opts?: LoadDataAssetsProfileOptions,
): DataAssetsEnvProfile {
  const root = workspaceRoot(opts);
  const normalizedEnvName = normalizeEnvName(envName);
  const profilePath = join(root, "_shared", "env", `${normalizedEnvName}.yaml`);
  if (!existsSync(profilePath)) throw new Error(`dataAssets env profile not found: ${profilePath}`);
  const localEnv = readDotEnvFile(join(root, ".env.local"));
  const parsed = camelize(parse(readFileSync(profilePath, "utf8"))) as any;
  const baseUrl = localEnv.KATA_DATAASSETS_BASE_URL ?? requiredString(parsed.urls?.baseUrl, "urls.base_url");
  const sessionRel = localEnv.KATA_DATAASSETS_SESSION_PATH ?? requiredString(parsed.auth?.sessionPath, "auth.session_path");
  const sessionPath = resolveProfilePath(sessionRel, opts);
  const sessionFacts = parseSessionFacts(sessionPath);
  const profile: DataAssetsEnvProfile = {
    schemaVersion: 1,
    project: "dataAssets",
    env: requiredString(parsed.env, "env"),
    urls: {
      baseUrl,
      dataAssetsBaseUrl: localEnv.KATA_DATAASSETS_DATA_ASSETS_BASE_URL ?? requiredString(parsed.urls?.dataAssetsBaseUrl, "urls.data_assets_base_url"),
      offlineBaseUrl: localEnv.KATA_DATAASSETS_OFFLINE_BASE_URL ?? requiredString(parsed.urls?.offlineBaseUrl, "urls.offline_base_url"),
      portalBaseUrl: localEnv.KATA_DATAASSETS_PORTAL_BASE_URL ?? parsed.urls?.portalBaseUrl,
    },
    auth: {
      sessionPath,
      tenantId: sessionFacts.tenantId ?? parsed.auth?.tenantId,
      tenantName: sessionFacts.tenantName ?? parsed.auth?.tenantName,
      userId: sessionFacts.userId ?? parsed.auth?.userId,
      username: sessionFacts.username ?? parsed.auth?.username,
    },
    projects: {
      quality: {
        id: requiredNumber(parsed.projects?.quality?.id, "projects.quality.id"),
        name: requiredString(parsed.projects?.quality?.name, "projects.quality.name"),
      },
      offline: {
        id: requiredNumber(parsed.projects?.offline?.id, "projects.offline.id"),
        name: requiredString(parsed.projects?.offline?.name, "projects.offline.name"),
      },
      owner: parsed.projects?.owner?.id ? { id: Number(parsed.projects.owner.id) } : undefined,
      engines: Array.isArray(parsed.projects?.engines) ? parsed.projects.engines : [],
    },
    datasources: parsed.datasources ?? {},
    runtime: {
      defaultDatasource: requiredString(parsed.runtime?.defaultDatasource, "runtime.default_datasource"),
      activeDatasources: parsed.runtime?.activeDatasources ?? [],
      tablePrefix: parsed.runtime?.tablePrefix ?? "qa_auto",
      skipPreconditions: Boolean(parsed.runtime?.skipPreconditions),
      cleanup: parsed.runtime?.cleanup !== false,
      allowWrite: parsed.runtime?.allowWrite,
      timeouts: {
        projectApiMs: Number(parsed.runtime?.timeouts?.projectApiMs ?? 120_000),
        preconditionRequestMs: Number(parsed.runtime?.timeouts?.preconditionRequestMs ?? 120_000),
        metadataSyncMs: Number(parsed.runtime?.timeouts?.metadataSyncMs ?? 180_000),
      },
      playwright: {
        headless: parsed.runtime?.playwright?.headless !== false,
        workers: Number(parsed.runtime?.playwright?.workers ?? 1),
        fullyParallel: Boolean(parsed.runtime?.playwright?.fullyParallel),
        stepCapture: parsed.runtime?.playwright?.stepCapture ?? "all",
      },
    },
  };
  if (!profile.datasources[profile.runtime.defaultDatasource]) {
    throw new Error(`runtime.default_datasource not configured: ${profile.runtime.defaultDatasource}`);
  }
  for (const id of profile.runtime.activeDatasources) {
    if (!profile.datasources[id]) throw new Error(`runtime.active_datasources contains unknown datasource: ${id}`);
  }
  return profile;
}

export function resolveDataAssetsRuntime(
  env: RuntimeEnv = process.env,
  opts?: LoadDataAssetsProfileOptions,
): DataAssetsEnvProfile {
  return loadDataAssetsEnvProfile(resolveDataAssetsEnvName(env), opts);
}

export function getEnvConfig(): DataAssetsEnvProfile {
  return resolveDataAssetsRuntime();
}

export function bridgeLegacyDataAssetsEnv(
  profile: DataAssetsEnvProfile,
  target: RuntimeEnv = process.env,
): void {
  target.UI_AUTOTEST_BASE_URL = profile.urls.dataAssetsBaseUrl;
  target.UI_AUTOTEST_SESSION_PATH = profile.auth.sessionPath;
  target.KATA_ACTIVE_PROJECT ??= "dataAssets";
  target.PW_WORKERS ??= String(profile.runtime.playwright.workers);
  target.PW_FULLY_PARALLEL ??= profile.runtime.playwright.fullyParallel ? "1" : "0";
  target.HEADLESS ??= profile.runtime.playwright.headless ? "true" : "false";
  target.UI_AUTOTEST_STEP_CAPTURE ??= profile.runtime.playwright.stepCapture;
}
