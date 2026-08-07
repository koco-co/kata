import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import type { Command } from "commander";
import {
  emitBusinessNotificationSafely,
  formatTaipeiTime,
  type NotificationEventType,
  workspaceRelativePath,
} from "../integrations/notify/index.ts";
import { runFetch } from "../integrations/zentao/fetch.ts";
import { outputJson } from "../lib/cli.ts";
import {
  lintMarkdownReport,
  parseBugReportMarkdown,
  type ReportKind,
} from "../lib/defect-report.ts";
import {
  hotfixReportPath,
  lintHotfixMarkdown,
  loadHotfixEvidence,
  renderHotfixMarkdown,
} from "../lib/hotfix-report.ts";
import { assertWritable } from "../lib/path-policy.ts";
import { assertReportSlug, assertYyyymm } from "../lib/paths.ts";
import { locateProject } from "../lib/workspace-locator.ts";

const BUG_VIEW_ID_RE = /bug-view-(\d+)\.html/;

function reportNotificationContext(reportPath: string): {
  root: string;
  project: string;
  version: string;
  feature: string;
  reportPath: string;
} {
  const parts = resolve(reportPath).split(/[\\/]/);
  const workspaceIndex = parts.lastIndexOf("workspace");
  if (workspaceIndex < 1 || !parts[workspaceIndex + 1]) {
    throw new Error(`报告不在 workspace/<project>/ 下，无法创建通知: ${reportPath}`);
  }
  const root = parts.slice(0, workspaceIndex).join("/") || "/";
  const version = basename(dirname(reportPath));
  const title =
    readFileSync(reportPath, "utf8")
      .match(/^#\s+(.+)$/m)?.[1]
      ?.trim() ?? basename(reportPath, ".md");
  return {
    root,
    project: parts[workspaceIndex + 1],
    version,
    feature: title,
    reportPath: workspaceRelativePath(root, reportPath),
  };
}

function markdownSection(text: string, heading: string): string {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start < 0) return "";
  const end = lines.findIndex((line, index) => index > start && /^##\s+/.test(line));
  return lines
    .slice(start + 1, end < 0 ? lines.length : end)
    .join("\n")
    .replace(/^[-*]\s*严重程度[：:].*$/gim, "")
    .trim();
}

function reportEvent(kind: ReportKind | "hotfix"): NotificationEventType {
  return {
    bug: "bug-analysis-completed",
    conflict: "conflict-analysis-completed",
    scan: "scan-completed",
    hotfix: "hotfix-report-created",
  }[kind] as NotificationEventType;
}

async function notifyPublishedReport(
  reportPath: string,
  event: NotificationEventType,
): Promise<Awaited<ReturnType<typeof emitBusinessNotificationSafely>>> {
  const context = reportNotificationContext(reportPath);
  const text = readFileSync(reportPath, "utf8");
  const summary =
    markdownSection(text, "结论") ||
    text.match(/^#\s+(.+)$/m)?.[1]?.trim() ||
    basename(reportPath, ".md");
  const severity =
    event === "bug-analysis-completed" ? parseBugReportMarkdown(reportPath).severity : undefined;
  const result = await emitBusinessNotificationSafely(
    event,
    {
      project: context.project,
      version: context.version,
      feature: context.feature,
      completed_at: formatTaipeiTime(),
      report_path: context.reportPath,
      summary,
      ...(severity ? { severity } : {}),
    },
    { root: context.root },
  );
  process.stderr.write(
    `[notify] ${event}: ${result.state}${result.reason ? ` (${result.reason})` : ""}\n`,
  );
  return result;
}

/** Build the `defects` command: generate and validate formal defect reports. */
export function registerDefects(program: Command): void {
  const defects = program.command("defects").description("缺陷报告生成与结构校验");

  defects
    .command("hotfix")
    .description("从 ZenTao Bug 证据生成 Markdown hotfix 回归报告")
    .option("--bug-id <number>", "禅道 Bug ID")
    .option("--url <url>", "禅道 Bug 页面 URL")
    .requiredOption("--project <name>", "项目名")
    .requiredOption("--yyyymm <yyyymm>", "报告年月，例如 202607")
    .requiredOption("--slug <slug>", "报告 slug")
    .requiredOption("--evidence-file <path>", "已核对的 hotfix 业务证据 JSON 文件")
    .action(
      async (opts: {
        bugId?: string;
        url?: string;
        project: string;
        yyyymm: string;
        slug: string;
        evidenceFile: string;
      }) => {
        if ((opts.bugId ? 1 : 0) + (opts.url ? 1 : 0) !== 1) {
          throw new Error("必须且只能提供 --bug-id 或 --url");
        }
        assertYyyymm(opts.yyyymm);
        assertReportSlug(opts.slug);
        const projectPaths = locateProject(opts.project);
        const evidence = loadHotfixEvidence(resolve(opts.evidenceFile));
        if (opts.bugId !== undefined && !/^\d+$/.test(opts.bugId)) {
          throw new Error("--bug-id 必须为数字");
        }
        const bugId = opts.bugId === undefined ? undefined : Number.parseInt(opts.bugId, 10);

        const temp = mkdtempSync(join(tmpdir(), "kata-hotfix-fetch-"));
        try {
          await runFetch({ bugId, url: opts.url, output: temp });
          const urlBugId = opts.url?.match(BUG_VIEW_ID_RE)?.[1];
          const fetchedId = bugId ?? (urlBugId ? Number.parseInt(urlBugId, 10) : undefined);
          if (!fetchedId) throw new Error("无法确定抓取到的 Bug ID");
          const fetchedPath = join(temp, `bug-${fetchedId}.json`);
          if (!existsSync(fetchedPath)) {
            const found = readdirSync(temp).filter((file) => /^bug-\d+\.json$/.test(file));
            throw new Error(
              found.length > 0
                ? `禅道抓取结果缺少 bug-${fetchedId}.json；实际产出: ${found.join(", ")}`
                : `禅道抓取结果缺少 bug-${fetchedId}.json；输出目录无任何 bug-*.json`,
            );
          }
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
            projectPaths.root,
            opts.project,
            opts.yyyymm,
            opts.slug,
          );
          assertWritable(projectPaths, reportPath);
          mkdirSync(dirname(reportPath), { recursive: true });
          writeFileSync(
            reportPath,
            renderHotfixMarkdown({
              source: fetched.url || opts.url || "",
              bug: fetched as unknown as Parameters<typeof renderHotfixMarkdown>[0]["bug"],
              evidence,
            }),
            { encoding: "utf8", mode: 0o600, flag: "wx" },
          );
          const violations = lintHotfixMarkdown(reportPath);
          for (const v of violations) {
            process.stderr.write(`${reportPath}:${v.line}:${v.rule}:${v.message}\n`);
          }
          if (violations.length > 0)
            throw new Error(`生成的 hotfix 报告未通过 lint: ${reportPath}`);
          outputJson({ ok: true, report: reportPath, bugId: fetched.bug_id });
          await notifyPublishedReport(reportPath, "hotfix-report-created");
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
    .action(async (opts: { report: string; exitCode?: boolean }) => {
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
    .command("publish")
    .description("校验并发布正式缺陷报告完成通知")
    .requiredOption("--report <path>", "报告 Markdown 路径")
    .requiredOption("--confirmed", "确认报告已完成评审并允许发送通知")
    .action(async (opts: { report: string; confirmed: boolean }) => {
      if (!opts.confirmed) throw new Error("发布报告必须显式提供 --confirmed");
      const reportPath = resolve(opts.report);
      const isHotfix = /[\\/]analyses[\\/]hotfix-case[\\/]/.test(reportPath);
      if (isHotfix) {
        const violations = lintHotfixMarkdown(reportPath);
        for (const violation of violations) {
          process.stderr.write(
            `${opts.report}:${violation.line}:${violation.rule}:${violation.message}\n`,
          );
        }
        if (violations.length > 0) {
          throw new Error(`报告未通过 lint，禁止发布: ${opts.report}`);
        }
        const notification = await notifyPublishedReport(reportPath, reportEvent("hotfix"));
        outputJson({
          ok: true,
          report: opts.report,
          kind: "hotfix",
          event: reportEvent("hotfix"),
          notification,
        });
        return;
      }

      const result = lintMarkdownReport(reportPath);
      for (const violation of result.violations) {
        process.stderr.write(`${opts.report}:${violation.line}:report:${violation.message}\n`);
      }
      if (result.violations.length > 0) {
        throw new Error(`报告未通过 lint，禁止发布: ${opts.report}`);
      }
      const event = reportEvent(result.kind);
      const notification = await notifyPublishedReport(reportPath, event);
      outputJson({
        ok: true,
        report: opts.report,
        kind: result.kind,
        event,
        notification,
      });
    });
}
