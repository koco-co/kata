import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFeaturesLint } from "@shared/cli/features-lint.ts";

describe("gate: metadata_present_and_valid", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "gate-meta-"));
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("reports metadata_missing when metadata.yaml is absent", async () => {
    mkdirSync(join(scratch, "dataAssets/features/2026-04-x"), {
      recursive: true,
    });
    const r = await runFeaturesLint({
      project: "dataAssets",
      workspaceRoot: scratch,
    });
    expect(r.violations.some((v) => v.rule === "metadata_missing")).toBe(true);
  });
});
