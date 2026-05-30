import { describe, it, expect } from "bun:test";

describe("with msg", () => {
  it("Pattern A with message", () => {
    expect(Array.isArray(results).toBeTruthy(), "result should be an array");
    expect(
      out.module_prd_section.includes("## 商品管理").toBeTruthy(),
      "should include the module heading",
    );
  });
});
