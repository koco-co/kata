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
import { dirname, join, relative, resolve } from "node:path";
import { parse, stringify } from "yaml";
import { readDotEnvFile } from "./env.ts";
import { repoRoot as defaultRepoRoot } from "./workspace-locator.ts";

export type PluginConfigName = "lanhu" | "zentao" | "notify";

export interface LanhuPluginConfig {
  schema_version?: number;
  cookie?: string;
  username?: string;
  password?: string;
}

export interface ZentaoPluginConfig {
  schema_version?: number;
  base_url?: string;
  cookie?: string;
  username?: string;
  password?: string;
}

export interface NotifyPluginConfig {
  schema_version?: number;
  dingtalk?: {
    webhook_url?: string;
    keyword?: string;
    sign_secret?: string;
  };
  feishu?: { webhook_url?: string };
  wecom?: { webhook_url?: string };
  smtp?: {
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

function pluginDir(root: string = defaultRepoRoot()): string {
  return join(resolve(root), "config", "plugin");
}

export function pluginConfigPath(name: PluginConfigName, root: string = defaultRepoRoot()): string {
  return join(pluginDir(root), `${name}.yaml`);
}

export function pluginExamplePath(
  name: PluginConfigName,
  root: string = defaultRepoRoot(),
): string {
  return join(pluginDir(root), `${name}.example.yaml`);
}

function readYamlObject(path: string): Record<string, unknown> {
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

function scalar(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function envOverride(
  configValue: unknown,
  env: NodeJS.ProcessEnv,
  key: string,
): string | undefined {
  const override = env[key];
  // 空字符串视为未设置(如 `VAR=` 的 shell 导出),回落到配置文件值
  if (override !== undefined && override !== "") return override;
  return scalar(configValue);
}

function writeYamlAtomic(path: string, value: unknown): void {
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
  writeYamlAtomic(path, value);
  return path;
}

export function updatePluginConfig(
  name: PluginConfigName,
  patch: Record<string, unknown>,
  root: string = defaultRepoRoot(),
): string {
  const path = pluginConfigPath(name, root);
  warnIfGitTracked(path, root);
  const current = readYamlObject(path);
  const merged: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (isRecord(value) && isRecord(merged[key])) merged[key] = { ...merged[key], ...value };
    else merged[key] = value;
  }
  return writePluginConfig(name, merged, root);
}

/** config/plugin/*.yaml 是本机私密配置,应被 gitignore;意外被 git 跟踪时写入前提醒。 */
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

export function loadLanhuConfig(
  root: string = defaultRepoRoot(),
  env: NodeJS.ProcessEnv = process.env,
): LanhuPluginConfig {
  const raw = readYamlObject(pluginConfigPath("lanhu", root));
  return {
    schema_version: typeof raw.schema_version === "number" ? raw.schema_version : 1,
    cookie: envOverride(raw.cookie, env, "KATA_LANHU_COOKIE"),
    username: envOverride(raw.username, env, "KATA_LANHU_USERNAME"),
    password: envOverride(raw.password, env, "KATA_LANHU_PASSWORD"),
  };
}

export function loadZentaoConfig(
  root: string = defaultRepoRoot(),
  env: NodeJS.ProcessEnv = process.env,
): ZentaoPluginConfig {
  const raw = readYamlObject(pluginConfigPath("zentao", root));
  return {
    schema_version: typeof raw.schema_version === "number" ? raw.schema_version : 1,
    base_url: envOverride(raw.base_url, env, "KATA_ZENTAO_BASE_URL"),
    cookie: envOverride(raw.cookie, env, "KATA_ZENTAO_COOKIE"),
    username: envOverride(raw.username, env, "KATA_ZENTAO_ACCOUNT"),
    password: envOverride(raw.password, env, "KATA_ZENTAO_PASSWORD"),
  };
}

export function loadNotifyConfig(
  root: string = defaultRepoRoot(),
  env: NodeJS.ProcessEnv = process.env,
): NotifyPluginConfig {
  const raw = readYamlObject(pluginConfigPath("notify", root));
  const dingtalk = isRecord(raw.dingtalk) ? raw.dingtalk : {};
  const feishu = isRecord(raw.feishu) ? raw.feishu : {};
  const wecom = isRecord(raw.wecom) ? raw.wecom : {};
  const smtp = isRecord(raw.smtp) ? raw.smtp : {};
  return {
    schema_version: typeof raw.schema_version === "number" ? raw.schema_version : 1,
    dingtalk: {
      webhook_url: envOverride(dingtalk.webhook_url, env, "KATA_DINGTALK_WEBHOOK_URL"),
      keyword: envOverride(dingtalk.keyword, env, "KATA_DINGTALK_KEYWORD"),
      sign_secret: envOverride(dingtalk.sign_secret, env, "KATA_DINGTALK_SIGN_SECRET"),
    },
    feishu: { webhook_url: envOverride(feishu.webhook_url, env, "KATA_FEISHU_WEBHOOK_URL") },
    wecom: { webhook_url: envOverride(wecom.webhook_url, env, "KATA_WECOM_WEBHOOK_URL") },
    smtp: {
      host: envOverride(smtp.host, env, "KATA_SMTP_HOST"),
      port: envOverride(smtp.port, env, "KATA_SMTP_PORT"),
      user: envOverride(smtp.user, env, "KATA_SMTP_USER"),
      pass: envOverride(smtp.pass, env, "KATA_SMTP_PASS"),
      from: envOverride(smtp.from, env, "KATA_SMTP_FROM"),
      to: envOverride(smtp.to, env, "KATA_SMTP_TO"),
      secure: envOverride(smtp.secure, env, "KATA_SMTP_SECURE"),
    },
  };
}

export function loadPluginConfigs(
  root: string = defaultRepoRoot(),
  env: NodeJS.ProcessEnv = process.env,
): PluginConfigSet {
  return {
    lanhu: loadLanhuConfig(root, env),
    zentao: loadZentaoConfig(root, env),
    notify: loadNotifyConfig(root, env),
  };
}

/** One-shot migration helper; it reads a caller-supplied dotenv path explicitly. */
export function migrateDotEnvPlugins(
  sourcePath: string,
  root: string = defaultRepoRoot(),
): { written: string[]; removedKeys: string[] } {
  const values = readDotEnvFile(resolve(sourcePath));
  const written: string[] = [];
  const lanhu: LanhuPluginConfig = {
    schema_version: 1,
    cookie: values.KATA_LANHU_COOKIE,
    username: values.KATA_LANHU_USERNAME,
    password: values.KATA_LANHU_PASSWORD,
  };
  const zentao: ZentaoPluginConfig = {
    schema_version: 1,
    base_url: values.KATA_ZENTAO_BASE_URL,
    cookie: values.KATA_ZENTAO_COOKIE,
    username: values.KATA_ZENTAO_ACCOUNT,
    password: values.KATA_ZENTAO_PASSWORD,
  };
  const notify: NotifyPluginConfig = {
    schema_version: 1,
    dingtalk: {
      webhook_url: values.KATA_DINGTALK_WEBHOOK_URL,
      keyword: values.KATA_DINGTALK_KEYWORD,
      sign_secret: values.KATA_DINGTALK_SIGN_SECRET,
    },
    feishu: { webhook_url: values.KATA_FEISHU_WEBHOOK_URL },
    wecom: { webhook_url: values.KATA_WECOM_WEBHOOK_URL },
    smtp: {
      host: values.KATA_SMTP_HOST,
      port: values.KATA_SMTP_PORT,
      user: values.KATA_SMTP_USER,
      pass: values.KATA_SMTP_PASS,
      from: values.KATA_SMTP_FROM,
      to: values.KATA_SMTP_TO,
      secure: values.KATA_SMTP_SECURE,
    },
  };
  const compact = (value: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (isRecord(item)) {
        const nested = compact(item);
        if (Object.keys(nested).length > 0) result[key] = nested;
      } else if (item !== undefined && item !== "") {
        result[key] = item;
      }
    }
    return result;
  };
  for (const [name, value] of Object.entries({ lanhu, zentao, notify }) as Array<
    [PluginConfigName, Record<string, unknown>]
  >) {
    const payload = compact(value);
    if (Object.keys(payload).length === 0) continue;
    written.push(writePluginConfig(name, payload, root));
  }
  return {
    written,
    removedKeys: [
      "KATA_LANHU_COOKIE",
      "KATA_LANHU_USERNAME",
      "KATA_LANHU_PASSWORD",
      "KATA_ZENTAO_BASE_URL",
      "KATA_ZENTAO_COOKIE",
      "KATA_ZENTAO_ACCOUNT",
      "KATA_ZENTAO_PASSWORD",
      "KATA_DINGTALK_WEBHOOK_URL",
      "KATA_DINGTALK_KEYWORD",
      "KATA_DINGTALK_SIGN_SECRET",
      "KATA_FEISHU_WEBHOOK_URL",
      "KATA_WECOM_WEBHOOK_URL",
      "KATA_SMTP_HOST",
      "KATA_SMTP_PORT",
      "KATA_SMTP_USER",
      "KATA_SMTP_PASS",
      "KATA_SMTP_FROM",
      "KATA_SMTP_TO",
    ].filter((key) => values[key] !== undefined),
  };
}
