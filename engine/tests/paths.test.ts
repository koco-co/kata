import { expect, it } from "bun:test";
import { join } from "node:path";
import {
  blocksDir,
  kataDir,
  legacyBackupDir,
  locksDir,
  repoRoot,
  sessionFilePath,
  sessionsDir,
} from "../lib/paths.ts";

describe("kata paths", () => {
  it("kataDir resolves to .kata/{project} under repo root", () => {
    expect(kataDir("dataAssets")).toBe(join(repoRoot(), ".kata", "dataAssets"));
  });

  it("sessionsDir returns .kata/{project}/sessions/{workflow}", () => {
    expect(sessionsDir("dataAssets", "case-draft")).toBe(
      join(repoRoot(), ".kata", "dataAssets", "sessions", "case-draft"),
    );
  });

  it("locksDir returns .kata/{project}/locks", () => {
    expect(locksDir("dataAssets")).toBe(join(repoRoot(), ".kata", "dataAssets", "locks"));
  });

  it("blocksDir returns .kata/{project}/blocks/{workflow}/{slug}", () => {
    expect(blocksDir("dataAssets", "ui-plan", "suite-x")).toBe(
      join(repoRoot(), ".kata", "dataAssets", "blocks", "ui-plan", "suite-x"),
    );
  });

  it("legacyBackupDir returns .kata/{project}/legacy-backup", () => {
    expect(legacyBackupDir("dataAssets")).toBe(
      join(repoRoot(), ".kata", "dataAssets", "legacy-backup"),
    );
  });

  it("sessionFilePath returns .kata/{project}/sessions/{workflow}/{slug}.json", () => {
    expect(sessionFilePath("dataAssets", "case-draft", "prd-xxx-default")).toBe(
      join(repoRoot(), ".kata", "dataAssets", "sessions", "case-draft", "prd-xxx-default.json"),
    );
  });
});

import { describe, expect, test } from "bun:test";
import {
  enhancedMd,
  featureDir,
  originalPrdMd,
  prdImagesDir,
  resolvedMd,
  sourceFactsJson,
} from "../lib/paths.ts";

describe("enhanced doc paths", () => {
  test("featureDir returns {project}/features/{yyyymm}-{slug}/", () => {
    const p = featureDir("dataAssets", "202604", "my-prd");
    expect(p).toMatch(/workspace\/dataAssets\/features\/202604-my-prd$/);
  });

  test("enhancedMd is {featureDir}/enhanced.md", () => {
    const p = enhancedMd("dataAssets", "202604", "my-prd");
    expect(p).toMatch(/my-prd\/enhanced\.md$/);
  });

  test("sourceFactsJson is {featureDir}/source-facts.json", () => {
    expect(sourceFactsJson("dataAssets", "202604", "my-prd")).toMatch(
      /my-prd\/source-facts\.json$/,
    );
  });

  test("resolvedMd is {featureDir}/resolved.md", () => {
    expect(resolvedMd("dataAssets", "202604", "my-prd")).toMatch(/my-prd\/resolved\.md$/);
  });

  test("prdImagesDir is {featureDir}/images/", () => {
    expect(prdImagesDir("dataAssets", "202604", "my-prd")).toMatch(/my-prd\/images$/);
  });

  test("originalPrdMd is {featureDir}/prd.md (v3 redirect, renamed original.md -> prd.md)", () => {
    expect(originalPrdMd("dataAssets", "202604", "my-prd")).toMatch(/my-prd\/prd\.md$/);
  });
});
