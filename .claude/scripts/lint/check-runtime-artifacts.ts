#!/usr/bin/env bun
/**
 * F6 lint: forbid runtime artifacts and retired agent adapters at repo root.
 */
import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

export const FORBIDDEN_DIRS = [
  "test-results",
  "allure-results",
  "allure-report",
  "playwright-report",
  "monocart-report",
  ".hermes",
  ".reasonix",
];

const TRACKED_ARTIFACT_PATTERNS = [
  /(^|\/)\.DS_Store$/,
  /^workspace\/[^/]+\/features\/.+\/runs\//,
] as const;

/** Return forbidden runtime or retired-adapter directories directly under `root`. */
export function findRootArtifacts(root: string = process.cwd()): string[] {
  return FORBIDDEN_DIRS.filter((dir) => {
    const p = join(root, dir);
    return existsSync(p) && statSync(p).isDirectory();
  });
}

/** Return generated or operating-system artifacts that must never be tracked. */
export function findTrackedArtifacts(files: readonly string[]): string[] {
  return files.filter((file) => TRACKED_ARTIFACT_PATTERNS.some((pattern) => pattern.test(file)));
}

// 仅在作为脚本直接运行时执行检查；被测试 import 时不触发 process.exit
if (import.meta.main) {
  const rootViolations = findRootArtifacts();
  const trackedFiles = execFileSync("git", ["ls-files"], { encoding: "utf8" })
    .split("\n")
    .filter((file) => file.length > 0 && existsSync(file));
  const trackedViolations = findTrackedArtifacts(trackedFiles);
  if (rootViolations.length > 0 || trackedViolations.length > 0) {
    console.error("✖ F6 violation: forbidden directories at repo root:");
    for (const v of rootViolations) console.error("  -", v);
    if (trackedViolations.length > 0) {
      console.error("✖ F6 violation: generated artifacts tracked by Git:");
      for (const v of trackedViolations) console.error("  -", v);
    }
    console.error(
      "Generated evidence belongs in ignored feature runs/ directories; do not commit it.",
    );
    process.exit(1);
  }
  console.log("✓ F6: no forbidden runtime directories or tracked generated artifacts");
}
