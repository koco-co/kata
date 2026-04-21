import { describe, expect, it } from "bun:test";
import { resolveTestCaseSource } from "../../src/test-case-flow/source-resolver";

describe("Lanhu replay fixture", () => {
  it("resolves as fixture source kind", () => {
    const source = resolveTestCaseSource("engine/tests/fixtures/lanhu/sample/source-snapshot.json");
    expect(source.kind).toBe("fixture");
    expect(source.requiresLocalPrd).toBe(false);
  });
});
