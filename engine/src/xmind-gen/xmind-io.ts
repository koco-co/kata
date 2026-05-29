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

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { IntermediateJson, Page, TestCase } from "@shared/lib/types.ts";
import JSZip from "jszip";
import type { RenderOptions } from "./render.ts";
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
} from "./render.ts";

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
  writeFileSync(outputPath, out);
}

export function buildRawCaseNode(tc: TestCase, options: RenderOptions = {}): XMindTopicNode {
  const stepNodes: XMindTopicNode[] = options.stepsAsNotes
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

  const note = options.stepsAsNotes
    ? buildCaseNote(tc)
    : tc.preconditions
      ? sanitizeBr(tc.preconditions)
      : "";
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
  project?: string,
  options: RenderOptions = {},
): Promise<void> {
  if (!existsSync(outputPath)) {
    await createXmind(data, outputPath, project, options);
    return;
  }

  const [sheets, zip] = await readXmindSheets(outputPath);
  const rootTitle = buildRootTitle(data.meta, project);

  const sheet = sheets.find((s) => s.rootTopic?.title === rootTitle) ?? sheets[0];
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
  project?: string,
  options: RenderOptions = {},
): Promise<void> {
  if (!existsSync(outputPath)) {
    await createXmind(data, outputPath, project, options);
    return;
  }

  const [sheets, zip] = await readXmindSheets(outputPath);
  const rootTitle = buildRootTitle(data.meta, project);
  const l1Title = buildL1Title(data.meta);

  const sheet = sheets.find((s) => s.rootTopic?.title === rootTitle) ?? sheets[0];
  if (!sheet?.rootTopic) {
    throw new Error(`Cannot find sheet with root title "${rootTitle}" in ${outputPath}`);
  }

  if (!sheet.rootTopic.children?.attached) {
    sheet.rootTopic.children = { attached: [buildRawL1Node(data, options)] };
  } else {
    const attached = sheet.rootTopic.children.attached;
    const reqName = data.meta.requirement_name;
    const idx = attached.findIndex(
      (n) => n.title === l1Title || (typeof n.title === "string" && n.title.endsWith(reqName)),
    );
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
