import { describe, it, expect } from "bun:test";

describe("toMatch / toThrow with msg", () => {
  it("toMatch string msg", () => {
    expect(str).toMatch(/pattern/, "should match pattern");
  });
  it("toThrow template msg", () => {
    expect(fn).toThrow("Error", `expected fn to throw, got: ${result}`);
  });
  it("toMatch single quote", () => {
    expect(text).toMatch("hello", "should contain hello");
  });
  it("no msg untouched", () => {
    expect(str).toMatch(/pattern/);
    expect(fn).toThrow("Error");
  });
});
