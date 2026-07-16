#!/usr/bin/env bun
/**
 * knowledge-curate.ts — 业务知识库 CRUD + lint/index。
 * Usage:
 *   kata knowledge <action> --project <name> [...]
 * Actions: read-core | read-module | read-pitfall | write | update | index | lint
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  autoFixFrontmatter,
  type ContentTerm,
  type IndexData,
  type IndexEntry,
  parseFrontmatter,
  renderIndex,
  type TermRow,
  todayIso,
} from "@shared/lib/knowledge.ts";
import { knowledgeDir } from "@shared/lib/paths.ts";

export function scanEntries(dir: string): IndexEntry[] {
  if (!existsSync(dir)) return [];
  const entries: IndexEntry[] = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".md")) continue;
    const raw = readFileSync(join(dir, f), "utf8");
    const parsed = parseFrontmatter(raw);
    if (!parsed.frontmatter) continue;
    entries.push({
      name: f.replace(/\.md$/, ""),
      title: parsed.frontmatter.title,
      tags: parsed.frontmatter.tags,
      updated: parsed.frontmatter.updated,
      confidence: parsed.frontmatter.confidence,
    });
  }
  return entries;
}

export function parseTermsTable(body: string): TermRow[] {
  const rows: TermRow[] = [];
  const lines = body.split("\n");
  let inTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      if (cells.some((c) => /^-+$/.test(c))) {
        inTable = true;
        continue;
      }
      if (!inTable) continue;
      if (cells[0] === "术语" || cells[0] === "Term") continue;
      if (cells.length >= 4) {
        rows.push({
          term: cells[0],
          zh: cells[1],
          desc: cells[2],
          alias: cells[3],
        });
      }
    }
  }
  return rows;
}

export function gatherIndexData(projectName: string): {
  data: IndexData;
  fixedFiles: string[];
} {
  const kdir = knowledgeDir(projectName);
  const today = todayIso();
  const fixedFiles: string[] = [];
  fixSingleKnowledgeFiles(kdir, today, fixedFiles);

  const modules = scanAndFixKnowledgeDir(kdir, "modules", today, fixedFiles);
  const pitfalls = scanAndFixKnowledgeDir(kdir, "pitfalls", today, fixedFiles);
  const sites = scanAndFixSites(kdir, today, fixedFiles);

  return {
    data: {
      modules,
      pitfalls,
      sites,
      overview_updated: readKnowledgeUpdated(kdir, "overview.md"),
      terms_updated: readKnowledgeUpdated(kdir, "terms.md"),
      terms_count: readTermsCount(kdir),
    },
    fixedFiles,
  };
}

function fixSingleKnowledgeFiles(kdir: string, today: string, fixedFiles: string[]): void {
  for (const single of ["overview.md", "terms.md"]) {
    const full = join(kdir, single);
    if (!existsSync(full)) continue;
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
  subdir: "modules" | "pitfalls",
  today: string,
  fixedFiles: string[],
): IndexEntry[] {
  const dir = join(kdir, subdir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    if (!f.endsWith(".md")) return [];
    return scanAndFixKnowledgeFile(
      join(dir, f),
      f.replace(/\.md$/, ""),
      `${subdir}/${f}`,
      today,
      fixedFiles,
    );
  });
}

function scanAndFixSites(kdir: string, today: string, fixedFiles: string[]): IndexEntry[] {
  const sites: IndexEntry[] = [];
  const sitesDir = join(kdir, "sites");
  if (!existsSync(sitesDir)) return sites;
  for (const domainDir of readdirSync(sitesDir)) {
    const domainPath = join(sitesDir, domainDir);
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
        ),
      );
    }
  }
  return sites;
}

function scanAndFixKnowledgeFile(
  full: string,
  name: string,
  fixedName: string,
  today: string,
  fixedFiles: string[],
): IndexEntry[] {
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
      confidence: parsed.frontmatter.confidence,
    },
  ];
}

function readKnowledgeUpdated(kdir: string, name: string): string {
  const path = join(kdir, name);
  if (!existsSync(path)) return "";
  const parsed = parseFrontmatter(readFileSync(path, "utf8"));
  return parsed.frontmatter?.updated ?? "";
}

function readTermsCount(kdir: string): number {
  const termsPath = join(kdir, "terms.md");
  if (!existsSync(termsPath)) return 0;
  const parsed = parseFrontmatter(readFileSync(termsPath, "utf8"));
  return parsed.body.split("\n").filter(isTermTableDataRow).length;
}

function isTermTableDataRow(line: string): boolean {
  const t = line.trim();
  return (
    t.startsWith("|") &&
    t.endsWith("|") &&
    !t.includes("---") &&
    !t.startsWith("| 术语") &&
    !t.startsWith("| Term")
  );
}

export function writeIndexFile(projectName: string): {
  modules_count: number;
  pitfalls_count: number;
  sites_count: number;
  fixed_frontmatter: string[];
  written: string;
} {
  const { data, fixedFiles } = gatherIndexData(projectName);
  const out = renderIndex(projectName, data);
  const indexPath = join(knowledgeDir(projectName), "_index.md");
  writeFileSync(indexPath, out);
  return {
    modules_count: data.modules.length,
    pitfalls_count: data.pitfalls.length,
    sites_count: data.sites.length,
    fixed_frontmatter: fixedFiles,
    written: indexPath,
  };
}

export function renderTermRow(t: ContentTerm): string {
  return `| ${t.term} | ${t.zh} | ${t.desc} | ${t.alias} |`;
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

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function upsertTermRow(body: string, newRow: string, term: string): string {
  const lines = body.split("\n");
  const rowPrefix = `| ${term} |`;

  let replacedIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trimStart().startsWith(rowPrefix)) {
      replacedIdx = i;
      break;
    }
  }

  if (replacedIdx !== -1) {
    return [...lines.slice(0, replacedIdx), newRow, ...lines.slice(replacedIdx + 1)].join("\n");
  }

  // Find last table row (| ... |) and insert after it
  let lastRowIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i].trim();
    if (t.startsWith("|") && t.endsWith("|")) {
      lastRowIdx = i;
      break;
    }
  }
  if (lastRowIdx === -1) {
    // No table, just append
    const trailingNewline = body.endsWith("\n") ? "" : "\n";
    return `${body}${trailingNewline}${newRow}\n`;
  }
  return [...lines.slice(0, lastRowIdx + 1), newRow, ...lines.slice(lastRowIdx + 1)].join("\n");
}

// ── CLI ───────────────────────────────────────────────────────────────────────
