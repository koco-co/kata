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
import { createCli } from "@shared/lib/cli-runner.ts";
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
} from "@shared/lib/enhanced-doc-store.ts";
import {
  type EnhancedFrontmatter,
  type EnhancedStatus,
  isPendingSeverity,
  PENDING_SEVERITIES,
} from "@shared/lib/enhanced-doc-types.ts";
import { enhancedMd } from "@shared/lib/paths.ts";
import matter from "gray-matter";

// ============================================================================
// CLI wiring
// ============================================================================

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
  description: "PRD discussion enhanced.md management CLI (v3)",
  commands: [
    {
      name: "init",
      description: "Create enhanced.md skeleton",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--yyyymm <ym>", description: "Month YYYYMM", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
      ],
      action: (opts: { project: string; yyyymm: string; prdSlug: string }) => {
        initDoc(opts.project, opts.yyyymm, opts.prdSlug);
        process.stdout.write(`${JSON.stringify({ ok: true })}\n`);
      },
    },
    {
      name: "read",
      description: "Read enhanced.md",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--yyyymm <ym>", description: "Month", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
      ],
      action: (opts: { project: string; yyyymm: string; prdSlug: string }) => {
        const doc = readDoc(opts.project, opts.yyyymm, opts.prdSlug);
        process.stdout.write(`${JSON.stringify(doc)}\n`);
      },
    },
    {
      name: "set-status",
      description: "Update frontmatter.status",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--yyyymm <ym>", description: "Month", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--status <s>", description: "New status", required: true },
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
      description: "Replace section body by anchor",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--yyyymm <ym>", description: "Month", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--anchor <a>", description: "Target anchor", required: true },
        {
          flag: "--content <str>",
          description: "Markdown body",
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
      description: "Add section under §2 or §3",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--yyyymm <ym>", description: "Month", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--parent-level <n>", description: "2 or 3", required: true },
        { flag: "--title <s>", description: "Section title", required: true },
        { flag: "--body <s>", description: "Section body", required: true },
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
      description: "Write Appendix A source facts (auto-spill >64KB)",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--yyyymm <ym>", description: "Month", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        {
          flag: "--content <json>",
          description: "SourceFacts JSON or @<path>",
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
      description: "Add a pending question Q",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--yyyymm <ym>", description: "Month", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--location <anchor>", description: "Anchor", required: true },
        { flag: "--label <s>", description: "Location label", required: true },
        { flag: "--question <s>", description: "Question text", required: true },
        { flag: "--recommended <s>", description: "Recommended solution", required: true },
        { flag: "--expected <s>", description: "Expected outcome", required: true },
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
      description: "Resolve a question Q (wraps in <del>)",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--yyyymm <ym>", description: "Month", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        {
          flag: "--id <qid>",
          description: "Q ID (q1, q2, ...)",
          required: true,
        },
        { flag: "--answer <s>", description: "Answer", required: true },
        {
          flag: "--as-default",
          description: "Mark as default resolution",
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
      description: "List pending questions",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--yyyymm <ym>", description: "Month", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        {
          flag: "--format <f>",
          description: "json | table",
          defaultValue: "json",
        },
        {
          flag: "--include-resolved",
          description: "Include resolved",
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
      description: "Archive resolved Qs to resolved.md",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--yyyymm <ym>", description: "Month", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        { flag: "--threshold <n>", description: "Threshold", defaultValue: "50" },
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
      description: "Validate enhanced.md completeness",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--yyyymm <ym>", description: "Month", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        {
          flag: "--require-zero-pending",
          description: "Exit 3 if pending > 0",
          defaultValue: false,
        },
        {
          flag: "--require-zero-blocking-pending",
          description: "Exit 3 if blocking pending > 0",
          defaultValue: false,
        },
        {
          flag: "--check-source-refs <csv>",
          description: "Comma-separated source_ref list",
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
      description: "Complete discussion, update knowledge_dropped and status",
      options: [
        { flag: "--project <name>", description: "Project name", required: true },
        { flag: "--yyyymm <ym>", description: "Month YYYYMM", required: true },
        { flag: "--prd-slug <slug>", description: "PRD slug", required: true },
        {
          flag: "--knowledge-summary <json>",
          description: "Knowledge summary JSON array",
        },
        {
          flag: "--status <s>",
          description: "Completion status: pending-review | ready",
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
