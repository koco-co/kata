import { describe, expect, it } from "bun:test";
import { buildFeatureId, isValidSlug, sanitizeSlug } from "@shared/lib/features/slug.ts";

describe("slug utilities", () => {
  it("validates ascii kebab-case slug", () => {
    expect(isValidSlug("dq-json-config")).toBe(true);
    expect(isValidSlug("Dq-Json")).toBe(false);
    expect(isValidSlug("dq_json")).toBe(false);
    expect(isValidSlug("dq--json")).toBe(false);
    expect(isValidSlug("中文")).toBe(false);
  });

  it("builds full feature id with YYYY-MM prefix", () => {
    expect(buildFeatureId("2026-04", "dq-json-config")).toBe("2026-04-dq-json-config");
  });

  it("sanitizes free text into a candidate slug", () => {
    expect(sanitizeSlug("【通用配置】json 格式配置")).toBe("json-ge-shi-pei-zhi");
  });
});
