#!/usr/bin/env bun
// kata CLI 聚合入口。只用 commander 默认 -h/--help，不做 verb 白名单/隐藏命令过滤——
// 旧 bin 的 localizeHelp + publicV2Commands 白名单导致 verb 级 --help 冒泡到根命令，这里不回迁该机制。
import { existsSync, readFileSync } from "node:fs";
import { Command } from "commander";
import { registerAutomation } from "../commands/automation.ts";
import { registerCases } from "../commands/cases.ts";
import { registerDefects } from "../commands/defects.ts";
import { registerEnv } from "../commands/env.ts";
import { registerFeatures } from "../commands/features.ts";
import { registerHandoff } from "../commands/handoff.ts";
import { registerKnowledge } from "../commands/knowledge.ts";
import { registerLanhu } from "../commands/lanhu.ts";
import { registerNotify } from "../commands/notify.ts";
import { registerProject } from "../commands/project.ts";
import { registerRepos } from "../commands/repos.ts";
import { registerRuns } from "../commands/runs.ts";
import { registerScans } from "../commands/scans.ts";
import { registerXmind } from "../commands/xmind.ts";
import { registerZentao } from "../commands/zentao.ts";

// 轻量 dotenv：只加载仓库根 .env（若存在），让 KATA_SOURCE_* 等集成变量进入进程环境。
// 不覆盖已有环境变量；无第三方依赖。
function loadRootEnv(): void {
  try {
    const root = new URL("../../", import.meta.url).pathname;
    const envPath = `${root}.env`;
    if (!existsSync(envPath)) return;
    for (const line of readFileSync(envPath, "utf-8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key] !== undefined) continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // .env 加载失败不阻塞命令
  }
}

loadRootEnv();

const program = new Command();
// 不注册根级 .version():commander 会用它拦截任意位置的 --version,
// 与 `kata xmind generate --version <PRD 版本>` 子命令选项冲突(子命令永远收不到)。
program.name("kata").description("kata 工作区命令行");

registerFeatures(program);
registerCases(program);
registerXmind(program);
registerRuns(program);
registerEnv(program);
registerRepos(program);
registerKnowledge(program);
registerScans(program);
registerDefects(program);
registerHandoff(program);
registerAutomation(program);
registerProject(program);
registerZentao(program);
registerLanhu(program);
registerNotify(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
