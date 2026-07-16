import { existsSync } from "node:fs";
import { agentsDir, repoRoot } from "@shared/lib/paths.ts";
import { lintAgentNaming } from "@shared/lint/agent-naming.ts";
import { lintAgentShape } from "@shared/lint/agent-shape.ts";
import { Command, Option } from "commander";

export function buildAgentsCommand(): Command {
  const agents = new Command("agents").description("代理提示词审查");

  // agents audit
  agents
    .command("audit")
    .description("检查代理提示词的结构与命名")
    .option("--exit-code", "发现违规时返回非零退出码", false)
    .addOption(
      new Option("--severity <level>", "决定退出码所依据的违规级别")
        .choices(["all", "fail-only"])
        .default("all"),
    )
    .action((opts: { exitCode: boolean; severity: string }) => {
      const scanDir = agentsDir();
      // 目标目录缺失时报错而非静默通过（scanned=0 = 空门）。
      if (!existsSync(scanDir)) {
        const rel = scanDir.replace(repoRoot(), ".");
        console.log(`[agents audit] 未找到代理目录：${rel}`);
        if (opts.exitCode) process.exit(1);
        return;
      }
      const shape = lintAgentShape(scanDir);
      const naming = lintAgentNaming(scanDir);
      const all = [...shape.violations, ...naming.violations];
      for (const v of all) {
        const rel = v.file.replace(repoRoot(), ".");
        const detail = v.lineCount ? `(${v.lineCount} lines)` : v.matched ? `[${v.matched}]` : "";
        console.log(`${rel}: [${v.rule}] ${detail} ${v.message}`);
      }
      console.log(`\n[agents audit] 已扫描=${shape.agents} 违规=${all.length}`);
      const exitableViolations =
        opts.severity === "fail-only" ? all.filter((v) => v.severity !== "warn") : all;
      if (opts.exitCode && exitableViolations.length > 0) process.exit(1);
    });

  return agents;
}
