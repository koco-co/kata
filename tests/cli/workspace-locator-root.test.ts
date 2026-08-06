import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { locateProjectRootWithCandidates } from "../../cli/lib/workspace-locator.ts";

describe("workspace locator fallback", () => {
  it("finds the repo root from a linked kata entry outside cwd", () => {
    const outside = mkdtempSync(join(tmpdir(), "kata-outside-"));
    try {
      const entry = join(outside, "kata");
      symlinkSync(join(process.cwd(), "cli/bin/kata.ts"), entry);
      const root = locateProjectRootWithCandidates(outside, entry);
      expect(root).toBe(process.cwd());
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
