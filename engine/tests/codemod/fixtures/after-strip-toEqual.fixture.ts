import { describe, it, expect } from "bun:test";

describe("toEqual with msg", () => {
  it("string msg", () => {
    expect(obj).toEqual({ a: 1 });
  });
  it("template msg", () => {
    expect(arr).toEqual([1, 2]);
  });
  it("single quote", () => {
    expect(val).toEqual(42);
  });
  it("no msg untouched", () => {
    expect(a).toEqual(b);
  });
});
