import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
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
    readonly cookie: string;
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

export interface PlaywrightCookieState {
  readonly cookies: ReadonlyArray<{
    readonly name: string;
    readonly value: string;
    readonly domain: string;
    readonly path: "/";
    readonly expires: -1;
    readonly httpOnly: false;
    readonly secure: boolean;
    readonly sameSite: "Lax";
  }>;
  readonly origins: readonly [];
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

function workspaceRoot(opts?: LoadDataAssetsProfileOptions): string {
  return opts?.workspaceRoot ?? join(process.cwd(), "workspace", "dataAssets");
}

function normalizeCookieHeader(value: unknown): string {
  const cookie = requiredString(value, "auth.cookie");
  if (
    (cookie.startsWith('"') && cookie.endsWith('"')) ||
    (cookie.startsWith("'") && cookie.endsWith("'"))
  ) {
    return cookie.slice(1, -1);
  }
  return cookie;
}

export function resolveDataAssetsEnvName(env: RuntimeEnv = process.env): string {
  const rawEnvName = env.KATA_DATAASSETS_ENV ?? DEFAULT_ENV;
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
  const parsed = camelize(parse(readFileSync(profilePath, "utf8"))) as any;
  const localProfilePath = join(root, "_shared", "env", ".local", `${normalizedEnvName}.yaml`);
  if (existsSync(localProfilePath)) {
    const local = camelize(parse(readFileSync(localProfilePath, "utf8"))) as any;
    if (typeof local.auth?.cookie === "string") {
      parsed.auth = { ...parsed.auth, cookie: local.auth.cookie };
    }
  }
  const baseUrl = requiredString(parsed.urls?.baseUrl, "urls.base_url");
  const profile: DataAssetsEnvProfile = {
    schemaVersion: 1,
    project: "dataAssets",
    env: requiredString(parsed.env, "env"),
    urls: {
      baseUrl,
      dataAssetsBaseUrl: requiredString(
        parsed.urls?.dataAssetsBaseUrl,
        "urls.data_assets_base_url",
      ),
      offlineBaseUrl: requiredString(parsed.urls?.offlineBaseUrl, "urls.offline_base_url"),
      portalBaseUrl: parsed.urls?.portalBaseUrl,
    },
    auth: {
      cookie: normalizeCookieHeader(parsed.auth?.cookie),
      tenantId: parsed.auth?.tenantId,
      tenantName: parsed.auth?.tenantName,
      userId: parsed.auth?.userId,
      username: parsed.auth?.username,
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

/** Convert an HTTP Cookie header into an in-memory Playwright storage state. */
export function cookieHeaderToPlaywrightState(
  baseUrl: string,
  cookieHeader: string,
): PlaywrightCookieState {
  const url = new URL(baseUrl);
  return {
    cookies: cookieHeader.split(";").flatMap((item) => {
      const separator = item.indexOf("=");
      if (separator <= 0) return [];
      return [
        {
          name: item.slice(0, separator).trim(),
          value: item.slice(separator + 1).trim(),
          domain: url.hostname,
          path: "/" as const,
          expires: -1 as const,
          httpOnly: false as const,
          secure: url.protocol === "https:",
          sameSite: "Lax" as const,
        },
      ];
    }),
    origins: [],
  };
}

export function bridgeLegacyDataAssetsEnv(
  profile: DataAssetsEnvProfile,
  target: RuntimeEnv = process.env,
): void {
  target.UI_AUTOTEST_BASE_URL = profile.urls.dataAssetsBaseUrl;
  target.UI_AUTOTEST_COOKIE = profile.auth.cookie;
  delete target.UI_AUTOTEST_SESSION_PATH;
  target.KATA_ACTIVE_PROJECT ??= "dataAssets";
  target.PW_WORKERS ??= String(profile.runtime.playwright.workers);
  target.PW_FULLY_PARALLEL ??= profile.runtime.playwright.fullyParallel ? "1" : "0";
  target.HEADLESS ??= profile.runtime.playwright.headless ? "true" : "false";
  target.UI_AUTOTEST_STEP_CAPTURE ??= profile.runtime.playwright.stepCapture;
}
