import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runResultsPublish } from "@shared/cli/results-publish.ts";
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

describe("kata results publish", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "kata-results-pub-"));
    // feature 落版本层 features/v6.4.10/2026-04-x
    const featureDir = join(scratch, "dataAssets/features/v6.4.10/2026-04-x");
    mkdirSync(featureDir, { recursive: true });
    writeMinimalMeta(featureDir, "2026-04-x");
    const runDir = join(featureDir, "runs/20260510-1430-run-01");
    mkdirSync(join(runDir, "allure-results"), { recursive: true });
    writeFileSync(join(runDir, "allure-results/dummy.json"), "{}");
    writeFileSync(
      join(runDir, "handoff.json"),
      JSON.stringify({ schema: "PlaywrightAutomationHandoff@2", status: "passed" }),
    );
    writeFileSync(join(runDir, "handoff.md"), "# handoff");
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("copies allure-results and handoff into published-reports and writes .published marker", async () => {
    await runResultsPublish({
      project: "dataAssets",
      featureId: "2026-04-x",
      runId: "20260510-1430-run-01",
      workspaceRoot: scratch,
    });
    const pubRoot = join(scratch, "dataAssets/_shared/published-reports/2026-05/2026-04-x-01");
    expect(existsSync(join(pubRoot, "handoff.md"))).toBe(true);
    expect(existsSync(join(pubRoot, "handoff.json"))).toBe(true);
    expect(existsSync(join(pubRoot, "allure-results/dummy.json"))).toBe(true);
    const marker = join(
      scratch,
      "dataAssets/features/v6.4.10/2026-04-x/runs/20260510-1430-run-01/.published",
    );
    expect(existsSync(marker)).toBe(true);
    const markerData = JSON.parse(readFileSync(marker, "utf-8"));
    expect(markerData.published_to).toContain("2026-04-x-01");
  });
});
