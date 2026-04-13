import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Command } from "commander";
import {
  type AgentRuntime,
  agentsDir,
  parseAgentRuntimeSelector,
  repoRoot,
  skillsDir,
} from "../../lib/paths.ts";
import { lintAgentFrontmatter } from "../lint/skill-frontmatter.ts";
import { lintSkillShape } from "../lint/skill-shape.ts";

export function buildSkillsCommand(): Command {
  const skills = new Command("skills").description("Skills 审查操作");
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
        const skills = existsSync(skillsRoot)
          ? readdirSync(skillsRoot).filter((f) => statSync(join(skillsRoot, f)).isDirectory())
          : [];
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
