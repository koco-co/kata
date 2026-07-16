/**
 * Canonical SourceRef parser/resolver used by the public CLI.
 *
 * SourceRef syntax is defined once in source-ref/resolvers.ts:
 *   <kind>:<id>#sha256:<64 lowercase hex chars>
 */

import type { ConfirmedSourceRepo } from "./source-ref/resolve-target.ts";
import { resolveSourceRefTarget } from "./source-ref/resolve-target.ts";
import {
  type ParsedCanonicalSourceRef,
  parseCanonicalSourceRef,
  validateSourceRefFreshness,
} from "./source-ref/resolvers.ts";

export type ParsedSourceRef = ParsedCanonicalSourceRef;

export interface ResolveContext {
  workspaceDir?: string;
  projectName?: string;
  featureDir?: string;
  confirmedRepos?: ConfirmedSourceRepo[];
  sourceRepoRoot?: string;
  sourceRepoUrls?: string;
}

export interface ResolveResult {
  ok: boolean;
  reason?: string;
  path?: string;
}

export function parseSourceRef(raw: string): ParsedSourceRef | null {
  return parseCanonicalSourceRef(raw);
}

export function resolveSourceRef(raw: string, ctx: ResolveContext): ResolveResult {
  const parsed = parseSourceRef(raw);
  if (!parsed) {
    return { ok: false, reason: `SourceRef 格式非法: ${raw}` };
  }
  if (!ctx.workspaceDir || !ctx.projectName) {
    return { ok: false, reason: "解析 SourceRef 需要 workspaceDir 与 projectName" };
  }

  const target = resolveSourceRefTarget(raw, {
    workspaceRoot: ctx.workspaceDir,
    project: ctx.projectName,
    featureDir: ctx.featureDir,
    confirmedRepos: ctx.confirmedRepos,
    sourceRepoRoot: ctx.sourceRepoRoot,
    sourceRepoUrls: ctx.sourceRepoUrls,
  });
  if (!target.found) {
    return {
      ok: false,
      reason: `SourceRef 目标不存在: ${parsed.kind}:${parsed.id}`,
      path: target.path,
    };
  }
  if (target.content !== undefined) {
    const freshness = validateSourceRefFreshness(raw, target.content);
    if (!freshness.ok) {
      return {
        ok: false,
        reason: freshness.issues.map((issue) => issue.message).join("; "),
        path: target.path,
      };
    }
  }
  return { ok: true, path: target.path };
}
