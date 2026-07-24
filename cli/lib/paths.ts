import { join } from "node:path";
import { locateProject, locateProjectRoot } from "./workspace-locator.ts";

/** Alias of locateProjectRoot for report renderers that need the repo root. */
export const repoRoot = locateProjectRoot;

/** Return current year-month as YYYYMM (for analyses/scan dir naming). */
export function currentYYYYMM(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

/** Diff-scan analysis dir: workspace/<project>/analyses/scan-<yyyymm>-<slug>. */
export function auditDir(project: string, yyyymm: string, slug: string): string {
  return join(locateProject(project).analysesDir, `scan-${yyyymm}-${slug}`);
}

/** Join segments under a diff-scan analysis dir. */
export function auditFile(project: string, yyyymm: string, slug: string, ...segments: string[]): string {
  return join(auditDir(project, yyyymm, slug), ...segments);
}

/** Defect analysis dir: workspace/<project>/analyses/bug-<yyyymm>-<slug>. */
export function defectDir(project: string, yyyymm: string, slug: string): string {
  return join(locateProject(project).analysesDir, `bug-${yyyymm}-${slug}`);
}

/** PRD history dir: workspace/<project>/features/_history/prds (lanhu fetch landing zone). */
export function prdsDir(project: string): string {
  return join(locateProject(project).featuresDir, "_history", "prds");
}
