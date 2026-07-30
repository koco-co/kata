import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  featureIdentity,
  listFeatureDirs,
  parseFeatureDirName,
} from "../../cli/lib/features-layout.ts";

const workspace = join(import.meta.dir, "../../workspace");

describe("feature path repository contract", () => {
  it("uses canonical paths as the only feature identity", () => {
    const entries = ["dataAssets", "batchWorks"].flatMap((project) => {
      const features = join(workspace, project, "features");
      return listFeatureDirs(features).map((entry) => ({ project, features, entry }));
    });
    expect(entries).toHaveLength(66);

    for (const { project, features, entry } of entries) {
      const identity = featureIdentity(project, features, entry);
      expect(parseFeatureDirName(entry.dirName), identity.relativePath).toBeDefined();
      expect(identity.featureKey).toBe(`${project}:${identity.relativePath}`);
      expect(existsSync(join(entry.dir, "metadata.yaml")), identity.relativePath).toBe(false);
      expect(existsSync(join(entry.dir, "manifest.json")), identity.relativePath).toBe(false);

      const casesDir = join(entry.dir, "cases");
      if (!existsSync(casesDir)) continue;
      for (const name of readdirSync(casesDir).filter((file) => file.endsWith(".yaml"))) {
        const text = readFileSync(join(casesDir, name), "utf8");
        expect(text, `${identity.relativePath}/cases/${name}`).not.toMatch(
          /^ {2}(?:version|feature_id):/m,
        );
      }
    }
  });
});
