import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ProjectionRuntime } from "../runtime/projection-targets.ts";
import { repoRoot } from "./paths.ts";
import { scanRuntimeFiles } from "./projection-inventory.ts";
import type { AiCoreIssue, AiCoreResult } from "./types.ts";

export type RuntimeConflictAuditOptions = {
  runtime?: "all" | ProjectionRuntime;
  root?: string;
};

const CONFLICT_MARKER_PATTERN = /^(<<<<<<<(?: .*)?|=======|>>>>>>>(?: .*)?)$/m;
const SCRATCH_RUNTIME_PREFIXES = [".claude/worktrees/", ".agents/worktrees/"];

export function auditRuntimeConflictMarkers(
  options: RuntimeConflictAuditOptions = {},
): AiCoreResult<null> {
  const root = options.root ?? repoRoot();
  const runtime = options.runtime ?? "all";
  const issues: AiCoreIssue[] = [];

  for (const path of scanRuntimeFiles(root)) {
    if (!runtimeFileMatches(path, runtime)) continue;
    if (SCRATCH_RUNTIME_PREFIXES.some((prefix) => path.startsWith(prefix))) continue;
    const text = readFileSync(join(root, path), "utf8");
    const match = text.match(CONFLICT_MARKER_PATTERN);
    if (!match) continue;
    issues.push({
      code: "runtime_conflict_marker.detected",
      severity: "error",
      path,
      message: `Runtime file contains unresolved conflict marker: ${match[1]}`,
    });
  }

  return {
    ok: issues.length === 0,
    value: null,
    issues,
  };
}

function runtimeFileMatches(path: string, runtime: "all" | ProjectionRuntime): boolean {
  if (runtime === "all") return true;
  if (runtime === "codex") return path === "AGENTS.md" || path.startsWith(".agents/");
  return path === "CLAUDE.md" || path.startsWith(".claude/");
}
