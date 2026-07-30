#!/usr/bin/env bun
/**
 * knowledge write — overview 聚合文件写入(带冲突检测与审计)。
 * term/module/pitfall/site 独立条目走 entry.ts 的四态写入。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  type ContentOverview,
  confidenceGate,
  type Frontmatter,
  parseContentJson,
  parseFrontmatter,
  serializeFrontmatter,
  todayIso,
} from "../knowledge.ts";
import {
  appendAudit,
  buildAuditRecord,
  type Conflict,
  detectOverviewConflict,
  saveSnapshot,
} from "../knowledge-guard.ts";
import { knowledgePath } from "../knowledge-paths.ts";
import { upsertOverviewSection, writeIndexFile } from "./index-data.ts";

type WritePlan = {
  targetPath: string;
  beforeContent: string;
  afterContent: string;
  conflict: Conflict | null;
};

export type KnowledgeOverviewWriteResult =
  | {
      blocked: true;
      action: "write";
      type: string;
      file: string;
      conflict: Conflict;
      hint: string;
    }
  | {
      dry_run: true;
      action: "write";
      type: string;
      file: string;
      before: string;
      after: string;
      conflict: Conflict | null;
    }
  | {
      action: "write";
      type: string;
      file: string;
      before: string;
      after: string;
      snapshot: string | null;
      conflict: Conflict | null;
    };

export class KnowledgeWriteError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "KnowledgeWriteError";
    this.exitCode = exitCode;
  }
}

export function runWrite(opts: {
  project: string;
  type: string;
  content: string;
  confidence: string;
  confirmed: boolean;
  dryRun: boolean;
  overwrite: boolean;
  force: boolean;
}): KnowledgeOverviewWriteResult {
  const gate = confidenceGate(opts.confidence, opts.confirmed);
  if (!gate.allowed) {
    throw new KnowledgeWriteError(`[knowledge] ${gate.reason}`);
  }

  const plan = buildWritePlan(opts, todayIso());

  // ── 冲突守卫:block 级冲突必须 --force 才能越过 ──
  if (plan.conflict && plan.conflict.severity === "block" && !opts.force) {
    return {
      blocked: true,
      action: "write",
      type: opts.type,
      file: plan.targetPath,
      conflict: plan.conflict,
      hint: "冲突阻断。核对后可加 --force 强制写入。",
    };
  }

  if (opts.dryRun) {
    return {
      dry_run: true,
      action: "write",
      type: opts.type,
      file: plan.targetPath,
      before: plan.beforeContent,
      after: plan.afterContent,
      conflict: plan.conflict,
    };
  }

  const snapshotName = plan.beforeContent
    ? saveSnapshot(opts.project, plan.targetPath, plan.beforeContent)
    : null;
  mkdirSync(dirname(plan.targetPath), { recursive: true });
  writeFileSync(plan.targetPath, plan.afterContent);
  writeIndexFile(opts.project);
  appendWriteAudit(opts, plan, snapshotName);
  return {
    action: "write",
    type: opts.type,
    file: plan.targetPath,
    before: plan.beforeContent,
    after: plan.afterContent,
    snapshot: snapshotName,
    conflict: plan.conflict,
  };
}

function buildWritePlan(opts: Parameters<typeof runWrite>[0], today: string): WritePlan {
  if (opts.type === "overview") return buildOverviewWritePlan(opts, today);
  throw new KnowledgeWriteError(
    `[knowledge] 类型 ${opts.type} 不支持 --content;term/module/pitfall/site 用 --status/--title/--body 写入`,
  );
}

function buildOverviewWritePlan(opts: Parameters<typeof runWrite>[0], today: string): WritePlan {
  const parsed = parseContentJson<ContentOverview>("overview", opts.content);
  const targetPath = knowledgePath(opts.project, "overview.md");
  const beforeContent = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : "";
  const file = parseFrontmatter(beforeContent);
  const newFm =
    file.frontmatter ?? defaultKnowledgeFrontmatter(`${opts.project} 业务概览`, "overview", today);
  const baseBody = file.frontmatter ? file.body : `\n# ${newFm.title}\n`;
  const nextFm = { ...newFm, updated: today };
  return {
    targetPath,
    beforeContent,
    conflict: detectOverviewConflict(baseBody, parsed.section, parsed.body, parsed.mode),
    afterContent:
      serializeFrontmatter(nextFm) +
      upsertOverviewSection(baseBody, parsed.section, parsed.body, parsed.mode),
  };
}

function defaultKnowledgeFrontmatter(
  title: string,
  type: Frontmatter["type"],
  today: string,
): Frontmatter {
  return { title, type, tags: [], confidence: "high", source: "", updated: today };
}

function appendWriteAudit(
  opts: Parameters<typeof runWrite>[0],
  plan: WritePlan,
  snapshotName: string | null,
): void {
  appendAudit(
    opts.project,
    buildAuditRecord({
      action: "write",
      type: opts.type,
      file: plan.targetPath,
      before: plan.beforeContent,
      after: plan.afterContent,
      snapshot: snapshotName ?? "",
      confidence: opts.confidence,
      confirmed: opts.confirmed,
      forced: opts.force,
    }),
  );
}
