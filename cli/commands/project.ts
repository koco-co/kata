import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Command } from "commander";
import { writeFileAtomic } from "../lib/atomic-writer.ts";
import { outputJson } from "../lib/cli.ts";
import {
  diffProjectSkeleton,
  migrateLegacyHistorys,
  readProjectMetadata,
  renderTemplate,
  SKELETON_SPEC,
  TEMPLATE_ROOT_REL,
  validateProjectName,
} from "../lib/create-project.ts";
import { writeIndexFile } from "../lib/knowledge/index-data.ts";
import { repoRoot } from "../lib/workspace-locator.ts";

function tplRoot(): string {
  return resolve(repoRoot(), TEMPLATE_ROOT_REL);
}

function projectDir(project: string): string {
  return join(repoRoot(), "workspace", project);
}

function ensureProjectName(project: string): void {
  const nameCheck = validateProjectName(project);
  if (!nameCheck.valid) throw new Error(`项目名称无效：${nameCheck.error}`);
}

function planFor(project: string) {
  ensureProjectName(project);
  const dir = projectDir(project);
  return { dir, diff: diffProjectSkeleton(dir, tplRoot()) };
}

function missingPlan(diff: ReturnType<typeof diffProjectSkeleton>) {
  return {
    dirs: diff.missing_dirs,
    files: diff.missing_files,
    gitkeeps: diff.missing_gitkeeps,
    invalid_paths: diff.invalid_paths,
  };
}

function applyMissing(project: string, dir: string, diff: ReturnType<typeof diffProjectSkeleton>) {
  mkdirSync(dir, { recursive: true });
  const migration = migrateLegacyHistorys(dir);
  const created_dirs: string[] = [];
  for (const rel of diff.missing_dirs) {
    const abs = join(dir, rel);
    mkdirSync(abs, { recursive: true });
    created_dirs.push(abs);
  }
  const created_gitkeeps: string[] = [];
  for (const rel of diff.missing_gitkeeps) {
    const abs = join(dir, rel);
    writeFileAtomic(abs, "");
    created_gitkeeps.push(abs);
  }
  const created_files: string[] = [];
  for (const rel of diff.missing_files) {
    const src = join(tplRoot(), SKELETON_SPEC.template_files[rel]);
    const dst = join(dir, rel);
    const raw = readFileSync(src, "utf8");
    writeFileAtomic(dst, renderTemplate(raw, { project }));
    created_files.push(dst);
  }
  writeIndexFile(project);
  return { created_dirs, created_files, created_gitkeeps, legacy_renamed: migration.renamed };
}

/** Build the `project` command: scan / create / repair a workspace project. */
export function registerProject(program: Command): void {
  const project = program.command("project").description("项目工作区的创建、检查与修复");

  project
    .command("scan")
    .description("检查项目骨架与项目元数据")
    .requiredOption("--project <name>", "项目名")
    .action((opts: { project: string }) => {
      const { dir, diff } = planFor(opts.project);
      const metadata = readProjectMetadata(dir);
      outputJson({
        project: opts.project,
        exists: diff.exists,
        project_metadata: metadata,
        project_metadata_valid: diff.project_metadata_valid,
        missing_dirs: diff.missing_dirs,
        missing_files: diff.missing_files,
        missing_gitkeeps: diff.missing_gitkeeps,
        invalid_paths: diff.invalid_paths,
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
      const { dir, diff } = planFor(opts.project);
      if (diff.skeleton_complete) {
        outputJson({ skipped: true, project: opts.project, message: "已完整，无需补齐" });
        return;
      }
      if (opts.dryRun) {
        outputJson({ dry_run: true, project: opts.project, will_create: missingPlan(diff) });
        return;
      }
      if (!opts.confirmed) throw new Error("写入前请加 --confirmed；预览用 --dry-run");
      if (diff.invalid_paths.length > 0) {
        throw new Error(`发现类型冲突，未自动覆盖：${diff.invalid_paths.join(", ")}`);
      }
      const result = applyMissing(opts.project, dir, diff);
      outputJson({
        project: opts.project,
        ...result,
        scan_after: diffProjectSkeleton(dir, tplRoot()),
      });
    });

  project
    .command("repair")
    .description("安全修复项目工作区缺失项；不覆盖用户文件")
    .requiredOption("--project <name>", "项目名")
    .option("--apply", "执行修复(默认 dry-run)", false)
    .action((opts: { project: string; apply: boolean }) => {
      const { dir, diff } = planFor(opts.project);
      const plan = missingPlan(diff);
      if (!opts.apply) {
        outputJson({ dry_run: true, project: opts.project, repair: plan });
        return;
      }
      if (diff.invalid_paths.length > 0) {
        throw new Error(`发现用户文件或类型冲突，拒绝覆盖：${diff.invalid_paths.join(", ")}`);
      }
      // repair 只创建缺失项、不覆盖既有文件,无需备份
      const result = applyMissing(opts.project, dir, diff);
      const after = diffProjectSkeleton(dir, tplRoot());
      outputJson({ project: opts.project, ...result, scan_after: after });
      if (!after.skeleton_complete) process.exitCode = 2;
    });
}
