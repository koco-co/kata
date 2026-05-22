import { Command } from "commander";
import { writeAiCoreIssues } from "./helpers.ts";

export function registerDocsCommand(aiCore: Command): void {
  // ai-core docs (with render and check subcommands)
  const docs = new Command("docs").description("AI Core documentation blocks");
  docs
    .command("render")
    .description("Render AI Core generated documentation blocks")
    .option("--output-root <path>", "write documentation files under this root")
    .action(async (opts: { outputRoot?: string }) => {
      const { renderDocsBlocks } = await import("../../ai-core/docs-renderer.ts");
      const result = await renderDocsBlocks({ outputRoot: opts.outputRoot });
      if (!result.ok) {
        writeAiCoreIssues(result.issues);
        process.exitCode = 1;
        return;
      }
      console.log("ai-core docs render passed");
    });
  docs
    .command("check")
    .description("Check AI Core generated documentation blocks")
    .option("--output-root <path>", "check documentation files under this root")
    .action(async (opts: { outputRoot?: string }) => {
      const { checkDocsBlocks } = await import("../../ai-core/docs-renderer.ts");
      const result = await checkDocsBlocks({ outputRoot: opts.outputRoot });
      if (!result.ok) {
        writeAiCoreIssues(result.issues);
        process.exitCode = 1;
        return;
      }
      console.log("ai-core docs check passed");
    });
  aiCore.addCommand(docs);
}
