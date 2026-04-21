import { describe, it, expect } from "bun:test";

describe("standalone", () => {
  it("bare expression", () => {
    expect(result.includes("x")).toBeTruthy();
    expect(!result.includes("y")).toBeTruthy();
  });
});
