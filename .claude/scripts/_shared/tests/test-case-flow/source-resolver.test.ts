import { describe, expect, it } from "bun:test";
import { resolveTestCaseSource } from "@skills/case-draft/scripts/test-case-flow/source-resolver.ts";

describe("resolveTestCaseSource", () => {
  it("treats Lanhu URLs as PRD design sources", () => {
    const source = resolveTestCaseSource(
      "https://lanhuapp.com/web/#/item/project/product?tid=t&pid=p&docId=d",
    );
    expect(source.kind).toBe("lanhu_url");
    expect(source.requiresLocalPrd).toBe(false);
  });

  it("treats markdown files as PRD files", () => {
    const source = resolveTestCaseSource("workspace/demo/features/2026-05-sample/prd.md");
    expect(source.kind).toBe("prd_file");
  });

  it("rejects empty sources", () => {
    expect(() => resolveTestCaseSource("")).toThrow("test-case-flow.source.empty");
  });
});
