import { describe, expect, it } from "bun:test";
import {
  loadFeatureManifestValidator,
  loadFeatureMetadataValidator,
  loadHandoffV2Validator,
  loadSourceRefRegistryValidator,
} from "@shared/schemas/loaders.ts";

describe("schema loaders", () => {
  it("loads FeatureMetadata validator", () => {
    const v = loadFeatureMetadataValidator();
    expect(typeof v).toBe("function");
  });

  it("loads FeatureManifest validator", () => {
    expect(typeof loadFeatureManifestValidator()).toBe("function");
  });

  it("loads Handoff v2 validator", () => {
    expect(typeof loadHandoffV2Validator()).toBe("function");
  });

  it("loads SourceRefRegistry validator", () => {
    expect(typeof loadSourceRefRegistryValidator()).toBe("function");
  });
});
