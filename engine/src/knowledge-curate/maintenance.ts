#!/usr/bin/env bun
/**
 * knowledge-curate.ts — 业务知识库 CRUD + lint/index。
 * Usage:
 *   kata knowledge-curate <action> --project <name> [...]
 * Actions: read-core | read-module | read-pitfall | write | update | index | lint
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  type ContentModule,
  type ContentOverview,
  type ContentPitfall,
  type ContentTerm,
  lintChecks,
  parseContentJson,
  parseFrontmatter,
} from "../../lib/knowledge.ts";
import {
  appendAudit,
  buildAuditRecord,
  type Conflict,
  detectBodyRewrite,
  detectOverviewConflict,
  detectTermConflict,
  readAuditLog,
  readSnapshot,
  saveSnapshot,
} from "../../lib/knowledge-guard.ts";
import { knowledgeDir, knowledgePath } from "../../lib/paths.ts";
import { writeIndexFile } from "./index-data.ts";

export function runVerify(opts: { project: string; type: string; content: string }): void {
  let conflict: Conflict | null = null;
  let targetPath = "";

  if (opts.type === "term") {
    const parsed = parseContentJson<ContentTerm>("term", opts.content);
    targetPath = knowledgePath(opts.project, "terms.md");
    const existing = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : "";
    const file = parseFrontmatter(existing);
    conflict = detectTermConflict(file.body, parsed);
  } else if (opts.type === "overview") {
    const parsed = parseContentJson<ContentOverview>("overview", opts.content);
    targetPath = knowledgePath(opts.project, "overview.md");
    const existing = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : "";
    const file = parseFrontmatter(existing);
    conflict = detectOverviewConflict(file.body, parsed.section, parsed.body, parsed.mode);
  } else if (opts.type === "module" || opts.type === "pitfall") {
    const parsed = parseContentJson<ContentModule | ContentPitfall>(opts.type, opts.content);
    const subdir = opts.type === "module" ? "modules" : "pitfalls";
    targetPath = knowledgePath(opts.project, subdir, `${parsed.name}.md`);
    if (existsSync(targetPath)) {
      const existing = readFileSync(targetPath, "utf8");
      conflict = detectBodyRewrite(existing, parsed.body);
    }
  } else {
    process.stderr.write(`[knowledge-curate] Unknown type: ${opts.type}\n`);
    process.exit(1);
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        action: "verify",
        type: opts.type,
        file: targetPath,
        conflict,
        has_conflict: conflict !== null,
      },
      null,
      2,
    )}\n`,
  );
  process.exit(conflict && conflict.severity === "block" ? 2 : 0);
}

export function runHistory(opts: { project: string; limit?: number }): void {
  const records = readAuditLog(opts.project);
  const limit = opts.limit && opts.limit > 0 ? opts.limit : 20;
  const tail = records.slice(-limit).reverse();
  process.stdout.write(
    `${JSON.stringify(
      {
        project: opts.project,
        total: records.length,
        showing: tail.length,
        entries: tail.map((rec, idx) => ({
          index: records.length - 1 - idx,
          ...rec,
        })),
      },
      null,
      2,
    )}\n`,
  );
}

export function runRollback(opts: {
  project: string;
  index: number;
  confirmed: boolean;
  dryRun: boolean;
}): void {
  validateRollbackOptions(opts);
  const records = readAuditLog(opts.project);
  const targetIdx = opts.index >= 0 ? opts.index : records.length - 1;
  const record = records[targetIdx];
  validateRollbackRecord(record, targetIdx);

  const snapshotContent = readSnapshot(opts.project, record.snapshot);
  const currentContent = existsSync(record.file) ? readFileSync(record.file, "utf8") : "";

  if (opts.dryRun) {
    writeMaintenanceJson({
      dry_run: true,
      action: "rollback",
      index: targetIdx,
      file: record.file,
      current_hash: currentContent ? currentContent.slice(0, 0) : "",
      restore_from_snapshot: record.snapshot,
    });
    return;
  }

  const preRollbackSnapshot = saveSnapshot(opts.project, record.file, currentContent);
  writeFileSync(record.file, snapshotContent);
  writeIndexFile(opts.project);
  appendAudit(
    opts.project,
    buildAuditRecord({
      action: "rollback",
      type: record.type,
      file: record.file,
      before: currentContent,
      after: snapshotContent,
      snapshot: preRollbackSnapshot,
      confirmed: true,
      forced: false,
    }),
  );
  writeMaintenanceJson({
    action: "rollback",
    rolled_back_to: record.snapshot,
    file: record.file,
    current_content_saved_as: preRollbackSnapshot,
  });
}

function validateRollbackOptions(opts: Parameters<typeof runRollback>[0]): void {
  if (!opts.confirmed && !opts.dryRun) {
    process.stderr.write(`[knowledge-curate] rollback requires --confirmed (or --dry-run)\n`);
    process.exit(1);
  }
  if (readAuditLog(opts.project).length === 0) {
    process.stderr.write(`[knowledge-curate] No audit entries for rollback\n`);
    process.exit(1);
  }
}

function validateRollbackRecord(
  record: ReturnType<typeof readAuditLog>[number] | undefined,
  targetIdx: number,
): asserts record is ReturnType<typeof readAuditLog>[number] {
  if (!record) {
    process.stderr.write(`[knowledge-curate] Index out of range: ${targetIdx}\n`);
    process.exit(1);
  }
  if (!record.snapshot) {
    process.stderr.write(
      `[knowledge-curate] Entry ${targetIdx} has no snapshot (file was newly created) — delete manually if needed\n`,
    );
    process.exit(1);
  }
}

function writeMaintenanceJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function runLint(opts: { project: string; strict?: boolean }): void {
  const kdir = knowledgeDir(opts.project);
  const result = lintChecks(opts.project, kdir);
  const output = { project: opts.project, ...result };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

  if (result.errors.length > 0) {
    process.exit(1);
  }
  if (result.warnings.length > 0) {
    process.exit(opts.strict ? 1 : 2);
  }
  process.exit(0);
}

export const ENTRY_TYPES = ["term", "overview", "module", "pitfall"] as const;
export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
