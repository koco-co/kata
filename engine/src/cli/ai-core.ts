import { Command } from "commander";
import { registerBaselineCommand } from "./ai-core/baseline-command.ts";
import { registerCaseDraftCommand } from "./ai-core/case-draft-command.ts";
import { registerContextCommand } from "./ai-core/context-command.ts";
import { registerDocsCommand } from "./ai-core/docs-command.ts";
import { registerGoldenEvalsCommand } from "./ai-core/evals-command.ts";
import { registerGateCommand } from "./ai-core/gate-command.ts";
import { registerImportRecordsCommand } from "./ai-core/import-records-command.ts";
import { registerLintCommand } from "./ai-core/lint-command.ts";
import { registerParserCommand } from "./ai-core/parser-command.ts";
import { registerPreflightCommand } from "./ai-core/preflight-command.ts";
import { registerProjectionCommand } from "./ai-core/projection-command.ts";
import { registerSchemaCompatCommand } from "./ai-core/schema-command.ts";
import { registerVendorCommand } from "./ai-core/vendor-command.ts";
import { registerWorkflowCommand } from "./ai-core/workflow-command.ts";

export { gateResultIssues } from "./ai-core/helpers.ts";

export function buildAiCoreCommand(): Command {
  const aiCore = new Command("ai-core").description("AI Core contract operations");
  registerGoldenEvalsCommand(aiCore);
  registerCaseDraftCommand(aiCore);
  registerSchemaCompatCommand(aiCore);
  registerGateCommand(aiCore);
  registerPreflightCommand(aiCore);
  registerBaselineCommand(aiCore);
  registerLintCommand(aiCore);
  registerContextCommand(aiCore);
  registerParserCommand(aiCore);
  registerDocsCommand(aiCore);
  registerProjectionCommand(aiCore);
  registerImportRecordsCommand(aiCore);
  registerVendorCommand(aiCore);
  registerWorkflowCommand(aiCore);
  return aiCore;
}
