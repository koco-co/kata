import { Command } from "commander";
import { writeAiCoreIssues } from "./helpers.ts";

export function registerCaseDraftCommand(aiCore: Command): void {
  // ai-core case-draft evals
  const caseDraft = new Command("case-draft").description("AI Core case-draft evals");
  caseDraft
    .command("evals")
    .description("Run deterministic sparse PRD case-draft evals")
    .option("--json", "emit JSON summary")
    .action(async (opts: { json?: boolean }) => {
      const { runCaseDraftWorkflowEvals } = await import("../../ai-core/case-draft-evals.ts");
      const result = await runCaseDraftWorkflowEvals();
      if (opts.json === true) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        const passed = result.value?.passed ?? 0;
        const total = result.value?.total ?? 0;
        process.stdout.write(
          `case-draft sparse PRD evals ${result.ok ? "passed" : "failed"}: ${passed}/${total} passed\n`,
        );
      }
      if (!result.ok) {
        writeAiCoreIssues(result.issues);
        process.exitCode = 1;
      }
    });
  aiCore.addCommand(caseDraft);
}
