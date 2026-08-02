import { readFileSync } from "node:fs";
import { parse } from "yaml";
import type { DtStackCliConfig } from "./schema";

const VAR_RE = /\$\{([A-Z0-9_]+)\}/g;

function interpolate(value: unknown, missing: Set<string>): unknown {
  if (typeof value === "string") {
    return value.replace(VAR_RE, (_, name: string) => {
      const envValue = process.env[name];
      if (envValue === undefined) {
        missing.add(name);
        return "";
      }
      return envValue;
    });
  }
  if (Array.isArray(value)) return value.map((item) => interpolate(item, missing));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = interpolate(v, missing);
    return out;
  }
  return value;
}

export function loadConfig(path: string): DtStackCliConfig {
  const raw = parse(readFileSync(path, "utf-8")) as DtStackCliConfig;
  const missing = new Set<string>();
  const config = interpolate(raw, missing) as DtStackCliConfig;
  if (missing.size > 0) {
    throw new Error(
      `${path} references unset environment variables: ${[...missing].sort().join(", ")}`,
    );
  }
  return config;
}
