import { describe, expect, test } from "bun:test";
import { spawnKataCli } from "../cli-runner.ts";

describe("agent runtime CLI commands", () => {
  test("agents audit accepts --runtime all", () => {
    const result = spawnKataCli(["agents", "audit", "--runtime", "all"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[agents audit]");
    expect(result.stdout).toContain("runtime=claude");
    expect(result.stdout).toContain("runtime=codex");
  });

  test("skills audit accepts --runtime codex", () => {
    const result = spawnKataCli(["skills", "audit", "--runtime", "codex"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[skills audit]");
    expect(result.stdout).toContain("runtime=codex");
  });

  test("agents drift emits JSON report", () => {
    const result = spawnKataCli(["agents", "drift", "--json"]);
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.version).toBe(1);
    expect(Array.isArray(report.pairs)).toBe(true);
  });
});
