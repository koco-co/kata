import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Run a read-only git command against a source repo; returns stdout. */
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
      // 尝试下一个本地 ref；不 fetch、不改变仓库状态
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

export interface ConfiguredSourceRepo {
  group: string;
  repo: string;
  url: string;
  path: string;
}

export function parseGitUrl(url: string): { group: string; repo: string } {
  const cleaned = url.replace(/\.git$/, "").replace(/\/$/, "");
  const parts = cleaned.split("/");
  const repo = parts.pop() ?? "";
  const group = parts.pop() ?? "";
  return { group, repo };
}

/** Find a configured repository in the user's external source root without creating a cache. */
function findLocalSourceRepo(root: string | undefined, canonicalUrl: string): string | undefined {
  if (!root || !existsSync(root)) return undefined;
  const expected = parseGitUrl(canonicalUrl);
  const candidates: string[] = [];

  const walk = (dir: string, depth: number): void => {
    if (depth > 0 && isGitSourceRepo(dir)) {
      candidates.push(dir);
      return;
    }
    if (depth >= 3) return;
    try {
      const entries = readdirSync(dir, { withFileTypes: true, encoding: "utf8" });
      for (const entry of entries) {
        if (entry.name === ".git" || (!entry.isDirectory() && !entry.isSymbolicLink())) continue;
        walk(join(dir, entry.name), depth + 1);
      }
    } catch {
      return;
    }
  };
  walk(root, 0);

  return candidates.find((candidate) => {
    try {
      const actual = parseGitUrl(git(candidate, ["remote", "get-url", "origin"]).trim());
      return (
        actual.group.toLowerCase() === expected.group.toLowerCase() &&
        actual.repo.toLowerCase() === expected.repo.toLowerCase()
      );
    } catch {
      return false;
    }
  });
}

export function configuredSourceRepos(
  sourceRoot: string | undefined,
  sourceRepos: string | undefined,
): ConfiguredSourceRepo[] {
  const repos: ConfiguredSourceRepo[] = [];
  for (const url of (sourceRepos ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)) {
    const { group, repo } = parseGitUrl(url);
    const path = findLocalSourceRepo(sourceRoot, url);
    if (group && repo && path) repos.push({ group, repo, url, path });
  }
  return repos;
}

/** Resolve "group/repo" (or bare "repo") against configured source repos; returns the local path. */
export function resolveConfiguredSourceRepo(
  repoId: string,
  sourceRoot: string | undefined,
  sourceRepos: string | undefined,
): string | undefined {
  const [requestedGroup, requestedRepo, ...extra] = repoId.split("/");
  if (!requestedGroup || extra.length > 0) return undefined;
  const candidates = configuredSourceRepos(sourceRoot, sourceRepos).filter((entry) => {
    if (!requestedRepo) return entry.repo.toLowerCase() === requestedGroup.toLowerCase();
    return (
      entry.group.toLowerCase() === requestedGroup.toLowerCase() &&
      entry.repo.toLowerCase() === requestedRepo.toLowerCase()
    );
  });
  return candidates.length === 1 ? candidates[0]?.path : undefined;
}
