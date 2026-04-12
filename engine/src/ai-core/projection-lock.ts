import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ProjectionRuntime } from "../runtime/projection-targets.ts";
import { repoRoot } from "./paths.ts";
import { parseProjectionInventory } from "./projection-inventory.ts";
import type { AiCoreIssue, AiCoreResult, ProjectionInventoryRow } from "./types.ts";

export type ProjectionLock = {
  schema_version: 1;
  generated_at: string;
  files: Array<{
    path: string;
    disposition: string;
    sha256: string;
  }>;
};

const LOCKED_DISPOSITIONS = new Set(["generated", "copied_vendor"]);
const DEFAULT_LOCK_PATH = ".ai/core/runtimes/projection-lock.json";
export function renderProjectionLock(options?: { projectionRoot?: string }): ProjectionLock {
  const projectionRoot = options?.projectionRoot ?? repoRoot();
  const files = lockedInventoryRows()
    .map((row) => ({
      path: row.path,
      disposition: row.disposition,
      sha256: sha256(readFileSync(join(projectionRoot, row.path))),
    }))
    .sort((left, right) => comparePath(left.path, right.path));
  return {
    schema_version: 1,
    generated_at: "1970-01-01T00:00:00.000Z",
    files,
  };
}

export function checkProjectionLock(input: {
  projectionRoot?: string;
  runtime?: "all" | ProjectionRuntime;
  lock: ProjectionLock;
}): AiCoreResult<null> {
  const validLock = validateProjectionLock(input.lock);
  if (!validLock.ok) return { ok: false, value: null, issues: validLock.issues };
  const lock = validLock.value ?? input.lock;
  const projectionRoot = input.projectionRoot ?? repoRoot();
  const issues: AiCoreIssue[] = [];

  const expectedRows = lockedInventoryRows(input.runtime).sort((left, right) =>
    comparePath(left.path, right.path),
  );
  const expectedByPath = new Map(expectedRows.map((row) => [row.path, row]));
  const lockFiles = lock.files
    .filter((file) => lockFileMatchesRuntime(file.path, input.runtime))
    .sort((left, right) => comparePath(left.path, right.path));
  const lockByPath = new Map(lockFiles.map((file) => [file.path, file]));

  for (const row of expectedRows) {
    const file = lockByPath.get(row.path);
    if (!file) {
      issues.push({
        code: "projection_lock.missing_entry",
        severity: "error",
        message: "Projection lock is missing an expected inventory entry.",
        path: row.path,
      });
      continue;
    }
    if (file.disposition !== row.disposition) {
      issues.push({
        code: "projection_lock.disposition_mismatch",
        severity: "error",
        message: "Projection lock disposition does not match projection inventory.",
        path: row.path,
      });
    }
  }

  for (const file of lockFiles) {
    if (!expectedByPath.has(file.path)) {
      issues.push({
        code: "projection_lock.extra_entry",
        severity: "error",
        message: "Projection lock contains an entry not expected by projection inventory.",
        path: file.path,
      });
      continue;
    }
    let current: Buffer;
    try {
      current = readFileSync(join(projectionRoot, file.path));
    } catch {
      issues.push({
        code: "projection_lock.missing_file",
        severity: "error",
        message: "Projection lock file is missing.",
        path: file.path,
      });
      continue;
    }
    if (sha256(current) !== file.sha256) {
      issues.push({
        code: "projection_lock.hash_mismatch",
        severity: "error",
        message: "Projection lock file hash does not match.",
        path: file.path,
      });
    }
  }
  return { ok: issues.length === 0, value: null, issues };
}

export function readProjectionLock(
  path = join(repoRoot(), DEFAULT_LOCK_PATH),
): AiCoreResult<ProjectionLock> {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return {
      ok: false,
      issues: [
        {
          code: "projection_lock.missing_lock",
          severity: "error",
          message: "Projection lock file is missing.",
          path: DEFAULT_LOCK_PATH,
        },
      ],
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return invalidLockResult("Projection lock JSON is malformed.");
  }
  return validateProjectionLock(parsed);
}

export function writeProjectionLock(path = join(repoRoot(), DEFAULT_LOCK_PATH)): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(renderProjectionLock(), null, 2)}\n`, "utf8");
}

function lockedInventoryRows(runtime?: "all" | ProjectionRuntime): ProjectionInventoryRow[] {
  const inventory = parseProjectionInventory(
    readFileSync(join(repoRoot(), ".ai/core/runtimes/projection-inventory.yaml"), "utf8"),
  );
  return inventory.filter(
    (row) =>
      LOCKED_DISPOSITIONS.has(row.disposition) &&
      (runtime === undefined || runtime === "all" || row.runtime === runtime),
  );
}

function lockFileMatchesRuntime(path: string, runtime?: "all" | ProjectionRuntime): boolean {
  if (runtime === undefined || runtime === "all") return true;
  if (runtime === "codex") return path.startsWith(".agents/") || path === "AGENTS.md";
  return path.startsWith(".claude/") || path === "CLAUDE.md";
}

function sha256(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

function comparePath(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function validateProjectionLock(lock: unknown): AiCoreResult<ProjectionLock> {
  if (
    !isRecord(lock) ||
    lock.schema_version !== 1 ||
    typeof lock.generated_at !== "string" ||
    !Array.isArray(lock.files)
  ) {
    return invalidLockResult(
      "Projection lock must have schema_version 1, generated_at, and files.",
    );
  }
  for (const file of lock.files) {
    if (
      !isRecord(file) ||
      typeof file.path !== "string" ||
      file.path.length === 0 ||
      typeof file.disposition !== "string" ||
      typeof file.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(file.sha256)
    ) {
      return invalidLockResult("Projection lock files must include path, disposition, and sha256.");
    }
  }
  return { ok: true, value: lock as ProjectionLock, issues: [] };
}

function invalidLockResult(message: string): AiCoreResult<ProjectionLock> {
  return {
    ok: false,
    issues: [
      {
        code: "projection_lock.invalid",
        severity: "error",
        message,
        path: DEFAULT_LOCK_PATH,
      },
    ],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
