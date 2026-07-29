/** Canonical case IDs and explicit Playwright file names stored in YAML. */
export const CASE_ID_RE = /^C\d{4}$/;
export const SPEC_FILE_RE = /^c\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*\.spec\.ts$/;

export function caseIdForIndex(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index >= 10_000) {
    throw new Error(`用例序号必须在 1 到 9999 之间: ${index + 1}`);
  }
  return `C${String(index + 1).padStart(4, "0")}`;
}
