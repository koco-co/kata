import { describe, expect, it } from "bun:test";
import {
  featureDir,
  featuresRoot,
  kataRoot,
  resultsDir,
  sharedRoot,
} from "../../src/features/paths.ts";

describe("feature paths", () => {
  it("computes featuresRoot under project", () => {
    expect(featuresRoot("dataAssets")).toMatch(/workspace\/dataAssets\/features$/);
  });
  it("computes featureDir for slug", () => {
    expect(featureDir("dataAssets", "2026-04-x")).toMatch(/features\/2026-04-x$/);
  });
  it("computes sharedRoot", () => {
    expect(sharedRoot("dataAssets")).toMatch(/workspace\/dataAssets\/_shared$/);
  });
  it("computes kata root", () => {
    expect(kataRoot()).toMatch(/\.kata$/);
  });
  it("computes resultsDir for run", () => {
    expect(resultsDir("dataAssets", "2026-04-x", "20260510-1430-a3f8c9e1")).toMatch(
      /features\/2026-04-x\/results\/20260510-1430-a3f8c9e1$/,
    );
  });
});
