import { outputJson } from "@shared/lib/cli.ts";
import {
  addDataAssetsEnv,
  diagnoseDataAssetsEnv,
  discoverDataAssetsEnv,
  listDataAssetsEnvs,
  migrateDataAssetsEnvs,
  runDataAssetsCommand,
  setDataAssetsCookie,
  showDataAssetsEnv,
} from "@shared/lib/dataassets-env.ts";
import { Command } from "commander";
import { setRootEnv } from "./env-config.ts";

interface LegacyEnvOptions {
  readonly project?: string;
  readonly env?: string;
}

function deprecated(message: string): void {
  process.stderr.write(`[deprecated] ${message}\n`);
}

function selectedName(name: string | undefined, opts: LegacyEnvOptions): string {
  if (opts.project && opts.project !== "dataAssets") {
    throw new Error("the v2 environment store currently supports only project dataAssets");
  }
  if (opts.env) deprecated("use a positional environment name instead of --project/--env");
  const selected = name ?? opts.env;
  if (!selected) throw new Error("environment name is required");
  return selected;
}

async function readStdinCookie(): Promise<string> {
  let input = "";
  for await (const chunk of process.stdin) input += String(chunk);
  return input;
}

function addLegacyOptions(command: Command): Command {
  return command
    .option("--project <name>", "兼容参数，仅支持 dataAssets")
    .option("--env <name>", "兼容参数，请改用位置参数");
}

export function buildEnvCommand(): Command {
  const env = new Command("env").description("管理本机私密的 DataAssets 平台环境");

  env
    .command("list")
    .description("列出 config/env 中的平台环境，不显示 Cookie")
    .action(() => outputJson(listDataAssetsEnvs()));

  addLegacyOptions(
    env
      .command("show")
      .description("显示单个平台环境，Cookie 始终脱敏")
      .argument("[name]", "环境名称"),
  ).action((name: string | undefined, opts: LegacyEnvOptions) => {
    outputJson(showDataAssetsEnv(selectedName(name, opts)));
  });

  env
    .command("add")
    .description("创建安全权限的环境 YAML 骨架")
    .argument("<name>", "环境名称")
    .requiredOption("--url <url>", "平台根 URL")
    .action((name: string, opts: { url: string }) => outputJson(addDataAssetsEnv(name, opts.url)));

  const cookie = new Command("cookie").description("管理环境 Cookie");
  cookie
    .command("set")
    .description("从 stdin 读取并在线验证 Cookie，成功后原子替换")
    .argument("<name>", "环境名称")
    .requiredOption("--stdin", "必须从 stdin 读取，避免进入 shell 历史")
    .action(async (name: string) =>
      outputJson(await setDataAssetsCookie(name, await readStdinCookie())),
    );
  env.addCommand(cookie);

  env
    .command("discover")
    .description("只读展示平台上可选的项目与数据源")
    .argument("<name>", "环境名称")
    .option("--cookie-stdin", "从 stdin 临时读取 Cookie，不写入环境文件", false)
    .action(async (name: string, opts: { cookieStdin: boolean }) =>
      outputJson(
        await discoverDataAssetsEnv(
          name,
          opts.cookieStdin ? { cookie: await readStdinCookie() } : undefined,
        ),
      ),
    );

  addLegacyOptions(
    env
      .command("doctor")
      .description("检查一个或全部环境的 schema、权限、凭据和在线精确解析")
      .argument("[name]", "环境名称")
      .option("--all", "检查全部环境", false)
      .option("--offline", "仅做本地检查", false),
  ).action(
    async (
      name: string | undefined,
      opts: LegacyEnvOptions & { all: boolean; offline: boolean },
    ) => {
      if (opts.all && (name || opts.env))
        throw new Error("environment name and --all are mutually exclusive");
      const names = opts.all
        ? listDataAssetsEnvs().map((item) => item.name)
        : [selectedName(name, opts)];
      const results = await Promise.all(
        names.map((item) => diagnoseDataAssetsEnv(item, { offline: opts.offline })),
      );
      outputJson(opts.all ? results : results[0]);
      if (results.some((result) => !result.ok)) process.exitCode = 2;
    },
  );

  env
    .command("run")
    .description("在线精确解析环境后运行命令")
    .argument("<name>", "环境名称")
    .argument("<command...>", "要运行的命令；建议在前面使用 --")
    .allowUnknownOption(true)
    .action(async (name: string, command: string[]) => {
      const args = command[0] === "--" ? command.slice(1) : command;
      process.exitCode = await runDataAssetsCommand(name, args);
    });

  env
    .command("migrate-dataassets")
    .description("从旧 _shared/env profile 预览或迁移全部 DataAssets 环境")
    .option("--apply", "写入 config/env 并在在线验证后删除旧 Cookie 文件", false)
    .action(async (opts: { apply: boolean }) => {
      const result = await migrateDataAssetsEnvs({ apply: opts.apply });
      outputJson(result);
      if (!result.ok) process.exitCode = 2;
    });

  env
    .command("set")
    .description("设置根目录统一 .env 配置，输出不回显值")
    .argument("<key>", "环境变量名")
    .argument("<value>", "环境变量值")
    .action((key: string, value: string) => outputJson(setRootEnv({ key, value })));

  const legacyResolve = addLegacyOptions(
    new Command("resolve")
      .description("兼容入口，请改用 kata env show <name>")
      .argument("[name]", "环境名称"),
  ).action((name: string | undefined, opts: LegacyEnvOptions) => {
    deprecated("kata env resolve is replaced by kata env show");
    outputJson(showDataAssetsEnv(selectedName(name, opts)));
  });
  env.addCommand(legacyResolve, { hidden: true });

  const legacyCheck = addLegacyOptions(
    new Command("check")
      .description("兼容入口，请改用 kata env doctor <name>")
      .argument("[name]", "环境名称"),
  ).action(async (name: string | undefined, opts: LegacyEnvOptions) => {
    deprecated("kata env check is replaced by kata env doctor");
    const result = await diagnoseDataAssetsEnv(selectedName(name, opts));
    outputJson(result);
    if (!result.ok) process.exitCode = 2;
  });
  env.addCommand(legacyCheck, { hidden: true });

  return env;
}
