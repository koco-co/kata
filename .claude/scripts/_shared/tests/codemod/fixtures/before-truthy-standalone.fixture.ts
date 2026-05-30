import { describe, it, expect } from "bun:test";

describe("standalone", () => {
  it("bare expression", () => {
    result.includes("x").toBeTruthy();
    !result.includes("y").toBeTruthy();
  });
});
