import { describe, it, expect } from "bun:test";

describe("toEqual with msg", () => {
  it("string msg", () => {
    expect(obj).toEqual({ a: 1 }, "object mismatch");
  });
  it("template msg", () => {
    expect(arr).toEqual([1, 2], `length=${arr.length}`);
  });
  it("single quote", () => {
    expect(val).toEqual(42, "should be 42");
  });
  it("no msg untouched", () => {
    expect(a).toEqual(b);
  });
});
