import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  ALLOWED_FEATURE_ROOT_ENTRIES,
  type FeatureDirEntry,
  listFeatureDirs,
} from "@shared/lib/features/layout.ts";
import type { LintViolation } from "./types.ts";

function shouldIgnoreHiddenFeatureEntry(name: string): boolean {
  return name.startsWith(".") && name !== ".debug";
}

export function lintFeatureRootEntry(entry: FeatureDirEntry): LintViolation[] {
  const violations: LintViolation[] = [];
  if (entry.zone === "legacy-flat") {
    violations.push({
      rule: "L12",
      file: entry.dir,
      message: "feature 目录未进版本层（v*/、_standing/、_archived/），先跑 kata features migrate",
    });
    return violations;
  }
  for (const name of readdirSync(entry.dir)) {
    if (shouldIgnoreHiddenFeatureEntry(name)) continue;
    if (ALLOWED_FEATURE_ROOT_ENTRIES.has(name)) continue;
    violations.push({
      rule: "L12",
      file: join(entry.dir, name),
      message: `feature 根级散落条目 "${name}"：用例进 cases/，自动化进 automation/，运行结果进 runs/`,
    });
  }
  return violations;
}

/** L12: feature root only allows the three areas plus whitelisted entries; legacy flat dirs are flagged whole. */
export function lintFeatureRootLayout(featuresRoot: string): LintViolation[] {
  const violations: LintViolation[] = [];
  for (const entry of listFeatureDirs(featuresRoot)) {
    violations.push(...lintFeatureRootEntry(entry));
  }
  return violations;
}

const ALLOWED_AUTOMATION_TOP_ENTRIES = new Set(["tests"]);

/** L13: automation/ 顶层只允许 tests/ 目录，散落 .md/.json/.yaml 等文件即为违规。 */
export function lintAutomationTopLayout(automationDir: string): LintViolation[] {
  const violations: LintViolation[] = [];
  if (!existsSync(automationDir)) return violations;
  for (const name of readdirSync(automationDir)) {
    if (name.startsWith(".")) continue;
    if (ALLOWED_AUTOMATION_TOP_ENTRIES.has(name)) continue;
    violations.push({
      rule: "L13",
      file: join(automationDir, name),
      message: `automation/ 顶层散落条目 "${name}"：只允许 tests/ 目录，文档放 runs/，脚本放 _shared/`,
    });
  }
  return violations;
}
