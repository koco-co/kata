import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  listWorkspaceProjects,
  locateProject,
  locateProjectRoot,
  locateProjectRootWithCandidates,
} from "../../cli/lib/workspace-locator.ts";

function scaffold(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-ws-"));
  mkdirSync(join(root, "workspace", "dataAssets", "features"), { recursive: true });
  writeFileSync(join(root, "package.json"), "{}");
  return root;
}

describe("locateProject", () => {
  it("returns canonical dirs for a project", () => {
    const root = scaffold();
    const p = locateProject("dataAssets", root);
    expect(p.projectDir).toBe(join(root, "workspace", "dataAssets"));
    expect(p.featuresDir).toBe(join(p.projectDir, "features"));
    expect(p.knowledgeDir).toBe(join(p.projectDir, "knowledge"));
    expect(p.sharedDir).toBe(join(p.projectDir, "_shared"));
    expect(p.analysesDir).toBe(join(p.projectDir, "analyses"));
    expect(p.cacheDir).toBe(join(p.projectDir, ".cache"));
  });

  it("throws for unknown project", () => {
    const root = scaffold();
    expect(() => locateProject("nope", root)).toThrow();
  });

  it("rejects a project directory that is a symlink", () => {
    const root = scaffold();
    const outside = mkdtempSync(join(tmpdir(), "kata-ws-outside-"));
    rmSync(join(root, "workspace", "dataAssets"), { recursive: true, force: true });
    symlinkSync(outside, join(root, "workspace", "dataAssets"));
    expect(() => locateProject("dataAssets", root)).toThrow(/未知项目/);
  });

  it("rejects project names that could escape the workspace", () => {
    const root = scaffold();
    expect(() => locateProject("..", root)).toThrow(/非法项目名/);
    expect(() => locateProject("", root)).toThrow(/非法项目名/);
    expect(() => locateProject("a/b", root)).toThrow(/非法项目名/);
    expect(() => locateProject("a\\b", root)).toThrow(/非法项目名/);
  });

  it("honors KATA_WORKSPACE_ROOT as the workspace root", () => {
    const root = scaffold();
    const external = mkdtempSync(join(tmpdir(), "kata-ws-ext-"));
    mkdirSync(join(external, "dataAssets", "features"), { recursive: true });
    const prev = process.env.KATA_WORKSPACE_ROOT;
    process.env.KATA_WORKSPACE_ROOT = external;
    try {
      const p = locateProject("dataAssets", root);
      expect(p.projectDir).toBe(join(external, "dataAssets"));
      expect(p.featuresDir).toBe(join(external, "dataAssets", "features"));
    } finally {
      if (prev === undefined) delete process.env.KATA_WORKSPACE_ROOT;
      else process.env.KATA_WORKSPACE_ROOT = prev;
    }
  });

  it("lists workspace projects for project-wide read-only checks", () => {
    const root = scaffold();
    mkdirSync(join(root, "workspace", "batchWorks"), { recursive: true });
    writeFileSync(join(root, "workspace", "README.md"), "not a project\n");
    expect(listWorkspaceProjects(root)).toEqual(["batchWorks", "dataAssets"]);
  });
});

describe("locateProjectRoot", () => {
  it("walks past .repos pseudo roots", () => {
    const root = scaffold();
    const fake = join(root, ".repos", "fake");
    mkdirSync(join(fake, "workspace"), { recursive: true });
    writeFileSync(join(fake, "package.json"), "{}");
    expect(locateProjectRoot(join(fake, "workspace"))).toBe(root);
  });

  it("requires workspace to be a directory, not a file", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-ws-"));
    writeFileSync(join(root, "workspace"), "not a directory");
    writeFileSync(join(root, "package.json"), "{}");
    expect(() => locateProjectRootWithCandidates(root, undefined)).toThrow(/未找到仓库根/);
  });
});
