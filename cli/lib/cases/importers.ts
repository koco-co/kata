import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { parse as parseYaml } from "yaml";
import { buildFeatureDirName } from "../features-layout.ts";
import { parseFrontMatter } from "../frontmatter.ts";
import { splitMdTableRow } from "../md-table.ts";
import { UNCLASSIFIED } from "../xmind-render.ts";
import { loadXmindProjectConfig } from "../xmind-rules.ts";
import { normalizeStructuredText } from "./normalize.ts";
import { type CaseItem, type CaseMeta, type CasesFile, PRIORITIES } from "./types.ts";

export interface ImportOptions {
  featureDir: string;
  sourcePath: string;
  name: string;
  requirementId?: string;
  caseModuleId?: string;
  importName: string;
}

export interface ImportPreview {
  file: CasesFile;
  format: "csv" | "xlsx" | "md" | "xmind";
  profile: string;
  warnings: string[];
  sourceRows: number;
}

interface RawTable {
  headers: string[];
  rows: string[][];
}

interface RawXmindTopic {
  title?: string;
  markers?: Array<{ markerId?: string }>;
  labels?: Array<string | { label?: string; title?: string }>;
  notes?: { plain?: { content?: string } };
  children?: { attached?: RawXmindTopic[] };
}

function featureMeta(options: ImportOptions, requirementId?: string): CaseMeta {
  return {
    title: options.name,
    ...(requirementId ? { requirement_id: requirementId } : {}),
    case_module_id: options.caseModuleId?.trim() ?? "",
    imports: [options.importName],
    exports: ["xmind"],
  };
}

function normalizeTitle(raw: string): { title: string; prefixTags: string[] } {
  const value = raw.trim();
  const marker = value.indexOf("验证");
  if (marker < 0) return { title: `验证${value}`, prefixTags: [] };
  const prefix = value.slice(0, marker).trim();
  const title = value.slice(marker).trim();
  return {
    title,
    prefixTags: prefix ? prefix.split(/\s+/).filter(Boolean) : [],
  };
}

function combineTags(base: string[], prefixTags: string[]): string[] | undefined {
  const tags: string[] = [];
  for (const tag of [...base, ...prefixTags]) {
    if (!tag || tag === UNCLASSIFIED || tags.at(-1) === tag) continue;
    tags.push(tag);
  }
  return tags.length > 0 ? tags : undefined;
}

function priorityFromValue(
  value: string | undefined,
  warnings: string[],
  location: string,
): CaseItem["priority"] {
  const normalized = value?.trim();
  if (!normalized) {
    warnings.push(`${location}: 缺少优先级，默认 P1`);
    return "P1";
  }
  if (PRIORITIES.includes(normalized as CaseItem["priority"]))
    return normalized as CaseItem["priority"];
  if (normalized === "1") return "P0";
  if (normalized === "2") return "P1";
  if (normalized === "3") return "P2";
  throw new Error(`${location}: 无法识别优先级 ${normalized}`);
}

function numberedLines(value: string): string[] {
  const lines = normalizeStructuredText(value).split("\n");
  const meaningful = lines.map((line) => line.trim()).filter(Boolean);
  if (meaningful.length === 0) return [];

  // ZenTao exports may wrap one top-level step across several lines while
  // keeping the next top-level step's `1.`/`2.` marker on its own line. Only
  // dot/colon markers are top-level here; full-width `1）` markers are nested
  // assertions and must stay inside the current step's text.
  const topLevel = meaningful.map((line, index) => {
    const match = line.match(/^(\d+)[.．:：]\s*(.*)$/);
    return match ? { index, number: Number(match[1]), text: match[2] } : undefined;
  });
  const starts = topLevel.flatMap((item) => (item ? [item] : []));
  const isSequential =
    starts.length > 0 &&
    starts[0]?.number === 1 &&
    starts.every((item, index) => item.number === index + 1);
  if (isSequential) {
    return starts.map((start, index) => {
      const end = starts[index + 1]?.index ?? meaningful.length;
      return [start.text, ...meaningful.slice(start.index + 1, end)].join("\n").trim();
    });
  }

  // Keep the legacy single-line numbered form for callers that use closing
  // parentheses as the only marker style.
  const numbered = meaningful.map((line) => line.match(/^(\d+)[.)）、:]\s*(.*)$/));
  if (numbered.every(Boolean)) {
    return numbered.map((match) => match?.[2] ?? "");
  }
  return meaningful;
}

function pairSteps(actions: string, expecteds: string, warnings: string[], location: string) {
  const left = numberedLines(actions);
  const right = numberedLines(expecteds);
  if (left.length !== right.length) {
    warnings.push(`${location}: 步骤 ${left.length} 条、预期 ${right.length} 条，按较长一侧保留`);
  }
  const size = Math.max(left.length, right.length);
  return Array.from({ length: size }, (_, index) => ({
    action: left[index] ?? "",
    expected: right[index] ?? "",
  }));
}

function moduleTags(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  const last = value
    .split(/[\\/]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .at(-1);
  return last ? [last.replace(/\s*\(#\d+\)\s*$/, "")] : [];
}

function tableTags(headers: string[], row: string[]): string[] {
  const levels = headers
    .map((header, index) => ({ header, index, level: header.match(/^所属层级(\d+)$/)?.[1] }))
    .filter((item): item is { header: string; index: number; level: string } => Boolean(item.level))
    .sort((a, b) => Number(a.level) - Number(b.level));
  if (levels.length > 0) return levels.map((item) => row[item.index]?.trim() ?? "").filter(Boolean);
  const legacy = ["所属模块", "所属页面", "所属分组"].flatMap((header) => {
    const value = row[headers.indexOf(header)]?.trim() ?? "";
    return header === "所属模块" ? moduleTags(value) : value ? [value] : [];
  });
  return legacy;
}

function headerIndex(headers: string[], ...names: string[]): number {
  return names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
}

function parseTable(
  table: RawTable,
  options: ImportOptions,
  format: "csv" | "xlsx",
): ImportPreview {
  const titleIndex = headerIndex(table.headers, "用例标题", "标题", "title");
  if (titleIndex < 0) throw new Error(`${format} 无法识别：缺少“用例标题”列`);
  const requirementIndex = headerIndex(table.headers, "相关需求", "需求编号");
  if (options.requirementId && requirementIndex < 0) {
    throw new Error(`${format} 缺少需求列，无法筛选 --requirement-id ${options.requirementId}`);
  }
  const requirementIds = new Set<string>();
  for (const row of table.rows) {
    for (const match of (row[requirementIndex] ?? "").matchAll(/#(\d+)/g))
      requirementIds.add(match[1]);
  }
  const selectedRequirement =
    options.requirementId ?? (requirementIds.size === 1 ? [...requirementIds][0] : undefined);
  if (requirementIds.size > 1 && !selectedRequirement) {
    throw new Error(
      `${format} 包含多个需求编号(${[...requirementIds].join(", ")})，必须指定 --requirement-id`,
    );
  }
  const rows =
    selectedRequirement && requirementIndex >= 0
      ? table.rows.filter((row) =>
          (row[requirementIndex] ?? "").includes(`#${selectedRequirement}`),
        )
      : table.rows;
  if (rows.length === 0) throw new Error(`${format} 找不到需求 #${selectedRequirement}`);
  const warnings: string[] = [];
  const priorityIndex = headerIndex(table.headers, "优先级", "priority");
  const preconditionIndex = headerIndex(table.headers, "前置条件", "前置");
  const actionIndex = headerIndex(table.headers, "步骤", "操作", "action");
  const expectedIndex = headerIndex(table.headers, "预期", "预期结果", "expected");
  if (actionIndex < 0 || expectedIndex < 0)
    throw new Error(`${format} 无法识别：缺少“步骤”或“预期”列`);
  const cases = rows.map((row, index): CaseItem => {
    const normalized = normalizeTitle(row[titleIndex] ?? "");
    if (!(row[titleIndex] ?? "").trim()) throw new Error(`${format} 第 ${index + 2} 行标题为空`);
    const steps = pairSteps(
      row[actionIndex] ?? "",
      row[expectedIndex] ?? "",
      warnings,
      `${format} 第 ${index + 2} 行`,
    );
    if (steps.length === 0) throw new Error(`${format} 第 ${index + 2} 行没有步骤`);
    return {
      id: `C${String(index + 1).padStart(4, "0")}`,
      title: normalized.title,
      priority: priorityFromValue(row[priorityIndex], warnings, `${format} 第 ${index + 2} 行`),
      ...(row[preconditionIndex]?.trim()
        ? { precondition: normalizeStructuredText(row[preconditionIndex].trim()) }
        : {}),
      steps,
      ...(combineTags(tableTags(table.headers, row), normalized.prefixTags)
        ? { tags: combineTags(tableTags(table.headers, row), normalized.prefixTags) }
        : {}),
    };
  });
  return {
    file: { meta: featureMeta(options, selectedRequirement), cases },
    format,
    profile: requirementIndex >= 0 ? "zentao-table" : "kata-table",
    warnings,
    sourceRows: rows.length,
  };
}

function parseCsvText(text: string): RawTable {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value !== "")) rows.push(row);
  }
  const headers = (rows.shift() ?? []).map((value) => value.trim());
  return { headers, rows: rows.map((values) => headers.map((_, index) => values[index] ?? "")) };
}

async function parseXlsxTable(sourcePath: string): Promise<RawTable> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(sourcePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("xlsx 没有工作表");
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    rows.push(values.map((value) => (value === null || value === undefined ? "" : String(value))));
  });
  const headers = (rows.shift() ?? []).map((value) => value.trim());
  return { headers, rows: rows.map((values) => headers.map((_, index) => values[index] ?? "")) };
}

function markdownCell(value: string): string {
  return normalizeStructuredText(value.replace(/\\\|/g, "|").replace(/\\\\/g, "\\"));
}

function parseMarkdownCaseBody(body: string, location: string) {
  const preconditionMatch = body.match(/>\s*前置条件\s*\n([\s\S]*?)(?=\n>\s*用例步骤|$)/);
  const precondition = preconditionMatch?.[1].match(/```\n([\s\S]*?)\n```/)?.[1]?.trim();
  const stepStart = body.indexOf("> 用例步骤");
  const steps: Array<{ action: string; expected: string }> = [];
  if (stepStart >= 0) {
    for (const line of body.slice(stepStart).split("\n")) {
      if (!line.startsWith("|")) continue;
      const cells = splitMdTableRow(line);
      if (cells.length < 3 || /^\s*-+\s*$/.test(cells[0]) || cells[0].trim() === "编号") continue;
      steps.push({ action: markdownCell(cells[1]), expected: markdownCell(cells[2]) });
    }
  }
  if (steps.length === 0) throw new Error(`${location} 没有步骤表格`);
  return { precondition, steps };
}

function markdownPreview(content: string): Array<{ level: number; title: string; body: string }> {
  const lines = content.split(/\r?\n/);
  const headings: Array<{ level: number; title: string; start: number }> = [];
  lines.forEach((line, index) => {
    const match = line.match(/^(#+)\s+(.+)$/);
    if (match) headings.push({ level: match[1].length, title: match[2].trim(), start: index });
  });
  return headings.map((heading, index) => ({
    level: heading.level,
    title: heading.title,
    body: lines.slice(heading.start + 1, headings[index + 1]?.start ?? lines.length).join("\n"),
  }));
}

function parseMarkdown(sourcePath: string, options: ImportOptions): ImportPreview {
  const raw = readFileSync(sourcePath, "utf8");
  const { body } = parseFrontMatter(raw);
  const headings = markdownPreview(body);
  const warnings: string[] = [];
  const cases: CaseItem[] = [];
  const stack: Array<{ level: number; title: string }> = [];
  for (const [index, heading] of headings.entries()) {
    while (true) {
      const last = stack.at(-1);
      if (!last || last.level < heading.level) break;
      stack.pop();
    }
    const priorityMatch = heading.title.match(/^【(P\d)】(.*)$/);
    const looksLikeCase =
      Boolean(priorityMatch) ||
      />\s*用例步骤/.test(heading.body) ||
      /\|\s*步骤\s*\|/.test(heading.body);
    if (!looksLikeCase) {
      stack.push({ level: heading.level, title: heading.title });
      continue;
    }
    const rawTitle = priorityMatch?.[2] ?? heading.title;
    const normalized = normalizeTitle(rawTitle);
    const parsed = parseMarkdownCaseBody(heading.body, `MD 第 ${index + 1} 个标题`);
    const parentTags = stack
      .filter((item) => !(item.level === 1 && /测试用例$/.test(item.title)))
      .map((item) => item.title);
    const priority = priorityFromValue(priorityMatch?.[1], warnings, `MD 第 ${index + 1} 个标题`);
    cases.push({
      id: `C${String(cases.length + 1).padStart(4, "0")}`,
      title: normalized.title,
      priority,
      ...(parsed.precondition ? { precondition: parsed.precondition } : {}),
      steps: parsed.steps,
      ...(combineTags(parentTags, normalized.prefixTags)
        ? { tags: combineTags(parentTags, normalized.prefixTags) }
        : {}),
    });
  }
  if (cases.length === 0) throw new Error("MD 未识别到任何用例");
  const frontmatter = (parseYaml(raw.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "") ?? {}) as Record<
    string,
    unknown
  >;
  const requirement =
    typeof frontmatter.prd_id === "number" ? String(frontmatter.prd_id) : undefined;
  return {
    file: { meta: featureMeta(options, options.requirementId ?? requirement), cases },
    format: "md",
    profile: "kata-markdown",
    warnings,
    sourceRows: cases.length,
  };
}

function markerPriority(topic: RawXmindTopic): CaseItem["priority"] | undefined {
  const marker = topic.markers
    ?.map((item) => item.markerId ?? "")
    .find((value) => /^priority-\d+$/.test(value));
  if (!marker) return undefined;
  const level = Number(marker.slice("priority-".length));
  if (level === 1) return "P0";
  if (level === 2) return "P1";
  if (level === 3) return "P2";
  throw new Error(`XMind 节点 ${topic.title ?? "(无标题)"} 使用了不支持的优先级标记 ${marker}`);
}

function topicChildren(topic: RawXmindTopic): RawXmindTopic[] {
  return topic.children?.attached ?? [];
}

function noteContent(topic: RawXmindTopic): string {
  const value = topic.notes?.plain?.content?.trim() ?? "";
  return normalizeStructuredText(value);
}

function parseXmindNote(note: string): {
  precondition?: string;
  steps: Array<{ action: string; expected: string }>;
} {
  const stepMarker = note.indexOf("用例步骤：");
  const precondition = note
    .slice(0, stepMarker >= 0 ? stepMarker : note.length)
    .replace(/^前置条件：\s*/s, "")
    .trim();
  const steps: Array<{ action: string; expected: string }> = [];
  const stepText = stepMarker >= 0 ? note.slice(stepMarker) : "";
  const matches = [
    ...stepText.matchAll(/(?:^|\n)(\d+)\.\s*步骤：([\s\S]*?)(?=\n\d+\.\s*步骤：|$)/g),
  ];
  for (const match of matches) {
    const content = match[2].trim();
    const expectedMarker = content.indexOf("\n   预期：");
    steps.push({
      action: (expectedMarker >= 0 ? content.slice(0, expectedMarker) : content).trim(),
      expected:
        expectedMarker >= 0
          ? content
              .slice(expectedMarker)
              .replace(/^\n\s*预期：\s*/, "")
              .trim()
          : "",
    });
  }
  return {
    ...(precondition ? { precondition: normalizeStructuredText(precondition) } : {}),
    steps: steps.map((step) => ({
      action: normalizeStructuredText(step.action),
      expected: normalizeStructuredText(step.expected),
    })),
  };
}

function isXmindCase(topic: RawXmindTopic): boolean {
  if (markerPriority(topic)) return true;
  const children = topicChildren(topic);
  if (noteContent(topic).includes("用例步骤")) return true;
  if (children.length === 0) return false;
  // 无优先级标记时，只把“步骤节点 > 预期节点”识别为用例；
  // 更深的分组树不能因为存在后代而误判成用例标题。
  if (children.some((child) => topicChildren(child).length === 0)) return false;
  return children.every((step) =>
    topicChildren(step).every((expected) => topicChildren(expected).length === 0),
  );
}

interface RawXmindSheet {
  rootTopic?: RawXmindTopic;
}

async function loadXmindContent(sourcePath: string): Promise<RawXmindSheet[]> {
  const zip = await JSZip.loadAsync(readFileSync(sourcePath));
  const contentFile = zip.file("content.json");
  if (!contentFile) throw new Error("XMind 缺少 content.json");
  return JSON.parse(await contentFile.async("string")) as RawXmindSheet[];
}

function collectXmindCases(
  roots: Array<{ topic: RawXmindTopic; parents: string[]; location: string; skipTitle?: boolean }>,
  warnings: string[],
): CaseItem[] {
  const cases: CaseItem[] = [];
  const visit = (
    topic: RawXmindTopic,
    parents: string[],
    location: string,
    skipTitle = false,
  ): void => {
    if (isXmindCase(topic)) {
      const rawTitle = topic.title?.trim() ?? "";
      if (!rawTitle) throw new Error(`${location} 用例标题为空`);
      const normalized = normalizeTitle(rawTitle);
      const marker = markerPriority(topic);
      const note = parseXmindNote(noteContent(topic));
      const stepTopics = topicChildren(topic);
      const steps =
        stepTopics.length > 0
          ? stepTopics.map((step, index) => {
              const expected = topicChildren(step)
                .map((item) => normalizeStructuredText(item.title?.trim() ?? ""))
                .filter(Boolean)
                .join("\n");
              if (!expected) warnings.push(`${location} 第 ${index + 1} 步缺少预期`);
              return {
                action: normalizeStructuredText(step.title?.trim() ?? ""),
                expected,
              };
            })
          : note.steps;
      if (steps.length === 0) throw new Error(`${location} 没有步骤`);
      const priority = marker ?? priorityFromValue(undefined, warnings, location);
      cases.push({
        id: `C${String(cases.length + 1).padStart(4, "0")}`,
        title: normalized.title,
        priority,
        ...(note.precondition ? { precondition: note.precondition } : {}),
        steps,
        ...(combineTags(parents, normalized.prefixTags)
          ? { tags: combineTags(parents, normalized.prefixTags) }
          : {}),
      });
      return;
    }
    const title = topic.title?.trim() ?? "";
    const nextParents = title && !skipTitle ? [...parents, title] : parents;
    for (const [index, child] of topicChildren(topic).entries()) {
      visit(child, nextParents, `${location}/${index + 1}`);
    }
  };
  for (const root of roots) visit(root.topic, root.parents, root.location, root.skipTitle);
  return cases;
}

async function parseXmind(sourcePath: string, options: ImportOptions): Promise<ImportPreview> {
  const content = await loadXmindContent(sourcePath);
  const warnings: string[] = [];
  const multipleSheets = content.length > 1;
  const requestedRoot = options.name;
  const roots = content.flatMap((sheet, sheetIndex) => {
    if (!sheet.rootTopic) return [];
    const sheetTag = multipleSheets ? [sheet.rootTopic.title ?? `画布${sheetIndex + 1}`] : [];
    return topicChildren(sheet.rootTopic).map((topic, index) => ({
      topic,
      parents: sheetTag,
      location: `XMind 画布 ${sheetIndex + 1}/${index + 1}`,
      skipTitle: sheetTag.length === 0 && topic.title?.trim() === requestedRoot,
    }));
  });
  const cases = collectXmindCases(roots, warnings);
  if (cases.length === 0) throw new Error("XMind 未识别到任何用例");
  const requirement = content
    .flatMap((sheet) => [sheet.rootTopic?.title ?? ""])
    .map((title) => title.match(/#(\d+)/)?.[1])
    .find(Boolean);
  return {
    file: { meta: featureMeta(options, options.requirementId ?? requirement), cases },
    format: "xmind",
    profile: "xmind-topic-tree",
    warnings,
    sourceRows: cases.length,
  };
}

export interface SplitXmindOptions {
  sourcePath: string;
  project: string;
  version: string;
  importName?: string;
}

export interface SplitXmindEntry {
  source_l1: string;
  target_feature: string;
  yaml_name: string;
  title: string;
  requirement_id?: string;
  case_module_id: string;
  cases: number;
  warnings: string[];
  skipped?: "no cases";
  file?: CasesFile;
}

export interface SplitXmindPreview {
  format: "xmind";
  profile: "xmind-l1-split";
  project: string;
  version: string;
  source: string;
  entries: SplitXmindEntry[];
  feature_count: number;
  skipped_count: number;
  case_count: number;
}

function topicLabels(topic: RawXmindTopic): string[] {
  return (topic.labels ?? [])
    .map((label) => (typeof label === "string" ? label : (label.label ?? label.title ?? "")))
    .filter(Boolean);
}

function requirementIdFromTopic(topic: RawXmindTopic): string | undefined {
  return topicLabels(topic)
    .map((label) => label.match(/[（(]#(\d+)[）)]/)?.[1])
    .find(Boolean);
}

function splitL1Title(raw: string): { title: string; caseModuleId: string } {
  const match = raw.match(/\s*[（(]#(\d+)[）)]\s*$/);
  return {
    title: raw.replace(/\s*[（(]#\d+[）)]\s*$/, "").trim(),
    caseModuleId: match?.[1] ?? "",
  };
}

function splitFeatureIdentity(
  title: string,
  requirementId?: string,
): {
  customer?: string;
  description: string;
  dirName: string;
  yamlName: string;
} {
  const first = title.match(/^【([^】]+)】/);
  const numericPrefix = Boolean(first?.[1].match(/^\d+(?:\.\d+)+$/));
  const customer = first && !numericPrefix ? first[1] : undefined;
  const withoutCustomer = customer ? title.slice(first?.[0].length ?? 0) : title;
  const description = withoutCustomer.replace(/[【】]/g, "").trim();
  if (!description) throw new Error(`XMind L1 无法生成 feature 描述: ${title}`);
  const dirName = buildFeatureDirName({
    module: "离线开发",
    description,
    ...(customer ? { customer } : {}),
    ...(requirementId ? { requirementId } : {}),
  });
  const yamlName = description.replace(/[\\/:]/g, "-").trim();
  if (!yamlName || yamlName === "." || yamlName === "..") {
    throw new Error(`XMind L1 无法生成 YAML 文件名: ${title}`);
  }
  return { ...(customer ? { customer } : {}), description, dirName, yamlName };
}

/** Split every XMind L1 requirement into an independent canonical YAML preview. */
export async function splitXmindCases(options: SplitXmindOptions): Promise<SplitXmindPreview> {
  if (basename(options.sourcePath).toLowerCase().split(".").at(-1) !== "xmind") {
    throw new Error("--split 只支持 .xmind 输入");
  }
  const version = options.version.startsWith("v") ? options.version : `v${options.version}`;
  if (!/^v\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`--version 必须匹配完整版本 vX.Y.Z: ${options.version}`);
  }
  loadXmindProjectConfig(options.project);
  const content = await loadXmindContent(options.sourcePath);
  const sourceName = options.importName ?? basename(options.sourcePath);
  const entries: SplitXmindEntry[] = [];
  for (const [sheetIndex, sheet] of content.entries()) {
    if (!sheet.rootTopic) continue;
    for (const [l1Index, l1] of topicChildren(sheet.rootTopic).entries()) {
      const sourceL1 = l1.title?.trim() ?? "";
      if (!sourceL1) throw new Error(`XMind 画布 ${sheetIndex + 1} 的 L1 ${l1Index + 1} 标题为空`);
      const { title, caseModuleId } = splitL1Title(sourceL1);
      const warnings: string[] = [];
      const cases = collectXmindCases(
        topicChildren(l1).map((topic, index) => ({
          topic,
          parents: [],
          location: `XMind 画布 ${sheetIndex + 1}/L1 ${l1Index + 1}/${index + 1}`,
        })),
        warnings,
      );
      const requirementId = requirementIdFromTopic(l1);
      const identity = splitFeatureIdentity(title, requirementId);
      if (!requirementId) {
        warnings.push(`${sourceL1}: 缺少 requirement_id，YAML 省略且 XMind 不添加标签`);
      }
      const targetFeature = `${version}/${identity.dirName}`;
      if (cases.length === 0) {
        entries.push({
          source_l1: sourceL1,
          target_feature: targetFeature,
          yaml_name: identity.yamlName,
          title,
          ...(requirementId ? { requirement_id: requirementId } : {}),
          case_module_id: caseModuleId,
          cases: 0,
          warnings,
          skipped: "no cases",
        });
        continue;
      }
      const file: CasesFile = {
        meta: {
          title,
          ...(requirementId ? { requirement_id: requirementId } : {}),
          case_module_id: caseModuleId,
          imports: [sourceName],
          exports: ["xmind"],
        },
        cases,
      };
      entries.push({
        source_l1: sourceL1,
        target_feature: targetFeature,
        yaml_name: identity.yamlName,
        title,
        ...(requirementId ? { requirement_id: requirementId } : {}),
        case_module_id: caseModuleId,
        cases: cases.length,
        warnings,
        file,
      });
    }
  }
  if (entries.length === 0) throw new Error("XMind 未识别到任何 L1 需求");
  return {
    format: "xmind",
    profile: "xmind-l1-split",
    project: options.project,
    version,
    source: resolve(options.sourcePath),
    entries,
    feature_count: entries.filter((entry) => !entry.skipped).length,
    skipped_count: entries.filter((entry) => entry.skipped).length,
    case_count: entries.reduce((sum, entry) => sum + entry.cases, 0),
  };
}

export async function importCases(options: ImportOptions): Promise<ImportPreview> {
  const extension = basename(options.sourcePath).toLowerCase().split(".").at(-1);
  if (extension === "csv") {
    return parseTable(parseCsvText(readFileSync(options.sourcePath, "utf8")), options, "csv");
  }
  if (extension === "xlsx")
    return parseTable(await parseXlsxTable(options.sourcePath), options, "xlsx");
  if (extension === "md") return parseMarkdown(options.sourcePath, options);
  if (extension === "xmind") return parseXmind(options.sourcePath, options);
  throw new Error(`不支持的输入格式 .${extension ?? ""}，只支持 .csv/.xlsx/.md/.xmind`);
}
