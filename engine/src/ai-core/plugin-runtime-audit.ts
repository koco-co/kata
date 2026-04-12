import { join } from "node:path";
import { aiCorePluginsDir, pluginsDir } from "../../lib/paths.ts";
import { loadAllPlugins } from "../../lib/plugin-utils.ts";
import type { AiCoreIssue, AiCoreResult } from "./types.ts";

export type PluginRuntimeAuditOptions = {
  root?: string;
  legacyRoot?: string;
};

export function auditPluginRuntimeMetadata(
  options: PluginRuntimeAuditOptions = {},
): AiCoreResult<null> {
  const aiCoreRoot = options.root
    ? join(options.root, ".ai", "core", "plugins")
    : aiCorePluginsDir();
  const legacyRoot =
    options.legacyRoot ?? (options.root ? join(options.root, "plugins") : pluginsDir());

  const issues: AiCoreIssue[] = loadAllPlugins(aiCoreRoot, {
    legacyRoot,
  }).flatMap((plugin) =>
    plugin.issues.map((issue) => ({
      code: issue.code,
      severity: "error" as const,
      path: issue.path,
      message: issue.message,
    })),
  );

  return {
    ok: issues.length === 0,
    value: null,
    issues,
  };
}
