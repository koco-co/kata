#!/usr/bin/env bun
/**
 * knowledge-curate.ts — 业务知识库 CRUD + lint/index。
 * Usage:
 *   kata knowledge <action> --project <name> [...]
 * Actions: read-core | read-module | read-pitfall | write | update | index | lint
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  type ContentModule,
  type ContentOverview,
  type ContentPitfall,
  type ContentTerm,
  confidenceGate,
  type Frontmatter,
  parseContentJson,
  parseFrontmatter,
  serializeFrontmatter,
  todayIso,
} from "@shared/lib/knowledge.ts";
import {
  appendAudit,
  buildAuditRecord,
  type Conflict,
  detectBodyRewrite,
  detectOverviewConflict,
  detectTermConflict,
  saveSnapshot,
} from "@shared/lib/knowledge-guard.ts";
import { knowledgePath } from "@shared/lib/paths.ts";
import {
  renderTermRow,
  upsertOverviewSection,
  upsertTermRow,
  writeIndexFile,
} from "./index-data.ts";

type WritePlan = {
  targetPath: string;
  beforeContent: string;
  afterContent: string;
  conflict: Conflict | null;
};

export function runWrite(opts: {
  project: string;
  type: string;
  content: string;
  confidence: string;
  confirmed: boolean;
  dryRun: boolean;
  overwrite: boolean;
  force: boolean;
}): void {
  const gate = confidenceGate(opts.confidence, opts.confirmed);
  if (!gate.allowed) {
    process.stderr.write(`[knowledge-curate] ${gate.reason}\n`);
    process.exit(1);
  }

  const plan = buildWritePlan(opts, todayIso());

  // ── 冲突守卫：block 级冲突必须 --force 才能越过 ──
  if (plan.conflict && plan.conflict.severity === "block" && !opts.force) {
    writeBlockedWrite(opts, plan);
    process.exit(2);
  }

  if (opts.dryRun) {
    writeDryRunWrite(opts, plan);
    return;
  }

  const snapshotName = plan.beforeContent
    ? saveSnapshot(opts.project, plan.targetPath, plan.beforeContent)
    : null;
  mkdirSync(dirname(plan.targetPath), { recursive: true });
  writeFileSync(plan.targetPath, plan.afterContent);
  writeIndexFile(opts.project);
  appendWriteAudit(opts, plan, snapshotName);
  writeCommittedWrite(opts, plan, snapshotName);
}

function buildWritePlan(opts: Parameters<typeof runWrite>[0], today: string): WritePlan {
  if (opts.type === "term") return buildTermWritePlan(opts, today);
  if (opts.type === "overview") return buildOverviewWritePlan(opts, today);
  if (opts.type === "module" || opts.type === "pitfall") return buildFileWritePlan(opts, today);
  process.stderr.write(`[knowledge-curate] Unknown type: ${opts.type}\n`);
  process.exit(1);
}

function buildTermWritePlan(opts: Parameters<typeof runWrite>[0], today: string): WritePlan {
  const parsed = parseContentJson<ContentTerm>("term", opts.content);
  const targetPath = knowledgePath(opts.project, "terms.md");
  const beforeContent = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : "";
  const file = parseFrontmatter(beforeContent);
  const newFm =
    file.frontmatter ?? defaultKnowledgeFrontmatter(`${opts.project} 术语表`, "term", today);
  const baseBody = file.frontmatter
    ? file.body
    : `\n# ${newFm.title}\n\n| 术语 | 中文 | 解释 | 别名 |\n|---|---|---|---|\n`;
  const nextFm = { ...newFm, updated: today };
  return {
    targetPath,
    beforeContent,
    conflict: detectTermConflict(baseBody, parsed),
    afterContent:
      serializeFrontmatter(nextFm) + upsertTermRow(baseBody, renderTermRow(parsed), parsed.term),
  };
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

function buildFileWritePlan(opts: Parameters<typeof runWrite>[0], today: string): WritePlan {
  const parsed = parseContentJson<ContentModule | ContentPitfall>(opts.type, opts.content);
  const subdir = opts.type === "module" ? "modules" : "pitfalls";
  const targetPath = knowledgePath(opts.project, subdir, `${parsed.name}.md`);
  const exists = existsSync(targetPath);
  if (exists && !opts.overwrite) {
    process.stderr.write(`[knowledge-curate] File exists: ${targetPath} (use --overwrite)\n`);
    process.exit(1);
  }
  const beforeContent = exists ? readFileSync(targetPath, "utf8") : "";
  const newFm: Frontmatter = {
    title: parsed.title,
    type: opts.type === "module" ? "module" : "pitfall",
    tags: parsed.tags,
    confidence: opts.confidence as Frontmatter["confidence"],
    source: parsed.source,
    updated: today,
  };
  const afterContent = `${serializeFrontmatter(newFm)}\n${parsed.body}${parsed.body.endsWith("\n") ? "" : "\n"}`;
  return {
    targetPath,
    beforeContent,
    afterContent,
    conflict: exists ? detectBodyRewrite(beforeContent, afterContent) : null,
  };
}

function defaultKnowledgeFrontmatter(
  title: string,
  type: Frontmatter["type"],
  today: string,
): Frontmatter {
  return { title, type, tags: [], confidence: "high", source: "", updated: today };
}

function writeBlockedWrite(opts: Parameters<typeof runWrite>[0], plan: WritePlan): void {
  writeJson({
    blocked: true,
    action: "write",
    type: opts.type,
    file: plan.targetPath,
    conflict: plan.conflict,
    hint: "冲突阻断。核对后可加 --force 强制写入，或先调 rollback 回到上一个版本。",
  });
}

function writeDryRunWrite(opts: Parameters<typeof runWrite>[0], plan: WritePlan): void {
  writeJson({
    dry_run: true,
    action: "write",
    type: opts.type,
    file: plan.targetPath,
    before: plan.beforeContent,
    after: plan.afterContent,
    conflict: plan.conflict,
  });
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

function writeCommittedWrite(
  opts: Parameters<typeof runWrite>[0],
  plan: WritePlan,
  snapshotName: string | null,
): void {
  writeJson({
    action: "write",
    type: opts.type,
    file: plan.targetPath,
    before: plan.beforeContent,
    after: plan.afterContent,
    snapshot: snapshotName,
    conflict: plan.conflict,
  });
}

function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
