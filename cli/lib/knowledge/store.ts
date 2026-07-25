/**
 * Knowledge store — 条目级读写。
 * file-per-entry 类型(module/pitfall/site)写 `<type>s/<slug>.md`(pitfall 带日期前缀);
 * 读取扫描全部子目录,frontmatter 解析后把旧 confidence 字段映射为四态 status。
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "../knowledge.ts";
import type { ProjectPaths } from "../types.ts";
import { type KnowledgeEntry, type KnowledgeType, statusFromConfidence } from "./types.ts";

// file-per-entry 类型 → 子目录名
const TYPE_DIRS: Record<string, string> = {
  module: "modules",
  pitfall: "pitfalls",
  site: "sites",
};

/** 项目知识库目录:workspace/<p>/knowledge 优先,缺省回落 _shared/knowledge(与 knowledge-paths 同规则)。 */
export function storeDir(paths: ProjectPaths): string {
  if (existsSync(paths.knowledgeDir)) return paths.knowledgeDir;
  return join(paths.sharedDir, "knowledge");
}

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
  if (!sub) throw new Error(`类型 ${entry.type} 不是 file-per-entry,走 terms.md/overview.md`);
  const slug = slugifyTitle(entry.title);
  const name = entry.type === "pitfall" ? `${entry.updated}-${slug}.md` : `${slug}.md`;
  return join(dir, sub, name);
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

/** 写入条目(同名覆盖),返回文件路径。 */
export function writeEntry(paths: ProjectPaths, entry: KnowledgeEntry): string {
  const dir = storeDir(paths);
  const file = entryPath(dir, entry);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, serialize(entry));
  return file;
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
  const fm = parsed.frontmatter as
    | (Record<string, unknown> & { status?: string; confidence?: string })
    | null;
  if (!fm?.title) return null;
  return {
    type,
    file,
    title: String(fm.title),
    status:
      typeof fm.status === "string"
        ? (fm.status as KnowledgeEntry["status"])
        : statusFromConfidence(typeof fm.confidence === "string" ? fm.confidence : undefined),
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
  query: { module?: string; keyword?: string; types?: string[] } = {},
): KnowledgeEntry[] {
  const dir = storeDir(paths);
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
