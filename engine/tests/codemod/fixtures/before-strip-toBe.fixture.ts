import { describe, it, expect } from "bun:test";

describe("toBe with msg", () => {
  it("string msg", () => {
    expect(code).toBe(0, "expected exit 0");
  });
  it("template msg", () => {
    expect(code).toBe(0, `expected exit 0, got: ${stderr}`);
  });
  it("single quote", () => {
    expect(x).toBe(1, "msg");
  });
  it("no msg untouched", () => {
    expect(a).toBe(b);
  });
  it("multi-line", () => {
    expect(r.status).toBe(
      0,
      `stderr=${r.stderr}
stdout=${r.stdout}`,
    );
  });
});
