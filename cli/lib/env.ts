import { existsSync, readFileSync } from "node:fs";

export function readDotEnvFile(envPath: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  if (!existsSync(envPath)) return parsed;

  const content = readFileSync(envPath, "utf8");
  for (const raw of content.split("\n")) {
    let line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice("export ".length).trimStart();
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
    } else {
      // 行内注释:未加引号的值截到第一个空白 + `#`(与常见 dotenv 解析一致)
      const commentIdx = value.search(/\s#/);
      if (commentIdx !== -1) value = value.slice(0, commentIdx).trimEnd();
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
