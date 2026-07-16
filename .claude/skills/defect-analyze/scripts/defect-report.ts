#!/usr/bin/env bun
/**
 * defect-report.ts — defect-analyze bug/conflict-mode HTML report render.
 *
 * Subcommands: render-bug / render-conflict
 * Contract: .claude/skills/defect-analyze/SKILL.md (§产物)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { renderBugReport, renderConflictReport } from "@shared/lib/bug-report-render.ts";
import { BUG_VARIANTS, type BugVariant } from "@shared/lib/bug-report-types.ts";
import { validateBugReport, validateConflictReport } from "@shared/lib/bug-report-validate.ts";
import { createCli } from "@shared/lib/cli-runner.ts";
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
  { flag: "--out <path>", description: "report.html 输出路径（会写入文件）" },
  { flag: "--project <name>", description: "项目名；与 --yyyymm、--slug 一起推导默认输出路径" },
  { flag: "--yyyymm <ym>", description: "年月 YYYYMM；用于推导默认输出路径" },
  { flag: "--slug <slug>", description: "报告标识；用于推导默认输出路径" },
];

export const program = createCli({
  name: "defect-report",
  description: "defect-analyze bug/conflict-mode HTML report render",
  commands: [
    {
      name: "render-bug",
      description: "根据 BugReport JSON 生成缺陷 HTML 报告",
      options: [
        { flag: "--json <path>", description: "BugReport JSON 路径（必填）", required: true },
        { flag: "--variant <v>", description: "报告样式；当前仅支持 zentao，默认 zentao" },
        ...outOptions,
      ],
      action: (opts: OutOpts & { json: string; variant?: string }) => {
        const variant = (opts.variant ?? "zentao") as BugVariant;
        if (!BUG_VARIANTS.includes(variant)) {
          fail(
            1,
            `[defect-report] invalid variant: ${opts.variant} (expect ${BUG_VARIANTS.join("|")})`,
          );
        }
        let report: ReturnType<typeof validateBugReport>;
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
      description: "根据 ConflictReport JSON 生成冲突 HTML 报告",
      options: [
        { flag: "--json <path>", description: "ConflictReport JSON 路径（必填）", required: true },
        ...outOptions,
      ],
      action: (opts: OutOpts & { json: string }) => {
        let report: ReturnType<typeof validateConflictReport>;
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
