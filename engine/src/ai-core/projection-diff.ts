import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./paths.ts";
import { parseProjectionInventory } from "./projection-inventory.ts";
import type { ProjectionDisposition } from "./types.ts";

export type LegacyProjectionDiff = {
  generated: number;
  copied_vendor: number;
  local_exception: number;
  deleted: number;
};

export async function diffLegacyProjection(input: {
  runtime: "all" | "claude" | "codex";
}): Promise<LegacyProjectionDiff> {
  if (!isDiffRuntime(input.runtime)) {
    throw new Error(`projection diff: unknown runtime "${input.runtime}"`);
  }
  const inventory = parseProjectionInventory(
    readFileSync(join(repoRoot(), ".ai/core/runtimes/projection-inventory.yaml"), "utf8"),
  );
  const rows =
    input.runtime === "all" ? inventory : inventory.filter((row) => row.runtime === input.runtime);

  return rows.reduce<LegacyProjectionDiff>((report, row) => {
    report[row.disposition] += 1;
    return report;
  }, emptyReport());
}

function isDiffRuntime(value: string): value is "all" | "claude" | "codex" {
  return value === "all" || value === "claude" || value === "codex";
}

function emptyReport(): Record<ProjectionDisposition, number> & LegacyProjectionDiff {
  return {
    generated: 0,
    copied_vendor: 0,
    local_exception: 0,
    deleted: 0,
  };
}
