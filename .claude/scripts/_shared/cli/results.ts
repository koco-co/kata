import { join } from "node:path";
import { RUN_TYPES, type RunType } from "@shared/lib/features/run-id.ts";
import { repoRoot } from "@shared/lib/paths.ts";
import { Command, Option } from "commander";
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
    .addOption(
      new Option("--type <type>", `run 类型 (${RUN_TYPES.join("|")})`)
        .choices([...RUN_TYPES])
        .default("run"),
    )
    .action(async (featureId: string, opts: { project: string; newRun: boolean; type: string }) => {
      const out = await runResultsPath({
        project: opts.project,
        featureId,
        workspaceRoot: join(repoRoot(), "workspace"),
        newRun: opts.newRun,
        runType: opts.type as RunType,
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
    .description("清理老 run，保留最近 N 次 + baseline + .published runs（缺省 dry-run）")
    .option("--keep <n>", "保留数量", "10")
    .option("--project <name>", "项目名", "dataAssets")
    .option("--all", "对所有 features 操作", false)
    .option("--apply", "真正删除（缺省 dry-run）", false)
    .action(
      async (
        featureId: string | undefined,
        opts: { project: string; keep: string; all: boolean; apply: boolean },
      ) => {
        const r = await runResultsPrune({
          project: opts.project,
          featureId: opts.all ? undefined : featureId,
          workspaceRoot: join(repoRoot(), "workspace"),
          keep: parseInt(opts.keep, 10),
          apply: opts.apply,
        });
        if (!opts.apply) {
          console.log(`[dry-run] would remove ${r.removed.length}, would keep ${r.kept.length}`);
          for (const p of r.plan) {
            if (p.remove.length > 0)
              console.log(`  remove: ${p.remove.join(", ")} (from ${p.featureDir})`);
          }
        } else {
          console.log(`Removed ${r.removed.length}, kept ${r.kept.length}`);
        }
      },
    );

  return results;
}
