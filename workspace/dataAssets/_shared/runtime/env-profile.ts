import { dirname, resolve } from "node:path";
import {
  DATAASSETS_CONFIG_ENV,
  DATAASSETS_RESOLVED_ENV,
  LEGACY_DATAASSETS_ENV,
  assertDataAssetsTenantCookie,
  assertDataAssetsEnvName,
  dataAssetsEnvPath,
  readDataAssetsEnvConfig,
  type ResolvedDataAssetsEnv,
  type DataAssetsAutomationConfig,
} from "../../../../cli/lib/dataassets-env";

export type RuntimeEnv = Record<string, string | undefined>;

export interface DataAssetsDatasourceProfile {
  readonly enabled: boolean;
  readonly uiLabel: string;
  readonly preconditionType: "SparkThrift" | "Doris" | string;
  readonly aliases: readonly string[];
  readonly batch?: {
    readonly id: number;
    readonly name: string;
    readonly typeId: number;
    readonly database: string;
    readonly schema: string;
  };
  readonly metadata: { readonly id: number; readonly name: string; readonly typeId: number };
  readonly assets: { readonly id: number; readonly name: string };
  readonly ui: { readonly sourceTypeId: number };
  readonly sql: { readonly database: string; readonly schema: string };
  readonly requiresOffline: boolean;
}

export interface DataAssetsRuntimeOptions {
  readonly defaultDatasource: string;
  readonly activeDatasources: readonly string[];
  readonly tablePrefix: string;
  readonly skipPreconditions: boolean;
  readonly cleanup: boolean;
  readonly allowWrite: boolean;
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
  readonly schemaVersion: 2;
  readonly project: "dataAssets";
  readonly env: string;
  readonly urls: ResolvedDataAssetsEnv["urls"];
  readonly auth: {
    readonly cookie: string;
    readonly tenantId?: number;
    readonly tenantName: string;
    readonly userId?: number;
    readonly username?: string;
  };
  readonly projects: {
    readonly quality: { readonly id: number; readonly name: string };
    readonly offline?: { readonly id: number; readonly name: string };
  };
  readonly datasources: Record<string, DataAssetsDatasourceProfile>;
  readonly automation?: DataAssetsAutomationConfig;
  readonly runtime: DataAssetsRuntimeOptions;
}

export interface LoadDataAssetsProfileOptions {
  readonly repoRoot?: string;
  readonly env?: RuntimeEnv;
  readonly resolved?: ResolvedDataAssetsEnv;
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

export interface NamedAuthProfileGuard {
  readonly baseUrl: string;
  readonly tenantName: string;
}

let legacyWarningShown = false;

function parseResolved(value: string | undefined): ResolvedDataAssetsEnv {
  if (!value) {
    throw new Error(
      "DataAssets runtime is unresolved. Use `kata env run <name> -- <command...>` instead of starting Playwright directly.",
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("KATA_DATAASSETS_RESOLVED is invalid JSON");
  }
  const resolved = parsed as Partial<ResolvedDataAssetsEnv>;
  if (resolved.schemaVersion !== 2 || !resolved.env || !resolved.urls || !resolved.projects) {
    throw new Error("KATA_DATAASSETS_RESOLVED does not contain a v2 resolved environment");
  }
  return resolved as ResolvedDataAssetsEnv;
}

export function resolveDataAssetsEnvName(env: RuntimeEnv = process.env): string {
  const resolved = env[DATAASSETS_RESOLVED_ENV];
  if (resolved) return assertDataAssetsEnvName(parseResolved(resolved).env);
  const legacy = env[LEGACY_DATAASSETS_ENV];
  if (legacy) {
    if (!legacyWarningShown) {
      process.stderr.write(
        "[deprecated] KATA_DATAASSETS_ENV no longer resolves an environment by itself; use `kata env run`.\n",
      );
      legacyWarningShown = true;
    }
    return assertDataAssetsEnvName(legacy);
  }
  throw new Error(
    "DataAssets environment is not selected. Use `kata env run <name> -- <command...>`.",
  );
}

function preconditionType(key: string): string {
  if (key === "sparkthrift") return "SparkThrift";
  if (key === "doris") return "Doris";
  return key;
}

export function loadDataAssetsEnvProfile(
  envName?: string,
  opts?: LoadDataAssetsProfileOptions,
): DataAssetsEnvProfile {
  const runtimeEnv = opts?.env ?? process.env;
  const resolvedEnv = opts?.resolved ?? parseResolved(runtimeEnv[DATAASSETS_RESOLVED_ENV]);
  const selected = assertDataAssetsEnvName(envName ?? resolveDataAssetsEnvName(runtimeEnv));
  if (resolvedEnv.env !== selected) throw new Error("resolved environment does not match selected environment");
  const injectedPath = runtimeEnv[DATAASSETS_CONFIG_ENV];
  const root = resolve(
    opts?.repoRoot ??
      (injectedPath ? dirname(dirname(dirname(resolve(injectedPath)))) : process.cwd()),
  );
  const expectedPath = dataAssetsEnvPath(selected, root);
  if (injectedPath && resolve(injectedPath) !== resolve(expectedPath)) {
    throw new Error("KATA_DATAASSETS_CONFIG does not match the selected config/env file");
  }
  const config = readDataAssetsEnvConfig(selected, { repoRoot: root });
  const datasources: Record<string, DataAssetsDatasourceProfile> = {};
  for (const [key, datasource] of Object.entries(resolvedEnv.datasources)) {
    datasources[key] = {
      enabled: true,
      uiLabel: key,
      preconditionType: preconditionType(key),
      aliases: [...new Set([key, datasource.name, datasource.batch?.name].filter(Boolean) as string[])],
      ...(datasource.batch
        ? {
            batch: {
              ...datasource.batch,
              database: datasource.database,
              schema: datasource.schema,
            },
          }
        : {}),
      metadata: datasource.metadata,
      assets: { id: datasource.assets.id, name: datasource.assets.name },
      ui: { sourceTypeId: datasource.assets.typeId },
      sql: { database: datasource.database, schema: datasource.schema },
      requiresOffline: datasource.requiresOffline,
    };
  }
  return {
    schemaVersion: 2,
    project: "dataAssets",
    env: selected,
    urls: resolvedEnv.urls,
    auth: {
      cookie: config.auth.cookie,
      tenantId: resolvedEnv.tenant.id,
      tenantName: resolvedEnv.tenant.name,
      userId: resolvedEnv.tenant.userId,
      username: resolvedEnv.tenant.username,
    },
    projects: { ...resolvedEnv.projects },
    datasources,
    ...(config.automation === undefined ? {} : { automation: config.automation }),
    runtime: {
      defaultDatasource: resolvedEnv.defaults.datasource,
      activeDatasources: Object.keys(datasources),
      tablePrefix: "qa_auto",
      skipPreconditions: false,
      cleanup: true,
      allowWrite: resolvedEnv.safety.allowWrite,
      timeouts: {
        projectApiMs: 120_000,
        preconditionRequestMs: 120_000,
        metadataSyncMs: 180_000,
      },
      playwright: {
        headless: true,
        workers: 1,
        fullyParallel: false,
        stepCapture: "all",
      },
    },
  };
}

export function resolveDataAssetsRuntime(
  env: RuntimeEnv = process.env,
  opts?: Omit<LoadDataAssetsProfileOptions, "env">,
): DataAssetsEnvProfile {
  return loadDataAssetsEnvProfile(undefined, { ...opts, env });
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

/** Load a second named account for the same platform without creating a storageState file. */
export function loadNamedDataAssetsAuthState(
  envName: string,
  expected: NamedAuthProfileGuard,
  opts?: { readonly repoRoot?: string },
): PlaywrightCookieState {
  const selected = assertDataAssetsEnvName(envName);
  const config = readDataAssetsEnvConfig(selected, opts);
  if (config.url !== expected.baseUrl) {
    throw new Error(`named auth environment ${selected} targets a different platform URL`);
  }
  if (config.guard.expected_tenant !== expected.tenantName) {
    throw new Error(`named auth environment ${selected} targets a different tenant`);
  }
  if (!config.auth.cookie.trim()) {
    throw new Error(`named auth environment ${selected} has no Cookie`);
  }
  assertDataAssetsTenantCookie(config);
  return cookieHeaderToPlaywrightState(`${config.url}/dataAssets`, config.auth.cookie);
}

export function bridgeLegacyDataAssetsEnv(
  profile: DataAssetsEnvProfile,
  target: RuntimeEnv = process.env,
): void {
  target.UI_AUTOTEST_BASE_URL = profile.urls.dataAssetsBaseUrl;
  target.UI_AUTOTEST_COOKIE = profile.auth.cookie;
  delete target.UI_AUTOTEST_SESSION_PATH;
  target.KATA_ACTIVE_PROJECT ??= "dataAssets";
  // Generic Playwright behavior comes exclusively from config/automation/playwright.yaml.
  // Remove legacy process variables so stale shells cannot silently override the YAML.
  delete target.PW_WORKERS;
  delete target.PW_FULLY_PARALLEL;
  delete target.HEADLESS;
  target.UI_AUTOTEST_STEP_CAPTURE ??= profile.runtime.playwright.stepCapture;
}
