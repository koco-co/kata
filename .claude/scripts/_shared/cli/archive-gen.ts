#!/usr/bin/env bun
/**
 * archive-gen.ts — Converts intermediate JSON test cases to Archive Markdown files,
 * and searches existing archives.
 *
 * Usage:
 *   kata archives convert --input <json> --output <path> [--project <name>] [--template templates/archive.md.hbs]
 *   kata archives search --query <keywords> [--project <name>] [--dir <path>] [--limit 20]
 *   kata archives --help
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { createCli } from "@shared/lib/cli-runner.ts";
import {
  buildMarkdown,
  type FrontMatter,
  parseFrontMatter,
  serializeFrontMatter,
  todayString,
} from "@shared/lib/frontmatter.ts";
import { repoRoot, validateFilePath } from "@shared/lib/paths.ts";
import { buildRootName } from "@shared/lib/rules.ts";
import type { IntermediateJson, Meta, Module, TestCase } from "@shared/lib/types.ts";
import Handlebars from "handlebars";

interface ConvertResult {
  output_path: string;
  case_count: number;
  module_count: number;
}

interface SearchResult {
  path: string;
  suite_name: string;
  tags: string[];
  case_count: number;
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateInput(data: unknown): asserts data is IntermediateJson {
  if (!data || typeof data !== "object") {
    throw new Error("Input must be a JSON object");
  }
  const obj = data as Record<string, unknown>;
  if (!obj.meta || typeof obj.meta !== "object") {
    throw new Error("Missing required field: meta");
  }
  const meta = obj.meta as Record<string, unknown>;
  if (!meta.requirement_name || typeof meta.requirement_name !== "string") {
    throw new Error("Missing required field: meta.requirement_name");
  }
  if (!Array.isArray(obj.modules) || obj.modules.length === 0) {
    throw new Error("modules must be a non-empty array");
  }
}

// ─── Case counting ───────────────────────────────────────────────────────────

function countCasesInModules(modules: Module[]): number {
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

// ─── Tag inference ────────────────────────────────────────────────────────────

function inferTags(meta: Meta, modules: Module[]): string[] {
  const tags = new Set<string>();

  // Add module_key (e.g. "数据质量")
  if (meta.module_key) tags.add(meta.module_key);

  // Add requirement name without brackets prefix as a separate tag
  if (meta.requirement_name) {
    // Extract bracket content: 【xxx】 → "xxx"
    const bracketMatch = meta.requirement_name.match(/^【(.+?)】/);
    if (bracketMatch) {
      tags.add(bracketMatch[1]);
    }
    // Extract the part after brackets
    const afterBracket = meta.requirement_name.replace(/^【.+?】/, "").trim();
    if (afterBracket) {
      tags.add(afterBracket);
    }
  }

  // Add version tag
  if (meta.version) tags.add(meta.version);

  // Add module names (L2)
  for (const mod of modules) {
    if (mod.name && mod.name !== "未分类") tags.add(mod.name);
    // Add page names (L3)
    for (const page of mod.pages) {
      if (page.name && page.name !== "未分类") tags.add(page.name);
      // Add sub_group names (L4)
      for (const sg of page.sub_groups ?? []) {
        if (sg.name) tags.add(sg.name);
      }
    }
  }

  // Add prd_id tag
  if (meta.requirement_id) tags.add(`#${meta.requirement_id}`);

  return Array.from(tags).slice(0, 10);
}

// ─── Body generation ─────────────────────────────────────────────────────────

function escapeTableCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

function buildCaseBody(tc: TestCase): string {
  const lines: string[] = [];

  if (tc.preconditions) {
    lines.push("> 前置条件");
    lines.push("```");
    lines.push(tc.preconditions);
    lines.push("```");
    lines.push("");
  }

  lines.push("> 用例步骤");
  lines.push("");
  lines.push("| 编号 | 步骤 | 预期 |");
  lines.push("| ---- | ------------ | ------------ |");

  for (let i = 0; i < tc.steps.length; i++) {
    const s = tc.steps[i];
    lines.push(`| ${i + 1} | ${escapeTableCell(s.step)} | ${escapeTableCell(s.expected)} |`);
  }

  return lines.join("\n");
}

function stripPriorityPrefix(title: string): string {
  return title.replace(/^【P\d】\s*/, "").trim();
}

function buildBodyFromModules(modules: Module[]): string {
  const lines: string[] = [];
  let caseIndex = 0;

  const appendCase = (tc: TestCase) => {
    caseIndex += 1;
    lines.push(`<!-- case_id: ${tc.case_id ?? `C${caseIndex}`} -->`);
    lines.push(`##### 【${tc.priority}】${stripPriorityPrefix(tc.title)}`);
    lines.push("");
    lines.push(buildCaseBody(tc));
    lines.push("");
  };

  for (const mod of modules) {
    lines.push(`## ${mod.name}`);
    lines.push("");

    for (const page of mod.pages) {
      lines.push(`### ${page.name}`);
      lines.push("");

      // Sub-groups → H4
      for (const sg of page.sub_groups ?? []) {
        if (sg.test_cases.length > 0) {
          lines.push(`#### ${sg.name}`);
          lines.push("");

          for (const tc of sg.test_cases) {
            appendCase(tc);
          }
        }
      }

      // Direct page test_cases (no sub-group)
      for (const tc of page.test_cases ?? []) {
        appendCase(tc);
      }
    }
  }

  return lines.join("\n").trim();
}

// ─── Built-in template renderer ───────────────────────────────────────────────

function renderBuiltIn(data: IntermediateJson, project?: string): string {
  const { meta, modules } = data;
  const caseCount = countCasesInModules(modules);
  const rootName = buildRootName(meta.version);

  const fm: FrontMatter = {
    suite_name: meta.requirement_name,
    ...(rootName ? { root_name: rootName } : {}),
    description: meta.description ?? meta.requirement_name,
    ...(meta.requirement_id !== undefined ? { prd_id: meta.requirement_id } : {}),
    ...(meta.version ? { prd_version: meta.version } : {}),
    product: meta.module_key ?? "",
    ...(project ? { project } : {}),
    tags: inferTags(meta, modules),
    create_at: todayString(),
    status: "草稿",
    case_count: caseCount,
    origin: "xmind",
  };

  const body = buildBodyFromModules(modules);
  return buildMarkdown(fm, body);
}

// ─── Handlebars helpers ──────────────────────────────────────────────────────

function registerHandlebarsHelpers(): void {
  // Add 1-based indexing for step tables
  Handlebars.registerHelper("add", (a: number, b: number) => a + b);

  // Escape pipe characters and newlines in table cells
  Handlebars.registerHelper("escapeCell", (text: string) => {
    return new Handlebars.SafeString(String(text).replace(/\|/g, "\\|").replace(/\n/g, "<br>"));
  });

  // Strip any existing 【P0】/【P1】/... prefix from a case title
  Handlebars.registerHelper("stripPriority", (text: string) => {
    return stripPriorityPrefix(String(text ?? ""));
  });
}

// ─── Handlebars template renderer ─────────────────────────────────────────────

function renderWithTemplate(
  data: IntermediateJson,
  templatePath: string,
  project?: string,
): string {
  registerHandlebarsHelpers();

  const templateSrc = readFileSync(resolve(templatePath), "utf8");
  const template = Handlebars.compile(templateSrc);

  const { meta, modules } = data;
  const caseCount = countCasesInModules(modules);
  const rootName = buildRootName(meta.version);
  const fm: FrontMatter = {
    suite_name: meta.requirement_name,
    ...(rootName ? { root_name: rootName } : {}),
    description: meta.description ?? meta.requirement_name,
    ...(meta.requirement_id !== undefined ? { prd_id: meta.requirement_id } : {}),
    ...(meta.version ? { prd_version: meta.version } : {}),
    product: meta.module_key ?? "",
    ...(project ? { project } : {}),
    tags: inferTags(meta, modules),
    create_at: todayString(),
    status: "草稿",
    case_count: caseCount,
    origin: "xmind",
  };

  return template({
    meta,
    modules,
    fm,
    frontMatterStr: serializeFrontMatter(fm),
  });
}

// ─── Subcommand: convert ──────────────────────────────────────────────────────

async function runConvert(opts: {
  input: string;
  output: string;
  project?: string;
  template?: string;
}): Promise<void> {
  const inputPath = validateFilePath(opts.input, [repoRoot()]);
  const outputPath = validateFilePath(opts.output, [repoRoot()]);

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(inputPath, "utf8"));
  } catch (err) {
    process.stderr.write(`[archive-gen] Failed to read input file: ${err}\n`);
    process.exit(1);
  }

  try {
    validateInput(raw);
  } catch (err) {
    process.stderr.write(`[archive-gen] Validation error: ${err}\n`);
    process.exit(1);
  }

  const data = raw as IntermediateJson;

  let markdown: string;
  try {
    if (opts.template) {
      markdown = renderWithTemplate(data, opts.template, opts.project);
    } else {
      markdown = renderBuiltIn(data, opts.project);
    }
  } catch (err) {
    process.stderr.write(`[archive-gen] Render error: ${err}\n`);
    process.exit(1);
  }

  const outDir = dirname(outputPath);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  writeFileSync(outputPath, markdown, "utf8");

  const result: ConvertResult = {
    output_path: outputPath,
    case_count: countCasesInModules(data.modules),
    module_count: data.modules.length,
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

// ─── Subcommand: search ───────────────────────────────────────────────────────

function collectMdFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = `${dir}/${entry}`;
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...collectMdFiles(fullPath));
    } else if (entry.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

function collectProjectArchiveFiles(project: string): string[] {
  const projectDir = resolve(repoRoot(), "workspace", project);
  const featuresDir = validateFilePath(resolve(projectDir, "features"), [repoRoot()]);
  const legacyArchiveDir = validateFilePath(resolve(projectDir, "archive"), [repoRoot()]);
  const featureArchives = collectMdFiles(featuresDir).filter(
    (file) => basename(file) === "archive.md",
  );
  return [...featureArchives, ...collectMdFiles(legacyArchiveDir)];
}

function matchesQuery(filePath: string, query: string): SearchResult | null {
  let content: string;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return null;
  }

  const { frontMatter, body } = parseFrontMatter(content);
  const q = query.toLowerCase();

  const suiteName = String(frontMatter.suite_name ?? "");
  const tags = Array.isArray(frontMatter.tags) ? (frontMatter.tags as string[]) : [];
  const caseCount =
    typeof frontMatter.case_count === "number"
      ? frontMatter.case_count
      : (body.match(/^#{5}\s+/gm) ?? []).length;

  const suiteMatch = suiteName.toLowerCase().includes(q);
  const tagMatch = tags.some((t) => t.toLowerCase().includes(q));

  // Match body headings (lines starting with #)
  const headingMatch = body
    .split("\n")
    .filter((l) => l.startsWith("#"))
    .some((h) => h.toLowerCase().includes(q));

  if (!suiteMatch && !tagMatch && !headingMatch) return null;

  return {
    path: filePath,
    suite_name: suiteName,
    tags,
    case_count: caseCount,
  };
}

async function runSearch(opts: { query: string; dir: string; limit: number }): Promise<void> {
  const searchDir = validateFilePath(opts.dir, [repoRoot()]);
  const files = collectMdFiles(searchDir);
  await runSearchFiles({ query: opts.query, files, limit: opts.limit });
}

async function runSearchFiles(opts: {
  query: string;
  files: string[];
  limit: number;
}): Promise<void> {
  const results: SearchResult[] = [];
  for (const file of opts.files) {
    if (results.length >= opts.limit) break;
    const match = matchesQuery(file, opts.query);
    if (match) results.push(match);
  }

  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
}

// ─── Validation subcommand ──────────────────────────────────────────────────────

interface ValidateResult {
  valid: boolean;
  issues: Array<{
    severity: "error" | "warning";
    message: string;
    location?: string;
  }>;
  stats: {
    suite_name: string;
    case_count: number;
    module_count: number;
    page_count: number;
  };
}

function validateArchiveMarkdown(filePath: string): ValidateResult {
  const issues: ValidateResult["issues"] = [];
  let content: string;
  try {
    content = readFileSync(filePath, "utf8");
  } catch (err) {
    return {
      valid: false,
      issues: [{ severity: "error", message: `Cannot read file: ${err}` }],
      stats: { suite_name: "", case_count: 0, module_count: 0, page_count: 0 },
    };
  }

  const { frontMatter, body } = parseFrontMatter(content);
  const fm = frontMatter as Record<string, unknown>;
  const tags = Array.isArray(fm.tags) ? fm.tags.map(String) : [];
  const isHotfix = fm.origin === "zentao" || tags.includes("hotfix");

  // Required frontmatter fields
  const requiredFmFields = ["suite_name", "create_at", "status", "case_count"];
  for (const field of requiredFmFields) {
    if (fm[field] === undefined || fm[field] === "" || fm[field] === null) {
      issues.push({
        severity: "error",
        message: `Missing or empty required frontmatter field: ${field}`,
        location: "frontmatter",
      });
    }
  }

  // Validate case_count matches actual count
  const actualCaseCount = (body.match(/^##### /gm) ?? []).length;
  const declaredCount =
    typeof fm.case_count === "number" ? fm.case_count : parseInt(String(fm.case_count ?? "0"), 10);
  if (declaredCount !== actualCaseCount) {
    issues.push({
      severity: "warning",
      message: `frontmatter case_count (${declaredCount}) differs from actual case count (${actualCaseCount})`,
      location: "frontmatter.case_count",
    });
  }

  // Parse module structure
  const moduleMatches = body.match(/^## (.+)$/gm) ?? [];
  const pageMatches = body.match(/^### (.+)$/gm) ?? [];

  // Check each case has steps/expected table
  const caseBlocks = body.split(/^##### /gm).slice(1); // skip everything before first case
  let casesWithoutSteps = 0;
  for (const block of caseBlocks) {
    const hasStepTable = /\| 编号 \| 步骤 \| 预期 \|/.test(block);
    if (!hasStepTable) {
      casesWithoutSteps++;
      const title = block.split("\n")[0]?.trim() || "(unnamed)";
      if (casesWithoutSteps <= 3) {
        issues.push({
          severity: "error",
          message: `Missing steps/expected table in case: ${title}`,
          location: `case: ${title}`,
        });
      }
    }
  }

  if (casesWithoutSteps > 3) {
    issues.push({
      severity: "error",
      message: `Missing steps/expected table in ${casesWithoutSteps} cases (showing first 3)`,
    });
  }

  // Ordinary requirement cases need priority markers; hotfix cases must not carry them.
  const hotfixCasesWithPriority = caseBlocks.filter((b) => /^【P\d+】/.test(b.trim())).length;
  const casesWithPriority = caseBlocks.filter((b) => /^【P[0-4]】/.test(b.trim())).length;
  const casesWithoutPriority = caseBlocks.length - casesWithPriority;
  if (isHotfix && hotfixCasesWithPriority > 0) {
    issues.push({
      severity: "error",
      message: "Hotfix case titles must not contain priority tags 【P0】-【P4】.",
    });
  } else if (!isHotfix && casesWithoutPriority > 0) {
    issues.push({
      severity: "warning",
      message: `${casesWithoutPriority} cases missing priority tag 【P0】-【P4】`,
    });
  }

  if (isHotfix) {
    if (/数据源/.test(body) && !/\$\{DataSource[A-Z]\}/.test(body)) {
      issues.push({
        severity: "error",
        message: `Hotfix data source names must use \${DataSourceA}-style placeholders.`,
      });
    }
    if (/(?:数据库|database\/namespace)/i.test(body) && !/\$\{Schema[A-Z]\}/.test(body)) {
      issues.push({
        severity: "error",
        message: `Hotfix database/schema names must use \${SchemaA}-style placeholders.`,
      });
    }

    const hardcodedDataSources = Array.from(
      body.matchAll(/数据源(?:名称)?[：:\s]+([A-Za-z_][A-Za-z0-9_.-]*)/g),
      (match) => match[1],
    );
    if (hardcodedDataSources.length > 0) {
      issues.push({
        severity: "error",
        message: `Hotfix contains hardcoded data source names: ${[...new Set(hardcodedDataSources)].join(", ")}`,
      });
    }

    const hardcodedSchemas = Array.from(
      body.matchAll(/(?:数据库(?:名称)?|database\/namespace)[：:\s]+([A-Za-z_][A-Za-z0-9_.-]*)/gi),
      (match) => match[1],
    );
    if (hardcodedSchemas.length > 0) {
      issues.push({
        severity: "error",
        message: `Hotfix contains hardcoded database/schema names: ${[...new Set(hardcodedSchemas)].join(", ")}`,
      });
    }

    const concreteTables = new Set<string>();
    for (const pattern of [
      /table_name[：:]\s*([A-Za-z_][A-Za-z0-9_]*)/gi,
      /(?:数据表|表名)[：:]\s*([A-Za-z_][A-Za-z0-9_]*)/g,
      /存在数据表\s+([A-Za-z_][A-Za-z0-9_]*)/g,
    ]) {
      for (const match of body.matchAll(pattern)) concreteTables.add(match[1]);
    }
    for (const table of concreteTables) {
      const escaped = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const createTable = new RegExp(
        `CREATE\\s+TABLE(?:\\s+IF\\s+NOT\\s+EXISTS)?\\s+\`?${escaped}\`?\\b`,
        "i",
      );
      if (!createTable.test(body)) {
        issues.push({
          severity: "error",
          message: `Hotfix concrete table ${table} is missing a matching CREATE TABLE statement.`,
        });
      }
    }
  }

  const stats = {
    suite_name: String(fm.suite_name ?? ""),
    case_count: actualCaseCount,
    module_count: moduleMatches.length,
    page_count: pageMatches.length,
  };

  return {
    valid: issues.filter((i) => i.severity === "error").length === 0,
    issues,
    stats,
  };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

export const program = createCli({
  name: "archive-gen",
  description: "将中间 JSON 转为 Archive Markdown，并校验或检索归档",
  commands: [
    {
      name: "convert",
      description: "将中间 JSON 用例转换为 Archive Markdown",
      options: [
        {
          flag: "--input <path>",
          description: "输入 JSON 文件路径（必填）",
          required: true,
        },
        {
          flag: "--output <path>",
          description: "输出 Markdown 文件路径（必填，会写入文件）",
          required: true,
        },
        {
          flag: "--project <name>",
          description: "项目名，例如 dataAssets",
        },
        {
          flag: "--template <path>",
          description: "Handlebars 模板路径；省略时使用内置模板",
        },
      ],
      action: async (opts: {
        input: string;
        output: string;
        project?: string;
        template?: string;
      }) => {
        await runConvert(opts);
      },
    },
    {
      name: "validate",
      description: "校验 Archive Markdown 的结构与 frontmatter",
      options: [
        {
          flag: "--input <path>",
          description: "Archive Markdown 文件路径（必填，只读）",
          required: true,
        },
      ],
      action: async (opts: { input: string }) => {
        const inputPath = validateFilePath(opts.input, [repoRoot()]);
        const result = validateArchiveMarkdown(inputPath);
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        if (!result.valid) {
          process.exit(1);
        }
      },
    },
    {
      name: "search",
      description: "按关键词检索 Archive Markdown 文件",
      options: [
        {
          flag: "--query <keywords>",
          description: "检索关键词（必填）",
          required: true,
        },
        {
          flag: "--project <name>",
          description: "项目名，例如 dataAssets",
        },
        {
          flag: "--dir <path>",
          description: "归档目录；传入后覆盖项目默认目录",
        },
        {
          flag: "--limit <n>",
          description: "最多返回条数，默认 20",
          defaultValue: "20",
        },
      ],
      action: async (opts: { query: string; project?: string; dir?: string; limit: string }) => {
        if (!opts.dir && !opts.project) {
          process.stderr.write(`Error: --project is required (or use --dir to override)\n`);
          process.exit(1);
        }
        const limit = Number.parseInt(opts.limit, 10) || 20;
        if (opts.dir) {
          await runSearch({ query: opts.query, dir: opts.dir, limit });
          return;
        }
        const project = opts.project;
        if (!project) return;
        await runSearchFiles({
          query: opts.query,
          files: collectProjectArchiveFiles(project),
          limit,
        });
      },
    },
  ],
});
