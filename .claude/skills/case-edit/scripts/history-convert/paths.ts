#!/usr/bin/env bun
/**
 * history-convert.ts — Convert historical CSV/XMind files to Archive Markdown.
 *
 * Usage:
 *   kata history-convert --path <file-or-dir> --project <name> [--module <key>] [--detect] [--force] [--no-split]
 *   kata history-convert --help
 */

import { readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { featureFile, repoRoot } from "@shared/lib/paths.ts";
import { parseTitleAndCaseId } from "./csv.ts";

export function scanDirectory(dir: string, moduleFilter?: string): string[] {
  const resolved = resolve(dir);
  try {
    return readdirSync(resolved)
      .filter((f) => {
        const ext = extname(f).toLowerCase();
        if (ext !== ".csv" && ext !== ".xmind") return false;
        if (moduleFilter) {
          return f.toLowerCase().includes(moduleFilter.toLowerCase());
        }
        return true;
      })
      .map((f) => join(resolved, f))
      .filter((f) => statSync(f).isFile());
  } catch {
    return [];
  }
}

export function computeOutputDir(project: string): string {
  const root = repoRoot();
  return join(root, "workspace", project, "features");
}

/** Extract case_id from L1 title like "xxx(#10305)" → "10305", and the clean name without the ticket token */
export function parseL1Title(title: string): { name: string; caseId?: string } {
  return parseTitleAndCaseId(title);
}

// Deterministic djb2-style short hash; gives stable disambiguator for titles that
// reduce to the same ASCII fragment (or no ASCII at all).
export function shortTitleHash(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36).padStart(6, "0").slice(0, 8);
}

/**
 * Sanitize L1 title into a CLAUDE.md-compliant slug (lowercase ASCII, hyphen-separated,
 * leading letter). Non-ASCII titles fall back to `case-{hash}` so paths stay stable
 * but never leak Chinese / 【】 into the filesystem (see assertFeatureId in lib/paths.ts).
 */
export function sanitizeFilename(title: string): string {
  const { name } = parseL1Title(title);
  const ascii = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const hash = shortTitleHash(name);
  if (ascii && /^[a-z]/.test(ascii)) return `${ascii}-${hash}`;
  if (ascii) return `case-${ascii}-${hash}`;
  return `case-${hash}`;
}

export function buildUniqueFeatureArchivePath(
  project: string,
  yyyymm: string,
  title: string,
  usedPaths: Set<string>,
): string {
  const baseSlug = sanitizeFilename(title);
  const candidates = [baseSlug];
  let suffix = 2;
  while (candidates.length < 50) {
    candidates.push(`${baseSlug}-${suffix}`);
    suffix++;
  }

  for (const slug of candidates) {
    // 历史用例归 _standing；新布局 archive.md 落 cases/ 子目录
    const outputPath = featureFile(
      project,
      "_standing",
      `${yyyymm}-${slug}`,
      "cases",
      "archive.md",
    );
    if (!usedPaths.has(outputPath)) {
      usedPaths.add(outputPath);
      return outputPath;
    }
  }

  throw new Error(`failed to allocate unique feature archive path for title: ${title}`);
}

// ─── Conversion ───────────────────────────────────────────────────────────────
