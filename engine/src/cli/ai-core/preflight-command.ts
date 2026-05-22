import type { Command } from "commander";
import { isProjectionRuntime, writeAiCoreIssues } from "./helpers.ts";

export function registerPreflightCommand(aiCore: Command): void {
  // ai-core preflight
  aiCore
    .command("preflight")
    .description("Run AI Core runtime preflight checks")
    .option("--runtime <runtime>", "claude, codex, or all", "all")
    .action(async (opts: { runtime: string }) => {
      if (!isProjectionRuntime(opts.runtime)) {
        process.stderr.write(`ai-core preflight: unknown runtime "${opts.runtime}"\n`);
        process.exitCode = 1;
        return;
      }
      const { runAiCorePreflight } = await import("../../ai-core/preflight.ts");
      const result = await runAiCorePreflight({ runtime: opts.runtime });
      if (!result.ok) {
        writeAiCoreIssues(result.issues);
        process.exitCode = 1;
        return;
      }
      console.log("ai-core preflight passed");
    });
}
