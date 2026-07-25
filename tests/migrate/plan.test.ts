import { afterAll, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPlan, checkConflicts, type MigrateOp } from "../../scripts/migrate/lib/plan.ts";

describe("checkConflicts", () => {
  it("flags two sources mapping to the same dest", () => {
    const ops: MigrateOp[] = [
      { action: "move", src: "a", dest: "x/c.yaml", sha256: "1", reason: "r" },
      { action: "move", src: "b", dest: "x/c.yaml", sha256: "2", reason: "r" },
    ];
    expect(checkConflicts(ops).length).toBeGreaterThan(0);
  });
  it("passes when dests are unique", () => {
    const ops: MigrateOp[] = [
      { action: "move", src: "a", dest: "x/1.yaml", sha256: "1", reason: "r" },
      { action: "move", src: "b", dest: "x/2.yaml", sha256: "2", reason: "r" },
    ];
    expect(checkConflicts(ops)).toEqual([]);
  });
});

// buildPlan 分类规则夹具:在临时目录里摆出最小 workspace 形态
const fixtureRoot = mkdtempSync(join(tmpdir(), "kata-migrate-"));

describe("buildPlan", () => {
  const root = fixtureRoot;
  const ws = join(root, "workspace", "dataAssets");
  const feature = join(ws, "features", "v7.0.0", "【v700】【x】【y】需求A");
  mkdirSync(join(feature, "inputs", "lanhu-snapshots"), { recursive: true });
  mkdirSync(join(feature, "cases"), { recursive: true });
  writeFileSync(join(feature, "inputs", "lanhu-snapshots", "1-u1.png"), "png-bytes");
  writeFileSync(join(feature, "cases", "archive.md"), "# archive");
  writeFileSync(join(feature, "cases", "cases.xmind"), "xmind");
  writeFileSync(join(feature, "prd.md"), "![s](inputs/lanhu-snapshots/1-u1.png)");
  const shell = join(ws, "features", "v6.4.7", "【v647】【数据质量】任务时长限制");
  mkdirSync(shell, { recursive: true });
  writeFileSync(join(shell, ".gitkeep"), "");
  const bak = join(ws, "_shared", "knowledge", ".history");
  mkdirSync(bak, { recursive: true });
  writeFileSync(join(bak, "2026_x.bak"), "old");

  const ops = buildPlan(root);
  const bySrc = new Map(ops.map((o) => [o.src, o]));

  it("maps inputs/lanhu-snapshots to inputs/snapshots", () => {
    const op = bySrc.get(
      "workspace/dataAssets/features/v7.0.0/【v700】【x】【y】需求A/inputs/lanhu-snapshots/1-u1.png",
    );
    expect(op?.action).toBe("move");
    expect(op?.dest).toBe(
      "workspace/dataAssets/features/v7.0.0/【v700】【x】【y】需求A/inputs/snapshots/1-u1.png",
    );
  });
  it("classifies cases/*.md as convert (T3)", () => {
    expect(
      bySrc.get("workspace/dataAssets/features/v7.0.0/【v700】【x】【y】需求A/cases/archive.md")
        ?.action,
    ).toBe("convert");
  });
  it("keeps normal case artifacts", () => {
    expect(
      bySrc.get("workspace/dataAssets/features/v7.0.0/【v700】【x】【y】需求A/cases/cases.xmind")
        ?.action,
    ).toBe("keep");
  });
  it("flags v647 shells as confirm", () => {
    const op = bySrc.get(
      "workspace/dataAssets/features/v6.4.7/【v647】【数据质量】任务时长限制/.gitkeep",
    );
    expect(op?.action).toBe("confirm");
  });
  it("deletes knowledge .bak files", () => {
    expect(bySrc.get("workspace/dataAssets/_shared/knowledge/.history/2026_x.bak")?.action).toBe(
      "delete",
    );
  });

  it("computes real sha256 for files", () => {
    const op = bySrc.get(
      "workspace/dataAssets/features/v7.0.0/【v700】【x】【y】需求A/cases/archive.md",
    );
    expect(op?.sha256).toMatch(/^[0-9a-f]{64}$/);
  });
});

// 清理临时夹具目录
afterAll(() => {
  rmSync(fixtureRoot, { recursive: true, force: true });
});
