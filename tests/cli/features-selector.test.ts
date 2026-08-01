import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveFeatureEntry } from "../../cli/lib/features-layout.ts";

describe("feature selector", () => {
  it("accepts only the complete path below features/", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-feature-selector-"));
    const dir = join(root, "v7.0.0", "【15911】【客户】【模块】需求");
    mkdirSync(dir, { recursive: true });
    expect(resolveFeatureEntry(root, "v7.0.0/【15911】【客户】【模块】需求").dir).toBe(dir);
  });

  it("rejects bare names and retired metadata ids", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-feature-selector-"));
    const dir = join(root, "v7.0.0", "【15911】【客户】【模块】需求");
    mkdirSync(dir, { recursive: true });
    expect(() => resolveFeatureEntry(root, "【15911】【客户】【模块】需求")).toThrow(/完整路径/);
    expect(() => resolveFeatureEntry(root, "202607-demo")).toThrow(/完整路径/);
    expect(() => resolveFeatureEntry(root, "v7.0.0/../outside")).toThrow(/完整路径/);
    expect(() => resolveFeatureEntry(root, "v7.0.0//outside")).toThrow(/完整路径/);
  });
});
