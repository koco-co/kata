import { existsSync } from "node:fs";
import { loadConfig } from "../core/config/load";
import type { DtStackCliConfig } from "../core/config/schema";
import { DtStackClient } from "../core/http/client";
import { getSession, login, logout, whoami } from "../sdk/auth";
import { ensureProject } from "../sdk/ensure-project";
import { execSql } from "../sdk/exec-sql";
import { pingSql } from "../sdk/ping-sql";
import { precondSetup } from "../sdk/precond-setup";
import { parseFlags } from "./parse-args";

const DRY_RUN = process.env.DTSTACK_CLI_TEST_DRY === "1";

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === "") return undefined;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new Error(`expected positive number, got ${String(value)}`);
  }
  return numberValue;
}

function optionalCsv(value: unknown): string[] | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * 解析配置文件路径。
 * 优先级：--config 参数 > DTSTACK_CONFIG 环境变量 > dtstack-cli.yaml（存在时）
 * 若都不存在则返回 undefined，后续走环境变量回退。
 */
function resolveConfigPath(values: Record<string, unknown>): string | undefined {
  const explicit = (values.config as string | undefined) ?? process.env.DTSTACK_CONFIG;
  if (explicit) return explicit;
  if (existsSync("dtstack-cli.yaml")) return "dtstack-cli.yaml";
  return undefined;
}

/**
 * 解析环境名。
 * 优先级：--env 参数 > ACTIVE_ENV > DTSTACK_DEFAULT_ENV > config.defaultEnv > "ltqc"
 */
function resolveEnv(values: Record<string, unknown>, config?: DtStackCliConfig): string {
  return (
    (values.env as string | undefined) ??
    process.env.ACTIVE_ENV ??
    process.env.DTSTACK_DEFAULT_ENV ??
    config?.defaultEnv ??
    "ltqc"
  );
}

/**
 * 从环境变量构建最小配置（无 YAML 文件时的回退）。
 * 读取 {ENV}_BASE_URL 作为 baseUrl。
 */
function loadConfigFromEnv(env: string): DtStackCliConfig {
  const envUpper = env.toUpperCase();
  const baseUrlKey = `${envUpper}_BASE_URL`;
  const baseUrl = process.env[baseUrlKey];
  if (!baseUrl) {
    throw new Error(
      `Environment "${env}" not configured: no dtstack-cli.yaml found and ${baseUrlKey} env var is not set. ` +
        `Create dtstack-cli.yaml or set ${baseUrlKey}=<url>`,
    );
  }
  return { environments: { [env]: { baseUrl } }, datasources: {} };
}

async function buildClient(config: DtStackCliConfig, env: string): Promise<DtStackClient> {
  const session = await getSession(env, config);
  return new DtStackClient({ baseUrl: config.environments[env].baseUrl, cookie: session.cookie });
}

export async function dispatchCommand(args: ReadonlyArray<string>): Promise<void> {
  const isTwoWord = args.length > 1 && args[1] && !args[1].startsWith("-");
  const cmd = args.slice(0, isTwoWord ? 2 : 1).join(" ");
  const restArgs = args.slice(isTwoWord ? 2 : 1);
  const { values } = parseFlags(restArgs);

  if (DRY_RUN) {
    const mode = (values.mode as string | undefined) === "direct" ? "direct" : "platform";
    process.stdout.write(
      JSON.stringify({
        command: cmd,
        ...values,
        mode,
        engines: values.engines ? String(values.engines).split(",") : undefined,
        tablesFrom: values["tables-from"],
      }),
    );
    process.stdout.write("\n");
    return;
  }

  // 解析配置：优先 dtstack-cli.yaml，回退到环境变量 {ENV}_BASE_URL
  const configPath = resolveConfigPath(values);
  let config: DtStackCliConfig;
  let env: string;
  if (configPath) {
    config = loadConfig(configPath);
    env = resolveEnv(values, config);
  } else {
    env = resolveEnv(values);
    config = loadConfigFromEnv(env);
  }

  switch (cmd) {
    case "login": {
      const session = await login({
        env,
        config,
        username: values.username as string | undefined,
        password: values.password as string | undefined,
      });
      process.stdout.write(`logged in as ${session.user} (env=${env})\n`);
      return;
    }
    case "logout": {
      await logout(env);
      process.stdout.write(`session cleared for env=${env}\n`);
      return;
    }
    case "whoami": {
      const s = await whoami(env);
      process.stdout.write(
        s
          ? `${s.user} (tenant=${s.tenantName ?? "?"}, env=${env})\n`
          : `no session for env=${env}\n`,
      );
      return;
    }
    case "sql exec": {
      const mode = (values.mode as string | undefined) === "direct" ? "direct" : "platform";
      if (mode === "direct") {
        const source = values.source as string | undefined;
        if (!source) throw new Error("--source required in direct mode");
        const ds = config.datasources[source];
        if (!ds) throw new Error(`datasource not in config: ${source}`);
        await execSql({
          mode: "direct",
          connection: ds,
          sql: values.sql as string | undefined,
          file: values.file as string | undefined,
        });
      } else {
        const client = await buildClient(config, env);
        await execSql({
          mode: "platform",
          project: values.project as string,
          datasource: values.datasource as string,
          sql: values.sql as string | undefined,
          file: values.file as string | undefined,
          autoCreate: Boolean(values["auto-create"]),
          client,
        });
      }
      return;
    }
    case "sql ping": {
      const mode = (values.mode as string | undefined) === "direct" ? "direct" : "platform";
      let ok = false;
      if (mode === "direct") {
        const ds = config.datasources[values.source as string];
        ok = await pingSql({ mode: "direct", connection: ds });
      } else {
        const client = await buildClient(config, env);
        ok = await pingSql({
          mode: "platform",
          project: values.project as string,
          datasource: values.datasource as string,
          client,
        });
      }
      process.stdout.write(ok ? "ok\n" : "fail\n");
      process.exit(ok ? 0 : 1);
      return;
    }
    case "project ensure": {
      const client = await buildClient(config, env);
      const project = await ensureProject({
        client,
        name: values.name as string,
        ownerId: values["owner-id"] ? Number(values["owner-id"]) : undefined,
        engines: values.engines ? String(values.engines).split(",") : undefined,
      });
      process.stdout.write(`project: id=${project.id} name=${project.projectName}\n`);
      return;
    }
    case "precond setup": {
      const client = await buildClient(config, env);
      const result = await precondSetup({
        client,
        project: values.project as string,
        projectId: optionalNumber(values["project-id"]),
        datasource: values.datasource as string,
        datasourceProfile: {
          id: optionalNumber(values["datasource-id"]),
          name: values["datasource-name"] as string | undefined,
          typeId: optionalNumber(values["datasource-type-id"]),
          aliases: optionalCsv(values["datasource-aliases"]),
          database: (values.database as string | undefined) ?? (values.db as string | undefined),
          schema: values.schema as string | undefined,
        },
        database: (values.database as string | undefined) ?? (values.db as string | undefined),
        tablesFromFile: values["tables-from"] as string | undefined,
        skipSync: Boolean(values["skip-sync"]),
        syncTimeoutMs: values["sync-timeout"] ? Number(values["sync-timeout"]) * 1000 : undefined,
      });
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      if (!result.syncComplete && !values["skip-sync"]) process.exit(2);
      return;
    }
    default:
      throw new Error(`unknown command: ${cmd}`);
  }
}
