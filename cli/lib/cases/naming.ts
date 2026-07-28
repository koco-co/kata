/** Canonical case and Playwright file names derived from YAML order and title. */
export const CASE_ID_RE = /^C\d{4}$/;
export const SPEC_FILE_RE = /^c\d{4}-[\p{Script=Han}A-Za-z0-9-]+\.ts$/u;

export function caseIdForIndex(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index >= 10_000) {
    throw new Error(`用例序号必须在 1 到 9999 之间: ${index + 1}`);
  }
  return `C${String(index + 1).padStart(4, "0")}`;
}

export function caseSlug(title: string): string {
  return title.replace(/[^\p{Script=Han}A-Za-z0-9-]/gu, "") || "case";
}

export function caseSpecFileForIndex(index: number, title: string): string {
  return `c${String(index + 1).padStart(4, "0")}-${caseSlug(title)}.ts`;
}
