import { existsSync, mkdirSync, readdirSync, renameSync, rmdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

const TESTS_ALLOWED = new Set(["cases", "runners", "pages", "helpers", "fixtures", "sql"]);
const AUTOMATION_TOP_ALLOWED = new Set(["scripts", "tests", ".DS_Store"]);

export interface NormalizeReport {
  moved: { from: string; to: string }[];
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

function planMove(
  report: NormalizeReport,
  source: string,
  target: string,
  shouldMove: boolean,
): void {
  if (existsSync(target)) {
    report.unfixable.push({ path: source, reason: `目标已存在，拒绝覆盖: ${target}` });
    report.violations++;
    return;
  }
  if (shouldMove) moveIntoBackup(source, target);
  report.moved.push({ from: source, to: target });
}

function planDirectoryContents(
  report: NormalizeReport,
  sourceDir: string,
  targetDir: string,
  shouldMove: boolean,
): void {
  for (const name of listTopEntries(sourceDir)) {
    planMove(report, join(sourceDir, name), join(targetDir, name), shouldMove);
  }
  if (shouldMove && existsSync(sourceDir) && listTopEntries(sourceDir).length === 0)
    rmdirSync(sourceDir);
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
      if (isDir(full) && name === "sql") {
        planMove(report, full, join(automationDir, "tests", "sql"), shouldMove);
      } else if (isDir(full)) {
        report.unfixable.push({
          path: full,
          reason: `automation/ 顶层不应有子目录 "${name}"，请手动移除`,
        });
        report.violations++;
      } else if (/\.(md|json|yaml)$/.test(name)) {
        const target = join(backup, "automation", name);
        if (shouldMove) moveIntoBackup(full, target);
        report.moved.push({ from: full, to: target });
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
      if (name.endsWith(".spec.ts")) continue;
      const full = join(runnersDir, name);
      const target = join(backup, "runners", name);
      if (shouldMove) moveIntoBackup(full, target);
      report.moved.push({ from: full, to: target });
      report.violations++;
    }
  }

  const testsDir = join(automationDir, "tests");
  if (existsSync(testsDir)) {
    for (const name of listTopEntries(testsDir)) {
      const full = join(testsDir, name);
      if (TESTS_ALLOWED.has(name)) continue;
      if (name === "data" || name === "precond") {
        planDirectoryContents(
          report,
          full,
          join(testsDir, "fixtures", name === "data" ? "" : "precond"),
          shouldMove,
        );
        continue;
      }
      if (name === "README.md" || name === "MANUAL-TRIAGE.md") {
        planMove(report, full, join(automationDir, "scripts", name), shouldMove);
        continue;
      }
      if (!isDir(full) && name.endsWith(".spec.ts")) {
        planMove(report, full, join(testsDir, "runners", name), shouldMove);
        continue;
      }
      report.unfixable.push({ path: full, reason: `automation/tests/ 不允许 "${name}"` });
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
