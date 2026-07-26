import { existsSync, readFileSync } from "node:fs";

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

export function getEnv(key: string): string | undefined {
  return process.env[key];
}

export function getEnvOrThrow(key: string): string {
  const val = getEnv(key);
  if (val === undefined || val === "") {
    throw new Error(`Required environment variable "${key}" is not set.`);
  }
  return val;
}
