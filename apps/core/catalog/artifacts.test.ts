import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ForbiddenError, InvalidInputError, NotFoundError } from "../errors.ts";
import { makeWorkspace, type Workspace } from "../test-helpers.ts";
import { listArtifacts, readTextArtifact } from "./artifacts.ts";

let ws: Workspace;
beforeEach(() => {
  ws = makeWorkspace();
  ws.seedFeature({ project: "demo", id: "2026-01-dq-alpha" });
  ws.writeArtifact("demo", "2026-01-dq-alpha", "archive.md", "# cases\n");
});
afterEach(() => ws.cleanup());

test("listArtifacts reports present whitelisted artifacts with byte sizes", () => {
  const arts = listArtifacts("demo", "2026-01-dq-alpha");
  const names = arts.map((a) => a.name);
  expect(names).toContain("metadata.yaml");
  expect(names).toContain("manifest.json");
  expect(names).toContain("archive.md");
  const archive = arts.find((a) => a.name === "archive.md");
  expect(archive?.bytes).toBeGreaterThan(0);
});

test("readTextArtifact returns whitelisted file content", () => {
  expect(readTextArtifact("demo", "2026-01-dq-alpha", "archive.md")).toBe("# cases\n");
});

test("readTextArtifact rejects non-whitelisted name with ForbiddenError", () => {
  expect(() => readTextArtifact("demo", "2026-01-dq-alpha", "secret.env")).toThrow(ForbiddenError);
});

test("readTextArtifact rejects symlinked artifacts and listArtifacts skips them", () => {
  const outside = join(ws.root, "outside.txt");
  const archive = join(ws.root, "demo", "features", "2026-01-dq-alpha", "archive.md");
  writeFileSync(outside, "secret\n");
  unlinkSync(archive);
  symlinkSync(outside, archive);

  expect(() => readTextArtifact("demo", "2026-01-dq-alpha", "archive.md")).toThrow(ForbiddenError);
  expect(listArtifacts("demo", "2026-01-dq-alpha").map((a) => a.name)).not.toContain("archive.md");
});

test("readTextArtifact rejects symlinked feature directories and listArtifacts skips them", () => {
  const outsideDir = join(ws.root, "outside");
  const featureDir = join(ws.root, "demo", "features", "2026-01-dq-alpha");
  mkdirSync(outsideDir);
  writeFileSync(join(outsideDir, "archive.md"), "outside archive\n");
  rmSync(featureDir, { recursive: true, force: true });
  symlinkSync(outsideDir, featureDir, "dir");

  expect(listArtifacts("demo", "2026-01-dq-alpha").map((a) => a.name)).not.toContain("archive.md");
  expect(() => readTextArtifact("demo", "2026-01-dq-alpha", "archive.md")).toThrow(ForbiddenError);
});

test("readTextArtifact rejects symlinked project directories and listArtifacts skips them", () => {
  const outsideProject = join(ws.root, "outside-project");
  const projectDir = join(ws.root, "demo");
  mkdirSync(join(outsideProject, "features", "2026-01-dq-alpha"), { recursive: true });
  writeFileSync(join(outsideProject, "features", "2026-01-dq-alpha", "archive.md"), "outside archive\n");
  rmSync(projectDir, { recursive: true, force: true });
  symlinkSync(outsideProject, projectDir, "dir");

  expect(listArtifacts("demo", "2026-01-dq-alpha").map((a) => a.name)).not.toContain("archive.md");
  expect(() => readTextArtifact("demo", "2026-01-dq-alpha", "archive.md")).toThrow(ForbiddenError);
});

test("readTextArtifact rejects symlinked features directories and listArtifacts skips them", () => {
  const outsideFeatures = join(ws.root, "outside-features");
  const featuresDir = join(ws.root, "demo", "features");
  mkdirSync(join(outsideFeatures, "2026-01-dq-alpha"), { recursive: true });
  writeFileSync(join(outsideFeatures, "2026-01-dq-alpha", "archive.md"), "outside archive\n");
  rmSync(featuresDir, { recursive: true, force: true });
  symlinkSync(outsideFeatures, featuresDir, "dir");

  expect(listArtifacts("demo", "2026-01-dq-alpha").map((a) => a.name)).not.toContain("archive.md");
  expect(() => readTextArtifact("demo", "2026-01-dq-alpha", "archive.md")).toThrow(ForbiddenError);
});

test("readTextArtifact rejects artifact directories and listArtifacts skips them", () => {
  const archive = join(ws.root, "demo", "features", "2026-01-dq-alpha", "archive.md");
  unlinkSync(archive);
  mkdirSync(archive);

  expect(listArtifacts("demo", "2026-01-dq-alpha").map((a) => a.name)).not.toContain("archive.md");
  expect(() => readTextArtifact("demo", "2026-01-dq-alpha", "archive.md")).toThrow(ForbiddenError);
});

test("cases.xmind is listable but not readable as text", () => {
  ws.writeArtifact("demo", "2026-01-dq-alpha", "cases.xmind", "dummy xmind");

  expect(listArtifacts("demo", "2026-01-dq-alpha").map((a) => a.name)).toContain("cases.xmind");
  expect(() => readTextArtifact("demo", "2026-01-dq-alpha", "cases.xmind")).toThrow(ForbiddenError);
});

test("readTextArtifact throws NotFoundError when whitelisted file absent", () => {
  expect(() => readTextArtifact("demo", "2026-01-dq-alpha", "prd.md")).toThrow(NotFoundError);
});

test("readTextArtifact rejects bad feature id", () => {
  expect(() => readTextArtifact("demo", "../../etc", "archive.md")).toThrow(InvalidInputError);
});
