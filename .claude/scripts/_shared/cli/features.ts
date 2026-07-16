import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { runFeaturesLint } from "@shared/cli/features-lint.ts";
import { outputJson } from "@shared/lib/cli.ts";
import { repoRoot } from "@shared/lib/paths.ts";
import { Command, Option } from "commander";
import { gitMove, runFeaturesArchive } from "./features-archive.ts";
import { runFeaturesIndex } from "./features-index.ts";
import { runFeaturesLs } from "./features-ls.ts";
import { runFeaturesMigrate } from "./features-migrate.ts";
import { runFeaturesNew } from "./features-new.ts";
import { runFeaturesResolve } from "./features-resolve.ts";
import { runFeaturesShow } from "./features-show.ts";
import { runResultsPrune } from "./results-prune.ts";

export function buildFeaturesCommand(): Command {
  const features = new Command("features").description("需求功能目录管理");

  const createFeature = (): Command =>
    new Command("create <slug>")
      .description("创建需求功能目录及 metadata.yaml、manifest.json")
      .requiredOption("--display-name <name>", "中文人读名")
      .requiredOption("--project <name>", "项目名（必填）")
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
        console.log(`[features create] 已创建 ${result.featureId}：${result.featureDir}`);
      });
  features.addCommand(createFeature());

  const listFeatures = (): Command =>
    new Command("list")
      .description("列出需求功能，支持按模块、客户、版本等条件筛选")
      .requiredOption("--project <name>", "项目名（必填）")
      .option("--module <name>", "按模块筛选")
      .option("--customer <name>", "按客户筛选")
      .option("--version <name>", "按版本筛选")
      .option("--owner <name>", "按负责人筛选")
      .option("--created-after <yyyy-mm>", "只显示该月份及以后创建的需求")
      .option("--status <name>", "按需求状态筛选")
      .option("--automation-status <name>", "按自动化状态筛选")
      .option("--last-run <name>", "按最近一次运行状态筛选")
      .addOption(
        new Option("--format <format>", "输出格式")
          .choices(["table", "json", "md"])
          .default("table"),
      )
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
          console.log("| ID | 名称 | 状态 | 模块 | 自动化 | 最近运行 |");
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
  features.addCommand(listFeatures());

  features
    .command("show <feature-id>")
    .description("显示一个需求功能的详细信息")
    .requiredOption("--project <name>", "项目名（必填）")
    .action(async (featureId: string, opts: Record<string, string>) => {
      const d = await runFeaturesShow({
        project: opts.project,
        featureId,
        workspaceRoot: join(repoRoot(), "workspace"),
      });
      outputJson(d);
    });

  features
    .command("lint [feature-id]")
    .description("检查需求功能的 metadata.yaml 与 manifest.json")
    .requiredOption("--project <name>", "项目名（必填）")
    .option("--all", "检查所有工作区项目", false)
    .option("--exit-code", "发现违规时返回非零退出码", false)
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
        console.log(`\n[features lint] 违规=${violations.length}`);
        if (opts.exitCode && violations.length > 0) process.exit(1);
      },
    );

  features
    .command("index")
    .description("生成 features/INDEX.md")
    .requiredOption("--project <name>", "项目名（必填）")
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
      console.log("[features index] 已重新生成 INDEX.md");
    });

  features
    .command("resolve")
    .description("计算确定的 feature_id 与目录，不创建文件")
    .requiredOption("--project <name>", "项目名")
    .requiredOption("--module <name>", "模块名 (module-identify 产出)")
    .option("--slug <slug>", "显式 slug (最高优先级)")
    .option("--lanhu-page <id>", "Lanhu pageId (派生来源)")
    .option("--prd-file <name>", "PRD 文件名 (派生来源)")
    .option("--feature-version <v>", "版本目录 (如 v6.4.11)，不指定则落 _standing")
    .option("--json", "输出 JSON", false)
    .action((opts: Record<string, string | boolean>) => {
      const source = opts.lanhuPage
        ? { kind: "lanhu" as const, pageId: String(opts.lanhuPage) }
        : opts.prdFile
          ? { kind: "prd" as const, filename: String(opts.prdFile) }
          : undefined;
      const result = runFeaturesResolve({
        project: String(opts.project),
        module: String(opts.module),
        slug: opts.slug ? String(opts.slug) : undefined,
        source,
        version: opts.featureVersion ? String(opts.featureVersion) : undefined,
        workspaceRoot: join(repoRoot(), "workspace"),
      });
      console.log(opts.json ? JSON.stringify(result) : `${result.featureId}\t${result.featureDir}`);
    });

  features
    .command("clean")
    .description("按保留策略清理运行目录，默认仅预览")
    .requiredOption("--project <name>", "项目名（必填）")
    .option("--feature <dir-name>", "只清理一个需求功能")
    .option("--keep <n>", "保留最近 N 次", "3")
    .option("--apply", "真正删除（缺省 dry-run）", false)
    .action(async (opts: { project: string; feature?: string; keep: string; apply: boolean }) => {
      const r = await runResultsPrune({
        project: opts.project,
        featureId: opts.feature,
        workspaceRoot: join(repoRoot(), "workspace"),
        keep: parseInt(opts.keep, 10),
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
    });

  features
    .command("archive <version>")
    .description("将版本目录移入 features/_archived/<version>，并重建 INDEX")
    .requiredOption("--project <name>", "项目名（必填）")
    .action(async (version: string, opts: { project: string }) => {
      // 整目录搬移用 gitMove（git mv 优先、renameSync 兜底）；安全性论证见
      // features-archive.ts 的 gitMove 注释与 husk 回归测试。
      const r = await runFeaturesArchive({
        project: opts.project,
        workspaceRoot: join(repoRoot(), "workspace"),
        version,
        move: gitMove,
      });
      console.log(`[features archive] 已归档 ${r.from} → ${r.to}`);
    });

  features
    .command("migrate")
    .description("将旧版平铺目录迁移为 cases、automation、runs 分层结构")
    .requiredOption("--project <name>", "项目名（必填）")
    .option("--apply", "真正执行迁移（缺省 dry-run）", false)
    .option("--allow-unresolved", "跳过无法推断版本的目录（不传则遇到 unresolved 即报错）", false)
    .option("--fallback-group <group>", "无法推断版本时的兜底分组（如 _standing）")
    .action(
      async (opts: {
        project: string;
        apply: boolean;
        allowUnresolved: boolean;
        fallbackGroup?: string;
      }) => {
        const workspaceRoot = join(repoRoot(), "workspace");
        // 迁移全程用默认 renameSync：一次性移动整个 feature 目录（含 ignored 文件如
        // runs/），不注入 git mv。git mv 只搬 tracked 文件，且 merge 预删 manifest.json
        // 会让整目录 git mv 失败、触发 renameSync 兜底，留下 husk + 重复副本（见
        // features-migrate.test.ts 的 husk 回归测试）。
        const rows = await runFeaturesMigrate({
          project: opts.project,
          workspaceRoot,
          apply: opts.apply,
          allowUnresolved: opts.allowUnresolved,
          fallbackGroup: opts.fallbackGroup,
        });

        // apply 后用 git add -A 让 index 与重组后的工作树对齐；内容未变的移动由 git 在
        // 提交时按 rename 检测，metadata.yaml 因合并而变则记为 delete+add。
        if (opts.apply) {
          const featuresDir = join(workspaceRoot, opts.project, "features");
          execFileSync("git", ["add", "-A", featuresDir], { stdio: "pipe" });
        }

        if (!opts.apply) {
          console.log(`[预览] 发现 ${rows.length} 个待迁移的旧版需求目录：`);
          for (const row of rows) {
            if (row.targetGroup === null) {
              console.log(`  无法确定目标目录  ${row.dirName}`);
            } else {
              const collisionTag = row.collision ? " [COLLISION: target exists]" : "";
              console.log(`  ${row.dirName} → ${row.targetGroup}/${row.dirName}${collisionTag}`);
              for (const mv of row.moves) {
                console.log(`    ${mv.from} → ${mv.to}`);
              }
            }
            for (const w of row.warns) {
              console.warn(`  警告：${w}`);
            }
          }
        } else {
          const applied = rows.filter((r) => r.targetGroup !== null);
          const skipped = rows.filter((r) => r.targetGroup === null);
          console.log(
            `已迁移 ${applied.length} 个需求目录；跳过 ${skipped.length} 个无法确定目标的目录。`,
          );
        }
      },
    );

  return features;
}
