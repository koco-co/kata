#!/usr/bin/env bun
/** Shared deterministic XMind normalization and topic rendering helpers. */

import { createHash } from "node:crypto";
import JSZip from "jszip";
import type { MarkerId, TopicBuilder } from "xmind-generator";
import { Marker, Topic } from "xmind-generator";
import { buildRootName } from "../../xmind-rules.ts";
import { normalizeStructuredText } from "../normalize.ts";
import type { CaseItem } from "../types.ts";

export interface XmindMeta {
  project_name: string;
  requirement_name: string;
  version?: string;
  requirement_id?: string | number;
  case_module_id?: string | number;
  tags?: string[];
}

export interface RenderOptions {
  stepsAsNotes?: boolean;
  /** stepsAsNotes 仅对步骤数达到阈值的用例生效(默认 3);短用例保留大纲步骤节点 */
  stepsAsNotesMinSteps?: number;
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

// ─── Title builders ──────────────────────────────────────────────────────────

export function buildRootTitle(meta: XmindMeta): string {
  return buildRootName(meta.version, meta.project_name);
}

export function buildL1Title(meta: XmindMeta): string {
  const base = meta.requirement_name.replace(/\s*[（(]#\d+[）)]\s*$/, "").trim();
  const moduleId = meta.case_module_id === undefined ? "" : String(meta.case_module_id).trim();
  return moduleId ? `${base}(#${moduleId})` : base;
}

export function buildL1Labels(meta: XmindMeta): string[] {
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

export function buildCaseNote(tc: CaseItem): string {
  const parts: string[] = [];
  if (tc.precondition) {
    parts.push(`前置条件：\n${sanitizeBr(tc.precondition)}`);
  }
  if (tc.steps.length > 0) {
    const lines = tc.steps.flatMap((s, index) => {
      const stepLines = [`${index + 1}. 步骤：${sanitizeBr(s.action)}`];
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
export function useStepsAsNotes(tc: CaseItem, options: RenderOptions): boolean {
  return Boolean(options.stepsAsNotes) && tc.steps.length >= (options.stepsAsNotesMinSteps ?? 3);
}

export function buildCaseTopic(tc: CaseItem, options: RenderOptions = {}): TopicBuilder {
  const asNotes = useStepsAsNotes(tc, options);
  const caseChildren: TopicBuilder[] = asNotes
    ? []
    : tc.steps.map((s) => Topic(sanitizeBr(s.action)).children([Topic(sanitizeBr(s.expected))]));

  const displayTitle = stripPriorityPrefix(tc.title);
  let caseTopic =
    caseChildren.length > 0 ? Topic(displayTitle).children(caseChildren) : Topic(displayTitle);

  const marker = PRIORITY_MAP[tc.priority];
  if (marker) {
    caseTopic = caseTopic.markers([marker]);
  }

  const note = asNotes ? buildCaseNote(tc) : tc.precondition ? sanitizeBr(tc.precondition) : "";
  if (note) {
    caseTopic = caseTopic.note(note);
  }

  return caseTopic;
}
