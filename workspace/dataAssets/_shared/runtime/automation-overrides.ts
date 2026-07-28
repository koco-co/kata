import fs from "node:fs";
import path from "node:path";

export interface AutomationOverrideFile {
  readonly playwright?: Record<string, unknown>;
  readonly automation?: Record<string, unknown>;
}

function record(value: unknown, key: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${key} 必须是对象`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], key: string): void {
  const unknown = Object.keys(value).filter((item) => !allowed.includes(item));
  if (unknown.length > 0) throw new Error(`${key} 包含未知配置项: ${unknown.join(", ")}`);
}

export function automationOverrideFileFromArgv(argv: readonly string[] = process.argv): string | undefined {
  const index = argv.findIndex((item) => item === "--config");
  if (index < 0 || !argv[index + 1]) return undefined;
  const configFile = path.resolve(argv[index + 1]);
  if (!path.basename(configFile).startsWith("kata-automation-config-")) return undefined;
  return configFile.replace(/\.(?:m|c)?tsx?$/, ".overrides.json");
}

export function readAutomationOverrideFile(
  argv: readonly string[] = process.argv,
): AutomationOverrideFile {
  const file = automationOverrideFileFromArgv(argv);
  if (!file || !fs.existsSync(file)) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    throw new Error(`命令行自动化覆盖文件不是合法 JSON: ${file}`);
  }
  const root = record(parsed, "命令行自动化覆盖");
  exactKeys(root, ["playwright", "automation"], "命令行自动化覆盖");
  return {
    ...(root.playwright === undefined ? {} : { playwright: record(root.playwright, "命令行自动化覆盖.playwright") }),
    ...(root.automation === undefined ? {} : { automation: record(root.automation, "命令行自动化覆盖.automation") }),
  };
}
