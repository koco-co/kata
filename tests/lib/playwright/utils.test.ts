import { describe, expect, it } from "bun:test";
import { todayStr, uniqueName } from "../../../runtime/automation/playwright/utils.ts";

describe("uniqueName", () => {
  it("returns string starting with prefix", () => {
    const name = uniqueName("test");
    expect(name.startsWith("test_")).toBe(true);
  });

  it("appends a numeric timestamp and a random suffix after prefix", () => {
    const name = uniqueName("page");
    const suffix = name.slice("page_".length);
    expect(suffix).toMatch(/^\d+_[a-z0-9]+$/);
  });

  it("generates distinct names on back-to-back calls (no same-ms collision)", () => {
    const a = uniqueName("page");
    const b = uniqueName("page");
    expect(a).not.toBe(b);
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
    const str = todayStr(new Date(2026, 3, 16));
    expect(str).toMatch(/^\d{8}$/);
  });

  it("formats the injected local date as YYYYMMDD", () => {
    // 2026-04-16 本地时间；期望硬编码，不复用被测公式
    expect(todayStr(new Date(2026, 3, 16, 12, 30))).toBe("20260416");
  });

  it("zero-pads single-digit month and day", () => {
    expect(todayStr(new Date(2026, 0, 5))).toBe("20260105");
    expect(todayStr(new Date(2026, 11, 31))).toBe("20261231");
  });

  it("uses the local date, not the UTC date (late-night boundary)", () => {
    // 本地 2026-04-16 00:30；UTC 仍是 2026-04-15（UTC+8 下），toISOString 会给错日期
    expect(todayStr(new Date(2026, 3, 16, 0, 30))).toBe("20260416");
  });
});
