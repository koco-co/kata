/** Structural validation for canonical project knowledge entries. */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { parseFrontmatter } from "../knowledge.ts";
import { knowledgeDirFromPaths } from "../knowledge-paths.ts";
import { locateProject } from "../workspace-locator.ts";
import { isKnowledgeStatus, type KnowledgeType } from "./types.ts";

const ENTRY_DIRECTORIES: ReadonlyArray<{ directory: string; type: KnowledgeType }> = [
  { directory: "terms", type: "term" },
  { directory: "modules", type: "module" },
  { directory: "pitfalls", type: "pitfall" },
  { directory: "sites", type: "site" },
];

const CANONICAL_FIELDS = new Set(["title", "type", "tags", "status", "source", "updated"]);
const UPDATED_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface KnowledgeLintViolation {
  file: string;
  line: number;
  rule:
    | "frontmatter"
    | "legacy-confidence"
    | "metadata-field"
    | "entry-type"
    | "status"
    | "updated"
    | "verified-source"
    | "primary-heading"
    | "title-heading"
    | "template-marker";
  message: string;
}

export interface KnowledgeLintReport {
  project: string;
  violations: KnowledgeLintViolation[];
}

interface KnowledgeFile {
  path: string;
  expectedType: KnowledgeType;
}

interface RawFrontmatter {
  fields: Map<string, number[]>;
}

function collectMarkdown(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const paths: string[] = [];
  const walk = (current: string): void => {
    for (const name of readdirSync(current).sort()) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) {
        walk(path);
      } else if (name.endsWith(".md") && basename(path) !== "_index.md") {
        paths.push(path);
      }
    }
  };
  walk(dir);
  return paths;
}

function canonicalFiles(kdir: string): KnowledgeFile[] {
  const files: KnowledgeFile[] = [];
  const overview = join(kdir, "overview.md");
  if (existsSync(overview)) files.push({ path: overview, expectedType: "overview" });
  for (const entry of ENTRY_DIRECTORIES) {
    for (const path of collectMarkdown(join(kdir, entry.directory))) {
      files.push({ path, expectedType: entry.type });
    }
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function rawFrontmatter(raw: string): RawFrontmatter | null {
  if (!raw.startsWith("---\n") && !raw.startsWith("---\r\n")) return null;
  const lines = raw.split(/\r?\n/);
  const fields = new Map<string, number[]>();
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.trim() === "---") return { fields };
    const match = line.match(/^\s*([A-Za-z][A-Za-z0-9_-]*)\s*:/);
    if (!match?.[1]) continue;
    const positions = fields.get(match[1]) ?? [];
    positions.push(index + 1);
    fields.set(match[1], positions);
  }
  return null;
}

function lineAt(raw: string, offset: number): number {
  return raw.slice(0, offset).split(/\r?\n/).length;
}

function push(
  violations: KnowledgeLintViolation[],
  file: string,
  line: number,
  rule: KnowledgeLintViolation["rule"],
  message: string,
): void {
  violations.push({ file, line, rule, message });
}

function lintFile(file: KnowledgeFile, root: string, violations: KnowledgeLintViolation[]): void {
  const raw = readFileSync(file.path, "utf8");
  const displayPath = relative(root, file.path).split("\\").join("/");
  const rawMeta = rawFrontmatter(raw);
  if (!rawMeta) {
    push(violations, displayPath, 1, "frontmatter", "缺少完整的 YAML frontmatter");
    return;
  }

  for (const [field, lines] of rawMeta.fields) {
    if (field === "confidence") {
      push(
        violations,
        displayPath,
        lines[0] ?? 1,
        "legacy-confidence",
        "已迁移到 status，不能再使用 confidence",
      );
      continue;
    }
    if (!CANONICAL_FIELDS.has(field)) {
      push(
        violations,
        displayPath,
        lines[0] ?? 1,
        "metadata-field",
        `不支持的 frontmatter 字段: ${field}`,
      );
    }
    if (lines.length > 1) {
      push(violations, displayPath, lines[1] ?? 1, "frontmatter", `frontmatter 字段重复: ${field}`);
    }
  }

  const parsed = parseFrontmatter(raw);
  if (!parsed.frontmatter) {
    push(violations, displayPath, 1, "frontmatter", "frontmatter 缺少规范字段或字段值无效");
    return;
  }
  const meta = parsed.frontmatter;
  if (meta.type !== file.expectedType) {
    push(
      violations,
      displayPath,
      rawMeta.fields.get("type")?.[0] ?? 1,
      "entry-type",
      `${file.expectedType} 目录中的条目 type 必须为 ${file.expectedType}`,
    );
  }
  if (!isKnowledgeStatus(meta.status ?? "")) {
    push(
      violations,
      displayPath,
      rawMeta.fields.get("status")?.[0] ?? 1,
      "status",
      "status 必须为四态值",
    );
  }
  if (!UPDATED_DATE.test(meta.updated)) {
    push(
      violations,
      displayPath,
      rawMeta.fields.get("updated")?.[0] ?? 1,
      "updated",
      "updated 必须为 YYYY-MM-DD",
    );
  }
  if (meta.status === "verified" && !meta.source.trim()) {
    push(
      violations,
      displayPath,
      rawMeta.fields.get("source")?.[0] ?? 1,
      "verified-source",
      "status=verified 必须登记可追溯来源",
    );
  }

  const headings = [...parsed.body.matchAll(/^#(?!#)\s+(.+?)\s*$/gm)];
  if (headings.length !== 1) {
    push(
      violations,
      displayPath,
      1,
      "primary-heading",
      headings.length === 0 ? "正文缺少一级标题" : "正文只能有一个一级标题",
    );
  } else if (headings[0]?.[1]?.trim() !== meta.title) {
    push(
      violations,
      displayPath,
      lineAt(raw, headings[0].index ?? 0),
      "title-heading",
      "一级标题必须与 frontmatter.title 一致",
    );
  }

  const templateMarker = /<!--\s*TODO\b|[（(]占位\s*[：:]|^\s*\d+\.\s*…\s*$/gim.exec(parsed.body);
  if (templateMarker) {
    push(
      violations,
      displayPath,
      lineAt(raw, (raw.indexOf(parsed.body) || 0) + (templateMarker.index ?? 0)),
      "template-marker",
      "已入库知识不能保留未填充模板标记",
    );
  }
}

/** Lint canonical overview and file-per-entry knowledge without writing any file. */
export function lintKnowledge(project: string, root?: string): KnowledgeLintReport {
  const paths = locateProject(project, root);
  const violations: KnowledgeLintViolation[] = [];
  for (const file of canonicalFiles(knowledgeDirFromPaths(paths))) {
    lintFile(file, paths.root, violations);
  }
  violations.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.rule.localeCompare(right.rule),
  );
  return { project, violations };
}

export function formatKnowledgeLint(report: KnowledgeLintReport): string {
  return report.violations
    .map((item) => `${item.file}:${item.line}:${item.rule}:${item.message}`)
    .join("\n");
}
