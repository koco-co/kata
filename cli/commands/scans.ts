import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Command } from "commander";
import { outputJson } from "../lib/cli.ts";
import { resolveSourceRepo } from "../lib/git-source.ts";
import { assertWritable } from "../lib/path-policy.ts";
import { assertReportSlug, assertYyyymm, auditReportPath, currentYYYYMM } from "../lib/paths.ts";
import { computeDiffStats, fetchAndDiff } from "../lib/scan-report-diff.ts";
import { locateProject } from "../lib/workspace-locator.ts";

function defaultSlug(repo: string, base: string, head: string): string {
  const clean = (s: string) =>
    s
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  return `${clean(repo)}-${clean(base)}-to-${clean(head)}`.slice(0, 80);
}

function writeFormalReport(
  project: string,
  ym: string,
  slug: string,
  input: string,
  stats: ReturnType<typeof computeDiffStats>,
  force: boolean,
): string {
  assertReportSlug(slug);
  const out = auditReportPath(project, ym, slug);
  assertWritable(locateProject(project), out);
  if (existsSync(out) && !force) {
    throw new Error(`报告已存在: ${out}（使用 --force 覆盖）`);
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    [
      `# Scan 分析报告：${slug}`,
      "",
      `- 日期：${new Date().toISOString()}`,
      `- 输入：${input}`,
      "",
      "## 结论",
      "",
      "已收集本次 diff 输入；发现项需在本 Markdown 中补充并复核。",
      "",
      "## 证据",
      "",
      `- 变更文件 ${stats.files} 个，新增 ${stats.additions} 行，删除 ${stats.deletions} 行。`,
      "- 原始 patch 仅作为本次命令输入，不落盘为正式产物。",
      "",
      "## 发现",
      "",
      "- 当前未登记具体发现；逐文件分析结果应直接写入本节。",
      "",
      "## 建议",
      "",
      "- 完成逐文件审查后更新本 Markdown，并运行 `kata defects lint --report <report.md> --exit-code`。",
      "",
    ].join("\n"),
    "utf8",
  );
  return out;
}

/** Build the `scans` command: create a Markdown-only diff-scan report. */
export function registerScans(program: Command): void {
  const scans = program.command("scans").description("代码 diff 扫描报告");

  scans
    .command("create")
    .description("初始化扫描并写入正式 Markdown 报告")
    .requiredOption("--project <name>", "项目名")
    .option("--repo <name>", "config/private/repositories.yaml 中的 group/repo 或 repo 短名")
    .option("--base-branch <ref>", "基线分支")
    .option("--head-branch <ref>", "目标分支")
    .option("--patch <path>", "已有 patch 文件；与分支对二选一")
    .option("--slug <slug>", "覆盖默认 slug")
    .option("--yyyymm <ym>", "覆盖默认当前 YYYYMM")
    .option("--skip-fetch", "跳过 git fetch", false)
    .option("--force", "覆盖已存在的同名报告", false)
    .action(
      (opts: {
        project: string;
        repo?: string;
        baseBranch?: string;
        headBranch?: string;
        patch?: string;
        slug?: string;
        yyyymm?: string;
        skipFetch: boolean;
        force: boolean;
      }) => {
        const yyyymm = opts.yyyymm ?? currentYYYYMM();
        assertYyyymm(yyyymm);
        locateProject(opts.project);
        let diffOut: {
          diff: string;
          stats: ReturnType<typeof computeDiffStats>;
          base_commit: string;
          head_commit: string;
        };
        if (opts.patch) {
          if (opts.repo || opts.baseBranch || opts.headBranch) {
            throw new Error("--patch 与 --repo/--base-branch/--head-branch 必须二选一");
          }
          const diff = readFileSync(opts.patch, "utf8");
          diffOut = {
            diff,
            stats: computeDiffStats(diff),
            base_commit: "patch",
            head_commit: "patch",
          };
        } else {
          if (!opts.repo || !opts.baseBranch || !opts.headBranch) {
            throw new Error(
              "分支对模式必须同时提供 --repo、--base-branch、--head-branch；或提供 --patch",
            );
          }
          const repo = resolveSourceRepo(opts.repo);
          if (!repo)
            throw new Error(`未找到已配置仓库 ${opts.repo}(config/private/repositories.yaml)`);
          const slug = opts.slug ?? defaultSlug(opts.repo, opts.baseBranch, opts.headBranch);
          diffOut = fetchAndDiff(repo, opts.baseBranch, opts.headBranch, {
            skipFetch: opts.skipFetch,
          });
          const report = writeFormalReport(
            opts.project,
            yyyymm,
            slug,
            `${opts.repo}:${opts.baseBranch}..${opts.headBranch}`,
            diffOut.stats,
            opts.force,
          );
          outputJson({ ok: true, slug, yyyymm, report });
          return;
        }
        const slug = opts.slug ?? `patch-${yyyymm}`;

        const report = writeFormalReport(
          opts.project,
          yyyymm,
          slug,
          opts.patch ?? "patch",
          diffOut.stats,
          opts.force,
        );
        outputJson({ ok: true, slug, yyyymm, report });
      },
    );
}
