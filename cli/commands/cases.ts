import { dirname } from "node:path";
import type { Command } from "commander";
import { resolveFeatureEntry } from "../lib/features-layout.ts";
import { type FeatureLintViolation, runFeaturesLint } from "../lib/features-lint.ts";
import { listWorkspaceProjects, locateProject } from "../lib/workspace-locator.ts";
import { registerCasesBuild } from "./cases-build.ts";
import { registerCasesImport } from "./cases-import.ts";
import { registerCasesSync } from "./cases-sync.ts";

/** Run case-related structural lint: feature dir layout + naming + YAML source contract. */
export function runCasesLint(opts: { project: string; feature?: string }): {
  violations: FeatureLintViolation[];
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
  violations: FeatureLintViolation[];
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
    .description(
      "检查 feature 目录、cases/ 单一 YAML 源、作用域唯一的不可变 feature_id、用例内容、P0 占比与历史导入文件",
    )
    .option("--project <name>", "项目名；与 --all-projects 二选一；feature_id 在项目内唯一")
    .option(
      "--all-projects",
      "检查 workspace 下全部项目；feature_id 分别在各项目内唯一；与 --project 二选一",
    )
    .option(
      "--feature <path>",
      "只报告单个 feature（相对 features/ 的完整路径）；feature_id 仍按项目全量校验",
    )
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
          const scope = v.case_id ? `${v.feature} ${v.case_id}` : v.feature;
          console.log(`${scope} [${v.rule}] ${v.message}`);
        }
        console.log(`cases lint: ${violations.length} violation(s)`);
        if (opts.exitCode && violations.length > 0) process.exitCode = 1;
      },
    );
}
