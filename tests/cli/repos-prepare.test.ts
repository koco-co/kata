import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSourceRepos, selectSourceRepos } from "../../cli/lib/git-source.ts";

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
});
