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

import { existsSync } from "node:fs";
import type { MarkerId, TopicBuilder } from "xmind-generator";
import { Marker, RootTopic, Topic, Workbook, writeLocalFile } from "xmind-generator";
import { loadXmindRules } from "@shared/lib/rules.ts";
import type { IntermediateJson, Meta, Module, Page, TestCase } from "@shared/lib/types.ts";

export type WriteMode = "create" | "append" | "replace";
export type RootAwareMeta = Meta & { root_name?: string };
export interface RenderOptions {
  stepsAsNotes?: boolean;
}

export interface OutputResult {
  output_path: string;
  mode: WriteMode;
  root_title: string;
  l1_title: string;
  case_count: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const UNCLASSIFIED = "未分类";

// ─── Priority map ─────────────────────────────────────────────────────────────

export const PRIORITY_MAP: Record<string, MarkerId> = {
  P0: Marker.Priority.p1,
  P1: Marker.Priority.p2,
  P2: Marker.Priority.p3,
};

// ─── Rules loader ────────────────────────────────────────────────────────────

// ─── Validation ──────────────────────────────────────────────────────────────

export function validateInput(data: unknown): asserts data is IntermediateJson {
  if (!data || typeof data !== "object") {
    throw new Error("Input must be a JSON object");
  }
  const obj = data as Record<string, unknown>;
  if (!obj.meta || typeof obj.meta !== "object") {
    throw new Error("Missing required field: meta");
  }
  const meta = obj.meta as Record<string, unknown>;
  if (!meta.project_name || typeof meta.project_name !== "string") {
    throw new Error("Missing required field: meta.project_name");
  }
  if (!meta.requirement_name || typeof meta.requirement_name !== "string") {
    throw new Error("Missing required field: meta.requirement_name");
  }
  if (!Array.isArray(obj.modules) || obj.modules.length === 0) {
    throw new Error("modules must be a non-empty array");
  }
}

// ─── Title builders ──────────────────────────────────────────────────────────

export function normalizeVersion(version: string): string {
  return version.replace(/^v/i, "");
}

export function buildRootTitle(meta: RootAwareMeta, project?: string): string {
  if (meta.root_name) {
    return meta.root_name;
  }
  if (meta.version) {
    const rules = loadXmindRules(project);
    const ver = normalizeVersion(meta.version);
    return rules.root_title_template
      .replace("{{project_name}}", meta.project_name ?? "")
      .replace("{{prd_version}}", ver)
      .replace("{{iteration_id}}", rules.iteration_id);
  }
  return meta.project_name;
}

export function buildL1Title(meta: Meta): string {
  // Strip trailing (#xxxxx) from requirement_name if present (frontmatter suite_name may include it)
  return meta.requirement_name.replace(/\(#\d+\)\s*$/, "").trim();
}

export function buildL1Labels(meta: Meta): string[] {
  if (meta.requirement_id) {
    return [`(#${meta.requirement_id})`];
  }
  return [];
}

// ─── Strip priority prefix from case title ──────────────────────────────────

export function stripPriorityPrefix(title: string): string {
  return title.replace(/^【P\d】/, "");
}

// ─── Sanitize <br> tags to newlines ─────────────────────────────────────────

export function sanitizeBr(text: string): string {
  return text.replace(/<br\s*\/?>/gi, "\n");
}

// ─── Case count ──────────────────────────────────────────────────────────────

export function countCases(modules: Module[]): number {
  let count = 0;
  for (const mod of modules) {
    for (const page of mod.pages) {
      for (const sg of page.sub_groups ?? []) {
        count += sg.test_cases.length;
      }
      count += page.test_cases?.length ?? 0;
    }
  }
  return count;
}

// ─── "未分类" flattening ─────────────────────────────────────────────────────

export function isUnclassified(name: string): boolean {
  return name === UNCLASSIFIED;
}

/**
 * Collect all cases from a page (direct + sub_groups).
 */
export function _collectPageCases(page: Page): TestCase[] {
  const cases: TestCase[] = [];
  for (const sg of page.sub_groups ?? []) {
    cases.push(...sg.test_cases);
  }
  cases.push(...(page.test_cases ?? []));
  return cases;
}

// ─── Topic tree builder (with 未分类 flattening + P0 stripping) ─────────────

export function buildCaseNote(tc: TestCase): string {
  const parts: string[] = [];
  if (tc.preconditions) {
    parts.push(`前置条件：\n${sanitizeBr(tc.preconditions)}`);
  }
  if (tc.steps.length > 0) {
    const lines = tc.steps.flatMap((s, index) => {
      const stepLines = [`${index + 1}. 步骤：${sanitizeBr(s.step)}`];
      if (s.expected) {
        stepLines.push(`   预期：${sanitizeBr(s.expected)}`);
      }
      return stepLines;
    });
    parts.push(`用例步骤：\n${lines.join("\n")}`);
  }
  return parts.join("\n\n");
}

export function buildCaseTopic(tc: TestCase, options: RenderOptions = {}): TopicBuilder {
  const caseChildren: TopicBuilder[] = options.stepsAsNotes
    ? []
    : tc.steps.map((s) => Topic(sanitizeBr(s.step)).children([Topic(sanitizeBr(s.expected))]));

  const displayTitle = stripPriorityPrefix(tc.title);
  let caseTopic =
    caseChildren.length > 0 ? Topic(displayTitle).children(caseChildren) : Topic(displayTitle);

  const marker = PRIORITY_MAP[tc.priority];
  if (marker) {
    caseTopic = caseTopic.markers([marker]);
  }

  const note = options.stepsAsNotes
    ? buildCaseNote(tc)
    : tc.preconditions
      ? sanitizeBr(tc.preconditions)
      : "";
  if (note) {
    caseTopic = caseTopic.note(note);
  }

  return caseTopic;
}

export function buildPageChildren(page: Page, options: RenderOptions = {}): TopicBuilder[] {
  const children: TopicBuilder[] = [];

  for (const sg of page.sub_groups ?? []) {
    if (sg.test_cases.length > 0) {
      const sgCases = sg.test_cases.map((tc) => buildCaseTopic(tc, options));
      children.push(Topic(sg.name).children(sgCases));
    }
  }

  for (const tc of page.test_cases ?? []) {
    children.push(buildCaseTopic(tc, options));
  }

  return children;
}

/**
 * Build topic tree with 未分类 flattening:
 * - L2=未分类 && L3=未分类 → cases promoted to parent (L1)
 * - L2=real && L3=未分类 → cases promoted to L2
 * - Otherwise → keep full hierarchy
 *
 * Returns [topics, promoted] where promoted = cases that should go directly under L1.
 */
export function buildTopicTree(
  modules: Module[],
  options: RenderOptions = {},
): {
  topics: TopicBuilder[];
  promoted: TopicBuilder[];
} {
  const topics: TopicBuilder[] = [];
  const promoted: TopicBuilder[] = [];

  for (const mod of modules) {
    if (isUnclassified(mod.name)) {
      // L2 is 未分类 — check each page
      for (const page of mod.pages) {
        if (isUnclassified(page.name)) {
          // L2=未分类, L3=未分类 → promote all cases to L1
          for (const c of buildPageChildren(page, options)) {
            promoted.push(c);
          }
        } else {
          // L2=未分类, L3=real → promote page to L2 level
          const children = buildPageChildren(page, options);
          topics.push(Topic(page.name).children(children));
        }
      }
    } else {
      // L2 is real
      const pageTopics: TopicBuilder[] = [];

      for (const page of mod.pages) {
        if (isUnclassified(page.name)) {
          // L3=未分类 → promote cases to L2
          for (const c of buildPageChildren(page, options)) {
            pageTopics.push(c);
          }
        } else {
          // L3=real → keep hierarchy
          const children = buildPageChildren(page, options);
          pageTopics.push(Topic(page.name).children(children));
        }
      }

      topics.push(Topic(mod.name).children(pageTopics));
    }
  }

  return { topics, promoted };
}

// ─── Mode: create ─────────────────────────────────────────────────────────────

export async function createXmind(
  data: IntermediateJson,
  outputPath: string,
  project?: string,
  options: RenderOptions = {},
): Promise<void> {
  if (existsSync(outputPath)) {
    throw new Error(`Output file already exists (use --mode append or replace): ${outputPath}`);
  }

  const rootTitle = buildRootTitle(data.meta, project);
  const l1Title = buildL1Title(data.meta);
  const { topics: l2Topics, promoted } = buildTopicTree(data.modules, options);

  const l1Children = [...promoted, ...l2Topics];
  let l1 = Topic(l1Title).children(l1Children);
  const l1Labels = buildL1Labels(data.meta);
  if (l1Labels.length > 0) {
    l1 = l1.labels(l1Labels);
  }
  const root = RootTopic(rootTitle).children([l1]);
  const wb = Workbook(root);
  await writeLocalFile(wb, outputPath);
}

// ─── Mode: append / replace (raw nodes) ─────────────────────────────────────
