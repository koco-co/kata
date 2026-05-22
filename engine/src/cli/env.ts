import { Command } from "commander";
import { outputJson } from "../../lib/cli.ts";
import { runEnvCheck } from "./env-check.ts";

export function buildEnvCommand(): Command {
  const env = new Command("env").description("环境配置与平台 API 检查");
  env
    .command("check")
    .description("校验环境配置 + 平台可达")
    .option("--project <name>", "项目名", "dataAssets")
    .requiredOption("--env <name>", "env profile name")
    .action(async (opts: { project: string; env: string }) => {
      const r = await runEnvCheck(opts);
      outputJson(r);
      if (!r.dtstackReachable) process.exit(2);
    });
  return env;
}
