import { dirname } from "node:path";
import type { Command } from "commander";
import { resolveFeatureEntry } from "../lib/features-layout.ts";
import { runFeaturesLint } from "../lib/features-lint.ts";
import { listWorkspaceProjects, locateProject } from "../lib/workspace-locator.ts";
import { registerCasesBuild } from "./cases-build.ts";
import { registerCasesImport } from "./cases-import.ts";
import { registerCasesSync } from "./cases-sync.ts";

/** Run case-related structural lint: feature dir layout + naming + YAML source contract. */
export function runCasesLint(opts: { project: string; feature?: string }): {
  violations: { feature: string; rule: string; message: string }[];
} {
  const project = locateProject(opts.project);
  if (opts.feature) resolveFeatureEntry(project.featuresDir, opts.feature);
  return runFeaturesLint({
    project: opts.project,
    workspaceRoot: dirname(project.projectDir),
    repoRoot: project.root,
    featurePath: opts.feature,
  });
}

/** Run authored-case lint across every canonical workspace project. */
export function runAllCasesLint(): {
  violations: { feature: string; rule: string; message: string }[];
} {
  return {
    violations: listWorkspaceProjects().flatMap((project) =>
      runCasesLint({ project }).violations.map((violation) => ({
        ...violation,
        feature: `${project}/${violation.feature}`,
      })),
    ),
  };
}

export function registerCases(program: Command): void {
  const cases = program.command("cases").description("用例导入、构建与检查");
  registerCasesBuild(cases);
  registerCasesImport(cases);
  registerCasesSync(cases);
  cases
    .command("lint")
    .description("检查 feature 目录、命名、YAML 来源、用例内容与历史导入文件")
    .option("--project <name>", "项目名；与 --all-projects 二选一")
    .option("--all-projects", "检查 workspace 下全部项目；与 --project 二选一")
    .option("--feature <path>", "只检查单个 feature（相对 features/ 的完整路径）")
    .option("--exit-code", "存在 violation 时退出码为 1")
    .action(
      (opts: { project?: string; allProjects?: boolean; feature?: string; exitCode?: boolean }) => {
        if (Boolean(opts.project) === Boolean(opts.allProjects)) {
          throw new Error("--project 与 --all-projects 必须且只能指定一个");
        }
        if (opts.allProjects && opts.feature) {
          throw new Error("--feature 只能与 --project 一起使用");
        }
        const { violations } = opts.allProjects
          ? runAllCasesLint()
          : runCasesLint({ project: opts.project as string, feature: opts.feature });
        for (const v of violations) {
          console.log(`${v.feature} [${v.rule}] ${v.message}`);
        }
        console.log(`cases lint: ${violations.length} violation(s)`);
        if (opts.exitCode && violations.length > 0) process.exitCode = 1;
      },
    );
}
