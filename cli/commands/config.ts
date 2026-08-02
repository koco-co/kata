import type { Command } from "commander";
import { outputJson } from "../lib/cli.ts";
import {
  applyConfigDocs,
  listFamilies,
  showFamily,
  validateAllConfig,
} from "../lib/config-registry.ts";
import { runConfigDoctor } from "../lib/infra-config.ts";

export function registerConfig(program: Command): void {
  const config = program.command("config").description("运行时配置检查");

  config
    .command("list")
    .description("按注册表列出全部配置族：路径、私密性、职责与 example 模板")
    .action(() => outputJson(listFamilies()));

  config
    .command("show")
    .description("显示一个配置族的有效配置，敏感字段一律脱敏")
    .argument("<family>", "配置族名，见 config list")
    .action((family: string) => outputJson(showFamily(family)));

  config
    .command("validate")
    .description("校验全部配置族：结构、未知字段、example 完整性、权限")
    .option("--exit-code", "存在错误时退出码为 1")
    .action((opts: { exitCode?: boolean }) => {
      const result = validateAllConfig();
      outputJson(result);
      if (opts.exitCode && !result.ok) process.exitCode = 1;
    });

  config
    .command("docs")
    .description("重写 config/README.md 生成区；--check 只校验不一致时退出码为 1")
    .option("--check", "只校验不写入", false)
    .action((opts: { check: boolean }) => {
      const result = applyConfigDocs("config/README.md", undefined, { check: opts.check });
      outputJson(result);
      if (opts.check && !result.ok) process.exitCode = 1;
    });

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
