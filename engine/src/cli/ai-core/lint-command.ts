import type { Command } from "commander";
import { lintAiCore } from "../../ai-core/lint.ts";
import { loadAiCore } from "../../ai-core/load.ts";
import { validateAiCoreStrict } from "../../ai-core/validate.ts";
import { failOnInvalidConfig, writeAiCoreIssues } from "./helpers.ts";

export function registerLintCommand(aiCore: Command): void {
  // ai-core lint
  aiCore
    .command("lint")
    .description(
      "AI Core contract operations: lint contracts, registries, and implementation roots",
    )
    .option("--strict", "fail on every blocking issue")
    .action(async (opts: { strict?: boolean }) => {
      if (failOnInvalidConfig()) return;
      const core = await loadAiCore();
      const validation = await validateAiCoreStrict(core);
      const lint = await lintAiCore({ strict: opts.strict === true });
      const issues = [...validation.issues, ...lint.issues];
      if (issues.some((issue) => issue.severity === "error")) {
        writeAiCoreIssues(issues);
        process.exitCode = 1;
        return;
      }
      console.log("ai-core lint passed");
    });
}
