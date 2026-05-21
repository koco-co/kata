import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { repoRoot } from "./paths.ts";
import type { AiCoreIssue, AiCoreResult } from "./types.ts";
import { parseYamlRows, parseYamlTopLevelScalars } from "./yaml-contract.ts";

type DocsBlockConfig = {
  id: string;
  source: string;
  targets: string[];
};

type CommandDoc = {
  id: string;
  skill: string;
  summaryZh: string;
  summaryEn: string;
  areaZh: string;
  areaEn: string;
};

const DOC_FILES = ["README.md", "README-EN.md", "CHANGELOG.md"] as const;
const HTML_COMMENT_PATTERN = /<!--([\s\S]*?)-->/g;
const BLOCK_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const MARKER_ACTIONS = new Set(["start", "hash", "end"]);
const COMMAND_ORDER = [
  "workspace-manage",
  "case-draft",
  "case-edit",
  "knowledge-curate",
  "bug-file",
  "conflict-analyze",
  "case-hotfix",
  "playwright-automation",
  "diff-scan",
] as const;

const COMMAND_AREAS: Record<string, { zh: string; en: string }> = {
  "workspace-manage": { zh: "工作区", en: "Workspace" },
  "case-draft": { zh: "用例生成", en: "Case generation" },
  "case-edit": { zh: "用例维护", en: "Case maintenance" },
  "knowledge-curate": { zh: "知识管理", en: "Knowledge" },
  "bug-file": { zh: "缺陷与变更", en: "Defects and changes" },
  "conflict-analyze": { zh: "缺陷与变更", en: "Defects and changes" },
  "case-hotfix": { zh: "缺陷与变更", en: "Defects and changes" },
  "playwright-automation": { zh: "UI 自动化", en: "UI automation" },
  "diff-scan": { zh: "代码扫描", en: "Code scanning" },
};

const COMMAND_EN_SUMMARIES: Record<string, string> = {
  "workspace-manage": "Show the feature menu and manage kata project workspaces.",
  "case-draft": "Generate QA test cases from requirements, PRDs, or design sources.",
  "case-edit": "Edit, sync, convert, or normalize existing QA case artifacts.",
  "knowledge-curate": "Query or update project business knowledge and rules.",
  "bug-file": "Turn observed failures into evidence-backed bug reports.",
  "conflict-analyze": "Analyze merge conflicts and produce resolution notes.",
  "case-hotfix": "Generate hotfix regression cases from bugs or fix records.",
  "playwright-automation":
    "Plan, generate, run, triage, and repair Playwright UI automation before handoff.",
  "diff-scan": "Scan code diffs for reproducible defects.",
};

function hash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function block(id: string, body: string): string {
  const normalized = body.trimEnd();
  return [
    `<!-- ai-core:start ${id} -->`,
    normalized,
    `<!-- ai-core:hash ${hash(normalized)} -->`,
    `<!-- ai-core:end ${id} -->`,
    "",
  ].join("\n");
}

function upsertBlock(current: string, id: string, body: string): string {
  const rendered = block(id, body);
  const pattern = new RegExp(
    `<!-- ai-core:start ${escapeRegExp(id)} -->[\\s\\S]*?<!-- ai-core:end ${escapeRegExp(id)} -->\\n?`,
  );
  if (pattern.test(current)) return current.replace(pattern, rendered);
  return `${current.trimEnd()}\n\n${rendered}`;
}

export async function renderDocsBlocks(
  options: { outputRoot?: string } = {},
): Promise<AiCoreResult<null>> {
  const root = options.outputRoot ?? repoRoot();
  const expected = await buildExpectedBlocks();
  for (const file of DOC_FILES) {
    let current = readExisting(join(root, file), fallbackFor(file));
    for (const [id, body] of expected[file]) {
      current = upsertBlock(current, id, body);
    }
    writeFile(join(root, file), current);
  }
  return { ok: true, value: null, issues: [] };
}

export async function checkDocsBlocks(
  options: { outputRoot?: string } = {},
): Promise<AiCoreResult<null>> {
  const root = options.outputRoot ?? repoRoot();
  const expected = await buildExpectedBlocks();
  const issues: AiCoreIssue[] = [];

  for (const file of DOC_FILES) {
    const path = join(root, file);
    if (!existsSync(path)) {
      issues.push({
        code: "docs.file_missing",
        severity: "error",
        path: file,
        message: `Documentation file is missing: ${file}`,
      });
      continue;
    }

    const text = readFileSync(path, "utf8");
    const expectedIds = [...expected[file].keys()];
    const actualBlocks = scanManagedBlocks(text, file);
    issues.push(...actualBlocks.issues);

    const expectedIdSet = new Set(expectedIds);
    const seenIds = new Set<string>();
    for (const block of actualBlocks.blocks) {
      if (!expectedIdSet.has(block.id)) {
        issues.push({
          code: "docs.generated_block_unexpected",
          severity: "error",
          path: file,
          message: `Unexpected generated block: ${block.id}`,
        });
      }
      if (seenIds.has(block.id)) {
        issues.push({
          code: "docs.generated_block_duplicate",
          severity: "error",
          path: file,
          message: `Duplicate generated block: ${block.id}`,
        });
      }
      seenIds.add(block.id);
    }

    const actualIds = actualBlocks.blocks.map((block) => block.id);
    if (!sameSequence(actualIds, expectedIds)) {
      issues.push({
        code: "docs.generated_block_order",
        severity: "error",
        path: file,
        message: `Generated block order must be: ${expectedIds.join(", ")}`,
      });
    }

    for (const [id, body] of expected[file]) {
      const current = actualBlocks.blocks.find((block) => block.id === id);
      const rendered = block(id, body).trimEnd();
      if (!current) {
        issues.push({
          code: "docs.generated_block_missing",
          severity: "error",
          path: file,
          message: `Generated block is missing: ${id}`,
        });
        continue;
      }
      const expectedHash = hash(current.body.trimEnd());
      if (current.hash !== expectedHash) {
        issues.push({
          code: "docs.generated_block_drift",
          severity: "error",
          path: file,
          message: `Generated block hash mismatch for ${id}.`,
        });
        continue;
      }
      if (current.full.trimEnd() !== rendered) {
        issues.push({
          code: "docs.generated_block_drift",
          severity: "error",
          path: file,
          message: `Generated block content drifted from AI Core source: ${id}.`,
        });
      }
    }
  }

  const zhIds = actualBlockIds(root, "README.md");
  const enIds = actualBlockIds(root, "README-EN.md");
  if (!sameSequence(zhIds, enIds)) {
    issues.push({
      code: "docs.readme_block_order_mismatch",
      severity: "error",
      path: "README.md",
      message: "README.md and README-EN.md generated block ids/order must match.",
    });
  }

  return { ok: issues.length === 0, value: null, issues };
}

async function buildExpectedBlocks(): Promise<
  Record<(typeof DOC_FILES)[number], Map<string, string>>
> {
  const configs = loadBlockConfig(repoRoot());
  const byFile: Record<(typeof DOC_FILES)[number], Map<string, string>> = {
    "README.md": new Map(),
    "README-EN.md": new Map(),
    "CHANGELOG.md": new Map(),
  };

  for (const config of configs) {
    for (const target of config.targets) {
      if (!isDocFile(target)) continue;
      byFile[target].set(config.id, renderBlockBody(config.id, target));
    }
  }

  return byFile;
}

function loadBlockConfig(root: string): DocsBlockConfig[] {
  const path = ".ai/core/docs/generated-blocks.yaml";
  const text = readFileSync(join(root, path), "utf8");
  const result = parseYamlRows(text, path, "blocks");
  if (!result.ok)
    throw new Error(result.issues.map((issue) => `${issue.code}: ${issue.message}`).join("; "));
  return (result.value ?? []).map((row) => ({
    id: row.id,
    source: row.source,
    targets: row.targets.split("\n").filter(Boolean),
  }));
}

function renderBlockBody(id: string, target: string): string {
  switch (id) {
    case "command-index":
      return renderCommandIndex(target, loadCommandDocs(repoRoot()));
    case "runtime-support":
      return renderRuntimeSupport(target);
    case "release-summary":
      return [
        "- Phase 4 AI Core hardening prepares GA-completion checks with generated documentation, runtime projection checks, schema guards, and deterministic eval gates.",
        "- Claude and kata Codex runtime projections are generated from `.ai/core`; `.agents/**` is kata's internal Codex runtime projection, while root `AGENTS.md` is the public coding-agent convention file.",
        "- Phase 5 closed the deterministic baseline failures; `.ai/core/evals/baseline-known-failures.json` now tracks deterministic failures only.",
        "- Browser PDF integration is opt-in and environment-dependent, with the explicit check tracked in `.ai/core/evals/environment-dependent-checks.json`.",
        "- 4.0.0-alpha.0 remains unreleased; Phase 4 is complete/prepared, and this generated summary does not claim final 4.0.0 GA.",
      ].join("\n");
    default:
      throw new Error(`Unsupported generated docs block: ${id}`);
  }
}

function loadCommandDocs(root: string): CommandDoc[] {
  const commandRoot = join(root, ".ai/core/commands");
  const commands = readdirSync(commandRoot)
    .filter((file) => file.endsWith(".command.yaml"))
    .map((file) => {
      const path = `.ai/core/commands/${file}`;
      const text = readFileSync(join(root, path), "utf8");
      const result = parseYamlTopLevelScalars(text, path);
      if (!result.ok)
        throw new Error(result.issues.map((issue) => `${issue.code}: ${issue.message}`).join("; "));
      const fields = result.value ?? {};
      if (fields.user_invocable !== "true") return undefined;
      const id = requireCommandField(fields, "id", path);
      const area = COMMAND_AREAS[id] ?? { zh: "其他", en: "Other" };
      return {
        id,
        skill: requireCommandField(fields, "skill", path),
        summaryZh: requireCommandField(fields, "summary", path),
        summaryEn: COMMAND_EN_SUMMARIES[id] ?? requireCommandField(fields, "summary", path),
        areaZh: area.zh,
        areaEn: area.en,
      };
    })
    .filter((command): command is CommandDoc => command !== undefined);
  const order = new Map(COMMAND_ORDER.map((id, index) => [id, index]));
  return commands.sort((left, right) => (order.get(left.id) ?? 999) - (order.get(right.id) ?? 999));
}

function requireCommandField(fields: Record<string, string>, key: string, path: string): string {
  const value = fields[key];
  if (!value) throw new Error(`Missing command field '${key}' in ${path}`);
  return value;
}

function renderCommandIndex(target: string, commands: CommandDoc[]): string {
  const isZh = target === "README.md";
  const header = isZh
    ? "| 命令 | 领域 | Skill | 说明 |\n| --- | --- | --- | --- |"
    : "| Command | Area | Skill | Summary |\n| --- | --- | --- | --- |";
  const rows = commands
    .map((command) => {
      const area = isZh ? command.areaZh : command.areaEn;
      const summary = isZh ? command.summaryZh : command.summaryEn;
      return `| \`/${command.id}\` | ${area} | \`${command.skill}\` | ${summary} |`;
    })
    .join("\n");
  return [header, rows].join("\n");
}

function renderRuntimeSupport(target: string): string {
  if (target === "README.md") {
    return [
      "| Runtime / 边界 | 当前职责 |",
      "| --- | --- |",
      "| `.ai/core/**` | AI Core 合约源：skills、commands、workflows、agents、prompts、schemas、guards、runtime manifests。 |",
      "| `.agents/**` | kata Codex runtime 投影目录，由 `.ai/core` 生成；不要手工改生成内容。 |",
      "| `.claude/**` | Claude Code runtime 投影目录，由 `.ai/core` 生成；不要手工改生成内容。 |",
      "| `workspace/{project}/**` | 项目产物目录，存放 PRD 派生物、Archive MD、XMind、报告、Playwright 产物和项目知识。 |",
      "| `workspace/{project}/.kata/repos/**` | 源码证据目录，只读；kata workflow 不在这里 push、commit 或写业务文件。 |",
    ].join("\n");
  }
  return [
    "| Runtime / Boundary | Current responsibility |",
    "| --- | --- |",
    "| `.ai/core/**` | AI Core contract source for skills, commands, workflows, agents, prompts, schemas, guards, and runtime manifests. |",
    "| `.agents/**` | kata Codex runtime projection generated from `.ai/core`; do not edit generated content by hand. |",
    "| `.claude/**` | Claude Code runtime projection generated from `.ai/core`; do not edit generated content by hand. |",
    "| `workspace/{project}/**` | Project artifact area for PRD derivatives, Archive MD, XMind, reports, Playwright outputs, and project knowledge. |",
    "| `workspace/{project}/.kata/repos/**` | Read-only source evidence area; kata workflows must not push, commit, or write business files there. |",
  ].join("\n");
}

function readExisting(path: string, fallback: string): string {
  return existsSync(path) ? readFileSync(path, "utf8") : fallback;
}

function writeFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function fallbackFor(file: (typeof DOC_FILES)[number]): string {
  return file === "CHANGELOG.md" ? "# Changelog\n\n## 4.0.0-alpha.0 (UNRELEASED)\n" : "# kata\n";
}

function isDocFile(value: string): value is (typeof DOC_FILES)[number] {
  return DOC_FILES.includes(value as (typeof DOC_FILES)[number]);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type ScannedBlock = {
  body: string;
  full: string;
  hash: string;
  id: string;
};

function scanManagedBlocks(
  text: string,
  path: string,
): { blocks: ScannedBlock[]; issues: AiCoreIssue[] } {
  const markers = [...text.matchAll(HTML_COMMENT_PATTERN)]
    .map((match) => ({
      end: match.index + match[0].length,
      full: match[0],
      index: match.index,
      payload: match[1].trim(),
    }))
    .filter((comment) => comment.payload.startsWith("ai-core:"))
    .map((comment) => ({
      end: comment.end,
      full: comment.full,
      index: comment.index,
      ...parseMarkerPayload(comment.payload.slice("ai-core:".length)),
    }));
  const blocks: ScannedBlock[] = [];
  const issues: AiCoreIssue[] = [];

  for (const marker of markers) {
    if (!MARKER_ACTIONS.has(marker.kind)) {
      issues.push({
        code: "docs.generated_block_unknown_marker",
        severity: "error",
        path,
        message: `Unknown AI Core generated block marker action: ${marker.kind}`,
      });
    }
  }

  for (let index = 0; index < markers.length; ) {
    const start = markers[index];
    const hashMarker = markers[index + 1];
    const end = markers[index + 2];
    if (
      start?.kind !== "start" ||
      hashMarker?.kind !== "hash" ||
      end?.kind !== "end" ||
      start.value.length === 0 ||
      end.value !== start.value ||
      !/^[a-f0-9]{64}$/.test(hashMarker.value)
    ) {
      issues.push({
        code: "docs.generated_block_malformed",
        severity: "error",
        path,
        message: "Malformed AI Core generated block markers.",
      });
      index += 1;
      continue;
    }

    if (!BLOCK_ID_PATTERN.test(start.value)) {
      issues.push({
        code: "docs.generated_block_malformed",
        severity: "error",
        path,
        message: `Invalid generated block id: ${start.value}`,
      });
    }

    blocks.push({
      id: start.value,
      body: text.slice(start.end + 1, hashMarker.index - 1),
      full: text.slice(start.index, end.end),
      hash: hashMarker.value,
    });
    index += 3;
  }

  return { blocks, issues };
}

function actualBlockIds(root: string, file: (typeof DOC_FILES)[number]): string[] {
  const path = join(root, file);
  if (!existsSync(path)) return [];
  return scanManagedBlocks(readFileSync(path, "utf8"), file).blocks.map((block) => block.id);
}

function sameSequence(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function parseMarkerPayload(payload: string): { kind: string; value: string } {
  const trimmed = payload.trim();
  const separator = trimmed.search(/\s/);
  if (separator === -1) return { kind: trimmed, value: "" };
  return {
    kind: trimmed.slice(0, separator),
    value: trimmed.slice(separator + 1).trim(),
  };
}
