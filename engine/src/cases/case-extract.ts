import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CaseRecord } from "./verify-layers.ts";

/**
 * Parse CaseRecord[] from a feature directory's archive.md.
 * Expects format:
 *   ## Case Title [RA-1,RA-2]
 *   - step: do X / expected: Y
 */
export function extractCaseRecords(featureDir: string): CaseRecord[] {
  const archivePath = join(featureDir, "archive.md");
  if (!existsSync(archivePath)) return [];
  const md = readFileSync(archivePath, "utf-8");
  const cases: CaseRecord[] = [];
  let current: CaseRecord | null = null;
  for (const line of md.split("\n")) {
    const headingMatch = line.match(/^#{2,3}\s+(.+)$/);
    if (headingMatch) {
      if (current) cases.push(current);
      const title = headingMatch[1].trim();
      const tagMatch = title.match(/\[([A-Za-z0-9,\-\s]+)\]$/);
      const atomIds = tagMatch ? tagMatch[1].split(",").map((s) => s.trim()) : [];
      const cleanTitle = tagMatch ? title.slice(0, tagMatch.index!).trim() : title;
      current = { case_id: `C${cases.length + 1}`, requirement_atom_ids: atomIds, steps: [], expected: "", title: cleanTitle };
      continue;
    }
    if (current && line.trim().startsWith("- step:")) {
      const parts = line.split("/ expected:");
      current.steps.push(parts[0].replace("- step:", "").trim());
      if (parts[1]) current.expected = parts[1].trim();
      continue;
    }
  }
  if (current) cases.push(current);
  return cases;
}
