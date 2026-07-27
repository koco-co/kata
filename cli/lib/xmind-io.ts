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

import { existsSync, readFileSync } from "node:fs";
import JSZip from "jszip";
import { writeFileAtomic } from "./atomic-writer.ts";
import type { IntermediateJson, Page, TestCase } from "./intermediate-types.ts";
import type { RenderOptions } from "./xmind-render.ts";
import {
  buildCaseNote,
  buildL1Labels,
  buildL1Title,
  buildRootTitle,
  createXmind,
  isUnclassified,
  PRIORITY_MAP,
  sanitizeBr,
  stripPriorityPrefix,
  useStepsAsNotes,
} from "./xmind-render.ts";

export interface XMindTopicNode {
  title?: string;
  children?: { attached?: XMindTopicNode[] };
  markers?: { markerId: string }[];
  notes?: { plain?: { content?: string } };
  [key: string]: unknown;
}

export interface XMindSheet {
  rootTopic?: XMindTopicNode;
  [key: string]: unknown;
}

export async function readXmindSheets(filePath: string): Promise<[XMindSheet[], JSZip]> {
  const buffer = readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const contentFile = zip.file("content.json");
  if (!contentFile) {
    throw new Error("Invalid .xmind file: missing content.json");
  }
  const contentStr = await contentFile.async("string");
  const sheets = JSON.parse(contentStr) as XMindSheet[];
  return [sheets, zip];
}

export async function writeXmindSheets(zip: JSZip, outputPath: string): Promise<void> {
  const out = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
  writeFileAtomic(outputPath, out);
}

// 折叠策略按「到叶子的高度」自适应，而不是绝对深度：
//   height 0 = 叶子(预期)，1 = 步骤，2 = 用例，3 = 直接装用例的分组(模块/二级菜单)。
// 折叠 height 2(用例,收起步骤) 与 height 3(装用例的分组,收起用例)，其余(步骤、更上层
// 的菜单、root/需求)都保持展开。效果随结构自适应：
//   扁平结构(模块→用例) 默认露 3 级；带二级菜单(一级→二级→用例) 默认露 4 级。
// 不依赖 marker/notes，漏标优先级的用例也照样折叠。
const FOLD_HEIGHTS = new Set([2, 3]);

// 返回节点到最深叶子的高度，并就地给 height∈{2,3} 的节点打折叠标记。
function foldByHeight(node: XMindTopicNode): number {
  const children = node.children?.attached;
  if (!children || children.length === 0) return 0;
  let maxChild = 0;
  for (const child of children) {
    maxChild = Math.max(maxChild, foldByHeight(child));
  }
  const height = maxChild + 1;
  if (FOLD_HEIGHTS.has(height)) {
    node.branch = "folded";
  }
  return height;
}

/** Fold case topics and the group directly holding them, height-adaptive. */
export async function applyFoldingToFile(outputPath: string): Promise<void> {
  const [sheets, zip] = await readXmindSheets(outputPath);
  for (const sheet of sheets) {
    if (sheet.rootTopic) foldByHeight(sheet.rootTopic);
  }
  zip.file("content.json", JSON.stringify(sheets));
  await writeXmindSheets(zip, outputPath);
}

export function buildRawCaseNode(tc: TestCase, options: RenderOptions = {}): XMindTopicNode {
  const asNotes = useStepsAsNotes(tc, options);
  const stepNodes: XMindTopicNode[] = asNotes
    ? []
    : tc.steps.map((s) => ({
        title: sanitizeBr(s.step),
        children: { attached: [{ title: sanitizeBr(s.expected) }] },
      }));

  const displayTitle = stripPriorityPrefix(tc.title);
  const node: XMindTopicNode = {
    title: displayTitle,
    ...(stepNodes.length > 0 ? { children: { attached: stepNodes } } : {}),
  };

  const markerKey = PRIORITY_MAP[tc.priority];
  if (markerKey) {
    node.markers = [{ markerId: markerKey.id }];
  }

  const note = asNotes ? buildCaseNote(tc) : tc.preconditions ? sanitizeBr(tc.preconditions) : "";
  if (note) {
    node.notes = { plain: { content: note } };
  }

  return node;
}

export function buildRawPageChildren(page: Page, options: RenderOptions = {}): XMindTopicNode[] {
  const children: XMindTopicNode[] = [];

  for (const sg of page.sub_groups ?? []) {
    if (sg.test_cases.length > 0) {
      const sgCases = sg.test_cases.map((tc) => buildRawCaseNode(tc, options));
      children.push({
        title: sg.name,
        children: { attached: sgCases },
      });
    }
  }

  for (const tc of page.test_cases ?? []) {
    children.push(buildRawCaseNode(tc, options));
  }

  return children;
}

export function buildRawL1Node(
  data: IntermediateJson,
  options: RenderOptions = {},
): XMindTopicNode {
  const l1Title = buildL1Title(data.meta);
  const l1Labels = buildL1Labels(data.meta);
  const l1Children: XMindTopicNode[] = [];

  for (const mod of data.modules) {
    if (isUnclassified(mod.name)) {
      for (const page of mod.pages) {
        if (isUnclassified(page.name)) {
          l1Children.push(...buildRawPageChildren(page, options));
        } else {
          const children = buildRawPageChildren(page, options);
          l1Children.push({
            title: page.name,
            ...(children.length > 0 ? { children: { attached: children } } : {}),
          });
        }
      }
    } else {
      const pageNodes: XMindTopicNode[] = [];

      for (const page of mod.pages) {
        if (isUnclassified(page.name)) {
          pageNodes.push(...buildRawPageChildren(page, options));
        } else {
          const children = buildRawPageChildren(page, options);
          pageNodes.push({
            title: page.name,
            ...(children.length > 0 ? { children: { attached: children } } : {}),
          });
        }
      }

      l1Children.push({
        title: mod.name,
        ...(pageNodes.length > 0 ? { children: { attached: pageNodes } } : {}),
      });
    }
  }

  return {
    title: l1Title,
    ...(l1Labels.length > 0 ? { labels: l1Labels } : {}),
    ...(l1Children.length > 0 ? { children: { attached: l1Children } } : {}),
  };
}

export async function appendXmind(
  data: IntermediateJson,
  outputPath: string,
  projectDir?: string,
  options: RenderOptions = {},
): Promise<void> {
  if (!existsSync(outputPath)) {
    await createXmind(data, outputPath, projectDir, options);
    return;
  }

  const [sheets, zip] = await readXmindSheets(outputPath);
  const rootTitle = buildRootTitle(data.meta, projectDir);

  // 目标 sheet 必须按根标题精确命中;不匹配时报错而不是静默写进 sheets[0] 污染首页
  const sheet = sheets.find((s) => s.rootTopic?.title === rootTitle);
  if (!sheet?.rootTopic) {
    throw new Error(`Cannot find sheet with root title "${rootTitle}" in ${outputPath}`);
  }

  if (!sheet.rootTopic.children) {
    sheet.rootTopic.children = { attached: [] };
  }
  if (!sheet.rootTopic.children.attached) {
    sheet.rootTopic.children.attached = [];
  }

  sheet.rootTopic.children.attached.push(buildRawL1Node(data, options));

  zip.file("content.json", JSON.stringify(sheets));
  await writeXmindSheets(zip, outputPath);
}

export async function replaceXmind(
  data: IntermediateJson,
  outputPath: string,
  projectDir?: string,
  options: RenderOptions = {},
): Promise<void> {
  if (!existsSync(outputPath)) {
    await createXmind(data, outputPath, projectDir, options);
    return;
  }

  const [sheets, zip] = await readXmindSheets(outputPath);
  const rootTitle = buildRootTitle(data.meta, projectDir);
  const l1Title = buildL1Title(data.meta);

  const sheet = sheets.find((s) => s.rootTopic?.title === rootTitle);
  if (!sheet?.rootTopic) {
    throw new Error(`Cannot find sheet with root title "${rootTitle}" in ${outputPath}`);
  }

  if (!sheet.rootTopic.children?.attached) {
    sheet.rootTopic.children = { attached: [buildRawL1Node(data, options)] };
  } else {
    const attached = sheet.rootTopic.children.attached;
    const reqName = data.meta.requirement_name;
    // L1 节点按完整标题精确匹配;旧归档标题可能带前缀,
    // endsWith 模糊匹配仅在唯一命中时兜底,多命中宁可新增节点也不错杀兄弟需求
    let idx = attached.findIndex((n) => n.title === l1Title);
    if (idx < 0) {
      const fuzzy = attached.flatMap((n, i) =>
        typeof n.title === "string" && n.title.endsWith(reqName) ? [i] : [],
      );
      if (fuzzy.length === 1) {
        idx = fuzzy[0];
        console.error(
          `warn: L1 标题「${l1Title}」精确匹配未命中,按唯一后缀匹配替换「${attached[idx].title}」`,
        );
      }
    }
    if (idx >= 0) {
      attached[idx] = buildRawL1Node(data, options);
    } else {
      attached.push(buildRawL1Node(data, options));
    }
  }

  zip.file("content.json", JSON.stringify(sheets));
  await writeXmindSheets(zip, outputPath);
}

// ─── Archive Markdown parser ─────────────────────────────────────────────────
