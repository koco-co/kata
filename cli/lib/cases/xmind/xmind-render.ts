#!/usr/bin/env bun
/**
 * xmind-gen.ts — Converts intermediate JSON or Archive Markdown to .xmind files.
 *
 * Usage:
 * Internal XMind renderer. Public conversion is exposed through
 * `kata cases import` and `kata cases build`, with YAML as the intermediate state.
 */

import { createHash, randomBytes } from "node:crypto";
import { existsSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import JSZip from "jszip";
import type { MarkerId, TopicBuilder } from "xmind-generator";
import { Marker, RootTopic, Topic, Workbook } from "xmind-generator";
import { writeFileAtomic } from "../../atomic-writer.ts";
import type { IntermediateJson, Meta, Module, Page, TestCase } from "../../intermediate-types.ts";
import { buildRootName } from "../../xmind-rules.ts";
import { normalizeStructuredText } from "../normalize.ts";

export type WriteMode = "create" | "append" | "replace";
export type RootAwareMeta = Meta;
export interface RenderOptions {
  stepsAsNotes?: boolean;
  /** stepsAsNotes 仅对步骤数达到阈值的用例生效(默认 3);短用例保留大纲步骤节点 */
  stepsAsNotesMinSteps?: number;
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

const XMindEpoch = new Date(0);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function stableUuid(seed: string): string {
  const hex = createHash("sha256").update(`kata-xmind:${seed}`).digest("hex");
  const versioned = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${(
    8 + (parseInt(hex.slice(16, 17), 16) % 4)
  ).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  return versioned;
}

function normalizeContentIds(value: unknown, path: string): unknown {
  if (Array.isArray(value))
    return value.map((item, index) => normalizeContentIds(item, `${path}/${index}`));
  if (!value || typeof value !== "object") return value;
  const object = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(object)) {
    if ((key === "id" || key === "revisionId") && typeof item === "string" && UUID_RE.test(item)) {
      normalized[key] = stableUuid(`${path}/${key}`);
    } else {
      normalized[key] = normalizeContentIds(item, `${path}/${key}`);
    }
  }
  return normalized;
}

interface FoldableTopic {
  branch?: string;
  children?: { attached?: FoldableTopic[] };
}

/** Return a copy with the root expanded and every non-root branch folded. */
export function applyProgressiveFolding(content: unknown): unknown {
  if (!Array.isArray(content)) return content;
  const folded = structuredClone(content);
  const visit = (topic: FoldableTopic, isRoot: boolean): void => {
    const children = topic.children?.attached ?? [];
    if (isRoot) delete topic.branch;
    else if (children.length > 0) topic.branch = "folded";
    else delete topic.branch;
    for (const child of children) visit(child, false);
  };
  for (const sheet of folded) {
    if (!sheet || typeof sheet !== "object") continue;
    const rootTopic = (sheet as { rootTopic?: FoldableTopic }).rootTopic;
    if (rootTopic) visit(rootTopic, true);
  }
  return folded;
}

/** Normalize folding, generated UUIDs and ZIP timestamps for repeatable builds. */
export async function normalizeXmindBuffer(input: Buffer): Promise<Buffer> {
  const source = await JSZip.loadAsync(input);
  const output = new JSZip();
  for (const name of Object.keys(source.files).sort()) {
    const entry = source.files[name];
    let content: string | Buffer;
    if (name === "content.json") {
      const parsed = JSON.parse(await entry.async("string"));
      const folded = applyProgressiveFolding(parsed);
      content = `${JSON.stringify(normalizeContentIds(folded, "content"))}\n`;
    } else {
      content = await entry.async("nodebuffer");
    }
    output.file(name, content, {
      date: XMindEpoch,
      createFolders: false,
      dir: entry.dir,
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    });
  }
  return Buffer.from(
    await output.generateAsync({
      type: "nodebuffer",
      platform: "UNIX",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    }),
  );
}

// ─── Priority map ─────────────────────────────────────────────────────────────

export const PRIORITY_MAP: Record<string, MarkerId> = {
  // P0 为最高优先级，P0~P4 与徽标 priority-1~priority-5 一一对应（P0→priority-1）。
  // 与 xmind-patch、case-edit/history-convert 的读回映射保持双向一致。
  P0: Marker.Priority.p1,
  P1: Marker.Priority.p2,
  P2: Marker.Priority.p3,
  P3: Marker.Priority.p4,
  P4: Marker.Priority.p5,
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
  obj.modules.forEach(validateModule);
}

// 逐模块/逐页校验,避免结构错误拖到渲染深处才暴露
function validateModule(mod: unknown, index: number): void {
  if (!mod || typeof mod !== "object") {
    throw new Error(`modules[${index}] must be an object`);
  }
  const m = mod as Record<string, unknown>;
  if (typeof m.name !== "string" || !m.name) {
    throw new Error(`modules[${index}].name must be a non-empty string`);
  }
  if (!Array.isArray(m.pages)) {
    throw new Error(`modules[${index}].pages must be an array`);
  }
  m.pages.forEach((page, j) => {
    if (!page || typeof page !== "object") {
      throw new Error(`modules[${index}].pages[${j}] must be an object`);
    }
    const name = (page as Record<string, unknown>).name;
    if (typeof name !== "string" || !name) {
      throw new Error(`modules[${index}].pages[${j}].name must be a non-empty string`);
    }
  });
}

// ─── Title builders ──────────────────────────────────────────────────────────

export function normalizeVersion(version: string): string {
  return version.replace(/^v/i, "");
}

export function buildRootTitle(meta: RootAwareMeta): string {
  return buildRootName(meta.version, meta.project_name);
}

export function buildL1Title(meta: Meta): string {
  const base = meta.requirement_name.replace(/\s*[（(]#\d+[）)]\s*$/, "").trim();
  const moduleId = meta.case_module_id === undefined ? "" : String(meta.case_module_id).trim();
  return moduleId ? `${base}(#${moduleId})` : base;
}

export function buildL1Labels(meta: Meta): string[] {
  const labels = [...(meta.tags ?? [])];
  if (meta.requirement_id) {
    labels.unshift(`(#${meta.requirement_id})`);
  }
  return labels;
}

// ─── Strip priority prefix from case title ──────────────────────────────────

export function stripPriorityPrefix(title: string): string {
  return title.replace(/^【P\d】/, "");
}

// ─── Sanitize <br> tags to newlines ─────────────────────────────────────────

export function sanitizeBr(text: string): string {
  return normalizeStructuredText(text);
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

/**
 * stepsAsNotes 按步骤数设阈:只有步骤数 ≥ 阈值(默认 3)的用例才把步骤折叠进备注,
 * 1-2 步的短用例保留大纲步骤节点,避免信息被藏进 notes。
 */
export function useStepsAsNotes(tc: TestCase, options: RenderOptions): boolean {
  return Boolean(options.stepsAsNotes) && tc.steps.length >= (options.stepsAsNotesMinSteps ?? 3);
}

export function buildCaseTopic(tc: TestCase, options: RenderOptions = {}): TopicBuilder {
  const asNotes = useStepsAsNotes(tc, options);
  const caseChildren: TopicBuilder[] = asNotes
    ? []
    : tc.steps.map((s) => Topic(sanitizeBr(s.step)).children([Topic(sanitizeBr(s.expected))]));

  const displayTitle = stripPriorityPrefix(tc.title);
  let caseTopic =
    caseChildren.length > 0 ? Topic(displayTitle).children(caseChildren) : Topic(displayTitle);

  const marker = PRIORITY_MAP[tc.priority];
  if (marker) {
    caseTopic = caseTopic.markers([marker]);
  }

  const note = asNotes ? buildCaseNote(tc) : tc.preconditions ? sanitizeBr(tc.preconditions) : "";
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
  options: RenderOptions = {},
): Promise<void> {
  if (existsSync(outputPath)) {
    throw new Error(`Output file already exists (use --mode append or replace): ${outputPath}`);
  }

  const rootTitle = buildRootTitle(data.meta);
  const l1Title = buildL1Title(data.meta);
  const { topics: l2Topics, promoted } = buildTopicTree(data.modules, options);

  const l1Children = [...promoted, ...l2Topics];
  let l1 = Topic(l1Title).children(l1Children);
  const l1Labels = buildL1Labels(data.meta);
  if (l1Labels.length > 0) {
    l1 = l1.labels(l1Labels);
  }
  // sheet 名（XMind 左下角画布标签）默认取根节点标题，避免空白
  const root = RootTopic(rootTitle).children([l1]).sheetTitle(rootTitle);
  const wb = Workbook(root);
  // 库自带的 writeLocalFile 内部不 await writeFile，落盘前就 resolve，
  // 紧接着读取产物会撞上空文件；这里自己同步写盘绕开竞态。
  // writeFileAtomic 同为同步写,且 tmp+rename 不会留下半截文件。
  const buffer = await wb.archive();
  writeFileAtomic(outputPath, await normalizeXmindBuffer(Buffer.from(buffer)));
}

/**
 * createXmind 的覆盖变体:先写临时文件再 rename 替换目标,
 * 中断不会留下损坏的 xmind,也不会在生成失败时丢失旧文件。
 */
export async function createXmindReplacing(
  data: IntermediateJson,
  outputPath: string,
  options: RenderOptions = {},
): Promise<void> {
  const tmp = join(dirname(outputPath), `.${randomBytes(6).toString("hex")}.tmp`);
  rmSync(tmp, { force: true });
  try {
    await createXmind(data, tmp, options);
  } catch (err) {
    rmSync(tmp, { force: true });
    throw err;
  }
  renameSync(tmp, outputPath);
}

// ─── Mode: append / replace (raw nodes) ─────────────────────────────────────
