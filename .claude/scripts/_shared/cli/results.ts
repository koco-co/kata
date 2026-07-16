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
    .command("path <feature-id>")
    .description("分配新的运行目录，或返回最近一次运行目录")
    .requiredOption("--project <name>", "项目名（必填）")
    .option("--new-run", "分配新的运行 ID", false)
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
    .command("publish <feature-id>")
    .description("将运行产物发布到 _shared/published-reports/")
    .requiredOption("--run <id>", "要发布的运行 ID")
    .requiredOption("--project <name>", "项目名（必填）")
    .action(async (featureId: string, opts: { project: string; run: string }) => {
      const r = await runResultsPublish({
        project: opts.project,
        featureId,
        runId: opts.run,
        workspaceRoot: join(repoRoot(), "workspace"),
      });
      console.log(`[results publish] 已发布至 ${r.publishedPath}`);
    });

  results
    .command("prune [feature-id]")
    .description("清理旧运行，保留最近 N 次、baseline 与已发布运行；默认仅预览")
    .option("--keep <n>", "保留数量", "10")
    .requiredOption("--project <name>", "项目名（必填）")
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
          keep: Math.max(0, parseInt(opts.keep, 10) || 0),
          apply: opts.apply,
        });
        if (!opts.apply) {
          console.log(`[预览] 将删除 ${r.removed.length} 个运行目录，保留 ${r.kept.length} 个`);
          for (const p of r.plan) {
            if (p.remove.length > 0)
              console.log(`  删除：${p.remove.join(", ")}（位于 ${p.featureDir}）`);
          }
        } else {
          console.log(`已删除 ${r.removed.length} 个运行目录，保留 ${r.kept.length} 个`);
        }
      },
    );

  return results;
}
