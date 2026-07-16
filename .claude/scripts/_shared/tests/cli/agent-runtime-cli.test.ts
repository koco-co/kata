import { describe, expect, test } from "bun:test";
import { spawnKataCli } from "../cli-runner.ts";

describe("agent runtime CLI commands", () => {
  test("agents audit errors when the agents dir is missing", () => {
    // The repo intentionally has no .claude/agents/ dir; the audit must not
    // pass vacuously (scanned=0). It must surface a non-zero exit + a clear message.
    const result = spawnKataCli(["agents", "audit", "--exit-code"]);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("未找到代理目录");
  });

  test("agents audit without --exit-code still reports the missing dir but exits 0", () => {
    const result = spawnKataCli(["agents", "audit"]);
    expect(result.status).toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("未找到代理目录");
  });

  test("skills audit runs without error", () => {
    const result = spawnKataCli(["skills", "audit"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[skills audit]");
  });
});
