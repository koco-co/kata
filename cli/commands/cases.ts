import { join } from "node:path";
import type { Command } from "commander";
import { resolveFeatureEntry } from "../lib/features-layout.ts";
import { runFeaturesLint } from "../lib/features-lint.ts";
import { locateProject, locateProjectRoot } from "../lib/workspace-locator.ts";
import { registerCasesBuild } from "./cases-build.ts";
import { registerCasesImport } from "./cases-import.ts";
import { registerCasesSync } from "./cases-sync.ts";

/** Run case-related structural lint: feature dir layout + naming + metadata sanity. */
export function runCasesLint(opts: { project: string; feature?: string }): {
  violations: { feature: string; rule: string; message: string }[];
} {
  const workspaceRoot = join(locateProjectRoot(), "workspace");
  const featureId = opts.feature
    ? resolveFeatureEntry(locateProject(opts.project).featuresDir, opts.feature).dirName
    : undefined;
  return runFeaturesLint({ project: opts.project, workspaceRoot, featureId });
}

export function registerCases(program: Command): void {
  const cases = program.command("cases").description("用例导入、构建与检查");
  registerCasesBuild(cases);
  registerCasesImport(cases);
  registerCasesSync(cases);
  cases
    .command("lint")
    .description("检查 feature 目录结构、命名与 metadata 合法性")
    .requiredOption("--project <name>", "项目名")
    .option("--feature <id>", "只检查单个 feature")
    .option("--exit-code", "存在 violation 时退出码为 1")
    .action((opts: { project: string; feature?: string; exitCode?: boolean }) => {
      const { violations } = runCasesLint({ project: opts.project, feature: opts.feature });
      for (const v of violations) {
        console.log(`${v.feature} [${v.rule}] ${v.message}`);
      }
      console.log(`cases lint: ${violations.length} violation(s)`);
      if (opts.exitCode && violations.length > 0) process.exitCode = 1;
    });
}
