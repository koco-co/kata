import { readFileSync } from "node:fs";
import { findCasesYaml } from "../cases/find.ts";
import { parseCasesYaml } from "../cases/parse.ts";
import { assertPlatformEnvName } from "../platform-env.ts";

/** Resolve the run environment from an explicit CLI value or meta.automation_env. */
export function resolveAutomationEnv(featureDir: string, explicitEnv?: string): string {
  if (explicitEnv) return assertPlatformEnvName(explicitEnv);
  const { yamlPath } = findCasesYaml(featureDir);
  const file = parseCasesYaml(readFileSync(yamlPath, "utf8"));
  const env = file.meta.automation_env;
  if (!env) {
    throw new Error("未配置 meta.automation_env；请传 --env <name> 或先在 TUI 中选择环境");
  }
  return assertPlatformEnvName(env);
}
