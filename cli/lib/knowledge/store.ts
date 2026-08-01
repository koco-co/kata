/**
 * Knowledge store — 条目级读写。
 * file-per-entry 类型(module/pitfall/site)写 `<type>s/<slug>.md`(pitfall 带日期前缀);
 * 读取扫描全部子目录，只接受规范四态 status frontmatter。
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { writeFileAtomic } from "../atomic-writer.ts";
import { parseFrontmatter } from "../knowledge.ts";
import { knowledgeDirFromPaths } from "../knowledge-paths.ts";
import { assertWritable } from "../path-policy.ts";
import type { ProjectPaths } from "../types.ts";
import type { KnowledgeEntry, KnowledgeType } from "./types.ts";

// file-per-entry 类型 → 子目录名
const TYPE_DIRS: Record<string, string> = {
  term: "terms",
  module: "modules",
  pitfall: "pitfalls",
  site: "sites",
};

/** 标题 → 文件名 slug:保留中日韩字符,其余非字母数字折叠为 `-`。 */
export function slugifyTitle(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{Script=Han}\w]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "untitled";
}

function entryPath(dir: string, entry: KnowledgeEntry): string {
  const sub = TYPE_DIRS[entry.type];
  if (!sub) throw new Error(`类型 ${entry.type} 不是 file-per-entry`);
  const slug = slugifyTitle(entry.title);
  return join(dir, sub, `${slug}.md`);
}

function serialize(entry: KnowledgeEntry): string {
  return [
    "---",
    `title: ${entry.title}`,
    `type: ${entry.type}`,
    `tags: [${entry.tags.join(", ")}]`,
    `status: ${entry.status}`,
    `source: ${entry.source ? entry.source : '""'}`,
    `updated: ${entry.updated}`,
    "---",
    "",
    entry.body.trim(),
    "",
  ].join("\n");
}

function existingEntryPath(dir: string, entry: KnowledgeEntry): string | undefined {
  const subdir = join(dir, TYPE_DIRS[entry.type]);
  for (const file of listMarkdown(subdir)) {
    const hit = parseEntryFile(entry.type, file);
    if (hit?.title === entry.title) return file;
  }
  return undefined;
}

/** 写入条目(同名复用旧路径),返回文件路径。 */
export function writeEntry(paths: ProjectPaths, entry: KnowledgeEntry): string {
  const dir = knowledgeDirFromPaths(paths);
  assertWritable(paths, dir);
  const file = existingEntryPath(dir, entry) ?? entryPath(dir, entry);
  assertWritable(paths, file);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileAtomic(file, serialize(entry));
  return file;
}

/** Find one entry by type and title, including legacy dated pitfall files. */
export function readEntryByTitle(
  paths: ProjectPaths,
  type: KnowledgeType,
  title: string,
): KnowledgeEntry | null {
  const dir = knowledgeDirFromPaths(paths);
  const sub = TYPE_DIRS[type];
  if (!sub) return null;
  for (const file of listMarkdown(join(dir, sub))) {
    const hit = parseEntryFile(type, file);
    if (hit?.title === title) {
      return {
        title: hit.title,
        type: hit.type,
        status: hit.status,
        tags: hit.tags,
        source: hit.source,
        updated: hit.updated,
        body: hit.body,
      };
    }
  }
  return null;
}

export function readOverview(paths: ProjectPaths): string | null {
  const file = join(knowledgeDirFromPaths(paths), "overview.md");
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

interface RawHit {
  type: KnowledgeType;
  file: string;
  title: string;
  status: KnowledgeEntry["status"];
  tags: string[];
  source?: string;
  updated: string;
  body: string;
}

function parseEntryFile(type: KnowledgeType, file: string): RawHit | null {
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return null;
  }
  const parsed = parseFrontmatter(raw);
  const fm = parsed.frontmatter;
  if (!fm?.title) return null;
  return {
    type,
    file,
    title: String(fm.title),
    status: fm.status,
    tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
    source: typeof fm.source === "string" && fm.source !== "" ? fm.source : undefined,
    updated: typeof fm.updated === "string" ? fm.updated : "",
    body: parsed.body,
  };
}

/** 递归收集 dir 下全部 .md;站点条目带一层 host 子目录(sites/<host>/dom-*.md),不递归会漏。 */
function listMarkdown(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".md")) out.push(p);
    }
  };
  walk(dir);
  return out;
}

/** 检索条目:types 限定类型;module 匹配标题或 tags;keyword 匹配标题/正文/tags。 */
export function readEntries(
  paths: ProjectPaths,
  query: {
    module?: string;
    keyword?: string;
    types?: string[];
    statuses?: KnowledgeEntry["status"][];
  } = {},
): KnowledgeEntry[] {
  const dir = knowledgeDirFromPaths(paths);
  const types = (query.types?.length ? query.types : Object.keys(TYPE_DIRS)) as KnowledgeType[];
  // 提升为局部常量,闭包内保持收窄后的类型
  const mod = query.module;
  const kw = query.keyword;
  const hits: KnowledgeEntry[] = [];
  for (const type of types) {
    const sub = TYPE_DIRS[type];
    if (!sub) continue;
    for (const file of listMarkdown(join(dir, sub))) {
      const hit = parseEntryFile(type, file);
      if (!hit) continue;
      if (query.statuses && !query.statuses.includes(hit.status)) continue;
      if (mod && !hit.title.includes(mod) && !hit.tags.some((t) => t.includes(mod))) {
        continue;
      }
      if (
        kw &&
        !hit.title.includes(kw) &&
        !hit.body.includes(kw) &&
        !hit.tags.some((t) => t.includes(kw))
      ) {
        continue;
      }
      hits.push({
        title: hit.title,
        type: hit.type,
        status: hit.status,
        tags: hit.tags,
        source: hit.source,
        updated: hit.updated,
        body: hit.body,
      });
    }
  }
  return hits;
}
