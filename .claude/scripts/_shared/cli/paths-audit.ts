import { repoRoot } from "@shared/lib/paths.ts";
import { lintPaths } from "@shared/lint/path-treatment.ts";
import type { PathViolation } from "@shared/lint/types.ts";
import { Command } from "commander";

function isWorkspaceTemplateDoc(file: string): boolean {
  return (
    // agent/rule docs describe valid project workspace templates.
    file.includes(".claude/agents/") ||
    file.includes(".claude/skills/") ||
    file.includes(".claude/rules/") ||
    file.includes(".agents/agents/") ||
    file.includes(".agents/skills/") ||
    file.includes("docs/superpowers/plans/") ||
    file.includes("playwright.config.ts") || // compat globs
    file.includes("/README.md") || // doc describing current (v2) layout
    file.includes("/README-EN.md")
  );
}

export function isKnownSafe(v: PathViolation): boolean {
  const { file, rule } = v;
  return (
    file.includes(".claude/scripts/_shared/lint/") || // lint self-references
    file.includes(".claude/scripts/_shared/tests/lint/") || // deliberate lint test fixtures
    file.includes(".claude/scripts/_shared/tests/cli/paths-audit.test.ts") || // deliberate CLI lint fixtures
    (rule === "P-S3" && isWorkspaceTemplateDoc(file))
  );
}

export function buildPathsCommand(): Command {
  const paths = new Command("paths").description("项目路径引用检查");
  paths
    .command("audit")
    .description("检查过时或不合规的路径引用")
    .option("--exit-code", "发现违规时返回非零退出码", false)
    .option("--by-rule", "按规则汇总数量", false)
    .action((opts: { exitCode: boolean; byRule: boolean }) => {
      const root = repoRoot();
      const r = lintPaths(root);
      // Filter actionable violations (exclude known-safe files)
      const actionable = opts.exitCode ? r.violations.filter((v) => !isKnownSafe(v)) : r.violations;
      if (opts.byRule) {
        const counts: Record<string, number> = {};
        for (const v of actionable) counts[v.rule] = (counts[v.rule] || 0) + 1;
        for (const [rule, n] of Object.entries(counts).sort()) {
          console.log(`  ${rule}: ${n}`);
        }
      }
      const byFile = new Map<string, typeof actionable>();
      for (const v of actionable) {
        const list = byFile.get(v.file) || [];
        list.push(v);
        byFile.set(v.file, list);
      }
      for (const [file, list] of [...byFile.entries()].sort()) {
        console.log(`\n${file.replace(root, ".")}:`);
        for (const v of list) console.log(`  L${v.lineNumber} [${v.rule}] ${v.matched}`);
      }
      // Show count diff when exit-code mode
      const skipped = r.violations.length - actionable.length;
      if (skipped > 0)
        console.log(
          `\n[paths audit] 总数=${r.violations.length}（已跳过 ${skipped} 条已知安全项）`,
        );
      else console.log(`\n[paths audit] 总数=${r.violations.length}`);
      if (opts.exitCode && actionable.length > 0) process.exit(1);
    });
  return paths;
}
