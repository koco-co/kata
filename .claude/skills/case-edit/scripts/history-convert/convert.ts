#!/usr/bin/env bun
/**
 * history-convert.ts — Convert historical CSV/XMind files to Archive Markdown.
 *
 * Usage:
 *   kata history-convert --path <file-or-dir> --project <name> [--module <key>] [--detect] [--force] [--no-split]
 *   kata history-convert --help
 */

import { existsSync, writeFileSync } from "node:fs";
import { basename, dirname, extname } from "node:path";
import { currentYYYYMM, featureDir, featureFile } from "@shared/lib/paths.ts";
import { csvRowsToArchives, parseCsvFile, parseModulePath } from "./csv.ts";
import { buildUniqueFeatureArchivePath, computeOutputDir } from "./paths.ts";
import type { CsvRow, FileConvertResult } from "./types.ts";
import {
  allL1sToMarkdown,
  l1ToMarkdown,
  mergeParsedL1s,
  parseXmindToL1s,
  readXmindContentJson,
} from "./xmind.ts";

export async function convertFile(
  inputPath: string,
  force: boolean,
  project: string,
  prdVersion?: string,
  noSplit?: boolean,
  _levelFilter?: string,
  _dedup?: boolean,
): Promise<FileConvertResult[]> {
  const ext = extname(inputPath).toLowerCase();
  const outDir = computeOutputDir(project);

  try {
    const { mkdirSync: mkdir } = await import("node:fs");
    mkdir(outDir, { recursive: true });

    if (ext === ".csv") {
      return convertCsvInputFile(inputPath, force, project);
    }

    if (ext === ".xmind") {
      return convertXmindInputFile(inputPath, force, project, prdVersion, noSplit);
    }

    return [
      {
        input: inputPath,
        output: outDir,
        status: "failed",
        reason: `unsupported type: ${ext}`,
      },
    ];
  } catch (err) {
    return [
      {
        input: inputPath,
        output: outDir,
        status: "failed",
        reason: err instanceof Error ? err.message : String(err),
      },
    ];
  }
}

async function convertCsvInputFile(
  inputPath: string,
  force: boolean,
  project: string,
): Promise<FileConvertResult[]> {
  const rows = await parseCsvFile(inputPath);
  return convertCsvRowsToResults(inputPath, rows, force, project);
}

async function convertXmindInputFile(
  inputPath: string,
  force: boolean,
  project: string,
  prdVersion?: string,
  noSplit?: boolean,
): Promise<FileConvertResult[]> {
  const sheets = await readXmindContentJson(inputPath);
  const l1s = mergeParsedL1s(parseXmindToL1s(sheets));
  if (l1s.length === 0) {
    return [
      {
        input: inputPath,
        output: computeOutputDir(project),
        status: "failed",
        reason: "no L1 nodes found in XMind file",
      },
    ];
  }
  return noSplit
    ? convertMergedXmind(inputPath, force, project, prdVersion, l1s)
    : convertSplitXmind(inputPath, force, project, prdVersion, l1s);
}

async function convertMergedXmind(
  inputPath: string,
  force: boolean,
  project: string,
  prdVersion: string | undefined,
  l1s: ReturnType<typeof parseXmindToL1s>,
): Promise<FileConvertResult[]> {
  const rawName = basename(inputPath, extname(inputPath))
    .replace(/[\s_]+\(\d+\)_\d{8}_\d{6}$/, "")
    .trim();
  const suiteName = rawName || "未命名";
  const outputPath = buildUniqueFeatureArchivePath(project, currentYYYYMM(), suiteName, new Set());
  if (existsSync(outputPath) && !force) {
    return [
      skippedResult(
        inputPath,
        outputPath,
        `output exists (${outputPath}), use --force to overwrite`,
      ),
    ];
  }
  const { mkdirSync: mkdir } = await import("node:fs");
  mkdir(dirname(outputPath), { recursive: true });
  const totalCases = l1s.reduce((sum, l) => sum + l.totalCases, 0);
  writeFileSync(outputPath, allL1sToMarkdown(l1s, suiteName, prdVersion), "utf8");
  return [{ input: inputPath, output: outputPath, status: "converted", caseCount: totalCases }];
}

async function convertSplitXmind(
  inputPath: string,
  force: boolean,
  project: string,
  prdVersion: string | undefined,
  l1s: ReturnType<typeof parseXmindToL1s>,
): Promise<FileConvertResult[]> {
  const results: FileConvertResult[] = [];
  const usedPaths = new Set<string>();
  for (const l1 of l1s) {
    const outputPath = buildUniqueFeatureArchivePath(project, currentYYYYMM(), l1.title, usedPaths);
    if (existsSync(outputPath) && !force) {
      results.push(
        skippedResult(
          inputPath,
          outputPath,
          `output exists (L1: ${l1.title}), use --force to overwrite`,
        ),
      );
      continue;
    }
    const { mkdirSync: mkdir } = await import("node:fs");
    mkdir(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, l1ToMarkdown(l1, prdVersion), "utf8");
    results.push({
      input: inputPath,
      output: outputPath,
      status: "converted",
      caseCount: l1.totalCases,
    });
  }
  return results;
}

function skippedResult(input: string, output: string, reason: string): FileConvertResult {
  return { input, output, status: "skipped", reason };
}

function convertOneCsvArchive(
  inputPath: string,
  archive: ReturnType<typeof csvRowsToArchives>[number],
  force: boolean,
  project: string,
  mkdir: (path: string, opts: { recursive: boolean }) => void,
): FileConvertResult {
  const slug = archive.fileName.replace(/\.md$/, "");
  const featureId = `${archive.archiveYYYYMM}-${slug}`;
  const targetDir = featureDir(project, "_standing", featureId);
  mkdir(targetDir, { recursive: true });
  // 新三区布局：archive.md 落 cases/ 子目录，与 paths.ts 的 buildUniqueFeatureArchivePath 保持一致
  const outputPath = featureFile(project, "_standing", featureId, "cases", "archive.md");
  mkdir(featureFile(project, "_standing", featureId, "cases"), { recursive: true });
  if (existsSync(outputPath) && !force) {
    return {
      input: inputPath,
      output: outputPath,
      status: "skipped",
      reason: `output exists (${archive.fileName}), use --force to overwrite`,
    };
  }
  writeFileSync(outputPath, archive.content, "utf8");
  return {
    input: inputPath,
    output: outputPath,
    status: "converted",
    caseCount: archive.caseCount,
  };
}

export async function convertCsvRowsToResults(
  inputPath: string,
  rows: CsvRow[],
  force: boolean,
  project: string,
): Promise<FileConvertResult[]> {
  const outDir = computeOutputDir(project);
  const { mkdirSync: mkdir } = await import("node:fs");
  mkdir(outDir, { recursive: true });

  if (rows.length === 0) {
    return [
      { input: inputPath, output: outDir, status: "failed", reason: "no valid rows found in CSV" },
    ];
  }

  const archives = csvRowsToArchives(rows);
  return archives.map((archive) => convertOneCsvArchive(inputPath, archive, force, project, mkdir));
}

export function parseLevelFilter(raw?: string): string | undefined {
  if (!raw) return undefined;
  const normalized = raw.trim().toUpperCase();
  const levelMap: Record<string, string> = {
    "1": "P0",
    "2": "P1",
    "3": "P2",
    P0: "P0",
    P1: "P1",
    P2: "P2",
  };
  return levelMap[normalized];
}

export function rowMatchesContentFilter(row: CsvRow, contentFilter?: string): boolean {
  if (!contentFilter) return true;
  const keywords = contentFilter
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  if (keywords.length === 0) return true;

  return keywords.some((kw) => {
    const kwLower = kw.toLowerCase();
    if (row.module.toLowerCase().includes(kwLower)) return true;
    if (row.requirement.toLowerCase().includes(kwLower)) return true;
    if (row.title.toLowerCase().includes(kwLower)) return true;
    const reqId = row.requirement.match(/#(\d{4,})\)?\s*$/);
    if (reqId && reqId[1] === kw) return true;
    const modId = row.module.match(/#(\d{4,})\)?\s*$/);
    return Boolean(modId && modId[1] === kw);
  });
}

export function parseVersionParts(raw: string): number[] | undefined {
  const m = raw.trim().match(/^v?(\d+(?:\.\d+)*)$/i);
  if (!m) return undefined;
  const parts = m[1].split(".").map(Number);
  return parts.every((part) => Number.isInteger(part)) ? parts : undefined;
}

export function extractVersionPartsFromText(text: string): number[] | undefined {
  const m = text.match(/(?:^|[^\d])v?(\d+\.\d+(?:\.\d+)*)(?=$|[^\d])/i);
  return m ? parseVersionParts(m[1]) : undefined;
}

export function comparableVersionForRow(row: CsvRow): number[] | undefined {
  const moduleVersion = parseVersionParts(parseModulePath(row.module).version);
  if (moduleVersion) return moduleVersion;

  for (const source of [row.module, row.requirement, row.product, row.title]) {
    const version = extractVersionPartsFromText(source);
    if (version) return version;
  }
  return undefined;
}

export function compareVersionParts(a: number[], b: number[]): number {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

export function shouldReplaceDedupedRow(
  currentVersion: number[] | undefined,
  incomingVersion: number[] | undefined,
): boolean {
  if (currentVersion && incomingVersion) {
    return compareVersionParts(incomingVersion, currentVersion) >= 0;
  }
  if (incomingVersion && !currentVersion) return true;
  if (!incomingVersion && currentVersion) return false;
  return true;
}

export function extractArchiveBody(content: string): string {
  const bodyMatch = content.match(/^---[\s\S]*?---\n([\s\S]*)$/);
  return bodyMatch ? bodyMatch[1].trim() : "";
}

export function groupedRequirementHeading(archive: { title: string; caseId?: string }): string {
  return archive.caseId ? `${archive.title}(#${archive.caseId})` : archive.title;
}

export function normalizeGroupedArchiveBody(content: string): string {
  let fenceMarker: "`" | "~" | undefined;
  const lines = extractArchiveBody(content).split(/\r?\n/);
  const normalized: string[] = [];

  for (const line of lines) {
    const fenceMatch = line.match(/^ {0,3}([`~])\1{2,}/);
    if (fenceMatch) {
      const marker = fenceMatch[1] as "`" | "~";
      if (!fenceMarker) {
        fenceMarker = marker;
      } else if (fenceMarker === marker) {
        fenceMarker = undefined;
      }
      normalized.push(line);
      continue;
    }
    if (!fenceMarker && /^#{2,4}\s+/.test(line)) {
      continue;
    }
    normalized.push(line);
  }

  return normalized.join("\n").trim();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
