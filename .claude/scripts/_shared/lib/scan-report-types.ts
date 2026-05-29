/**
 * Type contracts for diff-scan reports.
 * Source of truth: runtime SKILL.md files.
 */

export const SCAN_REPORT_SCHEMA_VERSION = "1.0" as const;

export type Severity = "critical" | "major" | "normal" | "minor";
export type BugType = "logic" | "data" | "ui" | "api" | "concurrency" | "state";

export const SEVERITIES: readonly Severity[] = ["critical", "major", "normal", "minor"];
export const BUG_TYPES: readonly BugType[] = ["logic", "data", "ui", "api", "concurrency", "state"];

export interface DiffStats {
  files: number;
  additions: number;
  deletions: number;
}

export interface AuditMeta {
  schema_version: typeof SCAN_REPORT_SCHEMA_VERSION;
  project: string;
  repo: string;
  base_branch: string;
  head_branch: string;
  base_commit: string;
  head_commit: string;
  scan_time: string; // ISO-8601
  reviewer: string | null;
  related_feature: string | null; // {ym}-{slug}
  diff_stats: DiffStats;
  summary: string;
}

export interface BugLocation {
  file: string;
  line: number;
  function?: string;
}

export interface RelatedCode {
  file: string;
  line: number;
  snippet: string;
}

export interface BugEvidence {
  diff_hunk: string;
  related_code?: RelatedCode[];
}

export interface Bug {
  id: string; // b-NNN
  title: string;
  severity: Severity;
  type: BugType;
  module: string;
  location: BugLocation;
  phenomenon: string;
  reproduction_steps: string[]; // length >= 3
  expected: string;
  actual: string;
  root_cause: string;
  evidence: BugEvidence;
  suggestion: string;
  confidence: number; // [0,1], strong-validated >= 0.6
  confidence_reason: string;
  tags?: string[];
}

export interface ScanReport {
  schema_version: typeof SCAN_REPORT_SCHEMA_VERSION;
  meta_ref: string; // "./meta.json"
  bugs: Bug[];
}
