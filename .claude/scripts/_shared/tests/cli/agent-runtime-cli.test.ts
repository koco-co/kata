import { describe, expect, test } from "bun:test";
import { spawnKataCli } from "../cli-runner.ts";

describe("agent runtime CLI commands", () => {
  test("agents audit runs without error", () => {
    const result = spawnKataCli(["agents", "audit"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[agents audit]");
  });

  test("skills audit runs without error", () => {
    const result = spawnKataCli(["skills", "audit"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[skills audit]");
  });
});
