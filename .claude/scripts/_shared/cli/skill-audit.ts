import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { agentsDir, repoRoot, skillsDir } from "@shared/lib/paths.ts";
import {
  checkRuntimeDetach,
  formatRuntimeDetachReport,
} from "@shared/lib/skills/runtime-detach.ts";
import {
  checkRuntimeSkillSync,
  formatRuntimeSkillSyncReport,
} from "@shared/lib/skills/runtime-sync.ts";
import {
  type CodexSkillReport,
  formatCodexSkillReport,
  lintCodexSkillTree,
} from "@shared/lint/codex-skill-shape.ts";
import {
  formatHermesSkillReport,
  type HermesSkillReport,
  lintHermesSkillTree,
} from "@shared/lint/hermes-skill-shape.ts";
import {
  formatReasonixSkillReport,
  lintReasonixSkillTree,
  type ReasonixSkillReport,
} from "@shared/lint/reasonix-skill-shape.ts";
import { lintAgentFrontmatter } from "@shared/lint/skill-frontmatter.ts";
import { lintSkillShape } from "@shared/lint/skill-shape.ts";
import { formatStructureReport, lintSkillStructure } from "@shared/lint/skill-structure.ts";
import { Command } from "commander";

/**
 * List skill directory names under `skillsRoot`, skipping `_`-prefixed aggregate
 * directories (e.g. `_shared/`) the same way runtime-sync enumerates skills.
 * Returns `[]` when the root is absent.
 */
export function listSkillDirNames(skillsRoot: string): string[] {
  if (!existsSync(skillsRoot)) return [];
  // 过滤 `_` 前缀目录（如 `_shared/`），与 runtime-sync.ts 一致
  return readdirSync(skillsRoot).filter(
    (f) => !f.startsWith("_") && statSync(join(skillsRoot, f)).isDirectory(),
  );
}

export function buildSkillsCommand(): Command {
  const skills = new Command("skills").description("Skills 审查操作");
  skills
    .command("sync-check")
    .description("检查 .claude 与 .agents 的 skill 是否同步")
    .option("--exit-code", "exit non-zero on any violation", false)
    .action((opts: { exitCode: boolean }) => {
      const root = repoRoot();
      const skillReport = checkRuntimeSkillSync(root);
      const detachReport = checkRuntimeDetach(root);
      const structureReport = lintSkillStructure(root);
      const passed = skillReport.passed && detachReport.passed && structureReport.passed;
      const text = [
        formatRuntimeSkillSyncReport(skillReport, root),
        formatRuntimeDetachReport(detachReport, root),
        formatStructureReport(structureReport, root),
      ]
        .filter((s) => s.length > 0)
        .join("\n");
      if (passed) {
        console.log(text);
      } else {
        process.stderr.write(`${text}\n`);
      }
      if (opts.exitCode && !passed) process.exit(1);
    });
  skills
    .command("audit")
    .description("审查 skills SKILL.md + references 契约与 agents frontmatter")
    .option("--exit-code", "exit non-zero on any violation", false)
    .option("--runtime <runtime>", "审查目标运行时：claude | codex | reasonix | hermes", "claude")
    .action((opts: { exitCode: boolean; runtime: string }) => {
      const root = repoRoot();

      // codex 运行时：校验 .agents/skills symlink 树 + bootstrap + plugin.json 的 canonical 形态
      if (opts.runtime === "codex") {
        const report: CodexSkillReport = lintCodexSkillTree(root);
        const text = formatCodexSkillReport(report, root);
        if (report.passed) console.log(text);
        else process.stderr.write(`${text}\n`);
        console.log(`\n[skills audit:codex] total violations=${report.violations.length}`);
        if (opts.exitCode && !report.passed) process.exit(1);
        return;
      }

      // reasonix 运行时：校验 .reasonix/skills symlink 树 + bootstrap（无 JSON manifest）
      if (opts.runtime === "reasonix") {
        const report: ReasonixSkillReport = lintReasonixSkillTree(root);
        const text = formatReasonixSkillReport(report, root);
        if (report.passed) console.log(text);
        else process.stderr.write(`${text}\n`);
        console.log(`\n[skills audit:reasonix] total violations=${report.violations.length}`);
        if (opts.exitCode && !report.passed) process.exit(1);
        return;
      }

      // hermes 运行时：校验 .hermes/skills 无 symlink + bootstrap 文档化 external_dirs
      if (opts.runtime === "hermes") {
        const report: HermesSkillReport = lintHermesSkillTree(root);
        const text = formatHermesSkillReport(report, root);
        if (report.passed) console.log(text);
        else process.stderr.write(`${text}\n`);
        console.log(`\n[skills audit:hermes] total violations=${report.violations.length}`);
        if (opts.exitCode && !report.passed) process.exit(1);
        return;
      }

      const skillsRoot = skillsDir();
      const agentsRoot = agentsDir();
      const skillList = listSkillDirNames(skillsRoot);
      const knownSkillSet = new Set(skillList);

      let totalViolations = 0;

      console.log(`\n== Skill shape (S1-S9) ==`);
      for (const sk of skillList) {
        const r = lintSkillShape(join(skillsRoot, sk));
        if (!r.passed) {
          console.log(`\n[${sk}] ${r.violations.length} violation(s):`);
          for (const v of r.violations) {
            console.log(`  ${v.rule} ${(v.path || "").replace(root, ".")} — ${v.message}`);
          }
          totalViolations += r.violations.length;
        }
      }

      console.log(`\n== Agent frontmatter (A1-A4) ==`);
      const agentFiles = existsSync(agentsRoot)
        ? readdirSync(agentsRoot).filter((f) => f.endsWith(".md"))
        : [];
      for (const af of agentFiles) {
        const r = lintAgentFrontmatter(join(agentsRoot, af), knownSkillSet);
        if (!r.passed) {
          console.log(`\n[${af}] ${r.violations.length} violation(s):`);
          for (const v of r.violations) console.log(`  ${v.rule} — ${v.message}`);
          totalViolations += r.violations.length;
        }
      }

      console.log(`\n[skills audit] skills=${skillList.length} agents=${agentFiles.length}`);

      console.log(`\n[skills audit] total violations=${totalViolations}`);
      if (opts.exitCode && totalViolations > 0) process.exit(1);
    });
  return skills;
}
