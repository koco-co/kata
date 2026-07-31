import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { scaffoldAutomation } from "./automation-scaffold";

describe("scaffoldAutomation", () => {
  let featureDir: string;

  beforeEach(() => {
    featureDir = mkdtempSync(join(tmpdir(), "kata-automation-scaffold-"));
  });

  afterEach(() => {
    rmSync(featureDir, { recursive: true, force: true });
  });

  test("creates executable directories and runners without a duplicate case index", () => {
    const result = scaffoldAutomation(featureDir);
    const testsDir = join(featureDir, "automation", "tests");
    const casesDir = join(testsDir, "cases");
    const casesReadme = join(casesDir, "README.md");

    expect(result.created).toContain(casesDir);
    expect(existsSync(join(testsDir, "runners", "smoke.spec.ts"))).toBe(true);
    expect(existsSync(join(testsDir, "runners", "full.spec.ts"))).toBe(true);
    expect(result.created).not.toContain(casesReadme);
    expect(existsSync(casesReadme)).toBe(false);
  });
});
