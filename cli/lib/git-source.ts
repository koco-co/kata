import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parse } from "yaml";
import { locateProjectRoot } from "./workspace-locator.ts";

/** A source repo entry from config/repos/sources.yaml. */
export interface SourceRepo {
  /** Unique id in "group/repo" form. */
  name: string;
  /** Owning workspace project (workspace/<project>). */
  project: string;
  /** Repo dir relative to the main worktree, e.g. .repos/<group>/<repo>. */
  path: string;
  /** Default branch used as the query ref. */
  branch: string;
  description?: string;
  /** false = read + pull/checkout only; true = authoring allowed (no such commands today). */
  writable: boolean;
}

/** Run a git command against a source repo; returns stdout. */
export function git(repoPath: string, args: string[]): string {
  return execFileSync("git", ["-C", repoPath, ...args], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function safeGitPath(filePath: string): boolean {
  return (
    filePath !== "" &&
    !filePath.startsWith("/") &&
    !filePath.split(/[\\/]/).includes("..") &&
    !filePath.includes("\0")
  );
}

function safeRef(ref: string): boolean {
  return ref !== "" && !ref.startsWith("-") && !ref.includes(":") && !ref.includes("\0");
}

export function isGitSourceRepo(repoPath: string): boolean {
  if (!existsSync(join(repoPath, ".git"))) return false;
  try {
    git(repoPath, ["rev-parse", "--git-dir"]);
    return true;
  } catch {
    return false;
  }
}

function sourceRefForBranch(repoPath: string, branch?: string): string {
  const candidates = branch
    ? [`refs/remotes/origin/${branch}`, `refs/heads/${branch}`, branch]
    : ["HEAD"];
  for (const candidate of candidates) {
    if (!safeRef(candidate)) continue;
    try {
      git(repoPath, ["rev-parse", "--verify", `${candidate}^{commit}`]);
      return candidate;
    } catch {
      // 尝试下一个本地 ref;不 fetch、不改变仓库状态
    }
  }
  return branch ?? "HEAD";
}

/** Read a file from a source repo at a ref via `git show`; undefined when unreadable. */
export function readGitSourceFile(
  repoPath: string,
  filePath: string,
  branch?: string,
): string | undefined {
  if (!safeGitPath(filePath) || !isGitSourceRepo(repoPath)) return undefined;
  const ref = sourceRefForBranch(repoPath, branch);
  if (!safeRef(ref)) return undefined;
  try {
    return git(repoPath, ["show", `${ref}:${filePath}`]);
  } catch {
    return undefined;
  }
}

// ─── 配置加载(config/repos/sources.yaml)───

/**
 * Main worktree root. `.repos/` lives only in the main worktree (gitignored),
 * so resolve through the git common dir instead of the current root.
 */
export function mainWorktreeRoot(root: string = locateProjectRoot()): string {
  const common = execFileSync(
    "git",
    ["-C", root, "rev-parse", "--path-format=absolute", "--git-common-dir"],
    { encoding: "utf8" },
  ).trim();
  return dirname(common);
}

/** Load and validate config/repos/sources.yaml; throws on missing/malformed entries. */
export function loadSourceRepos(root: string = locateProjectRoot()): SourceRepo[] {
  const configPath = join(root, "config", "repos", "sources.yaml");
  if (!existsSync(configPath)) {
    throw new Error(`未找到源码仓库配置 ${configPath}`);
  }
  const doc = parse(readFileSync(configPath, "utf8")) as { repos?: unknown };
  if (!Array.isArray(doc?.repos)) throw new Error(`${configPath} 缺 repos 数组`);
  return doc.repos.map((raw: unknown, i: number) => {
    const o = raw as Record<string, unknown>;
    for (const field of ["name", "project", "path", "branch"] as const) {
      if (typeof o[field] !== "string" || !(o[field] as string).trim()) {
        throw new Error(`${configPath} repos[${i}].${field} 缺失或不是字符串`);
      }
    }
    if (o.writable !== undefined && typeof o.writable !== "boolean") {
      throw new Error(`${configPath} repos[${i}].writable 必须是布尔值`);
    }
    return {
      name: o.name as string,
      project: o.project as string,
      path: o.path as string,
      branch: o.branch as string,
      ...(typeof o.description === "string" ? { description: o.description } : {}),
      writable: o.writable === true,
    };
  });
}

/** Resolve "group/repo" (or bare "repo") to the config entry; undefined when not unique. */
export function resolveSourceRepo(
  repoId: string,
  root?: string,
  mainRoot?: string,
): (SourceRepo & { absPath: string }) | undefined {
  const repos = loadSourceRepos(root);
  const lower = repoId.toLowerCase();
  const matches = repos.filter(
    (r) =>
      r.name.toLowerCase() === lower ||
      (!lower.includes("/") && r.name.split("/").pop()?.toLowerCase() === lower),
  );
  if (matches.length !== 1) return undefined;
  const repo = matches[0];
  // 实体仓库只在主工作树(gitignored);worktree 里经 common-dir 重定向
  return { ...repo, absPath: join(mainRoot ?? mainWorktreeRoot(root), repo.path) };
}
