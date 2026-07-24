#!/usr/bin/env bun
/**
 * knowledge-curate.ts — 业务知识库 CRUD + lint/index。
 * Usage:
 *   kata knowledge <action> --project <name> [...]
 * Actions: read-core | read-module | read-pitfall | write | update | index | lint
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  type IndexEntry,
  parseFrontmatter,
  searchPitfalls,
  type TermRow,
} from "../knowledge.ts";
import { knowledgeDir, knowledgePath } from "../knowledge-paths.ts";
import { parseTermsTable, scanEntries, writeIndexFile } from "./index-data.ts";

export function runReadCore(opts: { project: string }): void {
  const kdir = knowledgeDir(opts.project);
  const overview = readOverview(opts.project);
  const termsData = readTerms(opts.project);
  const modules = scanEntries(join(kdir, "modules"));
  const pitfalls = scanEntries(join(kdir, "pitfalls"));
  const sites = readSiteEntries(kdir);

  const result = {
    project: opts.project,
    overview,
    terms: termsData.terms,
    index: {
      modules,
      pitfalls,
      sites,
      overview_updated: overview.updated,
      terms_updated: termsData.updated,
      terms_count: termsData.terms.length,
    },
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function readOverview(project: string): { title: string; content: string; updated: string } {
  const ovPath = knowledgePath(project, "overview.md");
  if (!existsSync(ovPath)) return { title: "", content: "", updated: "" };
  const parsed = parseFrontmatter(readFileSync(ovPath, "utf8"));
  return {
    title: parsed.frontmatter?.title ?? "",
    content: parsed.body,
    updated: parsed.frontmatter?.updated ?? "",
  };
}

function readTerms(project: string): { terms: TermRow[]; updated: string } {
  const termsPath = knowledgePath(project, "terms.md");
  if (!existsSync(termsPath)) return { terms: [], updated: "" };
  const parsed = parseFrontmatter(readFileSync(termsPath, "utf8"));
  return {
    terms: parseTermsTable(parsed.body),
    updated: parsed.frontmatter?.updated ?? "",
  };
}

function readSiteEntries(kdir: string): IndexEntry[] {
  const sites: IndexEntry[] = [];
  const sitesDir = join(kdir, "sites");
  if (!existsSync(sitesDir)) return sites;
  for (const domainDir of readdirSync(sitesDir)) {
    const domainPath = join(sitesDir, domainDir);
    if (!statSync(domainPath).isDirectory()) continue;
    for (const entry of scanEntries(domainPath)) {
      sites.push({ ...entry, name: `sites/${domainDir}/${entry.name}` });
    }
  }
  return sites;
}

export function runReadModule(opts: { project: string; module: string }): void {
  const path = knowledgePath(opts.project, "modules", `${opts.module}.md`);
  if (!existsSync(path)) {
    process.stderr.write(`[knowledge-curate] Module not found: ${opts.module}\n`);
    process.exit(1);
  }
  const raw = readFileSync(path, "utf8");
  const parsed = parseFrontmatter(raw);
  const result = {
    project: opts.project,
    module: opts.module,
    frontmatter: parsed.frontmatter,
    content: parsed.body,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

export function runReadPitfall(opts: { project: string; query: string }): void {
  const pdir = knowledgePath(opts.project, "pitfalls");
  const files: { name: string; tags: string[]; title: string; path: string }[] = [];
  if (existsSync(pdir)) {
    for (const f of readdirSync(pdir)) {
      if (!f.endsWith(".md")) continue;
      const raw = readFileSync(join(pdir, f), "utf8");
      const parsed = parseFrontmatter(raw);
      if (!parsed.frontmatter) continue;
      files.push({
        name: f.replace(/\.md$/, ""),
        tags: parsed.frontmatter.tags,
        title: parsed.frontmatter.title,
        path: join(pdir, f),
      });
    }
  }

  const hits = searchPitfalls(opts.query, files);
  const matches = hits.flatMap((h) => {
    const f = files.find((x) => x.name === h.name);
    if (!f) return [];
    return {
      name: f.name,
      title: f.title,
      tags: f.tags,
      match_by: h.match_by,
      path: f.path,
    };
  });

  process.stdout.write(
    `${JSON.stringify({ project: opts.project, query: opts.query, matches }, null, 2)}\n`,
  );
}

export function runIndex(opts: { project: string }): void {
  const result = writeIndexFile(opts.project);
  process.stdout.write(`${JSON.stringify({ project: opts.project, ...result }, null, 2)}\n`);
}
