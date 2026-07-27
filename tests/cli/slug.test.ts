import { describe, expect, it } from "bun:test";
import { sanitizeSlug } from "../../cli/lib/slug.ts";

describe("sanitizeSlug", () => {
  it("converts CJK to pinyin", () => {
    expect(sanitizeSlug("数据质量")).toBe("shu-ju-zhi-liang");
  });

  it("falls back to a deterministic hash when the ASCII projection is empty", () => {
    const slug = sanitizeSlug("㐀㐁");
    expect(slug).toMatch(/^slug-[0-9a-f]{8}$/);
    expect(sanitizeSlug("㐀㐁")).toBe(slug); // 确定性
    expect(sanitizeSlug("㐀㐂")).not.toBe(slug); // 输入可区分
  });

  it("falls back for symbol-only input", () => {
    expect(sanitizeSlug("②")).toMatch(/^slug-[0-9a-f]{8}$/);
    expect(sanitizeSlug("")).toMatch(/^slug-[0-9a-f]{8}$/);
  });

  it("keeps normal projections untouched", () => {
    expect(sanitizeSlug("Login Page")).toBe("login-page");
    expect(sanitizeSlug("【v6411】【客户】登录改造")).toBe("deng-lu-gai-zao");
  });
});
