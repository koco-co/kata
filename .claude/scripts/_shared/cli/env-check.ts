import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { readDotEnvFile, setDotEnvValue } from "@shared/lib/env.ts";
import { repoRoot } from "@shared/lib/paths.ts";
import { parse, parseDocument, stringify } from "yaml";

export interface EnvProbeResult {
  ok: boolean;
  reason?: string;
}

export interface EnvCheckContext {
  project: string;
  env: string;
  repoRoot?: string;
  probe?: (cfg: Record<string, unknown>) => Promise<EnvProbeResult>;
}

interface StorageCookie {
  name?: string;
  value?: string;
  domain?: string;
}

export interface EnvAuthMigrationContext {
  project: string;
  env: string;
  session: string;
  repoRoot?: string;
}

export interface ZentaoSessionMigrationContext {
  session: string;
  repoRoot?: string;
}

export interface RootEnvSetContext {
  key: string;
  value: string;
  repoRoot?: string;
}

export interface EnvProfileContext {
  project: string;
  env: string;
  repoRoot?: string;
}

export interface LegacyEnvMigrationContext {
  project: string;
  repoRoot?: string;
  apply?: boolean;
}

export interface ProfileSecretMigrationContext {
  project: string;
  repoRoot?: string;
  apply?: boolean;
}

function profilePath(root: string, project: string, env: string): string {
  return join(root, "workspace", project, "_shared/env", `${env}.yaml`);
}

function profileSecretPath(root: string, project: string, env: string): string {
  return join(root, "workspace", project, "_shared/env/.local", `${env}.yaml`);
}

function readBaseProfile(root: string, project: string, env: string): Record<string, unknown> {
  const path = profilePath(root, project, env);
  if (!existsSync(path)) throw new Error(`env profile not found: ${path}`);
  return parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function readProfile(root: string, project: string, env: string): Record<string, unknown> {
  const profile = readBaseProfile(root, project, env);
  const secretPath = profileSecretPath(root, project, env);
  if (!existsSync(secretPath)) return profile;
  const local = parse(readFileSync(secretPath, "utf8")) as Record<string, unknown>;
  const auth = nestedRecord(profile.auth);
  const localAuth = nestedRecord(local.auth);
  if (typeof localAuth.cookie === "string") auth.cookie = localAuth.cookie;
  profile.auth = auth;
  return profile;
}

function writeProfileSecretCookie(path: string, cookie: string): void {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, stringify({ auth: { cookie } }, { lineWidth: 0 }), {
    encoding: "utf8",
    mode: 0o600,
  });
  chmodSync(path, 0o600);
}

function nestedRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function isSecretConfigKey(key: string): boolean {
  return /(?:cookie|password|pass|secret|token|api_key|webhook|db_url|sr3x_url)/i.test(key);
}

function profileBaseUrl(cfg: Record<string, unknown>): string {
  const urls = nestedRecord(cfg.urls);
  return typeof urls.base_url === "string"
    ? urls.base_url
    : typeof cfg.base_url === "string"
      ? cfg.base_url
      : "";
}

function profileTenantName(cfg: Record<string, unknown>): string {
  const auth = nestedRecord(cfg.auth);
  return typeof auth.tenant_name === "string"
    ? auth.tenant_name
    : typeof cfg.tenant_name === "string"
      ? cfg.tenant_name
      : "";
}

function profileCookie(cfg: Record<string, unknown>): string {
  const auth = nestedRecord(cfg.auth);
  const raw = typeof auth.cookie === "string" ? auth.cookie.trim() : "";
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  return raw;
}

function normalizeProfileName(value: string): string {
  const name = value
    .trim()
    .replace(/\.ya?ml$/i, "")
    .toLowerCase();
  return { prod: "ltqc-prod", ltqc: "ltqc-local", customltem: "ltqc-test" }[name] ?? name;
}

function inferSelectedProfile(
  root: string,
  project: string,
  local: Record<string, string>,
): string {
  const rootEnv = readDotEnvFile(join(root, ".env"));
  if (rootEnv.KATA_DATAASSETS_ENV) return normalizeProfileName(rootEnv.KATA_DATAASSETS_ENV);
  const dtstackMatches = profilesMatchingUrl(root, project, rootEnv.KATA_DTSTACK_BASE_URL).filter(
    (env) => profileCookie(readProfile(root, project, env)) !== "",
  );
  if (dtstackMatches.length === 1) return dtstackMatches[0];
  const uiMatches = profilesMatchingUrl(root, project, local.UI_AUTOTEST_BASE_URL);
  if (uiMatches.length === 1) return uiMatches[0];
  if (uiMatches.length > 1) {
    throw new Error(`UI_AUTOTEST_BASE_URL matches multiple env profiles: ${uiMatches.join(", ")}`);
  }
  return normalizeProfileName(local.ACTIVE_ENV ?? "ltqc-local");
}

function profilesMatchingUrl(root: string, project: string, url?: string): string[] {
  if (!url) return [];
  const envDir = join(root, "workspace", project, "_shared", "env");
  return readdirSync(envDir)
    .filter((file) => file.endsWith(".yaml"))
    .flatMap((file) => {
      const env = file.replace(/\.yaml$/, "");
      const urls = nestedRecord(readProfile(root, project, env).urls);
      return [urls.base_url, urls.data_assets_base_url].map(String).includes(url) ? [env] : [];
    });
}

function flattenConfigured(
  value: unknown,
  prefix = "",
): Array<{ key: string; configured: boolean; secret: boolean }> {
  if (!value || typeof value !== "object") return [];
  const out: Array<{ key: string; configured: boolean; secret: boolean }> = [];
  for (const [key, nested] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (nested && typeof nested === "object") out.push(...flattenConfigured(nested, path));
    else {
      out.push({
        key: path,
        configured: nested !== undefined && nested !== null && String(nested).trim() !== "",
        secret: isSecretConfigKey(path),
      });
    }
  }
  return out;
}

function supportedRootEnvKeys(root: string): Set<string> | null {
  const examplePath = join(root, ".env.example");
  return existsSync(examplePath) ? new Set(Object.keys(readDotEnvFile(examplePath))) : null;
}

export function resolveEnvSources(ctx: EnvProfileContext): {
  project: string;
  env: string;
  rootEnv: { path: string; keys: Array<{ key: string; configured: boolean; secret: boolean }> };
  profile: {
    path: string;
    secretPath: string | null;
    keys: Array<{ key: string; configured: boolean; secret: boolean }>;
  };
  legacyFiles: string[];
} {
  const root = ctx.repoRoot ?? repoRoot();
  const rootPath = join(root, ".env");
  const selectedProfilePath = profilePath(root, ctx.project, ctx.env);
  const profile = readProfile(root, ctx.project, ctx.env);
  const rootKeys = Object.entries(readDotEnvFile(rootPath))
    .sort()
    .map(([key, value]) => ({
      key,
      configured: value.trim() !== "",
      secret: isSecretConfigKey(key),
    }));
  const legacyFiles = [
    join(root, ".env.envs"),
    join(root, ".env.local"),
    join(root, "workspace", ctx.project, ".env.local"),
  ].filter(existsSync);
  return {
    project: ctx.project,
    env: ctx.env,
    rootEnv: { path: rootPath, keys: rootKeys },
    profile: {
      path: selectedProfilePath,
      secretPath: existsSync(profileSecretPath(root, ctx.project, ctx.env))
        ? profileSecretPath(root, ctx.project, ctx.env)
        : null,
      keys: flattenConfigured(profile).sort((a, b) => a.key.localeCompare(b.key)),
    },
    legacyFiles,
  };
}

function isGitTracked(root: string, path: string): boolean {
  try {
    execFileSync("git", ["-C", root, "ls-files", "--error-unmatch", path], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

export function diagnoseEnvConfig(ctx: EnvProfileContext): {
  ok: boolean;
  findings: Array<{ code: string; severity: "error" | "warn"; path: string }>;
} {
  const root = ctx.repoRoot ?? repoRoot();
  const resolved = resolveEnvSources(ctx);
  const findings: Array<{ code: string; severity: "error" | "warn"; path: string }> = [];
  for (const path of resolved.legacyFiles) {
    findings.push({ code: "legacy_env_overlay", severity: "error", path });
  }
  if (
    existsSync(resolved.rootEnv.path) &&
    (statSync(resolved.rootEnv.path).mode & 0o777) !== 0o600
  ) {
    findings.push({ code: "root_env_permissions", severity: "error", path: resolved.rootEnv.path });
  }
  const rootValues = readDotEnvFile(resolved.rootEnv.path);
  const supportedKeys = supportedRootEnvKeys(root);
  if (supportedKeys) {
    for (const key of Object.keys(rootValues).sort()) {
      if (!supportedKeys.has(key)) {
        findings.push({
          code: "unsupported_root_env_key",
          severity: "error",
          path: `${resolved.rootEnv.path}#${key}`,
        });
      }
    }
  }
  for (const [key, value] of Object.entries(rootValues).sort()) {
    if (value.trim() === "") {
      findings.push({
        code: "empty_root_env_value",
        severity: "warn",
        path: `${resolved.rootEnv.path}#${key}`,
      });
    }
  }
  const profile = readProfile(root, ctx.project, ctx.env);
  const baseProfile = readBaseProfile(root, ctx.project, ctx.env);
  if (!profileCookie(profile)) {
    findings.push({
      code: "profile_cookie_missing",
      severity: "error",
      path: resolved.profile.path,
    });
  }
  const relativeProfile = resolved.profile.path.slice(root.length + 1);
  if (profileCookie(baseProfile) && isGitTracked(root, relativeProfile)) {
    findings.push({
      code: "tracked_profile_cookie",
      severity: "error",
      path: resolved.profile.path,
    });
  }
  if (resolved.profile.secretPath) {
    if ((statSync(resolved.profile.secretPath).mode & 0o777) !== 0o600) {
      findings.push({
        code: "profile_secret_permissions",
        severity: "error",
        path: resolved.profile.secretPath,
      });
    }
    const relativeSecret = resolved.profile.secretPath.slice(root.length + 1);
    if (isGitTracked(root, relativeSecret)) {
      findings.push({
        code: "tracked_profile_secret",
        severity: "error",
        path: resolved.profile.secretPath,
      });
    }
    const localProfile = parse(readFileSync(resolved.profile.secretPath, "utf8")) as Record<
      string,
      unknown
    >;
    for (const { key } of flattenConfigured(localProfile)) {
      if (key !== "auth.cookie") {
        findings.push({
          code: "unsupported_profile_secret_key",
          severity: "error",
          path: `${resolved.profile.secretPath}#${key}`,
        });
      }
    }
  }
  return { ok: findings.every((finding) => finding.severity !== "error"), findings };
}

function valueAt(cfg: Record<string, unknown>, ...path: string[]): unknown {
  let current: unknown = cfg;
  for (const segment of path) current = nestedRecord(current)[segment];
  return current;
}

function assertSame(label: string, actual: string | undefined, expected: unknown): void {
  if (actual !== undefined && String(expected) !== actual) {
    throw new Error(`${label} is not represented by the selected env profile`);
  }
}

export function migrateLegacyEnvLocal(ctx: LegacyEnvMigrationContext): {
  applied: boolean;
  selectedEnv: string;
  migratedRootKeys: string[];
  profileBackedKeys: string[];
  removedTransientKeys: string[];
  deletedFiles: string[];
} {
  const root = ctx.repoRoot ?? repoRoot();
  const rootLocalPath = join(root, ".env.local");
  const projectLocalPath = join(root, "workspace", ctx.project, ".env.local");
  const rootLocal = readDotEnvFile(rootLocalPath);
  const projectLocal = readDotEnvFile(projectLocalPath);
  const selectedEnv = inferSelectedProfile(root, ctx.project, rootLocal);
  const selected = readProfile(root, ctx.project, selectedEnv);
  const prod = readProfile(root, ctx.project, "ltqc-prod");

  assertSame("PROD_BASE_URL", rootLocal.PROD_BASE_URL, profileBaseUrl(prod));
  assertSame("PROD_COOKIE", rootLocal.PROD_COOKIE, profileCookie(prod));
  const uiMatches = profilesMatchingUrl(root, ctx.project, rootLocal.UI_AUTOTEST_BASE_URL);
  if (rootLocal.UI_AUTOTEST_BASE_URL && uiMatches.length !== 1) {
    throw new Error("UI_AUTOTEST_BASE_URL is not represented by exactly one env profile");
  }
  const uiProfile = uiMatches[0] ? readProfile(root, ctx.project, uiMatches[0]) : selected;
  assertSame("UI_AUTOTEST_COOKIE", rootLocal.UI_AUTOTEST_COOKIE, profileCookie(uiProfile));
  assertSame("KATA_ACTIVE_PROJECT", rootLocal.KATA_ACTIVE_PROJECT, ctx.project);
  assertSame(
    "HEADLESS",
    rootLocal.HEADLESS?.toLowerCase(),
    String(valueAt(selected, "runtime", "playwright", "headless")),
  );
  if (rootLocal.KATA_DATAASSETS_PROJECT_ID) {
    const projects = nestedRecord(selected.projects);
    const ids = Object.values(projects)
      .map((item) => nestedRecord(item).id)
      .filter((id) => id !== undefined)
      .map(String);
    if (!ids.includes(rootLocal.KATA_DATAASSETS_PROJECT_ID)) {
      throw new Error("KATA_DATAASSETS_PROJECT_ID is not represented by the selected env profile");
    }
  }
  if (projectLocal.KATA_DATAASSETS_SESSION_PATH && !profileCookie(selected)) {
    throw new Error("project session path cannot be removed until auth.cookie is configured");
  }
  const unsupportedProjectKeys = Object.keys(projectLocal).filter(
    (key) => key !== "KATA_DATAASSETS_SESSION_PATH",
  );
  if (unsupportedProjectKeys.length > 0) {
    throw new Error(`unsupported project .env.local keys: ${unsupportedProjectKeys.join(", ")}`);
  }

  const migrated: Record<string, string> = {};
  if (rootLocal.ACTIVE_ENV) migrated.KATA_DATAASSETS_ENV = selectedEnv;
  for (const key of ["KATA_SR3X_URL", "KATA_SR3X_TYPE"]) {
    if (rootLocal[key]) migrated[key] = rootLocal[key];
  }
  const profileBackedKeys = [
    "HEADLESS",
    "PROD_COOKIE",
    "PROD_BASE_URL",
    "UI_AUTOTEST_BASE_URL",
    "UI_AUTOTEST_COOKIE",
    "KATA_DATAASSETS_PROJECT_ID",
    ...(projectLocal.KATA_DATAASSETS_SESSION_PATH ? ["KATA_DATAASSETS_SESSION_PATH"] : []),
  ].filter((key) => rootLocal[key] !== undefined || projectLocal[key] !== undefined);
  const removedTransientKeys = ["KATA_ACTIVE_PROJECT", "KATA_ACTIVE_FEATURE"].filter(
    (key) => rootLocal[key] !== undefined,
  );
  const known = new Set([
    "ACTIVE_ENV",
    "KATA_SR3X_URL",
    "KATA_SR3X_TYPE",
    ...profileBackedKeys,
    ...removedTransientKeys,
  ]);
  const unknownRootKeys = Object.keys(rootLocal).filter((key) => !known.has(key));
  if (unknownRootKeys.length > 0) {
    throw new Error(`unsupported root .env.local keys: ${unknownRootKeys.join(", ")}`);
  }

  const deletedFiles = [rootLocalPath, projectLocalPath].filter(existsSync);
  if (ctx.apply) {
    for (const [key, value] of Object.entries(migrated)) {
      setDotEnvValue(join(root, ".env"), key, value);
    }
    for (const path of deletedFiles) unlinkSync(path);
  }
  return {
    applied: ctx.apply === true,
    selectedEnv,
    migratedRootKeys: Object.keys(migrated).sort(),
    profileBackedKeys: profileBackedKeys.sort(),
    removedTransientKeys: removedTransientKeys.sort(),
    deletedFiles: ctx.apply ? deletedFiles : [],
  };
}

export function migrateProfileSecrets(ctx: ProfileSecretMigrationContext): {
  applied: boolean;
  migratedProfiles: string[];
  secretFiles: string[];
} {
  const root = ctx.repoRoot ?? repoRoot();
  const envDir = join(root, "workspace", ctx.project, "_shared", "env");
  const migratedProfiles: string[] = [];
  const secretFiles: string[] = [];
  for (const file of readdirSync(envDir)
    .filter((name) => name.endsWith(".yaml"))
    .sort()) {
    const env = file.replace(/\.yaml$/, "");
    const basePath = profilePath(root, ctx.project, env);
    const baseProfile = readBaseProfile(root, ctx.project, env);
    const cookie = profileCookie(baseProfile);
    if (!cookie) continue;
    const secretPath = profileSecretPath(root, ctx.project, env);
    migratedProfiles.push(env);
    secretFiles.push(secretPath);
    if (!ctx.apply) continue;

    writeProfileSecretCookie(secretPath, cookie);
    const document = parseDocument(readFileSync(basePath, "utf8"));
    document.setIn(["auth", "cookie"], "");
    writeFileSync(basePath, document.toString({ lineWidth: 0 }), "utf8");
  }
  return { applied: ctx.apply === true, migratedProfiles, secretFiles };
}

function cookieAppliesToHost(cookie: StorageCookie, host: string): boolean {
  const domain = (cookie.domain ?? "").replace(/^\./, "").toLowerCase();
  return domain === "" || host === domain || host.endsWith(`.${domain}`);
}

export function migrateEnvAuthCookie(ctx: EnvAuthMigrationContext): {
  envPath: string;
  sessionPath: string;
  cookieCount: number;
  authCookieConfigured: true;
} {
  const root = ctx.repoRoot ?? repoRoot();
  const basePath = profilePath(root, ctx.project, ctx.env);
  const envPath = profileSecretPath(root, ctx.project, ctx.env);
  const sessionPath = isAbsolute(ctx.session) ? ctx.session : resolve(root, ctx.session);
  if (!existsSync(basePath)) throw new Error(`env profile not found: ${basePath}`);
  if (!existsSync(sessionPath)) throw new Error(`auth session not found: ${sessionPath}`);

  const cfg = readProfile(root, ctx.project, ctx.env);
  const state = JSON.parse(readFileSync(sessionPath, "utf-8")) as { cookies?: StorageCookie[] };
  const baseUrl = profileBaseUrl(cfg);
  const host = baseUrl ? new URL(baseUrl).hostname.toLowerCase() : "";
  const cookies = (state.cookies ?? []).filter(
    (cookie) =>
      typeof cookie.name === "string" &&
      cookie.name !== "" &&
      typeof cookie.value === "string" &&
      cookieAppliesToHost(cookie, host),
  );
  if (cookies.length === 0) {
    throw new Error(`no cookies for ${host || "the configured host"} in ${sessionPath}`);
  }
  const deduplicated = new Map<string, string>();
  for (const cookie of cookies) deduplicated.set(cookie.name as string, cookie.value as string);

  const cookieHeader = Array.from(deduplicated, ([name, value]) => `${name}=${value}`).join("; ");
  writeProfileSecretCookie(envPath, cookieHeader);
  const document = parseDocument(readFileSync(basePath, "utf8"));
  document.deleteIn(["auth", "session_path"]);
  document.deleteIn(["auth", "derive_from_session"]);
  document.setIn(["auth", "cookie"], "");
  writeFileSync(basePath, document.toString({ lineWidth: 0 }), "utf8");
  return {
    envPath,
    sessionPath,
    cookieCount: deduplicated.size,
    authCookieConfigured: true,
  };
}

/** Migrate the legacy repo .kata ZenTao cookie into the unified root .env file. */
export function migrateZentaoSession(ctx: ZentaoSessionMigrationContext): {
  envPath: string;
  sessionPath: string;
  cookieConfigured: true;
} {
  const root = ctx.repoRoot ?? repoRoot();
  const envPath = join(root, ".env");
  const sessionPath = isAbsolute(ctx.session) ? ctx.session : resolve(root, ctx.session);
  if (!existsSync(sessionPath)) throw new Error(`ZenTao session not found: ${sessionPath}`);

  const session = JSON.parse(readFileSync(sessionPath, "utf8")) as { cookie?: unknown };
  if (typeof session.cookie !== "string" || session.cookie.trim() === "") {
    throw new Error(`ZenTao cookie is missing in ${sessionPath}`);
  }
  setDotEnvValue(envPath, "KATA_ZENTAO_COOKIE", session.cookie);
  return { envPath, sessionPath, cookieConfigured: true };
}

/** Set a root dotenv key while keeping the configured value out of JSON output. */
export function setRootEnv(ctx: RootEnvSetContext): {
  envPath: string;
  key: string;
  configured: true;
} {
  const root = ctx.repoRoot ?? repoRoot();
  const envPath = join(root, ".env");
  setDotEnvValue(envPath, ctx.key, ctx.value);
  return { envPath, key: ctx.key, configured: true };
}

async function defaultProbe(): Promise<EnvProbeResult> {
  try {
    execFileSync("dtstack-cli", ["--help"], { stdio: "ignore" });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runEnvCheck(ctx: EnvCheckContext): Promise<{
  baseUrl: string;
  tenant: string;
  authCookieConfigured: boolean;
  dtstackReachable: boolean;
  reason?: string;
}> {
  const root = ctx.repoRoot ?? repoRoot();
  const envPath = profilePath(root, ctx.project, ctx.env);
  if (!existsSync(envPath)) {
    return {
      baseUrl: "",
      tenant: "",
      authCookieConfigured: false,
      dtstackReachable: false,
      reason: `env profile not found: ${envPath}`,
    };
  }
  const cfg = readProfile(root, ctx.project, ctx.env);
  const authCookieConfigured = profileCookie(cfg) !== "";
  if (!authCookieConfigured) {
    return {
      baseUrl: profileBaseUrl(cfg),
      tenant: profileTenantName(cfg),
      authCookieConfigured: false,
      dtstackReachable: false,
      reason: `auth.cookie is missing in ${envPath}`,
    };
  }
  const probe = await (ctx.probe ?? defaultProbe)(cfg);
  return {
    baseUrl: profileBaseUrl(cfg),
    tenant: profileTenantName(cfg),
    authCookieConfigured,
    dtstackReachable: probe.ok,
    reason: probe.reason,
  };
}
