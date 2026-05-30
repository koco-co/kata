import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runResultsPath } from "@shared/cli/results-path.ts";

describe("kata results path", () => {
  it("returns a feature/results/<run-id> path with --new-run", async () => {
    const out = await runResultsPath({
      project: "dataAssets",
      featureId: "2026-04-x",
      workspaceRoot: "/tmp/ws",
      newRun: true,
      now: new Date("2026-05-10T14:30:00Z"),
    });
    expect(out.runId).toMatch(/^\d{8}-\d{4}-[a-z0-9]{8}$/);
    expect(out.runId).toContain("20260510-1430");
  });

  it("returns latest existing run when --new-run is false", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "results-path-"));
    try {
      const root = join(scratch, "dataAssets/features/2026-04-x/results");
      mkdirSync(join(root, "20260501-0900-aaaaaaaa"), { recursive: true });
      mkdirSync(join(root, "20260502-0900-bbbbbbbb"), { recursive: true });
      const out = await runResultsPath({
        project: "dataAssets",
        featureId: "2026-04-x",
        workspaceRoot: scratch,
        newRun: false,
      });
      expect(out.runId).toBe("20260502-0900-bbbbbbbb");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
