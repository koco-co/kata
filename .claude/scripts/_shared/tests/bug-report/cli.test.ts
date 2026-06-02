import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { repoRoot } from "@shared/lib/paths.ts";
import bugFixture from "./bug-report.fixture.json";

const CLI = join(repoRoot(), ".claude/skills/defect-analyze/scripts/defect-report.ts");

describe("defect-report render-bug CLI", () => {
  test("writes a report.html for a valid bug fixture", async () => {
    const dir = mkdtempSync(join(tmpdir(), "defect-cli-"));
    const jsonPath = join(dir, "bug.json");
    const outPath = join(dir, "report.html");
    writeFileSync(jsonPath, JSON.stringify(bugFixture), "utf8");

    const proc = Bun.spawn(["bun", CLI, "render-bug", "--json", jsonPath, "--variant", "full", "--out", outPath]);
    const code = await proc.exited;

    expect(code).toBe(0);
    expect(existsSync(outPath)).toBe(true);
    const html = readFileSync(outPath, "utf8");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).not.toContain("{{");
  });

  test("exits non-zero on invalid severity", async () => {
    const dir = mkdtempSync(join(tmpdir(), "defect-cli-"));
    const jsonPath = join(dir, "bad.json");
    writeFileSync(jsonPath, JSON.stringify({ title: "t", severity: "blocker", problem_type: "代码问题", summary: "s" }), "utf8");

    const proc = Bun.spawn(["bun", CLI, "render-bug", "--json", jsonPath, "--out", join(dir, "out.html")], {
      stderr: "pipe",
    });
    const code = await proc.exited;
    expect(code).not.toBe(0);
  });
});
