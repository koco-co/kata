import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runAutomationLint } from "../../cli/lib/automation/automation-lint.ts";

function featureWorkspace(): { root: string; feature: string; cases: string } {
  const root = mkdtempSync(join(tmpdir(), "kata-al-"));
  const feature = join(root, "dataAssets", "features", "v7.0.0", "demo");
  const cases = join(feature, "automation", "tests", "cases");
  mkdirSync(cases, { recursive: true });
  return { root, feature, cases };
}

function writeCase(cases: string, name: string, content: string): string {
  const path = join(cases, name);
  writeFileSync(path, content);
  return path;
}

describe("automation lint", () => {
  it("detects the configured rules while ignoring comments", () => {
    const { feature, cases } = featureWorkspace();
    writeCase(
      cases,
      "c0001-demo.spec.ts",
      [
        "// waitForTimeout(1)",
        '/* waitForLoadState("networkidle") */',
        "await page.waitForTimeout(100);",
        'await page.waitForLoadState("networkidle");',
        'await page.locator(".css-1a2b3c").nth(0).nth(1).nth(2);',
        "",
      ].join("\n"),
    );
    writeCase(cases, "bad_name.ts", "export const ok = true;\n");

    const result = runAutomationLint({ featureDir: feature });
    expect(result.violations.map((v) => v.rule)).toEqual([
      "case-file-naming",
      "no-wait-timeout",
      "no-networkidle",
      "selector-quality",
      "selector-quality",
    ]);
    expect(result.violations.every((v) => !v.content.includes("waitForTimeout(1)"))).toBe(true);
  });

  it("preserves strings for hardcoded environment checks", () => {
    const { feature, cases } = featureWorkspace();
    writeCase(
      cases,
      "c0001-env.spec.ts",
      [
        'const baseUrl = "http://example.test";',
        'const address = "192.0.2.20";',
        'const password = "secret-value";',
        "const cookie = process.env.COOKIE;",
        'const text = "ordinary text";',
        "",
      ].join("\n"),
    );

    const result = runAutomationLint({ featureDir: feature });
    expect(result.violations.filter((v) => v.rule === "no-hardcoded-env")).toHaveLength(3);
    expect(result.violations.some((v) => v.rule === "no-wait-timeout")).toBe(false);
    expect(result.violations.some((v) => v.rule === "selector-quality")).toBe(false);
    expect(result.violations.every((v) => !v.content.includes("secret-value"))).toBe(true);
  });

  it("supports valid ignore directives and rejects empty reasons", () => {
    const { feature, cases } = featureWorkspace();
    writeCase(
      cases,
      "c0001-ignore.spec.ts",
      [
        "await page.waitForTimeout(100); // kata-lint-ignore: probe-only script",
        "await page.waitForTimeout(200); // kata-lint-ignore:",
        "",
      ].join("\n"),
    );

    const result = runAutomationLint({ featureDir: feature });
    expect(result.ignored).toEqual([
      {
        path: "features/v7.0.0/demo/automation/tests/cases/c0001-ignore.spec.ts",
        line: 1,
        reason: "probe-only script",
      },
    ]);
    expect(result.violations.filter((v) => v.rule === "no-wait-timeout")).toHaveLength(1);
    expect(result.violations.filter((v) => v.rule === "invalid-ignore")).toHaveLength(1);
  });

  it("reports every violation immediately and never writes a baseline", () => {
    const { feature, cases } = featureWorkspace();
    writeCase(cases, "c0001-demo.spec.ts", "await page.waitForTimeout(100);\n");

    const first = runAutomationLint({ featureDir: feature });
    expect(first.violations).toHaveLength(1);
    writeCase(cases, "c0003-env.spec.ts", 'const baseUrl = "https://example.test";\n');
    const hardcoded = runAutomationLint({ featureDir: feature });
    expect(hardcoded.violations.some((v) => v.rule === "no-hardcoded-env")).toBe(true);
    expect(hardcoded.violations.filter((v) => v.rule === "no-hardcoded-env")).toHaveLength(1);
  });

  it("scans only the shared automation area", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-al-shared-"));
    const projectDir = join(root, "workspace", "dataAssets");
    mkdirSync(join(projectDir, "_shared", "automation", "pages"), { recursive: true });
    mkdirSync(join(projectDir, "_shared", "_meta"), { recursive: true });
    writeFileSync(
      join(projectDir, "_shared", "automation", "pages", "page.ts"),
      "await page.waitForTimeout(100);\n",
    );
    writeFileSync(
      join(projectDir, "_shared", "_meta", "metadata.ts"),
      "await page.waitForTimeout(200);\n",
    );

    const result = runAutomationLint({ shared: true, project: "dataAssets", repoRoot: root });
    expect(result.scannedFiles).toBe(1);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.path).toBe("_shared/automation/pages/page.ts");
  });

  it("returns a non-zero CLI status with --exit-code", () => {
    const { feature, cases } = featureWorkspace();
    writeCase(cases, "t01-demo.ts", "await page.waitForTimeout(100);\n");
    const kata = resolve(import.meta.dir, "../../cli/bin/kata.ts");
    const result = spawnSync("bun", [kata, "automation", "lint", feature, "--exit-code"], {
      cwd: resolve(import.meta.dir, "../.."),
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("no-wait-timeout");
  });

  it("does not mask // inside regex literals or template strings", () => {
    const { feature, cases } = featureWorkspace();
    writeCase(
      cases,
      "c0001-regex.spec.ts",
      [
        "const pair = /[//]+/; await page.waitForTimeout(100);",
        "const proto = /https?:\\/\\//;",
        "const tpl = `https://example.test/path`;",
        'await page.waitForLoadState("networkidle");',
        "",
      ].join("\n"),
    );

    const result = runAutomationLint({ featureDir: feature });
    const hits = result.violations.map((v) => `${v.line}:${v.rule}`);
    expect(hits).toContain("1:no-wait-timeout");
    expect(hits).toContain("3:no-hardcoded-env");
    expect(hits).toContain("4:no-networkidle");
    expect(result.violations.filter((v) => v.rule === "no-wait-timeout")).toHaveLength(1);
  });

  it("flags case file names rejected by the canonical SPEC_FILE_RE", () => {
    const { feature, cases } = featureWorkspace();
    writeCase(cases, "c001-double-hyphen.spec.ts", "export {};\n");
    writeCase(cases, "c0002-ok-name.spec.ts", "export {};\n");

    const result = runAutomationLint({ featureDir: feature });
    const naming = result.violations.filter((v) => v.rule === "case-file-naming");
    expect(naming).toHaveLength(1);
    expect(naming[0]?.path).toContain("c001-double-hyphen.spec.ts");
  });

  it("rejects natural-language generated placeholders in case files", () => {
    const { feature, cases } = featureWorkspace();
    writeCase(
      cases,
      "c0001-generated.spec.ts",
      [
        "// Generated from the canonical cases YAML; keep business steps in the YAML source.",
        'import { runGeneratedCase } from "shared";',
        "",
      ].join("\n"),
    );
    const result = runAutomationLint({ featureDir: feature });
    expect(result.violations.filter((v) => v.rule === "no-generated-placeholder")).toHaveLength(1);
  });

  it("requires --project or KATA_ACTIVE_PROJECT for --shared", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-al-shared-"));
    const prev = process.env.KATA_ACTIVE_PROJECT;
    delete process.env.KATA_ACTIVE_PROJECT;
    try {
      expect(() => runAutomationLint({ shared: true, repoRoot: root })).toThrow(/--project/);
    } finally {
      if (prev === undefined) delete process.env.KATA_ACTIVE_PROJECT;
      else process.env.KATA_ACTIVE_PROJECT = prev;
    }
  });

  it("returns a non-zero CLI status for normalize --exit-code with violations", () => {
    const { feature, cases } = featureWorkspace();
    writeCase(cases, "c0001-demo.spec.ts", "export {};\n");
    writeFileSync(join(feature, "automation", "stray.md"), "# stray\n");
    const kata = resolve(import.meta.dir, "../../cli/bin/kata.ts");
    const cwd = resolve(import.meta.dir, "../..");
    const failing = spawnSync("bun", [kata, "automation", "normalize", feature, "--exit-code"], {
      cwd,
      encoding: "utf8",
    });
    expect(failing.status).toBe(1);
    const passing = spawnSync("bun", [kata, "automation", "normalize", feature], {
      cwd,
      encoding: "utf8",
    });
    expect(passing.status).toBe(0);
  });
});
