import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { assertRepoOperationAllowed, type SourceRepo, safeRef } from "./git-source.ts";
import type { DiffStats } from "./scan-report-types.ts";

function git(cwd: string, args: string[]): string {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
}

export function resolveCommit(repoPath: string, ref: string): string {
  if (!existsSync(repoPath)) {
    throw new Error(`repo path not found: ${repoPath}`);
  }
  if (!safeRef(ref)) {
    throw new Error(`unsafe git ref: ${ref}`);
  }
  return git(repoPath, ["rev-parse", ref]).trim();
}

export function computeDiffStats(diffText: string): DiffStats {
  let files = 0;
  let additions = 0;
  let deletions = 0;
  for (const line of diffText.split("\n")) {
    if (line.startsWith("diff --git ")) files += 1;
    else if (line.startsWith("+") && !line.startsWith("+++")) additions += 1;
    else if (line.startsWith("-") && !line.startsWith("---")) deletions += 1;
  }
  return { files, additions, deletions };
}

export interface FetchAndDiffOpts {
  skipFetch?: boolean;
  unified?: number; // default 20
}

export interface DiffOutput {
  diff: string;
  stats: DiffStats;
  base_commit: string;
  head_commit: string;
}

export function fetchAndDiff(
  repo: SourceRepo & { absPath: string },
  baseBranch: string,
  headBranch: string,
  opts: FetchAndDiffOpts = {},
): DiffOutput {
  const unified = opts.unified ?? 20;
  if (!opts.skipFetch) {
    assertRepoOperationAllowed(repo, "fetch");
    git(repo.absPath, ["fetch", "--quiet", "origin"]);
  }
  const baseCommit = resolveCommit(repo.absPath, baseBranch);
  const headCommit = resolveCommit(repo.absPath, headBranch);
  const diff = git(repo.absPath, ["diff", `${baseCommit}..${headCommit}`, `--unified=${unified}`]);
  return {
    diff,
    stats: computeDiffStats(diff),
    base_commit: baseCommit,
    head_commit: headCommit,
  };
}
