import { describe, expect, it, test } from "bun:test";
import { join } from "node:path";
import {
  auditDir,
  auditFile,
  blocksDir,
  kataDir,
  legacyBackupDir,
  locksDir,
  repoRoot,
  sessionFilePath,
  sessionsDir,
} from "@shared/lib/paths.ts";

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

import {
  enhancedMd,
  featureDir,
  originalPrdMd,
  prdImagesDir,
  resolvedMd,
  sourceFactsJson,
} from "@shared/lib/paths.ts";

describe("enhanced doc paths", () => {
  test("featureDir returns {project}/features/{group}/{featureId}/", () => {
    const p = featureDir("dataAssets", "_standing", "202604-my-prd");
    expect(p).toMatch(/workspace\/dataAssets\/features\/_standing\/202604-my-prd$/);
  });

  test("featureDir with version layer dir", () => {
    const p = featureDir("dataAssets", "v6.4.10", "2026-04-my-prd");
    expect(p).toMatch(/workspace\/dataAssets\/features\/v6\.4\.10\/2026-04-my-prd$/);
  });

  test("enhancedMd is {featureDir}/enhanced.md (deprecated, defaults to _standing)", () => {
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

describe("audit paths", () => {
  test("auditDir resolves under workspace/{project}/_shared/archive/audits/{ym}-{slug}", () => {
    const dir = auditDir("dataAssets", "202604", "release_6_3_x__release_6_3_0_dev");
    expect(dir).toBe(
      join(
        repoRoot(),
        "workspace",
        "dataAssets",
        "_shared",
        "archive",
        "audits",
        "202604-release_6_3_x__release_6_3_0_dev",
      ),
    );
  });

  test("auditFile joins additional segments", () => {
    const file = auditFile("dataAssets", "202604", "slug", "report.json");
    expect(file.endsWith("audits/202604-slug/report.json")).toBe(true);
  });
});
