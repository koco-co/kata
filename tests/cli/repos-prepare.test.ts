import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadSourceRepos,
  prepareSourceRepos,
  selectSourceRepos,
} from "../../cli/lib/git-source.ts";

function rootWithConfig(yaml: string): string {
  const root = mkdtempSync(join(tmpdir(), "kata-repos-"));
  mkdirSync(join(root, "config", "repos"), { recursive: true });
  writeFileSync(join(root, "config", "repos", "sources.yaml"), yaml);
  return root;
}

describe("source repo matching for PRD discovery", () => {
  it("matches project + module + customer and accepts explicit wildcards", () => {
    const root = rootWithConfig(`
repos:
  - name: group/data-assets
    project: dataAssets
    path: .repos/group/data-assets
    branch: release/7.0
    modules: [数据标准]
    customers: [标品]
    writable: false
  - name: group/shared
    project: dataAssets
    path: .repos/group/shared
    branch: release/7.0
    modules: ["*"]
    customers: ["*"]
    writable: false
  - name: group/other
    project: batchWorks
    path: .repos/group/other
    branch: release/7.0
    modules: ["*"]
    customers: ["*"]
    writable: false
`);
    const repos = loadSourceRepos(root);
    expect(
      selectSourceRepos(repos, {
        project: "dataAssets",
        module: "数据标准",
        customer: "标品",
      }).map((repo) => repo.name),
    ).toEqual(["group/data-assets", "group/shared"]);
  });

  it("blocks when no repository explicitly matches the requirement context", () => {
    const root = rootWithConfig(`
repos:
  - name: group/data-assets
    project: dataAssets
    path: .repos/group/data-assets
    branch: release/7.0
    modules: [数据质量]
    customers: [岚图汽车]
    writable: false
`);
    const repos = loadSourceRepos(root);
    expect(() =>
      selectSourceRepos(repos, {
        project: "dataAssets",
        module: "数据标准",
        customer: "标品",
      }),
    ).toThrow(/没有源码仓库匹配/);
  });

  it("rejects missing module/customer selectors instead of silently updating every repo", () => {
    const root = rootWithConfig(`
repos:
  - name: group/data-assets
    project: dataAssets
    path: .repos/group/data-assets
    branch: release/7.0
    writable: false
`);
    expect(() => loadSourceRepos(root)).toThrow(/modules|customers/);
  });

  it("quarantines invalid origin refs before fetching the configured release branch", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-repos-prepare-"));
    try {
      execFileSync("git", ["init", "-b", "main", root]);
      const remote = join(root, "remote.git");
      const seed = join(root, "seed");
      const repo = join(root, ".repos", "group", "data-assets");
      execFileSync("git", ["init", "--bare", remote]);
      execFileSync("git", ["init", "-b", "release_6.3.x", seed]);
      execFileSync("git", ["-C", seed, "config", "user.email", "kata@example.invalid"]);
      execFileSync("git", ["-C", seed, "config", "user.name", "Kata Test"]);
      writeFileSync(join(seed, "README.md"), "release source\n");
      execFileSync("git", ["-C", seed, "add", "README.md"]);
      execFileSync("git", ["-C", seed, "commit", "-m", "seed"]);
      execFileSync("git", ["-C", seed, "remote", "add", "origin", remote]);
      execFileSync("git", ["-C", seed, "push", "origin", "release_6.3.x"]);
      mkdirSync(join(root, ".repos", "group"), { recursive: true });
      execFileSync("git", ["clone", "--branch", "release_6.3.x", remote, repo]);

      const originRefs = join(repo, ".git", "refs", "remotes", "origin");
      mkdirSync(originRefs, { recursive: true });
      writeFileSync(join(originRefs, "release_6.2 2.x"), `${"1".repeat(40)}\n`);
      mkdirSync(join(root, "config", "repos"), { recursive: true });
      writeFileSync(
        join(root, "config", "repos", "sources.yaml"),
        `repos:
  - name: group/data-assets
    project: dataAssets
    path: .repos/group/data-assets
    branch: release_6.3.x
    modules: [数据标准]
    customers: [标品]
    writable: false
`,
      );

      const prepared = prepareSourceRepos(
        { project: "dataAssets", module: "数据标准", customer: "标品" },
        root,
      );

      expect(prepared).toHaveLength(1);
      expect(prepared[0]?.branch).toBe("release_6.3.x");
      expect(prepared[0]?.repaired_refs.map((item) => item.ref)).toEqual([
        "refs/remotes/origin/release_6.2 2.x",
      ]);
      expect(existsSync(join(originRefs, "release_6.2 2.x"))).toBe(false);
      expect(existsSync(join(repo, "README.md"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
