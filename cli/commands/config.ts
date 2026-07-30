import { type Command, Option } from "commander";
import { outputJson } from "../lib/cli.ts";
import { runConfigDoctor } from "../lib/infra-config.ts";
import { migrateDotEnvPlugins } from "../lib/plugin-config.ts";

export function registerConfig(program: Command): void {
  const config = program.command("config").description("运行时配置检查");

  config
    .command("doctor")
    .description("检查配置目录、示例、权限、Schema 引用和旧路径")
    .option("--scope <scope>", "检查范围: all 或 infra", "all")
    .option("--fix", "只修复目录和权限，不创建凭据")
    .option("--exit-code", "存在错误时退出码为 1")
    .action((opts: { scope: string; fix?: boolean; exitCode?: boolean }) => {
      if (opts.scope !== "all" && opts.scope !== "infra") {
        throw new Error("--scope must be all or infra");
      }
      const result = runConfigDoctor({
        scope: opts.scope as "all" | "infra",
        fix: opts.fix,
      });
      outputJson(result);
      if (opts.exitCode && !result.ok) process.exitCode = 1;
    });

  config
    .command("plugins-migrate")
    .description("从显式指定的旧 dotenv 文件迁移插件配置；默认 dry-run")
    .requiredOption("--source <path>", "旧 dotenv 文件路径")
    .addOption(
      new Option("--root <path>", "目标 Kata 工作区根目录").default(process.cwd(), "<kata-root>"),
    )
    .option("--apply", "写入 config/plugin/*.yaml")
    .action((opts: { source: string; root: string; apply?: boolean }) => {
      if (!opts.apply) {
        outputJson({ dry_run: true, source: opts.source, apply_hint: "--apply" });
        return;
      }
      const result = migrateDotEnvPlugins(opts.source, opts.root);
      outputJson({ ok: true, written: result.written, migrated_keys: result.removedKeys });
    });
}
