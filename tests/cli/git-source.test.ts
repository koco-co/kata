import { afterEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertRepoOperationAllowed,
  loadSourceRepos,
  mainWorktreeRoot,
  quarantineInvalidRemoteRefs,
  RepoOperationNotAllowedError,
  resolveSourceRepo,
} from "../../cli/lib/git-source.ts";

const YAML = `repos:
  - name: customltem/dt-center-assets
    project: dataAssets
    path: .repos/customltem/dt-center-assets
    branch: release_6.3.x_ltqc
    modules: ["*"]
    customers: ["*"]
    description: 数据资产后端
    writable: false
  - name: dt-insight-web/dt-center-assets
    project: dataAssets
    path: .repos/dt-insight-web/dt-center-assets
    branch: release_6.3.x
    modules: ["*"]
    customers: ["*"]
  - name: customltem/dt-insight-studio
    project: dataAssets
    path: .repos/customltem/dt-insight-studio
    branch: dataAssets/release_6.3.x_ltqc
    modules: ["*"]
    customers: ["*"]
    writable: true
`;

let dir = "";
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = "";
});

function setup(yaml: string = YAML): string {
  dir = mkdtempSync(join(tmpdir(), "kata-git-source-"));
  mkdirSync(join(dir, "config", "private"), { recursive: true });
  writeFileSync(join(dir, "config", "private", "repositories.yaml"), yaml);
  return dir;
}

describe("loadSourceRepos", () => {
  it("parses entries and defaults writable to false", () => {
    const repos = loadSourceRepos(setup());
    expect(repos).toHaveLength(3);
    expect(repos[0]).toMatchObject({
      name: "customltem/dt-center-assets",
      project: "dataAssets",
      branch: "release_6.3.x_ltqc",
      writable: false,
    });
    expect(repos[1]?.writable).toBe(false);
    expect(repos[2]?.writable).toBe(true);
  });

  it("throws when the config file is missing", () => {
    dir = mkdtempSync(join(tmpdir(), "kata-git-source-"));
    expect(() => loadSourceRepos(dir)).toThrow("未找到源码仓库配置");
  });

  it("throws on malformed entries", () => {
    const root = setup("repos:\n  - name: a/b\n    project: p\n");
    expect(() => loadSourceRepos(root)).toThrow("repos[0].path");
  });

  it("rejects a symlinked private source catalog before reading", () => {
    const root = setup();
    const outside = mkdtempSync(join(tmpdir(), "kata-git-source-outside-"));
    const config = join(root, "config", "private", "repositories.yaml");
    rmSync(config, { force: true });
    const outsideConfig = join(outside, "sources.yaml");
    writeFileSync(outsideConfig, YAML);
    symlinkSync(outsideConfig, config);
    try {
      expect(() => loadSourceRepos(root)).toThrow(/符号链接/);
    } finally {
      rmSync(config, { force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe("resolveSourceRepo", () => {
  it("resolves full name case-insensitively", () => {
    const root = setup();
    const hit = resolveSourceRepo("CUSTOMLTEM/dt-insight-studio", root, root);
    expect(hit?.name).toBe("customltem/dt-insight-studio");
    expect(hit?.absPath).toBe(join(root, ".repos/customltem/dt-insight-studio"));
  });

  it("resolves an unambiguous short name", () => {
    const root = setup();
    expect(resolveSourceRepo("dt-insight-studio", root, root)?.name).toBe(
      "customltem/dt-insight-studio",
    );
  });

  it("returns undefined for ambiguous short names", () => {
    const root = setup();
    expect(resolveSourceRepo("dt-center-assets", root, root)).toBeUndefined();
  });

  it("returns undefined for unknown repos", () => {
    const root = setup();
    expect(resolveSourceRepo("nope", root, root)).toBeUndefined();
  });
});

describe("mainWorktreeRoot", () => {
  it("resolves the main worktree root through the git common dir", () => {
    // 集成断言:无论从主工作树还是 worktree 跑,都指向主工作树 kata/
    expect(mainWorktreeRoot()).toMatch(/kata$/);
  });
});

describe("assertRepoOperationAllowed", () => {
  const readonlyRepo = {
    name: "group/repo",
    project: "dataAssets",
    path: ".repos/group/repo",
    branch: "main",
    writable: false,
  };
  const writableRepo = { ...readonlyRepo, writable: true };

  it("allows read-only operations on writable:false repos", () => {
    for (const op of ["fetch", "pull", "checkout", "grep", "show"]) {
      expect(() => assertRepoOperationAllowed(readonlyRepo, op)).not.toThrow();
    }
  });

  it("rejects mutating operations on writable:false repos with a coded error", () => {
    for (const op of ["push", "commit", "add"]) {
      try {
        assertRepoOperationAllowed(readonlyRepo, op);
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(RepoOperationNotAllowedError);
        expect((err as RepoOperationNotAllowedError).code).toBe("ERR_REPO_READONLY");
      }
    }
  });

  it("allows any operation on writable:true repos", () => {
    expect(() => assertRepoOperationAllowed(writableRepo, "push")).not.toThrow();
  });
});

describe("quarantineInvalidRemoteRefs", () => {
  it("moves only invalid origin loose refs outside refs/ and leaves working files untouched", () => {
    const root = setup();
    const repo = join(root, "repo");
    execFileSync("git", ["init", repo]);
    const gitDir = join(repo, ".git");
    const originRefs = join(gitDir, "refs", "remotes", "origin");
    mkdirSync(originRefs, { recursive: true });
    writeFileSync(join(originRefs, "release_6.2 2.x"), `${"1".repeat(40)}\n`);
    writeFileSync(join(originRefs, "release_6.3.x"), `${"2".repeat(40)}\n`);
    writeFileSync(join(repo, "package.json"), "{}\n");

    const repaired = quarantineInvalidRemoteRefs(repo);

    expect(repaired).toHaveLength(1);
    expect(repaired[0]?.ref).toBe("refs/remotes/origin/release_6.2 2.x");
    expect(existsSync(join(originRefs, "release_6.2 2.x"))).toBe(false);
    expect(existsSync(join(originRefs, "release_6.3.x"))).toBe(true);
    expect(existsSync(join(repo, "package.json"))).toBe(true);
    expect(repaired[0]?.backup).toStartWith("kata-repair/invalid-refs/");
    expect(existsSync(join(gitDir, repaired[0]?.backup ?? ""))).toBe(true);
  });
});
