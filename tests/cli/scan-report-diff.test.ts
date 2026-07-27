import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fetchAndDiff, resolveCommit } from "../../cli/lib/scan-report-diff.ts";

function makeRepo(): { dir: string; repo: Parameters<typeof fetchAndDiff>[0] } {
  const dir = mkdtempSync(join(tmpdir(), "kata-diff-repo-"));
  const git = (args: string[]) =>
    execFileSync("git", ["-C", dir, ...args], { stdio: ["pipe", "pipe", "pipe"] });
  git(["init", "-b", "main"]);
  git(["config", "user.email", "qa@example.com"]);
  git(["config", "user.name", "QA"]);
  writeFileSync(join(dir, "a.txt"), "one\n");
  git(["add", "."]);
  git(["commit", "-m", "init"]);
  git(["checkout", "-b", "feature"]);
  writeFileSync(join(dir, "a.txt"), "one\ntwo\n");
  git(["add", "."]);
  git(["commit", "-m", "change"]);
  const repo = {
    name: "qa/demo",
    project: "dataAssets",
    path: ".",
    branch: "main",
    writable: false,
    absPath: dir,
  };
  return { dir, repo };
}

describe("fetchAndDiff", () => {
  it("computes diff stats between two branches without fetching", () => {
    const { repo } = makeRepo();
    const out = fetchAndDiff(repo, "main", "feature", { skipFetch: true });
    expect(out.stats).toEqual({ files: 1, additions: 1, deletions: 0 });
    expect(out.base_commit).not.toBe(out.head_commit);
  });

  it("fetches from origin when the repo allows it", () => {
    const { dir, repo } = makeRepo();
    execFileSync("git", ["-C", dir, "remote", "add", "origin", dir], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    const out = fetchAndDiff(repo, "main", "feature");
    expect(out.stats.files).toBe(1);
  });

  it("rejects option-injection refs", () => {
    const { dir } = makeRepo();
    expect(() => resolveCommit(dir, "--upload-pack=evil")).toThrow("unsafe git ref");
    expect(() => resolveCommit(dir, "main:evil")).toThrow("unsafe git ref");
  });
});
