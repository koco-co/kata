/** Stable canonical identities stored in authored YAML. */
export const CASE_ID_RE = /^C\d{4}$/;
export const FEATURE_ID_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function caseIdForIndex(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index >= 10_000) {
    throw new Error(`用例序号必须在 1 到 9999 之间: ${index + 1}`);
  }
  return `C${String(index + 1).padStart(4, "0")}`;
}
