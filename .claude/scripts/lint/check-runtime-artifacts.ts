#!/usr/bin/env bun
/**
 * F6 lint: forbid runtime artifact directories at repo root.
 */
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

export const FORBIDDEN_DIRS = [
  "test-results",
  "allure-results",
  "allure-report",
  "playwright-report",
  "monocart-report",
];

/** Return the forbidden runtime-artifact directories that exist directly under `root`. */
export function findRootArtifacts(root: string = process.cwd()): string[] {
  return FORBIDDEN_DIRS.filter((dir) => {
    const p = join(root, dir);
    return existsSync(p) && statSync(p).isDirectory();
  });
}

// 仅在作为脚本直接运行时执行检查；被测试 import 时不触发 process.exit
if (import.meta.main) {
  const violations = findRootArtifacts();
  if (violations.length > 0) {
    console.error("✖ F6 violation: runtime artifact directories at repo root:");
    for (const v of violations) console.error("  -", v);
    console.error(
      "These should live under workspace/{project}/.runs/ " +
        "(set KATA_ACTIVE_PROJECT before running tests).",
    );
    process.exit(1);
  }
  console.log("✓ F6: no runtime artifact directories at repo root");
}
