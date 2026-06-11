import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runResultsPrune } from "@shared/cli/results-prune.ts";
import { stringify } from "yaml";

// ─── 辅助：写入最小 FeatureMetadata@2 ───
function writeMinimalMeta(dir: string, id: string) {
  writeFileSync(
    join(dir, "metadata.yaml"),
    stringify({
      schema: "FeatureMetadata@2",
      id,
      display_name: id,
      status: "active",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      modules: [],
      customers: [],
      versions: [],
      owners: [],
      inputs: [],
      relates_to: [],
      emits: {},
      case_drafting: { status: "not-started", requirement_atoms: [] },
      automation: { status: "not-started", intents: [] },
      files: {},
    }),
  );
}

describe("kata results prune", () => {
  let scratch: string;

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "kata-results-prune-"));
    // feature 落版本层 features/v6.4.10/2026-04-x
    const featureDir = join(scratch, "dataAssets/features/v6.4.10/2026-04-x");
    mkdirSync(featureDir, { recursive: true });
    writeMinimalMeta(featureDir, "2026-04-x");
    const root = join(featureDir, "runs");
    for (const id of [
      "20260501-0900-run-01",
      "20260502-0900-run-02",
      "20260503-0900-run-03",
      "20260504-0900-run-04",
    ]) {
      mkdirSync(join(root, id), { recursive: true });
    }
    // 第一个 run 标记为 published，第一个 run 为 baseline 类型
    writeFileSync(join(root, "20260501-0900-run-01/.published"), "{}");
  });

  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("dry-run: returns plan without deleting (apply=false)", async () => {
    const r = await runResultsPrune({
      project: "dataAssets",
      featureId: "2026-04-x",
      keep: 2,
      workspaceRoot: scratch,
      apply: false,
    });
    // 应报告需要删除的，但文件仍然存在
    const remaining = readdirSync(join(scratch, "dataAssets/features/v6.4.10/2026-04-x/runs"));
    expect(remaining).toHaveLength(4); // nothing actually deleted
    expect(r.plan).toBeDefined();
    expect(r.plan[0]?.remove.length).toBeGreaterThan(0);
  });

  it("apply=true: keeps last N + .published runs, deletes the rest", async () => {
    await runResultsPrune({
      project: "dataAssets",
      featureId: "2026-04-x",
      keep: 2,
      workspaceRoot: scratch,
      apply: true,
    });
    const remaining = readdirSync(join(scratch, "dataAssets/features/v6.4.10/2026-04-x/runs"));
    expect(remaining).toContain("20260501-0900-run-01"); // protected (.published)
    expect(remaining).toContain("20260503-0900-run-03"); // top-N
    expect(remaining).toContain("20260504-0900-run-04"); // top-N
    expect(remaining).not.toContain("20260502-0900-run-02");
  });

  it("apply=true: keeps baseline-typed runs", async () => {
    // 添加一个 baseline 类型的 run
    const root = join(scratch, "dataAssets/features/v6.4.10/2026-04-x/runs");
    mkdirSync(join(root, "20260401-0000-baseline-01"), { recursive: true });
    await runResultsPrune({
      project: "dataAssets",
      featureId: "2026-04-x",
      keep: 1,
      workspaceRoot: scratch,
      apply: true,
    });
    const remaining = readdirSync(root);
    expect(remaining).toContain("20260401-0000-baseline-01"); // baseline 保留
    expect(remaining).toContain("20260501-0900-run-01"); // published 保留
    expect(remaining).toContain("20260504-0900-run-04"); // latest 1
  });

  it("keep=0: remove includes all non-published/non-baseline runs", async () => {
    const root = join(scratch, "dataAssets/features/v6.4.10/2026-04-x/runs");
    await runResultsPrune({
      project: "dataAssets",
      featureId: "2026-04-x",
      keep: 0,
      workspaceRoot: scratch,
      apply: true,
    });
    const remaining = readdirSync(root);
    // only .published run is kept; no latest set when keep=0
    expect(remaining).toContain("20260501-0900-run-01"); // published 保留
    expect(remaining).not.toContain("20260502-0900-run-02");
    expect(remaining).not.toContain("20260503-0900-run-03");
    expect(remaining).not.toContain("20260504-0900-run-04");
  });

  it("apply=true: clears runs/_tmp/ contents", async () => {
    const root = join(scratch, "dataAssets/features/v6.4.10/2026-04-x/runs");
    const tmpDir = join(root, "_tmp");
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, "junk.txt"), "garbage");
    await runResultsPrune({
      project: "dataAssets",
      featureId: "2026-04-x",
      keep: 2,
      workspaceRoot: scratch,
      apply: true,
    });
    // _tmp/ itself may exist but its contents should be gone
    const tmpContents = readdirSync(tmpDir);
    expect(tmpContents).toHaveLength(0);
  });
});
