import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "@playwright/test";

const FEATURE_DIR = "workspace/dataAssets/features/2099-01-lt-dq-main-flow";
const ARCHIVE_PATH = join(FEATURE_DIR, "岚图主流程用例整理.md");
const CASES_DIR = join(FEATURE_DIR, "tests/cases");

type ArchiveCase = {
  id: string;
  line: number;
  module: string;
  subsection: string;
  priority: string;
  title: string;
};

type RegisterArchivePendingOptions = {
  title: string;
  module?: string;
};

export function registerArchivePending(options: RegisterArchivePendingOptions): void {
  const archiveCases = parseArchiveCases();
  const targetCases = options.module
    ? archiveCases.filter((item) => item.module === options.module)
    : archiveCases;
  const referencedLines = collectReferencedArchiveLines(new Set(archiveCases.map((item) => item.line)));
  const pendingCases = targetCases.filter((item) => !referencedLines.has(item.line));

  test.describe(options.title, () => {
    for (const item of pendingCases) {
      test.skip(
        `${item.id} ${item.priority} ${item.module}/${item.subsection}: ${item.title}`,
        async () => {},
      );
    }
  });
}

function parseArchiveCases(): ArchiveCase[] {
  const lines = readFileSync(ARCHIVE_PATH, "utf8").split(/\r?\n/);
  const result: ArchiveCase[] = [];
  let module = "未分组";
  let subsection = "未分组";

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const moduleMatch = line.match(/^###\s+(.+)$/);
    if (moduleMatch) {
      module = normalizeText(moduleMatch[1]);
      subsection = "未分组";
      continue;
    }

    const subsectionMatch = line.match(/^####\s+([^#].+)$/);
    if (subsectionMatch) {
      subsection = normalizeText(subsectionMatch[1]);
      continue;
    }

    const caseMatch = line.match(/^#####\s+【(P\d)】(.+)$/);
    if (!caseMatch) continue;

    const lineNumber = index + 1;
    result.push({
      id: `ARCHIVE-L${lineNumber}`,
      line: lineNumber,
      module,
      subsection,
      priority: caseMatch[1],
      title: normalizeText(caseMatch[2]),
    });
  }

  return result;
}

function collectReferencedArchiveLines(caseLines: Set<number>): Set<number> {
  const lineRefs = new Set<number>();
  for (const filename of readdirSync(CASES_DIR)) {
    if (!filename.endsWith(".ts")) continue;
    const content = readFileSync(join(CASES_DIR, filename), "utf8");
    for (const match of content.matchAll(/#L(\d+)(?:-L?(\d+))?/g)) {
      const start = Number.parseInt(match[1], 10);
      const end = match[2] ? Number.parseInt(match[2], 10) : undefined;

      if (caseLines.has(start)) {
        lineRefs.add(start);
      }
      if (end && caseLines.has(end)) {
        lineRefs.add(end);
      }
    }
  }
  return lineRefs;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
