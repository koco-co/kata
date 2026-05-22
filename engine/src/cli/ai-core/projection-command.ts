import { join } from "node:path";
import { Command } from "commander";
import { rewriteProjectionInventoryFromLedgers } from "../../ai-core/inventory-ledger.ts";
import { repoRoot } from "../../ai-core/paths.ts";
import { diffLegacyProjection } from "../../ai-core/projection-diff.ts";
import {
  failOnInvalidConfig,
  isProjectionRuntime,
  validateCurrentProjectionInventory,
  writeAiCoreIssues,
} from "./helpers.ts";

export function registerProjectionCommand(aiCore: Command): void {
  // ai-core projection (with render, check, inventory, lock, diff subcommands)
  const projection = new Command("projection").description("AI Core projection command group");
  registerProjectionRenderCommand(projection);
  registerProjectionCheckCommand(projection);
  registerProjectionInventoryCommand(projection);
  registerProjectionInventoryRewriteCommand(projection);
  registerProjectionLockCommand(projection);
  registerProjectionDiffCommand(projection);
  aiCore.addCommand(projection);
}

function registerProjectionRenderCommand(projection: Command): void {
  projection
    .command("render")
    .description("Render AI Core projections")
    .option("--runtime <runtime>", "claude, codex, or all", "all")
    .option("--output-root <path>", "write projections under this root")
    .option("--prune", "delete runtime files classified as deleted")
    .action(runProjectionRenderCommand);
}

function registerProjectionCheckCommand(projection: Command): void {
  projection
    .command("check")
    .description("Check AI Core projections")
    .option("--runtime <runtime>", "claude, codex, or all", "all")
    .option("--output-root <path>", "check projections under this root")
    .action(runProjectionCheckCommand);
}

function registerProjectionInventoryCommand(projection: Command): void {
  projection
    .command("inventory")
    .description("Audit AI Core projection inventory classification")
    .option("--json", "emit JSON summary")
    .action(runProjectionInventoryCommand);
}

function registerProjectionInventoryRewriteCommand(projection: Command): void {
  projection
    .command("inventory-rewrite")
    .description("Rewrite AI Core projection inventory from inventory ledgers")
    .action(runProjectionInventoryRewriteCommand);
}

function registerProjectionLockCommand(projection: Command): void {
  projection
    .command("lock")
    .description("Render or check the AI Core projection lock")
    .argument("<action>", "render or check")
    .action(runProjectionLockCommand);
}

function registerProjectionDiffCommand(projection: Command): void {
  projection
    .command("diff")
    .description("Summarize legacy projection dispositions")
    .option("--runtime <runtime>", "claude, codex, or all", "all")
    .option("--json", "emit JSON report")
    .action(runProjectionDiffCommand);
}

async function runProjectionRenderCommand(opts: {
  runtime: string;
  outputRoot?: string;
  prune?: boolean;
}): Promise<void> {
  if (!isProjectionRuntime(opts.runtime)) {
    rejectProjectionRuntime("ai-core projection", opts.runtime);
    return;
  }
  const { renderProjection } = await import("../../ai-core/projection.ts");
  const result = await renderProjection({
    runtime: opts.runtime,
    outputRoot: opts.outputRoot,
    prune: opts.prune === true,
  });
  if (!result.ok) {
    writeAiCoreIssues(result.issues);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`ai-core projection render passed\n`);
}

async function runProjectionCheckCommand(opts: {
  runtime: string;
  outputRoot?: string;
}): Promise<void> {
  if (!isProjectionRuntime(opts.runtime)) {
    rejectProjectionRuntime("ai-core projection", opts.runtime);
    return;
  }
  const { checkProjection } = await import("../../ai-core/projection.ts");
  const result = await checkProjection({ runtime: opts.runtime, outputRoot: opts.outputRoot });
  if (!result.ok) {
    writeAiCoreIssues(result.issues);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`ai-core projection check passed\n`);
}

function runProjectionInventoryCommand(opts: { json?: boolean }): void {
  if (failOnInvalidConfig()) return;
  const result = validateCurrentProjectionInventory();
  if (opts.json === true) {
    process.stdout.write(
      `${JSON.stringify({ ok: result.ok, files: result.files, issues: result.issues }, null, 2)}\n`,
    );
  }
  if (!result.ok) {
    writeAiCoreIssues(result.issues);
    process.exitCode = 1;
    return;
  }
  if (opts.json !== true) process.stdout.write("ai-core projection inventory passed\n");
}

function runProjectionInventoryRewriteCommand(): void {
  if (failOnInvalidConfig()) return;
  rewriteProjectionInventoryFromLedgers();
  process.stdout.write("ai-core projection inventory rewrite passed\n");
}

async function runProjectionLockCommand(action: string): Promise<void> {
  if (action !== "render" && action !== "check") {
    process.stderr.write(`ai-core projection lock: unknown action "${action}"\n`);
    process.exitCode = 1;
    return;
  }
  const { checkProjectionLock, readProjectionLock, writeProjectionLock } = await import(
    "../../ai-core/projection-lock.ts"
  );
  const lockPath = join(repoRoot(), ".ai/core/runtimes/projection-lock.json");
  if (action === "render") {
    writeProjectionLock(lockPath);
    process.stdout.write("ai-core projection lock render passed\n");
    return;
  }
  const lock = readProjectionLock(lockPath);
  if (!lock.ok || !lock.value) {
    writeAiCoreIssues(lock.issues);
    process.exitCode = 1;
    return;
  }
  const result = checkProjectionLock({ lock: lock.value });
  if (!result.ok) {
    writeAiCoreIssues(result.issues);
    process.exitCode = 1;
    return;
  }
  process.stdout.write("ai-core projection lock check passed\n");
}

async function runProjectionDiffCommand(opts: { runtime: string; json?: boolean }): Promise<void> {
  if (failOnInvalidConfig()) return;
  if (!isProjectionRuntime(opts.runtime)) {
    rejectProjectionRuntime("ai-core projection diff", opts.runtime);
    return;
  }
  const report = await diffLegacyProjection({ runtime: opts.runtime });
  if (opts.json === true) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  process.stdout.write(`ai-core projection diff: ${JSON.stringify(report)}\n`);
}

function rejectProjectionRuntime(prefix: string, runtime: string): void {
  process.stderr.write(`${prefix}: unknown runtime "${runtime}"\n`);
  process.exitCode = 1;
}
