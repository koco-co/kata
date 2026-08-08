import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const YAML = `
meta:
  title: 需求名
  feature_id: fixture-feature
  case_module_id: "10812"
  exports: [交付用例.csv, 交付用例.xlsx, 交付用例.md, 交付用例.xmind]
cases:
  - case_id: C0001
    title: 验证【数据质量】-【新建监控规则】创建规则，列表新增该规则
    priority: P0
    precondition: 无
    tags: [数据质量, 规则库配置, 新建监控规则]
    steps:
      - { action: 进入【数据质量 → 规则库配置 → 新建监控规则】页面, expected: 进入成功 }
      - { action: 查看规则列表, expected: 规则列表展示 1 条记录 }
      - { action: 确认规则状态, expected: 状态显示为「启用」 }
`;

function feature(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-ce-"));
  const featureDir = join(root, "workspace", "dataAssets", "features", "v1.0", "【模块】需求名");
  mkdirSync(join(featureDir, "cases"), { recursive: true });
  writeFileSync(join(featureDir, "cases", "需求名.yaml"), YAML);
  return featureDir;
}

describe("kata cases build metadata exports", () => {
  it("renders every explicitly named derivative and removes stale artifacts", async () => {
    const d = feature();
    const out = join(d, "cases", "exports");
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, "历史导出.xmind"), "stale");
    const r = spawnSync("bun", ["cli/bin/kata.ts", "cases", "build", "--feature", d], {
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
    expect(existsSync(join(out, "交付用例.csv"))).toBe(true);
    expect(existsSync(join(out, "交付用例.xlsx"))).toBe(true);
    expect(existsSync(join(out, "交付用例.md"))).toBe(true);
    expect(existsSync(join(out, "交付用例.xmind"))).toBe(true);
    expect(existsSync(join(out, "需求名.xmind"))).toBe(false);
    expect(existsSync(join(out, "历史导出.xmind"))).toBe(false);
    expect(readFileSync(join(out, "交付用例.csv"), "utf8")).toContain("所属模块");
    expect(readFileSync(join(out, "交付用例.csv"), "utf8")).toContain("需求名(#10812)");
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
