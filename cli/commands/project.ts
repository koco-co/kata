import { Command } from "commander";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { outputJson } from "../lib/cli.ts";
import {
  SKELETON_SPEC,
  TEMPLATE_ROOT_REL,
  configJsonPath,
  diffProjectSkeleton,
  mergeProjectConfig,
  migrateLegacyHistorys,
  renderTemplate,
  validateProjectName,
} from "../lib/create-project.ts";
import { runIndex } from "../lib/knowledge/read.ts";
import { locateProject, repoRoot } from "../lib/workspace-locator.ts";

function readConfig(): Record<string, unknown> {
  const p = configJsonPath();
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>) : {};
}

function isProjectRegistered(name: string): boolean {
  const projects = (readConfig().projects as Record<string, unknown> | undefined) ?? {};
  return Object.hasOwn(projects, name);
}

function tplRoot(): string {
  return resolve(repoRoot(), TEMPLATE_ROOT_REL);
}

/** Build the `project` command: scan / create a workspace project skeleton. */
export function registerProject(program: Command): void {
  const project = program.command("project").description("项目工作区的创建与检查");

  project
    .command("scan")
    .description("检查项目骨架与标准结构的差异")
    .requiredOption("--project <name>", "项目名")
    .action((opts: { project: string }) => {
      const nameCheck = validateProjectName(opts.project);
      if (!nameCheck.valid) throw new Error(`项目名称无效：${nameCheck.error}`);
      const projDir = locateProject(opts.project).projectDir;
      const diff = diffProjectSkeleton(projDir, tplRoot());
      outputJson({
        project: opts.project,
        exists: diff.exists,
        missing_dirs: diff.missing_dirs,
        missing_files: diff.missing_files,
        missing_gitkeeps: diff.missing_gitkeeps,
        config_registered: isProjectRegistered(opts.project),
        skeleton_complete: diff.skeleton_complete,
      });
    });

  project
    .command("create")
    .description("创建或补齐项目工作区骨架")
    .requiredOption("--project <name>", "项目名")
    .option("--dry-run", "只预览", false)
    .option("--confirmed", "确认写入", false)
    .action((opts: { project: string; dryRun: boolean; confirmed: boolean }) => {
      const nameCheck = validateProjectName(opts.project);
      if (!nameCheck.valid) throw new Error(`项目名称无效：${nameCheck.error}`);
      const projDir = join(repoRoot(), "workspace", opts.project);
      const diff = diffProjectSkeleton(projDir, tplRoot());
      const registered = isProjectRegistered(opts.project);

      if (diff.skeleton_complete && registered) {
        outputJson({ skipped: true, project: opts.project, message: "已完整，无需补齐" });
        return;
      }
      if (opts.dryRun) {
        outputJson({
          dry_run: true,
          project: opts.project,
          will_create: { dirs: diff.missing_dirs, files: diff.missing_files, gitkeeps: diff.missing_gitkeeps },
          will_register: !registered,
        });
        return;
      }
      if (!opts.confirmed) throw new Error("写入前请加 --confirmed；预览用 --dry-run");

      // 写入骨架
      mkdirSync(projDir, { recursive: true });
      const migration = migrateLegacyHistorys(projDir);
      const created_dirs: string[] = [];
      for (const rel of diff.missing_dirs) {
        const abs = join(projDir, rel);
        mkdirSync(abs, { recursive: true });
        created_dirs.push(abs);
      }
      const created_gitkeeps: string[] = [];
      for (const rel of diff.missing_gitkeeps) {
        const abs = join(projDir, rel);
        writeFileSync(abs, "");
        created_gitkeeps.push(abs);
      }
      const created_files: string[] = [];
      for (const rel of diff.missing_files) {
        const src = join(tplRoot(), SKELETON_SPEC.template_files[rel]);
        const dst = join(projDir, rel);
        mkdirSync(dirname(dst), { recursive: true });
        writeFileSync(dst, renderTemplate(readFileSync(src, "utf8"), { project: opts.project }));
        created_files.push(dst);
      }

      // config.json 注册
      const cfgPath = configJsonPath();
      const existing = existsSync(cfgPath) ? (JSON.parse(readFileSync(cfgPath, "utf8")) as Record<string, unknown>) : {};
      const { merged, added } = mergeProjectConfig(existing, opts.project);
      writeFileSync(cfgPath, `${JSON.stringify(merged, null, 2)}\n`);

      // 知识库索引(直接调用, 不 spawn 旧 kata)
      runIndex({ project: opts.project });

      outputJson({
        project: opts.project,
        created_dirs,
        created_files,
        created_gitkeeps,
        registered_config: added,
        legacy_renamed: migration.renamed,
      });
    });
}
