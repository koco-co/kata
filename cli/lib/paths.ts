import { join } from "node:path";
import { isValidSlug } from "./slug.ts";
import { locateProject, locateProjectRoot } from "./workspace-locator.ts";

/** Alias of locateProjectRoot for report renderers that need the repo root. */
export const repoRoot = locateProjectRoot;

export class ReportPathError extends Error {
  code: "INVALID_REPORT_SLUG" | "INVALID_YYYYMM";
  constructor(code: "INVALID_REPORT_SLUG" | "INVALID_YYYYMM", msg: string) {
    super(msg);
    this.code = code;
  }
}

/** Assert a report slug is lowercase kebab-case; throws ReportPathError otherwise. */
export function assertReportSlug(slug: string): void {
  if (!isValidSlug(slug)) {
    throw new ReportPathError(
      "INVALID_REPORT_SLUG",
      `kata: 非法报告 slug "${slug}"(须为小写 kebab-case)`,
    );
  }
}

/** Assert a YYYYMM year-month with a valid calendar month; throws ReportPathError otherwise. */
export function assertYyyymm(v: string): void {
  if (!/^\d{4}(0[1-9]|1[0-2])$/.test(v)) {
    throw new ReportPathError("INVALID_YYYYMM", `kata: 非法年月 "${v}"(须为 YYYYMM)`);
  }
}

/** Return current year-month as YYYYMM in the local timezone (for analyses/scan dir naming). */
export function currentYYYYMM(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

export function auditReportPath(project: string, yyyymm: string, slug: string): string {
  assertYyyymm(yyyymm);
  assertReportSlug(slug);
  return join(locateProject(project).analysesDir, "scan-report", yyyymm, `${slug}.md`);
}

export function infraReportPath(project: string, yyyymm: string, slug: string): string {
  assertYyyymm(yyyymm);
  assertReportSlug(slug);
  return join(locateProject(project).analysesDir, "infra-report", yyyymm, `${slug}.md`);
}

/** Internal defect evidence directory; formal reports use analyses/<type>-report/<yyyymm>/<slug>.md. */
export function defectDir(project: string, yyyymm: string, slug: string): string {
  return join(locateProject(project).analysesDir, "bug-report", yyyymm, `${slug}.data`);
}

export function defectReportPath(
  project: string,
  type: "bug" | "conflict" | "scan",
  yyyymm: string,
  slug: string,
): string {
  assertYyyymm(yyyymm);
  assertReportSlug(slug);
  return join(locateProject(project).analysesDir, `${type}-report`, yyyymm, `${slug}.md`);
}

/** PRD history dir: workspace/<project>/features/_history/prds (lanhu fetch landing zone). */
export function prdsDir(project: string): string {
  return join(locateProject(project).featuresDir, "_history", "prds");
}
