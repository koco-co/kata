import { expect, test } from "bun:test";
import { join } from "node:path";
import { lintPaths } from "../../src/lint/path-treatment.ts";

const FX = join(import.meta.dirname, "fixtures");

test("P-S1: .claude/scripts/ flagged", () => {
  const r = lintPaths(join(FX, "path-treatment-bad/file-with-scripts.md"));
  expect(r.violations.some((v) => v.rule === "P-S1")).toBe(true);
});

test("P-S2: bun test ./.claude/scripts/__tests__ flagged", () => {
  const r = lintPaths(join(FX, "path-treatment-bad/file-with-bun-test.md"));
  expect(r.violations.some((v) => v.rule === "P-S2")).toBe(true);
});

test("P-S3: old workspace subdir flagged", () => {
  const r = lintPaths(join(FX, "path-treatment-bad/file-with-old-workspace.md"));
  expect(r.violations.some((v) => v.rule === "P-S3")).toBe(true);
});

test("P-S4: bun run .claude/scripts/ flagged", () => {
  const r = lintPaths(join(FX, "path-treatment-bad/file-with-bun-run-scripts.md"));
  expect(r.violations.some((v) => v.rule === "P-S4")).toBe(true);
});

test("clean file passes", () => {
  const r = lintPaths(join(FX, "path-treatment-good/file-clean.md"));
  expect(r.passed).toBe(true);
});
