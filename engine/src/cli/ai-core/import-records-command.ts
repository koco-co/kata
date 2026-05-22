import type { Command } from "commander";
import {
  buildRuntimeImportRecords,
  type RuntimeImportRecord,
  RuntimeImportRecordError,
} from "../../ai-core/import-runtime.ts";
import { failOnInvalidConfig } from "./helpers.ts";

export function registerImportRecordsCommand(aiCore: Command): void {
  // ai-core import records
  aiCore
    .command("import-records")
    .description("List AI Core runtime import records")
    .option("--json", "emit JSON records")
    .action(async (opts: { json?: boolean }) => {
      if (failOnInvalidConfig()) return;
      let records: RuntimeImportRecord[];
      try {
        records = await buildRuntimeImportRecords();
      } catch (error) {
        if (error instanceof RuntimeImportRecordError) {
          process.stderr.write(`${error.code}: ${error.message}\n`);
        } else {
          process.stderr.write(
            `ai_core.import_records_failed: .ai/core/imports/records: ${error instanceof Error ? error.message : String(error)}\n`,
          );
        }
        process.exitCode = 1;
        return;
      }
      if (opts.json === true) {
        process.stdout.write(`${JSON.stringify(records, null, 2)}\n`);
        return;
      }
      process.stdout.write(`ai-core import records: ${records.length}\n`);
    });
}
