#!/usr/bin/env bun
/**
 * repo-sync.ts — Read configured source repositories through Git objects.
 *
 * Usage:
 *   kata repos sync --url <git-url> [--branch <branch>] --project <project>
 *   kata repos sync-env --project <project> [--branch <branch>]
 *   kata repos sync-profile --name <profile>
 *   kata repos show --project <project> --repo <group/repo> --path <file> [--ref <ref>]
 *   kata repos grep --project <project> --repo <group/repo> --pattern <text> [--ref <ref>]
 *   kata repos list --project <project> --repo <group/repo> [--path <dir>] [--ref <ref>]
 *   kata repos --help
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createCli } from "@shared/lib/cli-runner.ts";
import { getEnv } from "@shared/lib/env.ts";
import {
  findLocalSourceRepo,
  resolveConfiguredSourceRepo,
  sourceRefForBranch,
} from "@shared/lib/git-source.ts";
import { parseGitUrl, repoRoot } from "@shared/lib/paths.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SyncOutput {
  repo: string;
  group: string;
  branch: string;
  commit: string;
  path: string;
  storage: "external-git-repo";
}

interface ErrorOutput {
  error: string;
  step: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function git(cwd: string, args: string[]): string {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

function inspectGitSource(repoPath: string, branch?: string): { branch: string; commit: string } {
  const resolvedBranch = branch || git(repoPath, ["branch", "--show-current"]) || "HEAD";
  const ref = branch ? sourceRefForBranch(repoPath, branch) : "HEAD";
  return { branch: resolvedBranch, commit: git(repoPath, ["rev-parse", "--short", ref]) };
}

function sourceRepoPath(_project: string | undefined, repo: string): string {
  if (!repo || repo.startsWith("/") || repo.split("/").includes("..")) {
    throw new Error(`Invalid repository path: ${repo}`);
  }
  const configured = resolveConfiguredSourceRepo(
    repo,
    getEnv("KATA_SOURCE_REPO_ROOT"),
    getEnv("KATA_SOURCE_REPOS"),
  );
  if (configured) return configured;
  throw new Error(
    `Configured source repository not found: ${repo}. Check KATA_SOURCE_REPO_ROOT and KATA_SOURCE_REPOS.`,
  );
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function runSync(opts: {
  url?: string;
  branch?: string;
  project?: string;
  baseDir?: string;
}): void {
  const { url, branch } = opts;
  if (!url) {
    const out: ErrorOutput = {
      error: "--url is required",
      step: "validate-args",
    };
    process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exit(1);
  }

  const { group, repo } = parseGitUrl(url);
  if (!group || !repo) {
    const out: ErrorOutput = {
      error: `Cannot parse git URL: "${url}"`,
      step: "parse-url",
    };
    process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exit(1);
  }

  const targetDir = findLocalSourceRepo(getEnv("KATA_SOURCE_REPO_ROOT"), url);
  if (!targetDir) {
    process.stderr.write(
      `${JSON.stringify({ error: `Configured external repository not found: ${group}/${repo}`, step: "discover" }, null, 2)}\n`,
    );
    process.exit(1);
  }
  try {
    const inspected = inspectGitSource(targetDir, branch);
    const out: SyncOutput = {
      repo,
      group,
      branch: inspected.branch,
      commit: inspected.commit,
      path: resolve(targetDir),
      storage: "external-git-repo",
    };
    process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
  } catch (err) {
    const out: ErrorOutput = {
      error: `Git ref inspection failed: ${err instanceof Error ? err.message : String(err)}`,
      step: "inspect",
    };
    process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exit(1);
  }
}

function runSyncEnv(opts: { project: string; branch?: string }): void {
  if (!opts.project) {
    process.stderr.write(
      `${JSON.stringify({ error: "--project is required", step: "validate-args" }, null, 2)}\n`,
    );
    process.exit(1);
  }
  const urls = (getEnv("KATA_SOURCE_REPOS") ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  if (urls.length === 0) {
    process.stderr.write(
      `${JSON.stringify({ error: "KATA_SOURCE_REPOS is empty", step: "read-env" }, null, 2)}\n`,
    );
    process.exit(1);
  }

  const synced: SyncOutput[] = [];
  const errors: Array<ErrorOutput & { url: string }> = [];
  const localSourceRoot = getEnv("KATA_SOURCE_REPO_ROOT");
  for (const url of urls) {
    const { group, repo } = parseGitUrl(url);
    if (!group || !repo) {
      errors.push({ url, error: `Cannot parse Git URL: ${url}`, step: "parse-url" });
      continue;
    }
    const localSource = findLocalSourceRepo(localSourceRoot, url);
    if (!localSource) {
      errors.push({
        url,
        error: `Configured external repository not found: ${group}/${repo}`,
        step: "discover",
      });
      continue;
    }
    try {
      const result = inspectGitSource(localSource, opts.branch);
      synced.push({
        repo,
        group,
        branch: result.branch,
        commit: result.commit,
        path: localSource,
        storage: "external-git-repo",
      });
    } catch (err) {
      errors.push({
        url,
        error: err instanceof Error ? err.message : String(err),
        step: "inspect",
      });
    }
  }
  process.stdout.write(
    `${JSON.stringify({ project: opts.project, total: urls.length, synced, errors }, null, 2)}\n`,
  );
  if (errors.length > 0) process.exit(1);
}

function runRead(opts: {
  project?: string;
  repo: string;
  ref?: string;
  path?: string;
  pattern?: string;
  lineStart?: string;
  lineEnd?: string;
  operation: "show" | "grep" | "list";
}): void {
  try {
    const repoPath = sourceRepoPath(opts.project, opts.repo);
    const ref = opts.ref ?? sourceRefForBranch(repoPath);
    let output: string;
    if (opts.operation === "show") {
      if (!opts.path) throw new Error("--path is required");
      output = git(repoPath, ["show", `${ref}:${opts.path}`]);
      if (opts.lineStart || opts.lineEnd) {
        const start = Number.parseInt(opts.lineStart ?? "1", 10);
        const end = Number.parseInt(opts.lineEnd ?? opts.lineStart ?? "0", 10);
        if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
          throw new Error("--line-start/--line-end must define a positive inclusive range");
        }
        output = output
          .split("\n")
          .slice(start - 1, end)
          .map((line, index) => `${start + index}:${line}`)
          .join("\n");
      }
    } else if (opts.operation === "grep") {
      if (!opts.pattern) throw new Error("--pattern is required");
      output = git(repoPath, ["grep", "-n", "--", opts.pattern, ref]);
    } else {
      output = git(repoPath, [
        "ls-tree",
        "-r",
        "--name-only",
        ref,
        ...(opts.path ? [opts.path] : []),
      ]);
    }
    console.log(output);
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
}

function defaultProjectFromConfig(raw: Record<string, unknown>): string | undefined {
  const projects = raw.projects as Record<string, unknown> | undefined;
  if (!projects) return undefined;
  const names = Object.keys(projects);
  return names.length === 1 ? names[0] : undefined;
}

function resolveProfileRepoPath(project: string | undefined, repoPath: string): string {
  const repoId = repoPath.startsWith(".repos/") ? repoPath.slice(".repos/".length) : repoPath;
  return sourceRepoPath(project, repoId);
}

function runSyncProfile(opts: { name: string; project?: string }): void {
  const configPath = join(repoRoot(), "config.json");
  if (!existsSync(configPath)) {
    const out: ErrorOutput = {
      error: "config.json not found",
      step: "read-config",
    };
    process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exit(1);
  }

  let profiles: Record<string, { repos: Array<{ path: string; branch: string }> }>;
  let project: string | undefined;
  try {
    const raw = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
    project = opts.project ?? getEnv("KATA_ACTIVE_PROJECT") ?? defaultProjectFromConfig(raw);
    const projects = raw.projects as
      | Record<
          string,
          { repo_profiles?: Record<string, { repos: Array<{ path: string; branch: string }> }> }
        >
      | undefined;
    const projectProfiles = project ? projects?.[project]?.repo_profiles : undefined;
    profiles = projectProfiles ?? ((raw.repo_profiles ?? {}) as typeof profiles);
  } catch (err) {
    const out: ErrorOutput = {
      error: `Failed to parse config.json: ${err}`,
      step: "read-config",
    };
    process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exit(1);
    return;
  }

  const profile = profiles[opts.name];
  if (!profile) {
    const out: ErrorOutput = {
      error: `Profile "${opts.name}" not found. Available: ${Object.keys(profiles).join(", ")}`,
      step: "find-profile",
    };
    process.stderr.write(`${JSON.stringify(out, null, 2)}\n`);
    process.exit(1);
    return;
  }

  const results: SyncOutput[] = [];
  const errors: ErrorOutput[] = [];

  for (const repoRef of profile.repos) {
    const absolutePath = resolveProfileRepoPath(project, repoRef.path);
    const parts = repoRef.path.split("/");
    const repoName = parts.pop() ?? "";
    const groupName = parts.pop() ?? "";

    if (!existsSync(absolutePath)) {
      errors.push({
        error: `Repository not found at ${absolutePath}. Clone it first.`,
        step: "check-path",
      });
      continue;
    }

    try {
      const result = inspectGitSource(absolutePath, repoRef.branch);

      results.push({
        repo: repoName,
        group: groupName,
        branch: repoRef.branch,
        commit: result.commit,
        path: absolutePath,
        storage: "external-git-repo",
      });
    } catch (err) {
      errors.push({
        error: `Sync failed for ${repoRef.path}@${repoRef.branch}: ${err instanceof Error ? err.message : String(err)}`,
        step: "sync",
      });
    }
  }

  const output = { project, profile: opts.name, synced: results, errors };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

  if (errors.length > 0 && results.length === 0) {
    process.exit(1);
  }
}

export const program = createCli({
  name: "repos",
  description: "通过只读 git show/grep/ls-tree 查询已配置的外部源码仓库",
  commands: [
    {
      name: "sync",
      description: "发现并验证一个已配置的外部源码仓库（兼容命令，不创建缓存）",
      options: [
        { flag: "--url <git-url>", description: "Git 仓库地址，必填" },
        { flag: "--branch <branch>", description: "目标分支，默认使用远端 HEAD" },
        {
          flag: "--project <name>",
          description: "兼容参数；源码仓库由环境变量配置",
        },
        {
          flag: "--base-dir <dir>",
          description: "已废弃；不再创建源码缓存",
        },
      ],
      action: runSync,
    },
    {
      name: "sync-env",
      description: "发现并验证 KATA_SOURCE_REPOS 中的全部外部仓库，不创建缓存",
      options: [
        {
          flag: "--project <name>",
          description: "项目名称，必填；也可从 repos 的上级参数继承",
        },
        {
          flag: "--branch <branch>",
          description: "所有仓库共用的分支，默认分别使用各仓库的远端 HEAD",
        },
      ],
      action: (opts: { project: string; branch?: string }) => runSyncEnv(opts),
    },
    {
      name: "sync-profile",
      description: "按 config.json 中的命名配置验证全部外部仓库",
      options: [
        {
          flag: "--name <name>",
          description: "Profile name (e.g. 岚图)",
          required: true,
        },
        {
          flag: "--project <name>",
          description: "项目名称；省略时读取 KATA_ACTIVE_PROJECT 或配置中的唯一项目",
        },
      ],
      action: (opts: { name: string; project?: string }) => runSyncProfile(opts),
    },
    ...(["show", "grep", "list"] as const).map((name) => ({
      name,
      description:
        name === "show"
          ? "读取 Git ref 中的一个文件，不展开工作区"
          : name === "grep"
            ? "搜索 Git ref 中的内容，不展开工作区"
            : "列出 Git ref 中的文件，不展开工作区",
      options: [
        { flag: "--project <name>", description: "项目名称" },
        {
          flag: "--repo <group/repo>",
          description: "KATA_SOURCE_REPOS 中的 group/repo 或唯一 repo 短名",
          required: true,
        },
        { flag: "--ref <ref>", description: "Git ref，默认使用同步时记录的分支或 HEAD" },
        ...(name === "show"
          ? [
              { flag: "--path <file>", description: "仓库内的文件路径", required: true },
              { flag: "--line-start <line>", description: "可选的起始行（含）" },
              { flag: "--line-end <line>", description: "可选的结束行（含）" },
            ]
          : name === "grep"
            ? [{ flag: "--pattern <text>", description: "要查找的文本或模式", required: true }]
            : [{ flag: "--path <dir>", description: "可选的目录前缀" }]),
      ],
      action: (opts: Record<string, string>) =>
        runRead({
          project: opts.project,
          repo: opts.repo,
          ref: opts.ref,
          path: opts.path,
          pattern: opts.pattern,
          lineStart: opts.lineStart,
          lineEnd: opts.lineEnd,
          operation: name,
        }),
    })),
  ],
});
