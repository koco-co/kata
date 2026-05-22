import type { Command } from "commander";
import { failOnInvalidConfig, writeAiCoreIssues } from "./helpers.ts";

export function registerWorkflowCommand(aiCore: Command): void {
  // ai-core workflow maturity
  aiCore
    .command("workflow-maturity")
    .description("Audit workflow maturity levels")
    .option("--json", "emit JSON report")
    .action(async (opts: { json?: boolean }) => {
      if (failOnInvalidConfig()) return;
      const { auditWorkflowMaturity } = (await import(
        "../../ai-core/workflow-maturity.ts"
      )) as typeof import("../../ai-core/workflow-maturity.ts");
      const result = auditWorkflowMaturity();
      if (opts.json === true) {
        process.stdout.write(`${JSON.stringify(result.value, null, 2)}\n`);
      } else {
        process.stdout.write(`Active workflows: ${result.value?.activeWorkflows.length}\n`);
        if (result.ok) {
          process.stdout.write("All workflows meet required maturity levels\n");
        } else {
          writeAiCoreIssues(result.issues);
          process.exitCode = 1;
        }
      }
    });
}
