#!/usr/bin/env bun
/**
 * discuss.ts — PRD 需求讨论 enhanced.md 管理 CLI (v3)
 *
 * Usage:
 *   kata discuss <action> --project <name> --yyyymm <ym> --prd-slug <slug> [...]
 * Actions: init | read | set-status | set-section | add-section | set-source-facts |
 *          add-pending | resolve | list-pending | compact | validate | complete
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import matter from "gray-matter";
import { createCli } from "../lib/cli-runner.ts";
import {
  addPending,
  addSection,
  compactDoc,
  initDoc,
  listPending,
  readDoc,
  resolvePending,
  setSection,
  setSourceFacts,
  setStatus,
  validateDoc,
} from "../lib/enhanced-doc-store.ts";
import {
  type EnhancedFrontmatter,
  type EnhancedStatus,
  isPendingSeverity,
  PENDING_SEVERITIES,
} from "../lib/enhanced-doc-types.ts";
import { enhancedMd } from "../lib/paths.ts";

// ============================================================================
// CLI wiring
// ============================================================================

// ── Callable action for noun-verb port ──────────────────────────────────────

export interface DiscussValidateContext {
  project: string;
  featureId: string;
  workspace: string;
  checkSourceRefs: string[];
}

export async function runDiscussValidate(ctx: DiscussValidateContext): Promise<void> {
  // TODO: Move existing validate action body here from the Commander .action() handler
  // For now, stub that logs the context — the real logic stays in the .action() wrapper
  console.log(`discuss validate: project=${ctx.project} featureId=${ctx.featureId}`);
}

const ENHANCED_STATUSES = [
  "discussing",
  "pending-review",
  "ready",
  "analyzing",
  "writing",
  "completed",
] as const satisfies readonly EnhancedStatus[];

const COMPLETE_STATUSES = ["pending-review", "ready"] as const satisfies readonly EnhancedStatus[];

type CompleteStatus = (typeof COMPLETE_STATUSES)[number];

interface BaseDocOptions {
  project: string;
  yyyymm: string;
  prdSlug: string;
}

interface SetStatusOptions extends BaseDocOptions {
  status: string;
}

interface AddPendingOptions extends BaseDocOptions {
  location: string;
  label: string;
  question: string;
  recommended: string;
  expected: string;
  severity: string;
}

interface ResolveOptions extends BaseDocOptions {
  id: string;
  answer: string;
  asDefault?: boolean;
}

interface ListPendingOptions extends BaseDocOptions {
  format?: string;
  includeResolved?: boolean;
}

interface CompactOptions extends BaseDocOptions {
  threshold?: string;
}

interface ValidateOptions extends BaseDocOptions {
  requireZeroPending?: boolean;
  requireZeroBlockingPending?: boolean;
  checkSourceRefs?: string;
}

function isEnhancedStatus(value: string): value is EnhancedStatus {
  return (ENHANCED_STATUSES as readonly string[]).includes(value);
}

function isCompleteStatus(value: string): value is CompleteStatus {
  return (COMPLETE_STATUSES as readonly string[]).includes(value);
}

function invalidStatusError(statuses: readonly string[]): string {
  return `invalid status, must be one of: ${statuses.join(", ")}`;
}

export const program = createCli({
  name: "discuss",
  description: "PRD 需求讨论 enhanced.md 管理 CLI (v3)",
  commands: [
    {
      name: "init",
      description: "创建 enhanced.md 骨架",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份 YYYYMM", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
      ],
      action: (opts: { project: string; yyyymm: string; prdSlug: string }) => {
        initDoc(opts.project, opts.yyyymm, opts.prdSlug);
        process.stdout.write(`${JSON.stringify({ ok: true })}\n`);
      },
    },
    {
      name: "read",
      description: "读取 enhanced.md",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
      ],
      action: (opts: { project: string; yyyymm: string; prdSlug: string }) => {
        const doc = readDoc(opts.project, opts.yyyymm, opts.prdSlug);
        process.stdout.write(`${JSON.stringify(doc)}\n`);
      },
    },
    {
      name: "set-status",
      description: "切换 frontmatter.status",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--status <s>", description: "新状态", required: true },
      ],
      action: (opts: SetStatusOptions) => {
        if (!isEnhancedStatus(opts.status)) {
          process.stdout.write(
            `${JSON.stringify({ ok: false, error: invalidStatusError(ENHANCED_STATUSES) })}\n`,
          );
          process.exit(1);
        }
        setStatus(opts.project, opts.yyyymm, opts.prdSlug, opts.status);
        process.stdout.write(`${JSON.stringify({ ok: true })}\n`);
      },
    },
    {
      name: "set-section",
      description: "按锚点替换小节正文",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--anchor <a>", description: "目标锚点", required: true },
        {
          flag: "--content <str>",
          description: "Markdown 正文",
          required: true,
        },
      ],
      action: (opts: {
        project: string;
        yyyymm: string;
        prdSlug: string;
        anchor: string;
        content: string;
      }) => {
        setSection(opts.project, opts.yyyymm, opts.prdSlug, opts.anchor, opts.content);
        process.stdout.write(`${JSON.stringify({ ok: true })}\n`);
      },
    },
    {
      name: "add-section",
      description: "在 §2 或 §3 下新增小节",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--parent-level <n>", description: "2 或 3", required: true },
        { flag: "--title <s>", description: "小节标题", required: true },
        { flag: "--body <s>", description: "小节正文", required: true },
      ],
      action: (opts: {
        project: string;
        yyyymm: string;
        prdSlug: string;
        parentLevel: string;
        title: string;
        body: string;
      }) => {
        const anchor = addSection(opts.project, opts.yyyymm, opts.prdSlug, {
          parentLevel: Number(opts.parentLevel) as 2 | 3,
          title: opts.title,
          body: opts.body,
        });
        process.stdout.write(`${JSON.stringify({ anchor })}\n`);
      },
    },
    {
      name: "set-source-facts",
      description: "写入 Appendix A 源码事实表（自动外溢 >64KB）",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        {
          flag: "--content <json>",
          description: "SourceFacts JSON 或 @<path>",
          required: true,
        },
      ],
      action: (opts: { project: string; yyyymm: string; prdSlug: string; content: string }) => {
        const raw = opts.content.startsWith("@")
          ? readFileSync(opts.content.slice(1), "utf8")
          : opts.content;
        setSourceFacts(opts.project, opts.yyyymm, opts.prdSlug, JSON.parse(raw));
        process.stdout.write(`${JSON.stringify({ ok: true })}\n`);
      },
    },
    {
      name: "add-pending",
      description: "新增待确认项 Q",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--location <anchor>", description: "锚点", required: true },
        { flag: "--label <s>", description: "位置标签", required: true },
        { flag: "--question <s>", description: "问题文本", required: true },
        { flag: "--recommended <s>", description: "推荐方案", required: true },
        { flag: "--expected <s>", description: "预期", required: true },
        {
          flag: "--severity <s>",
          description: PENDING_SEVERITIES.join(" | "),
          required: true,
        },
      ],
      action: (opts: AddPendingOptions) => {
        if (!isPendingSeverity(opts.severity)) {
          process.stdout.write(`${JSON.stringify({ ok: false, error: "invalid severity" })}\n`);
          process.exit(1);
        }
        const id = addPending(opts.project, opts.yyyymm, opts.prdSlug, {
          locationAnchor: opts.location,
          locationLabel: opts.label,
          question: opts.question,
          recommended: opts.recommended,
          expected: opts.expected,
          severity: opts.severity,
        });
        process.stdout.write(`${JSON.stringify({ id })}\n`);
      },
    },
    {
      name: "resolve",
      description: "解决一条 Q（套 <del>）",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        {
          flag: "--id <qid>",
          description: "Q ID (q1, q2, ...)",
          required: true,
        },
        { flag: "--answer <s>", description: "回答", required: true },
        {
          flag: "--as-default",
          description: "标记为默认采用",
          defaultValue: false,
        },
      ],
      action: (opts: ResolveOptions) => {
        resolvePending(opts.project, opts.yyyymm, opts.prdSlug, opts.id, {
          answer: opts.answer,
          asDefault: !!opts.asDefault,
        });
        process.stdout.write(`${JSON.stringify({ ok: true })}\n`);
      },
    },
    {
      name: "list-pending",
      description: "列出待确认项",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        {
          flag: "--format <f>",
          description: "json | table",
          defaultValue: "json",
        },
        {
          flag: "--include-resolved",
          description: "包含已解决",
          defaultValue: false,
        },
      ],
      action: (opts: ListPendingOptions) => {
        const items = listPending(opts.project, opts.yyyymm, opts.prdSlug, {
          includeResolved: !!opts.includeResolved,
        });
        if (opts.format === "table") {
          for (const it of items) {
            process.stdout.write(`${it.id}\t${it.status}\t${it.question}\n`);
          }
        } else {
          process.stdout.write(`${JSON.stringify(items)}\n`);
        }
      },
    },
    {
      name: "compact",
      description: "归档 resolved Q 到 resolved.md",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--threshold <n>", description: "阈值", defaultValue: "50" },
      ],
      action: (opts: CompactOptions) => {
        const moved = compactDoc(opts.project, opts.yyyymm, opts.prdSlug, {
          threshold: Number(opts.threshold),
        });
        process.stdout.write(`${JSON.stringify({ moved })}\n`);
      },
    },
    {
      name: "validate",
      description: "校验 enhanced.md 完整性",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        {
          flag: "--require-zero-pending",
          description: "pending>0 则退 3",
          defaultValue: false,
        },
        {
          flag: "--require-zero-blocking-pending",
          description: "blocking pending>0 则退 3",
          defaultValue: false,
        },
        {
          flag: "--check-source-refs <csv>",
          description: "逗号分隔的 source_ref 列表",
          defaultValue: "",
        },
      ],
      action: (opts: ValidateOptions) => {
        const r = validateDoc(opts.project, opts.yyyymm, opts.prdSlug, {
          requireZeroPending: !!opts.requireZeroPending,
          requireZeroBlockingPending: !!opts.requireZeroBlockingPending,
          checkSourceRefs: opts.checkSourceRefs ? opts.checkSourceRefs.split(",") : undefined,
        });
        process.stdout.write(`${JSON.stringify(r)}\n`);
        if (!r.ok) {
          const zeroPendingIssue = r.issues.some(
            (i: string) =>
              i.includes("requireZeroPending") || i.includes("requireZeroBlockingPending"),
          );
          process.exit(zeroPendingIssue ? 3 : 1);
        }
      },
    },
    {
      name: "complete",
      description: "完成讨论，更新 knowledge_dropped 和状态",
      options: [
        { flag: "--project <name>", description: "项目名", required: true },
        { flag: "--yyyymm <ym>", description: "月份 YYYYMM", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        {
          flag: "--knowledge-summary <json>",
          description: "知识摘要 JSON 数组",
        },
        {
          flag: "--status <s>",
          description: "完成状态：pending-review | ready",
          defaultValue: "pending-review",
        },
      ],
      action: (opts: {
        project: string;
        yyyymm: string;
        prdSlug: string;
        knowledgeSummary?: string;
        status?: string;
      }) => {
        const docPath = enhancedMd(opts.project, opts.yyyymm, opts.prdSlug);
        if (!existsSync(docPath)) {
          process.stdout.write(
            `${JSON.stringify({ ok: false, error: "enhanced.md not found" })}\n`,
          );
          process.exit(1);
        }

        if (opts.status && !isCompleteStatus(opts.status)) {
          process.stdout.write(
            `${JSON.stringify({ ok: false, error: invalidStatusError(COMPLETE_STATUSES) })}\n`,
          );
          process.exit(1);
        }

        const status = opts.status ?? "pending-review";
        let knowledgeDropped: unknown[] = [];

        if (opts.knowledgeSummary) {
          try {
            const parsed = JSON.parse(opts.knowledgeSummary);
            if (!Array.isArray(parsed)) throw new Error();
            knowledgeDropped = parsed;
          } catch {
            process.stdout.write(`${JSON.stringify({ ok: false, error: "invalid JSON" })}\n`);
            process.exit(1);
          }
        }

        // Read, validate frontmatter, and write back
        const raw = readFileSync(docPath, "utf8");
        let parsed: ReturnType<typeof matter>;
        try {
          parsed = matter(raw);
        } catch {
          process.stdout.write(
            `${JSON.stringify({ ok: false, error: "cannot parse frontmatter" })}\n`,
          );
          process.exit(1);
        }

        const fm = {
          ...(parsed.data as EnhancedFrontmatter),
          status: status as EnhancedFrontmatter["status"],
          knowledge_dropped: knowledgeDropped,
          updated_at: new Date().toISOString(),
        };
        writeFileSync(docPath, matter.stringify(parsed.content, fm), "utf8");

        process.stdout.write(
          `${JSON.stringify({
            ok: true,
            status,
            knowledge_dropped: knowledgeDropped,
            file: docPath,
          })}\n`,
        );
      },
    },
  ],
});

if (import.meta.main) {
  program.parseAsync(process.argv);
}
