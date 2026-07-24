import { Command } from "commander";
import { outputJson } from "../lib/cli.ts";
import { getEnv } from "../lib/env.ts";
import {
  configuredSourceRepos,
  git,
  isGitSourceRepo,
  parseGitUrl,
  resolveConfiguredSourceRepo,
} from "../lib/git-source.ts";

function sourceRoot(): string | undefined {
  return getEnv("KATA_SOURCE_REPO_ROOT");
}
function sourceRepos(): string | undefined {
  return getEnv("KATA_SOURCE_REPOS");
}

function resolveRepo(repoId: string): string {
  const path = resolveConfiguredSourceRepo(repoId, sourceRoot(), sourceRepos());
  if (!path) {
    throw new Error(`未找到已配置源码仓库 ${repoId}；检查 KATA_SOURCE_REPO_ROOT 与 KATA_SOURCE_REPOS`);
  }
  return path;
}

/** Build the `repos` command: read-only git queries against configured external source repos. */
export function registerRepos(program: Command): void {
  const repos = program.command("repos").description("只读查询已配置的外部源码仓库");

  repos
    .command("list")
    .description("列出已配置并可定位的源码仓库")
    .action(() => outputJson(configuredSourceRepos(sourceRoot(), sourceRepos())));

  repos
    .command("sync-env")
    .description("报告全部已配置仓库的当前 ref/commit(不 fetch)")
    .option("--branch <name>", "指定分支 ref")
    .action((opts: { branch?: string }) => {
      const out = configuredSourceRepos(sourceRoot(), sourceRepos()).map((entry) => {
        try {
          const ref = opts.branch ?? "HEAD";
          const commit = git(entry.path, ["rev-parse", "--verify", `${ref}^{commit}`]).trim();
          const branch = git(entry.path, ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
          return { repo: `${entry.group}/${entry.repo}`, path: entry.path, branch, commit, ok: true };
        } catch (err) {
          return { repo: `${entry.group}/${entry.repo}`, path: entry.path, ok: false, error: String(err) };
        }
      });
      outputJson(out);
    });

  repos
    .command("show")
    .description("git show <repo> <ref:path>;只读查看源文件")
    .argument("<repo>", "group/repo 或 repo")
    .argument("<refPath>", "如 HEAD:src/a.ts")
    .action((repo: string, refPath: string) => {
      const path = resolveRepo(repo);
      if (!isGitSourceRepo(path)) throw new Error(`${path} 不是 git 仓库`);
      process.stdout.write(git(path, ["show", refPath]));
    });

  repos
    .command("grep")
    .description("git grep <repo> <pattern> [path];只读搜索")
    .argument("<repo>", "group/repo 或 repo")
    .argument("<pattern>", "搜索模式")
    .argument("[path]", "限定路径")
    .option("--ref <ref>", "指定 ref", "HEAD")
    .action((repo: string, pattern: string, pathArg: string | undefined, opts: { ref: string }) => {
      const path = resolveRepo(repo);
      const args = ["grep", "-n", "-e", pattern, opts.ref];
      if (pathArg) args.push("--", pathArg);
      try {
        process.stdout.write(git(path, args));
      } catch {
        // git grep 无命中返回非零
        process.exitCode = 1;
      }
    });
}
