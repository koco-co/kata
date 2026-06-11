import { readdirSync } from "node:fs";
import { join } from "node:path";
import { ALLOWED_FEATURE_ROOT_ENTRIES, listFeatureDirs } from "@shared/lib/features/layout.ts";
import type { LintViolation } from "./types.ts";

/** L12: feature root only allows the three areas plus whitelisted entries; legacy flat dirs are flagged whole. */
export function lintFeatureRootLayout(featuresRoot: string): LintViolation[] {
  const violations: LintViolation[] = [];
  for (const entry of listFeatureDirs(featuresRoot)) {
    if (entry.zone === "legacy-flat") {
      violations.push({
        rule: "L12",
        file: entry.dir,
        message:
          "feature 目录未进版本层（v*/、_standing/、_archived/），先跑 kata features migrate",
      });
      continue;
    }
    for (const name of readdirSync(entry.dir)) {
      if (name.startsWith(".")) continue;
      if (ALLOWED_FEATURE_ROOT_ENTRIES.has(name)) continue;
      violations.push({
        rule: "L12",
        file: join(entry.dir, name),
        message: `feature 根级散落条目 "${name}"：用例进 cases/，自动化进 automation/，运行结果进 runs/`,
      });
    }
  }
  return violations;
}
