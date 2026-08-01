import fs from "node:fs";
import path from "node:path";

/** Internal hand-off from `kata automation run` to Playwright worker processes. */
export const AUTOMATION_OVERRIDE_FILE_ENV = "KATA_AUTOMATION_OVERRIDE_FILE";

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

export function automationOverrideTempDir(runPath: string): string {
  const resolvedRunPath = path.resolve(runPath);
  let runStat: fs.Stats;
  try {
    runStat = fs.lstatSync(resolvedRunPath);
  } catch {
    throw new Error(`KATA_RUN_PATH 不存在: ${resolvedRunPath}`);
  }
  if (runStat.isSymbolicLink()) throw new Error("KATA_RUN_PATH 不得是符号链接");
  if (!runStat.isDirectory()) throw new Error("KATA_RUN_PATH 必须是目录");

  const tempDir = path.join(resolvedRunPath, "_tmp");
  if (fs.existsSync(tempDir)) {
    const tempStat = fs.lstatSync(tempDir);
    if (tempStat.isSymbolicLink()) throw new Error("自动化覆盖目录不得是符号链接");
    if (!tempStat.isDirectory()) throw new Error("自动化覆盖目录必须是目录");
  }
  return tempDir;
}

function assertAutomationOverridePath(filePath: string, runPath: string): string {
  const tempDir = automationOverrideTempDir(runPath);
  const resolved = path.resolve(filePath);
  const relative = path.relative(tempDir, resolved);
  if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${AUTOMATION_OVERRIDE_FILE_ENV} 必须位于当前 run 的 _tmp`);
  }
  if (!/^kata-automation-config-.+\.overrides\.json$/.test(path.basename(resolved))) {
    throw new Error(
      `${AUTOMATION_OVERRIDE_FILE_ENV} 必须指向 kata-automation-config-*.overrides.json`,
    );
  }
  if (fs.existsSync(resolved) && fs.lstatSync(resolved).isSymbolicLink()) {
    throw new Error("自动化覆盖文件不得是符号链接");
  }
  return resolved;
}

export function automationOverrideFileFromArgv(
  argv: readonly string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const index = argv.indexOf("--config");
  if (index >= 0 && argv[index + 1]) {
    const configFile = path.resolve(argv[index + 1]);
    if (path.basename(configFile).startsWith("kata-automation-config-")) {
      const overrideFile = configFile.replace(/\.(?:m|c)?tsx?$/, ".overrides.json");
      const runPath = env.KATA_RUN_PATH?.trim();
      if (!runPath) throw new Error(`${AUTOMATION_OVERRIDE_FILE_ENV} 需要 KATA_RUN_PATH`);
      return assertAutomationOverridePath(overrideFile, runPath);
    }
  }
  const inherited = env[AUTOMATION_OVERRIDE_FILE_ENV]?.trim();
  if (!inherited) return undefined;
  const runPath = env.KATA_RUN_PATH?.trim();
  if (!runPath) throw new Error(`${AUTOMATION_OVERRIDE_FILE_ENV} 需要 KATA_RUN_PATH`);
  return assertAutomationOverridePath(inherited, runPath);
}

export function readAutomationOverrideFile(
  argv: readonly string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env,
): AutomationOverrideFile {
  const file = automationOverrideFileFromArgv(argv, env);
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
    ...(root.playwright === undefined
      ? {}
      : { playwright: record(root.playwright, "命令行自动化覆盖.playwright") }),
    ...(root.automation === undefined
      ? {}
      : { automation: record(root.automation, "命令行自动化覆盖.automation") }),
  };
}
