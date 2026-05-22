import { lstatSync, readdirSync, readFileSync, readlinkSync } from "node:fs";
import { join } from "node:path";
import type { ProjectionRuntime } from "../../runtime/projection-targets.ts";
import type { AiCoreIssue, AiCoreResult } from "../types.ts";
import {
  parseYamlContract,
  readOptionalScalar,
  readOptionalStringList,
  yamlIssues,
} from "../yaml-contract.ts";
import type { CommandContract } from "./runtime-docs.ts";
import {
  COMMAND_INDEX_END,
  COMMAND_INDEX_IDS,
  COMMAND_INDEX_ORDER,
  COMMAND_INDEX_START,
  indexDocPath,
  LEGACY_ROUTING_GUARD_HEADING,
  loadRoutingGuardSection,
  ROUTING_HEADING,
  ROUTING_HEADING_CN,
  renderSkills,
  sha256,
} from "./runtime-docs.ts";

export function loadCommandContracts(coreRoot: string): AiCoreResult<CommandContract[]> {
  const commandsRoot = join(coreRoot, "commands");
  const issues: AiCoreIssue[] = [];
  const files = readCommandContractFiles(commandsRoot);
  if (!files.ok) return files;

  const commands: CommandContract[] = [];
  const seenIds = new Set<string>();
  for (const file of files.value ?? []) {
    const parsed = readCommandContract(commandsRoot, file, seenIds);
    issues.push(...parsed.issues);
    if (parsed.value) commands.push(parsed.value);
  }
  issues.push(...missingRequiredCommandIssues(seenIds));
  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    value: commands
      .filter((command) => command.userInvocable === "true")
      .sort((left, right) => commandOrder(left.id) - commandOrder(right.id)),
    issues: [],
  };
}

function readCommandContractFiles(commandsRoot: string): AiCoreResult<string[]> {
  try {
    return {
      ok: true,
      value: readdirSync(commandsRoot)
        .filter((file) => file.endsWith(".command.yaml"))
        .sort(),
      issues: [],
    };
  } catch {
    return {
      ok: false,
      issues: [
        {
          code: "projection.contract_invalid",
          severity: "error",
          message: "Command contracts directory is missing.",
          path: ".ai/core/commands",
        },
      ],
    };
  }
}

function readCommandContract(
  commandsRoot: string,
  file: string,
  seenIds: Set<string>,
): AiCoreResult<CommandContract | undefined> {
  const source = readFileSync(join(commandsRoot, file), "utf8");
  const path = `.ai/core/commands/${file}`;
  const contract = parseYamlContract(source, path);
  const issues = yamlIssues(contract);
  if (issues.length > 0) return { ok: false, issues };

  const values = commandContractValues(contract);
  const validationIssues = validateCommandContractValues(file, path, values, seenIds);
  if (validationIssues.length > 0) return { ok: false, issues: validationIssues };
  seenIds.add(values.id);
  return {
    ok: true,
    value: {
      id: values.id,
      skill: values.skill,
      userInvocable: values.user_invocable as "true" | "false",
      summary: values.summary,
    },
    issues: [],
  };
}

function commandContractValues(contract: ReturnType<typeof parseYamlContract>) {
  return {
    id: readOptionalScalar(contract, "id") ?? "",
    skill: readOptionalScalar(contract, "skill") ?? "",
    summary: readOptionalScalar(contract, "summary") ?? "",
    user_invocable: readOptionalScalar(contract, "user_invocable") ?? "",
  };
}

function validateCommandContractValues(
  file: string,
  path: string,
  values: ReturnType<typeof commandContractValues>,
  seenIds: Set<string>,
): AiCoreIssue[] {
  const issues: AiCoreIssue[] = [];
  if (!values.id || !values.skill || !values.summary || !values.user_invocable) {
    issues.push(
      commandContractIssue(
        "Command contract requires id, skill, user_invocable, and summary.",
        path,
      ),
    );
    return issues;
  }
  if (values.user_invocable !== "true" && values.user_invocable !== "false") {
    issues.push(
      commandContractIssue("Command contract user_invocable must be exactly true or false.", path),
    );
  }
  if (values.id !== file.replace(/\.command\.yaml$/, "")) {
    issues.push(commandContractIssue("Command contract id must match file basename.", path));
  }
  if (seenIds.has(values.id)) {
    issues.push(commandContractIssue("Command contract id must be unique.", path));
  }
  return issues;
}

function commandContractIssue(message: string, path: string): AiCoreIssue {
  return { code: "projection.contract_invalid", severity: "error", message, path };
}

function missingRequiredCommandIssues(seenIds: Set<string>): AiCoreIssue[] {
  return COMMAND_INDEX_ORDER.flatMap((requiredId) =>
    seenIds.has(requiredId)
      ? []
      : [
          commandContractIssue(
            "Required command contract is missing.",
            `.ai/core/commands/${requiredId}.command.yaml`,
          ),
        ],
  );
}

export function parseYamlStringList(
  content: string,
  path: string,
  key: string,
): AiCoreResult<string[]> {
  const contract = parseYamlContract(content, path);
  const issues = yamlIssues(contract);
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, value: readOptionalStringList(contract, key), issues: [] };
}

export function commandOrder(id: string): number {
  const index = COMMAND_INDEX_ORDER.indexOf(id);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function renderCommandIndexBlock(commands: CommandContract[]): string {
  return [
    COMMAND_INDEX_START,
    "| Command | Skill | Summary |",
    "| --- | --- | --- |",
    ...commands.map(
      (command) =>
        `| /${escapeMarkdownTableCell(command.id)} | ${escapeMarkdownTableCell(command.skill)} | ${escapeMarkdownTableCell(command.summary)} |`,
    ),
    COMMAND_INDEX_END,
  ].join("\n");
}

export function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

export function rootRuntimeDocPath(runtime: ProjectionRuntime): string {
  return runtime === "codex" ? "AGENTS.md" : "CLAUDE.md";
}

// CLAUDE.md is permitted to be a sibling symlink to AGENTS.md so the same
// content serves both Claude Code and Codex/Cursor/Aider via the agents.md
// open standard. Writes through the symlink update the AGENTS.md target.
export function isPermittedRuntimeDocSymlink(root: string, path: string): boolean {
  if (path !== "CLAUDE.md") return false;
  try {
    if (!lstatSync(join(root, path)).isSymbolicLink()) return false;
    return readlinkSync(join(root, path)) === "AGENTS.md";
  } catch {
    return false;
  }
}

export type CommandIndexMarkerState =
  | { ok: true; completeBlocks: number }
  | { ok: false; message: string };

export function commandIndexMarkerState(current: string): CommandIndexMarkerState {
  const starts = [...current.matchAll(new RegExp(escapeRegExp(COMMAND_INDEX_START), "g"))].map(
    (match) => match.index ?? 0,
  );
  const ends = [...current.matchAll(new RegExp(escapeRegExp(COMMAND_INDEX_END), "g"))].map(
    (match) => match.index ?? 0,
  );
  if (starts.length !== ends.length) {
    return { ok: false, message: "Root runtime doc command index markers are unbalanced." };
  }
  for (let index = 0; index < starts.length; index += 1) {
    if (ends[index] < starts[index]) {
      return { ok: false, message: "Root runtime doc command index markers are unbalanced." };
    }
  }
  return { ok: true, completeBlocks: starts.length };
}

export function mergeCommandIndexBlock(
  coreRoot: string,
  current: string | undefined,
  block: string,
): AiCoreResult<string> {
  if (current === undefined || current.length === 0)
    return { ok: true, value: renderRootRuntimeDoc(coreRoot, block), issues: [] };
  const markerState = commandIndexMarkerState(current);
  if (!markerState.ok) return commandIndexDrift(markerState.message);
  if (markerState.completeBlocks > 1) {
    return commandIndexDrift(
      "Root runtime doc must contain at most one complete command index block.",
    );
  }
  const legacy = mergeLegacyCommandIndexTable(current, block);
  if (legacy) return legacy;
  const pattern = new RegExp(
    `${escapeRegExp(COMMAND_INDEX_START)}[\\s\\S]*?${escapeRegExp(COMMAND_INDEX_END)}`,
  );
  const merged = pattern.test(current)
    ? current.replace(pattern, block)
    : appendCommandIndexBlock(current, block);
  const withRoutingGuard = ensureRoutingGuardSection(coreRoot, merged);
  const withCaseArtifactQa = ensureCaseArtifactQaSection(withRoutingGuard);
  return {
    ok: true,
    value: withCaseArtifactQa.endsWith("\n") ? withCaseArtifactQa : `${withCaseArtifactQa}\n`,
    issues: [],
  };
}

function commandIndexDrift(message: string): AiCoreResult<string> {
  return {
    ok: false,
    issues: [{ code: "projection.drift", severity: "error", message, path: "" }],
  };
}

function appendCommandIndexBlock(current: string, block: string): string {
  const separator = current.endsWith("\n\n") ? "" : current.endsWith("\n") ? "\n" : "\n\n";
  return `${current}${separator}${block}\n`;
}

export function caseArtifactQaSection(): string {
  return [
    "## 关键约束",
    "",
    "- **产物自检**：QA 产物（Archives/XMind/CSV）交付前必须自检字段一致性和可读性，详见 `.ai/core/rules/case-qa.md`。",
  ].join("\n");
}

export function renderRootRuntimeDoc(coreRoot: string, commandIndexBlock: string): string {
  return [
    "<!-- generated by kata ai-core; do not edit -->",
    `<!-- ai-core-hash: ${sha256(commandIndexBlock)} -->`,
    "",
    "输入 `/workspace-manage` 查看功能菜单；首次安装见仓库根目录 `INSTALL.md`。",
    "",
    "`.claude/` 与 `.agents/` 是 kata runtime 投影目录；根目录 `AGENTS.md` 为公开 coding-agent 入口（唯一来源），`CLAUDE.md` 是其 symlink。",
    "",
    loadRoutingGuardSection(coreRoot),
    "",
    "## 命令索引",
    "",
    commandIndexBlock,
    "",
    "## 构建与测试",
    "",
    "- Runtime：[Bun](https://bun.sh) ≥ 1.3；装依赖：`bun install`（自动安装 workspaces：`engine`、`tools/dtstack-sdk`）。",
    "- 全量测试：`bun test`；局部：`bun test engine/tests/<area>`；子集：`bun run test:ai-core`。",
    "- Lint 检查：`bun run check`（biome）；自动修复：`bun run check:fix`。",
    "- 投影渲染：`bun engine/bin/kata ai-core projection render`（源契约变更后必须运行）。",
    "",
    "## 关键约束",
    "",
    "- **Worktree 优先**：所有改动走 `.worktrees/<slug>`，验证通过后合并回 main 并推送。详见 `.ai/core/rules/git-workflow.md`。",
    "- **改后即测**：代码/配置改动后必须跑相关测试；失败必须修复，不得跳过或推迟。详见 `.ai/core/rules/testing.md`。",
    "- **Commit 规范**：Conventional Commits（`type: emoji description`），type 小写，description ≤72 字符。",
    "- **命名规范**：Feature 目录 `YYYY-MM[-{customer}]-{module}-{slug}`。详见 `.ai/core/rules/naming-convention.md`。",
    "- **产物自检**：QA 产物（Archives/XMind/CSV）交付前必须自检字段一致性和可读性。详见 `.ai/core/rules/case-qa.md`。",
    "",
    "## 详细规则（按需加载）",
    "",
    "以下规则文件仅在相关任务时按需读取，不占用每次会话入口 token：",
    "",
    "| 规则 | 路径 | 适用场景 |",
    "|------|------|----------|",
    "| 测试规范 | `.ai/core/rules/testing.md` | 编写/修改测试 |",
    "| Git 工作流 | `.ai/core/rules/git-workflow.md` | 创建分支/合并 |",
    "| 命名约定 | `.ai/core/rules/naming-convention.md` | 创建 feature 目录 |",
    "| 产物 QA | `.ai/core/rules/case-qa.md` | 生成/编辑 QA 产物 |",
    "| 工作区边界 | `.ai/core/rules/workspace-boundary.md` | 读写 workspace 文件 |",
    "",
  ].join("\n");
}

export function ensureCaseArtifactQaSection(current: string): string {
  const section = caseArtifactQaSection();
  const oldHeading = "## Case Artifact QA";
  const newHeading = "## 关键约束";

  if (current.includes(newHeading)) return current;

  if (current.includes(oldHeading)) {
    const existingIndex = current.indexOf(oldHeading);
    const afterExisting = current.slice(existingIndex + oldHeading.length);
    const nextHeadingMatch = afterExisting.match(/\n## [^\n]+/);
    const endIndex = nextHeadingMatch
      ? existingIndex + oldHeading.length + (nextHeadingMatch.index ?? 0)
      : current.length;
    const before = current.slice(0, existingIndex).replace(/\s*$/, "\n\n");
    const after = current.slice(endIndex).replace(/^\s*/, "");
    return `${before}${section}\n\n${after}`;
  }

  const anchor = "## 命令索引";
  const anchorIndex = current.indexOf(anchor);
  if (anchorIndex >= 0) {
    const afterAnchor = current.slice(anchorIndex + anchor.length);
    const nextHeadingMatch = afterAnchor.match(/\n## [^\n]+/);
    const insertIndex = nextHeadingMatch
      ? anchorIndex + anchor.length + (nextHeadingMatch.index ?? 0)
      : current.length;
    const before = current.slice(0, insertIndex).replace(/\s*$/, "\n\n");
    const after = current.slice(insertIndex).replace(/^\s*/, "");
    return `${before}${section}\n\n${after}`;
  }

  return current.endsWith("\n") ? `${current}${section}\n` : `${current}\n\n${section}\n`;
}

export function ensureRoutingGuardSection(coreRoot: string, current: string): string {
  const section = loadRoutingGuardSection(coreRoot);
  const existingHeading = [ROUTING_HEADING, ROUTING_HEADING_CN, LEGACY_ROUTING_GUARD_HEADING].find(
    (heading) => current.includes(heading),
  );
  if (existingHeading) {
    const existingIndex = current.indexOf(existingHeading);
    const afterExisting = current.slice(existingIndex + existingHeading.length);
    const nextHeadingMatch = afterExisting.match(/\n## [^\n]+/);
    const endIndex = nextHeadingMatch
      ? existingIndex + existingHeading.length + (nextHeadingMatch.index ?? 0)
      : current.length;
    const before = current.slice(0, existingIndex).replace(/\s*$/, "\n\n");
    const after = current.slice(endIndex).replace(/^\s*/, "");
    return `${before}${section}\n\n${after}`;
  }
  const heading = "## 命令索引";
  const index = current.indexOf(heading);
  if (index < 0) return current;
  const before = current.slice(0, index).replace(/\s*$/, "\n\n");
  const after = current.slice(index).replace(/^\s*/, "");
  return `${before}${section}\n\n${after}`;
}

export function mergeLegacyCommandIndexTable(
  current: string,
  block: string,
): AiCoreResult<string> | undefined {
  const heading = "## 命令索引";
  const headingIndex = current.indexOf(heading);
  if (headingIndex < 0) return undefined;
  const afterHeadingIndex = headingIndex + heading.length;
  const afterHeading = current.slice(afterHeadingIndex);
  const tableStartInAfterHeading = afterHeading.search(/\n[ \t]*\|/);
  if (tableStartInAfterHeading < 0) return undefined;
  if (afterHeading.slice(0, tableStartInAfterHeading).includes(COMMAND_INDEX_START))
    return undefined;
  const tableStart = afterHeadingIndex + tableStartInAfterHeading + 1;
  const tableEnd = findMarkdownTableEnd(current, tableStart);
  const table = current.slice(tableStart, tableEnd);
  if (!table.includes("|")) return undefined;

  const nonGaRows = table
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith("|"))
    .filter((line) => !isMarkdownSeparatorRow(line))
    .filter((line) => !isLegacyCommandHeaderRow(line))
    .filter((line) => !COMMAND_INDEX_IDS.has(commandIdFromLegacyRow(line)));
  const sections = [[heading, "", block].join("\n")];
  if (nonGaRows.length > 0) {
    sections.push(["## 其他命令", "", "| 命令 | 功能 |", "| --- | --- |", ...nonGaRows].join("\n"));
  }
  const replacement = sections.join("\n\n");
  const beforeHeading = current.slice(0, headingIndex);
  const afterTable = current
    .slice(tableEnd)
    .replace(
      new RegExp(
        `\\s*${escapeRegExp(COMMAND_INDEX_START)}[\\s\\S]*?${escapeRegExp(COMMAND_INDEX_END)}\\s*`,
      ),
      "\n\n",
    );
  const next = `${beforeHeading}${replacement}${afterTable.replace(/^\n{3,}/, "\n\n")}`;
  return { ok: true, value: next.endsWith("\n") ? next : `${next}\n`, issues: [] };
}

export function findMarkdownTableEnd(content: string, tableStart: number): number {
  const rest = content.slice(tableStart);
  let offset = 0;
  for (const line of rest.split(/(?<=\n)/)) {
    if (!line.trim().startsWith("|")) break;
    offset += line.length;
  }
  return tableStart + offset;
}

export function commandIdFromLegacyRow(line: string): string {
  const command = markdownTableCells(line)[0] ?? "";
  return command.replace(/`/g, "").replace(/^\//, "");
}

export function isLegacyCommandHeaderRow(line: string): boolean {
  const firstCell = markdownTableCells(line)[0];
  return firstCell === "命令" || firstCell === "Command";
}

export function isMarkdownSeparatorRow(line: string): boolean {
  const cells = markdownTableCells(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

export function markdownTableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

export function extractCommandIndexBlock(current: string): string | undefined {
  const start = current.indexOf(COMMAND_INDEX_START);
  if (start < 0) return undefined;
  const end = current.indexOf(COMMAND_INDEX_END, start);
  if (end < 0) return undefined;
  return current.slice(start, end + COMMAND_INDEX_END.length);
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function sorted(values: string[]): string[] {
  return [...values].sort();
}

export function sameStringSet(left: string[], right: string[]): boolean {
  return JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
}

export function _renderedGeneratedPaths(runtime: ProjectionRuntime, coreRoot: string): string[] {
  const rendered = renderSkills(runtime, coreRoot);
  if (!rendered.ok) return [];
  return [
    ...(rendered.value ?? []).map((file) => file.path),
    rootRuntimeDocPath(runtime),
    indexDocPath(runtime),
  ];
}
