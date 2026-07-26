import { spawn } from "node:child_process";
import { constants as osConstants } from "node:os";
import { basename, join } from "node:path";
import { writeJsonAtomic } from "./atomic-writer.ts";

<<<<<<< HEAD
export type RunExecutionState = "running" | "command_passed" | "failed";
=======
export type RunExecutionState = "running" | "passed" | "failed";
>>>>>>> origin/main

export interface RunExecutionOptions {
  readonly runId: string;
  readonly runPath: string;
  readonly project: string;
  readonly command: readonly string[];
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
}

export interface RunExecutionStatus {
  readonly schemaVersion: 1;
  readonly runId: string;
  readonly runPath: string;
  readonly project: string;
  readonly status: RunExecutionState;
  readonly exitCode: number | null;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly command: {
    readonly executable: string;
    readonly argCount: number;
  };
}

function writeStatus(runPath: string, status: RunExecutionStatus): void {
  writeJsonAtomic(join(runPath, "status.json"), status);
}

/** Execute a child process with a newly allocated run path and preserve its exit code. */
export async function executeWithRunPath(options: RunExecutionOptions): Promise<number> {
  if (options.command.length === 0) throw new Error("kata runs exec requires a command after --");

  const startedAt = new Date().toISOString();
  const command = {
    executable: basename(options.command[0]),
    argCount: Math.max(0, options.command.length - 1),
  };
  const baseStatus: RunExecutionStatus = {
    schemaVersion: 1,
    runId: options.runId,
    runPath: options.runPath,
    project: options.project,
    status: "running",
    exitCode: null,
    startedAt,
    command,
  };
  writeStatus(options.runPath, baseStatus);

  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...(options.env ?? {}),
    KATA_ACTIVE_PROJECT: options.project,
    KATA_RUN_PATH: options.runPath,
    KATA_ALLURE_RESULTS_DIR: join(options.runPath, "allure-results"),
  };
  const child = spawn(options.command[0], options.command.slice(1), {
    cwd: options.cwd ?? process.cwd(),
    env: childEnv,
    stdio: "inherit",
  });
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGHUP"];
  const handlers = new Map<NodeJS.Signals, () => void>();
  for (const signal of signals) {
    const handler = (): void => {
      if (!child.killed) child.kill(signal);
    };
    handlers.set(signal, handler);
    process.on(signal, handler);
  }

  let exitCode = 1;
  try {
    exitCode = await new Promise<number>((resolveExit) => {
      child.once("error", () => resolveExit(1));
      child.once("exit", (code, signal) =>
        resolveExit(code ?? (signal ? 128 + (osConstants.signals[signal] ?? 1) : 1)),
      );
    });
  } finally {
    for (const [signal, handler] of handlers) process.off(signal, handler);
    writeStatus(options.runPath, {
      ...baseStatus,
<<<<<<< HEAD
      // A zero child exit code proves only that the command completed; it is
      // not evidence that Playwright, Allure, or a business record passed.
      status: exitCode === 0 ? "command_passed" : "failed",
=======
      status: exitCode === 0 ? "passed" : "failed",
>>>>>>> origin/main
      exitCode,
      finishedAt: new Date().toISOString(),
    });
  }
  return exitCode;
}
