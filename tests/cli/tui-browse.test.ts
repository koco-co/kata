import { describe, expect, test } from "bun:test";
import { browseProjectFeature, type FeatureBrowseMenus } from "../../cli/lib/tui/browse.ts";
import type { FeatureRef } from "../../cli/lib/tui/types.ts";

const feature: FeatureRef = {
  project: "dataAssets",
  relativePath: "v7.0.0/【15911】",
  featureDir: "/tmp/feature",
  featureKey: "key-15911",
  title: "资产定制化代码剥离",
  version: "v7.0.0",
  module: "数据资产",
};

describe("TUI feature browse back navigation", () => {
  test("returns from feature menu to feature, then version, then project", async () => {
    const calls: string[] = [];
    let projectCalls = 0;
    let versionCalls = 0;
    let featureCalls = 0;
    const menus: FeatureBrowseMenus = {
      async pickProject() {
        calls.push("pickProject");
        projectCalls += 1;
        return projectCalls === 1 ? "dataAssets" : undefined;
      },
      async pickVersion(project) {
        calls.push(`pickVersion:${project}`);
        versionCalls += 1;
        return versionCalls === 1 ? "v7.0.0" : undefined;
      },
      async pickFeature(project, version) {
        calls.push(`pickFeature:${project}:${version}`);
        featureCalls += 1;
        return featureCalls === 1 ? feature : undefined;
      },
      async openFeature(ref) {
        calls.push(`openFeature:${ref.featureKey}`);
      },
    };

    await browseProjectFeature(menus);

    expect(calls).toEqual([
      "pickProject",
      "pickVersion:dataAssets",
      "pickFeature:dataAssets:v7.0.0",
      "openFeature:key-15911",
      "pickFeature:dataAssets:v7.0.0",
      "pickVersion:dataAssets",
      "pickProject",
    ]);
  });
});
