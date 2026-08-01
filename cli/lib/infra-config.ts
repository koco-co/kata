import { execFileSync } from "node:child_process";
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
import { dirname, join, resolve } from "node:path";
import { parse, stringify } from "yaml";
import { assertNoSymlinkPath } from "./features-layout.ts";
import { repoRoot as defaultRepoRoot } from "./workspace-locator.ts";

export type InfraConfigKind = "hosts" | "data_sources" | "credentials";

export const DEFAULT_SERVER_CREDENTIAL = "server-default";
export const DEFAULT_DATA_SOURCE_CREDENTIAL = "data-source-default";

export interface HostConfig {
  host: string;
  port: number;
  credential_ref: string;
  host_key?: string;
}

export interface DataSourceConfig {
  type: string;
  host: string;
  port: number;
  database?: string;
  credential_ref: string;
}

export interface CredentialProfile {
  kind: "password";
  username: string;
  password: string;
}

export interface InfraConfig {
  hosts: Record<string, HostConfig>;
  data_sources: Record<string, DataSourceConfig>;
  credentials: Record<string, CredentialProfile>;
}

export interface ConfigIssue {
  level: "error" | "warning";
  path: string;
  message: string;
}

export interface ConfigDoctorResult {
  ok: boolean;
  scope: "all" | "infra";
  issues: ConfigIssue[];
  checked: string[];
}

export function infraDir(root: string = defaultRepoRoot()): string {
  return join(resolve(root), "config", "infra");
}

export function infraConfigPath(kind: InfraConfigKind, root: string = defaultRepoRoot()): string {
  return join(infraDir(root), `${kind}.yaml`);
}

export function infraExamplePath(kind: InfraConfigKind, root: string = defaultRepoRoot()): string {
  return join(infraDir(root), `${kind}.example.yaml`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${path} must be a non-empty string`);
  }
  return value.trim();
}

function port(value: unknown, path: string, fallback?: number): number {
  const result = value === undefined && fallback !== undefined ? fallback : value;
  if (typeof result !== "number" || !Number.isInteger(result) || result < 1 || result > 65535) {
    throw new Error(`${path} must be an integer between 1 and 65535`);
  }
  return result;
}

function loadYaml(path: string): unknown {
  if (!existsSync(path)) return undefined;
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) throw new Error(`${path} must not be a symbolic link`);
  try {
    return parse(readFileSync(path, "utf8")) as unknown;
  } catch (error) {
    throw new Error(`${path} is invalid YAML: ${(error as Error).message}`);
  }
}

function parseHosts(value: unknown, path: string): Record<string, HostConfig> {
  if (!isRecord(value) || !isRecord(value.hosts)) throw new Error(`${path} must contain hosts`);
  const result: Record<string, HostConfig> = {};
  for (const [name, raw] of Object.entries(value.hosts)) {
    if (!isRecord(raw)) throw new Error(`${path}: hosts.${name} must be an object`);
    result[name] = {
      host: requiredString(raw.host, `${path}: hosts.${name}.host`),
      port: port(raw.port, `${path}: hosts.${name}.port`, 22),
      credential_ref:
        raw.credential_ref === undefined
          ? DEFAULT_SERVER_CREDENTIAL
          : requiredString(raw.credential_ref, `${path}: hosts.${name}.credential_ref`),
      ...(raw.host_key === undefined
        ? {}
        : { host_key: requiredString(raw.host_key, `${path}: hosts.${name}.host_key`) }),
    };
  }
  return result;
}

function parseDataSources(value: unknown, path: string): Record<string, DataSourceConfig> {
  if (!isRecord(value) || !isRecord(value.data_sources)) {
    throw new Error(`${path} must contain data_sources`);
  }
  const result: Record<string, DataSourceConfig> = {};
  for (const [name, raw] of Object.entries(value.data_sources)) {
    if (!isRecord(raw)) throw new Error(`${path}: data_sources.${name} must be an object`);
    result[name] = {
      type: requiredString(raw.type, `${path}: data_sources.${name}.type`),
      host: requiredString(raw.host, `${path}: data_sources.${name}.host`),
      port: port(raw.port, `${path}: data_sources.${name}.port`),
      ...(raw.database === undefined
        ? {}
        : { database: requiredString(raw.database, `${path}: data_sources.${name}.database`) }),
      credential_ref:
        raw.credential_ref === undefined
          ? DEFAULT_DATA_SOURCE_CREDENTIAL
          : requiredString(raw.credential_ref, `${path}: data_sources.${name}.credential_ref`),
    };
  }
  return result;
}

function parseCredentials(value: unknown, path: string): Record<string, CredentialProfile> {
  if (!isRecord(value) || !isRecord(value.credentials)) {
    throw new Error(`${path} must contain credentials`);
  }
  const result: Record<string, CredentialProfile> = {};
  for (const [name, raw] of Object.entries(value.credentials)) {
    if (!isRecord(raw)) throw new Error(`${path}: credentials.${name} must be an object`);
    const kind = raw.kind ?? "password";
    if (kind !== "password") throw new Error(`${path}: credentials.${name}.kind must be password`);
    result[name] = {
      kind: "password",
      username: requiredString(raw.username, `${path}: credentials.${name}.username`),
      password: requiredString(raw.password, `${path}: credentials.${name}.password`),
    };
  }
  return result;
}

export function readInfraConfig(root: string = defaultRepoRoot()): InfraConfig {
  const hostsPath = infraConfigPath("hosts", root);
  const dataSourcesPath = infraConfigPath("data_sources", root);
  const credentialsPath = infraConfigPath("credentials", root);
  if (!existsSync(hostsPath)) throw new Error(`missing infrastructure config: ${hostsPath}`);
  if (!existsSync(dataSourcesPath)) {
    throw new Error(`missing infrastructure config: ${dataSourcesPath}`);
  }
  if (!existsSync(credentialsPath)) {
    throw new Error(`missing infrastructure config: ${credentialsPath}`);
  }
  const hosts = parseHosts(loadYaml(hostsPath), hostsPath);
  const data_sources = parseDataSources(loadYaml(dataSourcesPath), dataSourcesPath);
  const credentials = parseCredentials(loadYaml(credentialsPath), credentialsPath);
  for (const [name, host] of Object.entries(hosts)) {
    if (!credentials[host.credential_ref]) {
      throw new Error(`hosts.${name}.credential_ref is not configured: ${host.credential_ref}`);
    }
  }
  for (const [name, source] of Object.entries(data_sources)) {
    if (!credentials[source.credential_ref]) {
      throw new Error(
        `data_sources.${name}.credential_ref is not configured: ${source.credential_ref}`,
      );
    }
  }
  return { hosts, data_sources, credentials };
}

function writeYamlAtomic(path: string, value: unknown, root: string): void {
  assertNoSymlinkPath(resolve(root), path, "infrastructure config");
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  chmodSync(dirname(path), 0o700);
  const tmp = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(tmp, stringify(value), { encoding: "utf8", mode: 0o600, flag: "wx" });
    chmodSync(tmp, 0o600);
    renameSync(tmp, path);
    chmodSync(path, 0o600);
  } finally {
    if (existsSync(tmp)) unlinkSync(tmp);
  }
}

function readYamlObject(path: string): Record<string, unknown> {
  const value = loadYaml(path);
  return isRecord(value) ? value : {};
}

export function writeCredentialProfile(
  name: string,
  profile: CredentialProfile,
  root: string = defaultRepoRoot(),
): string {
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(name)) {
    throw new Error("credential name must use lowercase letters, digits, _ or -");
  }
  requiredString(profile.username, "credential.username");
  requiredString(profile.password, "credential.password");
  const path = infraConfigPath("credentials", root);
  const current = readYamlObject(path);
  const credentials = isRecord(current.credentials) ? { ...current.credentials } : {};
  credentials[name] = { kind: "password", username: profile.username, password: profile.password };
  writeYamlAtomic(path, { credentials }, root);
  return path;
}

const HOST_KEY_FINGERPRINT_RE = /^SHA256:[A-Za-z0-9+/]{43}={0,1}$/;

export function trustHostKey(
  name: string,
  fingerprint: string,
  root: string = defaultRepoRoot(),
): string {
  const normalized = requiredString(fingerprint, "fingerprint");
  if (!HOST_KEY_FINGERPRINT_RE.test(normalized)) {
    throw new Error("fingerprint must match SHA256:<43-char base64>");
  }
  const path = infraConfigPath("hosts", root);
  const current = readYamlObject(path);
  const hosts = isRecord(current.hosts) ? { ...current.hosts } : {};
  const host = hosts[name];
  if (!isRecord(host)) throw new Error(`unknown infrastructure host: ${name}`);
  hosts[name] = { ...host, host_key: normalized };
  writeYamlAtomic(path, { hosts }, root);
  return path;
}

function issue(
  issues: ConfigIssue[],
  level: ConfigIssue["level"],
  path: string,
  message: string,
): void {
  issues.push({ level, path, message });
}

function checkPrivatePath(
  path: string,
  issues: ConfigIssue[],
  required: boolean,
  label: string,
): void {
  if (!existsSync(path)) {
    issue(issues, required ? "error" : "warning", path, `${label} is not configured`);
    return;
  }
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) issue(issues, "error", path, "must not be a symbolic link");
  if ((stat.mode & 0o777) !== 0o600) {
    issue(issues, "error", path, "must have permission 0600");
  }
}

function checkPrivateDir(path: string, issues: ConfigIssue[], required: boolean): void {
  if (!existsSync(path)) {
    issue(issues, required ? "error" : "warning", path, "private directory is not configured");
    return;
  }
  const stat = lstatSync(path);
  if (!stat.isDirectory()) issue(issues, "error", path, "must be a directory");
  if (stat.isSymbolicLink()) issue(issues, "error", path, "must not be a symbolic link");
  if ((stat.mode & 0o777) !== 0o700) {
    issue(issues, required ? "error" : "warning", path, "must have permission 0700");
  }
}

function isExampleConfig(path: string): boolean {
  const base = path.split("/").pop() ?? path;
  return base.startsWith("example.") || base.includes(".example.");
}

/** Flag private config files tracked by git; only redacted *.example files may be committed. */
function checkTrackedPrivateFiles(
  root: string,
  dirs: string[],
  issues: ConfigIssue[],
  checked: string[],
): void {
  let listing: string;
  try {
    listing = execFileSync("git", ["-C", root, "ls-files", "--", ...dirs], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    return; // not a git checkout; nothing to verify
  }
  for (const file of listing.split("\n").filter((line) => line.trim())) {
    checked.push(join(root, file));
    if (isExampleConfig(file)) continue;
    issue(issues, "error", join(root, file), "private config file must not be tracked by git");
  }
}

export function runConfigDoctor(
  options: { root?: string; scope?: "all" | "infra"; fix?: boolean } = {},
): ConfigDoctorResult {
  const root = resolve(options.root ?? defaultRepoRoot());
  const scope = options.scope ?? "all";
  const issues: ConfigIssue[] = [];
  const checked: string[] = [];
  const envDir = join(root, "config", "env");
  const pluginDir = join(root, "config", "plugin");
  const reposDir = join(root, "config", "repos");
  const infra = infraDir(root);
  if (options.fix) {
    assertNoSymlinkPath(root, infra, "infra directory");
    mkdirSync(infra, { recursive: true, mode: 0o700 });
    chmodSync(infra, 0o700);
    if (scope === "all") {
      for (const dir of [envDir, pluginDir, reposDir]) {
        assertNoSymlinkPath(root, dir, "private config directory");
        mkdirSync(dir, { recursive: true, mode: 0o700 });
        chmodSync(dir, 0o700);
      }
    }
  }
  for (const example of ["hosts", "data_sources", "credentials"] as const) {
    const path = infraExamplePath(example, root);
    checked.push(path);
    if (!existsSync(path)) issue(issues, "error", path, "tracked example is missing");
  }
  checked.push(infra);
  checkPrivateDir(infra, issues, scope === "infra");
  for (const kind of ["hosts", "data_sources", "credentials"] as const) {
    const path = infraConfigPath(kind, root);
    checked.push(path);
    if (options.fix && existsSync(path) && !lstatSync(path).isSymbolicLink()) {
      chmodSync(path, 0o600);
    }
    checkPrivatePath(path, issues, scope === "infra", "private config");
  }
  if (
    ["hosts", "data_sources", "credentials"].every((kind) =>
      existsSync(infraConfigPath(kind as InfraConfigKind, root)),
    )
  ) {
    try {
      readInfraConfig(root);
    } catch (error) {
      issue(issues, "error", infra, (error as Error).message);
    }
  }
  checkTrackedPrivateFiles(root, ["config/infra"], issues, checked);
  const legacy = [
    join(root, "config.json"),
    join(root, "config", "source-repos.yaml"),
    join(root, "config", "repo-branch-mapping.yaml"),
  ];
  for (const path of legacy) {
    checked.push(path);
    if (existsSync(path)) issue(issues, "error", path, "legacy configuration path must be removed");
  }
  if (scope === "all") {
    checked.push(envDir, pluginDir, reposDir);
    checkPrivateDir(envDir, issues, true);
    checkPrivateDir(pluginDir, issues, true);
    checkPrivateDir(reposDir, issues, true);
    checkTrackedPrivateFiles(
      root,
      ["config/env", "config/plugin", "config/repos/sources.yaml"],
      issues,
      checked,
    );
    const envExample = join(envDir, "env.example.yaml");
    checked.push(envExample);
    if (!existsSync(envExample)) issue(issues, "error", envExample, "tracked example is missing");
    const sourcesExample = join(reposDir, "sources.example.yaml");
    checked.push(sourcesExample);
    if (!existsSync(sourcesExample)) {
      issue(issues, "error", sourcesExample, "tracked example is missing");
    }
    const sources = join(reposDir, "sources.yaml");
    checked.push(sources);
    checkPrivatePath(sources, issues, false, "private source-repository catalog");
  }
  return {
    ok: !issues.some((item) => item.level === "error"),
    scope,
    issues,
    checked: [...new Set(checked)],
  };
}
