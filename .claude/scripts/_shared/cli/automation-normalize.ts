import { existsSync, mkdirSync, readdirSync, renameSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

const RUNNERS_ALLOWED = new Set(["smoke.spec.ts", "full.spec.ts", "retry-failed.spec.ts"]);
const AUTOMATION_TOP_ALLOWED = new Set(["tests", ".DS_Store"]);

export interface NormalizeReport {
  moved: string[];
  unfixable: { path: string; reason: string }[];
  violations: number;
  backupDir: string;
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function listTopEntries(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir);
}

export function backupDir(featureDir: string): string {
  const ts = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15);
  return join(featureDir, "runs", `${ts}-normalized`);
}

function moveIntoBackup(source: string, target: string): void {
  mkdirSync(dirname(target), { recursive: true });
  renameSync(source, target);
}

export function normalizeAutomation(
  featureDir: string,
  opts: { dryRun?: boolean; apply?: boolean } = {},
): NormalizeReport {
  const shouldMove = opts.apply === true && opts.dryRun !== true;
  const backup = backupDir(featureDir);
  const report: NormalizeReport = { moved: [], unfixable: [], violations: 0, backupDir: backup };
  const automationDir = join(featureDir, "automation");
  const runnersDir = join(automationDir, "tests", "runners");

  if (existsSync(automationDir)) {
    for (const name of listTopEntries(automationDir)) {
      if (AUTOMATION_TOP_ALLOWED.has(name)) continue;
      const full = join(automationDir, name);
      if (isDir(full)) {
        report.unfixable.push({
          path: full,
          reason: `automation/ 顶层不应有子目录 "${name}"，请手动移除`,
        });
        report.violations++;
      } else if (/\.(md|json|yaml)$/.test(name)) {
        if (shouldMove) moveIntoBackup(full, join(backup, "automation", name));
        report.moved.push(full);
        report.violations++;
      } else {
        report.unfixable.push({
          path: full,
          reason: `automation/ 顶层不允许文件 "${name}"，请手动移除或移动到正确位置`,
        });
        report.violations++;
      }
    }
  }

  if (existsSync(runnersDir)) {
    for (const name of listTopEntries(runnersDir)) {
      if (!name.endsWith(".spec.ts")) continue;
      if (RUNNERS_ALLOWED.has(name)) continue;
      const full = join(runnersDir, name);
      if (shouldMove) moveIntoBackup(full, join(backup, "runners", name));
      report.moved.push(full);
      report.violations++;
    }
  }

  const allowedRoot = new Set([
    "metadata.yaml",
    "prd.md",
    "README.md",
    "cases",
    "automation",
    "runs",
    "inputs",
    ".DS_Store",
  ]);
  for (const name of listTopEntries(featureDir)) {
    if (allowedRoot.has(name)) continue;
    if (name.startsWith(".") && name !== ".debug") continue;
    const full = join(featureDir, name);
    report.unfixable.push({
      path: full,
      reason: `feature 根目录不允许 "${name}"，用例进 cases/，自动化进 automation/，结果进 runs/`,
    });
    report.violations++;
  }

  return report;
}
