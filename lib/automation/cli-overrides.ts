import { parse as parseYaml } from "yaml";
import type { AutomationOverrideFile } from "./overrides.ts";

function parseSetValue(value: string, path: string): unknown {
  try {
    return parseYaml(value);
  } catch {
    throw new Error(`--set ${path}=... 的值不是合法 YAML 标量`);
  }
}

function setNestedValue(root: AutomationOverrideFile, path: string, value: unknown): void {
  const parts = path.split(".");
  if (parts.length < 2 || !["playwright", "automation"].includes(parts[0] ?? "")) {
    throw new Error(`--set 只允许 playwright.* 或 automation.*，实际为: ${path}`);
  }
  if (parts.some((part) => !/^[A-Za-z][A-Za-z0-9_]*$/.test(part))) {
    throw new Error(`--set 配置路径非法: ${path}`);
  }

  const section = parts[0] as "playwright" | "automation";
  const target = (root[section] ?? {}) as Record<string, unknown>;
  root[section] = target;
  let current = target;
  for (const key of parts.slice(1, -1)) {
    const existing = current[key];
    if (
      existing !== undefined &&
      (typeof existing !== "object" || existing === null || Array.isArray(existing))
    ) {
      throw new Error(`--set 配置路径与已有值冲突: ${path}`);
    }
    current[key] = existing ?? {};
    current = current[key] as Record<string, unknown>;
  }
  const leaf = parts.at(-1) as string;
  if (Object.prototype.hasOwnProperty.call(current, leaf)) {
    throw new Error(`--set 配置重复: ${path}`);
  }
  current[leaf] = value;
}

/** Parse generic path=value overrides without adding feature-specific CLI flags. */
export function parseAutomationSetEntries(entries: readonly string[]): AutomationOverrideFile {
  const result: AutomationOverrideFile = { playwright: {}, automation: {} };
  for (const raw of entries) {
    const separator = raw.indexOf("=");
    if (separator <= 0) throw new Error(`--set 必须使用 path=value 格式，实际为: ${raw}`);
    const path = raw.slice(0, separator).trim();
    const value = parseSetValue(raw.slice(separator + 1), path);
    setNestedValue(result, path, value);
  }
  return result;
}
