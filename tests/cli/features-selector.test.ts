import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveFeatureEntry } from "../../cli/lib/features-layout.ts";

describe("feature selector", () => {
  it("accepts directory name and metadata.id", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-feature-selector-"));
    const dir = join(root, "v7.0.0", "【v700】【客户】【模块】需求");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "metadata.yaml"), "id: 202607-demo\n");
    expect(resolveFeatureEntry(root, "【v700】【客户】【模块】需求").dir).toBe(dir);
    expect(resolveFeatureEntry(root, "202607-demo").dir).toBe(dir);
  });

  it("rejects an ambiguous metadata.id", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-feature-selector-"));
    for (const name of ["a", "b"]) {
      const dir = join(root, "v7.0.0", name);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "metadata.yaml"), "id: duplicate\n");
    }
    expect(() => resolveFeatureEntry(root, "duplicate")).toThrow(/多个/);
  });
});
