import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import type { Command } from "commander";
import { writeFileAtomic } from "../lib/atomic-writer.ts";
import { generateAutomationRunner } from "../lib/automation-contract.ts";
import { SPEC_FILE_RE } from "../lib/cases/naming.ts";
import { parseCasesYaml } from "../lib/cases/parse.ts";
import { findCasesYaml, resolveFeatureInput } from "./cases-build.ts";

type SyncStatus = "rename" | "unchanged" | "unmapped" | "missing" | "conflict" | "invalid";

interface SyncRename {
  caseId: string;
  oldName: string;
  newName: string;
  oldPath: string;
  newPath: string;
  status: SyncStatus;
  candidates: string[];
  chosenName?: string;
  reason?: string;
}

export interface CasesSyncReport {
  applied: boolean;
  yaml: string;
  runner: string;
  renames: Array<
    Pick<
      SyncRename,
      "caseId" | "oldName" | "newName" | "status" | "candidates" | "chosenName" | "reason"
    >
  >;
}

function automationDir(featureDir: string): string {
  return join(featureDir, "automation", "tests", "cases");
}

function runnerPaths(featureDir: string): { generated: string; full: string } {
  const dir = join(featureDir, "automation", "tests", "runners");
  return { generated: join(dir, "generated.ts"), full: join(dir, "full.spec.ts") };
}

function casePrefix(caseId: string): string {
  return `c${caseId.slice(1).toLowerCase()}-`;
}

function scriptScore(content: string): number {
  return (
    content.length +
    (content.match(/expect\s*\(/g) ?? []).length * 500 +
    (content.match(/assert|toBe|toHave|page\.|locator\(/g) ?? []).length * 200 +
    (content.match(/test\s*\(|register[A-Z]/g) ?? []).length * 50
  );
}

interface ScriptCandidate {
  relativePath: string;
  absolutePath: string;
}

function scriptFiles(casesDir: string): ScriptCandidate[] {
  if (!existsSync(casesDir)) return [];
  const out: ScriptCandidate[] = [];
  const walk = (current: string): void => {
    for (const name of readdirSync(current)) {
      if (name === ".gitkeep") continue;
      const absolutePath = join(current, name);
      if (statSync(absolutePath).isDirectory()) walk(absolutePath);
      else if (name.endsWith(".ts")) {
        out.push({
          relativePath: relative(casesDir, absolutePath).split("\\").join("/"),
          absolutePath,
        });
      }
    }
  };
  walk(casesDir);
  return out.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function conflictChoice(candidates: ScriptCandidate[]): {
  chosen: ScriptCandidate;
  reason: string;
} {
  const contents = candidates.map((candidate) => ({
    candidate,
    content: readFileSync(candidate.absolutePath, "utf8"),
  }));
  const identical = contents.every((item) => item.content === contents[0]?.content);
  if (identical) {
    const target = contents.find((item) =>
      basename(item.candidate.relativePath).endsWith(".spec.ts"),
    );
    return {
      chosen: target?.candidate ?? contents[0].candidate,
      reason: "候选文件内容完全一致，保留规范 .spec.ts 文件",
    };
  }
  const ranked = [...contents].sort(
    (left, right) => scriptScore(right.content) - scriptScore(left.content),
  );
  const chosen = ranked[0];
  return {
    chosen: chosen.candidate,
    reason: `候选实现按断言、业务步骤和实现内容评分，保留内容更完整的文件（score=${scriptScore(chosen.content)}）`,
  };
}

function planSync(featureDir: string, yamlPath: string): SyncRename[] {
  const file = parseCasesYaml(readFileSync(yamlPath, "utf8"));
  const casesDir = automationDir(featureDir);
  const scripts = scriptFiles(casesDir);
  return file.cases.map((item) => {
    const newName = item.automation?.spec_file ?? "";
    const newPath = newName ? join(casesDir, newName) : "";
    if (!newName) {
      return {
        caseId: item.id,
        oldName: "",
        newName: "",
        oldPath: "",
        newPath: "",
        status: "unmapped",
        candidates: [],
      };
    }
    if (!SPEC_FILE_RE.test(newName)) {
      return {
        caseId: item.id,
        oldName: "",
        newName,
        oldPath: "",
        newPath,
        status: "invalid",
        candidates: [],
        reason: "YAML 中的 spec_file 不符合 c<四位序号>-<英文slug>.spec.ts 规范",
      };
    }
    const targetCandidates = scripts.filter((script) => basename(script.relativePath) === newName);
    const candidates = scripts.filter(
      (script) =>
        basename(script.relativePath) !== newName &&
        basename(script.relativePath).startsWith(casePrefix(item.id)),
    );
    const available = [...targetCandidates, ...candidates];
    if (available.length === 0) {
      return {
        caseId: item.id,
        oldName: "",
        newName,
        oldPath: "",
        newPath,
        status: "missing",
        candidates: [],
        reason: "YAML 已声明 spec_file，但 automation/tests/cases 中没有对应脚本",
      };
    }
    if (available.length === 1 && targetCandidates.length === 1) {
      return {
        caseId: item.id,
        oldName: newName,
        newName,
        oldPath: targetCandidates[0].absolutePath,
        newPath: targetCandidates[0].absolutePath,
        status: "unchanged",
        candidates: [targetCandidates[0].relativePath],
      };
    }
    const choice = conflictChoice(available);
    const isConflict = available.length > 1;
    const destination =
      targetCandidates[0]?.absolutePath ?? join(dirname(choice.chosen.absolutePath), newName);
    return {
      caseId: item.id,
      oldName: choice.chosen.relativePath,
      newName,
      oldPath: choice.chosen.absolutePath,
      newPath: destination,
      status: isConflict ? "conflict" : "rename",
      candidates: available.map((candidate) => candidate.relativePath),
      chosenName: choice.chosen.relativePath,
      reason: isConflict ? choice.reason : "YAML 已声明新的规范文件名，按 case ID 找到唯一旧脚本",
    };
  });
}

function restoreFile(path: string, content: string | undefined): void {
  if (content === undefined) {
    if (existsSync(path)) unlinkSync(path);
    return;
  }
  writeFileAtomic(path, content);
}

function reportFromPlan(
  applied: boolean,
  yamlPath: string,
  runnerPath: string,
  plan: SyncRename[],
): CasesSyncReport {
  return {
    applied,
    yaml: yamlPath,
    runner: runnerPath,
    renames: plan.map(({ caseId, oldName, newName, status, candidates, chosenName, reason }) => ({
      caseId,
      oldName,
      newName,
      status,
      candidates,
      chosenName,
      reason,
    })),
  };
}

export function runCasesSync(featureDir: string, apply = false): CasesSyncReport {
  const { yamlPath } = findCasesYaml(featureDir);
  const plan = planSync(featureDir, yamlPath);
  const runners = runnerPaths(featureDir);
  if (!apply) {
    const report = reportFromPlan(false, yamlPath, runners.generated, plan);
    console.log(JSON.stringify(report, null, 2));
    return report;
  }
  const invalid = plan.filter((item) => item.status === "invalid");
  if (invalid.length > 0) {
    throw new Error(
      `自动化文件名同步存在非法映射:\n${invalid.map((item) => `  - ${item.caseId}: ${item.newName} (${item.reason})`).join("\n")}`,
    );
  }
  const actions = plan.filter(
    (item) => (item.status === "rename" || item.status === "conflict") && item.chosenName,
  );
  if (actions.length === 0) {
    const appliedReport = reportFromPlan(true, yamlPath, runners.generated, plan);
    console.log(JSON.stringify(appliedReport, null, 2));
    return appliedReport;
  }
  const runnerOriginal = existsSync(runners.generated)
    ? readFileSync(runners.generated, "utf8")
    : undefined;
  const fullOriginal = existsSync(runners.full) ? readFileSync(runners.full, "utf8") : undefined;
  const casesDir = automationDir(featureDir);
  const transaction = join(casesDir, `.kata-sync-${Date.now()}`);
  mkdirSync(transaction, { recursive: true });
  const staged = new Map<string, { stagePath: string; originalPath: string }>();
  try {
    let stageIndex = 0;
    for (const item of actions) {
      for (const name of item.candidates) {
        const key = `${item.caseId}:${name}`;
        if (staged.has(key)) continue;
        const originalPath = join(casesDir, name);
        const stagePath = join(transaction, `${String(stageIndex++).padStart(4, "0")}.ts`);
        renameSync(originalPath, stagePath);
        staged.set(key, { stagePath, originalPath });
      }
    }
    for (const item of actions) {
      const chosen = staged.get(`${item.caseId}:${item.chosenName}`);
      if (!chosen) throw new Error(`${item.caseId} 找不到待迁移脚本: ${item.chosenName}`);
      renameSync(chosen.stagePath, item.newPath);
    }
    generateAutomationRunner(featureDir, { apply: true });
    const appliedReport = reportFromPlan(true, yamlPath, runners.generated, plan);
    console.log(JSON.stringify(appliedReport, null, 2));
    rmSync(transaction, { recursive: true, force: true });
    return appliedReport;
  } catch (error) {
    for (const item of actions) {
      if (existsSync(item.newPath)) {
        const chosen = staged.get(`${item.caseId}:${item.chosenName}`);
        if (chosen && !existsSync(chosen.stagePath)) renameSync(item.newPath, chosen.stagePath);
      }
    }
    for (const { stagePath, originalPath } of staged.values()) {
      if (existsSync(stagePath)) renameSync(stagePath, originalPath);
    }
    restoreFile(runners.generated, runnerOriginal);
    restoreFile(runners.full, fullOriginal);
    rmSync(transaction, { recursive: true, force: true });
    throw error;
  }
}

export function registerCasesSync(cases: Command): void {
  cases
    .command("sync")
    .description("按 YAML 中已声明的 spec_file 同步自动化文件名和 generated runner(默认 dry-run)")
    .requiredOption("--feature <dir>", "feature 目录路径")
    .option("--project <name>", "项目名；feature 传相对 features/ 的完整路径时必填")
    .option("--apply", "按预览计划实际重命名并更新 runner", false)
    .action((opts: { feature: string; project?: string; apply?: boolean }) => {
      try {
        runCasesSync(resolveFeatureInput(opts.feature, opts.project), opts.apply);
      } catch (error) {
        console.error((error as Error).message);
        process.exit(1);
      }
    });
}
