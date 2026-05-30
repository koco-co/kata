import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  fixStandaloneTruthy,
  fixTruthyCorruption,
} from "@shared/lib/codemod/fix-truthy-corruption.ts";

const FIX = join(import.meta.dirname, "fixtures");

function pair(name: string, _variant: "expect" | "standalone" = "expect"): [string, string] {
  return [
    readFileSync(join(FIX, `before-truthy-${name}.fixture.ts`), "utf8"),
    readFileSync(join(FIX, `after-truthy-${name}.fixture.ts`), "utf8"),
  ];
}

describe("fixTruthyCorruption", () => {
  for (const name of ["include", "startswith", "endswith", "regex", "nested", "safe", "withmgs"]) {
    it(`fixes ${name}`, () => {
      const [b, a] = pair(name);
      expect(fixTruthyCorruption(b)).toBe(a);
    });
  }
});

describe("fixStandaloneTruthy", () => {
  it("wraps bare .toBeTruthy() with expect()", () => {
    const [b, a] = pair("standalone");
    expect(fixStandaloneTruthy(b)).toBe(a);
  });
});
