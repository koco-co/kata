import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const YAML = `
meta: { title: 需求名, version: v1, feature_id: f1 }
cases:
  - { id: C001, title: 用例一, priority: P0, tags: [模块A], steps: [ { action: 操作一, expected: 预期一 } ] }
  - { id: C002, title: 用例二, priority: P1, steps: [ { action: 操作二, expected: 预期二 } ] }
`;

function feature(): string {
  const d = mkdtempSync(join(tmpdir(), "kata-ce-"));
  mkdirSync(join(d, "cases"), { recursive: true });
  writeFileSync(join(d, "cases", "需求名.yaml"), YAML);
  return d;
}

describe("kata cases export", () => {
  it("exports csv with all case rows", () => {
    const d = feature();
    const r = spawnSync(
      "bun",
      ["cli/bin/kata.ts", "cases", "export", "--feature", d, "--to", "csv"],
      { encoding: "utf8" },
    );
    expect(r.status).toBe(0);
    const csv = readFileSync(join(d, "cases", "exports", "需求名.csv"), "utf8");
    expect(csv).toContain("用例编号");
    expect(csv).toContain("用例一");
    expect(csv).toContain("用例二");
    expect(csv).toContain("模块A");
  });
  it("exports xlsx as a valid workbook", async () => {
    const d = feature();
    const r = spawnSync(
      "bun",
      ["cli/bin/kata.ts", "cases", "export", "--feature", d, "--to", "xlsx"],
      { encoding: "utf8" },
    );
    expect(r.status).toBe(0);
    const p = join(d, "cases", "exports", "需求名.xlsx");
    expect(existsSync(p)).toBe(true);
    // xlsx 是 zip:必须可解压且含 workbook.xml
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(readFileSync(p));
    expect(zip.file("xl/workbook.xml")).not.toBeNull();
  });
});
