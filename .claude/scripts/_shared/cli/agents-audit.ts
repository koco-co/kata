import { agentsDir, repoRoot } from "@shared/lib/paths.ts";
import { lintAgentNaming } from "@shared/lint/agent-naming.ts";
import { lintAgentShape } from "@shared/lint/agent-shape.ts";
import { Command } from "commander";

export function buildAgentsCommand(): Command {
  const agents = new Command("agents").description("Agent 审查与同步操作");

  // agents audit
  agents
    .command("audit")
    .description("审查 agent prompt 结构与命名规范")
    .option("--exit-code", "exit non-zero on any violation", false)
    .option("--severity <level>", "filter exit-code by severity (all|fail-only)", "all")
    .action((opts: { exitCode: boolean; severity: string }) => {
      const scanDir = agentsDir();
      const shape = lintAgentShape(scanDir);
      const naming = lintAgentNaming(scanDir);
      const all = [...shape.violations, ...naming.violations];
      for (const v of all) {
        const rel = v.file.replace(repoRoot(), ".");
        const detail = v.lineCount ? `(${v.lineCount} lines)` : v.matched ? `[${v.matched}]` : "";
        console.log(`${rel}: [${v.rule}] ${detail} ${v.message}`);
      }
      console.log(`\n[agents audit] scanned=${shape.agents} violations=${all.length}`);
      const exitableViolations =
        opts.severity === "fail-only" ? all.filter((v) => v.severity !== "warn") : all;
      if (opts.exitCode && exitableViolations.length > 0) process.exit(1);
    });

  return agents;
}
