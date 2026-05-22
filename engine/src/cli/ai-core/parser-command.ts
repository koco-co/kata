import type { Command } from "commander";
import { auditAiCoreParserBoundaries } from "../../ai-core/parser-boundary-audit.ts";
import { writeAiCoreIssues } from "./helpers.ts";

export function registerParserCommand(aiCore: Command): void {
  // ai-core parser audit
  aiCore
    .command("parser")
    .description("AI Core parser operations")
    .command("audit")
    .description("Audit AI Core parser boundaries")
    .action(() => {
      const result = auditAiCoreParserBoundaries();
      if (!result.ok) {
        writeAiCoreIssues(result.issues);
        process.exitCode = 1;
        return;
      }
      console.log("ai-core parser boundary audit passed");
    });
}
