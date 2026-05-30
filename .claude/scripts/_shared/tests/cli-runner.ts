import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";

export const KATA_CLI = resolve(import.meta.dirname, "../bin/kata");

const RAW_SECRET_ENV_PATTERN =
  /^KATA_.*(?:COOKIE|PASSWORD|PASS|TOKEN|SECRET|WEBHOOK|PRIVATE|CREDENTIAL|API_KEY)/i;

export function testEnv(overrides?: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const name of Object.keys(env)) {
    if (RAW_SECRET_ENV_PATTERN.test(name)) {
      delete env[name];
    }
  }
  return overrides ? { ...env, ...overrides } : env;
}

export function runKataCli(
  args: string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): string {
  return execFileSync(process.execPath, ["--no-env-file", KATA_CLI, ...args], {
    encoding: "utf8",
    cwd: opts.cwd,
    env: testEnv(opts.env),
  }) as string;
}

export function spawnKataCli(args: string[], opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  return spawnSync(process.execPath, ["--no-env-file", KATA_CLI, ...args], {
    encoding: "utf8",
    cwd: opts.cwd,
    env: testEnv(opts.env),
  });
}
