import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import { repoRoot } from "../../lib/paths.ts";

const CLI = join(repoRoot(), "engine/src/scan-report.ts");
let WS = "";
let REPO = "";
const PROJECT = "scan-e2e";

function git(args: string, cwd: string): string {
  return execSync(`git -C "${cwd}" ${args}`, { encoding: "utf8" }).trim();
}

beforeEach(() => {
  WS = mkdtempSync(join(tmpdir(), "scan-e2e-"));
  process.env.KATA_WORKSPACE_ROOT = WS;
  process.env.KATA_ROOT_OVERRIDE = WS;
  REPO = join(WS, PROJECT, ".kata", "repos", "demo");
  execSync(`mkdir -p "${REPO}"`);
  execSync(`git init -q -b main "${REPO}"`);
  git('config user.email "t@t.com"', REPO);
  git('config user.name "t"', REPO);
  writeFileSync(join(REPO, "TagService.java"), "public void batchDelete() { repo.deleteAll(); }\n");
  git("add TagService.java", REPO);
  git("commit -q -m initial", REPO);
  git("checkout -q -b release_6.3.x", REPO);
  git("checkout -q -b release_6.3.0_dev main", REPO);
  writeFileSync(
    join(REPO, "TagService.java"),
    "public void batchDelete() { /* removed referenceCheck */ repo.deleteAll(); }\n",
  );
  git("add TagService.java", REPO);
  git("commit -q -m head", REPO);
});

afterEach(() => {
  rmSync(WS, { recursive: true, force: true });
  delete process.env.KATA_WORKSPACE_ROOT;
  delete process.env.KATA_ROOT_OVERRIDE;
});

describe("diff-scan E2E orchestration (mock agent output)", () => {
  test("create → mock-add 2 bugs → render → HTML contains both", async () => {
    const r1 = await $`bun ${CLI} create --project ${PROJECT} --repo demo \
      --base-branch release_6.3.x --head-branch release_6.3.0_dev \
      --slug e2e --skip-fetch`
      .quiet()
      .nothrow();
    expect(r1.exitCode).toBe(0);
    const { slug, yyyymm } = JSON.parse(r1.stdout.toString());

    // Simulate agent returning 2 bugs
    const bugs = [
      {
        id: "ignored",
        title: "Tag bulk delete reference check missing",
        severity: "major",
        type: "data",
        module: "Tag Center",
        location: { file: "TagService.java", line: 1, function: "batchDelete" },
        phenomenon: "Referenced tags physically deleted",
        reproduction_steps: [
          "1. open Tag Center",
          "2. select referenced tags",
          "3. click bulk delete",
        ],
        expected: "Pre-check warns user",
        actual: "Silent deletion",
        root_cause: "referenceCheck removed in diff",
        evidence: { diff_hunk: "@@ removed referenceCheck @@" },
        suggestion: "Restore referenceCheck()",
        confidence: 0.85,
        confidence_reason: "explicit removal",
      },
      {
        id: "ignored",
        title: "Bug with bad confidence",
        severity: "minor",
        type: "logic",
        module: "Other",
        location: { file: "TagService.java", line: 1 },
        phenomenon: "P",
        expected: "E",
        actual: "A",
        reproduction_steps: ["1", "2", "3"],
        root_cause: "R",
        evidence: { diff_hunk: "@@" },
        suggestion: "S",
        confidence: 0.3,
        confidence_reason: "weak",
      },
    ];

    const f1 = join(WS, "bug1.json");
    writeFileSync(f1, JSON.stringify(bugs[0]));
    const f2 = join(WS, "bug2.json");
    writeFileSync(f2, JSON.stringify(bugs[1]));

    const r2 = await $`bun ${CLI} add-bug --project ${PROJECT} --slug ${slug} --yyyymm ${yyyymm} \
      --json ${f1} --auto-id --no-render`
      .quiet()
      .nothrow();
    expect(r2.exitCode).toBe(0);

    // bug 2 should fail with exit 2 (low confidence)
    const r3 = await $`bun ${CLI} add-bug --project ${PROJECT} --slug ${slug} --yyyymm ${yyyymm} \
      --json ${f2} --auto-id --no-render`
      .quiet()
      .nothrow();
    expect(r3.exitCode).toBe(2);

    // Final render
    const r4 = await $`bun ${CLI} render --project ${PROJECT} --slug ${slug} --yyyymm ${yyyymm}`
      .quiet()
      .nothrow();
    expect(r4.exitCode).toBe(0);

    const htmlPath = join(WS, PROJECT, "audits", `${yyyymm}-${slug}`, "report.html");
    const html = readFileSync(htmlPath, "utf8");
    expect(html).toContain("Tag bulk delete reference check missing");
    expect(html).not.toContain("Bug with bad confidence");
  });
});
