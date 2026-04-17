import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runResultsPrune } from "../../src/cli/results-prune.ts";

describe("kata results prune", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "kata-results-prune-"));
    const root = join(scratch, "dataAssets/features/2026-04-x/results");
    for (const id of [
      "20260501-0900-aaaaaaaa",
      "20260502-0900-bbbbbbbb",
      "20260503-0900-cccccccc",
      "20260504-0900-dddddddd",
    ]) {
      mkdirSync(join(root, id), { recursive: true });
    }
    writeFileSync(join(root, "20260501-0900-aaaaaaaa/.published"), "{}");
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("keeps last N runs plus all .published runs", async () => {
    await runResultsPrune({
      project: "dataAssets",
      featureId: "2026-04-x",
      keep: 2,
      workspaceRoot: scratch,
    });
    const remaining = readdirSync(join(scratch, "dataAssets/features/2026-04-x/results"));
    expect(remaining).toContain("20260501-0900-aaaaaaaa"); // protected
    expect(remaining).toContain("20260503-0900-cccccccc"); // top-N
    expect(remaining).toContain("20260504-0900-dddddddd"); // top-N
    expect(remaining).not.toContain("20260502-0900-bbbbbbbb");
  });
});
