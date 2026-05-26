import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { repoRoot } from "./paths.ts";
import type { AiCoreIssue, AiCoreResult } from "./types.ts";

const MAX_PROMPT_SOURCE_LINE_CHARS = 500;
const SOURCE_ROOTS = [".ai/core/skills", ".ai/core/prompts", ".ai/core/agents", ".ai/core/rules"];
const ROOT_FILES = ["AGENTS.md"];
const INCLUDED_EXTENSIONS = [".md", ".yaml", ".yml"];

type PromptSourceQualitySummary = {
  checkedFiles: string[];
};

type Options = {
  root?: string;
  virtualFiles?: Record<string, string>;
};

export function validatePromptSourceQuality(
  options: Options = {},
): AiCoreResult<PromptSourceQualitySummary> {
  const root = options.root ?? repoRoot();
  const files = options.virtualFiles
    ? Object.keys(options.virtualFiles).sort()
    : discoverPromptSourceFiles(root);
  const issues: AiCoreIssue[] = [];

  for (const path of files) {
    const text = options.virtualFiles?.[path] ?? readFileSync(join(root, path), "utf8");
    issues.push(...validatePromptSourceText(path, text));
  }

  return {
    ok: issues.every((issue) => issue.severity !== "error"),
    value: { checkedFiles: files },
    issues,
  };
}

function discoverPromptSourceFiles(root: string): string[] {
  const files: string[] = [];
  for (const sourceRoot of SOURCE_ROOTS) {
    const absolute = join(root, sourceRoot);
    if (!existsSync(absolute)) continue;
    for (const file of walk(absolute)) {
      const rel = normalize(relative(root, file));
      if (INCLUDED_EXTENSIONS.some((ext) => rel.endsWith(ext))) files.push(rel);
    }
  }
  for (const rootFile of ROOT_FILES) {
    if (existsSync(join(root, rootFile))) files.push(rootFile);
  }
  return files.sort();
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function validatePromptSourceText(path: string, text: string): AiCoreIssue[] {
  const issues: AiCoreIssue[] = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (line.length <= MAX_PROMPT_SOURCE_LINE_CHARS) continue;
    issues.push({
      code: "prompt_source.overlong_line",
      severity: "error",
      path,
      message: `${path}:${index + 1} has ${line.length} chars; split or move details into a progressive reference.`,
    });
  }
  return issues;
}

function normalize(path: string): string {
  return path.split("\\").join("/");
}
