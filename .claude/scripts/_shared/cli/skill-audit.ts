import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { agentsDir, repoRoot, skillsDir } from "@shared/lib/paths.ts";
import {
  checkRuntimeSkillSync,
  formatRuntimeSkillSyncReport,
} from "@shared/lib/skills/runtime-sync.ts";
import {
  checkRuntimeWorkflow,
  formatRuntimeWorkflowReport,
} from "@shared/lib/skills/runtime-workflow.ts";
import {
  type CodexSkillReport,
  formatCodexSkillReport,
  lintCodexSkillTree,
} from "@shared/lint/codex-skill-shape.ts";
import { lintAgentFrontmatter } from "@shared/lint/skill-frontmatter.ts";
import { lintSkillShape } from "@shared/lint/skill-shape.ts";
import {
  formatStructureReport,
  lintSkillStructure,
} from "@shared/lint/skill-structure.ts";
import { Command, Option } from "commander";

/** List business Skill directories and skip `_`-prefixed shared directories. */
export function listSkillDirNames(skillsRoot: string): string[] {
  if (!existsSync(skillsRoot)) return [];
  return readdirSync(skillsRoot)
    .filter(
      (name) =>
        !name.startsWith("_") && statSync(join(skillsRoot, name)).isDirectory(),
    )
    .sort();
}

function writeReport(text: string, passed: boolean): void {
  const value = text.endsWith("\n") ? text : `${text}\n`;
  if (passed) process.stdout.write(value);
  else process.stderr.write(value);
}

export function buildSkillsCommand(): Command {
  const skills = new Command("skills").description("Skill 结构与运行时合同检查");

  skills
    .command("sync-check")
    .description("检查 Claude Skill 与共享工作流的结构一致性")
    .option("--exit-code", "发现违规时返回非零退出码", false)
    .action((opts: { exitCode: boolean }) => {
      const root = repoRoot();
      const skillReport = checkRuntimeSkillSync(root);
      const workflowReport = checkRuntimeWorkflow(root);
      const structureReport = lintSkillStructure(root);
      const passed =
        skillReport.passed && workflowReport.passed && structureReport.passed;
      const text = [
        formatRuntimeSkillSyncReport(skillReport, root),
        formatRuntimeWorkflowReport(workflowReport, root),
        formatStructureReport(structureReport, root),
      ]
        .filter((line) => line.length > 0)
        .join("\n");
      writeReport(text, passed);
      if (opts.exitCode && !passed) process.exitCode = 2;
    });

  skills
    .command("audit")
    .description("检查 SKILL.md、references 与代理 frontmatter")
    .option("--exit-code", "发现违规时返回非零退出码", false)
    .addOption(
      new Option("--runtime <runtime>", "目标运行时")
        .choices(["claude", "codex"])
        .default("claude"),
    )
    .action((opts: { exitCode: boolean; runtime: "claude" | "codex" }) => {
      const root = repoRoot();

      // Codex uses two native Skills, transitional compatibility symlinks,
      // a routing bootstrap, and the project plugin manifest.
      if (opts.runtime === "codex") {
        const report: CodexSkillReport = lintCodexSkillTree(root);
        const text = [
          formatCodexSkillReport(report, root),
          `[skills audit:codex] total violations=${report.violations.length}`,
        ].join("\n");
        writeReport(text, report.passed);
        if (opts.exitCode && !report.passed) process.exitCode = 2;
        return;
      }

      const skillsRoot = skillsDir();
      const agentsRoot = agentsDir();
      const skillList = listSkillDirNames(skillsRoot);
      const knownSkillSet = new Set(skillList);
      let totalViolations = 0;
      const lines: string[] = ["== Skill shape (S1-S9) =="];

      for (const skill of skillList) {
        const report = lintSkillShape(join(skillsRoot, skill));
        if (report.passed) continue;
        lines.push(``, `[${skill}] ${report.violations.length} violation(s):`);
        for (const violation of report.violations) {
          lines.push(
            ` ${violation.rule} ${(violation.path || "").replace(root, ".")} — ${violation.message}`,
          );
        }
        totalViolations += report.violations.length;
      }

      lines.push("", "== Agent frontmatter (A1-A4) ==");
      const agentFiles = existsSync(agentsRoot)
        ? readdirSync(agentsRoot).filter((name) => name.endsWith(".md"))
        : [];
      for (const agentFile of agentFiles) {
        const report = lintAgentFrontmatter(
          join(agentsRoot, agentFile),
          knownSkillSet,
        );
        if (report.passed) continue;
        lines.push(``, `[${agentFile}] ${report.violations.length} violation(s):`);
        for (const violation of report.violations) {
          lines.push(` ${violation.rule} — ${violation.message}`);
        }
        totalViolations += report.violations.length;
      }

      lines.push(
        "",
        `[skills audit] skills=${skillList.length} agents=${agentFiles.length}`,
        `[skills audit] total violations=${totalViolations}`,
      );
      const passed = totalViolations === 0;
      writeReport(lines.join("\n"), passed);
      if (opts.exitCode && !passed) process.exitCode = 2;
    });

  return skills;
}
