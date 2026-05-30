import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { runCasesCompare } from "@shared/cli/cases-compare.ts";
import { runCasesVerify } from "@shared/cli/cases-verify.ts";
import { invokeClaude, invokeCodex } from "./runtime-invoke.ts";

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
  verifyCodex: Awaited<ReturnType<typeof runCasesVerify>>;
  compare: ReturnType<typeof runCasesCompare>;
  ok: boolean;
}

export async function runCaseDraftE2e(o: E2eOpts): Promise<E2eResult> {
  const prompt = `Run case-draft for project ${o.project} feature ${o.featureId} consuming the frozen source-snapshot at ${o.snapshotPath}. Write artifacts under {runtimeRoot}/workspace/${o.project}/features/${o.featureId}/.`;
  const claudeRoot = join(o.outRoot, "claude");
  const codexRoot = join(o.outRoot, "codex");
  mkdirSync(claudeRoot, { recursive: true });
  mkdirSync(codexRoot, { recursive: true });

  const claudeRun = invokeClaude({
    prompt: prompt.replace("{runtimeRoot}", claudeRoot),
    cwd: claudeRoot,
  });
  const codexRun = invokeCodex({
    prompt: prompt.replace("{runtimeRoot}", codexRoot),
    cwd: codexRoot,
  });

  const v1 = await runCasesVerify({
    project: o.project,
    featureId: o.featureId,
    workspaceRoot: join(claudeRoot, "workspace"),
    requiredKinds: o.requiredKinds,
  });
  const v2 = await runCasesVerify({
    project: o.project,
    featureId: o.featureId,
    workspaceRoot: join(codexRoot, "workspace"),
    requiredKinds: o.requiredKinds,
  });
  const cmp = runCasesCompare({
    leftDir: join(claudeRoot, "workspace", o.project, "features", o.featureId),
    rightDir: join(codexRoot, "workspace", o.project, "features", o.featureId),
    threshold: o.threshold,
  });

  return {
    verifyClaude: v1,
    verifyCodex: v2,
    compare: cmp,
    ok: claudeRun.ok && codexRun.ok && v1.ok && v2.ok && !cmp.fail,
  };
}
