import { describe, expect, it } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { locateProject } from "../../cli/lib/workspace-locator.ts";
import { assertInside, assertWritable, PathError } from "../../cli/lib/path-policy.ts";

function scaffold(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-pp-"));
  mkdirSync(join(root, "workspace", "dataAssets", "features"), { recursive: true });
  writeFileSync(join(root, "package.json"), "{}");
  return root;
}

describe("assertInside", () => {
  it("accepts a path inside the project", () => {
    const p = locateProject("dataAssets", scaffold());
    const t = join(p.featuresDir, "v1", "f", "cases", "c.yaml");
    expect(assertInside(p, t)).toBe(t);
  });

  it("rejects path traversal outside the project", () => {
    const p = locateProject("dataAssets", scaffold());
    expect(() => assertInside(p, join(p.projectDir, "..", "..", "etc", "x"))).toThrow(PathError);
  });

  it("rejects absolute path outside the project", () => {
    const p = locateProject("dataAssets", scaffold());
    expect(() => assertInside(p, "/etc/passwd")).toThrow(PathError);
  });

  it("assertWritable accepts a normal project path", () => {
    const p = locateProject("dataAssets", scaffold());
    const t = join(p.featuresDir, "a", "b.yaml");
    expect(assertWritable(p, t)).toBe(t);
  });

  it("assertWritable rejects .git internal path", () => {
    const p = locateProject("dataAssets", scaffold());
    expect(() => assertWritable(p, join(p.projectDir, ".git", "config"))).toThrow(PathError);
  });
});
