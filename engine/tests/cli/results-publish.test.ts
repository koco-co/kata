import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runResultsPublish } from "../../src/cli/results-publish.ts";

describe("kata results publish", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "kata-results-pub-"));
    const runDir = join(scratch, "dataAssets/features/2026-04-x/results/20260510-1430-aaaaaaaa");
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
      runId: "20260510-1430-aaaaaaaa",
      workspaceRoot: scratch,
    });
    const pubRoot = join(
      scratch,
      "dataAssets/_shared/published-reports/2026-05/2026-04-x-aaaaaaaa",
    );
    expect(existsSync(join(pubRoot, "handoff.md"))).toBe(true);
    expect(existsSync(join(pubRoot, "handoff.json"))).toBe(true);
    expect(existsSync(join(pubRoot, "allure-results/dummy.json"))).toBe(true);
    const marker = join(
      scratch,
      "dataAssets/features/2026-04-x/results/20260510-1430-aaaaaaaa/.published",
    );
    expect(existsSync(marker)).toBe(true);
    const markerData = JSON.parse(readFileSync(marker, "utf-8"));
    expect(markerData.published_to).toContain("2026-04-x-aaaaaaaa");
  });
});
