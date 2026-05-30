import { describe, expect, it } from "bun:test";
import { deriveSlugFromSource, hexFallbackSlug } from "@shared/lib/features/slug.ts";

describe("deriveSlugFromSource", () => {
  it("derives a valid slug from a Lanhu pageId", () => {
    expect(deriveSlugFromSource({ kind: "lanhu", pageId: "7afabbf5e1c2" })).toBe("lanhu-7afabbf5");
  });
  it("derives a slug from a PRD filename", () => {
    expect(deriveSlugFromSource({ kind: "prd", filename: "15696_通用配置_json格式配置.txt" })).toBe(
      "15696-tong-yong-pei-zhi-json-ge",
    );
  });
  it("returns null when no usable source field", () => {
    expect(deriveSlugFromSource({ kind: "lanhu" })).toBeNull();
  });
});

describe("hexFallbackSlug", () => {
  it("builds an unresolved slug with module + 8 hex", () => {
    const s = hexFallbackSlug("dq", "any seed text");
    expect(s).toMatch(/^unresolved-dq-[a-f0-9]{8}$/);
  });
  it("is deterministic for the same seed", () => {
    expect(hexFallbackSlug("dq", "seed")).toBe(hexFallbackSlug("dq", "seed"));
  });
});
