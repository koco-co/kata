import { afterEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeAutomation } from "@shared/cli/automation-normalize.ts";

const TMP = join(import.meta.dirname, "tmp-normalize-test");

afterEach(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

test("default dry-run reports but does not move or delete", () => {
  const featureDir = join(TMP, "bad-feature");
  mkdirSync(join(featureDir, "automation", "tests", "runners"), { recursive: true });
  const strayMd = join(featureDir, "automation", "AUTOMATION-PLAN.md");
  writeFileSync(strayMd, "# plan");

  const report = normalizeAutomation(featureDir);

  expect(report.moved.length).toBeGreaterThan(0);
  expect(report.moved.some((path) => path.endsWith("AUTOMATION-PLAN.md"))).toBe(true);
  expect(existsSync(strayMd)).toBe(true);
});

test("apply moves stray markdown to runs normalized backup", () => {
  const featureDir = join(TMP, "bad-feature");
  mkdirSync(join(featureDir, "automation", "tests", "runners"), { recursive: true });
  mkdirSync(join(featureDir, "runs"), { recursive: true });
  const strayMd = join(featureDir, "automation", "HANDOFF-20260705.md");
  writeFileSync(strayMd, "# handoff");

  const report = normalizeAutomation(featureDir, { dryRun: false, apply: true });

  expect(existsSync(strayMd)).toBe(false);
  const runDirs = readdirSync(join(featureDir, "runs"));
  const normalizedDir = runDirs.find((dir) => dir.endsWith("-normalized"));
  expect(normalizedDir).toBeDefined();
  expect(
    existsSync(join(featureDir, "runs", normalizedDir!, "automation", "HANDOFF-20260705.md")),
  ).toBe(true);
  expect(report.moved).toHaveLength(1);
});

test("apply moves extra runners to backup", () => {
  const featureDir = join(TMP, "bad-feature");
  const runnersDir = join(featureDir, "automation", "tests", "runners");
  mkdirSync(runnersDir, { recursive: true });
  mkdirSync(join(featureDir, "automation", "tests", "cases"), { recursive: true });
  writeFileSync(join(runnersDir, "smoke.spec.ts"), "// ok");
  writeFileSync(join(runnersDir, "full.spec.ts"), "// ok");
  writeFileSync(join(runnersDir, "v6411-ui-rebuild.spec.ts"), "// extra");

  const report = normalizeAutomation(featureDir, { dryRun: false, apply: true });

  expect(report.moved.some((path) => path.endsWith("v6411-ui-rebuild.spec.ts"))).toBe(true);
  expect(existsSync(join(runnersDir, "smoke.spec.ts"))).toBe(true);
  expect(existsSync(join(runnersDir, "full.spec.ts"))).toBe(true);
});

test("clean feature passes with zero violations", () => {
  const featureDir = join(TMP, "clean-feature");
  mkdirSync(join(featureDir, "automation", "tests", "runners"), { recursive: true });
  mkdirSync(join(featureDir, "automation", "tests", "cases"), { recursive: true });
  writeFileSync(join(featureDir, "automation", "tests", "runners", "smoke.spec.ts"), "// ok");
  writeFileSync(join(featureDir, "automation", "tests", "runners", "full.spec.ts"), "// ok");

  const report = normalizeAutomation(featureDir);

  expect(report.violations).toBe(0);
});

test("reports feature-root .debug as unfixable", () => {
  const featureDir = join(TMP, "bad-debug-feature");
  mkdirSync(join(featureDir, ".debug"), { recursive: true });

  const report = normalizeAutomation(featureDir);

  expect(report.violations).toBe(1);
  expect(report.unfixable).toContainEqual(
    expect.objectContaining({
      path: join(featureDir, ".debug"),
    }),
  );
  expect(existsSync(join(featureDir, ".debug"))).toBe(true);
});
