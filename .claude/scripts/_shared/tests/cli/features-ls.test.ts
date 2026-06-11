import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFeaturesLs } from "@shared/cli/features-ls.ts";
import { stringify } from "yaml";

// 统一使用 FeatureMetadata@2 格式，features 落版本层目录
function seedFeature(
  root: string,
  group: string,
  dirName: string,
  opts: {
    id?: string;
    modules?: string[];
    customers?: string[];
    versions?: string[];
    owners?: string[];
    status?: string;
    createdAt?: string;
    automationStatus?: string;
    lastRunStatus?: string;
  },
) {
  const id = opts.id ?? dirName;
  const dir = join(root, "dataAssets/features", group, dirName);
  mkdirSync(join(dir, "cases"), { recursive: true });
  mkdirSync(join(dir, "automation"), { recursive: true });
  mkdirSync(join(dir, "runs"), { recursive: true });
  writeFileSync(
    join(dir, "metadata.yaml"),
    stringify({
      schema: "FeatureMetadata@2",
      id,
      display_name: id,
      status: opts.status ?? "active",
      created_at: opts.createdAt ?? "2026-04-01",
      updated_at: "2026-04-01",
      modules: opts.modules ?? [],
      customers: opts.customers ?? [],
      versions: opts.versions ?? [],
      owners: opts.owners ?? [],
      inputs: [],
      relates_to: [],
      emits: { cases_xmind: true, archive: true, playwright_tests: true },
      case_drafting: { status: "not-started" },
      automation: {
        status: opts.automationStatus ?? "not-started",
        intents: [],
        last_run_status: opts.lastRunStatus ?? "not-run",
      },
      files: {},
    }),
  );
}

describe("kata features ls", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "kata-feat-ls-"));
    // 三个 feature 落 v6.4.10 版本层
    seedFeature(scratch, "v6.4.10", "2026-04-dq-a", {
      modules: ["dq"],
      versions: ["v6.4.10"],
      owners: ["koco"],
      status: "active",
    });
    seedFeature(scratch, "v6.4.10", "2026-04-sec-b", {
      modules: ["security"],
      versions: ["v6.3"],
      owners: ["qa"],
      status: "active",
    });
    seedFeature(scratch, "v6.4.10", "2026-03-old", {
      modules: ["dq"],
      versions: ["v6.4.10"],
      owners: ["koco"],
      status: "archived",
      createdAt: "2026-03-01",
    });
  });
  afterEach(() => rmSync(scratch, { recursive: true, force: true }));

  it("lists all features with no filter", async () => {
    const rows = await runFeaturesLs({ project: "dataAssets", workspaceRoot: scratch });
    expect(rows).toHaveLength(3);
  });

  it("filters by module", async () => {
    const rows = await runFeaturesLs({
      project: "dataAssets",
      workspaceRoot: scratch,
      module: "dq",
    });
    expect(rows.map((r) => r.id)).toEqual(["2026-03-old", "2026-04-dq-a"]);
  });

  it("filters by status", async () => {
    const rows = await runFeaturesLs({
      project: "dataAssets",
      workspaceRoot: scratch,
      status: "active",
    });
    expect(rows).toHaveLength(2);
  });

  it("combines filters as AND", async () => {
    const rows = await runFeaturesLs({
      project: "dataAssets",
      workspaceRoot: scratch,
      module: "dq",
      status: "active",
    });
    expect(rows.map((r) => r.id)).toEqual(["2026-04-dq-a"]);
  });

  it("filters by version", async () => {
    const rows = await runFeaturesLs({
      project: "dataAssets",
      workspaceRoot: scratch,
      version: "v6.3",
    });
    expect(rows.map((r) => r.id)).toEqual(["2026-04-sec-b"]);
  });

  it("filters by owner", async () => {
    const rows = await runFeaturesLs({
      project: "dataAssets",
      workspaceRoot: scratch,
      owner: "koco",
    });
    expect(rows.map((r) => r.id)).toEqual(["2026-03-old", "2026-04-dq-a"]);
  });

  it("filters by created-after", async () => {
    const rows = await runFeaturesLs({
      project: "dataAssets",
      workspaceRoot: scratch,
      createdAfter: "2026-04",
    });
    expect(rows.map((r) => r.id)).toEqual(["2026-04-dq-a", "2026-04-sec-b"]);
  });

  it("exposes group/zone/dirName/areas on each row", async () => {
    const rows = await runFeaturesLs({ project: "dataAssets", workspaceRoot: scratch });
    const row = rows.find((r) => r.id === "2026-04-dq-a");
    if (!row) throw new Error("expected row for 2026-04-dq-a");
    expect(row.group).toBe("v6.4.10");
    expect(row.zone).toBe("active");
    expect(row.dirName).toBe("2026-04-dq-a");
    expect(row.areas.cases).toBe(true);
    expect(row.areas.automation).toBe(true);
    expect(row.areas.runs).toBe(true);
  });
});
