#!/usr/bin/env bun
/**
 * history-convert.ts — Convert historical CSV/XMind files to Archive Markdown.
 *
 * Usage:
 *   kata history-convert --path <file-or-dir> --project <name> [--module <key>] [--detect] [--force] [--no-split]
 *   kata history-convert --help
 */

import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { createCli } from "@shared/lib/cli-runner.ts";
import { buildMarkdown, todayString } from "@shared/lib/frontmatter.ts";
import { repoRoot, validateFilePath } from "@shared/lib/paths.ts";
import {
  comparableVersionForRow,
  convertCsvRowsToResults,
  convertFile,
  extractArchiveBody,
  groupedRequirementHeading,
  normalizeGroupedArchiveBody,
  parseLevelFilter,
  rowMatchesContentFilter,
  shouldReplaceDedupedRow,
} from "./convert.ts";
import { csvRowsToArchives, extractDevVersions, normalizePriority, parseCsvFile } from "./csv.ts";
import { computeOutputDir, scanDirectory } from "./paths.ts";
import type { ConvertOutput, CsvRow, DetectEntry, FileConvertResult } from "./types.ts";

type RunConvertOptions = {
  path: string;
  project: string;
  module?: string;
  version?: string;
  detect?: boolean;
  force?: boolean;
  split?: boolean;
  level?: string;
  output?: string;
  dedup?: boolean;
  filter?: string;
  includePaths?: string;
  groupByVersion?: boolean;
  title?: string;
};

type ConvertConfig = {
  inputPath: string;
  project: string;
  force: boolean;
  noSplit: boolean;
  prdVersion?: string;
  levelFilter?: string;
  singleOutput?: string;
  dedup: boolean;
  contentFilter?: string;
  includePathSet?: Set<string>;
  groupByVersion: boolean;
  customTitle?: string;
};

type CsvBatch = { file: string; rows: CsvRow[] };

export async function runConvert(opts: RunConvertOptions): Promise<void> {
  const config = readConvertConfig(opts);
  const files = resolveConvertFiles(config.inputPath, opts.module, opts.project);
  if (opts.detect === true) {
    writeDetectEntries(files, opts.project);
    return;
  }

  const collected = await collectConvertInputs(files, config);
  const csvResults = await convertCollectedCsvRows(collected.allCsvRows, config);
  writeConvertOutput([...collected.xmindResults, ...collected.csvParseResults, ...csvResults]);
}

function readConvertConfig(opts: RunConvertOptions): ConvertConfig {
  const inputPath = validateFilePath(opts.path, [repoRoot()]);
  const force = opts.force === true;
  const noSplit = opts.split === false;
  const levelFilter = parseLevelFilter(opts.level);
  if (opts.level && !levelFilter) {
    process.stderr.write("Error: invalid --level value. Use 1=P0, 2=P1, or 3=P2.\n");
    process.exit(1);
  }
  const singleOutput = opts.output;
  const dedup = opts.dedup === true;
  const contentFilter = opts.filter;
  const includePathsFile = opts.includePaths;
  const groupByVersion = opts.groupByVersion === true;
  const customTitle = opts.title;
  if (contentFilter && includePathsFile) {
    process.stderr.write("Error: --include-paths is mutually exclusive with --filter.\n");
    process.exit(1);
  }
  const includePathSet = includePathsFile
    ? new Set(
        readFileSync(validateFilePath(includePathsFile, [repoRoot()]), "utf8")
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean),
      )
    : undefined;
  return {
    inputPath,
    project: opts.project,
    force,
    noSplit,
    prdVersion: opts.version,
    levelFilter,
    singleOutput,
    dedup,
    contentFilter,
    includePathSet,
    groupByVersion,
    customTitle,
  };
}

function resolveConvertFiles(
  inputPath: string,
  module: string | undefined,
  _project: string,
): string[] {
  if (!existsSync(inputPath)) {
    process.stderr.write(`Error: path not found: "${inputPath}"\n`);
    process.exit(1);
  }
  const stat = statSync(inputPath);
  return stat.isDirectory() ? scanDirectory(inputPath, module) : [inputPath];
}

function writeDetectEntries(files: string[], project: string): void {
  const entries: DetectEntry[] = files.map((f) => ({
    path: f,
    type: extname(f).toLowerCase() === ".csv" ? "csv" : "xmind",
    outputDir: computeOutputDir(project),
  }));
  process.stdout.write(`${JSON.stringify(entries, null, 2)}\n`);
}

async function collectConvertInputs(
  files: string[],
  config: ConvertConfig,
): Promise<{
  allCsvRows: CsvBatch[];
  csvParseResults: FileConvertResult[];
  xmindResults: FileConvertResult[];
}> {
  const allCsvRows: CsvBatch[] = [];
  const csvParseResults: FileConvertResult[] = [];
  const xmindResults: FileConvertResult[] = [];

  for (const f of files) {
    const ext = extname(f).toLowerCase();
    if (ext === ".csv") {
      await collectCsvInput(f, config.project, allCsvRows, csvParseResults);
    } else {
      const fileResults = await convertFile(
        f,
        config.force,
        config.project,
        config.prdVersion,
        config.noSplit,
        config.levelFilter,
        config.dedup,
      );
      xmindResults.push(...fileResults);
    }
  }
  return { allCsvRows, csvParseResults, xmindResults };
}

async function collectCsvInput(
  file: string,
  project: string,
  allCsvRows: CsvBatch[],
  csvParseResults: FileConvertResult[],
): Promise<void> {
  try {
    const rows = await parseCsvFile(file);
    if (rows.length > 0) allCsvRows.push({ file, rows });
    else csvParseResults.push(failedCsvResult(file, project, "no valid rows found in CSV"));
  } catch (err) {
    csvParseResults.push(
      failedCsvResult(file, project, err instanceof Error ? err.message : String(err)),
    );
  }
}

function failedCsvResult(file: string, project: string, reason: string): FileConvertResult {
  return { input: file, output: computeOutputDir(project), status: "failed", reason };
}

async function convertCollectedCsvRows(
  allCsvRows: CsvBatch[],
  config: ConvertConfig,
): Promise<FileConvertResult[]> {
  if (allCsvRows.length === 0) return [];
  const allRows = applyCsvBatchFilters(allCsvRows, config);
  return config.singleOutput
    ? writeSingleCsvOutput(allCsvRows, allRows, config)
    : writePerFileCsvOutputs(allCsvRows, allRows, config);
}

function applyCsvBatchFilters(allCsvRows: CsvBatch[], config: ConvertConfig) {
  let allRows = allCsvRows.flatMap((b) => b.rows.map((row) => ({ file: b.file, row })));
  if (config.levelFilter !== undefined) {
    allRows = allRows.filter(({ row }) => normalizePriority(row.priority) === config.levelFilter);
  }
  if (config.contentFilter) {
    allRows = allRows.filter(({ row }) => rowMatchesContentFilter(row, config.contentFilter ?? ""));
  }
  if (config.includePathSet) {
    allRows = allRows.filter(({ row }) => config.includePathSet?.has(row.module.trim()));
  }
  return config.dedup ? dedupeCsvRows(allRows) : allRows;
}

function dedupeCsvRows(allRows: Array<{ file: string; row: CsvRow }>) {
  const seen = new Map<string, { file: string; row: CsvRow; version?: number[] }>();
  for (const entry of allRows) {
    const incoming = { ...entry, version: comparableVersionForRow(entry.row) };
    const current = seen.get(entry.row.title);
    if (!current || shouldReplaceDedupedRow(current.version, incoming.version)) {
      seen.set(entry.row.title, incoming);
    }
  }
  return [...seen.values()].map(({ file, row }) => ({ file, row }));
}

async function writeSingleCsvOutput(
  allCsvRows: CsvBatch[],
  allRows: Array<{ file: string; row: CsvRow }>,
  config: ConvertConfig,
): Promise<FileConvertResult[]> {
  const outPath = resolve(config.singleOutput ?? "");
  const input = allCsvRows.map((b) => b.file).join(", ");
  if (allRows.length === 0)
    return [{ input, output: outPath, status: "failed", reason: "no CSV rows matched filters" }];
  if (existsSync(outPath) && !config.force) {
    return [
      {
        input,
        output: outPath,
        status: "skipped",
        reason: `output exists (${outPath}), use --force to overwrite`,
      },
    ];
  }
  const archives = csvRowsToArchives(allRows.map(({ row }) => row));
  const totalCases = archives.reduce((s, a) => s + a.caseCount, 0);
  const suiteName =
    config.customTitle || basename(config.singleOutput ?? "", extname(config.singleOutput ?? ""));
  const content = buildMarkdown(
    singleCsvFrontmatter(config, suiteName, archives, totalCases),
    singleCsvBody(archives, suiteName, config.groupByVersion).join("\n\n"),
  );
  const { mkdirSync: mkdir } = await import("node:fs");
  mkdir(dirname(outPath), { recursive: true });
  writeFileSync(outPath, content, "utf8");
  return [{ input, output: outPath, status: "converted", caseCount: totalCases }];
}

function singleCsvFrontmatter(
  config: ConvertConfig,
  suiteName: string,
  archives: ReturnType<typeof csvRowsToArchives>,
  totalCases: number,
): Record<string, string | number | boolean | string[]> {
  return {
    suite_name: suiteName,
    description: `${suiteName}用例归档`,
    tags: [`${config.project}`, ...(config.prdVersion ? [config.prdVersion] : [])],
    prd_version: config.prdVersion ?? "",
    dev_version: extractDevVersions(archives.map((a) => a.fileName)),
    create_at: todayString(),
    status: "草稿",
    origin: "csv",
    case_count: totalCases,
  };
}

function singleCsvBody(
  archives: ReturnType<typeof csvRowsToArchives>,
  suiteName: string,
  groupByVersion: boolean,
): string[] {
  if (!groupByVersion) {
    return archives.flatMap((archive) => {
      const archiveBody = extractArchiveBody(archive.content);
      return archiveBody ? [archiveBody] : [];
    });
  }
  return groupedSingleCsvBody(archives, suiteName);
}

function groupedSingleCsvBody(
  archives: ReturnType<typeof csvRowsToArchives>,
  suiteName: string,
): string[] {
  const bodyParts = [`# ${suiteName}`];
  archives.sort(compareArchiveVersion);
  let prevVersion = "";
  for (const archive of archives) {
    if (archive.version && archive.version !== prevVersion) {
      bodyParts.push(`## v${archive.version}`);
      prevVersion = archive.version;
    }
    bodyParts.push(`### ${groupedRequirementHeading(archive)}`);
    const archiveBody = normalizeGroupedArchiveBody(archive.content);
    if (archiveBody) bodyParts.push(archiveBody);
  }
  return bodyParts;
}

function compareArchiveVersion(
  a: ReturnType<typeof csvRowsToArchives>[number],
  b: ReturnType<typeof csvRowsToArchives>[number],
): number {
  const va = a.version.match(/^(\d+(?:\.\d+)*)/);
  const vb = b.version.match(/^(\d+(?:\.\d+)*)/);
  const na = va ? va[1].split(".").map(Number) : [0];
  const nb = vb ? vb[1].split(".").map(Number) : [0];
  for (let i = 0; i < Math.max(na.length, nb.length); i++) {
    const da = na[i] ?? 0;
    const db = nb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return a.fileName.localeCompare(b.fileName);
}

async function writePerFileCsvOutputs(
  allCsvRows: CsvBatch[],
  allRows: Array<{ file: string; row: CsvRow }>,
  config: ConvertConfig,
): Promise<FileConvertResult[]> {
  const csvResults: FileConvertResult[] = [];
  for (const batch of allCsvRows) {
    const batchRows = allRows
      .filter((entry) => entry.file === batch.file)
      .map((entry) => entry.row);
    if (batchRows.length === 0) {
      csvResults.push({
        input: batch.file,
        output: computeOutputDir(config.project),
        status: "skipped",
        reason: "no rows matched filters",
      });
      continue;
    }
    csvResults.push(
      ...(await convertCsvRowsToResults(batch.file, batchRows, config.force, config.project)),
    );
  }
  return csvResults;
}

function writeConvertOutput(results: FileConvertResult[]): void {
  const out: ConvertOutput = {
    converted: results.filter((r) => r.status === "converted").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: results.filter((r) => r.status === "failed").length,
    files: results,
  };

  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

export const program = createCli({
  name: "history-convert",
  description: "将历史 CSV/XMind 文件转换为 Archive Markdown",
  rootAction: {
    options: [
      {
        flag: "--path <file-or-dir>",
        description: "File or directory to convert",
        required: true,
      },
      {
        flag: "--project <name>",
        description: "Project name (e.g. dataAssets)",
        required: true,
      },
      {
        flag: "--module <key>",
        description: "Filter files by module name keyword",
      },
      { flag: "--version <ver>", description: "PRD version (e.g. v6.4.8)" },
      {
        flag: "--detect",
        description: "Scan only, report what would be converted (no write)",
      },
      { flag: "--force", description: "Overwrite existing archive files" },
      {
        flag: "--no-split",
        description: "Merge all L1 nodes into a single archive file instead of splitting by L1",
      },
      {
        flag: "--level <n>",
        description: "Only include cases at this priority level (1=P0, 2=P1, 3=P2)",
      },
      {
        flag: "--output <file>",
        description: "Write all converted CSV output to a single file instead of feature dirs",
      },
      {
        flag: "--dedup",
        description: "Remove duplicate cases by title across files, keeping latest version",
      },
      {
        flag: "--filter <keyword>",
        description:
          "Only include CSV rows where module or requirement contains the keyword (e.g. 岚图)",
      },
      {
        flag: "--include-paths <file>",
        description:
          "Path to a file containing line-separated 所属模块 paths to include; mutually exclusive with --filter",
      },
      {
        flag: "--group-by-version",
        description: "In --output mode, group cases under ## version section headings",
      },
      {
        flag: "--title <name>",
        description: "Custom suite title for frontmatter (overrides auto-detected name)",
      },
    ],
    action: runConvert,
  },
});
