import type { Command } from "commander";
import { checkRepositoryPolicy, formatPolicyViolations } from "../lib/repository-policy.ts";
import { repoRoot } from "../lib/workspace-locator.ts";

/** Build the `repo` command: validate the current Kata repository itself. */
export function registerRepo(program: Command): void {
  const repo = program.command("repo").description("当前 Kata 仓库规范检查");

  repo
    .command("lint")
    .description("检查当前 Kata 仓库的目录、文件名与依赖边界")
    .option("--exit-code", "存在违规时退出码为 1")
    .action((opts: { exitCode?: boolean }) => {
      const violations = checkRepositoryPolicy(repoRoot());
      if (violations.length === 0) {
        process.stdout.write("[repository policy] ok\n");
        return;
      }

      process.stderr.write(`${formatPolicyViolations(violations)}\n`);
      process.stdout.write(`[repository policy] violations=${violations.length}\n`);
      if (opts.exitCode) process.exitCode = 1;
    });
}
