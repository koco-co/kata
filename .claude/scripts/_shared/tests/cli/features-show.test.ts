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
    // 使用 FeatureMetadata@2，feature 落版本层
    const dir = join(scratch, "dataAssets/features/v6.4.10/2026-04-x");
    mkdirSync(dir, { recursive: true });
    mkdirSync(join(dir, "runs"), { recursive: true });
    writeFileSync(
      join(dir, "metadata.yaml"),
      stringify({
        schema: "FeatureMetadata@2",
        id: "2026-04-x",
        display_name: "X",
        status: "active",
        created_at: "2026-04-01",
        updated_at: "2026-04-01",
        modules: ["dq"],
        customers: ["standard"],
        versions: ["v6.4.10"],
        owners: ["koco"],
        inputs: [],
        relates_to: [],
        emits: { cases_xmind: true, archive: true, playwright_tests: true },
        case_drafting: {
          status: "completed",
          archive_path: "cases/archive.md",
          requirement_atoms: [{ id: "RA-1", source_ref: "x" }],
        },
        automation: {
          status: "ready",
          intents: [
            {
              intent_id: "SR-INTENT-X",
              case_files: ["automation/cases/t01.ts"],
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

  it("returns feature detail object with metadata and recentRuns", async () => {
    const detail = await runFeaturesShow({
      project: "dataAssets",
      featureId: "2026-04-x",
      workspaceRoot: scratch,
    });
    expect(detail.metadata.id).toBe("2026-04-x");
    if (!detail.metadata.automation) throw new Error("expected automation section");
    expect(detail.metadata.automation.intents).toHaveLength(1);
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
