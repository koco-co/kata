/**
 * Shared severity and diff-stat types for Markdown-only defect-analyze scan reports.
 */

export const SCAN_REPORT_SCHEMA_VERSION = "1.0" as const;

export type Severity = "critical" | "major" | "normal" | "minor";

export const SEVERITIES: readonly Severity[] = ["critical", "major", "normal", "minor"];

export interface DiffStats {
  files: number;
  additions: number;
  deletions: number;
}
