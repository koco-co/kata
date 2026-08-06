import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { locateProjectRootWithCandidates } from "../../cli/lib/workspace-locator.ts";

describe("workspace locator fallback", () => {
  it("finds the repo root from a linked kata entry outside cwd", () => {
    const outside = mkdtempSync(join(tmpdir(), "kata-outside-"));
    try {
      const root = locateProjectRootWithCandidates(outside, join(process.cwd(), "cli/bin/kata.ts"));
      expect(root).toBe(process.cwd());
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
