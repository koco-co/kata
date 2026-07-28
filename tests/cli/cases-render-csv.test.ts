import { describe, expect, it } from "bun:test";
import { renderCsv } from "../../cli/lib/cases/render-csv.ts";
import type { CasesFile } from "../../cli/lib/cases/types.ts";

function file(cases: CasesFile["cases"]): CasesFile {
  return { meta: { title: "需求名", version: "v1", feature_id: "g/f" }, cases };
}

describe("renderCsv", () => {
  it("prefixes a BOM so Excel opens Chinese text correctly", () => {
    const csv = renderCsv(file([{ id: "C0001", title: "用例一", priority: "P0", steps: [] }]));
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("用例编号");
  });

  it("quotes fields containing commas, quotes and newlines", () => {
    const csv = renderCsv(
      file([
        {
          id: "C0001",
          title: 'a,"b"',
          priority: "P0",
          steps: [{ action: "x\ny", expected: "e" }],
        },
      ]),
    );
    expect(csv).toContain('"a,""b"""');
    expect(csv).toContain('"1. x\ny"');
  });
});
