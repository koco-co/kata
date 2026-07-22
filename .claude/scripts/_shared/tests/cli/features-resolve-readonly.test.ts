import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFeaturesResolve } from "@shared/cli/features-resolve.ts";

const tempRoots: string[] = [];

function tempWorkspace(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-features-resolve-"));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    rmSync(tempRoots.pop()!, { recursive: true, force: true });
  }
});

describe("features resolve side effects", () => {
  test("create=false computes the path without creating directories", () => {
    const workspaceRoot = tempWorkspace();
    const result = runFeaturesResolve({
      project: "demo",
      module: "orders",
      slug: "readonly-check",
      workspaceRoot,
      now: new Date("2026-07-21T00:00:00.000Z"),
      create: false,
    });

    expect(result.featureId).toBe("2026-07-readonly-check");
    expect(result.reused).toBe(false);
    expect(existsSync(result.featureDir)).toBe(false);
  });

  test("library callers keep the existing create-by-default behavior", () => {
    const workspaceRoot = tempWorkspace();
    const result = runFeaturesResolve({
      project: "demo",
      module: "orders",
      slug: "create-check",
      workspaceRoot,
      now: new Date("2026-07-21T00:00:00.000Z"),
    });

    expect(result.reused).toBe(false);
    expect(existsSync(join(result.featureDir, ".process"))).toBe(true);
  });
});
