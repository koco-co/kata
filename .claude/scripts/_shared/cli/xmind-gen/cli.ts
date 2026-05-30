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

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { createCli } from "@shared/lib/cli-runner.ts";
import { repoRoot, validateFilePath } from "@shared/lib/paths.ts";
import type { IntermediateJson } from "@shared/lib/types.ts";
import { archiveToJson } from "./archive.ts";
import type { OutputResult, RenderOptions, WriteMode } from "./render.ts";
import { buildL1Title, buildRootTitle, countCases, createXmind, validateInput } from "./render.ts";
import { appendXmind, replaceXmind } from "./xmind-io.ts";

interface GenerateOptions {
  input: string;
  output?: string;
  mode: string;
  project: string;
  version?: string;
  jsonOnly?: boolean;
  stepsAsNotes?: boolean;
}

export async function runGenerate(opts: GenerateOptions): Promise<void> {
  const mode = parseWriteMode(opts.mode);
  const inputPath = validateFilePath(opts.input, [repoRoot()]);
  const stat = statSync(inputPath);

  if (stat.isDirectory()) {
    await runDirectoryInput(inputPath, opts, mode);
    return;
  }

  const ext = extname(inputPath).toLowerCase();
  if (ext === ".md") {
    await processMdFile(inputPath, opts.project, opts.version, opts.jsonOnly, mode, opts.output, {
      stepsAsNotes: opts.stepsAsNotes,
    });
    return;
  }

  await runJsonInput(inputPath, opts, mode);
}

function parseWriteMode(mode: string): WriteMode {
  if (["create", "append", "replace"].includes(mode)) {
    return mode as WriteMode;
  }
  process.stderr.write(`[xmind-gen] Invalid mode: ${mode}. Must be create, append, or replace.\n`);
  process.exit(1);
}

async function runDirectoryInput(
  inputPath: string,
  opts: GenerateOptions,
  mode: WriteMode,
): Promise<void> {
  const mdFiles = listMarkdownFiles(inputPath);
  if (mdFiles.length === 0) {
    process.stderr.write(`[xmind-gen] No .md files found in ${inputPath}\n`);
    process.exit(1);
  }

  for (const mdFile of mdFiles) {
    await processMdFile(mdFile, opts.project, opts.version, opts.jsonOnly, mode, undefined, {
      stepsAsNotes: opts.stepsAsNotes,
    });
  }
}

function listMarkdownFiles(inputPath: string): string[] {
  return readdirSync(inputPath)
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => join(inputPath, fileName));
}

async function runJsonInput(
  inputPath: string,
  opts: GenerateOptions,
  mode: WriteMode,
): Promise<void> {
  if (!opts.output) {
    process.stderr.write("[xmind-gen] --output is required for JSON input\n");
    process.exit(1);
  }

  const outputPath = resolve(opts.output);
  const data = readJsonInput(inputPath);
  await writeJsonInput(data, outputPath, opts.project, mode, {
    stepsAsNotes: opts.stepsAsNotes,
  });
  printJsonInputResult(data, outputPath, opts.project, mode);
}

function readJsonInput(inputPath: string): IntermediateJson {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(inputPath, "utf8"));
  } catch (err) {
    process.stderr.write(`[xmind-gen] Failed to read input file: ${err}\n`);
    process.exit(1);
  }

  try {
    validateInput(raw);
  } catch (err) {
    process.stderr.write(`[xmind-gen] Validation error: ${err}\n`);
    process.exit(1);
  }

  return raw as IntermediateJson;
}

async function writeJsonInput(
  data: IntermediateJson,
  outputPath: string,
  project: string,
  mode: WriteMode,
  renderOptions: RenderOptions,
): Promise<void> {
  try {
    if (mode === "create") {
      await createXmind(data, outputPath, project, renderOptions);
    } else if (mode === "append") {
      await appendXmind(data, outputPath, project, renderOptions);
    } else {
      await replaceXmind(data, outputPath, project, renderOptions);
    }
  } catch (err) {
    process.stderr.write(`[xmind-gen] Error: ${err}\n`);
    process.exit(1);
  }
}

function printJsonInputResult(
  data: IntermediateJson,
  outputPath: string,
  project: string,
  mode: WriteMode,
) {
  const result: OutputResult = {
    output_path: outputPath,
    mode,
    root_title: buildRootTitle(data.meta, project),
    l1_title: buildL1Title(data.meta),
    case_count: countCases(data.modules),
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

export const program = createCli({
  name: "xmind-gen",
  description: "将中间 JSON 或 Archive Markdown 转换为 .xmind 文件",
  rootAction: {
    options: [
      {
        flag: "--input <path>",
        description: "Path to input JSON, MD file, or directory of MD files",
        required: true,
      },
      {
        flag: "--output <path>",
        description: "Path to output .xmind file (auto-derived for MD input)",
      },
      {
        flag: "--mode <mode>",
        description: "Write mode: create | append | replace",
        defaultValue: "create",
      },
      {
        flag: "--project <name>",
        description: "Project name for XMind root node",
        defaultValue: "数栈测试",
      },
      {
        flag: "--version <ver>",
        description: "PRD version (e.g. 6.4.9) for root title template",
      },
      {
        flag: "--json-only",
        description: "Only output intermediate JSON (MD input only)",
      },
      {
        flag: "--steps-as-notes",
        description:
          "Render case steps/expected results in notes instead of XMind outline children",
      },
    ],
    action: runGenerate,
  },
});

export async function processMdFile(
  mdPath: string,
  project: string,
  version?: string,
  jsonOnly?: boolean,
  mode: WriteMode = "create",
  outputOverride?: string,
  renderOptions: RenderOptions = {},
): Promise<void> {
  const fname = basename(mdPath, ".md");
  const outDir = dirname(mdPath);
  const tmpDir = join(outDir, "tmp");

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

  const data = archiveToJson(mdPath, project, version);
  const caseCount = countCases(data.modules);

  if (jsonOnly) {
    const jsonPath = join(tmpDir, `${fname}.json`);
    writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf-8");
    process.stdout.write(`JSON: ${jsonPath} (${caseCount} cases)\n`);
    return;
  }

  const xmindPath = outputOverride ? resolve(outputOverride) : join(outDir, `${fname}.xmind`);

  try {
    if (mode === "create") {
      if (existsSync(xmindPath)) unlinkSync(xmindPath);
      await createXmind(data, xmindPath, project, renderOptions);
    } else if (mode === "append") {
      await appendXmind(data, xmindPath, project, renderOptions);
    } else {
      await replaceXmind(data, xmindPath, project, renderOptions);
    }
  } catch (err) {
    process.stderr.write(`[xmind-gen] Error processing ${mdPath}: ${err}\n`);
    return;
  }

  process.stdout.write(`XMind: ${resolve(xmindPath)} (${caseCount} cases)\n`);
}
