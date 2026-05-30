import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFeaturesShow } from "@shared/cli/features-show.ts";
import { stringify } from "yaml";

describe("kata features show", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "kata-feat-show-"));
    const dir = join(scratch, "dataAssets/features/2026-04-x");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "metadata.yaml"),
      stringify({
        schema: "FeatureMetadata@1",
        id: "2026-04-x",
        display_name: "X",
        status: "active",
        created_at: "2026-04-01",
        updated_at: "2026-04-01",
        modules: ["dq"],
        customers: ["standard"],
        versions: [],
        owners: ["koco"],
        inputs: [],
        relates_to: [],
        emits: { cases_xmind: true, archive: true, playwright_tests: true },
      }),
    );
    writeFileSync(
      join(dir, "manifest.json"),
      JSON.stringify({
        schema: "FeatureManifest@2",
        feature_id: "2026-04-x",
        case_drafting: {
          status: "completed",
          archive_path: "archive.md",
          requirement_atoms: [{ id: "RA-1", source_ref: "x" }],
        },
        automation: {
          status: "ready",
          intents: [
            {
              intent_id: "SR-INTENT-X",
              case_files: ["tests/cases/t01.ts"],
              automation_status: "ready",
            },
          ],
          last_run_status: "passing",
        },
        files: {},
      }),
    );
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("returns feature detail object", async () => {
    const detail = await runFeaturesShow({
      project: "dataAssets",
      featureId: "2026-04-x",
      workspaceRoot: scratch,
    });
    expect(detail.metadata.id).toBe("2026-04-x");
    expect(detail.manifest.automation.intents).toHaveLength(1);
    expect(detail.recentRuns).toEqual([]);
  });

  it("throws on missing feature", async () => {
    await expect(
      runFeaturesShow({
        project: "dataAssets",
        featureId: "nonexistent",
        workspaceRoot: scratch,
      }),
    ).rejects.toThrow(/not found/i);
  });
});
