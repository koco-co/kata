import { outputJson } from "@shared/lib/cli.ts";
import { Command } from "commander";
import {
  diagnoseEnvConfig,
  migrateEnvAuthCookie,
  migrateLegacyEnvLocal,
  migrateProfileSecrets,
  migrateZentaoSession,
  resolveEnvSources,
  runEnvCheck,
  setRootEnv,
} from "./env-check.ts";

export function buildEnvCommand(): Command {
  const env = new Command("env").description("环境配置与平台 API 检查");
  env
    .command("check")
    .description("检查环境配置与平台连通性")
    .requiredOption("--project <name>", "项目名（必填）")
    .requiredOption("--env <name>", "环境配置名称")
    .action(async (opts: { project: string; env: string }) => {
      const r = await runEnvCheck(opts);
      outputJson(r);
      if (!r.dtstackReachable) process.exit(2);
    });
  env
    .command("resolve")
    .description("解析根 .env 与指定项目环境 profile，只显示来源和配置状态")
    .requiredOption("--project <name>", "项目名（必填）")
    .requiredOption("--env <name>", "环境配置名称")
    .action((opts: { project: string; env: string }) => {
      outputJson(resolveEnvSources(opts));
    });
  env
    .command("doctor")
    .description("检查旧 dotenv overlay、文件权限与被 Git 跟踪的 cookie")
    .requiredOption("--project <name>", "项目名（必填）")
    .requiredOption("--env <name>", "环境配置名称")
    .action((opts: { project: string; env: string }) => {
      const result = diagnoseEnvConfig(opts);
      outputJson(result);
      if (!result.ok) process.exit(2);
    });
  env
    .command("migrate-local")
    .description("验证并迁移旧 .env.local；默认仅预览，--apply 后删除旧文件")
    .requiredOption("--project <name>", "项目名（必填）")
    .option("--apply", "执行迁移并删除旧 .env.local", false)
    .action((opts: { project: string; apply: boolean }) => {
      outputJson(migrateLegacyEnvLocal(opts));
    });
  env
    .command("migrate-profile-secrets")
    .description("把 profile 中的 auth.cookie 迁入忽略的 .local YAML；默认仅预览")
    .requiredOption("--project <name>", "项目名（必填）")
    .option("--apply", "执行迁移并清空基础 profile 的 cookie", false)
    .action((opts: { project: string; apply: boolean }) => {
      outputJson(migrateProfileSecrets(opts));
    });
  env
    .command("migrate-auth")
    .description("把 Playwright storageState cookie 迁移到环境 YAML 的 auth.cookie")
    .requiredOption("--project <name>", "项目名（必填）")
    .requiredOption("--env <name>", "环境配置名称")
    .requiredOption("--session <path>", "待迁移的 storageState JSON 路径")
    .action((opts: { project: string; env: string; session: string }) => {
      outputJson(migrateEnvAuthCookie(opts));
    });
  env
    .command("migrate-zentao-session")
    .description("把旧 .kata ZenTao cookie 迁移到根目录 .env 的 KATA_ZENTAO_COOKIE")
    .requiredOption("--session <path>", "待迁移的旧 ZenTao session.json 路径")
    .action((opts: { session: string }) => {
      outputJson(migrateZentaoSession(opts));
    });
  env
    .command("set")
    .description("设置根目录统一 .env 配置（输出不会回显配置值）")
    .argument("<key>", "环境变量名")
    .argument("<value>", "环境变量值")
    .action((key: string, value: string) => {
      outputJson(setRootEnv({ key, value }));
    });
  return env;
}
