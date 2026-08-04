import { execFileSync } from "node:child_process";
import type { Command } from "commander";
import { validateCommitMessage } from "../lib/commit-message.ts";
import { checkRepositoryPolicy, formatPolicyViolations } from "../lib/repository-policy.ts";
import { repoRoot } from "../lib/workspace-locator.ts";

/** 逐条读取 <base>..<head> 的提交 subject（含 merge commit 的 subject）。 */
export function commitSubjectsInRange(
  base: string,
  head: string,
  root: string,
): Array<{ hash: string; subject: string }> {
  const output = execFileSync(
    "git",
    ["-C", root, "log", "--format=%h%x00%s", `${base}..${head}`],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf("\0");
      return {
        hash: line.slice(0, separator),
        subject: line.slice(separator + 1),
      };
    });
}

/** Build the `repo` command: validate the current Kata repository itself. */
export function registerRepo(program: Command): void {
  const repo = program.command("repo").description("当前 Kata 仓库规范检查");

  repo
    .command("lint")
    .description("检查当前 Kata 仓库的目录、文件名与依赖边界")
    .option("--exit-code", "存在违规时退出码为 1")
    .option("--commit-message <subject>", "附加检查一条 Emoji Conventional Commit subject")
    .option("--commit-range <base>..<head>", "逐条校验该提交范围内的每个 subject")
    .action(
      (opts: { exitCode?: boolean; commitMessage?: string; commitRange?: string }) => {
        const violations = checkRepositoryPolicy(repoRoot());
        const commitMessageReason = opts.commitMessage
          ? validateCommitMessage(opts.commitMessage)
          : undefined;
        if (commitMessageReason) {
          violations.push({ path: "<commit-message>", reason: commitMessageReason });
        }
        if (opts.commitRange) {
          const [base, head] = opts.commitRange.split("..");
          if (!base || !head) {
            violations.push({ path: "<commit-range>", reason: "范围必须是 <base>..<head>" });
          } else {
            const root = repoRoot();
            const subjects = commitSubjectsInRange(base, head, root);
            for (const { hash, subject } of subjects) {
              const reason = validateCommitMessage(subject);
              if (reason) {
                violations.push({
                  path: `<commit-range> ${hash}`,
                  reason: `${reason}: "${subject}"`,
                });
              }
            }
            if (subjects.length === 0) {
              violations.push({ path: "<commit-range>", reason: "范围内没有提交" });
            }
          }
        }
        if (violations.length === 0) {
          process.stdout.write("[repository policy] ok\n");
          return;
        }

        process.stderr.write(`${formatPolicyViolations(violations)}\n`);
        process.stdout.write(`[repository policy] violations=${violations.length}\n`);
        if (opts.exitCode) process.exitCode = 1;
      },
    );
}
