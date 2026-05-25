import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractCaseRecords } from "../../src/cases/case-extract.ts";

describe("extractCaseRecords", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "kata-extract-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("returns empty for no archive.md", () => {
    expect(extractCaseRecords(dir)).toEqual([]);
  });

  it("parses cases with traceability tags", () => {
    writeFileSync(
      join(dir, "archive.md"),
      [
        "# Cases",
        "## Login [RA-1]",
        "- step: click login / expected: page loads",
        "## Dashboard [RA-1, RA-2]",
        "- step: view dashboard / expected: widgets visible",
      ].join("\n"),
    );
    const cases = extractCaseRecords(dir);
    expect(cases).toHaveLength(2);
    expect(cases[0].case_id).toBe("C1");
    expect(cases[0].requirement_atom_ids).toEqual(["RA-1"]);
    expect(cases[0].steps).toEqual(["click login"]);
    expect(cases[0].expected).toBe("page loads");
    expect(cases[1].requirement_atom_ids).toEqual(["RA-1", "RA-2"]);
  });

  it("handles cases without tags", () => {
    writeFileSync(join(dir, "archive.md"), "# Cases\n## Plain Case\n- step: do / expected: ok\n");
    const cases = extractCaseRecords(dir);
    expect(cases[0].requirement_atom_ids).toEqual([]);
  });
});
