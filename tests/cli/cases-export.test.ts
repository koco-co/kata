import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const YAML = `
meta:
  title: 需求名
  case_module_id: ""
  exports: [csv, xlsx, md, xmind]
cases:
  - case_id: C0001
    title: 验证用例一
    priority: P0
    tags: [模块A, 页面B, 分组C, 第四级]
    steps:
      - { action: 操作一, expected: 预期一 }
`;

function feature(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-ce-"));
  const featureDir = join(root, "workspace", "dataAssets", "features", "v1.0", "【模块】需求名");
  mkdirSync(join(featureDir, "cases"), { recursive: true });
  writeFileSync(join(featureDir, "cases", "需求名.yaml"), YAML);
  return featureDir;
}

describe("kata cases build metadata exports", () => {
  it("renders every declared format with unlimited tag columns", async () => {
    const d = feature();
    const r = spawnSync("bun", ["cli/bin/kata.ts", "cases", "build", "--feature", d], {
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
    const out = join(d, "cases", "exports");
    expect(existsSync(join(out, "需求名.csv"))).toBe(true);
    expect(existsSync(join(out, "需求名.xlsx"))).toBe(true);
    expect(existsSync(join(out, "需求名.md"))).toBe(true);
    expect(existsSync(join(out, "需求名.xmind"))).toBe(true);
    expect(readFileSync(join(out, "需求名.csv"), "utf8")).toContain("所属层级4");
  });

  it("does not expose the old one-format export command", () => {
    const d = feature();
    const r = spawnSync(
      "bun",
      ["cli/bin/kata.ts", "cases", "export", "--feature", d, "--to", "csv"],
      { encoding: "utf8" },
    );
    expect(r.status).not.toBe(0);
  });
});
