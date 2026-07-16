import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractCaseRecords } from "@shared/lib/cases/case-extract.ts";

describe("extractCaseRecords", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "kata-extract-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("returns empty for no archive.md", () => {
    expect(extractCaseRecords(dir)).toEqual([]);
  });

  it("parses H5 Archive cases and joins traceability outside the human-readable body", () => {
    mkdirSync(join(dir, "cases"), { recursive: true });
    mkdirSync(join(dir, ".process"), { recursive: true });
    writeFileSync(
      join(dir, "cases", "archive.md"),
      [
        "---",
        'suite_name: "Login"',
        'create_at: "2026-07-16"',
        'status: "草稿"',
        "case_count: 2",
        "---",
        "## Account",
        "### Login",
        "<!-- case_id: C-LOGIN -->",
        "##### 【P0】Login succeeds",
        "> 用例步骤",
        "| 编号 | 步骤 | 预期 |",
        "| --- | --- | --- |",
        "| 1 | click login | page loads |",
        "<!-- case_id: C-DASHBOARD -->",
        "##### 【P1】Dashboard loads",
        "> 用例步骤",
        "| 编号 | 步骤 | 预期 |",
        "| --- | --- | --- |",
        "| 1 | open dashboard | widgets visible |",
      ].join("\n"),
    );
    writeFileSync(
      join(dir, ".process", "case-evidence-map.json"),
      JSON.stringify([
        {
          schema_ref: "CaseEvidenceMap@1",
          case_id: "C-LOGIN",
          case_title: "【P0】Login succeeds",
          requirement_atom_ids: ["RA-1"],
          coverage_matrix_ids: ["CM-1"],
        },
        {
          schema_ref: "CaseEvidenceMap@1",
          case_id: "C-DASHBOARD",
          case_title: "【P1】Dashboard loads",
          requirement_atom_ids: ["RA-2"],
          coverage_matrix_ids: ["CM-2"],
        },
      ]),
    );

    const cases = extractCaseRecords(dir);
    expect(cases).toHaveLength(2);
    expect(cases[0]).toEqual({
      case_id: "C-LOGIN",
      case_id_explicit: true,
      requirement_atom_ids: ["RA-1"],
      steps: ["click login"],
      expected: "page loads",
      title: "【P0】Login succeeds",
    });
    expect(cases[1].case_id).toBe("C-DASHBOARD");
  });

  it("does not misclassify H2/H3 module headings as cases", () => {
    writeFileSync(
      join(dir, "archive.md"),
      "## Module\n### Page\n<!-- case_id: C1 -->\n##### 【P1】Case\n",
    );
    expect(extractCaseRecords(dir)).toHaveLength(1);
  });
});
