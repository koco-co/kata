import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
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

interface ProjectScopeOptions {
  readonly project?: string;
  readonly all: boolean;
}

export function resolveProjectScope(
  workspaceRoot: string,
  options: ProjectScopeOptions,
): string[] {
  const project = options.project?.trim();
  const hasProject = Boolean(project);
  if (hasProject === options.all) {
    throw new Error("请在 --project <name> 与 --all 中选择且只选择一项");
  }
  if (project) return [project];
  if (!existsSync(workspaceRoot)) throw new Error(`工作区不存在：${workspaceRoot}`);

  const projects = readdirSync(workspaceRoot, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() && existsSync(join(workspaceRoot, entry.name, "features")),
    )
    .map((entry) => entry.name)
    .sort();
  if (projects.length === 0) throw new Error("workspace 中没有包含 features 目录的项目");
  return projects;
}

export function parsePositiveInteger(value: string, optionName: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${optionName} 必须是正整数`);
  }
  return parsed;
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function markdownCell(value: unknown): string {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function gitPath(root: string, path: string): string {
  return relative(root, path).replaceAll("\\", "/");
}

export function buildFeaturesCommand(): Command {
  const features = new Command("features").description("需求功能目录管理");

  const createFeature = (): Command =>
    new Command("create <slug>")
      .description("创建需求功能目录及 metadata.yaml、manifest.json")
      .requiredOption("--display-name <name>", "中文名称")
      .requiredOption("--project <name>", "项目名")
      .option("--modules <items>", "模块，逗号分隔", "")
      .option("--customers <items>", "客户，逗号分隔", "")
      .option("--versions <items>", "版本，逗号分隔", "")
      .option("--owners <items>", "负责人，逗号分隔", "")
      .option(
        "--inputs <items>",
        "输入类型（prd、lanhu、axure、manual、bug-hotfix），逗号分隔",
        "prd",
      )
      .action(async (slug: string, opts: Record<string, string>) => {
        const result = await runFeaturesNew({
          project: opts.project,
          slug,
          displayName: opts.displayName,
          modules: splitCsv(opts.modules),
          customers: splitCsv(opts.customers),
          versions: splitCsv(opts.versions),
          owners: splitCsv(opts.owners),
          inputs: splitCsv(opts.inputs) as (
            | "prd"
            | "lanhu"
            | "axure"
            | "manual"
            | "bug-hotfix"
          )[],
          workspaceRoot: join(repoRoot(), "workspace"),
        });
        console.log(`[features create] 已创建 ${result.featureId}：${result.featureDir}`);
      });
  features.addCommand(createFeature());

  const listFeatures = (): Command =>
    new Command("list")
      .description("列出需求功能，支持按模块、客户、版本等条件筛选")
      .requiredOption("--project <name>", "项目名")
      .option("--module <name>", "按模块筛选")
      .option("--customer <name>", "按客户筛选")
      .option("--version <name>", "按版本筛选")
      .option("--owner <name>", "按负责人筛选")
      .option("--created-after <yyyy-mm>", "只显示该月份及以后创建的需求")
      .option("--status <status>", "按需求状态筛选")
      .option("--automation-status <status>", "按自动化状态筛选")
      .option("--last-run <status>", "按最近一次运行状态筛选")
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
          return;
        }
        if (opts.format === "md") {
          console.log("| ID | 名称 | 状态 | 模块 | 自动化 | 最近运行 |");
          console.log("| --- | --- | --- | --- | --- | --- |");
          for (const row of rows) {
            console.log(
              `| ${markdownCell(row.id)} | ${markdownCell(row.displayName)} | ${markdownCell(row.status)} | ${markdownCell(row.modules.join(","))} | ${markdownCell(row.automationStatus)} | ${markdownCell(row.lastRunStatus)} |`,
            );
          }
          return;
        }
        console.log("ID\t名称\t状态\t模块\t自动化\t最近运行");
        for (const row of rows) {
          console.log(
            `${row.id}\t${row.displayName}\t${row.status}\t${row.modules.join(",")}\t${row.automationStatus}\t${row.lastRunStatus}`,
          );
        }
      });
  features.addCommand(listFeatures());

  features
    .command("show <feature-id>")
    .description("显示一个需求功能的详细信息")
    .requiredOption("--project <name>", "项目名")
    .action(async (featureId: string, opts: { project: string }) => {
      outputJson(
        await runFeaturesShow({
          project: opts.project,
          featureId,
          workspaceRoot: join(repoRoot(), "workspace"),
        }),
      );
    });

  features
    .command("lint [feature-id]")
    .description("检查需求功能的 metadata.yaml 与 manifest.json")
    .option("--project <name>", "项目名；与 --all 二选一")
    .option("--all", "检查所有包含 features 目录的项目", false)
    .option("--exit-code", "发现违规时返回非零退出码", false)
    .action(
      async (
        featureId: string | undefined,
        opts: { project?: string; all: boolean; exitCode: boolean },
      ) => {
        const workspaceRoot = join(repoRoot(), "workspace");
        const projects = resolveProjectScope(workspaceRoot, opts);
        const results = await Promise.all(
          projects.map((project) => runFeaturesLint({ project, workspaceRoot, featureId })),
        );
        const violations = results.flatMap((result) => result.violations);
        for (const violation of violations) {
          process.stderr.write(
            `${violation.feature} [${violation.rule}] ${violation.message}\n`,
          );
        }
        process.stderr.write(
          `[features lint] projects=${projects.length} violations=${violations.length}\n`,
        );
        if (opts.exitCode && violations.length > 0) process.exitCode = 2;
      },
    );

  features
    .command("index")
    .description("生成 features/INDEX.md")
    .option("--project <name>", "项目名；与 --all 二选一")
    .option("--all", "为所有包含 features 目录的项目生成索引", false)
    .option("--dry-run", "只生成内容，不写入 INDEX.md", false)
    .action(
      async (opts: { project?: string; all: boolean; dryRun: boolean }) => {
        const workspaceRoot = join(repoRoot(), "workspace");
        const projects = resolveProjectScope(workspaceRoot, opts);
        for (const project of projects) {
          await runFeaturesIndex({ project, workspaceRoot, write: !opts.dryRun });
        }
        const action = opts.dryRun ? "已预览" : "已更新";
        process.stderr.write(
          `[features index] ${action} ${projects.length} 个项目的 INDEX.md\n`,
        );
      },
    );

  features
    .command("resolve")
    .description("计算确定的 feature_id 与目录，不创建文件")
    .requiredOption("--project <name>", "项目名")
    .requiredOption("--module <name>", "模块名")
    .option("--slug <slug>", "显式 slug，优先级最高")
    .option("--lanhu-page <id>", "Lanhu pageId")
    .option("--prd-file <name>", "PRD 文件名")
    .option("--feature-version <version>", "版本目录；不指定时落入 _standing")
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
        create: false,
      });
      if (opts.json) outputJson(result);
      else console.log(`${result.featureId}\t${result.featureDir}`);
    });

  features
    .command("clean")
    .description("按保留策略清理运行目录，默认仅预览")
    .requiredOption("--project <name>", "项目名")
    .option("--feature <id>", "只清理一个需求功能")
    .option("--keep <count>", "保留最近 N 次", "3")
    .option("--apply", "真正删除；缺省为预览", false)
    .action(
      async (opts: { project: string; feature?: string; keep: string; apply: boolean }) => {
        const keep = parsePositiveInteger(opts.keep, "--keep");
        const result = await runResultsPrune({
          project: opts.project,
          featureId: opts.feature,
          workspaceRoot: join(repoRoot(), "workspace"),
          keep,
          apply: opts.apply,
        });
        if (!opts.apply) {
          console.log(
            `[预览] 将删除 ${result.removed.length} 个运行目录，保留 ${result.kept.length} 个`,
          );
          for (const plan of result.plan) {
            if (plan.remove.length > 0) {
              console.log(`删除：${plan.remove.join(", ")}（位于 ${plan.featureDir}）`);
            }
          }
          return;
        }
        console.log(
          `已删除 ${result.removed.length} 个运行目录，保留 ${result.kept.length} 个`,
        );
      },
    );

  features
    .command("archive <version>")
    .description("将版本目录移入 features/_archived/，并重建 INDEX")
    .requiredOption("--project <name>", "项目名")
    .action(async (version: string, opts: { project: string }) => {
      const result = await runFeaturesArchive({
        project: opts.project,
        workspaceRoot: join(repoRoot(), "workspace"),
        version,
        move: gitMove,
      });
      console.log(`[features archive] 已归档 ${result.from} → ${result.to}`);
    });

  features
    .command("migrate")
    .description("将旧版平铺目录迁移为 cases、automation、runs 分层结构")
    .requiredOption("--project <name>", "项目名")
    .option("--apply", "真正执行迁移；缺省为预览", false)
    .option("--stage", "迁移后只暂存本次涉及的目录；需要 --apply", false)
    .option("--allow-unresolved", "跳过无法推断版本的目录", false)
    .option("--fallback-group <name>", "无法推断版本时的兜底分组，如 _standing")
    .action(
      async (opts: {
        project: string;
        apply: boolean;
        stage: boolean;
        allowUnresolved: boolean;
        fallbackGroup?: string;
      }) => {
        if (opts.stage && !opts.apply) throw new Error("--stage 只能与 --apply 一起使用");
        const root = repoRoot();
        const workspaceRoot = join(root, "workspace");
        const rows = await runFeaturesMigrate({
          project: opts.project,
          workspaceRoot,
          apply: opts.apply,
          allowUnresolved: opts.allowUnresolved,
          fallbackGroup: opts.fallbackGroup,
        });

        if (opts.stage) {
          const featuresDir = join(workspaceRoot, opts.project, "features");
          const paths = new Set<string>();
          for (const row of rows) {
            paths.add(gitPath(root, join(featuresDir, row.dirName)));
            if (row.targetGroup !== null) {
              paths.add(gitPath(root, join(featuresDir, row.targetGroup, row.dirName)));
            }
          }
          if (paths.size > 0) {
            execFileSync("git", ["-C", root, "add", "-A", "--", ...paths], {
              stdio: "pipe",
            });
          }
        }

        if (!opts.apply) {
          console.log(`[预览] 发现 ${rows.length} 个待迁移的旧版需求目录：`);
          for (const row of rows) {
            if (row.targetGroup === null) {
              console.log(`无法确定目标目录：${row.dirName}`);
            } else {
              const collision = row.collision ? " [目标目录已存在]" : "";
              console.log(`${row.dirName} → ${row.targetGroup}/${row.dirName}${collision}`);
              for (const move of row.moves) console.log(`${move.from} → ${move.to}`);
            }
            for (const warning of row.warns) console.warn(`警告：${warning}`);
          }
          return;
        }

        const applied = rows.filter((row) => row.targetGroup !== null);
        const skipped = rows.filter((row) => row.targetGroup === null);
        console.log(
          `已迁移 ${applied.length} 个需求目录；跳过 ${skipped.length} 个无法确定目标的目录。`,
        );
        if (!opts.stage) {
          process.stderr.write(
            "[features migrate] 工作树已更新，Git 暂存区未改变；需要暂存时重新运行并加入 --stage。\n",
          );
        }
      },
    );

  return features;
}
