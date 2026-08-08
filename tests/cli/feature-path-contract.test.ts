import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCasesYaml } from "../../cli/lib/cases/parse.ts";
import {
  featureIdentity,
  listFeatureDirs,
  parseFeatureDirName,
} from "../../cli/lib/features-layout.ts";

const workspace = join(import.meta.dir, "../../workspace");

describe("feature path repository contract", () => {
  it("keeps immutable feature identities separate from canonical paths", () => {
    const entries = ["dataAssets", "batchWorks"].flatMap((project) => {
      const features = join(workspace, project, "features");
      return listFeatureDirs(features).map((entry) => ({ project, features, entry }));
    });
    expect(entries.length).toBeGreaterThan(0);
    const identityOwners = new Map<string, string>();

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
        const location = `${project}:${identity.relativePath}/cases/${name}`;
        expect(text, location).not.toMatch(/^ {2}version:/m);
        const featureId = parseCasesYaml(text).meta.feature_id;
        expect(featureId, location).toMatch(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
        if (!featureId) continue;
        const scopedFeatureId = `${project}/${featureId}`;
        const owner = identityOwners.get(scopedFeatureId);
        expect(owner === undefined || owner === identity.featureKey, location).toBe(true);
        identityOwners.set(scopedFeatureId, identity.featureKey);
      }
    }
    expect(identityOwners.size).toBeGreaterThan(0);
  });
});
