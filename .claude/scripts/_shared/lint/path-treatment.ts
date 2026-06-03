import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { PathReport, PathRuleId, PathViolation } from "./types.ts";

interface RuleDef {
  id: PathRuleId;
  regex: RegExp;
  message: string;
}

// P-S1（`.claude/scripts/` 引用）与 P-S4（`bun run .claude/scripts/...`）在 bundle 迁移后退役：
// `.claude/scripts/` 已成为 canonical 代码家（`bin.kata` + `bun run .claude/scripts/lint/*`），
// 原本指向 `engine/src/` 的告警方向被彻底反转。保留 P-S2/P-S3，它们仍捕获真正陈旧的模式。
const RULES: RuleDef[] = [
  {
    id: "P-S2",
    regex: /bun\s+test\s+\.\/\.claude\/scripts\/__tests__/g,
    message: "stale `bun test ./.claude/scripts/__tests__`; use `bun test`",
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
  // test fixture data (v2 paths as test input for backward-compat migration logic)
  ".claude/scripts/_shared/tests/fixtures/",
  // v2 path strings used as fixture input data — test v2 path resolution in migration logic
  // These are NOT real code paths; they're literal strings passed to path helpers.
  ".claude/scripts/_shared/tests/lib/signal-probe.test.ts",
  ".claude/scripts/_shared/tests/lib/paths.test.ts",
  ".claude/scripts/_shared/tests/plan.test.ts",
  ".claude/scripts/_shared/tests/progress.test.ts",
  ".claude/scripts/_shared/tests/run-tests-notify.test.ts",
  ".claude/scripts/_shared/tests/search-filter.test.ts",
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

function isExcluded(filePath: string, scanRoot: string): boolean {
  // detached worktrees 固定挂在 repo root 下的 .worktrees/<slug>；只排除 scanRoot 之下的
  // .worktrees/，这样在 .worktrees 路径中检出的仓库（含本仓测试夹具）不会被整体跳过。
  const rel = filePath.startsWith(scanRoot) ? filePath.slice(scanRoot.length) : filePath;
  if (rel === "/.worktrees" || rel.startsWith("/.worktrees/")) return true;
  return EXCLUDED_PATH_FRAGMENTS.some((frag) => filePath.includes(frag));
}

function walk(root: string, scanRoot: string, out: string[]): void {
  try {
    const st = statSync(root);
    if (st.isFile()) {
      if (SCAN_SUFFIXES.some((s) => root.endsWith(s)) && !isExcluded(root, scanRoot))
        out.push(root);
      return;
    }
    if (!st.isDirectory()) return;
    if (isExcluded(root, scanRoot)) return;
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      walk(join(root, entry.name), scanRoot, out);
    }
  } catch {
    // skip inaccessible paths (broken symlinks, permissions, etc.)
  }
}

export function lintPaths(scanPath: string): PathReport {
  const files: string[] = [];
  walk(scanPath, scanPath, files);
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
