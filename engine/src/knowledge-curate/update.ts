#!/usr/bin/env bun
/**
 * knowledge-curate.ts — 业务知识库 CRUD + lint/index。
 * Usage:
 *   kata knowledge-curate <action> --project <name> [...]
 * Actions: read-core | read-module | read-pitfall | write | update | index | lint
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  type Frontmatter,
  parseFrontmatter,
  serializeFrontmatter,
  todayIso,
} from "@shared/lib/knowledge.ts";
import {
  appendAudit,
  buildAuditRecord,
  type Conflict,
  detectBodyRewrite,
  saveSnapshot,
} from "@shared/lib/knowledge-guard.ts";
import { knowledgePath } from "@shared/lib/paths.ts";
import { upsertOverviewSection, upsertTermRow, writeIndexFile } from "./index-data.ts";

export interface UpdateContentShape {
  frontmatter_patch?: Partial<Frontmatter>;
  body_patch?: { section?: string; row_id?: string; new_body?: string };
  mode: "patch" | "replace";
}

export function runUpdate(opts: {
  project: string;
  path: string;
  content: string;
  confirmed: boolean;
  dryRun: boolean;
  force: boolean;
}): void {
  validateUpdateOptions(opts);
  const update = buildUpdatePayload(opts);
  guardBlockingConflict(update, opts.force);

  if (opts.dryRun) {
    writeUpdateDryRun(update);
    return;
  }

  persistUpdate(opts, update);
}

interface UpdatePayload {
  full: string;
  newFm: Frontmatter;
  beforeContent: string;
  afterContent: string;
  conflict: Conflict | null;
}

function buildUpdatePayload(opts: Parameters<typeof runUpdate>[0]): UpdatePayload {
  const full = knowledgePath(opts.project, opts.path);
  const patch = parseUpdateContent(opts.content);
  const beforeContent = readFileSync(full, "utf8");
  const parsed = parseFrontmatter(beforeContent);
  const frontmatter = requireUpdateFrontmatter(parsed.frontmatter, opts.path);

  const newFm: Frontmatter = {
    ...frontmatter,
    ...(patch.frontmatter_patch ?? {}),
    updated: todayIso(),
  };
  const newBody = applyBodyPatch(parsed.body, newFm.type, patch);
  const afterContent = `${serializeFrontmatter(newFm)}\n${newBody}${newBody.endsWith("\n") ? "" : "\n"}`;
  const conflict = detectBodyRewrite(beforeContent, afterContent);

  return { full, newFm, beforeContent, afterContent, conflict };
}

function requireUpdateFrontmatter(frontmatter: Frontmatter | null, path: string): Frontmatter {
  if (frontmatter) return frontmatter;
  process.stderr.write(`[knowledge-curate] File has no valid frontmatter: ${path}\n`);
  process.exit(1);
}

function guardBlockingConflict(update: UpdatePayload, force: boolean): void {
  if (update.conflict && update.conflict.severity === "block" && !force) {
    writeUpdateJson({
      blocked: true,
      action: "update",
      file: update.full,
      conflict: update.conflict,
      hint: "冲突阻断。核对后可加 --force 强制更新。",
    });
    process.exit(2);
  }
}

function writeUpdateDryRun(update: UpdatePayload): void {
  writeUpdateJson({
    dry_run: true,
    action: "update",
    file: update.full,
    before: update.beforeContent,
    after: update.afterContent,
    conflict: update.conflict,
  });
}

function persistUpdate(opts: Parameters<typeof runUpdate>[0], update: UpdatePayload): void {
  const snapshotName = saveSnapshot(opts.project, update.full, update.beforeContent);
  writeFileSync(update.full, update.afterContent);
  writeIndexFile(opts.project);
  appendUpdateAudit(
    opts,
    update.newFm,
    update.full,
    update.beforeContent,
    update.afterContent,
    snapshotName,
  );
  writeUpdateJson({
    action: "update",
    file: update.full,
    before: update.beforeContent,
    after: update.afterContent,
    snapshot: snapshotName,
    conflict: update.conflict,
  });
}

function validateUpdateOptions(opts: Parameters<typeof runUpdate>[0]): void {
  if (opts.path.startsWith("/") || opts.path.includes("..")) {
    process.stderr.write(`[knowledge-curate] Invalid path: ${opts.path}\n`);
    process.exit(1);
  }
  if (!opts.confirmed) {
    process.stderr.write(`[knowledge-curate] update requires --confirmed\n`);
    process.exit(1);
  }
  if (!existsSync(knowledgePath(opts.project, opts.path))) {
    process.stderr.write(`[knowledge-curate] File not found: ${opts.path}\n`);
    process.exit(1);
  }
}

function parseUpdateContent(content: string): UpdateContentShape {
  try {
    const patch = JSON.parse(content) as UpdateContentShape;
    if (patch.mode === "patch" || patch.mode === "replace") return patch;
    process.stderr.write(
      `[knowledge-curate] Invalid mode "${patch.mode}"; must be patch|replace\n`,
    );
  } catch (err) {
    process.stderr.write(`[knowledge-curate] Invalid JSON for update: ${err}\n`);
  }
  process.exit(1);
}

function applyBodyPatch(
  body: string,
  fmType: Frontmatter["type"],
  patch: UpdateContentShape,
): string {
  const bp = patch.body_patch;
  if (!bp) return body;
  if ((fmType === "module" || fmType === "pitfall") && typeof bp.new_body === "string") {
    return bp.section
      ? upsertOverviewSection(body, bp.section, bp.new_body, "replace")
      : bp.new_body;
  }
  if (fmType === "overview" && bp.section && typeof bp.new_body === "string") {
    return upsertOverviewSection(body, bp.section, bp.new_body, "replace");
  }
  if (fmType === "term" && bp.row_id && typeof bp.new_body === "string") {
    return upsertTermRow(body, bp.new_body, bp.row_id);
  }
  return body;
}

function appendUpdateAudit(
  opts: Parameters<typeof runUpdate>[0],
  newFm: Frontmatter,
  full: string,
  beforeContent: string,
  afterContent: string,
  snapshotName: string,
): void {
  appendAudit(
    opts.project,
    buildAuditRecord({
      action: "update",
      type: newFm.type,
      file: full,
      before: beforeContent,
      after: afterContent,
      snapshot: snapshotName,
      confirmed: opts.confirmed,
      forced: opts.force,
    }),
  );
}

function writeUpdateJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
