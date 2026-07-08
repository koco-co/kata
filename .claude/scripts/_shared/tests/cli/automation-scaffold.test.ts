import { afterEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { scaffoldAutomation } from "@shared/cli/automation-scaffold.ts";

const TMP = join(import.meta.dirname, "tmp-scaffold-test");

afterEach(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

test("scaffold creates all expected dirs and files in empty feature", () => {
  const featureDir = join(TMP, "empty-feature");
  mkdirSync(join(featureDir, "automation"), { recursive: true });

  const result = scaffoldAutomation(featureDir);

  expect(result.created.length).toBe(8);
  expect(result.overwritten.length).toBe(0);
  expect(result.skipped.length).toBe(0);

  for (const sub of ["cases", "runners", "data", "unit", ".debug"]) {
    expect(existsSync(join(featureDir, "automation", "tests", sub))).toBe(true);
  }
  expect(existsSync(join(featureDir, "automation", "tests", "runners", "smoke.spec.ts"))).toBe(
    true,
  );
  expect(existsSync(join(featureDir, "automation", "tests", "runners", "full.spec.ts"))).toBe(true);
  expect(existsSync(join(featureDir, "automation", "tests", "cases", "README.md"))).toBe(true);
});

test("scaffold skips existing runners unless force is set", () => {
  const featureDir = join(TMP, "existing-feature");
  const runnersDir = join(featureDir, "automation", "tests", "runners");
  mkdirSync(runnersDir, { recursive: true });
  writeFileSync(join(runnersDir, "smoke.spec.ts"), "// custom");

  const result = scaffoldAutomation(featureDir);

  expect(result.skipped.some((path) => path.endsWith("smoke.spec.ts"))).toBe(true);
  expect(readFileSync(join(runnersDir, "smoke.spec.ts"), "utf-8")).toBe("// custom");
});

test("scaffold force overwrites runners only", () => {
  const featureDir = join(TMP, "force-feature");
  const runnersDir = join(featureDir, "automation", "tests", "runners");
  mkdirSync(runnersDir, { recursive: true });
  writeFileSync(join(runnersDir, "smoke.spec.ts"), "// custom");

  const result = scaffoldAutomation(featureDir, { force: true });

  expect(result.overwritten.some((path) => path.endsWith("smoke.spec.ts"))).toBe(true);
  expect(readFileSync(join(runnersDir, "smoke.spec.ts"), "utf-8")).toContain(
    "kata automation scaffold",
  );
});
