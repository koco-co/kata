import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { computeDiffStats, fetchAndDiff, resolveCommit } from "../../lib/scan-report-diff.ts";

let REPO = "";

function git(args: string, cwd = REPO): string {
  return execSync(`git -C "${cwd}" ${args}`, { encoding: "utf8" }).trim();
}

beforeEach(() => {
  REPO = mkdtempSync(join(tmpdir(), "scan-diff-repo-"));
  execSync(`git init -q -b main "${REPO}"`);
  git('config user.email "t@t.com"');
  git('config user.name "t"');
  writeFileSync(join(REPO, "a.txt"), "line1\nline2\n");
  git("add a.txt");
  git("commit -q -m initial");
  git("checkout -q -b feature");
  writeFileSync(join(REPO, "a.txt"), "line1\nline2\nline3\n");
  writeFileSync(join(REPO, "b.txt"), "new\n");
  git("add a.txt b.txt");
  git("commit -q -m feature");
});

afterEach(() => {
  rmSync(REPO, { recursive: true, force: true });
});

describe("scan-report-diff", () => {
  test("resolveCommit returns SHA for a branch", () => {
    const sha = resolveCommit(REPO, "main");
    expect(sha.length).toBe(40);
  });

  test("computeDiffStats returns files+additions+deletions for diff text", () => {
    const diff = execSync(`git -C "${REPO}" diff main..feature --unified=0`, {
      encoding: "utf8",
    });
    const stats = computeDiffStats(diff);
    expect(stats.files).toBe(2);
    expect(stats.additions).toBe(2);
    expect(stats.deletions).toBe(0);
  });

  test("fetchAndDiff returns diff text + stats + commits", () => {
    const out = fetchAndDiff(REPO, "main", "feature", { skipFetch: true });
    expect(out.diff).toContain("+line3");
    expect(out.diff).toContain("+new");
    expect(out.stats.files).toBe(2);
    expect(out.base_commit.length).toBe(40);
    expect(out.head_commit.length).toBe(40);
  });
});
