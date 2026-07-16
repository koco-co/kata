#!/usr/bin/env bun
/**
 * create-project.ts — 项目创建 + 骨架补齐。
 * Usage:
 *   kata project <action> --project <name> [...]
 * Actions: scan | create
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCli } from "@shared/lib/cli-runner.ts";
import {
  configJsonPath,
  diffProjectSkeleton,
  mergeProjectConfig,
  migrateLegacyHistorys,
  renderTemplate,
  SKELETON_SPEC,
  TEMPLATE_ROOT_REL,
  validateProjectName,
} from "@shared/lib/create-project.ts";
import { knowledgeDir, projectDir } from "@shared/lib/paths.ts";

function repoRoot(): string {
  return resolve(fileURLToPath(import.meta.url), "../../../../..");
}

function readConfig(): Record<string, unknown> {
  const p = configJsonPath();
  if (!existsSync(p)) return { projects: {} };
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>;
  } catch {
    return { projects: {} };
  }
}

function isProjectRegistered(name: string): boolean {
  const cfg = readConfig();
  const projects = (cfg.projects as Record<string, unknown> | undefined) ?? {};
  return Object.hasOwn(projects, name);
}

function fail(message: string, code = 1): never {
  process.stderr.write(`[project] ${message}\n`);
  process.exit(code);
}

function runScan(project: string): void {
  const nameCheck = validateProjectName(project);
  if (!nameCheck.valid) {
    fail(`项目名称无效：${nameCheck.error}`);
  }
  const projDir = projectDir(project);
  const tplRoot = resolve(repoRoot(), TEMPLATE_ROOT_REL);
  const diff = diffProjectSkeleton(projDir, tplRoot);
  const out = {
    project,
    valid_name: true,
    name_error: "",
    exists: diff.exists,
    missing_dirs: diff.missing_dirs,
    missing_files: diff.missing_files,
    missing_gitkeeps: diff.missing_gitkeeps,
    config_registered: isProjectRegistered(project),
    repos_configured: 0,
    skeleton_complete: diff.skeleton_complete,
  };
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

interface CreatePlan {
  dirs: string[];
  files: string[];
  gitkeeps: string[];
}

function computeCreatePlan(project: string): {
  plan: CreatePlan;
  skeleton_complete: boolean;
  config_registered: boolean;
} {
  const projDir = projectDir(project);
  const tplRoot = resolve(repoRoot(), TEMPLATE_ROOT_REL);
  const diff = diffProjectSkeleton(projDir, tplRoot);
  return {
    plan: {
      dirs: diff.missing_dirs,
      files: diff.missing_files,
      gitkeeps: diff.missing_gitkeeps,
    },
    skeleton_complete: diff.skeleton_complete,
    config_registered: isProjectRegistered(project),
  };
}

function runCreate(project: string, dryRun: boolean, confirmed: boolean): void {
  const nameCheck = validateProjectName(project);
  if (!nameCheck.valid) {
    fail(`项目名称无效：${nameCheck.error}`);
  }

  const { plan, skeleton_complete, config_registered } = computeCreatePlan(project);

  if (skeleton_complete && config_registered) {
    process.stdout.write(
      `${JSON.stringify(
        {
          skipped: true,
          project,
          message: "已完整，无需补齐",
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  if (dryRun) {
    process.stdout.write(
      `${JSON.stringify(
        {
          dry_run: true,
          project,
          will_create: plan,
          will_register: !config_registered,
          will_call_index: true,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  if (!confirmed) {
    fail("写入前请添加 --confirmed；如需预览，请使用 --dry-run。", 2);
  }

  const result = applyCreate(project);
  process.stdout.write(`${JSON.stringify({ project, ...result }, null, 2)}\n`);
}

function applyCreate(project: string): {
  created_dirs: string[];
  created_files: string[];
  created_gitkeeps: string[];
  registered_config: boolean;
  index_generated: boolean;
  index_path: string;
  legacy_renamed: boolean;
  legacy_conflict: boolean;
} {
  const projDir = projectDir(project);
  const tplRoot = resolve(repoRoot(), TEMPLATE_ROOT_REL);

  const migration = migrateLegacyHistorys(projDir);
  const legacyConflict = !migration.renamed && migration.from !== undefined;
  if (migration.renamed) {
    process.stderr.write(`[project] 已将旧目录 historys 重命名为 history\n`);
  } else if (legacyConflict) {
    process.stderr.write(
      `[project] 警告：historys/ 与 history/ 同时存在；已保留两者，请人工合并\n`,
    );
  }

  const diff = diffProjectSkeleton(projDir, tplRoot);

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
    const src = join(tplRoot, SKELETON_SPEC.template_files[rel]);
    const dst = join(projDir, rel);
    mkdirSync(dirname(dst), { recursive: true });
    const raw = readFileSync(src, "utf8");
    writeFileSync(dst, renderTemplate(raw, { project }));
    created_files.push(dst);
  }

  // config.json merge
  const cfgPath = configJsonPath();
  const existing = existsSync(cfgPath)
    ? (JSON.parse(readFileSync(cfgPath, "utf8")) as Record<string, unknown>)
    : {};
  const { merged, added } = mergeProjectConfig(existing, project);
  writeFileSync(cfgPath, `${JSON.stringify(merged, null, 2)}\n`);

  // Invoke project knowledge index generation.
  const indexPath = join(knowledgeDir(project), "_index.md");
  const kataScript = join(repoRoot(), ".claude/scripts/_shared/bin/kata");
  const kk = spawnSync(process.execPath, [kataScript, "knowledge", "index", "--project", project], {
    cwd: repoRoot(),
    env: process.env,
    encoding: "utf8",
  });
  if (kk.status !== 0) {
    process.stderr.write(kk.stderr || "");
    fail(`knowledge index 索引生成失败，退出码 ${kk.status}`);
  }

  return {
    created_dirs,
    created_files,
    created_gitkeeps,
    registered_config: added,
    index_generated: existsSync(indexPath),
    index_path: indexPath,
    legacy_renamed: migration.renamed,
    legacy_conflict: legacyConflict,
  };
}

export const program = createCli({
  name: "project",
  description: "项目工作区的创建、检查与修复",
  commands: [
    {
      name: "scan",
      description: "检查项目骨架与标准结构之间的差异",
      options: [{ flag: "--project <name>", description: "项目名称", required: true }],
      action: (opts: { project: string }) => {
        runScan(opts.project);
      },
    },
    {
      name: "create",
      description: "创建或补全项目工作区骨架",
      options: [
        { flag: "--project <name>", description: "项目名称", required: true },
        { flag: "--dry-run", description: "仅预览变更，不写入文件" },
        { flag: "--confirmed", description: "确认写入文件" },
      ],
      action: (opts: { project: string; dryRun?: boolean; confirmed?: boolean }) => {
        runCreate(opts.project, opts.dryRun === true, opts.confirmed === true);
      },
    },
  ],
});
