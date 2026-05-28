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
  excludeModules?: string[];
  matchTitles?: boolean;
};

export function registerArchivePending(options: RegisterArchivePendingOptions): void {
  const archiveCases = parseArchiveCases();
  const excludedModules = new Set(options.excludeModules ?? []);
  const targetCases = options.module
    ? archiveCases.filter((item) => item.module === options.module)
    : archiveCases.filter((item) => !excludedModules.has(item.module));
  const references = collectArchiveReferences(new Set(archiveCases.map((item) => item.line)));
  const pendingCases = targetCases.filter((item) =>
    !isArchiveCaseReferenced(item, references, options.matchTitles === true),
  );

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

type ArchiveReferences = {
  lineRefs: Set<number>;
  titleRefs: Set<string>;
  looseTitleRefs: Set<string>;
};

function collectArchiveReferences(caseLines: Set<number>): ArchiveReferences {
  const lineRefs = new Set<number>();
  const titleRefs = new Set<string>();
  const looseTitleRefs = new Set<string>();
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

    for (const match of content.matchAll(/archive-title:\s*(.+)$/gm)) {
      addTitleReference(match[1], titleRefs, looseTitleRefs);
    }
    for (const match of content.matchAll(/test\(\s*["'`]([^"'`]+)["'`]/g)) {
      addTitleReference(match[1], titleRefs, looseTitleRefs);
    }
    for (const match of content.matchAll(/\btitle:\s*["'`]([^"'`]+)["'`]/g)) {
      addTitleReference(match[1], titleRefs, looseTitleRefs);
    }
  }
  return { lineRefs, titleRefs, looseTitleRefs };
}

function addTitleReference(
  title: string | undefined,
  titleRefs: Set<string>,
  looseTitleRefs: Set<string>,
): void {
  const normalized = normalizeCoverageTitle(title ?? "");
  if (normalized.length >= 6) titleRefs.add(normalized);

  const loose = normalizeLooseCoverageTitle(title ?? "");
  if (loose.length >= 6) looseTitleRefs.add(loose);
}

function isArchiveCaseReferenced(
  item: ArchiveCase,
  references: ArchiveReferences,
  matchTitles: boolean,
): boolean {
  if (references.lineRefs.has(item.line)) return true;
  if (!matchTitles) return false;

  const title = normalizeCoverageTitle(item.title);
  if (isTitleCovered(title, references.titleRefs)) return true;

  const looseTitle = normalizeLooseCoverageTitle(item.title);
  return isTitleCovered(looseTitle, references.looseTitleRefs);
}

function isTitleCovered(title: string, references: Set<string>): boolean {
  if (title.length < 6) return false;
  for (const reference of references) {
    if (reference.length < 6) continue;
    if (title.includes(reference) || reference.includes(title)) return true;
  }
  return false;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeCoverageTitle(value: string): string {
  return normalizeText(value)
    .replace(/^\s*【P\d(?:\/P\d)*】/, "")
    .replace(/【([^】]+)】/g, "$1")
    .replace(/^验证/, "")
    .replace(/^数据质量/, "")
    .replace(/质量规则任务校验正常/g, "质量规则任务校验")
    .replace(/功能正常|展示正常|展示正确|正确|正常|可核验/g, "")
    .replace(/[\s`"'“”‘’（）()[\]【】,，、:：;；+&<>=!\-_/\\|.。]/g, "")
    .trim();
}

function normalizeLooseCoverageTitle(value: string): string {
  return normalizeCoverageTitle(value).replace(/项目信息|脏数据管理|菜单名称|报告详情/g, "");
}
