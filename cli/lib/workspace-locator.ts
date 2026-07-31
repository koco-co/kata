import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import type { ProjectPaths } from "./types.ts";

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** Reject project names that are empty or could escape workspace/ ("..", separators). */
export function validateProjectName(project: string): void {
  if (!project || project === "." || project === ".." || /[/\\]/.test(project)) {
    throw new Error(`kata: 非法项目名 "${project}"`);
  }
}

function isRepoRoot(dir: string): boolean {
  return isDirectory(join(dir, "workspace")) && existsSync(join(dir, "package.json"));
}

function workspaceRoot(root: string): string {
  return process.env.KATA_WORKSPACE_ROOT ?? join(root, "workspace");
}

/** Locate the repo root by walking up to a dir with workspace/ + package.json. */
export function locateProjectRoot(fromDir: string = process.cwd()): string {
  let dir = resolve(fromDir);
  for (;;) {
    // .repos/ 下的克隆仓库可能自带 workspace/ 与 package.json，是伪根，继续向上
    if (isRepoRoot(dir) && !dir.split(sep).includes(".repos")) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) throw new Error("kata: 未找到仓库根(缺 workspace/ 与 package.json)");
    dir = parent;
  }
}

/** Return canonical paths for a workspace project; throws if the project dir is absent. */
export function locateProject(project: string, root?: string): ProjectPaths {
  validateProjectName(project);
  const r = root ?? locateProjectRoot();
  // KATA_WORKSPACE_ROOT 把 workspace/ 重定向到仓库外(私有工作区迁移); 不设则用 <root>/workspace
  const projectDir = join(workspaceRoot(r), project);
  if (!isDirectory(projectDir)) throw new Error(`kata: 未知项目 ${project}(${projectDir} 不存在)`);
  return {
    root: r,
    projectDir,
    featuresDir: join(projectDir, "features"),
    knowledgeDir: join(projectDir, "knowledge"),
    sharedDir: join(projectDir, "_shared"),
    analysesDir: join(projectDir, "analyses"),
    cacheDir: join(projectDir, ".cache"),
  };
}

/** List canonical workspace project directories for project-wide read-only checks. */
export function listWorkspaceProjects(root?: string): string[] {
  const r = root ?? locateProjectRoot();
  const dir = workspaceRoot(r);
  if (!isDirectory(dir)) return [];
  return readdirSync(dir)
    .filter((name) => isDirectory(join(dir, name)))
    .sort((left, right) => left.localeCompare(right));
}

/** Alias of locateProjectRoot for call sites that read more naturally as "repo root". */
export const repoRoot = locateProjectRoot;
