import type { Command } from "commander";
import { writeAiCoreIssues } from "./helpers.ts";

export function registerSchemaCompatCommand(aiCore: Command): void {
  // ai-core schemas-compat-check
  aiCore
    .command("schemas-compat-check")
    .description("Run AI Core schema compatibility checks")
    .action(async () => {
      const { runSchemaCompatCheck } = await import("../../ai-core/schema-compat.ts");
      const result = await runSchemaCompatCheck();
      if (!result.ok) {
        writeAiCoreIssues(result.issues);
        process.exitCode = 1;
        return;
      }
      console.log("schemas compat check passed");
    });
}
