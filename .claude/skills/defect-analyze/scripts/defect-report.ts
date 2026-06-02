#!/usr/bin/env bun
/**
 * defect-report.ts — defect-analyze bug/conflict-mode HTML report render.
 *
 * Subcommands: render-bug / render-conflict
 * Contract: .claude/skills/defect-analyze/SKILL.md (§产物)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createCli } from "@shared/lib/cli-runner.ts";
import { BUG_VARIANTS, type BugVariant } from "@shared/lib/bug-report-types.ts";
import { renderBugReport, renderConflictReport } from "@shared/lib/bug-report-render.ts";
import { validateBugReport, validateConflictReport } from "@shared/lib/bug-report-validate.ts";
import { defectDir } from "@shared/lib/paths.ts";

function fail(code: number, msg: string): never {
  process.stderr.write(`${msg}\n`);
  process.exit(code);
}

function ensureParent(p: string): void {
  const d = dirname(p);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function loadJson(path: string): unknown {
  if (!existsSync(path)) fail(1, `[defect-report] json not found: ${path}`);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    fail(1, `[defect-report] invalid JSON: ${(e as Error).message}`);
  }
}

interface OutOpts {
  out?: string;
  project?: string;
  yyyymm?: string;
  slug?: string;
}

function resolveOut(opts: OutOpts): string {
  if (opts.out) return opts.out;
  if (opts.project && opts.yyyymm && opts.slug) {
    return join(defectDir(opts.project, opts.yyyymm, opts.slug), "report.html");
  }
  fail(1, "[defect-report] need --out, or --project + --yyyymm + --slug");
}

const outOptions = [
  { flag: "--out <path>", description: "output report.html path" },
  { flag: "--project <name>", description: "project (with --yyyymm/--slug, computes default out)" },
  { flag: "--yyyymm <ym>", description: "yyyymm (for default out path)" },
  { flag: "--slug <slug>", description: "report slug (for default out path)" },
];

export const program = createCli({
  name: "defect-report",
  description: "defect-analyze bug/conflict-mode HTML report render",
  commands: [
    {
      name: "render-bug",
      description: "Render a bug-mode HTML report from a BugReport JSON",
      options: [
        { flag: "--json <path>", description: "path to BugReport JSON", required: true },
        { flag: "--variant <v>", description: "simple | full | zentao (default full)" },
        ...outOptions,
      ],
      action: (opts: OutOpts & { json: string; variant?: string }) => {
        const variant = (opts.variant ?? "full") as BugVariant;
        if (!BUG_VARIANTS.includes(variant)) {
          fail(1, `[defect-report] invalid variant: ${opts.variant} (expect ${BUG_VARIANTS.join("|")})`);
        }
        let report;
        try {
          report = validateBugReport(loadJson(opts.json));
        } catch (e) {
          fail(2, `[defect-report] invalid bug: ${(e as Error).message}`);
        }
        const out = resolveOut(opts);
        ensureParent(out);
        writeFileSync(out, renderBugReport(report, variant), "utf8");
        process.stdout.write(`${JSON.stringify({ ok: true, out, variant })}\n`);
      },
    },
    {
      name: "render-conflict",
      description: "Render a conflict-mode HTML report from a ConflictReport JSON",
      options: [{ flag: "--json <path>", description: "path to ConflictReport JSON", required: true }, ...outOptions],
      action: (opts: OutOpts & { json: string }) => {
        let report;
        try {
          report = validateConflictReport(loadJson(opts.json));
        } catch (e) {
          fail(2, `[defect-report] invalid conflict: ${(e as Error).message}`);
        }
        const out = resolveOut(opts);
        ensureParent(out);
        writeFileSync(out, renderConflictReport(report), "utf8");
        process.stdout.write(`${JSON.stringify({ ok: true, out })}\n`);
      },
    },
  ],
});

if (import.meta.main) {
  program.parseAsync(process.argv);
}
