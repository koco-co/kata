import { spawnSync } from "node:child_process";

export interface InvokeOpts {
  prompt: string;
  cwd: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

export interface InvokeResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

export function buildClaudeArgs(o: InvokeOpts): string[] {
  return ["-p", o.prompt, "--permission-mode", "acceptEdits"];
}

export function invokeClaude(o: InvokeOpts): InvokeResult {
  const r = spawnSync("claude", buildClaudeArgs(o), {
    cwd: o.cwd,
    env: o.env ?? process.env,
    encoding: "utf-8",
    timeout: o.timeoutMs ?? 1_800_000,
  });
  return {
    ok: r.status === 0,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

