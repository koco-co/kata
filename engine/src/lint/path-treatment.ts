import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { PathReport, PathViolation } from "./types.ts";

interface RuleDef {
  id: "P-S1" | "P-S2" | "P-S3" | "P-S4";
  regex: RegExp;
  message: string;
}

const RULES: RuleDef[] = [
  // P-S2 must come before P-S1 (more specific match)
  {
    id: "P-S2",
    regex: /bun\s+test\s+\.\/\.claude\/scripts\/__tests__/g,
    message: "stale `bun test ./.claude/scripts/__tests__`; use `bun test --cwd engine`",
  },
  {
    id: "P-S4",
    regex: /bun\s+run\s+\.claude\/scripts\//g,
    message: "stale `bun run .claude/scripts/...`; use `kata {subcommand}` or `bunx kata ...`",
  },
  {
    id: "P-S1",
    regex: /\.claude\/scripts\//g,
    message: "stale `.claude/scripts/` reference; use `engine/src/` or specific relocated path",
  },
  {
    id: "P-S3",
    regex: /workspace\/[^/\s]+\/(prds|archive|xmind|tests)\//g,
    message: "old workspace subdir layout; use `workspace/{p}/features/{ym-slug}/...`",
  },
];

const SCAN_SUFFIXES = [".md", ".ts", ".tsx", ".js", ".json"];

const EXCLUDED_PATH_FRAGMENTS = [
  "node_modules",
  "/.repos/",
  "/.kata/repos/",
  "/dist/",
  "/.runs/",
  // workspace/ data dirs — actual files, not references
  "/workspace/",
  // engine test fixture data (v2 paths as test input for backward-compat migration logic)
  "engine/tests/fixtures/",
  // v2 path strings used as fixture input data — test v2 path resolution in migration logic
  // These are NOT real code paths; they're literal strings passed to path helpers.
  "engine/tests/lib/signal-probe.test.ts",
  "engine/tests/lib/paths.test.ts",
  "engine/tests/lib/progress-store.test.ts",
  "engine/tests/plan.test.ts",
  "engine/tests/progress.test.ts",
  "engine/tests/run-tests-notify.test.ts",
  "engine/tests/search-filter.test.ts",
  // plugins test files — reference v2 paths as input data
  "plugins/",
  // old refactor log files
  "refactor-v3-P3-",
  // templates using old layout
  "/templates/",
  "docs/superpowers/specs/",
  "docs/superpowers/handoffs/",
  // agent docs reference valid workspace tests/ paths (feature or helpers level)
  ".claude/agents/pattern-analyzer-agent.md",
  ".claude/agents/regression-runner-agent.md",
  "playwright.config.ts",
  // changelog and audit documents — describe the migration historically
  "CHANGELOG.md",
  "docs/audit/",
];

function isExcluded(filePath: string): boolean {
  return EXCLUDED_PATH_FRAGMENTS.some((frag) => filePath.includes(frag));
}

function walk(root: string, out: string[]): void {
  try {
    const st = statSync(root);
    if (st.isFile()) {
      if (SCAN_SUFFIXES.some((s) => root.endsWith(s)) && !isExcluded(root)) out.push(root);
      return;
    }
    if (!st.isDirectory()) return;
    if (isExcluded(root)) return;
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      walk(join(root, entry.name), out);
    }
  } catch {
    // skip inaccessible paths (broken symlinks, permissions, etc.)
  }
}

export function lintPaths(scanPath: string): PathReport {
  const files: string[] = [];
  walk(scanPath, files);
  const violations: PathViolation[] = [];

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      for (const rule of RULES) {
        rule.regex.lastIndex = 0;
        const m = rule.regex.exec(line);
        if (m) {
          violations.push({
            rule: rule.id,
            file,
            lineNumber: i + 1,
            matched: m[0],
            message: rule.message,
          });
          break;
        }
      }
    }
  }

  return { scanRoot: scanPath, violations, passed: violations.length === 0 };
}
