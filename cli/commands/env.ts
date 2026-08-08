import type { Command } from "commander";
import { outputJson } from "../lib/cli.ts";
import {
  addPlatformEnv,
  diagnosePlatformEnv,
  listPlatformEnvs,
  runPlatformEnvCommand,
  setPlatformEnvCookie,
  showPlatformEnv,
} from "../lib/platform-env.ts";

async function readStdinCookie(): Promise<string> {
  let input = "";
  for await (const chunk of process.stdin) input += String(chunk);
  return input;
}

function inheritedEnvNames(value: string): string[] {
  return value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

/** Build the `env` command: list / show / doctor / run / cookie set. */
export function registerEnv(program: Command): void {
  const env = program.command("env").description("管理本机私密的平台环境");

  env
    .command("add")
    .description("创建一个本机私密平台环境模板")
    .argument("<name>", "环境名称")
    .requiredOption("--url <url>", "平台根地址")
    .action((name: string, opts: { url: string }) => outputJson(addPlatformEnv(name, opts.url)));

  env
    .command("list")
    .description("列出 config/private/environments 中的平台环境，不显示 Cookie")
    .action(() => outputJson(listPlatformEnvs()));

  env
    .command("show")
    .description("显示单个平台环境，Cookie 始终脱敏")
    .argument("<name>", "环境名称")
    .action((name: string) => outputJson(showPlatformEnv(name)));

  env
    .command("doctor")
    .description("检查一个或全部环境的配置、权限、凭据和在线精确解析")
    .argument("[name]", "环境名称")
    .option("--all", "检查全部环境", false)
    .option("--offline", "仅做本地检查", false)
    .action(async (name: string | undefined, opts: { all: boolean; offline: boolean }) => {
      if (opts.all && name) throw new Error("环境名与 --all 互斥");
      if (!opts.all && !name) throw new Error("环境名必填，或用 --all");
      const names = opts.all ? listPlatformEnvs().map((item) => item.name) : [name as string];
      const results = await Promise.all(
        names.map((item) => diagnosePlatformEnv(item, { offline: opts.offline })),
      );
      outputJson(opts.all ? results : results[0]);
      if (results.some((result) => !result.ok)) process.exitCode = 2;
    });

  env
    .command("run")
    .description("在线精确解析环境后运行命令")
    .argument("<name>", "环境名称")
    .argument("<command...>", "要运行的命令；建议在前面使用 --")
    .option("--project <name>", "工作区项目名；用于项目级 Playwright 与 feature 发现")
    .option("--inherit-env <names>", "额外继承的环境变量名，逗号分隔", "")
    .allowUnknownOption(true)
    .action(
      async (name: string, command: string[], opts: { project?: string; inheritEnv: string }) => {
        // commander 会吞掉字面量 `--` 并把其后 token 全数收进 variadic operand,无需再剥
        process.exitCode = await runPlatformEnvCommand(name, command, {
          project: opts.project,
          inheritEnv: inheritedEnvNames(opts.inheritEnv),
        });
      },
    );

  const cookie = env.command("cookie").description("管理环境 Cookie");
  cookie
    .command("set")
    .description("从 stdin 读取并在线验证 Cookie，成功后原子写入当前 worktree 本地环境")
    .argument("<name>", "环境名称")
    .requiredOption("--stdin", "必须从 stdin 读取，避免进入 shell 历史")
    .action(async (name: string) =>
      outputJson(await setPlatformEnvCookie(name, await readStdinCookie())),
    );
}
