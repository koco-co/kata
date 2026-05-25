import { describe, expect, it } from "bun:test";
import { extractSourceFactSet, jaccard } from "../../src/cases/source-fact-set.ts";

const SHA = "a".repeat(64);
function manifest(refs: string[]) {
  return { case_drafting: { requirement_atoms: refs.map((r, i) => ({ id: `RA-${i}`, source_ref: r })) } };
}

describe("extractSourceFactSet", () => {
  it("normalizes a ref to kind:id (drops the hash)", () => {
    const set = extractSourceFactSet(manifest([`lanhu.fixture:form#sha256:${SHA}`]));
    expect([...set]).toEqual(["lanhu.fixture:form"]);
  });
});

describe("jaccard", () => {
  it("is 1 for identical sets", () => {
    expect(jaccard(new Set(["a", "b"]), new Set(["b", "a"]))).toBe(1);
  });
  it("is 0.5 for half overlap", () => {
    expect(jaccard(new Set(["a", "b"]), new Set(["a", "c"]))).toBeCloseTo(1 / 3, 5);
  });
});
