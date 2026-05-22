import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Command } from "commander";
import { outputJson } from "../../lib/cli.ts";
import { repoRoot } from "../../lib/paths.ts";
import { runFeaturesIndex } from "./features-index.ts";
import { runFeaturesLint } from "./features-lint.ts";
import { runFeaturesLs } from "./features-ls.ts";
import { runFeaturesNew } from "./features-new.ts";
import { runFeaturesShow } from "./features-show.ts";

export function buildFeaturesCommand(): Command {
  const features = new Command("features").description("Feature 目录管理");

  features
    .command("new <slug>")
    .description("创建 feature 骨架 + metadata.yaml + manifest.json")
    .requiredOption("--display-name <name>", "中文人读名")
    .option("--project <name>", "项目名", "dataAssets")
    .option("--modules <list>", "模块逗号分隔", "")
    .option("--customers <list>", "客户逗号分隔", "")
    .option("--versions <list>", "版本逗号分隔", "")
    .option("--owners <list>", "负责人逗号分隔", "")
    .option("--inputs <list>", "输入类型 (prd,lanhu,axure,manual,bug-hotfix) 逗号分隔", "prd")
    .action(async (slug: string, opts: Record<string, string>) => {
      const split = (s: string) =>
        s
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
      const result = await runFeaturesNew({
        project: opts.project,
        slug,
        displayName: opts.displayName,
        modules: split(opts.modules),
        customers: split(opts.customers),
        versions: split(opts.versions),
        owners: split(opts.owners),
        inputs: split(opts.inputs) as ("prd" | "lanhu" | "axure" | "manual" | "bug-hotfix")[],
        workspaceRoot: join(repoRoot(), "workspace"),
      });
      console.log(`Created ${result.featureId} at ${result.featureDir}`);
    });

  features
    .command("ls")
    .description("列出 features 支持多维过滤")
    .option("--project <name>", "项目名", "dataAssets")
    .option("--module <name>", "按 module 过滤")
    .option("--customer <name>", "按 customer 过滤")
    .option("--version <name>", "按 version 过滤")
    .option("--owner <name>", "按 owner 过滤")
    .option("--created-after <yyyy-mm>", "按 created_at 下限过滤")
    .option("--status <name>", "按 status 过滤")
    .option("--automation-status <name>", "按 automation status 过滤")
    .option("--last-run <name>", "按 last_run_status 过滤")
    .option("--format <fmt>", "输出格式 (table|json|md)", "table")
    .action(async (opts: Record<string, string>) => {
      const rows = await runFeaturesLs({
        project: opts.project,
        workspaceRoot: join(repoRoot(), "workspace"),
        module: opts.module,
        customer: opts.customer,
        version: opts.version,
        owner: opts.owner,
        createdAfter: opts.createdAfter,
        status: opts.status,
        automationStatus: opts.automationStatus,
        lastRun: opts.lastRun,
      });
      if (opts.format === "json") {
        outputJson(rows);
      } else if (opts.format === "md") {
        console.log("| ID | Display | Status | Modules | Automation | Last Run |");
        console.log("|---|---|---|---|---|---|");
        for (const r of rows)
          console.log(
            `| ${r.id} | ${r.displayName} | ${r.status} | ${r.modules.join(",")} | ${r.automationStatus} | ${r.lastRunStatus} |`,
          );
      } else {
        for (const r of rows)
          console.log(
            `${r.id}\t${r.status}\t${r.modules.join(",")}\t${r.automationStatus}\t${r.lastRunStatus}`,
          );
      }
    });

  features
    .command("show <featureId>")
    .description("显示单 feature 详情")
    .option("--project <name>", "项目名", "dataAssets")
    .action(async (featureId: string, opts: Record<string, string>) => {
      const d = await runFeaturesShow({
        project: opts.project,
        featureId,
        workspaceRoot: join(repoRoot(), "workspace"),
      });
      outputJson(d);
    });

  features
    .command("lint [featureId]")
    .description("lint feature metadata + manifest")
    .option("--project <name>", "项目名", "dataAssets")
    .option("--all", "lint all workspace projects", false)
    .option("--exit-code", "exit non-zero on violations", false)
    .action(
      async (
        featureId: string | undefined,
        opts: { project: string; all: boolean; exitCode: boolean },
      ) => {
        const workspaceRoot = join(repoRoot(), "workspace");
        const projects = opts.all
          ? readdirSync(workspaceRoot).filter((name) =>
              statSync(join(workspaceRoot, name)).isDirectory(),
            )
          : [opts.project];
        const results = await Promise.all(
          projects.map((project) =>
            runFeaturesLint({
              project,
              workspaceRoot,
              featureId,
            }),
          ),
        );
        const violations = results.flatMap((result) => result.violations);
        for (const v of violations) {
          console.log(`${v.feature} [${v.rule}] ${v.message}`);
        }
        console.log(`\n[features lint] violations=${violations.length}`);
        if (opts.exitCode && violations.length > 0) process.exit(1);
      },
    );

  features
    .command("index")
    .description("生成 features/INDEX.md")
    .option("--project <name>", "项目名", "dataAssets")
    .option("--all", "index all workspace projects", false)
    .action(async (opts: { project: string; all: boolean }) => {
      const workspaceRoot = join(repoRoot(), "workspace");
      const projects = opts.all
        ? readdirSync(workspaceRoot).filter((name) =>
            statSync(join(workspaceRoot, name)).isDirectory(),
          )
        : [opts.project];
      for (const project of projects) {
        await runFeaturesIndex({
          project,
          workspaceRoot,
        });
      }
      console.log("INDEX.md regenerated");
    });

  return features;
}
