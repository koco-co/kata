import { describe, expect, it } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { locateProject } from "../../cli/lib/workspace-locator.ts";

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
});
