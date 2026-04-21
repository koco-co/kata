import { describe, it, expect } from "bun:test";

describe("toBe with msg", () => {
  it("string msg", () => {
    expect(code).toBe(0);
  });
  it("template msg", () => {
    expect(code).toBe(0);
  });
  it("single quote", () => {
    expect(x).toBe(1);
  });
  it("no msg untouched", () => {
    expect(a).toBe(b);
  });
  it("multi-line", () => {
    expect(r.status).toBe(0);
  });
});
