#!/usr/bin/env bun
/**
 * xmind-gen.ts — Converts intermediate JSON or Archive Markdown to .xmind files.
 *
 * Usage:
 *   kata xmind generate --input <json|md|dir> --output <xmind> [--mode create|append|replace]
 *   kata xmind generate --input <dir>           (batch convert all .md in dir)
 *   kata xmind generate --input <md> --json-only (output intermediate JSON only)
 *   kata xmind generate --help
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { parseFrontMatter as parseGenericFrontMatter } from "./frontmatter.ts";
import type {
  IntermediateJson,
  Module,
  Page,
  SubGroup,
  TestCase,
  TestStep,
} from "./intermediate-types.ts";
import { splitMdTableRow } from "./md-table.ts";
import type { RootAwareMeta } from "./xmind-render.ts";
import { UNCLASSIFIED } from "./xmind-render.ts";

export interface ArchiveFrontMatter {
  suite_name?: string;
  tags?: string[];
  [key: string]: unknown;
}

export function parseFrontMatter(content: string): {
  fm: ArchiveFrontMatter;
  body: string;
} {
  const parsed = parseGenericFrontMatter(content);
  return { fm: parsed.frontMatter as ArchiveFrontMatter, body: parsed.body };
}

type ArchiveSection = "none" | "precondition" | "steps";

interface ArchiveParseState {
  modules: Module[];
  currentModule: Module | null;
  currentPage: Page | null;
  currentSubGroup: SubGroup | null;
  currentCase: TestCase | null;
  section: ArchiveSection;
  preconditionLines: string[];
  inCodeBlock: boolean;
  stepsRows: TestStep[];
  headerParsed: boolean;
  pendingCaseId: string | null;
}

export function parseArchiveBody(body: string): Module[] {
  const state = createArchiveParseState();

  for (const line of body.split("\n")) {
    processArchiveLine(state, line);
  }

  flushArchiveCase(state);
  return state.modules;
}

function createArchiveParseState(): ArchiveParseState {
  return {
    modules: [],
    currentModule: null,
    currentPage: null,
    currentSubGroup: null,
    currentCase: null,
    section: "none",
    preconditionLines: [],
    inCodeBlock: false,
    stepsRows: [],
    headerParsed: false,
    pendingCaseId: null,
  };
}

function flushArchiveCase(state: ArchiveParseState) {
  if (!state.currentCase) return;
  state.currentCase.steps = state.stepsRows;
  if (state.preconditionLines.length > 0) {
    state.currentCase.preconditions = state.preconditionLines.join("\n").trim();
  }

  if (state.currentSubGroup) {
    state.currentSubGroup.test_cases.push(state.currentCase);
  } else if (state.currentPage) {
    if (!state.currentPage.test_cases) state.currentPage.test_cases = [];
    state.currentPage.test_cases.push(state.currentCase);
  }

  state.currentCase = null;
  state.stepsRows = [];
  state.preconditionLines = [];
  state.section = "none";
  state.headerParsed = false;
}

function processArchiveLine(state: ArchiveParseState, line: string) {
  const caseId = line.match(/^<!--\s*case_id:\s*([A-Za-z0-9][A-Za-z0-9._-]*)\s*-->$/);
  if (caseId) {
    state.pendingCaseId = caseId[1];
    return;
  }
  if (processArchiveHeading(state, line)) return;
  processArchiveCaseLine(state, line);
}

function processArchiveHeading(state: ArchiveParseState, line: string): boolean {
  const h2 = line.match(/^## (.+)$/);
  if (h2) return openArchiveModule(state, h2[1].trim());

  const h3 = line.match(/^### (.+)$/);
  if (h3) return openArchivePage(state, h3[1].trim());

  const h4 = line.match(/^#### (.+)$/);
  if (h4) return openArchiveSubGroup(state, h4[1].trim());

  const h5 = line.match(/^##### (.+)$/);
  if (h5) return openArchiveCase(state, h5[1].trim());

  return false;
}

function openArchiveModule(state: ArchiveParseState, name: string): true {
  flushArchiveCase(state);
  // 标题出现即作废旧锚点,避免 case_id 错挂到远处下一个用例
  state.pendingCaseId = null;
  state.currentSubGroup = null;
  state.currentPage = null;
  state.currentModule = { name, pages: [] };
  state.modules.push(state.currentModule);
  return true;
}

function openArchivePage(state: ArchiveParseState, name: string): true {
  flushArchiveCase(state);
  state.pendingCaseId = null;
  state.currentSubGroup = null;
  state.currentPage = { name };
  ensureCurrentModule(state).pages.push(state.currentPage);
  return true;
}

function openArchiveSubGroup(state: ArchiveParseState, name: string): true {
  flushArchiveCase(state);
  state.pendingCaseId = null;
  state.currentSubGroup = { name, test_cases: [] };
  if (state.currentPage) {
    if (!state.currentPage.sub_groups) state.currentPage.sub_groups = [];
    state.currentPage.sub_groups.push(state.currentSubGroup);
  }
  return true;
}

function openArchiveCase(state: ArchiveParseState, caseTitle: string): true {
  flushArchiveCase(state);
  const pm = caseTitle.match(/^【(P\d)】/);
  const priority = pm ? pm[1] : "P1";
  ensureCurrentPage(state);
  state.currentCase = {
    ...(state.pendingCaseId ? { case_id: state.pendingCaseId } : {}),
    title: caseTitle,
    priority,
    steps: [],
  };
  state.pendingCaseId = null;
  state.section = "none";
  return true;
}

function ensureCurrentModule(state: ArchiveParseState): Module {
  if (state.currentModule) return state.currentModule;
  state.currentModule = { name: UNCLASSIFIED, pages: [] };
  state.modules.push(state.currentModule);
  return state.currentModule;
}

function ensureCurrentPage(state: ArchiveParseState): Page {
  if (state.currentPage) return state.currentPage;
  state.currentPage = { name: UNCLASSIFIED };
  ensureCurrentModule(state).pages.push(state.currentPage);
  return state.currentPage;
}

function processArchiveCaseLine(state: ArchiveParseState, line: string) {
  if (!state.currentCase) return;

  if (line.match(/^>\s*前置条件/)) {
    state.section = "precondition";
    state.inCodeBlock = false;
    return;
  }

  if (line.match(/^>\s*用例步骤/)) {
    state.section = "steps";
    state.headerParsed = false;
    return;
  }

  if (state.section === "precondition") {
    processArchivePreconditionLine(state, line);
  } else if (state.section === "steps") {
    processArchiveStepsLine(state, line);
  }
}

function processArchivePreconditionLine(state: ArchiveParseState, line: string) {
  if (line.startsWith("```")) {
    state.inCodeBlock = !state.inCodeBlock;
    return;
  }
  if (state.inCodeBlock) {
    state.preconditionLines.push(line);
  }
}

function processArchiveStepsLine(state: ArchiveParseState, line: string) {
  if (line.trim() === "") return;
  if (line.match(/^\|\s*编号\s*\|/) || line.match(/^\|\s*-+\s*\|/)) {
    state.headerParsed = true;
    return;
  }
  if (state.headerParsed && line.startsWith("|")) {
    appendArchiveStepRow(state, line);
  }
}

function appendArchiveStepRow(state: ArchiveParseState, line: string) {
  const cells = splitMdTableRow(line);
  if (cells[0] === "") cells.shift();
  if (cells.at(-1) === "") cells.pop();
  if (cells.length < 3) return;
  state.stepsRows.push({
    step: decodeMarkdownCell(cells[1]),
    expected: decodeMarkdownCell(cells[2]),
  });
}

function decodeMarkdownCell(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\\\|/g, "|")
    .replace(/\\\\/g, "\\");
}

function buildArchiveMeta(
  fm: ArchiveFrontMatter,
  mdPath: string,
  projectName: string,
  version?: string,
): RootAwareMeta {
  const requirementName =
    typeof fm.suite_name === "string" ? fm.suite_name : basename(mdPath, ".md");
  const resolvedProject =
    typeof fm.product_line === "string"
      ? fm.product_line
      : typeof fm.root_name === "string"
        ? fm.root_name
        : projectName;
  const meta: RootAwareMeta = {
    project_name: resolvedProject,
    requirement_name: requirementName,
  };
  const resolvedVersion =
    version ?? (typeof fm.prd_version === "string" ? fm.prd_version : undefined);

  if (typeof fm.root_name === "string") meta.root_name = fm.root_name;
  if (resolvedVersion) meta.version = resolvedVersion;
  if (typeof fm.prd_id === "number") meta.requirement_id = fm.prd_id;
  if (Array.isArray(fm.tags)) {
    meta.tags = fm.tags.filter((tag): tag is string => typeof tag === "string");
  }
  if (typeof fm.description === "string") meta.description = fm.description;
  if (typeof fm.create_at === "string") meta.create_at = fm.create_at;
  if (typeof fm.status === "string") meta.status = fm.status;
  return meta;
}

export function archiveToJson(
  mdPath: string,
  projectName: string,
  version?: string,
): IntermediateJson {
  const raw = readFileSync(mdPath, "utf-8");
  const { fm, body } = parseFrontMatter(raw);
  const modules = parseArchiveBody(body);
  return { meta: buildArchiveMeta(fm, mdPath, projectName, version), modules };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
