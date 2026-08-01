import { existsSync, lstatSync, mkdirSync, readdirSync, renameSync, rmdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertFeatureNoSymlink, assertNoSymlinkPath } from "../features-layout.ts";

const TESTS_ALLOWED = new Set([
  "cases",
  "runners",
  "pages",
  "flows",
  "assertions",
  "fixtures",
  "sql",
]);
const AUTOMATION_TOP_ALLOWED = new Set(["README.md", "tests"]);
// Canonical runners stay in automation/tests/runners/; anything else there goes to backup.
const CANONICAL_RUNNERS = new Set([
  "generated.ts",
  "full.spec.ts",
  "smoke.spec.ts",
  "retry-failed.spec.ts",
]);

export interface NormalizeReport {
  moved: { from: string; to: string }[];
  unfixable: { path: string; reason: string }[];
  violations: number;
  backupDir: string;
}

function isDir(path: string): boolean {
  try {
    const stat = lstatSync(path);
    return stat.isDirectory() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function listTopEntries(dir: string): string[] {
  if (!existsSync(dir)) return [];
  try {
    const stat = lstatSync(dir);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return [];
  } catch {
    return [];
  }
  return readdirSync(dir);
}

export function backupDir(featureDir: string, now: Date = new Date()): string {
  const ts = now.toISOString().replace(/[-:.]/g, "").slice(0, 15);
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

/** Move one stray file into the backup dir; an existing target is a conflict, never overwritten. */
function planBackupMove(
  report: NormalizeReport,
  source: string,
  target: string,
  shouldMove: boolean,
): void {
  if (existsSync(target)) {
    report.unfixable.push({ path: source, reason: `备份目标已存在，拒绝覆盖: ${target}` });
    report.violations++;
    return;
  }
  if (shouldMove) moveIntoBackup(source, target);
  report.moved.push({ from: source, to: target });
  report.violations++;
}

export function normalizeAutomation(
  featureDir: string,
  opts: { dryRun?: boolean; apply?: boolean; now?: Date } = {},
): NormalizeReport {
  assertFeatureNoSymlink(featureDir);
  const shouldMove = opts.apply === true && opts.dryRun !== true;
  const backup = backupDir(featureDir, opts.now ?? new Date());
  assertNoSymlinkPath(featureDir, backup, "automation backup");
  const report: NormalizeReport = { moved: [], unfixable: [], violations: 0, backupDir: backup };
  const automationDir = join(featureDir, "automation");
  const runnersDir = join(automationDir, "tests", "runners");
  assertNoSymlinkPath(featureDir, automationDir, "automation");
  assertNoSymlinkPath(featureDir, runnersDir, "automation runners");

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
      } else if (/\.(md|json|ya?ml)$/.test(name)) {
        planBackupMove(report, full, join(backup, "automation", name), shouldMove);
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
      if (CANONICAL_RUNNERS.has(name)) continue;
      const full = join(runnersDir, name);
      if (isDir(full)) {
        report.unfixable.push({
          path: full,
          reason: `automation/tests/runners/ 不应有子目录 "${name}"，请手动移除`,
        });
        report.violations++;
        continue;
      }
      planBackupMove(report, full, join(backup, "runners", name), shouldMove);
    }
  }

  const testsDir = join(automationDir, "tests");
  if (existsSync(testsDir)) {
    for (const name of listTopEntries(testsDir)) {
      const full = join(testsDir, name);
      if (TESTS_ALLOWED.has(name)) continue;
      if (name === "data" || name === "precond") {
        if (!isDir(full)) {
          report.unfixable.push({
            path: full,
            reason: `automation/tests/${name} 必须是实体目录，拒绝跟随符号链接或其他路径类型`,
          });
          report.violations++;
          continue;
        }
        planDirectoryContents(
          report,
          full,
          join(testsDir, "fixtures", name === "data" ? "" : "precond"),
          shouldMove,
        );
        continue;
      }
      if (name === "README.md" || name === "MANUAL-TRIAGE.md") {
        planMove(report, full, join(automationDir, "README.md"), shouldMove);
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
    "prd",
    "cases",
    "README.md",
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
