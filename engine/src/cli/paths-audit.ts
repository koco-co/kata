import { Command } from "commander";
import { repoRoot } from "@shared/lib/paths.ts";
import { lintPaths } from "../lint/path-treatment.ts";
import type { PathViolation } from "../lint/types.ts";

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
    file.includes("engine/src/lint/") || // lint self-references
    file.includes("engine/tests/lint/") || // deliberate lint test fixtures
    file.includes("engine/tests/cli/paths-audit.test.ts") || // deliberate CLI lint fixtures
    file.includes(".claude/settings.local.json") ||
    (rule === "P-S3" && isWorkspaceTemplateDoc(file))
  );
}

export function buildPathsCommand(): Command {
  const paths = new Command("paths").description("路径引用操作");
  paths
    .command("audit")
    .description("审查过时路径引用")
    .option("--exit-code", "exit non-zero on any violation", false)
    .option("--by-rule", "summarize per-rule counts", false)
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
        console.log(`\n[paths audit] total=${r.violations.length} (${skipped} known-safe skipped)`);
      else console.log(`\n[paths audit] total=${r.violations.length}`);
      if (opts.exitCode && actionable.length > 0) process.exit(1);
    });
  return paths;
}
