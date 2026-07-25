import { describe, expect, it } from "bun:test";
import { todayStr, uniqueName } from "../../../lib/playwright/utils.ts";

describe("uniqueName", () => {
  it("returns string starting with prefix", () => {
    const name = uniqueName("test");
    expect(name.startsWith("test_")).toBe(true);
  });

  it("appends a numeric timestamp after prefix", () => {
    const name = uniqueName("page");
    const suffix = name.slice("page_".length);
    expect(suffix).toMatch(/^\d+$/);
    expect(Number.isNaN(Number(suffix))).toBe(false);
  });

  it("prefixes differ when prefix differs", () => {
    const a = uniqueName("foo");
    const b = uniqueName("bar");
    expect(a.startsWith("foo_")).toBe(true);
    expect(b.startsWith("bar_")).toBe(true);
  });

  it("handles empty prefix", () => {
    const name = uniqueName("");
    expect(name.startsWith("_")).toBe(true);
  });
});

describe("todayStr", () => {
  it("returns 8-digit date string", () => {
    const str = todayStr();
    expect(str).toMatch(/^\d{8}$/);
  });

  it("matches current date in YYYYMMDD format", () => {
    const expected = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    expect(todayStr()).toBe(expected);
  });
});
