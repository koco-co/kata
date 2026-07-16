import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

let _cached: Record<string, string> | null = null;

export function readDotEnvFile(envPath: string): Record<string, string> {
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
    if (value.startsWith('"') && value.endsWith('"')) {
      try {
        value = JSON.parse(value) as string;
      } catch {
        value = value.slice(1, -1);
      }
    } else if (value.startsWith("'") && value.endsWith("'")) {
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
  const parsed = readDotEnvFile(target);
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

/** Update one key in a dotenv file without exposing its value to command output. */
export function setDotEnvValue(envPath: string, key: string, value: string): void {
  if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
    throw new Error(`Invalid environment variable name: ${key}`);
  }
  if (value.includes("\n") || value.includes("\r")) {
    throw new Error(`Environment variable "${key}" must be a single-line value`);
  }

  const encoded = JSON.stringify(value);
  const existing = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const lines = existing.split("\n");
  const keyPattern = new RegExp(`^\\s*${key}\\s*=`);
  const index = lines.findIndex((line) => keyPattern.test(line));
  if (index >= 0) {
    lines[index] = `${key}=${encoded}`;
  } else {
    while (lines.length > 0 && lines.at(-1) === "") lines.pop();
    lines.push(`${key}=${encoded}`, "");
  }
  writeFileSync(envPath, lines.join("\n"), { encoding: "utf8", mode: 0o600 });
  chmodSync(envPath, 0o600);
  process.env[key] = value;
  mergeCached({ [key]: value });
}

export interface InitEnvOpts {
  cwd?: string;
}

/**
 * Initialize environment variables from .env file.
 *
 * `initEnv()` or `initEnv({ cwd })` loads only the root `.env`.
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
  const parsed = readDotEnvFile(resolve(baseDir, ".env"));
  mergeCached(parsed);
  applyToProcessEnv(parsed);
  return parsed;
}
