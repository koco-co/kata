import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFeaturesResolve } from "../../src/cli/features-resolve.ts";

describe("runFeaturesResolve", () => {
  let ws: string;
  const now = new Date("2026-05-23T10:00:00Z");
  beforeEach(() => {
    ws = join(mkdtempSync(join(tmpdir(), "kata-resolve-")), "workspace");
    mkdirSync(join(ws, "dataAssets/features"), { recursive: true });
  });
  afterEach(() => rmSync(ws, { recursive: true, force: true }));

  it("prefers an explicit slug", () => {
    const r = runFeaturesResolve({
      project: "dataAssets",
      slug: "lt-dq-rule-set",
      module: "dq",
      workspaceRoot: ws,
      now,
    });
    expect(r.featureId).toBe("2026-05-lt-dq-rule-set");
    expect(r.featureDir).toBe(join(ws, "dataAssets/features/2026-05-lt-dq-rule-set"));
    expect(r.reused).toBe(false);
  });

  it("derives from a non-model source field when no slug given", () => {
    const r = runFeaturesResolve({
      project: "dataAssets",
      source: { kind: "lanhu", pageId: "7afabbf5e1" },
      module: "dq",
      workspaceRoot: ws,
      now,
    });
    expect(r.featureId).toBe("2026-05-lanhu-7afabbf5");
  });

  it("falls back to hex when nothing derivable", () => {
    const r = runFeaturesResolve({
      project: "dataAssets",
      source: { kind: "lanhu" },
      module: "dq",
      seed: "x",
      workspaceRoot: ws,
      now,
    });
    expect(r.featureId).toMatch(/^2026-05-unresolved-dq-[a-f0-9]{8}$/);
  });

  it("is idempotent: reuses an existing dir built from the same source", () => {
    const a = runFeaturesResolve({
      project: "dataAssets",
      slug: "lt-dq",
      module: "dq",
      workspaceRoot: ws,
      now,
    });
    const b = runFeaturesResolve({
      project: "dataAssets",
      slug: "lt-dq",
      module: "dq",
      workspaceRoot: ws,
      now,
    });
    expect(b.featureId).toBe(a.featureId);
    expect(b.reused).toBe(true);
  });

  it("appends a deterministic suffix on a different-source collision", () => {
    const dir = join(ws, "dataAssets/features/2026-05-lt-dq");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "source-snapshot.json"),
      JSON.stringify({ slug_source: "prd:other.md" }),
    );
    const r = runFeaturesResolve({
      project: "dataAssets",
      slug: "lt-dq",
      slugSourceKey: "lanhu:7af",
      module: "dq",
      workspaceRoot: ws,
      now,
    });
    expect(r.featureId).toBe("2026-05-lt-dq-2");
  });

  it("reuses an existing dir whose recorded slug_source matches the current source", () => {
    const dir = join(ws, "dataAssets/features/2026-05-lt-dq");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "source-snapshot.json"), JSON.stringify({ slug_source: "lanhu:7af" }));
    const r = runFeaturesResolve({
      project: "dataAssets",
      slug: "lt-dq",
      slugSourceKey: "lanhu:7af",
      module: "dq",
      workspaceRoot: ws,
      now,
    });
    expect(r.featureId).toBe("2026-05-lt-dq");
    expect(r.reused).toBe(true);
  });
});
