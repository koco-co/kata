import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { Command } from "commander";
import { runFetch } from "../integrations/zentao/fetch.ts";
import { renderBugReport, renderConflictReport } from "../lib/bug-report-render.ts";
import type { BugVariant } from "../lib/bug-report-types.ts";
import { validateBugReport, validateConflictReport } from "../lib/bug-report-validate.ts";
import { outputJson } from "../lib/cli.ts";
import { lintMarkdownReport } from "../lib/defect-report.ts";
import {
  hotfixReportPath,
  lintHotfixMarkdown,
  renderHotfixMarkdown,
} from "../lib/hotfix-report.ts";
import { locateProject, locateProjectRoot } from "../lib/workspace-locator.ts";

function loadJson(path: string): unknown {
  if (!existsSync(path)) throw new Error(`JSON 不存在: ${path}`);
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeOut(out: string, content: string): void {
  const abs = resolve(out);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf8");
}

/** Build the `defects` command: generate and validate formal defect reports. */
export function registerDefects(program: Command): void {
  const defects = program.command("defects").description("缺陷与冲突报告渲染");

  defects
    .command("hotfix")
    .description("从 ZenTao Bug 证据生成 Markdown hotfix 回归报告")
    .option("--bug-id <number>", "禅道 Bug ID")
    .option("--url <url>", "禅道 Bug 页面 URL")
    .requiredOption("--project <name>", "项目名")
    .requiredOption("--yyyymm <yyyymm>", "报告年月，例如 202607")
    .requiredOption("--slug <slug>", "报告 slug")
    .action(
      async (opts: {
        bugId?: string;
        url?: string;
        project: string;
        yyyymm: string;
        slug: string;
      }) => {
        if ((opts.bugId ? 1 : 0) + (opts.url ? 1 : 0) !== 1) {
          throw new Error("必须且只能提供 --bug-id 或 --url");
        }
        if (!/^\d{6}$/.test(opts.yyyymm)) throw new Error("--yyyymm 必须为 YYYYMM");
        locateProject(opts.project);
        const bugId = opts.bugId === undefined ? undefined : Number.parseInt(opts.bugId, 10);
        if (opts.bugId !== undefined && (!Number.isInteger(bugId) || (bugId as number) <= 0)) {
          throw new Error("--bug-id 必须为正整数");
        }

        const temp = mkdtempSync(join(tmpdir(), "kata-hotfix-fetch-"));
        try {
          await runFetch({ bugId, url: opts.url, output: temp, silent: true });
          const fetchedId =
            bugId ??
            (opts.url?.match(/bug-view-(\d+)\.html/)?.[1]
              ? Number.parseInt(opts.url.match(/bug-view-(\d+)\.html/)?.[1] as string, 10)
              : undefined);
          if (!fetchedId) throw new Error("无法确定抓取到的 Bug ID");
          const fetchedPath = join(temp, `bug-${fetchedId}.json`);
          const fetched = JSON.parse(readFileSync(fetchedPath, "utf8")) as {
            bug_id: number;
            url: string;
            title: string | null;
            fields: Record<string, unknown>;
            sections: { steps_md: string; resolution_md: string };
            history: Array<{ date: string; actor: string; action: string; comment_md: string }>;
          };
          if (!fetched.title || !fetched.sections)
            throw new Error("禅道返回内容不完整，未生成报告");
          const reportPath = hotfixReportPath(
            locateProjectRoot(),
            opts.project,
            opts.yyyymm,
            opts.slug,
          );
          mkdirSync(dirname(reportPath), { recursive: true });
          writeFileSync(
            reportPath,
            renderHotfixMarkdown({
              source: fetched.url || opts.url || "",
              bug: fetched as unknown as Parameters<typeof renderHotfixMarkdown>[0]["bug"],
            }),
            { encoding: "utf8", mode: 0o600 },
          );
          const violations = lintHotfixMarkdown(reportPath);
          for (const v of violations) console.log(`${reportPath}:${v.line}:${v.rule}:${v.message}`);
          if (violations.length > 0)
            throw new Error(`生成的 hotfix 报告未通过 lint: ${reportPath}`);
          outputJson({ ok: true, report: reportPath, bugId: fetched.bug_id });
        } finally {
          rmSync(temp, { recursive: true, force: true });
        }
      },
    );

  defects
    .command("lint")
    .description("校验正式 Markdown 缺陷报告结构")
    .requiredOption("--report <path>", "报告 Markdown 路径")
    .option("--exit-code", "存在 violation 时退出码为 1")
    .action((opts: { report: string; exitCode?: boolean }) => {
      const reportPath = resolve(opts.report);
      const isHotfix = /[\\/]analyses[\\/]hotfix-case[\\/]/.test(reportPath);
      if (isHotfix) {
        const violations = lintHotfixMarkdown(reportPath);
        for (const violation of violations) {
          process.stderr.write(
            `${opts.report}:${violation.line}:${violation.rule}:${violation.message}\n`,
          );
        }
        outputJson({ report: opts.report, kind: "hotfix", violations: violations.length });
        if (opts.exitCode && violations.length > 0) process.exitCode = 1;
        return;
      }
      const result = lintMarkdownReport(reportPath);
      for (const violation of result.violations) {
        process.stderr.write(`${opts.report}:${violation.line}:report:${violation.message}\n`);
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
