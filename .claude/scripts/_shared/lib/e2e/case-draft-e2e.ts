import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { runCasesCompare } from "@shared/cli/cases-compare.ts";
import { runCasesVerify } from "@shared/cli/cases-verify.ts";
import { invokeClaude } from "./runtime-invoke.ts";

export interface E2eOpts {
  project: string;
  featureId: string;
  snapshotPath: string;
  outRoot: string;
  workspaceRoot: string;
  threshold: number;
  requiredKinds: string[];
}

export interface E2eResult {
  verifyClaude: Awaited<ReturnType<typeof runCasesVerify>>;
  compare: ReturnType<typeof runCasesCompare>;
  ok: boolean;
}

export async function runCaseDraftE2e(o: E2eOpts): Promise<E2eResult> {
  const prompt = `Run case-draft for project ${o.project} feature ${o.featureId} consuming the frozen source-snapshot at ${o.snapshotPath}. Write artifacts under {runtimeRoot}/workspace/${o.project}/features/${o.featureId}/.`;
  const claudeRoot = join(o.outRoot, "claude");
  mkdirSync(claudeRoot, { recursive: true });

  const claudeRun = invokeClaude({
    prompt: prompt.replace("{runtimeRoot}", claudeRoot),
    cwd: claudeRoot,
  });

  const v1 = await runCasesVerify({
    project: o.project,
    featureId: o.featureId,
    workspaceRoot: join(claudeRoot, "workspace"),
    requiredKinds: o.requiredKinds,
  });

  // 空比较（单运行时模式，无需跨运行时对比）
  const cmp = runCasesCompare({
    leftDir: join(claudeRoot, "workspace", o.project, "features", o.featureId),
    rightDir: join(claudeRoot, "workspace", o.project, "features", o.featureId),
    threshold: o.threshold,
  });

  return {
    verifyClaude: v1,
    compare: cmp,
    ok: claudeRun.ok && v1.ok && !cmp.fail,
  };
}
