import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isAiCoreConfigEnvName, resolveAiCoreConfig } from "../config/ai-core-config.ts";
import type { ProjectionRuntime } from "../runtime/projection-targets.ts";
import { repoRoot } from "./paths.ts";
import { auditPluginRuntimeMetadata } from "./plugin-runtime-audit.ts";
import { checkProjection } from "./projection.ts";
import {
  parseProjectionInventory,
  scanRuntimeFiles,
  validateProjectionInventory,
} from "./projection-inventory.ts";
import { checkProjectionLock, readProjectionLock } from "./projection-lock.ts";
import { auditRuntimeConflictMarkers } from "./runtime-conflict-audit.ts";
import type { AiCoreIssue, AiCoreResult } from "./types.ts";

export type AiCorePreflightOptions = {
  runtime: "all" | ProjectionRuntime;
  env?: Record<string, string | undefined>;
  projectionRoot?: string;
};

export async function runAiCorePreflight(
  options: AiCorePreflightOptions,
): Promise<AiCoreResult<null>> {
  const root = repoRoot();
  const projectionRoot = options.projectionRoot ?? root;
  const issues: AiCoreIssue[] = [];

  const projection = await checkProjection({
    runtime: options.runtime,
    outputRoot: projectionRoot,
  });
  issues.push(...projection.issues);

  const inventory = parseProjectionInventory(
    readFileSync(join(root, ".ai/core/runtimes/projection-inventory.yaml"), "utf8"),
  );
  const runtimeInventory = filterInventoryByRuntime(inventory, options.runtime);
  const inventoryResult = validateProjectionInventory({
    files: filterRuntimeFiles(scanRuntimeFiles(projectionRoot), options.runtime),
    inventory: runtimeInventory,
  });
  issues.push(...inventoryResult.issues);

  const lock = readProjectionLock(join(root, ".ai/core/runtimes/projection-lock.json"));
  if (lock.ok) {
    const lockResult = checkProjectionLock({
      projectionRoot,
      runtime: options.runtime,
      lock: lock.value!,
    });
    issues.push(...lockResult.issues);
  } else {
    issues.push(...lock.issues);
  }

  const config = resolveAiCoreConfig({ env: aiCoreRuntimeEnv(options.env ?? process.env) });
  issues.push(...config.issues);

  const pluginRuntime = auditPluginRuntimeMetadata({ root });
  issues.push(...pluginRuntime.issues);

  const conflictMarkers = auditRuntimeConflictMarkers({
    root: projectionRoot,
    runtime: options.runtime,
  });
  issues.push(...conflictMarkers.issues);

  return {
    ok: issues.length === 0,
    value: null,
    issues,
  };
}

function aiCoreRuntimeEnv(
  env: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const scopedEnv: Record<string, string | undefined> = {};
  for (const [name, value] of Object.entries(env)) {
    if (isAiCoreConfigEnvName(name)) {
      scopedEnv[name] = value;
    }
  }
  return scopedEnv;
}

function filterInventoryByRuntime<T extends { runtime: string }>(
  rows: T[],
  runtime: "all" | ProjectionRuntime,
): T[] {
  if (runtime === "all") return rows;
  return rows.filter((row) => row.runtime === runtime);
}

function filterRuntimeFiles(files: string[], runtime: "all" | ProjectionRuntime): string[] {
  if (runtime === "all") return files;
  return files.filter((file) => runtimeFileMatchesRuntime(file, runtime));
}

function runtimeFileMatchesRuntime(path: string, runtime: ProjectionRuntime): boolean {
  if (runtime === "codex") return path.startsWith(".agents/") || path === "AGENTS.md";
  return path.startsWith(".claude/") || path === "CLAUDE.md";
}
