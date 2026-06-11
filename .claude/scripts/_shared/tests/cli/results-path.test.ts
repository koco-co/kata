import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runResultsPath } from "@shared/cli/results-path.ts";
import { stringify } from "yaml";

// ─── 辅助：写入最小 FeatureMetadata@2 ───
function writeMinimalMeta(dir: string, id: string) {
  writeFileSync(
    join(dir, "metadata.yaml"),
    stringify({
      schema: "FeatureMetadata@2",
      id,
      display_name: id,
      status: "active",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      modules: [],
      customers: [],
      versions: [],
      owners: [],
      inputs: [],
      relates_to: [],
      emits: {},
      case_drafting: { status: "not-started", requirement_atoms: [] },
      automation: { status: "not-started", intents: [] },
      files: {},
    }),
  );
}

describe("kata results path", () => {
  it("allocates feature/runs/<run-id> path with --new-run (uses listFeatureDirs lookup)", async () => {
    // featureId 落在版本层 features/v6.4.10/2026-04-x
    const scratch = mkdtempSync(join(tmpdir(), "kata-results-path-"));
    try {
      const featureDir = join(scratch, "dataAssets/features/v6.4.10/2026-04-x");
      mkdirSync(featureDir, { recursive: true });
      writeMinimalMeta(featureDir, "2026-04-x");
      const out = await runResultsPath({
        project: "dataAssets",
        featureId: "2026-04-x",
        workspaceRoot: scratch,
        newRun: true,
        now: new Date("2026-05-10T14:30:00Z"),
      });
      // v2 format: YYYYMMDD-HHmm-<type>-<seq>
      expect(out.runId).toMatch(/^\d{8}-\d{4}-run-\d{2}$/);
      expect(out.runId).toContain("20260510-1430");
      // path should be under runs/ not results/
      expect(out.path).toContain("/runs/");
      expect(out.path).not.toContain("/results/");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("includes non-default runType in the generated run id", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-results-path-type-"));
    try {
      const featureDir = join(scratch, "dataAssets/features/v6.4.10/2026-04-x");
      mkdirSync(featureDir, { recursive: true });
      writeMinimalMeta(featureDir, "2026-04-x");
      const out = await runResultsPath({
        project: "dataAssets",
        featureId: "2026-04-x",
        workspaceRoot: scratch,
        newRun: true,
        runType: "preflight",
        now: new Date("2026-05-10T14:30:00Z"),
      });
      expect(out.runId).toMatch(/^\d{8}-\d{4}-preflight-\d{2}$/);
      expect(out.runId).toContain("20260510-1430-preflight-01");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("returns latest existing run when --new-run is false", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-results-path-latest-"));
    try {
      const featureDir = join(scratch, "dataAssets/features/v6.4.10/2026-04-x");
      mkdirSync(featureDir, { recursive: true });
      writeMinimalMeta(featureDir, "2026-04-x");
      const root = join(featureDir, "runs");
      mkdirSync(join(root, "20260501-0900-run-01"), { recursive: true });
      mkdirSync(join(root, "20260502-0900-run-02"), { recursive: true });
      const out = await runResultsPath({
        project: "dataAssets",
        featureId: "2026-04-x",
        workspaceRoot: scratch,
        newRun: false,
      });
      expect(out.runId).toBe("20260502-0900-run-02");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("throws when feature not found", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-results-path-miss-"));
    try {
      await expect(
        runResultsPath({
          project: "dataAssets",
          featureId: "nonexistent",
          workspaceRoot: scratch,
          newRun: false,
        }),
      ).rejects.toThrow(/not found/i);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
