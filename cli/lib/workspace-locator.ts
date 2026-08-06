import { existsSync, lstatSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import type { ProjectPaths } from "./types.ts";

function isDirectory(path: string): boolean {
  try {
    const stat = lstatSync(path);
    return stat.isDirectory() && !stat.isSymbolicLink();
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

export function workspaceRoot(root: string): string {
  return process.env.KATA_WORKSPACE_ROOT ?? join(root, "workspace");
}

function findRepoRoot(startDir: string): string | undefined {
  let dir = resolve(startDir);
  for (;;) {
    // .repos/ 下的克隆仓库可能自带 workspace/ 与 package.json，是伪根，继续向上
    if (isRepoRoot(dir) && !dir.split(sep).includes(".repos")) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/** Locate the repo root by walking up from cwd, then fall back to the linked script. */
export function locateProjectRoot(fromDir: string = process.cwd()): string {
  return locateProjectRootWithCandidates(fromDir, process.argv[1]);
}

export function locateProjectRootWithCandidates(
  fromDir: string,
  entryPath: string | undefined,
): string {
  const fromCwd = findRepoRoot(fromDir);
  if (fromCwd) return fromCwd;
  if (entryPath) {
    try {
      const resolvedEntry = realpathSync(entryPath);
      const fromEntry = findRepoRoot(dirname(resolvedEntry));
      if (fromEntry) return fromEntry;
    } catch {
      // 入口脚本不可解析时保留原始错误语义。
    }
  }
  throw new Error("kata: 未找到仓库根(缺 workspace/ 与 package.json)");
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
