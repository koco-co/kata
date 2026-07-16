#!/usr/bin/env bun
/**
 * history-convert.ts — Convert historical CSV/XMind files to Archive Markdown.
 *
 * Usage:
 *   kata history convert --path <file-or-dir> --project <name> [--module <key>] [--detect] [--force] [--no-split]
 *   kata history convert --help
 */

export interface CsvRow {
  id: string;
  product: string;
  module: string;
  requirement: string;
  title: string;
  preconditions: string;
  steps: string;
  expected: string;
  priority: string;
  createDate: string;
}

export interface XMindTopicNode {
  title?: string;
  children?: { attached?: XMindTopicNode[] };
  [key: string]: unknown;
}

export interface XMindSheet {
  rootTopic?: XMindTopicNode;
  [key: string]: unknown;
}

export interface CaseEntry {
  module: string;
  title: string;
  priority: string;
  steps: { step: string; expected: string }[];
}

export interface FileConvertResult {
  input: string;
  output: string;
  status: "converted" | "skipped" | "failed";
  reason?: string;
  caseCount?: number;
}

export interface DetectEntry {
  path: string;
  type: "csv" | "xmind";
  outputDir: string;
}

export interface ConvertOutput {
  converted: number;
  skipped: number;
  failed: number;
  files: FileConvertResult[];
}

// ─── Tag Inference ───────────────────────────────────────────────────────────
