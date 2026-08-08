import { type ChildProcess, spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { runsDir } from "../features-layout.ts";
import { RUN_ID_RE } from "../run-id.ts";
import { locateProjectRoot } from "../workspace-locator.ts";
import type { FeatureRef } from "./types.ts";

export interface AutomationRunHandle {
  runId: string;
  runPath: string;
  child: ChildProcess;
  exit: Promise<number>;
  output: () => { stdout: string; stderr: string };
}

function listRunIds(featureDir: string): Set<string> {
  const root = runsDir(featureDir);
  if (!existsSync(root)) return new Set();
  return new Set(readdirSync(root).filter((name) => RUN_ID_RE.test(name)));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function waitForNewRun(
  featureDir: string,
  before: ReadonlySet<string>,
): Promise<{ runId: string; runPath: string }> {
  const root = runsDir(featureDir);
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (!existsSync(root)) {
      await delay(200);
      continue;
    }
    const candidates = readdirSync(root)
      .filter((name) => RUN_ID_RE.test(name) && !before.has(name))
      .sort();
    for (const runId of candidates.reverse()) {
      const runPath = join(root, runId);
      if (existsSync(join(runPath, "status.json"))) return { runId, runPath };
    }
    await delay(200);
  }
  throw new Error("automation run 未在预期时间内创建运行目录");
}

export async function startAutomationRun(
  ref: FeatureRef,
  env: string,
): Promise<AutomationRunHandle> {
  const repoRoot = locateProjectRoot();
  const cliPath = resolve(repoRoot, "cli/bin/kata.ts");
  const before = listRunIds(ref.featureDir);
  const child = spawn(
    process.execPath,
    [
      cliPath,
      "automation",
      "run",
      ref.featureDir,
      "--project",
      ref.project,
      "--env",
      env,
      "--no-interactive",
      "--headless",
    ],
    {
      cwd: repoRoot,
      env: { ...process.env, KATA_NO_INTERACTIVE: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    stdout = `${stdout}${chunk.toString("utf8")}`.slice(-1_000_000);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr = `${stderr}${chunk.toString("utf8")}`.slice(-1_000_000);
  });

  const exit = new Promise<number>((resolveExit) => {
    child.once("error", () => resolveExit(1));
    child.once("exit", (code, signal) => resolveExit(code ?? (signal ? 128 + 1 : 1)));
  });

  try {
    const { runId, runPath } = await waitForNewRun(ref.featureDir, before);
    return {
      runId,
      runPath,
      child,
      exit,
      output: () => ({ stdout, stderr }),
    };
  } catch (error) {
    if (!child.killed) child.kill();
    await exit.catch(() => undefined);
    throw error;
  }
}
