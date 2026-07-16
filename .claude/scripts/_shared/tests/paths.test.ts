import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  auditDir,
  auditFile,
  enhancedMd,
  featureDir,
  repoRoot,
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
