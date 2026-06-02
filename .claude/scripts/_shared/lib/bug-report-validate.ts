import { SEVERITIES } from "./scan-report-types.ts";
import type { BugReport, ConflictReport } from "./bug-report-types.ts";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

/** Validate and narrowcast an unknown value to BugReport. Throws on missing render-critical fields. */
export function validateBugReport(input: unknown): BugReport {
  if (typeof input !== "object" || input === null) {
    throw new Error("invalid bug report: not an object");
  }
  const r = input as Record<string, unknown>;
  if (!isNonEmptyString(r.title)) throw new Error("invalid bug report: title required");
  if (!isNonEmptyString(r.summary)) throw new Error("invalid bug report: summary required");
  if (!isNonEmptyString(r.problem_type)) throw new Error("invalid bug report: problem_type required");
  if (typeof r.severity !== "string" || !SEVERITIES.includes(r.severity as never)) {
    throw new Error(`invalid bug report: severity must be one of ${SEVERITIES.join("|")}`);
  }
  return input as BugReport;
}

/** Validate and narrowcast an unknown value to ConflictReport. Throws on missing render-critical fields. */
export function validateConflictReport(input: unknown): ConflictReport {
  if (typeof input !== "object" || input === null) {
    throw new Error("invalid conflict report: not an object");
  }
  const r = input as Record<string, unknown>;
  if (!isNonEmptyString(r.title)) throw new Error("invalid conflict report: title required");
  const summary = r.summary as Record<string, unknown> | undefined;
  if (!summary || typeof summary.total_conflicts !== "number") {
    throw new Error("invalid conflict report: summary.total_conflicts required");
  }
  if (!Array.isArray(r.conflicts)) {
    throw new Error("invalid conflict report: conflicts must be an array");
  }
  (r.conflicts as unknown[]).forEach((c, i) => {
    const cc = c as Record<string, unknown>;
    if (!isNonEmptyString(cc.id)) throw new Error(`invalid conflict report: conflicts[${i}].id required`);
    if (!isNonEmptyString(cc.file)) throw new Error(`invalid conflict report: conflicts[${i}].file required`);
    if (!isNonEmptyString(cc.type)) throw new Error(`invalid conflict report: conflicts[${i}].type required`);
    if (!isNonEmptyString(cc.description))
      throw new Error(`invalid conflict report: conflicts[${i}].description required`);
  });
  return input as ConflictReport;
}
