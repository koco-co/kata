import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

let _cached: Record<string, string> | null = null;

function parseDotEnvFile(envPath: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  if (!existsSync(envPath)) return parsed;

  const content = readFileSync(envPath, "utf8");
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }

  return parsed;
}

function mergeCached(parsed: Record<string, string>): void {
  _cached = { ..._cached, ...parsed };
}

function applyToProcessEnv(parsed: Record<string, string>): void {
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function loadDotEnv(envPath?: string): Record<string, string> {
  const target = envPath ?? resolve(process.cwd(), ".env");
  const parsed = parseDotEnvFile(target);
  mergeCached(parsed);
  return parsed;
}

export function getEnv(key: string): string | undefined {
  return process.env[key] ?? _cached?.[key];
}

export function getEnvOrThrow(key: string): string {
  const val = getEnv(key);
  if (val === undefined || val === "") {
    throw new Error(`Required environment variable "${key}" is not set. Check .env file.`);
  }
  return val;
}

export interface InitEnvOpts {
  cwd?: string;
}

/**
 * Initialize environment variables from .env file.
 *
 * `initEnv()` or `initEnv({ cwd })` loads `.env`, `.env.envs`, then `.env.local`.
 * `initEnv(path)` loads a specific file.
 *
 * `process.env` always wins — pre-existing keys are never overwritten.
 * Missing files do not throw.
 */
export function initEnv(arg?: string | InitEnvOpts): Record<string, string> {
  if (typeof arg === "string") {
    const parsed = loadDotEnv(arg);
    applyToProcessEnv(parsed);
    return parsed;
  }

  const baseDir = arg?.cwd ?? process.cwd();
  const merged: Record<string, string> = {};
  for (const fileName of [".env", ".env.envs", ".env.local"]) {
    Object.assign(merged, parseDotEnvFile(resolve(baseDir, fileName)));
  }
  mergeCached(merged);
  applyToProcessEnv(merged);
  return merged;
}
