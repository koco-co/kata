import { Command } from "commander";

const rmWithRecursiveForce = String.raw`\brm\b(?=[^;&|]*\s-[^\s;&|]*r)(?=[^;&|]*\s-[^\s;&|]*f)[^;&|]*`;
const rmWorkspacePattern = new RegExp(
  `${rmWithRecursiveForce}\\s+(?:--\\s+)?(?:\\.\\/)?workspace(?:\\/|\\b)`,
);
const rmRootPattern = new RegExp(`${rmWithRecursiveForce}\\s+(?:--\\s+)?\\/(?:\\s|$|\\*)`);
const reposPathSegmentPattern =
  /(?:^|[\s'"]|\/)(?:\.repos(?:\/|\b)|\.kata\/repos(?:\/|\b)|workspace\/[^/\s'"]+\/\.kata\/repos(?:\/|\b))/;
const mutatingGitInSegmentPattern =
  /\bgit\b[^;&|]*\s(?:push|commit|add|rm|mv|checkout|switch|reset|clean|rebase|merge|pull|cherry-pick|stash|apply|am|restore)\b/;

export function auditShellCommand(command: string): { allowed: boolean; reason?: string } {
  if (rmWorkspacePattern.test(command)) {
    return { allowed: false, reason: `dangerous workspace removal: ${command}` };
  }

  if (rmRootPattern.test(command)) {
    return { allowed: false, reason: `dangerous root removal: ${command}` };
  }

  if (reposPathSegmentPattern.test(command) && mutatingGitInSegmentPattern.test(command)) {
    return {
      allowed: false,
      reason: `mutating git command under source repository evidence is forbidden: ${command}`,
    };
  }

  return { allowed: true };
}

export function buildSafetyCommand(): Command {
  const safety = new Command("safety").description("安全约束操作");
  safety
    .command("audit-command")
    .description("审计 shell 命令是否符合 kata 安全约束")
    .requiredOption("--command <command>", "shell command to audit")
    .action((opts: { command: string }) => {
      const result = auditShellCommand(opts.command);
      if (!result.allowed) {
        process.stderr.write(`[safety:audit-command] BLOCKED: ${result.reason}\n`);
        process.exit(2);
      }

      process.stdout.write("[safety:audit-command] allowed\n");
    });
  return safety;
}
