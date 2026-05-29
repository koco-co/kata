import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Command } from "commander";
import {
  type AgentRuntime,
  agentsDir,
  parseAgentRuntimeSelector,
  repoRoot,
  skillsDir,
} from "@shared/lib/paths.ts";
import { lintAgentFrontmatter } from "../lint/skill-frontmatter.ts";
import { lintSkillShape } from "../lint/skill-shape.ts";
import { loadSkillManifest, validateManifestAgainstWorkflows } from "../skills/manifest-loader.ts";
import { checkRuntimeDetach, formatRuntimeDetachReport } from "../skills/runtime-detach.ts";
import { checkRuntimeSkillSync, formatRuntimeSkillSyncReport } from "../skills/runtime-sync.ts";
import { checkWorkflows, formatWorkflowCheckReport } from "../skills/workflow-check.ts";

/**
 * List skill directory names under `skillsRoot`, skipping `_`-prefixed aggregate
 * directories (e.g. `_shared/`) the same way runtime-sync, manifest-repository,
 * and apps/core/catalog enumerate skills. Returns `[]` when the root is absent.
 */
export function listSkillDirNames(skillsRoot: string): string[] {
  if (!existsSync(skillsRoot)) return [];
  // 过滤 `_` 前缀目录（如 `_shared/`），与 runtime-sync.ts / apps/core/catalog/skills.ts 一致
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
      const workflowReport = checkWorkflows(root);
      const manifestLines: string[] = [];
      let manifestPassed = true;
      try {
        loadSkillManifest(root);
        manifestLines.push("skill manifest check passed");
      } catch (error) {
        manifestPassed = false;
        const message = error instanceof Error ? error.message : String(error);
        manifestLines.push("skill manifest check failed", `SKILL_MANIFEST_INVALID: ${message}`);
      }
      // 仅在 manifest 加载成功后才能比对 ↔ workflow；加载失败时不重复报错
      let manifestWorkflowPassed = true;
      const manifestWorkflowLines: string[] = [];
      if (manifestPassed) {
        const manifestWorkflowErrors = validateManifestAgainstWorkflows(root);
        if (manifestWorkflowErrors.length === 0) {
          manifestWorkflowLines.push("manifest ↔ workflow consistency passed");
        } else {
          manifestWorkflowPassed = false;
          manifestWorkflowLines.push(
            "manifest ↔ workflow consistency failed",
            ...manifestWorkflowErrors,
          );
        }
      }
      const passed =
        skillReport.passed &&
        detachReport.passed &&
        manifestPassed &&
        manifestWorkflowPassed &&
        workflowReport.passed;
      const text = [
        formatRuntimeSkillSyncReport(skillReport, root),
        formatRuntimeDetachReport(detachReport, root),
        manifestLines.join("\n"),
        manifestWorkflowLines.join("\n"),
        formatWorkflowCheckReport(workflowReport, root),
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
