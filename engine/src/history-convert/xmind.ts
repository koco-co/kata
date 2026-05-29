#!/usr/bin/env bun
/**
 * history-convert.ts — Convert historical CSV/XMind files to Archive Markdown.
 *
 * Usage:
 *   kata history-convert --path <file-or-dir> --project <name> [--module <key>] [--detect] [--force] [--no-split]
 *   kata history-convert --help
 */

import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { buildMarkdown, todayString } from "@shared/lib/frontmatter.ts";
import { extractDevVersions } from "./csv.ts";
import { parseL1Title } from "./paths.ts";
import { inferTags } from "./tags.ts";
import type { XMindSheet, XMindTopicNode } from "./types.ts";

export const MARKER_TO_PRIORITY: Record<string, string> = {
  "priority-1": "P0",
  "priority-2": "P1",
  "priority-3": "P2",
};

export async function readXmindContentJson(filePath: string): Promise<XMindSheet[]> {
  const buffer = readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const contentFile = zip.file("content.json");
  if (!contentFile) throw new Error("content.json not found in .xmind archive");
  const str = await contentFile.async("string");
  return JSON.parse(str) as XMindSheet[];
}

/** Extract priority from XMind topic markers */
export function extractPriority(node: XMindTopicNode): string {
  const markers = (node as Record<string, unknown>).markers as
    | Array<{ markerId?: string }>
    | undefined;
  if (!markers) return "P2";
  for (const m of markers) {
    if (m.markerId && MARKER_TO_PRIORITY[m.markerId]) {
      return MARKER_TO_PRIORITY[m.markerId];
    }
  }
  // Also check title for existing priority prefix
  const titleMatch = (node.title ?? "").match(/【(P[012])】/);
  if (titleMatch) return titleMatch[1];
  return "P2";
}

/** Extract preconditions from XMind topic notes */
export function extractNotes(node: XMindTopicNode): string {
  const notes = (node as Record<string, unknown>).notes as
    | { plain?: { content?: string } }
    | undefined;
  return notes?.plain?.content ?? "";
}

/** Strip priority prefix from title if already present */
export function stripPriorityPrefix(title: string): string {
  return title.replace(/^【P[012]】\s*/, "").trim();
}

/**
 * Determine if a node is a "case" node (has step→expected children structure)
 * or a structural grouping node (has children that are themselves groups/cases).
 *
 * Heuristic: a case node's children represent steps (each step's child = expected result).
 * If a node has markers (priority), it's likely a case.
 * If a node's children also have children with further depth, it's a grouping node.
 */
export function isCaseNode(node: XMindTopicNode): boolean {
  const markers = (node as Record<string, unknown>).markers as
    | Array<{ markerId?: string }>
    | undefined;
  if (markers && markers.length > 0) return true;
  // Title starts with priority prefix
  if (/^【P[012]】/.test(node.title ?? "")) return true;
  // If this node has children and grandchildren but no great-grandchildren, likely a case
  const children = node.children?.attached ?? [];
  if (children.length === 0) return true; // Leaf = case (no steps)
  // Check if children look like steps (text with at most 1 child = expected)
  const allChildrenAreStepLike = children.every((child) => {
    const grandchildren = child.children?.attached ?? [];
    return grandchildren.length <= 1;
  });
  return allChildrenAreStepLike;
}

/** Extract steps from a case node's children: child = step, grandchild = expected */
export function extractSteps(node: XMindTopicNode): { step: string; expected: string }[] {
  const children = node.children?.attached ?? [];
  return children.map((child) => {
    const expected = child.children?.attached?.[0]?.title ?? "";
    return { step: child.title ?? "", expected };
  });
}

/** Parsed L1 node representing one requirement/suite */
export interface ParsedL1 {
  title: string;
  modules: ParsedModule[];
  totalCases: number;
}

export interface ParsedModule {
  name: string;
  pages: ParsedPage[];
}

export interface ParsedPage {
  name: string;
  subGroups: ParsedSubGroup[];
  cases: ParsedCase[];
}

export interface ParsedSubGroup {
  name: string;
  cases: ParsedCase[];
}

export interface ParsedCase {
  title: string;
  priority: string;
  preconditions: string;
  steps: { step: string; expected: string }[];
}

export function cloneParsedCase(c: ParsedCase): ParsedCase {
  return {
    title: c.title,
    priority: c.priority,
    preconditions: c.preconditions,
    steps: c.steps.map((step) => ({ ...step })),
  };
}

export function cloneParsedSubGroup(sg: ParsedSubGroup): ParsedSubGroup {
  return {
    name: sg.name,
    cases: sg.cases.map(cloneParsedCase),
  };
}

export function cloneParsedPage(page: ParsedPage): ParsedPage {
  return {
    name: page.name,
    subGroups: page.subGroups.map(cloneParsedSubGroup),
    cases: page.cases.map(cloneParsedCase),
  };
}

export function cloneParsedModule(mod: ParsedModule): ParsedModule {
  return {
    name: mod.name,
    pages: mod.pages.map(cloneParsedPage),
  };
}

export function countParsedCasesInModules(modules: ParsedModule[]): number {
  let total = 0;
  for (const mod of modules) {
    for (const page of mod.pages) {
      total += page.cases.length;
      for (const sg of page.subGroups) {
        total += sg.cases.length;
      }
    }
  }
  return total;
}

export function mergeParsedPages(target: ParsedPage[], incoming: ParsedPage[]): void {
  for (const page of incoming) {
    const existingPage = target.find((entry) => entry.name === page.name);
    if (!existingPage) {
      target.push(cloneParsedPage(page));
      continue;
    }

    existingPage.cases.push(...page.cases.map(cloneParsedCase));

    for (const sg of page.subGroups) {
      const existingSubGroup = existingPage.subGroups.find((entry) => entry.name === sg.name);
      if (!existingSubGroup) {
        existingPage.subGroups.push(cloneParsedSubGroup(sg));
        continue;
      }
      existingSubGroup.cases.push(...sg.cases.map(cloneParsedCase));
    }
  }
}

export function mergeParsedModules(target: ParsedModule[], incoming: ParsedModule[]): void {
  for (const mod of incoming) {
    const existingModule = target.find((entry) => entry.name === mod.name);
    if (!existingModule) {
      target.push(cloneParsedModule(mod));
      continue;
    }
    mergeParsedPages(existingModule.pages, mod.pages);
  }
}

export function mergeParsedL1s(l1s: ParsedL1[]): ParsedL1[] {
  const merged: ParsedL1[] = [];

  for (const l1 of l1s) {
    const existing = merged.find((entry) => entry.title === l1.title);
    if (!existing) {
      merged.push({
        title: l1.title,
        modules: l1.modules.map(cloneParsedModule),
        totalCases: l1.totalCases,
      });
      continue;
    }

    mergeParsedModules(existing.modules, l1.modules);
    existing.totalCases = countParsedCasesInModules(existing.modules);
  }

  return merged;
}

/** Parse an L2 (module) node and all its descendants */
export function parseL2Module(l2: XMindTopicNode): ParsedModule {
  const pages: ParsedPage[] = [];
  const l2Children = l2.children?.attached ?? [];

  for (const l3 of l2Children) {
    if (isCaseNode(l3)) {
      ensureFallbackPage(pages).cases.push(parsedCaseFromNode(l3));
      continue;
    }
    pages.push(parsePageNode(l3));
  }

  return { name: l2.title ?? "未分类", pages };
}

function ensureFallbackPage(pages: ParsedPage[]): ParsedPage {
  const existing = pages.find((p) => p.name === "未分类");
  if (existing) return existing;
  const fallbackPage: ParsedPage = { name: "未分类", subGroups: [], cases: [] };
  pages.push(fallbackPage);
  return fallbackPage;
}

function parsedCaseFromNode(node: XMindTopicNode): ParsedCase {
  return {
    title: stripPriorityPrefix(node.title ?? ""),
    priority: extractPriority(node),
    preconditions: extractNotes(node),
    steps: extractSteps(node),
  };
}

function parsePageNode(l3: XMindTopicNode): ParsedPage {
  const page: ParsedPage = { name: l3.title ?? "", subGroups: [], cases: [] };
  for (const l4 of l3.children?.attached ?? []) {
    if (isCaseNode(l4)) page.cases.push(parsedCaseFromNode(l4));
    else page.subGroups.push(parseSubGroupNode(l4));
  }
  return page;
}

function parseSubGroupNode(l4: XMindTopicNode): ParsedSubGroup {
  return {
    name: l4.title ?? "",
    cases: (l4.children?.attached ?? []).map(parsedCaseFromNode),
  };
}

/** Parse all L1 nodes from XMind sheets, each L1 becomes a separate file */
export function parseXmindToL1s(sheets: XMindSheet[]): ParsedL1[] {
  const l1s: ParsedL1[] = [];

  for (const sheet of sheets) {
    const root = sheet.rootTopic;
    if (!root) continue;
    for (const l1Node of root.children?.attached ?? []) {
      l1s.push(parseL1Node(l1Node));
    }
  }

  return l1s;
}

function parseL1Node(l1Node: XMindTopicNode): ParsedL1 {
  const modules: ParsedModule[] = [];
  for (const l2Node of l1Node.children?.attached ?? []) {
    if (isCaseNode(l2Node)) addCaseToFallbackModule(modules, l2Node);
    else modules.push(parseL2Module(l2Node));
  }
  return {
    title: l1Node.title ?? "未命名需求",
    modules,
    totalCases: countParsedCasesInModules(modules),
  };
}

function addCaseToFallbackModule(modules: ParsedModule[], node: XMindTopicNode): void {
  let fallbackMod = modules.find((m) => m.name === "未分类");
  if (!fallbackMod) {
    fallbackMod = { name: "未分类", pages: [] };
    modules.push(fallbackMod);
  }
  ensureFallbackPage(fallbackMod.pages).cases.push(parsedCaseFromNode(node));
}

/** Render a single parsed case to Markdown lines */
export function renderCase(c: ParsedCase): string[] {
  const lines: string[] = [];
  lines.push(`##### 【${c.priority}】${c.title}`);
  lines.push("");

  if (c.preconditions) {
    lines.push("> 前置条件");
    lines.push("```");
    lines.push(c.preconditions);
    lines.push("```");
    lines.push("");
  }

  if (c.steps.length > 0) {
    lines.push("> 用例步骤");
    lines.push("");
    lines.push("| 编号 | 步骤 | 预期 |");
    lines.push("| --- | --- | --- |");
    for (let i = 0; i < c.steps.length; i++) {
      const s = c.steps[i];
      const step = s.step.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
      const exp = s.expected.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
      lines.push(`| ${i + 1} | ${step} | ${exp} |`);
    }
    lines.push("");
  }

  return lines;
}

/**
 * Merge all L1s into a single Archive Markdown (--no-split mode).
 * L1 titles become H2 headings; L2→H3, L3→H4, sub-groups/cases shift accordingly.
 */
export function allL1sToMarkdown(l1s: ParsedL1[], suiteName: string, prdVersion?: string): string {
  const names = collectL1Names(l1s);
  const fm: Record<string, string | number | boolean | string[]> = {
    suite_name: suiteName,
    description: `${suiteName}用例归档`,
    tags: inferTags({ suiteName, ...names }),
    prd_version: prdVersion ?? "",
    dev_version: extractDevVersions(l1s.map((l) => l.title)),
    create_at: todayString(),
    status: "草稿",
    origin: "xmind",
    case_count: l1s.reduce((sum, l1) => sum + l1.totalCases, 0),
  };

  const bodyParts: string[] = [];
  for (const l1 of l1s) appendL1Body(bodyParts, l1);
  return buildMarkdown(fm, bodyParts.join("\n"));
}

/** Render a single parsed case to Markdown lines */
export function l1ToMarkdown(l1: ParsedL1, prdVersion?: string): string {
  const names = collectModuleNames(l1.modules);
  const { name: cleanName, caseId } = parseL1Title(l1.title);
  const fm: Record<string, string | number | boolean | string[]> = {
    suite_name: l1.title,
    description: `${cleanName}用例归档`,
    tags: inferTags({ suiteName: l1.title, ...names }),
    prd_version: prdVersion ?? "",
    dev_version: extractDevVersions([l1.title]),
    create_at: todayString(),
    status: "草稿",
    origin: "xmind",
    case_count: l1.totalCases,
  };
  if (caseId) fm.case_id = Number(caseId);

  const bodyParts: string[] = [];
  for (const mod of l1.modules) appendModuleBody(bodyParts, mod, 2, false);
  return buildMarkdown(fm, bodyParts.join("\n"));
}

function collectL1Names(l1s: ParsedL1[]): {
  modules: string[];
  pages: string[];
  subGroups: string[];
  caseTitles: string[];
} {
  const names = {
    modules: [] as string[],
    pages: [] as string[],
    subGroups: [] as string[],
    caseTitles: [] as string[],
  };
  for (const l1 of l1s) {
    names.modules.push(l1.title);
    mergeNameBuckets(names, collectModuleNames(l1.modules));
  }
  return names;
}

function collectModuleNames(modules: ParsedModule[]) {
  const moduleNames: string[] = [];
  const pageNames: string[] = [];
  const subGroupNames: string[] = [];
  const caseTitles: string[] = [];

  for (const mod of modules) {
    moduleNames.push(mod.name);
    for (const page of mod.pages) {
      pageNames.push(page.name);
      for (const c of page.cases) caseTitles.push(c.title);
      for (const sg of page.subGroups) {
        subGroupNames.push(sg.name);
        for (const c of sg.cases) caseTitles.push(c.title);
      }
    }
  }
  return { modules: moduleNames, pages: pageNames, subGroups: subGroupNames, caseTitles };
}

function mergeNameBuckets(
  target: ReturnType<typeof collectModuleNames>,
  source: ReturnType<typeof collectModuleNames>,
): void {
  target.modules.push(...source.modules);
  target.pages.push(...source.pages);
  target.subGroups.push(...source.subGroups);
  target.caseTitles.push(...source.caseTitles);
}

function appendL1Body(bodyParts: string[], l1: ParsedL1): void {
  bodyParts.push(`## ${l1.title}`, "");
  for (const mod of l1.modules) appendModuleBody(bodyParts, mod, 3, true);
}

function appendModuleBody(
  bodyParts: string[],
  mod: ParsedModule,
  level: 2 | 3,
  subGroupBold: boolean,
): void {
  bodyParts.push(`${"#".repeat(level)} ${mod.name}`, "");
  for (const page of mod.pages) appendPageBody(bodyParts, page, level + 1, subGroupBold);
}

function appendPageBody(
  bodyParts: string[],
  page: ParsedPage,
  level: number,
  subGroupBold: boolean,
): void {
  bodyParts.push(`${"#".repeat(level)} ${page.name}`, "");
  for (const c of page.cases) bodyParts.push(...renderCase(c));
  for (const sg of page.subGroups) appendSubGroupBody(bodyParts, sg, level + 1, subGroupBold);
}

function appendSubGroupBody(
  bodyParts: string[],
  sg: ParsedSubGroup,
  level: number,
  subGroupBold: boolean,
): void {
  bodyParts.push(subGroupBold ? `**${sg.name}**` : `${"#".repeat(level)} ${sg.name}`, "");
  for (const c of sg.cases) bodyParts.push(...renderCase(c));
}
