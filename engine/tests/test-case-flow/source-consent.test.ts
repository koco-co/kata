import { describe, expect, it } from "bun:test";
import { createSourceConsent, grantSourceConsent } from "../../src/test-case-flow/source-consent";

describe("SourceConsent", () => {
  it("defaults to not granted", () => {
    expect(createSourceConsent().granted).toBe(false);
  });

  it("grants consent and records timestamp", () => {
    const consent = grantSourceConsent({ repoPaths: ["workspace/demo/.repos/studio"] });
    expect(consent.granted).toBe(true);
    expect(consent.granted_at).toBeDefined();
    expect(consent.reference_level).toBe("full");
  });

  it("skips repos reference when consent is none", () => {
    const consent = createSourceConsent({ reference_level: "none" });
    expect(consent.granted).toBe(false);
    expect(consent.repos).toEqual([]);
  });
});
