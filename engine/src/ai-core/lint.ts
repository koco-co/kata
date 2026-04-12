import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { repoRoot } from "./paths.ts";
import { auditPluginRuntimeMetadata } from "./plugin-runtime-audit.ts";
import {
  parseProjectionInventory,
  scanRuntimeFiles,
  validateProjectionInventory,
} from "./projection-inventory.ts";
import { auditRuntimeConflictMarkers } from "./runtime-conflict-audit.ts";
import type { AiCoreIssue, AiCoreResult, AiCoreRuntimeRoot } from "./types.ts";

export type LintAiCoreOptions = {
  root?: string;
  strict?: boolean;
};

const HIDDEN_ID_PATTERN = /\b[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)?@[0-9]+(?![.\w-])/g;
const DOCS_REFERENCE_PATTERN = /(^|["'\s])docs\//;

const STALE_UI_AUTOMATION_SLASH_PATTERNS = ["/ui-plan", "/playwright-gen", "/run-triage"] as const;

const STALE_AGENTS_VER = "1";

const STALE_AUTOMATION_PATTERNS: readonly string[] = [
  ...STALE_UI_AUTOMATION_SLASH_PATTERNS,
  ...STALE_UI_AUTOMATION_SLASH_PATTERNS.map((p) => `${p.slice(1)}@${STALE_AGENTS_VER}`),
];

const STALE_UI_AUTOMATION_ALLOWED_PATHS = [
  "docs/superpowers/specs/",
  "docs/superpowers/plans/",
  "CHANGELOG.md",
  ".ai/core/runtimes/projection-inventory.yaml",
  ".ai/core/runtimes/inventory-ledgers/",
  ".agents/skills/playwright-automation/",
  ".claude/skills/playwright-automation/",
] as const;

function walkFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const entries = readdirSync(root).sort();
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(root, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) files.push(...walkFiles(fullPath));
    if (stat.isFile()) files.push(fullPath);
  }
  return files;
}

function issue(code: string, message: string, path: string): AiCoreIssue {
  return { code, severity: "error", message, path };
}

function scanActiveSurfaces(root: string): string[] {
  const surfaces: string[] = [];
  for (const name of ["README.md", "README-EN.md", "AGENTS.md", "CLAUDE.md"]) {
    const file = join(root, name);
    if (existsSync(file)) surfaces.push(file);
  }
  const commandsDir = join(root, ".ai/core/commands");
  if (existsSync(commandsDir)) {
    surfaces.push(...walkFiles(commandsDir).filter((f) => f.endsWith(".yaml")));
  }
  for (const dir of [".agents/skills", ".claude/skills"]) {
    const skillsDir = join(root, dir);
    if (existsSync(skillsDir)) surfaces.push(...walkFiles(skillsDir));
  }
  return surfaces;
}

function checkStaleUiAutomationSurfaces(root: string): AiCoreIssue[] {
  const issues: AiCoreIssue[] = [];
  for (const file of scanActiveSurfaces(root)) {
    const relPath = relative(root, file);
    if (STALE_UI_AUTOMATION_ALLOWED_PATHS.some((allowed) => relPath.startsWith(allowed))) {
      continue;
    }
    const text = readFileSync(file, "utf8");
    if (STALE_AUTOMATION_PATTERNS.some((pattern) => text.includes(pattern))) {
      issues.push(
        issue(
          "lint.stale_ui_automation_surface",
          "Stale UI automation surface name found. These commands/skills have been renamed.",
          relPath,
        ),
      );
    }
  }
  return issues;
}

export async function lintAiCore(options: LintAiCoreOptions = {}): Promise<AiCoreResult<null>> {
  const root = options.root ?? repoRoot();
  const issues: AiCoreIssue[] = [];

  for (const file of walkFiles(join(root, ".ai", "core"))) {
    const text = readFileSync(file, "utf8");
    if (DOCS_REFERENCE_PATTERN.test(text)) {
      issues.push(
        issue(
          "docs_reference.blocked",
          "Runtime contracts must not reference docs paths.",
          relative(root, file),
        ),
      );
    }
  }

  for (const runtimeRoot of loadRuntimeRoots(root)) {
    if (runtimeRoot.hidden_id_lint !== true) continue;
    for (const file of walkFiles(resolveImplementationRoot(root, runtimeRoot.path))) {
      const text = readFileSync(file, "utf8");
      const matches = text.match(HIDDEN_ID_PATTERN) ?? [];
      if (matches.length > 0) {
        issues.push(
          issue(
            "hidden_contract_id.blocked",
            `Hidden contract id in implementation root: ${matches[0]}`,
            relative(root, file),
          ),
        );
      }
    }
  }

  const inventoryPath = join(root, ".ai", "core", "runtimes", "projection-inventory.yaml");
  const runtimeFiles = scanRuntimeFiles(root);
  if (existsSync(inventoryPath)) {
    const inventory = parseProjectionInventory(readFileSync(inventoryPath, "utf8"));
    const result = validateProjectionInventory({
      files: runtimeFiles,
      inventory,
    });
    issues.push(...result.issues);
  } else if (runtimeFiles.length > 0) {
    issues.push(
      issue(
        "projection_inventory.missing",
        "Projection inventory is required when runtime files exist.",
        ".ai/core/runtimes/projection-inventory.yaml",
      ),
    );
  }

  issues.push(...auditPluginRuntimeMetadata({ root }).issues);
  issues.push(...auditRuntimeConflictMarkers({ root }).issues);
  issues.push(...checkStaleUiAutomationSurfaces(root));

  return {
    ok: issues.every((found) => found.severity !== "error"),
    value: null,
    issues,
  };
}

function loadRuntimeRoots(root: string): AiCoreRuntimeRoot[] {
  const path = join(root, ".ai", "core", "runtimes", "implementation-roots.yaml");
  if (!existsSync(path)) return [];
  return parseRuntimeRootRows(readFileSync(path, "utf8"));
}

function parseRuntimeRootRows(content: string): AiCoreRuntimeRoot[] {
  const rows: Partial<Record<keyof AiCoreRuntimeRoot, string | boolean>>[] = [];
  let current: Partial<Record<keyof AiCoreRuntimeRoot, string | boolean>> | undefined;
  let inside = false;
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "implementation_roots:") {
      inside = true;
      continue;
    }
    if (!inside || line.length === 0 || line.startsWith("#")) continue;
    if (line.startsWith("- ")) {
      if (current) rows.push(current);
      current = {};
      assignRuntimeRootValue(current, line.slice(2));
      continue;
    }
    if (current) assignRuntimeRootValue(current, line);
  }
  if (current) rows.push(current);
  return rows
    .filter((row) => typeof row.path === "string")
    .map((row) => ({
      path: String(row.path),
      status: row.status === "transitional" ? "transitional" : "declared",
      hidden_id_lint: row.hidden_id_lint === true,
    }));
}

function assignRuntimeRootValue(
  row: Partial<Record<keyof AiCoreRuntimeRoot, string | boolean>>,
  pair: string,
): void {
  const index = pair.indexOf(":");
  if (index === -1) return;
  const key = pair.slice(0, index).trim() as keyof AiCoreRuntimeRoot;
  const rawValue = pair.slice(index + 1).trim();
  if (key !== "path" && key !== "status" && key !== "hidden_id_lint") return;
  row[key] =
    rawValue === "true" ? true : rawValue === "false" ? false : rawValue.replace(/^"|"$/g, "");
}

function resolveImplementationRoot(root: string, pattern: string): string {
  if (pattern.endsWith("/**")) return join(root, pattern.slice(0, -3));
  const wildcardIndex = pattern.indexOf("*");
  if (wildcardIndex === -1) return join(root, pattern);
  return join(root, dirname(pattern.slice(0, wildcardIndex)));
}
