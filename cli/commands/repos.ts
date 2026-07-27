import type { Command } from "commander";
import { outputJson } from "../lib/cli.ts";
import {
  assertRepoOperationAllowed,
  git,
  isGitSourceRepo,
  loadSourceRepos,
  resolveSourceRepo,
  type SourceRepo,
  safeGitPath,
  safeRef,
} from "../lib/git-source.ts";

function resolveRepo(repoId: string): SourceRepo & { absPath: string } {
  const repo = resolveSourceRepo(repoId);
  if (!repo) {
    throw new Error(`未找到已配置源码仓库 ${repoId};检查 config/repos/sources.yaml`);
  }
  return repo;
}

/** Build the `repos` command: read and sync queries against configured source repos. */
export function registerRepos(program: Command): void {
  const repos = program
    .command("repos")
    .description("查询 config/repos/sources.yaml 配置的源码仓库(.repos/ 本地克隆)");

  repos
    .command("list")
    .description("列出已配置并可定位的源码仓库")
    .action(() =>
      outputJson(
        loadSourceRepos().map((r) => ({
          ...r,
          present: isGitSourceRepo(resolveSourceRepo(r.name)?.absPath ?? ""),
        })),
      ),
    );

  repos
    .command("sync-env")
    .description("报告全部已配置仓库的当前 branch/commit(不 fetch)")
    .action(() => {
      const out = loadSourceRepos().map((entry) => {
        const absPath = resolveSourceRepo(entry.name)?.absPath ?? entry.path;
        try {
          const commit = git(absPath, ["rev-parse", "--verify", "HEAD^{commit}"]).trim();
          const branch = git(absPath, ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
          return { repo: entry.name, path: absPath, branch, commit, ok: true };
        } catch (err) {
          return { repo: entry.name, path: absPath, ok: false, error: String(err) };
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
      const { absPath } = resolveRepo(repo);
      if (!isGitSourceRepo(absPath)) throw new Error(`${absPath} 不是 git 仓库`);
      process.stdout.write(git(absPath, ["show", refPath]));
    });

  repos
    .command("grep")
    .description("git grep <repo> <pattern> [path];只读搜索")
    .argument("<repo>", "group/repo 或 repo")
    .argument("<pattern>", "搜索模式")
    .argument("[path]", "限定路径")
    .option("--ref <ref>", "指定 ref", "HEAD")
    .action((repo: string, pattern: string, pathArg: string | undefined, opts: { ref: string }) => {
      const { absPath } = resolveRepo(repo);
      if (!safeRef(opts.ref)) throw new Error(`非法 --ref: ${opts.ref}`);
      if (pathArg !== undefined && !safeGitPath(pathArg)) {
        throw new Error(`非法路径: ${pathArg}`);
      }
      const args = ["grep", "-n", "-e", pattern, opts.ref];
      if (pathArg) args.push("--", pathArg);
      try {
        process.stdout.write(git(absPath, args));
      } catch (err) {
        const e = err as { status?: number; stderr?: string };
        // git grep 无命中退出码 1:静默 exit 1;其余(git 缺失/非仓库/ref 错误) stderr + exit 2
        if (e.status === 1) {
          process.exitCode = 1;
          return;
        }
        const detail =
          typeof e.stderr === "string" && e.stderr.trim() ? e.stderr.trim() : String(err);
        process.stderr.write(`kata repos grep 失败: ${detail}\n`);
        process.exitCode = 2;
      }
    });

  repos
    .command("pull")
    .description("git pull --ff-only <repo>;更新本地克隆到远端最新")
    .argument("<repo>", "group/repo 或 repo")
    .action((repo: string) => {
      const resolved = resolveRepo(repo);
      assertRepoOperationAllowed(resolved, "pull");
      process.stdout.write(git(resolved.absPath, ["pull", "--ff-only"]));
    });

  repos
    .command("checkout")
    .description("git checkout <repo> <branch>;切换本地克隆分支")
    .argument("<repo>", "group/repo 或 repo")
    .argument("<branch>", "目标分支")
    .action((repo: string, branch: string) => {
      const resolved = resolveRepo(repo);
      assertRepoOperationAllowed(resolved, "checkout");
      if (!safeRef(branch)) throw new Error(`非法分支: ${branch}`);
      process.stdout.write(git(resolved.absPath, ["checkout", branch]));
    });
}
