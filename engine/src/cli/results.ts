import { join } from "node:path";
import { Command } from "commander";
import { repoRoot } from "../../lib/paths.ts";
import { runResultsPath } from "./results-path.ts";
import { runResultsPrune } from "./results-prune.ts";
import { runResultsPublish } from "./results-publish.ts";

export function buildResultsCommand(): Command {
  const results = new Command("results").description("运行产物管理");
  results
    .command("path <featureId>")
    .description("分配新 run 目录或返回最近 run 路径")
    .option("--project <name>", "项目名", "dataAssets")
    .option("--new-run", "分配新 run id", false)
    .action(async (featureId: string, opts: { project: string; newRun: boolean }) => {
      const out = await runResultsPath({
        project: opts.project,
        featureId,
        workspaceRoot: join(repoRoot(), "workspace"),
        newRun: opts.newRun,
      });
      console.log(out.path);
    });

  results
    .command("publish <featureId>")
    .description("把 run 渲染到 _shared/published-reports/")
    .requiredOption("--run <id>", "run-id to publish")
    .option("--project <name>", "项目名", "dataAssets")
    .action(async (featureId: string, opts: { project: string; run: string }) => {
      const r = await runResultsPublish({
        project: opts.project,
        featureId,
        runId: opts.run,
        workspaceRoot: join(repoRoot(), "workspace"),
      });
      console.log(`Published to ${r.publishedPath}`);
    });

  results
    .command("prune [featureId]")
    .description("清理老 run，保留最近 N 次 + 所有 .published runs")
    .option("--keep <n>", "保留数量", "10")
    .option("--project <name>", "项目名", "dataAssets")
    .option("--all", "对所有 features 操作", false)
    .action(
      async (
        featureId: string | undefined,
        opts: { project: string; keep: string; all: boolean },
      ) => {
        const r = await runResultsPrune({
          project: opts.project,
          featureId: opts.all ? undefined : featureId,
          workspaceRoot: join(repoRoot(), "workspace"),
          keep: parseInt(opts.keep, 10),
        });
        console.log(`Removed ${r.removed.length}, kept ${r.kept.length}`);
      },
    );

  return results;
}
