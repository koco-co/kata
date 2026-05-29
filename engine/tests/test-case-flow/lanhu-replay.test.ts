import { describe, expect, it } from "bun:test";
import { resolveTestCaseSource } from "@skills/case-draft/scripts/test-case-flow/source-resolver.ts";

describe("Lanhu replay fixture", () => {
  it("resolves as fixture source kind", () => {
    const source = resolveTestCaseSource("engine/tests/fixtures/lanhu/sample/source-snapshot.json");
    expect(source.kind).toBe("fixture");
    expect(source.requiresLocalPrd).toBe(false);
  });
});
