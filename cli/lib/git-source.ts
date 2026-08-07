import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { parse } from "yaml";
import { mainWorktreeRoot, repositoriesPath } from "./config-paths.ts";
import { assertNoSymlinkPath } from "./features-layout.ts";
import { locateProjectRoot } from "./workspace-locator.ts";

/** A source repo entry from config/private/repositories.yaml. */
export interface SourceRepo {
  /** Unique id in "group/repo" form. */
  name: string;
  /** Owning workspace project (workspace/<project>). */
  project: string;
  /** Repo dir relative to the main worktree, e.g. .repos/<group>/<repo>. */
  path: string;
  /** Default branch used as the query ref. */
  branch: string;
  /** Requirement modules this repo can answer; "*" means common. */
  modules?: string[];
  /** Requirement customers this repo can answer; "*" means common. */
  customers?: string[];
  description?: string;
  /** false = read + pull/checkout only; true = authoring allowed (no such commands today). */
  writable: boolean;
}

/** Run a git command against a source repo; returns stdout. */
const GIT_MAX_BUFFER = 16 * 1024 * 1024;

export function git(repoPath: string, args: string[]): string {
  try {
    return execFileSync("git", ["-C", repoPath, ...args], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: GIT_MAX_BUFFER,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOBUFS") {
      throw new Error(`git ${args[0] ?? ""} 输出超过 16MB 上限(ENOBUFS);缩小查询范围后重试`);
    }
    throw err;
  }
}

export function safeGitPath(filePath: string): boolean {
  return (
    filePath !== "" &&
    !filePath.startsWith("/") &&
    !filePath.split(/[\\/]/).includes("..") &&
    !filePath.includes("\0")
  );
}

export function safeRef(ref: string): boolean {
  return ref !== "" && !ref.startsWith("-") && !ref.includes(":") && !ref.includes("\0");
}

/** Validate a git `show` style `<ref>:<path>` argument before invoking git. */
export function assertSafeRefPath(refPath: string): void {
  const colon = refPath.indexOf(":");
  if (colon <= 0 || !safeRef(refPath.slice(0, colon)) || !safeGitPath(refPath.slice(colon + 1))) {
    throw new Error(`非法 ref:path: ${refPath}`);
  }
}

/** writable:false 的仓库只允许只读操作(含更新本地克隆的 fetch/pull/checkout)。 */
const READONLY_REPO_OPS = new Set([
  "fetch",
  "pull",
  "checkout",
  "repair-refs",
  "grep",
  "show",
  "rev-parse",
  "log",
  "diff",
  "status",
]);

export class RepoOperationNotAllowedError extends Error {
  readonly code = "ERR_REPO_READONLY";

  constructor(repo: string, op: string) {
    super(`仓库 ${repo} 声明 writable: false,禁止 ${op};仅允许只读操作`);
    this.name = "RepoOperationNotAllowedError";
  }
}

export function assertRepoOperationAllowed(repo: SourceRepo, op: string): void {
  if (repo.writable || READONLY_REPO_OPS.has(op)) return;
  throw new RepoOperationNotAllowedError(repo.name, op);
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

export interface QuarantinedGitRef {
  ref: string;
  /** Backup location relative to the repository git directory. */
  backup: string;
}

function looseRefFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const entryPath = join(root, entry.name);
    if (entry.isDirectory()) files.push(...looseRefFiles(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

function isValidGitRef(ref: string): boolean {
  try {
    execFileSync("git", ["check-ref-format", ref], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Move malformed loose remote-tracking refs out of refs/ before fetch.
 *
 * Git rejects the whole fetch when even one loose ref has an illegal name.
 * Only syntax-invalid refs under refs/remotes/origin are quarantined; valid
 * refs, packed refs and working-tree files are left untouched.
 */
export function quarantineInvalidRemoteRefs(repoPath: string): QuarantinedGitRef[] {
  const gitDir = git(repoPath, ["rev-parse", "--path-format=absolute", "--git-dir"]).trim();
  const originRoot = join(gitDir, "refs", "remotes", "origin");
  const quarantineRoot = join(gitDir, "kata-repair", "invalid-refs");
  const repaired: QuarantinedGitRef[] = [];

  for (const file of looseRefFiles(originRoot)) {
    const suffix = relative(originRoot, file);
    const ref = `refs/remotes/origin/${suffix.split("\\").join("/")}`;
    if (isValidGitRef(ref)) continue;

    let backup = join(quarantineRoot, suffix);
    let sequence = 1;
    while (existsSync(backup)) {
      backup = join(quarantineRoot, `${suffix}.${sequence}`);
      sequence += 1;
    }
    mkdirSync(dirname(backup), { recursive: true });
    renameSync(file, backup);
    repaired.push({
      ref,
      backup: relative(gitDir, backup).split("\\").join("/"),
    });
  }
  return repaired;
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

// ─── 配置加载(config/private/repositories.yaml)───

export { mainWorktreeRoot } from "./config-paths.ts";

/** Load and validate config/private/repositories.yaml; throws on missing/malformed entries. */
export function loadSourceRepos(root: string = locateProjectRoot()): SourceRepo[] {
  const localConfigPath = repositoriesPath(root);
  let configPath = localConfigPath;
  let configAnchor = root;
  if (!existsSync(configPath)) {
    try {
      configAnchor = mainWorktreeRoot(root);
      configPath = repositoriesPath(configAnchor);
    } catch {
      configPath = localConfigPath;
    }
  }
  assertNoSymlinkPath(configAnchor, configPath, "源码仓库配置");
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
    for (const field of ["modules", "customers"] as const) {
      if (
        !Array.isArray(o[field]) ||
        o[field].length === 0 ||
        o[field].some((value) => typeof value !== "string" || !value.trim())
      ) {
        throw new Error(`${configPath} repos[${i}].${field} 必须是非空字符串数组`);
      }
    }
    return {
      name: o.name as string,
      project: o.project as string,
      path: o.path as string,
      branch: o.branch as string,
      modules: o.modules as string[],
      customers: o.customers as string[],
      ...(typeof o.description === "string" ? { description: o.description } : {}),
      writable: o.writable === true,
    };
  });
}

export interface SourceRepoCriteria {
  project: string;
  module: string;
  customer: string;
}

function matchesSelector(values: string[], target: string): boolean {
  return values.includes("*") || values.includes(target);
}

/** Match only repositories explicitly declared for the requirement context. */
export function selectSourceRepos(repos: SourceRepo[], criteria: SourceRepoCriteria): SourceRepo[] {
  const matches = repos.filter(
    (repo) =>
      repo.project === criteria.project &&
      matchesSelector(repo.modules ?? [], criteria.module) &&
      matchesSelector(repo.customers ?? [], criteria.customer),
  );
  if (matches.length === 0) {
    throw new Error(
      `没有源码仓库匹配 project=${criteria.project}, module=${criteria.module}, customer=${criteria.customer}`,
    );
  }
  return matches;
}

export interface PreparedSourceRepo {
  repo: string;
  path: string;
  branch: string;
  commit: string;
  repaired_refs: QuarantinedGitRef[];
}

/** Fetch, checkout and fast-forward the configured branch for matched source repositories. */
export function prepareSourceRepos(
  criteria: SourceRepoCriteria,
  root: string = locateProjectRoot(),
): PreparedSourceRepo[] {
  const selected = selectSourceRepos(loadSourceRepos(root), criteria);
  const mainRoot = mainWorktreeRoot(root);
  return selected.map((repo) => {
    const absPath = join(mainRoot, repo.path);
    if (!isGitSourceRepo(absPath)) throw new Error(`${absPath} 不是 git 仓库`);
    for (const operation of ["repair-refs", "fetch", "checkout", "pull"]) {
      assertRepoOperationAllowed(repo, operation);
    }
    if (!safeRef(repo.branch)) throw new Error(`仓库 ${repo.name} branch 非法: ${repo.branch}`);
    const repairedRefs = quarantineInvalidRemoteRefs(absPath);
    git(absPath, ["fetch", "origin", repo.branch]);
    try {
      git(absPath, ["checkout", repo.branch]);
    } catch {
      git(absPath, ["checkout", "-b", repo.branch, `origin/${repo.branch}`]);
    }
    git(absPath, ["pull", "--ff-only", "origin", repo.branch]);
    return {
      repo: repo.name,
      path: absPath,
      branch: repo.branch,
      commit: git(absPath, ["rev-parse", "--verify", "HEAD^{commit}"]).trim(),
      repaired_refs: repairedRefs,
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
