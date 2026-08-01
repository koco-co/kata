import type { Command } from "commander";
import { outputJson } from "../lib/cli.ts";
import { listFeatureDirs, resolveFeatureEntry } from "../lib/features-layout.ts";
import { finalizePrd, lintPrdFeature, migrateLegacyPrdLayout } from "../lib/prd.ts";
import { locateProject } from "../lib/workspace-locator.ts";
import { resolveFeatureInput } from "./cases-build.ts";

/** Canonical PRD evidence, confirmation and validation commands. */
export function registerPrd(program: Command): void {
  const prd = program.command("prd").description("PRD 证据提取、确认式定稿与检查");

  prd
    .command("migrate")
    .description("迁移旧根目录 PRD、需求笔记与测试点；默认 dry-run")
    .requiredOption("--project <name>", "工作区项目")
    .option("--feature <path>", "仅迁移相对 features/ 的一个需求")
    .option("--apply", "执行迁移；不传时只输出计划")
    .action((opts: { project: string; feature?: string; apply?: boolean }) => {
      const project = locateProject(opts.project);
      const features = opts.feature
        ? [resolveFeatureEntry(project.featuresDir, opts.feature)]
        : listFeatureDirs(project.featuresDir);
      outputJson({
        applied: opts.apply === true,
        features: features
          .map((feature) => ({
            feature: feature.dir,
            ...migrateLegacyPrdLayout(feature.dir, opts.apply === true),
          }))
          .filter((item) => item.moves.length > 0),
      });
    });

  prd
    .command("extract")
    .description("从蓝湖提取原始证据与截图；不直接生成 PRD")
    .requiredOption("--url <url>", "含 docId、versionId、pageId 的蓝湖需求 URL")
    .requiredOption("--feature <dir>", "目标 feature 目录")
    .option("--force", "忽略相同版本缓存并重新提取")
    .action(async (opts: { url: string; feature: string; force?: boolean }) => {
      const { runPrdExtract } = await import("../integrations/lanhu/fetch.ts");
      outputJson(
        await runPrdExtract(opts.url, {
          featureDir: resolveFeatureInput(opts.feature),
          force: opts.force,
        }),
      );
    });

  prd
    .command("finalize")
    .description("校验已确认会话并确定性生成 prd/prd.md")
    .requiredOption("--feature <dir>", "目标 feature 目录")
    .action((opts: { feature: string }) =>
      outputJson(finalizePrd(resolveFeatureInput(opts.feature))),
    );

  prd
    .command("lint")
    .description("检查 PRD 结构、未决项、提示词污染、frontmatter 与图片引用")
    .requiredOption("--feature <dir>", "目标 feature 目录")
    .option("--exit-code", "存在错误时退出码为 1")
    .action((opts: { feature: string; exitCode?: boolean }) => {
      const report = lintPrdFeature(resolveFeatureInput(opts.feature));
      for (const item of report.errors) console.log(`error [${item.rule}] ${item.message}`);
      for (const item of report.warnings) console.log(`warning [${item.rule}] ${item.message}`);
      console.log(
        `prd lint: ${report.errors.length} error(s), ${report.warnings.length} warning(s)`,
      );
      if (opts.exitCode && report.errors.length > 0) process.exitCode = 1;
    });
}
