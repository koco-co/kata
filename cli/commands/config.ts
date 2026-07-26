import type { Command } from "commander";
import { outputJson } from "../lib/cli.ts";
import { runConfigDoctor } from "../lib/infra-config.ts";

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
}
