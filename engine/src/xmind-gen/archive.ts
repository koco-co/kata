#!/usr/bin/env bun
/**
 * xmind-gen.ts — Converts intermediate JSON or Archive Markdown to .xmind files.
 *
 * Usage:
 *   kata xmind-gen --input <json|md|dir> --output <xmind> [--mode create|append|replace]
 *   kata xmind-gen --input <dir>           (batch convert all .md in dir)
 *   kata xmind-gen --input <md> --json-only (output intermediate JSON only)
 *   kata xmind-gen --help
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { splitMdTableRow } from "@shared/lib/md-table.ts";
import type {
  IntermediateJson,
  Module,
  Page,
  SubGroup,
  TestCase,
  TestStep,
} from "@shared/lib/types.ts";
import type { RootAwareMeta } from "./render.ts";
import { UNCLASSIFIED } from "./render.ts";

export interface ArchiveFrontMatter {
  suite_name?: string;
  case_id?: number;
  [key: string]: unknown;
}

export function parseFrontMatter(content: string): {
  fm: ArchiveFrontMatter;
  body: string;
} {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { fm: {}, body: content };

  const fm: ArchiveFrontMatter = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w[\w_]*)\s*:\s*(.+)$/);
    if (kv) {
      const key = kv[1];
      let val: string | number = kv[2].trim().replace(/^"(.*)"$/, "$1");
      if (/^\d+$/.test(val)) val = Number(val);
      fm[key] = val;
    }
  }
  return { fm, body: m[2] };
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
  state.currentSubGroup = null;
  state.currentPage = null;
  state.currentModule = { name, pages: [] };
  state.modules.push(state.currentModule);
  return true;
}

function openArchivePage(state: ArchiveParseState, name: string): true {
  flushArchiveCase(state);
  state.currentSubGroup = null;
  state.currentPage = { name };
  ensureCurrentModule(state).pages.push(state.currentPage);
  return true;
}

function openArchiveSubGroup(state: ArchiveParseState, name: string): true {
  flushArchiveCase(state);
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
  state.currentCase = { title: caseTitle, priority, steps: [] };
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
  const cells = splitMdTableRow(line).filter((c) => c.length > 0);
  if (cells.length < 3) return;
  state.stepsRows.push({
    step: cells[1].replace(/<br\s*\/?>/gi, "\n"),
    expected: cells[2].replace(/<br\s*\/?>/gi, "\n"),
  });
}

export function archiveToJson(
  mdPath: string,
  projectName: string,
  version?: string,
): IntermediateJson {
  const raw = readFileSync(mdPath, "utf-8");
  const { fm, body } = parseFrontMatter(raw);

  const suiteName = typeof fm.suite_name === "string" ? fm.suite_name : basename(mdPath, ".md");
  const prdId =
    typeof fm.prd_id === "number"
      ? fm.prd_id
      : typeof fm.case_id === "number"
        ? fm.case_id
        : undefined;

  // Resolve version: CLI --version > frontmatter prd_version
  const resolvedVersion =
    version ?? (typeof fm.prd_version === "string" ? fm.prd_version : undefined);

  // Resolve project name: frontmatter root_name > CLI --project
  const resolvedProject = typeof fm.root_name === "string" ? fm.root_name : projectName;

  const modules = parseArchiveBody(body);

  const meta: RootAwareMeta = {
    project_name: resolvedProject,
    requirement_name: suiteName,
  };

  if (typeof fm.root_name === "string") {
    meta.root_name = fm.root_name;
  }

  if (resolvedVersion) {
    meta.version = resolvedVersion;
  }

  if (prdId) {
    meta.requirement_id = prdId;
  }

  return { meta, modules };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
