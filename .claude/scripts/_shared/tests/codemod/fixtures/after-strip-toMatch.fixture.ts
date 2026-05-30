import { describe, it, expect } from "bun:test";

describe("toMatch / toThrow with msg", () => {
  it("toMatch string msg", () => {
    expect(str).toMatch(/pattern/);
  });
  it("toThrow template msg", () => {
    expect(fn).toThrow("Error");
  });
  it("toMatch single quote", () => {
    expect(text).toMatch("hello");
  });
  it("no msg untouched", () => {
    expect(str).toMatch(/pattern/);
    expect(fn).toThrow("Error");
  });
});
