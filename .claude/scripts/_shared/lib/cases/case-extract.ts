import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArchiveBody, parseFrontMatter } from "@shared/cli/xmind-gen/archive.ts";
import type { CaseRecord } from "./verify-layers.ts";

export interface CaseEvidenceRow {
  schema_ref: "CaseEvidenceMap@1";
  case_id: string;
  case_title: string;
  requirement_atom_ids: string[];
  coverage_matrix_ids: string[];
}

export function readCaseEvidenceMap(featureDir: string): CaseEvidenceRow[] {
  const path = join(featureDir, ".process", "case-evidence-map.json");
  if (!existsSync(path)) return [];
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8"));
    return Array.isArray(parsed) ? (parsed as CaseEvidenceRow[]) : [];
  } catch {
    return [];
  }
}

/** Parse the canonical H2/H3/H4/H5 Archive format and join traceability by case_id. */
export function extractCaseRecords(featureDir: string): CaseRecord[] {
  const archivePath = existsSync(join(featureDir, "cases", "archive.md"))
    ? join(featureDir, "cases", "archive.md")
    : join(featureDir, "archive.md");
  if (!existsSync(archivePath)) return [];

  const { body } = parseFrontMatter(readFileSync(archivePath, "utf-8"));
  const evidenceById = new Map(readCaseEvidenceMap(featureDir).map((row) => [row.case_id, row]));
  const records: CaseRecord[] = [];

  for (const module of parseArchiveBody(body)) {
    for (const page of module.pages) {
      const cases = [
        ...(page.sub_groups ?? []).flatMap((group) => group.test_cases),
        ...(page.test_cases ?? []),
      ];
      for (const testCase of cases) {
        const caseId = testCase.case_id ?? `C${records.length + 1}`;
        const evidence = evidenceById.get(caseId);
        records.push({
          case_id: caseId,
          case_id_explicit: testCase.case_id !== undefined,
          requirement_atom_ids: evidence?.requirement_atom_ids ?? [],
          steps: testCase.steps.map((step) => step.step),
          expected: testCase.steps.map((step) => step.expected).join("\n"),
          title: testCase.title,
        });
      }
    }
  }
  return records;
}
