import { describe, it, expect } from "bun:test";

describe("not with msg", () => {
  it("not.toBe string msg", () => {
    expect(x).not.toBe(0, "expected non-zero");
  });
  it("not.toEqual template msg", () => {
    expect(obj).not.toEqual({ a: 1 }, `unexpected: ${JSON.stringify(obj)}`);
  });
  it("not.toBe single quote", () => {
    expect(y).not.toBe(null, "should not be null");
  });
  it("no msg untouched", () => {
    expect(a).not.toBe(b);
    expect(c).not.toEqual(d);
  });
});
