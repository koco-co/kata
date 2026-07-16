import { afterAll, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lintPaths } from "@shared/lint/path-treatment.ts";

const FX = join(import.meta.dirname, "fixtures");

test("P-S2: bun test ./.claude/scripts/__tests__ flagged", () => {
  const r = lintPaths(join(FX, "path-treatment-bad/file-with-bun-test.md"));
  expect(r.violations.some((v) => v.rule === "P-S2")).toBe(true);
});

test("P-S3: old workspace subdir flagged", () => {
  const r = lintPaths(join(FX, "path-treatment-bad/file-with-old-workspace.md"));
  expect(r.violations.some((v) => v.rule === "P-S3")).toBe(true);
});

test("P-S5: cwd-relative persistent CLI path flagged", () => {
  const file = join(TMP, "cwd-path.ts");
  writeFileSync(file, 'const root = join(process.cwd(), "workspace");\n');
  const r = lintPaths(file);
  rmSync(file);
  expect(r.violations).toEqual([
    expect.objectContaining({ rule: "P-S5", matched: 'join(process.cwd(), "workspace")' }),
  ]);
});

test("P-S6: machine-specific absolute runtime path flagged", () => {
  const file = join(TMP, "absolute-path.ts");
  writeFileSync(file, 'const session = "/Users/example/runtime/session.json";\n');
  const r = lintPaths(file);
  rmSync(file);
  expect(r.violations).toEqual([expect.objectContaining({ rule: "P-S6" })]);
});

test("P-S7: hardcoded auth session path flagged", () => {
  const file = join(TMP, "session-path.ts");
  writeFileSync(file, 'const session = ".kata/zentao/session.json";\n');
  const r = lintPaths(file);
  rmSync(file);
  expect(r.violations).toEqual([expect.objectContaining({ rule: "P-S7" })]);
});

test("P-S8: hardcoded service IP flagged", () => {
  const file = join(TMP, "service-url.ts");
  writeFileSync(file, 'const baseUrl = "http://172.16.1.2:8080/api";\n');
  const r = lintPaths(file);
  rmSync(file);
  expect(r.violations).toEqual([expect.objectContaining({ rule: "P-S8" })]);
});

// P-S1/P-S4 retired after the bundle migration made `.claude/scripts/` the
// canonical home (`bin.kata` + `bun run .claude/scripts/lint/*`). file-clean.md
// references both patterns and must stay clean.
test("retired P-S1/P-S4: canonical .claude/scripts/ references not flagged", () => {
  const r = lintPaths(join(FX, "path-treatment-good/file-clean.md"));
  expect(r.passed).toBe(true);
  expect(r.violations).toHaveLength(0);
});

// `.worktrees/` 在 .gitignore 中，无法做 committed 夹具；用临时目录树验证排除。
const TMP = mkdtempSync(join(tmpdir(), "kata-paths-"));
afterAll(() => rmSync(TMP, { recursive: true, force: true }));

test("scanRoot-anchored: nested .worktrees/ is excluded, sibling still scanned", () => {
  const bad = "workspace/foo/tests/x.spec.ts"; // P-S3 trigger
  mkdirSync(join(TMP, ".worktrees/slug"), { recursive: true });
  writeFileSync(join(TMP, ".worktrees/slug/copy.md"), `nested ${bad}\n`);
  writeFileSync(join(TMP, "real.md"), `top-level ${bad}\n`);

  const r = lintPaths(TMP);
  // 嵌套 worktree 内的副本被跳过，只有 scanRoot 顶层文件被计入。
  expect(r.violations).toHaveLength(1);
  expect(r.violations[0]?.file).toBe(join(TMP, "real.md"));
});

test("scanRoot-anchored: .worktrees in the scanRoot prefix is NOT excluded", () => {
  // 模拟「整个仓库检出在 .worktrees/<slug> 下」——此时 scanRoot 自身含 .worktrees，
  // 但其下的真实文件不应被跳过（这正是 worktree-first 开发时跑测试的场景）。
  const root = join(TMP, ".worktrees/checkout");
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "real.md"), "top-level workspace/foo/tests/x.spec.ts\n");

  const r = lintPaths(root);
  expect(r.violations).toHaveLength(1);
  expect(r.violations[0]?.rule).toBe("P-S3");
});
