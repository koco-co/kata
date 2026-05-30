import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  type AgentRuntime,
  agentsDir,
  parseAgentRuntimeSelector,
  repoRoot,
  skillsDir,
} from "@shared/lib/paths.ts";
import {
  checkRuntimeDetach,
  formatRuntimeDetachReport,
} from "@shared/lib/skills/runtime-detach.ts";
import {
  checkRuntimeSkillSync,
  formatRuntimeSkillSyncReport,
} from "@shared/lib/skills/runtime-sync.ts";
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
    .option("--runtime <runtime>", "agent runtime: claude | codex | all")
    .option("--exit-code", "exit non-zero on any violation", false)
    .action((opts: { runtime?: string; exitCode: boolean }) => {
      const root = repoRoot();
      const selector = parseAgentRuntimeSelector(opts.runtime);
      const runtimes: AgentRuntime[] = selector === "all" ? ["claude", "codex"] : [selector];

      let totalViolations = 0;

      for (const runtime of runtimes) {
        const skillsRoot = skillsDir(runtime);
        const agentsRoot = agentsDir(runtime);
        const skills = listSkillDirNames(skillsRoot);
        const knownSkillSet = new Set(skills);

        console.log(`\n== Skill shape (runtime=${runtime}, S1-S9) ==`);
        for (const sk of skills) {
          const r = lintSkillShape(join(skillsRoot, sk), { runtime });
          if (!r.passed) {
            console.log(`\n[${runtime}:${sk}] ${r.violations.length} violation(s):`);
            for (const v of r.violations) {
              console.log(`  ${v.rule} ${(v.path || "").replace(root, ".")} — ${v.message}`);
            }
            totalViolations += r.violations.length;
          }
        }

        console.log(`\n== Agent frontmatter (runtime=${runtime}, A1-A4) ==`);
        const agentFiles = existsSync(agentsRoot)
          ? readdirSync(agentsRoot).filter((f) => f.endsWith(".md"))
          : [];
        for (const af of agentFiles) {
          const r = lintAgentFrontmatter(join(agentsRoot, af), knownSkillSet, { runtime });
          if (!r.passed) {
            console.log(`\n[${runtime}:${af}] ${r.violations.length} violation(s):`);
            for (const v of r.violations) console.log(`  ${v.rule} — ${v.message}`);
            totalViolations += r.violations.length;
          }
        }

        console.log(
          `\n[skills audit] runtime=${runtime} skills=${skills.length} agents=${agentFiles.length}`,
        );
      }

      console.log(`\n[skills audit] total violations=${totalViolations}`);
      if (opts.exitCode && totalViolations > 0) process.exit(1);
    });
  return skills;
}
