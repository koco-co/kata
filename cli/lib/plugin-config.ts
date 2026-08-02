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
import { dirname, relative, resolve, sep } from "node:path";
import { parse, stringify } from "yaml";
import { effectivePrivatePath, integrationsExamplePath } from "./config-paths.ts";
import { assertNoSymlinkPath } from "./features-layout.ts";
import { repoRoot as defaultRepoRoot } from "./workspace-locator.ts";

export type PluginConfigName = "lanhu" | "zentao" | "notify";

export interface LanhuPluginConfig {
  cookie?: string;
  username?: string;
  password?: string;
}

export interface ZentaoPluginConfig {
  base_url?: string;
  cookie?: string;
  username?: string;
  password?: string;
}

export interface NotifyPluginConfig {
  /** Global notification switch. Missing values retain the safe documented default (true). */
  is_enable?: boolean;
  /** Explicit event allow-list. Missing or empty means no real notification is sent. */
  enabled_events?: string[];
  dingtalk?: {
    is_enable?: boolean;
    webhook_url?: string;
    keyword?: string;
    sign_secret?: string;
  };
  feishu?: { is_enable?: boolean; webhook_url?: string };
  wecom?: { is_enable?: boolean; webhook_url?: string };
  smtp?: {
    is_enable?: boolean;
    host?: string;
    port?: string | number;
    user?: string;
    pass?: string;
    from?: string;
    to?: string;
    secure?: string | boolean;
  };
}

export interface PluginConfigSet {
  lanhu: LanhuPluginConfig;
  zentao: ZentaoPluginConfig;
  notify: NotifyPluginConfig;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function pluginConfigPath(name: PluginConfigName, root: string = defaultRepoRoot()): string {
  return effectivePrivatePath(`integrations/${name}.yaml`, root);
}

export function pluginExamplePath(
  name: PluginConfigName,
  root: string = defaultRepoRoot(),
): string {
  return integrationsExamplePath(name, root);
}

function assertPluginPath(path: string, root: string): void {
  const resolvedRoot = resolve(root);
  const resolvedPath = resolve(path);
  if (resolvedPath === resolvedRoot || resolvedPath.startsWith(`${resolvedRoot}${sep}`)) {
    assertNoSymlinkPath(resolvedRoot, resolvedPath, "plugin config");
    return;
  }
  assertNoSymlinkPath(dirname(resolvedPath), resolvedPath, "shared plugin config");
}

function readYamlObject(path: string, root: string): Record<string, unknown> {
  assertPluginPath(path, root);
  if (!existsSync(path)) return {};
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) throw new Error(`${path} must not be a symbolic link`);
  let parsed: unknown;
  try {
    parsed = parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`${path} is invalid YAML: ${(error as Error).message}`);
  }
  return isRecord(parsed) ? parsed : {};
}

/** 从 YAML 未知标量窄化到 string（数字/布尔转字面量，与历史行为一致）。 */
function scalar(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string" && /^(?:true|false)$/i.test(value.trim())) {
    return value.trim().toLowerCase() === "true";
  }
  return undefined;
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) return undefined;
  return value.map((item) => item.trim()).filter(Boolean);
}

function writeYamlAtomic(path: string, value: unknown, root: string): void {
  assertPluginPath(path, root);
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

export function writePluginConfig(
  name: PluginConfigName,
  value: Record<string, unknown>,
  root: string = defaultRepoRoot(),
): string {
  const path = pluginConfigPath(name, root);
  writeYamlAtomic(path, value, root);
  return path;
}

export function updatePluginConfig(
  name: PluginConfigName,
  patch: Record<string, unknown>,
  root: string = defaultRepoRoot(),
): string {
  const path = pluginConfigPath(name, root);
  assertPluginPath(path, root);
  warnIfGitTracked(path, root);
  const current = readYamlObject(path, root);
  const merged: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (isRecord(value) && isRecord(merged[key])) merged[key] = { ...merged[key], ...value };
    else merged[key] = value;
  }
  return writePluginConfig(name, merged, root);
}

/** config/private/integrations/*.yaml 是本机私密配置,应被 gitignore;意外被 git 跟踪时写入前提醒。 */
function warnIfGitTracked(path: string, root: string): void {
  try {
    const rel = relative(resolve(root), path);
    execFileSync("git", ["-C", resolve(root), "ls-files", "--error-unmatch", "--", rel], {
      stdio: "pipe",
    });
    process.stderr.write(`[plugin-config] 警告:${rel} 被 git 跟踪,私密配置不应入库\n`);
  } catch {
    // 未被跟踪或非 git 仓库:无需警告
  }
}

export function loadLanhuConfig(root: string = defaultRepoRoot()): LanhuPluginConfig {
  const raw = readYamlObject(pluginConfigPath("lanhu", root), root);
  return {
    cookie: scalar(raw.cookie),
    username: scalar(raw.username),
    password: scalar(raw.password),
  };
}

export function loadZentaoConfig(root: string = defaultRepoRoot()): ZentaoPluginConfig {
  const raw = readYamlObject(pluginConfigPath("zentao", root), root);
  return {
    base_url: scalar(raw.base_url),
    cookie: scalar(raw.cookie),
    username: scalar(raw.username),
    password: scalar(raw.password),
  };
}

export function loadNotifyConfig(root: string = defaultRepoRoot()): NotifyPluginConfig {
  const raw = readYamlObject(pluginConfigPath("notify", root), root);
  const dingtalk = isRecord(raw.dingtalk) ? raw.dingtalk : {};
  const feishu = isRecord(raw.feishu) ? raw.feishu : {};
  const wecom = isRecord(raw.wecom) ? raw.wecom : {};
  const smtp = isRecord(raw.smtp) ? raw.smtp : {};
  return {
    is_enable: booleanValue(raw.is_enable) ?? true,
    enabled_events: stringArray(raw.enabled_events),
    dingtalk: {
      is_enable: booleanValue(dingtalk.is_enable) ?? true,
      webhook_url: scalar(dingtalk.webhook_url),
      keyword: scalar(dingtalk.keyword),
      sign_secret: scalar(dingtalk.sign_secret),
    },
    feishu: {
      is_enable: booleanValue(feishu.is_enable) ?? true,
      webhook_url: scalar(feishu.webhook_url),
    },
    wecom: {
      is_enable: booleanValue(wecom.is_enable) ?? true,
      webhook_url: scalar(wecom.webhook_url),
    },
    smtp: {
      is_enable: booleanValue(smtp.is_enable) ?? true,
      host: scalar(smtp.host),
      port: scalar(smtp.port),
      user: scalar(smtp.user),
      pass: scalar(smtp.pass),
      from: scalar(smtp.from),
      to: scalar(smtp.to),
      secure: scalar(smtp.secure),
    },
  };
}

export function loadPluginConfigs(root: string = defaultRepoRoot()): PluginConfigSet {
  return {
    lanhu: loadLanhuConfig(root),
    zentao: loadZentaoConfig(root),
    notify: loadNotifyConfig(root),
  };
}
