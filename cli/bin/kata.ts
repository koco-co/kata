#!/usr/bin/env bun
// kata CLI 聚合入口。只用 commander 默认 -h/--help，不做 verb 白名单/隐藏命令过滤——
// 旧 bin 的 localizeHelp + publicV2Commands 白名单导致 verb 级 --help 冒泡到根命令，这里不回迁该机制。
import { Command } from "commander";
import { registerAutomation } from "../commands/automation.ts";
import { registerCases } from "../commands/cases.ts";
import { registerConfig } from "../commands/config.ts";
import { registerDefects } from "../commands/defects.ts";
import { registerEnv } from "../commands/env.ts";
import { registerFeatures } from "../commands/features.ts";
import { registerInfra } from "../commands/infra.ts";
import { registerKnowledge } from "../commands/knowledge.ts";
import { registerNotify } from "../commands/notify.ts";
import { registerPrd } from "../commands/prd.ts";
import { registerProject } from "../commands/project.ts";
import { registerRepo } from "../commands/repo.ts";
import { registerRepos } from "../commands/repos.ts";
import { registerRuns } from "../commands/runs.ts";
import { registerScans } from "../commands/scans.ts";
import { registerZentao } from "../commands/zentao.ts";

const program = new Command();
// 不注册根级 .version():commander 会用它拦截任意位置的 --version,
// 与子命令自身的版本参数避免冲突。
program.name("kata").description("kata 工作区命令行");

registerFeatures(program);
registerCases(program);
registerConfig(program);
registerRuns(program);
registerEnv(program);
registerRepo(program);
registerRepos(program);
registerKnowledge(program);
registerScans(program);
registerDefects(program);
registerInfra(program);
registerAutomation(program);
registerProject(program);
registerPrd(program);
registerZentao(program);
registerNotify(program);

const topLevel = process.argv[2];
if (
  topLevel &&
  !topLevel.startsWith("-") &&
  !program.commands.some((command) => command.name() === topLevel) &&
  process.argv.includes("--help")
) {
  process.stderr.write(`未知命令: ${topLevel}\n`);
  process.exit(1);
}

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(err instanceof Error && "exitCode" in err ? Number(err.exitCode) || 1 : 1);
});
