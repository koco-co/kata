import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { auditDir, auditFile } from "./paths.ts";
import {
  type AuditMeta,
  type Bug,
  SCAN_REPORT_SCHEMA_VERSION,
  type ScanReport,
} from "./scan-report-types.ts";
import { validateBug } from "./scan-report-validate.ts";

function ensureParent(p: string): void {
  const d = dirname(p);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function writeJson(path: string, value: unknown): void {
  ensureParent(path);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function metaPath(project: string, ym: string, slug: string): string {
  return auditFile(project, ym, slug, "meta.json");
}

function reportPath(project: string, ym: string, slug: string): string {
  return auditFile(project, ym, slug, "report.json");
}

export function initAudit(project: string, ym: string, slug: string, meta: AuditMeta): void {
  const dir = auditDir(project, ym, slug);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  if (existsSync(metaPath(project, ym, slug))) {
    throw new Error(`audit already exists at ${dir}`);
  }

  writeJson(metaPath(project, ym, slug), meta);
  const empty: ScanReport = {
    schema_version: SCAN_REPORT_SCHEMA_VERSION,
    meta_ref: "./meta.json",
    bugs: [],
  };
  writeJson(reportPath(project, ym, slug), empty);
}

export function readMeta(project: string, ym: string, slug: string): AuditMeta {
  return readJson<AuditMeta>(metaPath(project, ym, slug));
}

export function readReport(project: string, ym: string, slug: string): ScanReport {
  return readJson<ScanReport>(reportPath(project, ym, slug));
}

export function setMeta<K extends keyof AuditMeta>(
  project: string,
  ym: string,
  slug: string,
  field: K,
  value: AuditMeta[K],
): void {
  const m = readMeta(project, ym, slug);
  m[field] = value;
  writeJson(metaPath(project, ym, slug), m);
}

export function nextBugId(project: string, ym: string, slug: string): string {
  const r = readReport(project, ym, slug);
  let max = 0;
  for (const b of r.bugs) {
    const m = b.id.match(/^b-(\d+)$/);
    if (m) {
      const n = Number.parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `b-${String(max + 1).padStart(3, "0")}`;
}

export function addBug(project: string, ym: string, slug: string, bug: Bug): void {
  const v = validateBug(bug);
  if (!v.ok) throw new Error(`invalid bug: ${v.errors.join("; ")}`);

  const r = readReport(project, ym, slug);
  if (r.bugs.some((b) => b.id === bug.id)) {
    throw new Error(`bug id ${bug.id} already exists`);
  }
  const next: ScanReport = { ...r, bugs: [...r.bugs, bug] };
  writeJson(reportPath(project, ym, slug), next);
}

function setNested(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (typeof cur[k] !== "object" || cur[k] === null || Array.isArray(cur[k])) {
      throw new Error(`cannot descend into "${parts.slice(0, i + 1).join(".")}"`);
    }
    cur = cur[k] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

export function updateBugField(
  project: string,
  ym: string,
  slug: string,
  bugId: string,
  fieldPath: string,
  value: unknown,
): void {
  const r = readReport(project, ym, slug);
  const idx = r.bugs.findIndex((b) => b.id === bugId);
  if (idx === -1) throw new Error(`bug ${bugId} not found`);

  const updated: Bug = JSON.parse(JSON.stringify(r.bugs[idx])) as Bug;
  setNested(updated as unknown as Record<string, unknown>, fieldPath, value);

  const v = validateBug(updated);
  if (!v.ok) throw new Error(`invalid bug after update: ${v.errors.join("; ")}`);

  const nextBugs = [...r.bugs];
  nextBugs[idx] = updated;
  writeJson(reportPath(project, ym, slug), { ...r, bugs: nextBugs });
}

export function updateBugSteps(
  project: string,
  ym: string,
  slug: string,
  bugId: string,
  steps: string[],
): void {
  updateBugField(project, ym, slug, bugId, "reproduction_steps", steps);
}

export function removeBug(project: string, ym: string, slug: string, bugId: string): void {
  const r = readReport(project, ym, slug);
  const next = r.bugs.filter((b) => b.id !== bugId);
  writeJson(reportPath(project, ym, slug), { ...r, bugs: next });
}
