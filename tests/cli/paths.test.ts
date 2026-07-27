import { describe, expect, it } from "bun:test";
import {
  assertReportSlug,
  assertYyyymm,
  currentYYYYMM,
  type ReportPathError,
} from "../../cli/lib/paths.ts";

function codeOf(fn: () => void): string | undefined {
  try {
    fn();
  } catch (err) {
    return (err as ReportPathError).code;
  }
  return undefined;
}

describe("report path guards", () => {
  it("renders currentYYYYMM in the local timezone", () => {
    const now = new Date("2026-01-31T16:30:00Z");
    const expected = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    expect(currentYYYYMM(now)).toBe(expected);
  });

  it("accepts valid slug and yyyymm", () => {
    expect(codeOf(() => assertReportSlug("ci63-baseline-2026"))).toBeUndefined();
    expect(codeOf(() => assertReportSlug("a1"))).toBeUndefined();
    expect(codeOf(() => assertYyyymm("202607"))).toBeUndefined();
    expect(codeOf(() => assertYyyymm("209912"))).toBeUndefined();
  });

  it("rejects invalid slugs with a coded error", () => {
    for (const bad of ["", "..", "A-b", "a b", "a/b", "-ab", "ab-", "a_b"]) {
      expect(codeOf(() => assertReportSlug(bad))).toBe("INVALID_REPORT_SLUG");
    }
  });

  it("rejects invalid yyyymm with a coded error", () => {
    for (const bad of ["", "20261", "202613", "202600", "2026-07", "abcdef", "2026071"]) {
      expect(codeOf(() => assertYyyymm(bad))).toBe("INVALID_YYYYMM");
    }
  });
});
