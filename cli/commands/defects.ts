import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Command } from "commander";
import { renderBugReport, renderConflictReport } from "../lib/bug-report-render.ts";
import type { BugVariant } from "../lib/bug-report-types.ts";
import { validateBugReport, validateConflictReport } from "../lib/bug-report-validate.ts";
import { outputJson } from "../lib/cli.ts";
import { lintMarkdownReport } from "../lib/defect-report.ts";

function loadJson(path: string): unknown {
  if (!existsSync(path)) throw new Error(`JSON 不存在: ${path}`);
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeOut(out: string, content: string): void {
  const abs = resolve(out);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf8");
}

/** Build the `defects` command: render bug / conflict reports to HTML. */
export function registerDefects(program: Command): void {
  const defects = program.command("defects").description("缺陷与冲突报告渲染");

  defects
    .command("lint")
    .description("校验正式 Markdown 缺陷报告结构")
    .requiredOption("--report <path>", "报告 Markdown 路径")
    .option("--exit-code", "存在 violation 时退出码为 1")
    .action((opts: { report: string; exitCode?: boolean }) => {
      const result = lintMarkdownReport(resolve(opts.report));
      for (const violation of result.violations) {
        console.log(`${opts.report}:${violation.line}:report:${violation.message}`);
      }
      outputJson({ report: opts.report, kind: result.kind, violations: result.violations.length });
      if (opts.exitCode && result.violations.length > 0) process.exitCode = 1;
    });

  defects
    .command("render-bug")
    .description("根据 BugReport JSON 生成缺陷 HTML 报告")
    .requiredOption("--json <path>", "BugReport JSON 路径")
    .requiredOption("--out <path>", "输出 HTML 路径")
    .option("--variant <v>", "报告样式(当前仅 zentao)", "zentao")
    .action((opts: { json: string; out: string; variant: string }) => {
      const report = validateBugReport(loadJson(opts.json));
      writeOut(opts.out, renderBugReport(report, opts.variant as BugVariant));
      outputJson({ ok: true, out: opts.out, variant: opts.variant });
    });

  defects
    .command("render-conflict")
    .description("根据 ConflictReport JSON 生成冲突 HTML 报告")
    .requiredOption("--json <path>", "ConflictReport JSON 路径")
    .requiredOption("--out <path>", "输出 HTML 路径")
    .action((opts: { json: string; out: string }) => {
      const report = validateConflictReport(loadJson(opts.json));
      writeOut(opts.out, renderConflictReport(report));
      outputJson({ ok: true, out: opts.out });
    });
}
