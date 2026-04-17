import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stringify } from "yaml";
import { runFeaturesLs } from "../../src/cli/features-ls.ts";

function seedFeature(
  root: string,
  id: string,
  opts: {
    modules?: string[];
    customers?: string[];
    versions?: string[];
    owners?: string[];
    status?: string;
    createdAt?: string;
  },
) {
  const dir = join(root, "dataAssets/features", id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "metadata.yaml"),
    stringify({
      schema: "FeatureMetadata@1",
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
    }),
  );
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify({
      schema: "FeatureManifest@2",
      feature_id: id,
      case_drafting: { status: "completed" },
      automation: { status: "ready", intents: [], last_run_status: "passing" },
      files: {},
    }),
  );
}

describe("kata features ls", () => {
  let scratch: string;
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "kata-feat-ls-"));
    seedFeature(scratch, "2026-04-dq-a", {
      modules: ["dq"],
      versions: ["v6.4"],
      owners: ["koco"],
      status: "active",
    });
    seedFeature(scratch, "2026-04-sec-b", {
      modules: ["security"],
      versions: ["v6.3"],
      owners: ["qa"],
      status: "active",
    });
    seedFeature(scratch, "2026-03-old", {
      modules: ["dq"],
      versions: ["v6.4"],
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
});
