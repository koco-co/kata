#!/usr/bin/env bun
/**
 * knowledge write — overview 聚合文件写入(带冲突检测与审计)。
 * term/module/pitfall/site 独立条目走 entry.ts 的四态写入。
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  type ContentOverview,
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
import { assertWritable } from "../path-policy.ts";
import { locateProject } from "../workspace-locator.ts";
import { upsertOverviewSection, writeIndexFile } from "./index-data.ts";
import { isKnowledgeStatus, type KnowledgeStatus } from "./types.ts";

type WritePlan = {
  targetPath: string;
  beforeContent: string;
  afterContent: string;
  conflict: Conflict | null;
};

type OverviewWriteOptions = {
  project: string;
  type: string;
  content: string;
  status: KnowledgeStatus;
  source: string;
  confirmed: boolean;
  dryRun: boolean;
  overwrite: boolean;
  force: boolean;
};

export type KnowledgeOverviewWriteResult =
  | {
      blocked: true;
      action: "write";
      type: string;
      file: string;
      status: KnowledgeStatus;
      source: string;
      conflict: Conflict;
      hint: string;
    }
  | {
      dry_run: true;
      action: "write";
      type: string;
      file: string;
      status: KnowledgeStatus;
      source: string;
      before: string;
      after: string;
      conflict: Conflict | null;
    }
  | {
      action: "write";
      type: string;
      file: string;
      status: KnowledgeStatus;
      source: string;
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
  status: string;
  source: string;
  confirmed: boolean;
  dryRun: boolean;
  overwrite: boolean;
  force: boolean;
}): KnowledgeOverviewWriteResult {
  const status = normalizeStatus(opts.status);
  const source = opts.source.trim();
  if (!source) throw new KnowledgeWriteError("[knowledge] overview 必须提供 --source(证据来源)");
  const normalized: OverviewWriteOptions = { ...opts, status, source };
  const plan = buildWritePlan(normalized, todayIso());

  // ── 冲突守卫:block 级冲突必须 --force 才能越过 ──
  if (plan.conflict && plan.conflict.severity === "block" && !opts.force) {
    return {
      blocked: true,
      action: "write",
      type: opts.type,
      file: plan.targetPath,
      status,
      source,
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
      status,
      source,
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
  appendWriteAudit(normalized, plan, snapshotName);
  return {
    action: "write",
    type: opts.type,
    file: plan.targetPath,
    status,
    source,
    before: plan.beforeContent,
    after: plan.afterContent,
    snapshot: snapshotName,
    conflict: plan.conflict,
  };
}

function buildWritePlan(opts: OverviewWriteOptions, today: string): WritePlan {
  if (opts.type === "overview") return buildOverviewWritePlan(opts, today);
  throw new KnowledgeWriteError(
    `[knowledge] 类型 ${opts.type} 不支持 --content;term/module/pitfall/site 用 --status/--title/--body 写入`,
  );
}

function buildOverviewWritePlan(opts: OverviewWriteOptions, today: string): WritePlan {
  const parsed = parseContentJson<ContentOverview>("overview", opts.content);
  const paths = locateProject(opts.project);
  const targetPath = knowledgePath(opts.project, "overview.md");
  assertWritable(paths, targetPath);
  const beforeContent = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : "";
  const file = parseFrontmatter(beforeContent);
  if (file.frontmatter?.status === "observed" && opts.status === "verified" && !opts.confirmed) {
    throw new KnowledgeWriteError("[knowledge] overview observed→verified 需要 --confirmed");
  }
  const newFm =
    file.frontmatter ?? defaultKnowledgeFrontmatter(`${opts.project} 业务概览`, "overview", today);
  const baseBody = file.frontmatter ? file.body : `\n# ${newFm.title}\n`;
  const nextFm = { ...newFm, status: opts.status, source: opts.source, updated: today };
  return {
    targetPath,
    beforeContent,
    conflict: detectOverviewConflict(baseBody, parsed.section, parsed.body, parsed.mode),
    afterContent:
      serializeFrontmatter(nextFm) +
      upsertOverviewSection(baseBody, parsed.section, parsed.body, parsed.mode),
  };
}

function normalizeStatus(status: string): KnowledgeStatus {
  if (!isKnowledgeStatus(status)) {
    throw new KnowledgeWriteError(
      "[knowledge] overview --status 须为 verified | observed | conflicting | deprecated",
    );
  }
  return status;
}

function defaultKnowledgeFrontmatter(
  title: string,
  type: Frontmatter["type"],
  today: string,
): Frontmatter {
  return { title, type, tags: [], status: "observed", source: "", updated: today };
}

function appendWriteAudit(
  opts: OverviewWriteOptions,
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
      status: opts.status,
      confirmed: opts.confirmed,
      forced: opts.force,
    }),
  );
}
