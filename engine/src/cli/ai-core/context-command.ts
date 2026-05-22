import type { Command } from "commander";
import { auditLocalContext } from "../../ai-core/context-audit.ts";
import { writeAiCoreIssues } from "./helpers.ts";

export function registerContextCommand(aiCore: Command): void {
  // ai-core context audit
  aiCore
    .command("context")
    .description("AI Core context operations")
    .command("audit")
    .description("Audit local context for runtime policy overrides")
    .action(() => {
      const result = auditLocalContext();
      if (!result.ok) {
        writeAiCoreIssues(result.issues);
        process.exitCode = 1;
        return;
      }
      console.log("ai-core context audit passed");
    });
}
