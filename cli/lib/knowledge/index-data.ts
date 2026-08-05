#!/usr/bin/env bun
/**
 * knowledge 索引数据层。
 * 扫描 terms/modules/pitfalls/sites 的 file-per-entry 条目,为缺 frontmatter 的
 * 模板文件自动补全,渲染并写回 _index.md;另提供 overview section 的 upsert
 * (knowledge write 的 overview 聚合写入使用)。
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  autoFixFrontmatter,
  type IndexData,
  type IndexEntry,
  parseFrontmatter,
  renderIndex,
  todayIso,
} from "../knowledge.ts";
import { assertWritable } from "../path-policy.ts";
import type { ProjectPaths } from "../types.ts";
import { locateProject } from "../workspace-locator.ts";

export function gatherIndexData(projectName: string): {
  data: IndexData;
  fixedFiles: string[];
} {
  const paths = locateProject(projectName);
  const kdir = paths.knowledgeDir;
  assertWritable(paths, kdir);
  const today = todayIso();
  const fixedFiles: string[] = [];
  fixSingleKnowledgeFiles(kdir, today, fixedFiles, paths);

  const terms = scanAndFixKnowledgeDir(kdir, "terms", today, fixedFiles, paths);
  const modules = scanAndFixKnowledgeDir(kdir, "modules", today, fixedFiles, paths);
  const pitfalls = scanAndFixKnowledgeDir(kdir, "pitfalls", today, fixedFiles, paths);
  const sites = scanAndFixSites(kdir, today, fixedFiles, paths);
  const standards = scanAndFixNestedDir(kdir, "standards", today, fixedFiles, paths);
  const customers = scanAndFixKnowledgeDir(kdir, "customers", today, fixedFiles, paths);

  return {
    data: {
      terms,
      modules,
      pitfalls,
      sites,
      standards,
      customers,
      overview_updated: readKnowledgeUpdated(kdir, "overview.md"),
      terms_count: terms.length,
    },
    fixedFiles,
  };
}

function fixSingleKnowledgeFiles(
  kdir: string,
  today: string,
  fixedFiles: string[],
  paths: ProjectPaths,
): void {
  for (const single of ["overview.md"]) {
    const full = join(kdir, single);
    if (!existsSync(full)) continue;
    assertWritable(paths, full);
    const raw = readFileSync(full, "utf8");
    const fix = autoFixFrontmatter(raw, full, today);
    if (fix.fixed) {
      writeFileSync(full, fix.content);
      fixedFiles.push(single);
    }
  }
}

function scanAndFixKnowledgeDir(
  kdir: string,
  subdir: "terms" | "modules" | "pitfalls" | "customers",
  today: string,
  fixedFiles: string[],
  paths: ProjectPaths,
): IndexEntry[] {
  const dir = join(kdir, subdir);
  if (!existsSync(dir)) return [];
  assertWritable(paths, dir);
  return readdirSync(dir).flatMap((f) => {
    if (!f.endsWith(".md")) return [];
    return scanAndFixKnowledgeFile(
      join(dir, f),
      f.replace(/\.md$/, ""),
      `${subdir}/${f}`,
      today,
      fixedFiles,
      paths,
    );
  });
}

function scanAndFixSites(
  kdir: string,
  today: string,
  fixedFiles: string[],
  paths: ProjectPaths,
): IndexEntry[] {
  const sites: IndexEntry[] = [];
  const sitesDir = join(kdir, "sites");
  if (!existsSync(sitesDir)) return sites;
  assertWritable(paths, sitesDir);
  for (const domainDir of readdirSync(sitesDir)) {
    const domainPath = join(sitesDir, domainDir);
    assertWritable(paths, domainPath);
    if (!statSync(domainPath).isDirectory()) continue;
    for (const f of readdirSync(domainPath)) {
      if (!f.endsWith(".md")) continue;
      sites.push(
        ...scanAndFixKnowledgeFile(
          join(domainPath, f),
          `sites/${domainDir}/${f.replace(/\.md$/, "")}`,
          `sites/${domainDir}/${f}`,
          today,
          fixedFiles,
          paths,
        ),
      );
    }
  }
  return sites;
}

/** 递归扫描嵌套目录(standards/<customer>/**).md),用法同 scanAndFixSites。 */
function scanAndFixNestedDir(
  kdir: string,
  subdir: "standards",
  today: string,
  fixedFiles: string[],
  paths: ProjectPaths,
): IndexEntry[] {
  const entries: IndexEntry[] = [];
  const rootDir = join(kdir, subdir);
  if (!existsSync(rootDir)) return entries;
  assertWritable(paths, rootDir);
  for (const name of readdirSync(rootDir)) {
    const childPath = join(rootDir, name);
    assertWritable(paths, childPath);
    if (statSync(childPath).isDirectory()) {
      // 客户子目录:standards/ltqc/xxx.md
      for (const f of readdirSync(childPath)) {
        if (!f.endsWith(".md")) continue;
        const mdPath = join(childPath, f);
        entries.push(
          ...scanAndFixKnowledgeFile(
            mdPath,
            `${subdir}/${name}/${f.replace(/\.md$/, "")}`,
            `${subdir}/${name}/${f}`,
            today,
            fixedFiles,
            paths,
          ),
        );
      }
    } else if (name.endsWith(".md")) {
      // 公共条目:standards/xxx.md
      entries.push(
        ...scanAndFixKnowledgeFile(
          childPath,
          `${subdir}/${name.replace(/\.md$/, "")}`,
          `${subdir}/${name}`,
          today,
          fixedFiles,
          paths,
        ),
      );
    }
  }
  return entries;
}

function scanAndFixKnowledgeFile(
  full: string,
  name: string,
  fixedName: string,
  today: string,
  fixedFiles: string[],
  paths: ProjectPaths,
): IndexEntry[] {
  assertWritable(paths, full);
  let raw = readFileSync(full, "utf8");
  const fix = autoFixFrontmatter(raw, full, today);
  if (fix.fixed) {
    writeFileSync(full, fix.content);
    fixedFiles.push(fixedName);
    raw = fix.content;
  }
  const parsed = parseFrontmatter(raw);
  if (!parsed.frontmatter) return [];
  return [
    {
      name,
      title: parsed.frontmatter.title,
      tags: parsed.frontmatter.tags,
      updated: parsed.frontmatter.updated,
      status: parsed.frontmatter.status,
    },
  ];
}

function readKnowledgeUpdated(kdir: string, name: string): string {
  const path = join(kdir, name);
  if (!existsSync(path)) return "";
  const parsed = parseFrontmatter(readFileSync(path, "utf8"));
  return parsed.frontmatter?.updated ?? "";
}

export function writeIndexFile(projectName: string): {
  terms_count: number;
  modules_count: number;
  pitfalls_count: number;
  sites_count: number;
  fixed_frontmatter: string[];
  written: string;
} {
  const { data, fixedFiles } = gatherIndexData(projectName);
  const out = renderIndex(projectName, data);
  const paths = locateProject(projectName);
  const indexPath = join(paths.knowledgeDir, "_index.md");
  assertWritable(paths, indexPath);
  writeFileSync(indexPath, out);
  return {
    terms_count: data.terms.length,
    modules_count: data.modules.length,
    pitfalls_count: data.pitfalls.length,
    sites_count: data.sites.length,
    fixed_frontmatter: fixedFiles,
    written: indexPath,
  };
}

export function upsertOverviewSection(
  body: string,
  section: string,
  newBody: string,
  mode: "append" | "replace",
): string {
  const lines = body.split("\n");
  const headingRe = new RegExp(`^##\\s+${escapeRegex(section)}\\s*$`);

  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headingRe.test(lines[i])) {
      startIdx = i;
      break;
    }
  }

  if (startIdx === -1) {
    // Append a new section at the end
    const trailingNewline = body.endsWith("\n") ? "" : "\n";
    return `${body}${trailingNewline}\n## ${section}\n\n${newBody}\n`;
  }

  // Find next heading (## or #) to define section end
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^#{1,2}\s+/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }

  const before = lines.slice(0, startIdx + 1);
  const after = lines.slice(endIdx);

  if (mode === "replace") {
    // Replace section body with blank line + newBody + blank line before next section
    const newSection = ["", newBody, ""];
    return [...before, ...newSection, ...after].join("\n");
  }

  // append mode: keep existing body, append newBody at the end of the section
  const existing = lines.slice(startIdx + 1, endIdx);
  // Trim trailing empty lines before appending, then re-add one blank separator
  let tailTrim = existing.length;
  while (tailTrim > 0 && existing[tailTrim - 1].trim() === "") tailTrim--;
  const trimmedExisting = existing.slice(0, tailTrim);
  const appended = [...trimmedExisting, newBody, ""];
  return [...before, ...appended, ...after].join("\n");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── CLI ───────────────────────────────────────────────────────────────────────
