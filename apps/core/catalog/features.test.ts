import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ForbiddenError, InvalidInputError, NotFoundError } from "../errors.ts";
import { makeWorkspace, type Workspace } from "../test-helpers.ts";
import { getFeature, listFeatures } from "./features.ts";

let ws: Workspace;
beforeEach(() => {
  ws = makeWorkspace();
  ws.seedFeature({ project: "demo", id: "2026-01-dq-alpha", modules: ["dq"], status: "active" });
  ws.seedFeature({
    project: "demo",
    id: "2026-02-meta-beta",
    modules: ["metadata"],
    status: "draft",
  });
});
afterEach(() => ws.cleanup());

function seedRawFeature(root: string, project: string, id: string, module = "dq"): string {
  const dir = join(root, project, "features", id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "metadata.yaml"),
    [
      `id: "${id}"`,
      `display_name: "${id}"`,
      'status: "active"',
      `modules: ["${module}"]`,
      "customers: []",
      'versions: ["v1"]',
      'owners: ["qa"]',
      'created_at: "2026-01"',
    ].join("\n"),
  );
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify({ automation: { status: "not-started", last_run_status: "not-run" } }),
  );
  return dir;
}

test("listFeatures returns all features sorted by id", async () => {
  const rows = await listFeatures("demo");
  expect(rows.map((r) => r.id)).toEqual(["2026-01-dq-alpha", "2026-02-meta-beta"]);
});

test("listFeatures filters by module", async () => {
  const rows = await listFeatures("demo", { module: "metadata" });
  expect(rows.map((r) => r.id)).toEqual(["2026-02-meta-beta"]);
});

test("listFeatures ignores runtime project and workspaceRoot overrides", async () => {
  const otherRoot = mkdtempSync(join(tmpdir(), "kata-platform-other-"));
  try {
    seedRawFeature(otherRoot, "ghost", "2026-03-dq-ghost");
    const overrideFilters = {
      project: "ghost",
      workspaceRoot: otherRoot,
    } as Parameters<typeof listFeatures>[1] & { project: string; workspaceRoot: string };
    const rows = await listFeatures("demo", overrideFilters);
    expect(rows.map((r) => r.id)).toEqual(["2026-01-dq-alpha", "2026-02-meta-beta"]);
  } finally {
    rmSync(otherRoot, { recursive: true, force: true });
  }
});

test("listFeatures rejects unknown project", async () => {
  await expect(listFeatures("ghost")).rejects.toThrow(InvalidInputError);
});

test("getFeature returns metadata, manifest, artifacts", async () => {
  ws.writeArtifact("demo", "2026-01-dq-alpha", "archive.md", "# cases");
  const detail = await getFeature("demo", "2026-01-dq-alpha");
  expect((detail.metadata as { id: string }).id).toBe("2026-01-dq-alpha");
  expect(
    (detail.manifest as { automation: { status: string; last_run_status: string } }).automation
      .status,
  ).toBe("not-started");
  expect(detail.artifacts.some((a) => a.name === "archive.md")).toBe(true);
});

test("getFeature throws NotFoundError for missing feature dir", async () => {
  await expect(getFeature("demo", "2099-XX-dq-missing")).rejects.toThrow(NotFoundError);
});

test("getFeature rejects invalid feature id", async () => {
  await expect(getFeature("demo", "../../etc")).rejects.toThrow(InvalidInputError);
});

test("feature catalog rejects symlinked final feature directories", async () => {
  const outsideRoot = mkdtempSync(join(tmpdir(), "kata-platform-outside-feature-"));
  try {
    const outsideFeature = seedRawFeature(outsideRoot, "outside", "2026-01-dq-alpha");
    rmSync(join(ws.root, "demo", "features", "2026-01-dq-alpha"), { recursive: true, force: true });
    symlinkSync(outsideFeature, join(ws.root, "demo", "features", "2026-01-dq-alpha"), "dir");

    const rows = await listFeatures("demo");
    expect(rows.map((r) => r.id)).toEqual(["2026-02-meta-beta"]);
    await expect(getFeature("demo", "2026-01-dq-alpha")).rejects.toThrow(ForbiddenError);
  } finally {
    rmSync(outsideRoot, { recursive: true, force: true });
  }
});

test("feature catalog rejects broken symlinked final feature directories", async () => {
  rmSync(join(ws.root, "demo", "features", "2026-01-dq-alpha"), { recursive: true, force: true });
  symlinkSync(
    join(ws.root, "missing-targets", "2026-01-dq-alpha"),
    join(ws.root, "demo", "features", "2026-01-dq-alpha"),
    "dir",
  );

  const rows = await listFeatures("demo");
  expect(rows.map((r) => r.id)).toEqual(["2026-02-meta-beta"]);
  await expect(getFeature("demo", "2026-01-dq-alpha")).rejects.toThrow(ForbiddenError);
});

test("feature catalog rejects symlinked features directories", async () => {
  const outsideRoot = mkdtempSync(join(tmpdir(), "kata-platform-outside-features-"));
  try {
    seedRawFeature(outsideRoot, "outside", "2026-03-dq-outside");
    rmSync(join(ws.root, "demo", "features"), { recursive: true, force: true });
    symlinkSync(join(outsideRoot, "outside", "features"), join(ws.root, "demo", "features"), "dir");

    const rows = await listFeatures("demo");
    expect(rows).toEqual([]);
    await expect(getFeature("demo", "2026-03-dq-outside")).rejects.toThrow(ForbiddenError);
  } finally {
    rmSync(outsideRoot, { recursive: true, force: true });
  }
});

test("feature catalog rejects symlinked project roots", async () => {
  const outsideRoot = mkdtempSync(join(tmpdir(), "kata-platform-outside-project-"));
  try {
    seedRawFeature(outsideRoot, "outside", "2026-03-dq-outside");
    rmSync(join(ws.root, "demo"), { recursive: true, force: true });
    symlinkSync(join(outsideRoot, "outside"), join(ws.root, "demo"), "dir");

    const rows = await listFeatures("demo");
    expect(rows).toEqual([]);
    await expect(getFeature("demo", "2026-03-dq-outside")).rejects.toThrow(ForbiddenError);
  } finally {
    rmSync(outsideRoot, { recursive: true, force: true });
  }
});

test("feature catalog rejects broken symlinked project roots", async () => {
  rmSync(join(ws.root, "demo"), { recursive: true, force: true });
  symlinkSync(join(ws.root, "missing-targets", "demo"), join(ws.root, "demo"), "dir");

  const rows = await listFeatures("demo");
  expect(rows).toEqual([]);
  await expect(getFeature("demo", "2026-01-dq-alpha")).rejects.toThrow(ForbiddenError);
});

test("feature catalog rejects broken symlinked metadata files", async () => {
  rmSync(join(ws.root, "demo", "features", "2026-01-dq-alpha", "metadata.yaml"), { force: true });
  symlinkSync(
    join(ws.root, "missing-targets", "metadata.yaml"),
    join(ws.root, "demo", "features", "2026-01-dq-alpha", "metadata.yaml"),
  );

  const rows = await listFeatures("demo");
  expect(rows.map((r) => r.id)).toEqual(["2026-02-meta-beta"]);
  await expect(getFeature("demo", "2026-01-dq-alpha")).rejects.toThrow(ForbiddenError);
});

test("feature catalog rejects broken symlinked manifest files", async () => {
  rmSync(join(ws.root, "demo", "features", "2026-01-dq-alpha", "manifest.json"), { force: true });
  symlinkSync(
    join(ws.root, "missing-targets", "manifest.json"),
    join(ws.root, "demo", "features", "2026-01-dq-alpha", "manifest.json"),
  );

  const rows = await listFeatures("demo");
  expect(rows.map((r) => r.id)).toEqual(["2026-02-meta-beta"]);
  await expect(getFeature("demo", "2026-01-dq-alpha")).rejects.toThrow(ForbiddenError);
});

test("feature catalog rejects symlinked metadata and manifest files", async () => {
  const outsideRoot = mkdtempSync(join(tmpdir(), "kata-platform-outside-files-"));
  try {
    const outsideFeature = seedRawFeature(outsideRoot, "outside", "2026-01-dq-alpha");
    rmSync(join(ws.root, "demo", "features", "2026-01-dq-alpha", "metadata.yaml"), { force: true });
    symlinkSync(
      join(outsideFeature, "metadata.yaml"),
      join(ws.root, "demo", "features", "2026-01-dq-alpha", "metadata.yaml"),
    );
    let rows = await listFeatures("demo");
    expect(rows.map((r) => r.id)).toEqual(["2026-02-meta-beta"]);
    await expect(getFeature("demo", "2026-01-dq-alpha")).rejects.toThrow(ForbiddenError);

    rmSync(join(ws.root, "demo", "features", "2026-01-dq-alpha", "metadata.yaml"), { force: true });
    writeFileSync(
      join(ws.root, "demo", "features", "2026-01-dq-alpha", "metadata.yaml"),
      [
        'id: "2026-01-dq-alpha"',
        'display_name: "2026-01-dq-alpha"',
        'status: "active"',
        'modules: ["dq"]',
        "customers: []",
        'versions: ["v1"]',
        'owners: ["qa"]',
        'created_at: "2026-01"',
      ].join("\n"),
    );
    rmSync(join(ws.root, "demo", "features", "2026-01-dq-alpha", "manifest.json"), { force: true });
    symlinkSync(
      join(outsideFeature, "manifest.json"),
      join(ws.root, "demo", "features", "2026-01-dq-alpha", "manifest.json"),
    );

    rows = await listFeatures("demo");
    expect(rows.map((r) => r.id)).toEqual(["2026-02-meta-beta"]);
    await expect(getFeature("demo", "2026-01-dq-alpha")).rejects.toThrow(ForbiddenError);
  } finally {
    rmSync(outsideRoot, { recursive: true, force: true });
  }
});
