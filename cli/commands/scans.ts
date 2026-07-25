import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Command } from "commander";
import { outputJson } from "../lib/cli.ts";
import { resolveSourceRepo } from "../lib/git-source.ts";
import { auditDir, auditFile, currentYYYYMM } from "../lib/paths.ts";
import { fetchAndDiff } from "../lib/scan-report-diff.ts";
import { renderScanReport } from "../lib/scan-report-render.ts";
import { initAudit, readMeta, readReport } from "../lib/scan-report-store.ts";
import { type AuditMeta, SCAN_REPORT_SCHEMA_VERSION } from "../lib/scan-report-types.ts";

function defaultSlug(repo: string, base: string, head: string): string {
  const clean = (s: string) =>
    s
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  return `${clean(repo)}-${clean(base)}-to-${clean(head)}`.slice(0, 80);
}

function autoRender(project: string, ym: string, slug: string): string {
  const meta = readMeta(project, ym, slug);
  const report = readReport(project, ym, slug);
  const html = renderScanReport(meta, report);
  const out = auditFile(project, ym, slug, "report.html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html, "utf8");
  return out;
}

/** Build the `scans` command: create + render a diff-scan report. */
export function registerScans(program: Command): void {
  const scans = program.command("scans").description("代码 diff 扫描报告");

  scans
    .command("create")
    .description("初始化扫描并写入 meta.json、report.json 与 diff.patch")
    .requiredOption("--project <name>", "项目名")
    .requiredOption("--repo <name>", "config/source-repos.yaml 中的 group/repo 或 repo 短名")
    .requiredOption("--base-branch <ref>", "基线分支")
    .requiredOption("--head-branch <ref>", "目标分支")
    .option("--slug <slug>", "覆盖默认 slug")
    .option("--yyyymm <ym>", "覆盖默认当前 YYYYMM")
    .option("--skip-fetch", "跳过 git fetch", false)
    .action(
      (opts: {
        project: string;
        repo: string;
        baseBranch: string;
        headBranch: string;
        slug?: string;
        yyyymm?: string;
        skipFetch: boolean;
      }) => {
        const repo = resolveSourceRepo(opts.repo);
        if (!repo) throw new Error(`未找到已配置仓库 ${opts.repo}(config/source-repos.yaml)`);
        const repoPath = repo.absPath;
        const yyyymm = opts.yyyymm ?? currentYYYYMM();
        const slug = opts.slug ?? defaultSlug(opts.repo, opts.baseBranch, opts.headBranch);
        const diffOut = fetchAndDiff(repoPath, opts.baseBranch, opts.headBranch, {
          skipFetch: opts.skipFetch,
        });

        const meta: AuditMeta = {
          schema_version: SCAN_REPORT_SCHEMA_VERSION,
          project: opts.project,
          repo: opts.repo,
          base_branch: opts.baseBranch,
          head_branch: opts.headBranch,
          base_commit: diffOut.base_commit,
          head_commit: diffOut.head_commit,
          scan_time: new Date().toISOString(),
          reviewer: null,
          related_feature: null,
          diff_stats: diffOut.stats,
          summary: "",
        } as AuditMeta;
        initAudit(opts.project, yyyymm, slug, meta);
        const diffPath = join(auditDir(opts.project, yyyymm, slug), "diff.patch");
        mkdirSync(dirname(diffPath), { recursive: true });
        writeFileSync(diffPath, diffOut.diff, "utf8");
        const html = autoRender(opts.project, yyyymm, slug);
        outputJson({ ok: true, slug, yyyymm, html });
      },
    );

  scans
    .command("render")
    .description("根据当前 report.json 生成 report.html")
    .requiredOption("--project <name>", "项目名")
    .requiredOption("--yyyymm <ym>", "yyyymm")
    .requiredOption("--slug <slug>", "audit slug")
    .action((opts: { project: string; yyyymm: string; slug: string }) => {
      outputJson({ ok: true, html: autoRender(opts.project, opts.yyyymm, opts.slug) });
    });
}
