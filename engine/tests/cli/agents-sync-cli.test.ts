import { describe, expect, test } from "bun:test";
import { spawnKataCli } from "../cli-runner.ts";

describe("agents sync CLI", () => {
  test("defaults to dry-run and emits JSON actions", () => {
    const result = spawnKataCli(["agents", "sync"]);

    expect([0, 1]).toContain(result.status);
    const report = JSON.parse(result.stdout);
    expect(report.dryRun).toBe(true);
    expect(Array.isArray(report.actions)).toBe(true);
    expect(
      report.actions.every((action: { action?: unknown }) => typeof action.action === "string"),
    ).toBe(true);
  });
});
