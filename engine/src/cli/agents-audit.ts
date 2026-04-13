import { Command } from "commander";
import {
  type AgentRuntime,
  agentsDir,
  parseAgentRuntimeSelector,
  repoRoot,
  resolveAgentRuntime,
} from "../../lib/paths.ts";
import { lintAgentNaming } from "../lint/agent-naming.ts";
import { lintAgentShape } from "../lint/agent-shape.ts";
import { auditAgentRuntimeDrift, type DriftStatus } from "../lint/agents-drift.ts";
import { rollbackAgentsSync, runAgentsSync } from "../lint/agents-sync.ts";

interface SyncCliOptions {
  from: string;
  to: string;
  dryRun: boolean;
  write: boolean;
  force: boolean;
}

interface RollbackCliOptions {
  backupId: string;
  force: boolean;
}

export function buildAgentsCommand(): Command {
  const agents = new Command("agents").description("Agent 审查与同步操作");

  // agents audit
  agents
    .command("audit")
    .description("审查 agent prompt 结构与命名规范")
    .option("--runtime <runtime>", "agent runtime: claude | codex | all")
    .option("--exit-code", "exit non-zero on any violation", false)
    .option("--severity <level>", "filter exit-code by severity (all|fail-only)", "all")
    .action((opts: { runtime?: string; exitCode: boolean; severity: string }) => {
      const selector = parseAgentRuntimeSelector(opts.runtime);
      const runtimes: AgentRuntime[] = selector === "all" ? ["claude", "codex"] : [selector];
      let totalViolations = 0;
      let totalExitableViolations = 0;

      for (const runtime of runtimes) {
        const scanDir = agentsDir(runtime);
        const shape = lintAgentShape(scanDir, { runtime });
        const naming = lintAgentNaming(scanDir);
        const all = [...shape.violations, ...naming.violations];
        for (const v of all) {
          const rel = v.file.replace(repoRoot(), ".");
          const detail = v.lineCount ? `(${v.lineCount} lines)` : v.matched ? `[${v.matched}]` : "";
          console.log(`${rel}: [${v.rule}] ${detail} ${v.message}`);
        }
        console.log(
          `\n[agents audit] runtime=${runtime} scanned=${shape.agents} violations=${all.length}`,
        );
        const exitableViolations =
          opts.severity === "fail-only" ? all.filter((v) => v.severity !== "warn") : all;
        totalViolations += all.length;
        totalExitableViolations += exitableViolations.length;
      }

      console.log(`\n[agents audit] total violations=${totalViolations}`);
      if (opts.exitCode && totalExitableViolations > 0) process.exit(1);
    });

  // agents drift
  agents
    .command("drift")
    .description("只读审计 .claude 与 .agents 的双栈投影漂移")
    .option("--json", "emit JSON report", false)
    .action((opts: { json: boolean }) => {
      const report = auditAgentRuntimeDrift();
      if (opts.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      const counts = new Map<DriftStatus, number>();
      for (const pair of report.pairs) counts.set(pair.status, (counts.get(pair.status) ?? 0) + 1);
      console.log(`agents:drift version=${report.version}`);
      for (const status of [
        "missing-target",
        "missing-source",
        "equal",
        "allowed-diff",
        "changed",
        "conflict",
      ] as DriftStatus[]) {
        console.log(`${status}=${counts.get(status) ?? 0}`);
      }
      for (const pair of report.pairs.filter((p) => p.status !== "equal")) {
        const policy = pair.policyId ? ` policy=${pair.policyId}` : "";
        console.log(`${pair.kind}:${pair.name} [${pair.status}]${policy} ${pair.summary}`);
      }
    });

  // agents sync (with rollback subcommand)
  const sync = agents
    .command("sync")
    .description("同步 .claude 到 .agents 的双栈投影")
    .option("--from <runtime>", "source agent runtime: claude", "claude")
    .option("--to <runtime>", "target agent runtime: codex", "codex")
    .option("--dry-run", "plan changes without writing", false)
    .option("--write", "write planned creates/overwrites", false)
    .option("--force", "allow policy-approved overwrites", false)
    .action((opts: SyncCliOptions) => {
      const result = runAgentsSync({
        root: repoRoot(),
        from: resolveAgentRuntime(opts.from) as AgentRuntime,
        to: resolveAgentRuntime(opts.to) as AgentRuntime,
        dryRun: opts.dryRun,
        write: opts.write,
        force: opts.force,
      });
      console.log(JSON.stringify(result, null, 2));
      if (result.actions.some((action) => action.action === "conflict")) process.exitCode = 1;
    });

  sync
    .command("rollback")
    .description("回滚 agents:sync 创建的备份")
    .requiredOption("--backup-id <id>", "backup id from agents:sync")
    .option("--force", "rollback even if current target hash differs", false)
    .action((opts: RollbackCliOptions) => {
      rollbackAgentsSync({ root: repoRoot(), backupId: opts.backupId, force: opts.force });
      console.log(`Rolled back agents sync backup ${opts.backupId}`);
    });

  return agents;
}
